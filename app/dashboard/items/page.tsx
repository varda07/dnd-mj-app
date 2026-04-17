'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Item = {
  id: string
  nom: string
  description: string
  type: string
  rarete: string
}

const TYPES = ['Arme', 'Armure', 'Potion', 'Parchemin', 'Objet merveilleux', 'Autre']
const RARETES = ['Commun', 'Peu commun', 'Rare', 'Très rare', 'Légendaire', 'Artéfact']

export default function Items() {
  const [items, setItems] = useState<Item[]>([])
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState(TYPES[0])
  const [rarete, setRarete] = useState(RARETES[0])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    const { data } = await supabase.from('items').select('*').order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  const creerItem = async () => {
    if (!nom) return setMessage('Le nom est obligatoire !')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('items').insert({
      nom,
      description,
      type,
      rarete,
      mj_id: user?.id
    })
    if (error) setMessage(error.message)
    else {
      setMessage('Item créé !')
      setNom('')
      setDescription('')
      setType(TYPES[0])
      setRarete(RARETES[0])
      fetchItems()
    }
    setLoading(false)
  }

  const supprimerItem = async (id: string) => {
    await supabase.from('items').delete().eq('id', id)
    fetchItems()
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => window.location.href = '/dashboard'} className="text-gray-400 hover:text-white">
            Retour
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">🎒 Items</h1>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-yellow-500 mb-4">Créer un item</h2>
          <div className="space-y-3">
            <input type="text" placeholder="Nom de l'item *" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Rareté</label>
                <select value={rarete} onChange={(e) => setRarete(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                  {RARETES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
            {message && <p className="text-yellow-400 text-sm">{message}</p>}
            <button type="button" onClick={creerItem} disabled={loading} className="w-full p-3 bg-yellow-500 text-gray-900 font-bold rounded">
              {loading ? 'Chargement...' : 'Créer'}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-yellow-500">Mes items</h2>
          {items.length === 0 && <p className="text-gray-400">Aucun item créé pour l'instant.</p>}
          {items.map((item) => (
            <div key={item.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">{item.nom}</h3>
                <button type="button" onClick={() => supprimerItem(item.id)} className="text-red-400 text-sm">
                  Supprimer
                </button>
              </div>
              <div className="flex gap-3 text-sm text-gray-400 mb-2">
                <span>📦 {item.type}</span>
                <span>✨ {item.rarete}</span>
              </div>
              {item.description && <p className="text-gray-500 text-sm italic">{item.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
