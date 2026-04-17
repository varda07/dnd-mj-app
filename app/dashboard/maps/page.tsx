'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Map = {
  id: string
  nom: string
  description: string
  image_url: string
}

export default function Maps() {
  const [maps, setMaps] = useState<Map[]>([])
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageActuelle, setImageActuelle] = useState('')

  useEffect(() => {
    fetchMaps()
  }, [])

  const resetForm = () => {
    setNom('')
    setDescription('')
    setFile(null)
    setEditingId(null)
    setImageActuelle('')
    const input = document.getElementById('map-file') as HTMLInputElement | null
    if (input) input.value = ''
  }

  const commencerEdition = (map: Map) => {
    setEditingId(map.id)
    setNom(map.nom)
    setDescription(map.description ?? '')
    setImageActuelle(map.image_url ?? '')
    setFile(null)
    const input = document.getElementById('map-file') as HTMLInputElement | null
    if (input) input.value = ''
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchMaps = async () => {
    const { data } = await supabase.from('maps').select('*').order('created_at', { ascending: false })
    if (data) setMaps(data)
  }

  const sauvegarderMap = async () => {
    if (!nom) return setMessage('Le nom est obligatoire !')
    if (!editingId && !file) return setMessage('Choisis une image !')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let imageUrl = imageActuelle
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user?.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('maps').upload(path, file)
      if (uploadError) {
        setMessage(uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('maps').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }

    if (editingId) {
      const { error } = await supabase.from('maps').update({
        nom,
        description,
        image_url: imageUrl
      }).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage('Carte modifiée !')
        resetForm()
        fetchMaps()
      }
    } else {
      const { error } = await supabase.from('maps').insert({
        nom,
        description,
        image_url: imageUrl,
        mj_id: user?.id
      })
      if (error) setMessage(error.message)
      else {
        setMessage('Carte créée !')
        resetForm()
        fetchMaps()
      }
    }
    setLoading(false)
  }

  const supprimerMap = async (id: string) => {
    await supabase.from('maps').delete().eq('id', id)
    fetchMaps()
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => window.location.href = '/dashboard'} className="text-gray-400 hover:text-white">
            Retour
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">🗺️ Maps</h1>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-yellow-500 mb-4">{editingId ? 'Modifier la carte' : 'Ajouter une carte'}</h2>
          <div className="space-y-3">
            <input type="text" placeholder="Nom de la carte *" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
            <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
            <div>
              <label className="text-gray-400 text-sm">
                {editingId ? 'Nouvelle image (laisser vide pour garder l\'actuelle)' : 'Image de la carte *'}
              </label>
              <input id="map-file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-yellow-500 file:text-gray-900 file:font-bold" />
              {editingId && imageActuelle && (
                <img src={imageActuelle} alt="actuelle" className="mt-2 max-h-32 rounded bg-gray-900" />
              )}
            </div>
            {message && <p className="text-yellow-400 text-sm">{message}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={sauvegarderMap} disabled={loading} className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded">
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
          <h2 className="text-lg font-bold text-yellow-500">Mes cartes</h2>
          {maps.length === 0 && <p className="text-gray-400">Aucune carte créée pour l'instant.</p>}
          {maps.map((map) => (
            <div key={map.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">{map.nom}</h3>
                <div className="flex gap-3">
                  <button type="button" onClick={() => commencerEdition(map)} className="text-blue-400 text-sm">
                    Modifier
                  </button>
                  <button type="button" onClick={() => supprimerMap(map.id)} className="text-red-400 text-sm">
                    Supprimer
                  </button>
                </div>
              </div>
              {map.image_url && (
                <img src={map.image_url} alt={map.nom} className="w-full max-h-96 object-contain rounded mb-2 bg-gray-900" />
              )}
              {map.description && <p className="text-gray-500 text-sm italic">{map.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
