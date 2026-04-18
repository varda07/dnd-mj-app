'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Combat from './combat/page'

type ScenarioLite = { id: string; nom: string }
type PersoLite = {
  id: string
  nom: string
  classe: string | null
  niveau: number
  hp_actuel: number
  hp_max: number
  image_url: string | null
  scenario_id: string | null
}

export default function Dashboard() {
  const [interface_, setInterface] = useState<'mj' | 'joueur'>('mj')
  const [modeMJ, setModeMJ] = useState<'travail' | 'action'>('travail')
  const [userId, setUserId] = useState('')
  const [scenariosMj, setScenariosMj] = useState<ScenarioLite[]>([])
  const [scenarioCibleId, setScenarioCibleId] = useState('')
  const [codePersonnage, setCodePersonnage] = useState('')
  const [messageMj, setMessageMj] = useState('')
  const [scenariosRejoints, setScenariosRejoints] = useState<ScenarioLite[]>([])
  const [codeScenario, setCodeScenario] = useState('')
  const [messageJoueur, setMessageJoueur] = useState('')
  const [personnagesJoueurs, setPersonnagesJoueurs] = useState<PersoLite[]>([])
  const [menuOuvert, setMenuOuvert] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!menuOuvert) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOuvert(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOuvert])

  const fetchPersonnagesJoueurs = async (scenarioIds: string[]) => {
    if (scenarioIds.length === 0) {
      setPersonnagesJoueurs([])
      return
    }
    const { data } = await supabase
      .from('personnages')
      .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url, scenario_id')
      .in('scenario_id', scenarioIds)
      .order('nom')
    if (data) setPersonnagesJoueurs(data)
  }

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/')
        return
      }
      setUserId(data.user.id)
      const [{ data: mine }, { data: joined }] = await Promise.all([
        supabase.from('scenarios').select('id, nom').eq('mj_id', data.user.id).order('nom'),
        supabase
          .from('scenarios_joueurs')
          .select('scenario:scenarios(id, nom)')
          .eq('joueur_id', data.user.id)
      ])
      if (mine) {
        setScenariosMj(mine)
        fetchPersonnagesJoueurs(mine.map((s) => s.id))
      }
      if (joined) {
        const list = joined
          .map((r: { scenario: ScenarioLite | ScenarioLite[] | null }) =>
            Array.isArray(r.scenario) ? r.scenario[0] : r.scenario
          )
          .filter((s): s is ScenarioLite => !!s)
        setScenariosRejoints(list)
      }
    }
    init()
  }, [])

  const ajouterPersonnageAuScenario = async () => {
    setMessageMj('')
    const code = codePersonnage.trim().toUpperCase()
    if (!code) return setMessageMj('Entre un code.')
    if (!scenarioCibleId) return setMessageMj('Choisis un scénario cible.')

    const { data: invit, error: err1 } = await supabase
      .from('codes_invitation')
      .select('id, personnage_id, utilise')
      .eq('code', code)
      .maybeSingle()
    if (err1 || !invit) return setMessageMj('Code introuvable.')
    if (invit.utilise) return setMessageMj('Ce code a déjà été utilisé.')
    if (!invit.personnage_id) return setMessageMj("Ce code n'est pas un code de personnage.")

    const { error: err2 } = await supabase
      .from('personnages')
      .update({ scenario_id: scenarioCibleId })
      .eq('id', invit.personnage_id)
    if (err2) return setMessageMj('Impossible de lier le personnage : ' + err2.message)

    await supabase.from('codes_invitation').update({ utilise: true }).eq('id', invit.id)

    setMessageMj('✓ Personnage ajouté au scénario !')
    setCodePersonnage('')
    fetchPersonnagesJoueurs(scenariosMj.map((s) => s.id))
  }

  const rejoindreScenario = async () => {
    setMessageJoueur('')
    const code = codeScenario.trim().toUpperCase()
    if (!code) return setMessageJoueur('Entre un code.')

    const { data: invit, error: err1 } = await supabase
      .from('codes_invitation')
      .select('id, scenario_id, utilise')
      .eq('code', code)
      .maybeSingle()
    if (err1 || !invit) return setMessageJoueur('Code introuvable.')
    if (invit.utilise) return setMessageJoueur('Ce code a déjà été utilisé.')
    if (!invit.scenario_id) return setMessageJoueur("Ce code n'est pas un code de scénario.")

    const { error: err2 } = await supabase
      .from('scenarios_joueurs')
      .insert({ scenario_id: invit.scenario_id, joueur_id: userId })
    if (err2 && !err2.message.toLowerCase().includes('duplicate')) {
      return setMessageJoueur('Impossible de rejoindre : ' + err2.message)
    }

    await supabase.from('codes_invitation').update({ utilise: true }).eq('id', invit.id)

    const { data: scenario } = await supabase
      .from('scenarios')
      .select('id, nom')
      .eq('id', invit.scenario_id)
      .maybeSingle()

    if (scenario) {
      setScenariosRejoints((prev) =>
        prev.some((s) => s.id === scenario.id) ? prev : [...prev, scenario]
      )
      setMessageJoueur(`✓ Rejoint : ${scenario.nom}`)
    } else {
      setMessageJoueur('✓ Rejoint.')
    }
    setCodeScenario('')
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-3 sm:p-4 flex items-center justify-between gap-2 border-b border-gray-700">
        <h1 className="text-base sm:text-xl font-bold text-yellow-500 flex-shrink-0 truncate">D&D Manager</h1>
        <div className="flex bg-gray-700 rounded-lg p-1 flex-shrink min-w-0">
          <button type="button" onClick={() => setInterface('mj')} className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm sm:text-base font-bold transition ${interface_ === 'mj' ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'}`}>
            MJ
          </button>
          <button type="button" onClick={() => setInterface('joueur')} className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm sm:text-base font-bold transition ${interface_ === 'joueur' ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'}`}>
            Joueur
          </button>
        </div>
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOuvert((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOuvert}
            className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 rounded transition text-2xl leading-none"
          >
            ☰
          </button>
          {menuOuvert && (
            <div className="absolute right-0 mt-2 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setMenuOuvert(false)
                  router.push('/dashboard/bibliotheque')
                }}
                className="w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition flex items-center gap-2 text-sm"
              >
                📚 Bibliothèque
              </button>
              <div className="border-t border-gray-700" />
              <button
                type="button"
                onClick={async () => {
                  setMenuOuvert(false)
                  await supabase.auth.signOut()
                  router.push('/')
                }}
                className="w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition flex items-center gap-2 text-sm"
              >
                🚪 Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>

      {interface_ === 'mj' && (
        <div>
          <div className="bg-gray-800 border-b border-gray-700 p-3 flex justify-center gap-4">
            <button type="button" onClick={() => setModeMJ('travail')} className={`px-6 py-2 rounded-lg font-bold transition ${modeMJ === 'travail' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              Mode Travail
            </button>
            <button type="button" onClick={() => setModeMJ('action')} className={`px-6 py-2 rounded-lg font-bold transition ${modeMJ === 'action' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              Mode Action
            </button>
          </div>
          <div className="p-6">
            {personnagesJoueurs.length > 0 && (
              <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-bold text-yellow-500 mb-3">🧙 Personnages des joueurs</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {personnagesJoueurs.map((p) => {
                    const scenario = scenariosMj.find((s) => s.id === p.scenario_id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => router.push(`/dashboard/personnages/${p.id}`)}
                        className="w-full flex items-center gap-3 bg-gray-900/50 border border-gray-700 rounded-lg p-3 hover:bg-gray-700/50 hover:border-yellow-600 transition text-left overflow-hidden"
                        title={`Ouvrir la fiche de ${p.nom}`}
                      >
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.nom}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-400 flex-shrink-0 bg-gray-900"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white flex-shrink-0">
                            {p.nom.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-white font-bold truncate">{p.nom}</p>
                          <p className="text-gray-400 text-xs truncate">
                            {[p.classe, `Niv. ${p.niveau}`].filter(Boolean).join(' · ')}
                          </p>
                          <p className="text-gray-500 text-xs truncate">
                            ❤️ {p.hp_actuel}/{p.hp_max}
                            {scenario && <span className="ml-2">📖 {scenario.nom}</span>}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {modeMJ === 'travail' && (
              <div>
                <h2 className="text-2xl font-bold text-blue-400 mb-4">Mode Travail</h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button type="button" onClick={() => router.push('/dashboard/scenarios')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left">
                    <h3 className="text-lg font-bold text-yellow-500">Scenarios</h3>
                    <p className="text-gray-400 text-sm mt-1">Creer et gerer tes scenarios</p>
                  </button>
                  <button type="button" onClick={() => router.push('/dashboard/ennemis')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left">
                    <h3 className="text-lg font-bold text-yellow-500">Ennemis</h3>
                    <p className="text-gray-400 text-sm mt-1">Creer et gerer tes ennemis</p>
                  </button>
                  <button type="button" onClick={() => router.push('/dashboard/items')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left">
                    <h3 className="text-lg font-bold text-yellow-500">Items</h3>
                    <p className="text-gray-400 text-sm mt-1">Creer et gerer tes items</p>
                  </button>
                  <button type="button" onClick={() => router.push('/dashboard/maps')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left">
                    <h3 className="text-lg font-bold text-yellow-500">Maps</h3>
                    <p className="text-gray-400 text-sm mt-1">Gerer tes cartes</p>
                  </button>
                  <button type="button" onClick={() => router.push('/dashboard/bibliotheque')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left col-span-2">
                    <h3 className="text-lg font-bold text-yellow-500">📚 Bibliothèque</h3>
                    <p className="text-gray-400 text-sm mt-1">Parcourir tout ce qui a été créé (scénarios, personnages, ennemis, items, maps, sorts)</p>
                  </button>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-yellow-500 mb-2">🎟️ Ajouter un personnage joueur</h3>
                  <p className="text-gray-400 text-sm mb-3">
                    Entre le code partagé par un joueur pour rattacher son personnage à l&apos;un de tes scénarios.
                  </p>
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      type="text"
                      value={codePersonnage}
                      onChange={(e) => setCodePersonnage(e.target.value)}
                      placeholder="DND-XXXXXX"
                      className="flex-1 p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none font-mono uppercase"
                    />
                    <select
                      value={scenarioCibleId}
                      onChange={(e) => setScenarioCibleId(e.target.value)}
                      className="flex-1 p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
                    >
                      <option value="">— Choisir un scénario cible —</option>
                      {scenariosMj.map((s) => (
                        <option key={s.id} value={s.id}>{s.nom}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={ajouterPersonnageAuScenario}
                      className="px-4 py-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400"
                    >
                      Ajouter
                    </button>
                  </div>
                  {messageMj && <p className="text-yellow-400 text-sm mt-2">{messageMj}</p>}
                </div>
              </div>
            )}
            {modeMJ === 'action' && (
              <Combat />
            )}
          </div>
        </div>
      )}

      {interface_ === 'joueur' && (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-yellow-500 mb-4">Interface Joueur</h2>
          <p className="text-gray-400 mb-4">Bienvenue Aventurier !</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button type="button" onClick={() => router.push('/dashboard/personnages')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left">
              <h3 className="text-lg font-bold text-yellow-500">Personnages</h3>
              <p className="text-gray-400 text-sm mt-1">Gerer tes personnages</p>
            </button>
            <button type="button" onClick={() => router.push('/dashboard/sorts')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left">
              <h3 className="text-lg font-bold text-yellow-500">Sorts</h3>
              <p className="text-gray-400 text-sm mt-1">Gerer tes sorts</p>
            </button>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-bold text-yellow-500 mb-2">🎟️ Rejoindre un scénario</h3>
            <p className="text-gray-400 text-sm mb-3">
              Entre le code d&apos;invitation donné par ton MJ.
            </p>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                value={codeScenario}
                onChange={(e) => setCodeScenario(e.target.value)}
                placeholder="DND-XXXXXX"
                className="flex-1 p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none font-mono uppercase"
              />
              <button
                type="button"
                onClick={rejoindreScenario}
                className="px-4 py-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400"
              >
                Rejoindre
              </button>
            </div>
            {messageJoueur && <p className="text-yellow-400 text-sm mt-2">{messageJoueur}</p>}
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-yellow-500 mb-2">📜 Scénarios rejoints</h3>
            {scenariosRejoints.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun scénario rejoint pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-2">
                {scenariosRejoints.map((s) => (
                  <li key={s.id} className="p-3 rounded bg-gray-900/50 border border-gray-700 text-white">
                    📖 {s.nom}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  )
}