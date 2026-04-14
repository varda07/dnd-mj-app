'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
}

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

  useEffect(() => {
    fetchEnnemis()
  }, [])

  const fetchEnnemis = async () => {
    const { data } = await supabase.from('ennemis').select('*').order('created_at', { ascending: false })
    if (data) setEnnemis(data)
  }

  const creerEnnemi = async () => {
    if (!nom) return setMessage('Le nom est obligatoire !')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('ennemis').insert({
      nom,
      hp_max: parseInt(hp),
      hp_actuel: parseInt(hp),
      armure: parseInt(armure),
      force: parseInt(force),
      dexterite: parseInt(dexterite),
      constitution: parseInt(constitution),
      intelligence: parseInt(intelligence),
      sagesse: parseInt(sagesse),
      charisme: parseInt(charisme),
      notes,
      mj_id: user?.id
    })
    if (error) setMessage(error.message)
    else {
      setMessage('Ennemi créé !')
      setNom('')
      setHp('10')
      setArmure('10')
      setNotes('')
      fetchEnnemis()
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
          <h2 className="text-lg font-bold text-yellow-500 mb-4">Créer un ennemi</h2>
          <div className="space-y-3">
            <input type="text" placeholder="Nom de l'ennemi *" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
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
            {message && <p className="text-yellow-400 text-sm">{message}</p>}
            <button type="button" onClick={creerEnnemi} disabled={loading} className="w-full p-3 bg-yellow-500 text-gray-900 font-bold rounded">
              {loading ? 'Chargement...' : 'Créer'}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-yellow-500">Mes ennemis</h2>
          {ennemis.length === 0 && <p className="text-gray-400">Aucun ennemi créé pour l'instant.</p>}
          {ennemis.map((ennemi) => (
            <div key={ennemi.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">{ennemi.nom}</h3>
                <button type="button" onClick={() => supprimerEnnemi(ennemi.id)} className="text-red-400 text-sm">
                  Supprimer
                </button>
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
          ))}
        </div>
      </div>
    </main>
  )
}