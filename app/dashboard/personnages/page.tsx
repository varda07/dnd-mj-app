'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Personnage = {
  id: string
  nom: string
  race: string
  classe: string
  niveau: number
  hp_max: number
  hp_actuel: number
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
  de_vie: string
  image_url: string
  scenario_id: string | null
}

type ScenarioOption = { id: string; nom: string }

const RACES = ['Humain', 'Elfe', 'Nain', 'Halfelin', 'Demi-elfe', 'Demi-orc', 'Drakéide', 'Gnome', 'Tieffelin']

const CLASSES_DE_VIE: Record<string, string> = {
  'Barbare': 'd12',
  'Guerrier': 'd10',
  'Paladin': 'd10',
  'Rôdeur': 'd10',
  'Barde': 'd8',
  'Clerc': 'd8',
  'Druide': 'd8',
  'Moine': 'd8',
  'Roublard': 'd8',
  'Ensorceleur': 'd8',
  'Magicien': 'd6',
  'Sorcier': 'd6'
}

const CLASSES = Object.keys(CLASSES_DE_VIE)

export default function Personnages() {
  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const [nom, setNom] = useState('')
  const [race, setRace] = useState(RACES[0])
  const [classe, setClasse] = useState(CLASSES[0])
  const [niveau, setNiveau] = useState('1')
  const [hpMax, setHpMax] = useState('10')
  const [hpActuel, setHpActuel] = useState('10')
  const [force, setForce] = useState('10')
  const [dexterite, setDexterite] = useState('10')
  const [constitution, setConstitution] = useState('10')
  const [intelligence, setIntelligence] = useState('10')
  const [sagesse, setSagesse] = useState('10')
  const [charisme, setCharisme] = useState('10')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageActuelle, setImageActuelle] = useState('')
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([])
  const [scenarioId, setScenarioId] = useState('')

  const deVie = CLASSES_DE_VIE[classe]

  useEffect(() => {
    fetchPersonnages()
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    const { data } = await supabase.from('scenarios').select('id, nom').order('nom')
    if (data) setScenarios(data)
  }

  const resetForm = () => {
    setNom('')
    setRace(RACES[0])
    setClasse(CLASSES[0])
    setNiveau('1')
    setHpMax('10')
    setHpActuel('10')
    setForce('10')
    setDexterite('10')
    setConstitution('10')
    setIntelligence('10')
    setSagesse('10')
    setCharisme('10')
    setFile(null)
    setEditingId(null)
    setImageActuelle('')
    setScenarioId('')
    const input = document.getElementById('perso-file') as HTMLInputElement | null
    if (input) input.value = ''
  }

  const commencerEdition = (perso: Personnage) => {
    setEditingId(perso.id)
    setNom(perso.nom)
    setRace(perso.race || RACES[0])
    setClasse(perso.classe in CLASSES_DE_VIE ? perso.classe : CLASSES[0])
    setNiveau(String(perso.niveau))
    setHpMax(String(perso.hp_max))
    setHpActuel(String(perso.hp_actuel))
    setForce(String(perso.force))
    setDexterite(String(perso.dexterite))
    setConstitution(String(perso.constitution))
    setIntelligence(String(perso.intelligence))
    setSagesse(String(perso.sagesse))
    setCharisme(String(perso.charisme))
    setFile(null)
    setImageActuelle(perso.image_url ?? '')
    setScenarioId(perso.scenario_id ?? '')
    const input = document.getElementById('perso-file') as HTMLInputElement | null
    if (input) input.value = ''
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchPersonnages = async () => {
    const { data } = await supabase.from('personnages').select('*').order('created_at', { ascending: false })
    if (data) setPersonnages(data)
  }

  const sauvegarderPersonnage = async () => {
    if (!nom) return setMessage('Le nom est obligatoire !')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let imageUrl = imageActuelle
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user?.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('personnages').upload(path, file)
      if (uploadError) {
        setMessage(uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('personnages').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }

    const payload = {
      nom,
      race,
      classe,
      scenario_id: scenarioId || null,
      niveau: parseInt(niveau),
      hp_max: parseInt(hpMax),
      hp_actuel: parseInt(hpActuel),
      force: parseInt(force),
      dexterite: parseInt(dexterite),
      constitution: parseInt(constitution),
      intelligence: parseInt(intelligence),
      sagesse: parseInt(sagesse),
      charisme: parseInt(charisme),
      de_vie: deVie,
      image_url: imageUrl
    }

    if (editingId) {
      const { error } = await supabase.from('personnages').update(payload).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage('Personnage modifié !')
        resetForm()
        fetchPersonnages()
      }
    } else {
      const { error } = await supabase.from('personnages').insert({ ...payload, joueur_id: user?.id })
      if (error) setMessage(error.message)
      else {
        setMessage('Personnage créé !')
        resetForm()
        fetchPersonnages()
      }
    }
    setLoading(false)
  }

  const supprimerPersonnage = async (id: string) => {
    await supabase.from('personnages').delete().eq('id', id)
    fetchPersonnages()
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => window.location.href = '/dashboard'} className="text-gray-400 hover:text-white">
            Retour
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">🧙 Personnages</h1>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-yellow-500 mb-4">{editingId ? 'Modifier le personnage' : 'Créer un personnage'}</h2>
          <div className="space-y-3">
            <input type="text" placeholder="Nom du personnage *" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm">Race</label>
                <select value={race} onChange={(e) => setRace(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                  {RACES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm">
                  Classe <span className="text-yellow-500 font-bold ml-2">🎲 {deVie}</span>
                </label>
                <select value={classe} onChange={(e) => setClasse(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                  {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm">Scénario</label>
              <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                <option value="">Aucun scénario</option>
                {scenarios.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm">Niveau</label>
              <input type="number" min="1" max="20" value={niveau} onChange={(e) => setNiveau(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm">PV max</label>
                <input type="number" value={hpMax} onChange={(e) => setHpMax(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">PV actuels</label>
                <input type="number" value={hpActuel} onChange={(e) => setHpActuel(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
            </div>
            <p className="text-gray-400 text-sm font-bold">Caractéristiques</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-gray-400 text-sm">Force</label>
                <input type="number" value={force} onChange={(e) => setForce(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Dextérité</label>
                <input type="number" value={dexterite} onChange={(e) => setDexterite(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Constitution</label>
                <input type="number" value={constitution} onChange={(e) => setConstitution(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Intelligence</label>
                <input type="number" value={intelligence} onChange={(e) => setIntelligence(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Sagesse</label>
                <input type="number" value={sagesse} onChange={(e) => setSagesse(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Charisme</label>
                <input type="number" value={charisme} onChange={(e) => setCharisme(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm">
                {editingId ? 'Nouvelle image (laisser vide pour garder l\'actuelle)' : 'Image du personnage'}
              </label>
              <input id="perso-file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-yellow-500 file:text-gray-900 file:font-bold" />
              {editingId && imageActuelle && (
                <img src={imageActuelle} alt="actuelle" className="mt-2 h-24 w-24 object-cover rounded bg-gray-900" />
              )}
            </div>
            {message && <p className="text-yellow-400 text-sm">{message}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={sauvegarderPersonnage} disabled={loading} className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded">
                {loading ? 'Chargement...' : editingId ? 'Modifier' : 'Créer'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="px-4 p-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600">
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-yellow-500">Mes personnages</h2>
          {personnages.length === 0 && <p className="text-gray-400">Aucun personnage créé pour l'instant.</p>}
          {personnages.map((perso) => (
            <div key={perso.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex gap-4">
                {perso.image_url && (
                  <img src={perso.image_url} alt={perso.nom} className="w-24 h-24 object-cover rounded bg-gray-900 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{perso.nom}</h3>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => commencerEdition(perso)} className="text-blue-400 text-sm">
                        Modifier
                      </button>
                      <button type="button" onClick={() => supprimerPersonnage(perso.id)} className="text-red-400 text-sm">
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">
                    {perso.race} · {perso.classe} · Niv. {perso.niveau} · 🎲 {perso.de_vie}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm text-gray-400">
                    <span>❤️ PV: {perso.hp_actuel}/{perso.hp_max}</span>
                    <span>💪 For: {perso.force}</span>
                    <span>🏃 Dex: {perso.dexterite}</span>
                    <span>🫀 Con: {perso.constitution}</span>
                    <span>🧠 Int: {perso.intelligence}</span>
                    <span>🙏 Sag: {perso.sagesse}</span>
                    <span>✨ Cha: {perso.charisme}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
