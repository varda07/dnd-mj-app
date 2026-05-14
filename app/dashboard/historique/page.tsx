'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap 10.2 — Historique des actions
// ----------------------------------------------------------------------------
// Liste chronologique paginée des dernières actions de l'utilisateur,
// alimentée par le helper `logAction` (app/lib/historique.ts).
// Table : historique_actions (cf. migration 20260515060000_roadmap_phase10).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Entree = {
  id: string
  action_type: string
  entite_type: string
  description: string
  created_at: string
}

const PAGE_SIZE = 30

const META: Record<string, { emoji: string; label: string }> = {
  creation: { emoji: '✨', label: 'Création' },
  modification: { emoji: '✏️', label: 'Modification' },
  suppression: { emoji: '🗑️', label: 'Suppression' },
  combat: { emoji: '⚔️', label: 'Combat' },
  session: { emoji: '📅', label: 'Session' }
}

export default function HistoriquePage() {
  const router = useRouter()
  const [entrees, setEntrees] = useState<Entree[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const charger = useCallback(async () => {
    setLoading(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }
    const from = page * PAGE_SIZE
    const { data, count } = await supabase
      .from('historique_actions')
      .select('id, action_type, entite_type, description, created_at', {
        count: 'exact'
      })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    setEntrees((data ?? []) as Entree[])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, router])

  useEffect(() => {
    charger()
  }, [charger])

  const viderTout = async () => {
    if (!window.confirm('Effacer tout l’historique ?')) return
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('historique_actions').delete().eq('user_id', user.id)
    setPage(0)
    charger()
  }

  const nbPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Dashboard
          </button>
          <h1 className="text-2xl grim-title">Historique</h1>
          {total > 0 && (
            <button
              type="button"
              onClick={viderTout}
              className="ml-auto text-xs text-gray-500 hover:text-red-300"
            >
              Tout effacer
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-400">Chargement…</p>
        ) : entrees.length === 0 ? (
          <p className="text-gray-500 text-sm italic">
            Aucune action enregistrée pour l&apos;instant.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {entrees.map((e) => {
                const meta = META[e.action_type] ?? {
                  emoji: '•',
                  label: e.action_type
                }
                return (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 grim-card p-3"
                  >
                    <span className="text-lg flex-shrink-0">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-100">{e.description}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {meta.label}
                        {e.entite_type ? ` · ${e.entite_type}` : ''} ·{' '}
                        {new Date(e.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>

            {nbPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm disabled:opacity-40"
                >
                  ← Précédent
                </button>
                <span className="text-xs text-gray-400">
                  Page {page + 1} / {nbPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(nbPages - 1, p + 1))}
                  disabled={page >= nbPages - 1}
                  className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm disabled:opacity-40"
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
