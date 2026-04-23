'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MindMap from './MindMap'

type Scenario = {
  id: string
  nom: string
  description: string
  notes: string
}

export default function Scenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [codesVisibles, setCodesVisibles] = useState<Record<string, string>>({})
  const [codeJoueur, setCodeJoueur] = useState('')
  const [scenarioCibleId, setScenarioCibleId] = useState('')
  const [messageJoueur, setMessageJoueur] = useState('')
  const [vue, setVue] = useState<'liste' | 'carte'>('liste')
  const router = useRouter()

  const ajouterJoueur = async () => {
    setMessageJoueur('')
    const code = codeJoueur.trim().toUpperCase()
    if (!code) return setMessageJoueur('Entre un code.')
    if (!scenarioCibleId) return setMessageJoueur('Choisis un scénario cible.')

    const { data: invit, error: err1 } = await supabase
      .from('codes_invitation')
      .select('id, personnage_id, utilise')
      .eq('code', code)
      .maybeSingle()
    if (err1 || !invit) return setMessageJoueur('Code introuvable.')
    if (invit.utilise) return setMessageJoueur('Ce code a déjà été utilisé.')
    if (!invit.personnage_id) return setMessageJoueur("Ce code n'est pas un code de personnage.")

    const { error: err2 } = await supabase
      .from('personnages')
      .update({ scenario_id: scenarioCibleId })
      .eq('id', invit.personnage_id)
    if (err2) return setMessageJoueur('Impossible de lier le personnage : ' + err2.message)

    await supabase.from('codes_invitation').update({ utilise: true }).eq('id', invit.id)

    setMessageJoueur('✓ Personnage ajouté au scénario !')
    setCodeJoueur('')
  }

  const resetForm = () => {
    setNom('')
    setDescription('')
    setNotes('')
    setEditingId(null)
  }

  const commencerEdition = (scenario: Scenario) => {
    setEditingId(scenario.id)
    setNom(scenario.nom)
    setDescription(scenario.description ?? '')
    setNotes(scenario.notes ?? '')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('scenarios')
      .select('*')
      .eq('mj_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setScenarios(data)
  }

  const sauvegarderScenario = async () => {
    if (!nom) return setMessage('Le nom est obligatoire !')
    setLoading(true)
    if (editingId) {
      const { error } = await supabase.from('scenarios').update({ nom, description, notes }).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage('Scenario modifie !')
        resetForm()
        fetchScenarios()
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('scenarios').insert({ nom, description, notes, mj_id: user?.id })
      if (error) setMessage(error.message)
      else {
        setMessage('Scenario cree !')
        resetForm()
        fetchScenarios()
      }
    }
    setLoading(false)
  }

  const supprimerScenario = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.')) return
    await supabase.from('scenarios').delete().eq('id', id)
    fetchScenarios()
  }

  const genererCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let suffix = ''
    for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
    return `DND-${suffix}`
  }

  const inviterJoueur = async (scenarioId: string) => {
    const { data: existing } = await supabase
      .from('codes_invitation')
      .select('code')
      .eq('scenario_id', scenarioId)
      .eq('utilise', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.code) {
      setCodesVisibles((prev) => ({ ...prev, [scenarioId]: existing.code }))
      return
    }

    for (let i = 0; i < 5; i++) {
      const code = genererCode()
      const { error } = await supabase
        .from('codes_invitation')
        .insert({ code, scenario_id: scenarioId })
      if (!error) {
        setCodesVisibles((prev) => ({ ...prev, [scenarioId]: code }))
        return
      }
    }
    setMessage("Impossible de générer un code unique, réessaie.")
  }

  const cacherCode = (scenarioId: string) => {
    setCodesVisibles((prev) => {
      const next = { ...prev }
      delete next[scenarioId]
      return next
    })
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white">
            Retour
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">Scenarios</h1>
        </div>
        <div className="flex bg-gray-800 rounded-lg p-1 mb-6 w-fit">
          <button
            type="button"
            onClick={() => setVue('liste')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition ${
              vue === 'liste' ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 Vue Liste
          </button>
          <button
            type="button"
            onClick={() => setVue('carte')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition ${
              vue === 'carte' ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            🧠 Vue Carte Mentale
          </button>
        </div>
        {vue === 'carte' ? (
          <MindMap scenarios={scenarios.map((s) => ({ id: s.id, nom: s.nom }))} />
        ) : (
        <>
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-yellow-500 mb-4">{editingId ? 'Modifier le scenario' : 'Creer un scenario'}</h2>
          <div className="space-y-3">
            <input type="text" placeholder="Nom du scenario" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
            <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
            <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
            {message && <p className="text-yellow-400 text-sm">{message}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={sauvegarderScenario} disabled={loading} className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded">
                {loading ? 'Chargement...' : editingId ? 'Modifier' : 'Creer'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="px-4 p-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600">
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-yellow-500 mb-2">🎟️ Ajouter un joueur</h2>
          <p className="text-gray-400 text-sm mb-3">
            Entre le code d&apos;invitation partagé par un joueur pour rattacher son
            personnage à l&apos;un de tes scénarios.
          </p>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={codeJoueur}
              onChange={(e) => setCodeJoueur(e.target.value)}
              placeholder="DND-XXXXXX"
              className="flex-1 p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none font-mono uppercase"
            />
            <select
              value={scenarioCibleId}
              onChange={(e) => setScenarioCibleId(e.target.value)}
              className="flex-1 p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
            >
              <option value="">— Choisir un scénario —</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={ajouterJoueur}
              className="px-4 py-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400"
            >
              Ajouter
            </button>
          </div>
          {messageJoueur && <p className="text-yellow-400 text-sm mt-2">{messageJoueur}</p>}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-yellow-500">Mes scenarios</h2>
          {scenarios.length === 0 && <p className="text-gray-400">Aucun scenario pour l'instant.</p>}
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{scenario.nom}</h3>
                <div className="flex gap-3">
                  <button type="button" onClick={() => inviterJoueur(scenario.id)} className="text-green-400 text-sm">
                    Inviter un joueur
                  </button>
                  <button type="button" onClick={() => router.push(`/dashboard/scenarios/${scenario.id}/notes`)} className="text-yellow-400 text-sm">
                    📝 Notes
                  </button>
                  <button type="button" onClick={() => commencerEdition(scenario)} className="text-blue-400 text-sm">
                    Modifier
                  </button>
                  <button type="button" onClick={() => supprimerScenario(scenario.id)} className="text-red-400 text-sm">
                    Supprimer
                  </button>
                </div>
              </div>
              {codesVisibles[scenario.id] && (
                <div className="mt-2 p-2 rounded bg-gray-900 border border-green-600/50 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-gray-400 text-xs">Code d&apos;invitation à donner au joueur :</p>
                    <code className="text-green-300 font-mono font-bold text-lg">{codesVisibles[scenario.id]}</code>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(codesVisibles[scenario.id])}
                      className="text-gray-400 hover:text-white text-xs"
                      title="Copier"
                    >
                      📋 Copier
                    </button>
                    <button
                      type="button"
                      onClick={() => cacherCode(scenario.id)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
              {scenario.description && <p className="text-gray-400 text-sm mt-2">{scenario.description}</p>}
            </div>
          ))}
        </div>
        </>
        )}
      </div>
    </main>
  )
}