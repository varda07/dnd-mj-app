'use client'

import { useRouter } from 'next/navigation'

export default function AventurePage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gray-900 text-white p-3 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white"
          >
            ← Retour
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-yellow-500">🗡️ Aventure</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard/combat')}
            className="bg-gray-800 p-3 md:p-4 rounded-lg hover:bg-gray-700 transition text-left"
          >
            <h3 className="text-[13px] md:text-lg font-medium md:font-bold text-yellow-500 tracking-wider">
              ⚔ Combat
            </h3>
            <p className="text-[10px] md:text-sm text-[#6a6a72] md:text-gray-400 mt-1">
              Gerer les combats et initiatives
            </p>
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/exploration')}
            className="bg-gray-800 p-3 md:p-4 rounded-lg hover:bg-gray-700 transition text-left"
          >
            <h3 className="text-[13px] md:text-lg font-medium md:font-bold text-yellow-500 tracking-wider">
              🗺 Exploration
            </h3>
            <p className="text-[10px] md:text-sm text-[#6a6a72] md:text-gray-400 mt-1">
              Carte brouillard et decouverte
            </p>
          </button>
        </div>
      </div>
    </main>
  )
}
