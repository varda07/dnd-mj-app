'use client'

// ============================================================================
// JournalTable — le journal de table en direct (Delta A.5 / A.6)
// ----------------------------------------------------------------------------
// Flux temps réel de session_events, lisible par tous. Sert à trois endroits :
//   · zone de diffusion, quand le MJ ne pousse rien (elle n'est jamais vide) ;
//   · colonne droite du poste joueur sur PC ;
//   · menu Notes (accès au journal de séance en direct).
// Le canal passe par ouvrirCanal — jamais supabase.channel() en direct.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { ouvrirCanal } from '@/app/lib/session-realtime'
import { fetchSessionEvents, type SessionEvent } from '@/app/lib/session-live'

export function formatEventJoueur(e: SessionEvent, userId: string | null): string | null {
  const p = e.payload as Record<string, unknown>
  switch (e.type) {
    case 'dice_roll':
      if (p.prive === true && e.actor_user_id !== userId) return null
      return `🎲 ${String(p.nom ?? 'Quelqu’un')} — ${String(p.label ?? 'jet')} = ${String(p.total ?? '')}`
    case 'hp_change': {
      const d = Number(p.delta ?? 0)
      const cible = String(p.cible ?? 'Un personnage')
      return d < 0 ? `🩸 ${cible} encaisse ${Math.abs(d)} PV` : `💚 ${cible} récupère ${d} PV`
    }
    case 'resource_used':
      if (p.repos) return `🛏 Repos ${String(p.repos)} — ${String(p.cible ?? '')}`
      if (p.slot) return `🔮 Emplacement de niveau ${String(p.slot)} ${p.restitue ? 'restitué' : 'dépensé'}`
      if (p.ressource) return `🔮 ${String(p.ressource)} ${p.restitue ? 'restituée' : 'utilisée'}`
      return '🔮 Ressource mise à jour'
    case 'condition':
      return p.concentration !== undefined
        ? `🌀 Concentration : ${String(p.concentration ?? 'arrêtée')}`
        : '⚠️ États mis à jour'
    case 'narration':
      if (p.action === 'fin_tour') return `⏭ ${String(p.nom ?? 'Un joueur')} termine son tour`
      if (p.action === 'diffusion') return `📖 ${String(p.resume ?? 'Le MJ diffuse quelque chose')}`
      return `📜 ${String(p.texte ?? p.status ?? 'Narration')}`
    case 'combat_start':
      return '⚔️ Un combat commence'
    case 'combat_end':
      return '🏳 Le combat est terminé'
    case 'join':
      return '➜ Un joueur rejoint la table'
    case 'leave':
      return '⬅ Un joueur quitte la table'
    default:
      return null
  }
}

export default function JournalTable({
  sessionId,
  userId,
  limite = 40,
  titre = 'Journal de table'
}: {
  sessionId: string
  userId: string | null
  limite?: number
  titre?: string | null
}) {
  const [events, setEvents] = useState<SessionEvent[]>([])

  const charger = useCallback(async () => {
    setEvents(await fetchSessionEvents(sessionId, limite))
  }, [sessionId, limite])

  useEffect(() => {
    void charger()
    return ouvrirCanal(`session-journal-table:${sessionId}`, (c) =>
      c.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'session_events', filter: `session_id=eq.${sessionId}` },
        () => void charger()
      )
    )
  }, [sessionId, charger])

  const lignes = events
    .map((e) => ({ e, texte: formatEventJoueur(e, userId) }))
    .filter((x): x is { e: SessionEvent; texte: string } => x.texte !== null)

  return (
    <div className="h-full flex flex-col min-h-0">
      {titre && (
        <p className="text-[10px] uppercase tracking-widest text-yellow-600 mb-1.5 flex-shrink-0">{titre}</p>
      )}
      {lignes.length === 0 ? (
        <p className="text-stone-500 text-sm italic">La table est silencieuse pour l’instant.</p>
      ) : (
        <ul className="space-y-1 overflow-y-auto min-h-0 flex-1">
          {lignes.map(({ e, texte }) => (
            <li key={e.id} className="text-xs rounded border border-yellow-800/15 bg-stone-900/30 px-2 py-1 text-stone-300">
              <span className="text-stone-600 mr-1.5">
                {new Date(e.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {texte}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
