'use client'

// ============================================================================
// Fin de tour joueur → avance réelle de l'initiative (Delta D)
// ----------------------------------------------------------------------------
// La table `combats` n'est modifiable que par le MJ (RLS `combats_update`) : un
// joueur ne peut donc PAS écrire lui-même le tour suivant. Le circuit est :
//
//   joueur ──(session_events: narration/fin_tour)──► cockpit MJ ──► combat-engine
//          ◄────────── Realtime `combats` ─────────────┴──► toute la table
//
// Le cockpit MJ est toujours ouvert pendant une séance ; il relaie donc la
// demande et le changement de tour est diffusé à tout le monde par le Realtime
// déjà en place sur `combats`.
// ============================================================================

import { useEffect, useRef } from 'react'
import { ouvrirCanal } from '@/app/lib/session-realtime'
import { logSessionEvent, type SessionEvent } from '@/app/lib/session-live'

/** Côté joueur : demande le passage au combattant suivant. */
export async function demanderFinDeTour(
  sessionId: string,
  characterId: string | null,
  nom: string
): Promise<void> {
  await logSessionEvent(sessionId, 'narration', { action: 'fin_tour', nom }, characterId)
}

/**
 * Côté MJ : écoute les demandes de fin de tour et fait avancer l'initiative.
 * `avancer` reçoit l'identifiant du personnage demandeur ; c'est au cockpit de
 * vérifier que c'est bien son tour avant de passer au suivant.
 */
export function useRelaisFinDeTour(
  sessionId: string,
  avancer: (characterId: string | null) => void
): void {
  const avancerRef = useRef(avancer)
  useEffect(() => {
    avancerRef.current = avancer
  })

  useEffect(() => {
    const vus = new Set<string>()
    return ouvrirCanal(`session-fin-tour:${sessionId}`, (c) =>
      c.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_events',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const e = payload.new as SessionEvent
          if (!e || e.type !== 'narration') return
          const p = (e.payload ?? {}) as Record<string, unknown>
          if (p.action !== 'fin_tour') return
          if (vus.has(e.id)) return
          vus.add(e.id)
          avancerRef.current(e.character_id ?? null)
        }
      )
    )
  }, [sessionId])
}
