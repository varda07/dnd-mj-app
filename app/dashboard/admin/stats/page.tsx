'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// ROADMAP V1 — Phase 3.1 : Dashboard de stats globales
// ----------------------------------------------------------------------------
// Lit la fonction RPC admin_stats() (SECURITY DEFINER, admin only) qui renvoie
// les compteurs globaux + une série « nouveaux utilisateurs / mois ».
// ============================================================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminGuard from '@/app/components/AdminGuard'

type Stats = {
  utilisateurs: number
  utilisateurs_actifs_7j: number
  utilisateurs_nouveaux_30j: number
  scenarios: number
  personnages: number
  ennemis: number
  pnj: number
  items: number
  sorts: number
  combats: number
  sessions_diffusion: number
  tables_effets: number
  serie_utilisateurs: { mois: string; nb: number }[]
}

function Carte({ label, valeur, icon, accent }: { label: string; valeur: number; icon: string; accent?: boolean }) {
  return (
    <div className={`rounded p-3 border ${accent ? 'border-[#C9A84C]/50 bg-[rgba(201,168,76,0.06)]' : 'border-[rgba(201,168,76,0.18)] bg-[rgba(0,0,0,0.30)]'}`}>
      <div className="text-2xl font-bold text-[#C9A84C]">{valeur.toLocaleString('fr-FR')}</div>
      <div className="text-[11px] text-[#a8a8b0] mt-0.5">{icon} {label}</div>
    </div>
  )
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc('admin_stats')
      if (error) setErreur(error.message)
      else setStats(data as Stats)
      setLoading(false)
    })()
  }, [])

  const maxSerie = stats ? Math.max(1, ...stats.serie_utilisateurs.map((p) => p.nb)) : 1

  return (
    <AdminGuard titre="📊 Statistiques">
      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : erreur ? (
        <p className="text-red-300 text-sm">Erreur : {erreur}<br /><span className="text-gray-500 text-xs">(La migration admin_v1 est-elle appliquée ?)</span></p>
      ) : stats ? (
        <div className="space-y-5">
          <section>
            <h2 className="text-sm uppercase tracking-wider text-[#6a6a72] mb-2">Utilisateurs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Carte label="Total" valeur={stats.utilisateurs} icon="👥" accent />
              <Carte label="Actifs (7 j)" valeur={stats.utilisateurs_actifs_7j} icon="🟢" />
              <Carte label="Nouveaux (30 j)" valeur={stats.utilisateurs_nouveaux_30j} icon="✨" />
            </div>
          </section>

          <section>
            <h2 className="text-sm uppercase tracking-wider text-[#6a6a72] mb-2">Contenus créés</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Carte label="Scénarios" valeur={stats.scenarios} icon="📖" />
              <Carte label="Personnages" valeur={stats.personnages} icon="🛡" />
              <Carte label="Ennemis" valeur={stats.ennemis} icon="👹" />
              <Carte label="PNJ" valeur={stats.pnj} icon="🧑" />
              <Carte label="Items" valeur={stats.items} icon="🎒" />
              <Carte label="Sorts" valeur={stats.sorts} icon="✨" />
              <Carte label="Tables d'effets" valeur={stats.tables_effets} icon="🎲" />
            </div>
          </section>

          <section>
            <h2 className="text-sm uppercase tracking-wider text-[#6a6a72] mb-2">Activité</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Carte label="Combats lancés" valeur={stats.combats} icon="⚔️" />
              <Carte label="Sessions diffusion" valeur={stats.sessions_diffusion} icon="📡" />
            </div>
          </section>

          <section>
            <h2 className="text-sm uppercase tracking-wider text-[#6a6a72] mb-2">Nouveaux utilisateurs (6 derniers mois)</h2>
            <div className="grim-card p-4 flex items-end gap-2 h-40">
              {stats.serie_utilisateurs.map((p) => (
                <div key={p.mois} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className="text-[10px] text-[#a8a8b0]">{p.nb}</span>
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-[#8a6f2c] to-[#C9A84C]"
                    style={{ height: `${Math.round((p.nb / maxSerie) * 100)}%`, minHeight: p.nb > 0 ? 4 : 0 }}
                  />
                  <span className="text-[9px] text-[#6a6a72]">{p.mois.slice(5)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </AdminGuard>
  )
}
