'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ImageCropper from '@/app/components/ImageCropper'

type Ennemi = {
  id: string
  nom: string
  hp_max: number
  hp_actuel: number
  armure: number
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
  notes: string
  scenario_id: string | null
  image_url: string | null
}

type ScenarioOption = { id: string; nom: string }

export default function Ennemis() {
  const [ennemis, setEnnemis] = useState<Ennemi[]>([])
  const [nom, setNom] = useState('')
  const [hp, setHp] = useState('10')
  const [armure, setArmure] = useState('10')
  const [force, setForce] = useState('10')
  const [dexterite, setDexterite] = useState('10')
  const [constitution, setConstitution] = useState('10')
  const [intelligence, setIntelligence] = useState('10')
  const [sagesse, setSagesse] = useState('10')
  const [charisme, setCharisme] = useState('10')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([])
  const [scenarioId, setScenarioId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [imageActuelle, setImageActuelle] = useState('')
  const [cropperKey, setCropperKey] = useState(0)

  useEffect(() => {
    fetchEnnemis()
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    const { data } = await supabase.from('scenarios').select('id, nom').order('nom')
    if (data) setScenarios(data)
  }

  const resetForm = () => {
    setNom('')
    setHp('10')
    setArmure('10')
    setForce('10')
    setDexterite('10')
    setConstitution('10')
    setIntelligence('10')
    setSagesse('10')
    setCharisme('10')
    setNotes('')
    setEditingId(null)
    setScenarioId('')
    setFile(null)
    setImageActuelle('')
    setCropperKey((k) => k + 1)
  }

  const commencerEdition = (ennemi: Ennemi) => {
    setEditingId(ennemi.id)
    setNom(ennemi.nom)
    setHp(String(ennemi.hp_max))
    setArmure(String(ennemi.armure))
    setForce(String(ennemi.force))
    setDexterite(String(ennemi.dexterite))
    setConstitution(String(ennemi.constitution))
    setIntelligence(String(ennemi.intelligence))
    setSagesse(String(ennemi.sagesse))
    setCharisme(String(ennemi.charisme))
    setNotes(ennemi.notes ?? '')
    setScenarioId(ennemi.scenario_id ?? '')
    setFile(null)
    setImageActuelle(ennemi.image_url ?? '')
    setCropperKey((k) => k + 1)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchEnnemis = async () => {
    const { data } = await supabase.from('ennemis').select('*').order('created_at', { ascending: false })
    if (data) setEnnemis(data)
  }

  const sauvegarderEnnemi = async () => {
    if (!nom) return setMessage('Le nom est obligatoire !')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let imageUrl = imageActuelle
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user?.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('ennemie').upload(path, file)
      if (uploadError) {
        setMessage(uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('ennemie').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }

    const payload = {
      nom,
      hp_max: parseInt(hp),
      armure: parseInt(armure),
      force: parseInt(force),
      dexterite: parseInt(dexterite),
      constitution: parseInt(constitution),
      intelligence: parseInt(intelligence),
      sagesse: parseInt(sagesse),
      charisme: parseInt(charisme),
      notes,
      scenario_id: scenarioId || null,
      image_url: imageUrl
    }

    if (editingId) {
      const { error } = await supabase.from('ennemis').update(payload).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage('Ennemi modifié !')
        resetForm()
        fetchEnnemis()
      }
    } else {
      const { error } = await supabase.from('ennemis').insert({
        ...payload,
        hp_actuel: parseInt(hp),
        mj_id: user?.id
      })
      if (error) setMessage(error.message)
      else {
        setMessage('Ennemi créé !')
        resetForm()
        fetchEnnemis()
      }
    }
    setLoading(false)
  }

  const supprimerEnnemi = async (id: string) => {
    await supabase.from('ennemis').delete().eq('id', id)
    fetchEnnemis()
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => window.location.href = '/dashboard'} className="text-gray-400 hover:text-white">
            Retour
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">👹 Ennemis</h1>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-yellow-500 mb-4">{editingId ? "Modifier l'ennemi" : 'Créer un ennemi'}</h2>
          <div className="space-y-3">
            <input type="text" placeholder="Nom de l'ennemi *" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
            <div>
              <label className="text-gray-400 text-sm">Scénario</label>
              <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                <option value="">Aucun scénario</option>
                {scenarios.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm">Points de vie</label>
                <input type="number" value={hp} onChange={(e) => setHp(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Armure</label>
                <input type="number" value={armure} onChange={(e) => setArmure(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
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
            <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
            <ImageCropper
              key={cropperKey}
              inputId="ennemi-file"
              currentImageUrl={imageActuelle}
              onChange={setFile}
              aspect={1}
              label={editingId ? "Nouvelle image (laisser vide pour garder l'actuelle)" : "Image de l'ennemi"}
            />
            {message && <p className="text-yellow-400 text-sm">{message}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={sauvegarderEnnemi} disabled={loading} className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded">
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
          <h2 className="text-lg font-bold text-yellow-500">Mes ennemis</h2>
          {ennemis.length === 0 && <p className="text-gray-400">Aucun ennemi créé pour l'instant.</p>}
          {ennemis.map((ennemi) => (
            <div key={ennemi.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex gap-4">
                {ennemi.image_url && (
                  <img
                    src={ennemi.image_url}
                    alt={ennemi.nom}
                    className="w-24 h-24 object-cover rounded bg-gray-900 flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{ennemi.nom}</h3>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => commencerEdition(ennemi)} className="text-blue-400 text-sm">
                        Modifier
                      </button>
                      <button type="button" onClick={() => supprimerEnnemi(ennemi.id)} className="text-red-400 text-sm">
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm text-gray-400">
                    <span>❤️ HP: {ennemi.hp_actuel}/{ennemi.hp_max}</span>
                    <span>🛡️ Armure: {ennemi.armure}</span>
                    <span>💪 Force: {ennemi.force}</span>
                    <span>🏃 Dex: {ennemi.dexterite}</span>
                    <span>🫀 Con: {ennemi.constitution}</span>
                    <span>🧠 Int: {ennemi.intelligence}</span>
                    <span>🙏 Sag: {ennemi.sagesse}</span>
                    <span>✨ Cha: {ennemi.charisme}</span>
                  </div>
                  {ennemi.notes && <p className="text-gray-500 text-sm mt-2 italic">{ennemi.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}