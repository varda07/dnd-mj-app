'use client'

// ============================================================================
// Roadmap Modes 2.9 — Historique de combat (panneau dépliable)
// ----------------------------------------------------------------------------
// Liste les actions du combat (attaques, sorts, soins, conditions, morts).
// Realtime via Supabase (combats_evenements).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Evt = {
  id: string
  round: number
  type: string
  description: string
  acteur_nom: string | null
  cible_nom: string | null
  degats: number | null
  created_at: string
}

const TYPE_ICON: Record<string, string> = {
  attaque: '⚔️', sort: '✨', condition: '🌀', mort: '💀', soin: '💚', note: '📝',
}

export default function HistoriqueCombat({ combatId }: { combatId: string }) {
  const [events, setEvents] = useState<Evt[]>([])
  const [ouvert, setOuvert] = useState(false)

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from('combats_evenements')
      .select('*')
      .eq('combat_id', combatId)
      .order('created_at', { ascending: false })
      .limit(100)
    setEvents((data ?? []) as Evt[])
  }, [combatId])

  useEffect(() => { void charger() }, [charger])

  useEffect(() => {
    if (!combatId) return
    const ch = supabase
      .channel(`combat-evt:${combatId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'combats_evenements', filter: `combat_id=eq.${combatId}` },
        (p) => setEvents((curr) => [p.new as Evt, ...curr].slice(0, 100))
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [combatId])

  return (
    <div className="codex-card p-3 mt-3">
      <button type="button" onClick={() => setOuvert((o) => !o)}
        className="w-full flex items-center justify-between"
      >
        <span className="text-[10px] uppercase tracking-[0.22em] text-yellow-500 font-bold">
          📜 Historique du combat {events.length > 0 ? `(${events.length})` : ''}
        </span>
        <span className="text-xs text-gray-500">{ouvert ? '▾' : '▸'}</span>
      </button>
      {ouvert && (
        events.length === 0 ? (
          <p className="text-xs text-gray-500 italic mt-2">Aucune action enregistrée.</p>
        ) : (
          <ul className="mt-2 space-y-1 max-h-72 overflow-y-auto codex-scroll pr-1 text-xs">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-2 text-gray-200">
                <span className="font-bold w-6 text-center text-gray-500">R{e.round}</span>
                <span className="mt-0.5">{TYPE_ICON[e.type] ?? '•'}</span>
                <div className="flex-1 min-w-0">
                  <div>{e.description}</div>
                  {e.degats != null && e.degats > 0 && (
                    <div className="text-red-300">{e.degats} dégâts</div>
                  )}
                  <div className="text-[10px] text-gray-500">
                    {new Date(e.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

/** Helper : log un événement de combat. */
export async function logEvenementCombat(
  combatId: string,
  round: number,
  type: string,
  description: string,
  extra: { acteur_nom?: string; cible_nom?: string; degats?: number; metadonnees?: Record<string, unknown> } = {}
) {
  try {
    await supabase.from('combats_evenements').insert({
      combat_id: combatId,
      round,
      type,
      description,
      acteur_nom: extra.acteur_nom ?? null,
      cible_nom: extra.cible_nom ?? null,
      degats: extra.degats ?? null,
      metadonnees: extra.metadonnees ?? {},
    })
  } catch { /* silencieux */ }
}
