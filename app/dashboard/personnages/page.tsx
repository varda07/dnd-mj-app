'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ImageCropper from '@/app/components/ImageCropper'

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
  const [cropperKey, setCropperKey] = useState(0)
  const [codesVisibles, setCodesVisibles] = useState<Record<string, string>>({})
  const [aideOuverte, setAideOuverte] = useState(false)

  const deVie = CLASSES_DE_VIE[classe]

  useEffect(() => {
    fetchPersonnages()
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('scenarios')
      .select('id, nom')
      .eq('mj_id', user.id)
      .order('nom')
    if (data) setScenarios(data)
  }

  const genererCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let suffix = ''
    for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
    return `DND-${suffix}`
  }

  const partagerPersonnage = async (personnageId: string) => {
    const { data: existing } = await supabase
      .from('codes_invitation')
      .select('code')
      .eq('personnage_id', personnageId)
      .eq('utilise', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.code) {
      setCodesVisibles((prev) => ({ ...prev, [personnageId]: existing.code }))
      return
    }

    for (let i = 0; i < 5; i++) {
      const code = genererCode()
      const { error } = await supabase
        .from('codes_invitation')
        .insert({ code, personnage_id: personnageId })
      if (!error) {
        setCodesVisibles((prev) => ({ ...prev, [personnageId]: code }))
        return
      }
    }
    setMessage("Impossible de générer un code unique, réessaie.")
  }

  const cacherCode = (personnageId: string) => {
    setCodesVisibles((prev) => {
      const next = { ...prev }
      delete next[personnageId]
      return next
    })
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
    setCropperKey((k) => k + 1)
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
    setCropperKey((k) => k + 1)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchPersonnages = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('personnages')
      .select('*')
      .eq('joueur_id', user.id)
      .order('created_at', { ascending: false })
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
      const { error: uploadError } = await supabase.storage.from('personnage').upload(path, file)
      if (uploadError) {
        setMessage(uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('personnage').getPublicUrl(path)
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
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.')) return
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
          <button
            type="button"
            onClick={() => setAideOuverte(true)}
            title="Aide : créer un personnage D&D 5e"
            className="ml-auto w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-yellow-500 border border-gray-700 font-bold text-sm flex items-center justify-center transition"
          >
            ?
          </button>
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
            <ImageCropper
              key={cropperKey}
              inputId="perso-file"
              currentImageUrl={imageActuelle}
              onChange={setFile}
              aspect={1}
              label={editingId ? "Nouvelle image (laisser vide pour garder l'actuelle)" : 'Image du personnage'}
            />
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
              <div className="flex gap-3">
                {perso.image_url && (
                  <img
                    src={perso.image_url}
                    alt={perso.nom}
                    className="w-12 h-12 object-cover rounded-full bg-gray-900 flex-shrink-0 ring-2 ring-yellow-500"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white break-words">{perso.nom}</h3>
                  <p className="text-gray-400 text-xs break-words">
                    {perso.race} · {perso.classe} · Niv. {perso.niveau} · 🎲 {perso.de_vie}
                  </p>
                </div>
              </div>

              {codesVisibles[perso.id] && (
                <div className="mt-3 p-2 rounded bg-gray-900 border border-green-600/50 flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-gray-400 text-xs">Code à donner au MJ :</p>
                    <code className="text-green-300 font-mono font-bold text-lg break-all">{codesVisibles[perso.id]}</code>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(codesVisibles[perso.id])}
                      className="text-gray-400 hover:text-white text-xs"
                      title="Copier"
                    >
                      📋 Copier
                    </button>
                    <button
                      type="button"
                      onClick={() => cacherCode(perso.id)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm text-gray-400 mt-3">
                <span>❤️ PV: {perso.hp_actuel}/{perso.hp_max}</span>
                <span>💪 For: {perso.force}</span>
                <span>🏃 Dex: {perso.dexterite}</span>
                <span>🫀 Con: {perso.constitution}</span>
                <span>🧠 Int: {perso.intelligence}</span>
                <span>🙏 Sag: {perso.sagesse}</span>
                <span>✨ Cha: {perso.charisme}</span>
              </div>

              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-700 text-xs">
                <button type="button" onClick={() => window.location.href = `/dashboard/personnages/${perso.id}`} className="text-yellow-400">
                  📜 Fiche
                </button>
                <button type="button" onClick={() => partagerPersonnage(perso.id)} className="text-green-400">
                  Partager
                </button>
                <button type="button" onClick={() => commencerEdition(perso)} className="text-blue-400">
                  Modifier
                </button>
                <button type="button" onClick={() => supprimerPersonnage(perso.id)} className="text-red-400">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {aideOuverte && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setAideOuverte(false)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-yellow-500">
                📘 Créer un personnage D&amp;D 5e
              </h2>
              <button
                type="button"
                onClick={() => setAideOuverte(false)}
                className="w-8 h-8 rounded text-gray-400 hover:text-white hover:bg-gray-700 font-bold"
                title="Fermer"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-5 text-sm text-gray-300">
              <section>
                <h3 className="text-yellow-500 font-bold mb-2">1. Choisir une race</h3>
                <p>
                  La race donne le ton physique et culturel du personnage, ainsi que
                  des bonus aux caractéristiques. Quelques repères :
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                  <li><span className="text-white">Humain</span> — polyvalent, +1 à toutes les stats.</li>
                  <li><span className="text-white">Elfe</span> — agile et perceptif, +2 Dex.</li>
                  <li><span className="text-white">Nain</span> — résistant, +2 Con.</li>
                  <li><span className="text-white">Halfelin</span> — petit et chanceux, +2 Dex.</li>
                  <li><span className="text-white">Demi-elfe</span> — charismatique, +2 Cha.</li>
                  <li><span className="text-white">Demi-orc</span> — puissant, +2 For.</li>
                  <li><span className="text-white">Drakéide</span> — souffle élémentaire, +2 For / +1 Cha.</li>
                  <li><span className="text-white">Gnome</span> — malin, +2 Int.</li>
                  <li><span className="text-white">Tieffelin</span> — infernal, +2 Cha / +1 Int.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-yellow-500 font-bold mb-2">2. Choisir une classe</h3>
                <p>
                  La classe détermine ton rôle en combat, ton dé de vie (PV par niveau) et
                  les caractéristiques prioritaires.
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                  <li><span className="text-white">Barbare (d12)</span> — bourrin, For &amp; Con.</li>
                  <li><span className="text-white">Guerrier / Paladin / Rôdeur (d10)</span> — combat polyvalent, For ou Dex.</li>
                  <li><span className="text-white">Barde / Clerc / Druide / Moine / Roublard / Ensorceleur (d8)</span> — équilibré.</li>
                  <li><span className="text-white">Magicien / Sorcier (d6)</span> — fragile mais puissant, Int ou Cha.</li>
                </ul>
                <p className="mt-2 text-gray-400">
                  💡 Vérifie que la stat principale de ta classe correspond aux bonus
                  raciaux pour un personnage efficace.
                </p>
              </section>

              <section>
                <h3 className="text-yellow-500 font-bold mb-2">3. Répartir les caractéristiques</h3>
                <p className="mb-2">Deux méthodes standard :</p>

                <div className="bg-gray-900/50 border border-gray-700 rounded p-3 mb-3">
                  <p className="text-white font-bold mb-1">🎲 Jet de dés (4d6, on retire le plus bas)</p>
                  <p className="text-gray-400">
                    Lance 4d6, ignore le plus petit résultat, additionne les 3 restants.
                    Fais ça 6 fois puis attribue chaque total à une caractéristique. Plus
                    aléatoire et souvent plus généreux.
                  </p>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded p-3">
                  <p className="text-white font-bold mb-1">⚖️ Méthode des points (27 points)</p>
                  <p className="text-gray-400 mb-2">
                    Toutes les stats commencent à 8. Tu dépenses 27 points pour les
                    augmenter (max 15 avant bonus racial). Coûts :
                  </p>
                  <ul className="text-gray-400 text-xs grid grid-cols-2 gap-x-4">
                    <li>9 = 1 pt</li>
                    <li>10 = 2 pts</li>
                    <li>11 = 3 pts</li>
                    <li>12 = 4 pts</li>
                    <li>13 = 5 pts</li>
                    <li>14 = 7 pts</li>
                    <li>15 = 9 pts</li>
                  </ul>
                </div>

                <p className="mt-3 text-gray-400">
                  💡 Ajoute ensuite les bonus raciaux. Le modificateur utilisé en jeu est
                  <span className="text-white"> (stat − 10) ÷ 2</span> arrondi vers le bas.
                </p>
              </section>

              <section>
                <h3 className="text-yellow-500 font-bold mb-2">4. Ce que représente chaque stat</h3>
                <ul className="space-y-2">
                  <li>
                    <span className="text-white font-bold">💪 Force</span> —
                    <span className="text-gray-400"> puissance physique brute. Attaques au corps à corps, soulever, pousser.</span>
                  </li>
                  <li>
                    <span className="text-white font-bold">🏃 Dextérité</span> —
                    <span className="text-gray-400"> agilité, réflexes, équilibre. CA, initiative, armes à distance et finesse.</span>
                  </li>
                  <li>
                    <span className="text-white font-bold">🫀 Constitution</span> —
                    <span className="text-gray-400"> endurance et santé. Ajoute des PV à chaque niveau, résistance aux poisons.</span>
                  </li>
                  <li>
                    <span className="text-white font-bold">🧠 Intelligence</span> —
                    <span className="text-gray-400"> savoir, logique, mémoire. Stat principale du magicien.</span>
                  </li>
                  <li>
                    <span className="text-white font-bold">🙏 Sagesse</span> —
                    <span className="text-gray-400"> perception et intuition. Stat principale du clerc, druide, rôdeur.</span>
                  </li>
                  <li>
                    <span className="text-white font-bold">✨ Charisme</span> —
                    <span className="text-gray-400"> force de personnalité et persuasion. Stat principale du barde, paladin, ensorceleur, sorcier.</span>
                  </li>
                </ul>
              </section>

              <section className="border-t border-gray-700 pt-4">
                <p className="text-gray-400 italic">
                  🎯 Points de vie de départ = max du dé de vie + modificateur de
                  Constitution. Exemple : un Guerrier (d10) avec Con 14 (+2) commence à
                  12 PV.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
