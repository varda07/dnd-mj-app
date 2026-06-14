'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// ROADMAP V1 — Phase 3.5 : Analytics d'usage (vue admin)
// ----------------------------------------------------------------------------
// Top des actions/features sur une période (RPC admin_analytics_top). Aide à
// comprendre ce qui est utilisé (et ce qui l'est peu).
// ============================================================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminGuard from '@/app/components/AdminGuard'

type Ligne = { action: string; nb: number }

export default function AdminAnalyticsPage() {
  const [lignes, setLignes] = useState<Ligne[]>([])
  const [jours, setJours] = useState(30)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    void (async () => {
      const { data, error } = await supabase.rpc('admin_analytics_top', { jours })
      if (error) setErreur(error.message)
      else { setErreur(null); setLignes((data ?? []) as Ligne[]) }
      setLoading(false)
    })()
  }, [jours])

  const max = Math.max(1, ...lignes.map((l) => l.nb))

  return (
    <AdminGuard titre="📈 Analytics">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-400">Période :</span>
        {[7, 30, 90].map((j) => (
          <button
            key={j}
            type="button"
            onClick={() => setJours(j)}
            className={`text-xs px-2 py-1 rounded ${jours === j ? 'bg-[#C9A84C] text-[#0a0b0d] font-bold' : 'bg-gray-800 text-gray-300'}`}
          >
            {j} j
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : erreur ? (
        <p className="text-red-300 text-sm">Erreur : {erreur}<br /><span className="text-gray-500 text-xs">(La migration admin_v1 est-elle appliquée ?)</span></p>
      ) : lignes.length === 0 ? (
        <p className="text-gray-500 text-sm italic">Aucune donnée d&apos;usage sur cette période.</p>
      ) : (
        <div className="grim-card p-4 space-y-2">
          {lignes.map((l) => (
            <div key={l.action} className="flex items-center gap-2">
              <span className="text-xs text-gray-300 w-48 truncate" title={l.action}>{l.action}</span>
              <div className="flex-1 h-4 bg-black/40 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8a6f2c] to-[#C9A84C]"
                  style={{ width: `${Math.round((l.nb / max) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-[#C9A84C] font-bold w-12 text-right">{l.nb}</span>
            </div>
          ))}
        </div>
      )}
    </AdminGuard>
  )
}
