'use client'

// ============================================================================
// Roadmap Modes 1.4 — Historique de session (timeline déroulable côté MJ)
// ----------------------------------------------------------------------------
// Affiche les événements historisés (combats, crits, morts, lieux, loot, …)
// avec filtres par type. Realtime via Supabase.
//
// L'historique est aussi alimenté par d'autres flux (combat page, dice
// launcher) via le helper logHistorique() ci-dessous.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type HistoriqueType = 'combat' | 'crit' | 'mort' | 'lieu' | 'loot' | 'note' | 'sondage' | 'autre'

const TYPE_META: Record<HistoriqueType, { label: string; icon: string; color: string }> = {
  combat:  { label: 'Combats',   icon: '⚔️', color: '#fca5a5' },
  crit:    { label: 'Critiques', icon: '🎯', color: '#fbbf24' },
  mort:    { label: 'Morts',     icon: '💀', color: '#f87171' },
  lieu:    { label: 'Lieux',     icon: '🗺',  color: '#a7f3d0' },
  loot:    { label: 'Loot',      icon: '🎁', color: '#fde047' },
  note:    { label: 'Notes',     icon: '📝', color: '#93c5fd' },
  sondage: { label: 'Sondages',  icon: '📊', color: '#c4b5fd' },
  autre:   { label: 'Autres',    icon: '•',  color: '#9ca3af' },
}

type Entry = {
  id: string
  type: HistoriqueType
  description: string
  metadonnees: Record<string, unknown>
  created_at: string
}

export default function HistoriqueSessionPanel({ sessionId }: { sessionId: string }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [filtres, setFiltres] = useState<Set<HistoriqueType>>(new Set())
  const [ouvert, setOuvert] = useState(true)

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from('historique_session')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(200)
    setEntries((data ?? []) as Entry[])
  }, [sessionId])

  useEffect(() => { void charger() }, [charger])

  // Realtime
  useEffect(() => {
    if (!sessionId) return
    const ch = supabase
      .channel(`historique:${sessionId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'historique_session', filter: `session_id=eq.${sessionId}` },
        (payload) => setEntries((curr) => [payload.new as Entry, ...curr].slice(0, 200))
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId])

  const filtres_actifs = filtres.size > 0
  const visibles = useMemo(() => {
    if (!filtres_actifs) return entries
    return entries.filter((e) => filtres.has(e.type))
  }, [entries, filtres, filtres_actifs])

  const toggleFiltre = (t: HistoriqueType) => {
    setFiltres((s) => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n })
  }

  return (
    <div className="codex-card p-4">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="text-[10px] uppercase tracking-[0.22em] text-yellow-500 font-bold">
          📜 Historique de la session {entries.length > 0 ? `(${entries.length})` : ''}
        </span>
        <span className="text-xs text-gray-500">{ouvert ? '▾' : '▸'}</span>
      </button>

      {ouvert && (
        <>
          <div className="flex flex-wrap gap-1 mt-3 mb-3">
            {(Object.keys(TYPE_META) as HistoriqueType[]).map((t) => {
              const meta = TYPE_META[t]
              const actif = filtres.has(t)
              return (
                <button
                  key={t} type="button" onClick={() => toggleFiltre(t)}
                  className={`text-[11px] px-2 py-0.5 rounded border ${
                    actif ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-200' : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                  style={actif ? { color: meta.color, borderColor: meta.color + '88' } : undefined}
                >
                  {meta.icon} {meta.label}
                </button>
              )
            })}
            {filtres.size > 0 && (
              <button type="button" onClick={() => setFiltres(new Set())} className="text-[11px] px-2 py-0.5 text-gray-400 hover:text-white">
                ✕ effacer
              </button>
            )}
          </div>

          {visibles.length === 0 ? (
            <p className="text-xs text-gray-500 italic">Pas encore d'événement.</p>
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto codex-scroll pr-1">
              {visibles.map((e) => {
                const meta = TYPE_META[e.type] ?? TYPE_META.autre
                return (
                  <li key={e.id} className="flex items-start gap-2 text-xs text-gray-200">
                    <span style={{ color: meta.color }} className="font-bold mt-0.5">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div>{e.description}</div>
                      <div className="text-[10px] text-gray-500">
                        {new Date(e.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Helper : log un événement dans l'historique d'une session.
 * À appeler depuis combat / dice / etc.
 */
export async function logHistorique(
  sessionId: string,
  type: HistoriqueType,
  description: string,
  metadonnees: Record<string, unknown> = {}
) {
  try {
    await supabase.from('historique_session').insert({
      session_id: sessionId,
      type,
      description,
      metadonnees,
    })
  } catch { /* silencieux */ }
}
