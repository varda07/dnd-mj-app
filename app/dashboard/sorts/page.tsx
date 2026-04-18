'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Personnage = {
  id: string
  nom: string
}

type Sort = {
  id: string
  personnage_id: string
  nom: string
  niveau: number
  ecole: string
  description: string
  disponible: boolean
}

const ECOLES = [
  'Abjuration',
  'Invocation',
  'Divination',
  'Enchantement',
  'Évocation',
  'Illusion',
  'Nécromancie',
  'Transmutation'
]

const NIVEAUX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

export default function Sorts() {
  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const [sorts, setSorts] = useState<Sort[]>([])
  const [personnageId, setPersonnageId] = useState('')
  const [filtrePersonnageId, setFiltrePersonnageId] = useState('')
  const [nom, setNom] = useState('')
  const [niveau, setNiveau] = useState('0')
  const [ecole, setEcole] = useState(ECOLES[0])
  const [description, setDescription] = useState('')
  const [disponible, setDisponible] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPersonnages()
    fetchSorts()
  }, [])

  const resetForm = () => {
    setNom('')
    setNiveau('0')
    setEcole(ECOLES[0])
    setDescription('')
    setDisponible(true)
    setEditingId(null)
  }

  const commencerEdition = (sort: Sort) => {
    setEditingId(sort.id)
    setPersonnageId(sort.personnage_id)
    setNom(sort.nom)
    setNiveau(String(sort.niveau))
    setEcole(sort.ecole || ECOLES[0])
    setDescription(sort.description ?? '')
    setDisponible(sort.disponible)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchPersonnages = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('personnages')
      .select('id, nom')
      .eq('joueur_id', user.id)
      .order('nom')
    if (data) {
      setPersonnages(data)
      if (data.length > 0 && !personnageId) setPersonnageId(data[0].id)
    }
  }

  const fetchSorts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: mesPersos } = await supabase
      .from('personnages')
      .select('id')
      .eq('joueur_id', user.id)
    const ids = (mesPersos ?? []).map((p) => p.id)
    if (ids.length === 0) {
      setSorts([])
      return
    }
    const { data } = await supabase
      .from('sorts')
      .select('*')
      .in('personnage_id', ids)
      .order('niveau')
      .order('nom')
    if (data) setSorts(data)
  }

  const sauvegarderSort = async () => {
    if (!personnageId) return setMessage('Sélectionne un personnage !')
    if (!nom) return setMessage('Le nom du sort est obligatoire !')
    setLoading(true)
    const payload = {
      personnage_id: personnageId,
      nom,
      niveau: parseInt(niveau),
      ecole,
      description,
      disponible
    }
    if (editingId) {
      const { error } = await supabase.from('sorts').update(payload).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage('Sort modifié !')
        resetForm()
        fetchSorts()
      }
    } else {
      const { error } = await supabase.from('sorts').insert(payload)
      if (error) setMessage(error.message)
      else {
        setMessage('Sort ajouté !')
        resetForm()
        fetchSorts()
      }
    }
    setLoading(false)
  }

  const toggleDisponible = async (sort: Sort) => {
    await supabase.from('sorts').update({ disponible: !sort.disponible }).eq('id', sort.id)
    fetchSorts()
  }

  const supprimerSort = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.')) return
    await supabase.from('sorts').delete().eq('id', id)
    fetchSorts()
  }

  const nomPersonnage = (id: string) => personnages.find((p) => p.id === id)?.nom ?? 'Inconnu'

  const sortsAffiches = filtrePersonnageId
    ? sorts.filter((s) => s.personnage_id === filtrePersonnageId)
    : sorts

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => window.location.href = '/dashboard'} className="text-gray-400 hover:text-white">
            Retour
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">✨ Sorts</h1>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-yellow-500 mb-4">{editingId ? 'Modifier le sort' : 'Ajouter un sort'}</h2>
          {personnages.length === 0 ? (
            <p className="text-gray-400">Crée d&apos;abord un personnage pour lui ajouter des sorts.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-sm">Personnage *</label>
                <select value={personnageId} onChange={(e) => setPersonnageId(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                  {personnages.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
              </div>
              <input type="text" placeholder="Nom du sort *" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm">Niveau</label>
                  <select value={niveau} onChange={(e) => setNiveau(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                    {NIVEAUX.map((n) => <option key={n} value={n}>{n === 0 ? 'Tour de magie (0)' : `Niveau ${n}`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">École de magie</label>
                  <select value={ecole} onChange={(e) => setEcole(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                    {ECOLES.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <textarea placeholder="Description du sort" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input type="checkbox" checked={disponible} onChange={(e) => setDisponible(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
                <span>Sort disponible</span>
              </label>
              {message && <p className="text-yellow-400 text-sm">{message}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={sauvegarderSort} disabled={loading} className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded">
                  {loading ? 'Chargement...' : editingId ? 'Modifier' : 'Ajouter'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="px-4 p-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600">
                    Annuler
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-yellow-500">Sorts</h2>
            {personnages.length > 0 && (
              <select value={filtrePersonnageId} onChange={(e) => setFiltrePersonnageId(e.target.value)} className="p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm">
                <option value="">Tous les personnages</option>
                {personnages.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            )}
          </div>
          {sortsAffiches.length === 0 && <p className="text-gray-400">Aucun sort pour l&apos;instant.</p>}
          {sortsAffiches.map((sort) => (
            <div key={sort.id} className={`bg-gray-800 p-4 rounded-lg ${!sort.disponible ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={sort.disponible} onChange={() => toggleDisponible(sort)} className="w-4 h-4 accent-yellow-500" />
                  <h3 className={`text-lg font-bold ${sort.disponible ? 'text-white' : 'text-gray-500 line-through'}`}>{sort.nom}</h3>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => commencerEdition(sort)} className="text-blue-400 text-sm">
                    Modifier
                  </button>
                  <button type="button" onClick={() => supprimerSort(sort.id)} className="text-red-400 text-sm">
                    Supprimer
                  </button>
                </div>
              </div>
              <div className="flex gap-3 text-sm text-gray-400 mb-2 flex-wrap">
                <span>🧙 {nomPersonnage(sort.personnage_id)}</span>
                <span>🎯 {sort.niveau === 0 ? 'Tour de magie' : `Niveau ${sort.niveau}`}</span>
                <span>📚 {sort.ecole}</span>
                <span className={sort.disponible ? 'text-green-400' : 'text-red-400'}>
                  {sort.disponible ? '✓ Disponible' : '✗ Utilisé'}
                </span>
              </div>
              {sort.description && <p className="text-gray-500 text-sm italic">{sort.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
