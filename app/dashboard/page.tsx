'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [interface_, setInterface] = useState<'mj' | 'joueur'>('mj')
  const [modeMJ, setModeMJ] = useState<'travail' | 'action'>('travail')
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) router.push('/')
    }
    getUser()
  }, [])

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <h1 className="text-xl font-bold text-yellow-500">D&D Manager</h1>
        <div className="flex bg-gray-700 rounded-lg p-1">
          <button type="button" onClick={() => setInterface('mj')} className={`px-4 py-2 rounded-md font-bold transition ${interface_ === 'mj' ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'}`}>
            MJ
          </button>
          <button type="button" onClick={() => setInterface('joueur')} className={`px-4 py-2 rounded-md font-bold transition ${interface_ === 'joueur' ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'}`}>
            Joueur
          </button>
        </div>
        <button type="button" onClick={async () => { await supabase.auth.signOut(); router.push('/') }} className="text-gray-400 hover:text-white text-sm">
          Deconnexion
        </button>
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
            {modeMJ === 'travail' && (
              <div>
                <h2 className="text-2xl font-bold text-blue-400 mb-4">Mode Travail</h2>
                <div className="grid grid-cols-2 gap-4">
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
                </div>
              </div>
            )}
            {modeMJ === 'action' && (
              <div>
                <h2 className="text-2xl font-bold text-red-400 mb-4">Mode Action</h2>
                <p className="text-gray-400">Selectionne un scenario pour commencer la partie !</p>
              </div>
            )}
          </div>
        </div>
      )}

      {interface_ === 'joueur' && (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-yellow-500 mb-4">Interface Joueur</h2>
          <p className="text-gray-400">Bienvenue Aventurier !</p>
        </div>
      )}
    </main>
  )
}