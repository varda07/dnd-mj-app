'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
  const router = useRouter()

  useEffect(() => {
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    const { data } = await supabase.from('scenarios').select('*').order('created_at', { ascending: false })
    if (data) setScenarios(data)
  }

  const creerScenario = async () => {
    if (!nom) return setMessage('Le nom est obligatoire !')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('scenarios').insert({ nom, description, notes, mj_id: user?.id })
    if (error) setMessage(error.message)
    else {
      setMessage('Scenario cree !')
      setNom('')
      setDescription('')
      setNotes('')
      fetchScenarios()
    }
    setLoading(false)
  }

  const supprimerScenario = async (id: string) => {
    await supabase.from('scenarios').delete().eq('id', id)
    fetchScenarios()
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
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-yellow-500 mb-4">Creer un scenario</h2>
          <div className="space-y-3">
            <input type="text" placeholder="Nom du scenario" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
            <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
            <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
            {message && <p className="text-yellow-400 text-sm">{message}</p>}
            <button type="button" onClick={creerScenario} disabled={loading} className="w-full p-3 bg-yellow-500 text-gray-900 font-bold rounded">
              {loading ? 'Chargement...' : 'Creer'}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-yellow-500">Mes scenarios</h2>
          {scenarios.length === 0 && <p className="text-gray-400">Aucun scenario pour l'instant.</p>}
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{scenario.nom}</h3>
                <button type="button" onClick={() => supprimerScenario(scenario.id)} className="text-red-400 text-sm">
                  Supprimer
                </button>
              </div>
              {scenario.description && <p className="text-gray-400 text-sm">{scenario.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}