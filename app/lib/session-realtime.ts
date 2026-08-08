'use client'

// ============================================================================
// Canaux Realtime du mode session — création sûre
// ----------------------------------------------------------------------------
// Deux règles imposées par @supabase/realtime-js :
//
// 1. `RealtimeClient.channel(topic)` NE crée PAS toujours un canal : s'il en
//    existe déjà un portant le même topic, il RENVOIE CELUI-LÀ.
// 2. `RealtimeChannel.on()` LÈVE UNE EXCEPTION si le canal est déjà `joined`
//    ou `joining` :
//    « cannot add `presence` callbacks for realtime:<topic> after `subscribe()` »
//
// Combinées, elles font planter toute page où deux composants ouvrent le même
// topic (cas de `session-presence:<id>`, ouvert par la page MJ ET par
// PanneauTable). Le second `.on()` lève, et le `removeChannel()` du premier
// démonté coupe le canal de l'autre → « WebSocket is closed before the
// connection is established ».
//
// Ce module est le SEUL point d'ouverture de canal du mode session :
//
// - `ouvrirCanal`  → canaux privés (postgres_changes). Topic rendu unique par
//   instance : `channel()` renvoie donc toujours un canal vierge, la collision
//   est structurellement impossible. Le nom du topic n'a aucune portée
//   fonctionnelle pour postgres_changes (contrairement à presence/broadcast).
// - `useSessionPresence` → LE salon de présence, forcément partagé (son topic
//   identifie le salon). Instance unique par session, comptage de références,
//   démontage différé pour absorber le double montage de React StrictMode.
//
// Dans les deux cas, l'ordre est garanti : channel() → .on(...) → .subscribe().
// ============================================================================

import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Canaux privés (postgres_changes)
// ---------------------------------------------------------------------------

let compteurInstance = 0

/**
 * Ouvre un canal Realtime et renvoie sa fonction de nettoyage.
 *
 * `configurer` enregistre les `.on(...)` et DOIT renvoyer le canal ; il est
 * appelé avant `subscribe()`, sur un canal neuf.
 *
 * @example
 *   useEffect(() => ouvrirCanal(`session-des:${sessionId}`, (c) =>
 *     c.on('postgres_changes', { ... }, () => void charger())
 *   ), [sessionId, charger])
 */
export function ouvrirCanal(
  topicBase: string,
  configurer: (channel: RealtimeChannel) => RealtimeChannel,
  onStatut?: (statut: string) => void
): () => void {
  compteurInstance += 1
  // Suffixe d'instance : garantit que `channel()` ne peut pas nous renvoyer un
  // canal déjà souscrit (y compris un canal en cours de démontage StrictMode).
  const channel: RealtimeChannel = supabase.channel(`${topicBase}#${compteurInstance}`)

  // .on(...) AVANT .subscribe() — l'inverse lève une exception.
  configurer(channel).subscribe((statut: string) => {
    onStatut?.(statut)
  })

  let ferme = false
  return () => {
    if (ferme) return
    ferme = true
    void supabase.removeChannel(channel)
  }
}

// ---------------------------------------------------------------------------
// Salon de présence partagé
// ---------------------------------------------------------------------------

type EntreePresence = {
  channel: RealtimeChannel
  refs: number
  timer: ReturnType<typeof setTimeout> | null
  ecouteurs: Set<(ids: Set<string>) => void>
  etat: Set<string>
}

/** Un salon vivant par topic. */
const salons = new Map<string, EntreePresence>()
/** Fermetures en vol : on ne recrée jamais un topic tant qu'il n'est pas retiré. */
const fermetures = new Map<string, Promise<unknown>>()

/** Délai avant démontage réel : absorbe le double montage de StrictMode. */
const DELAI_FERMETURE = 400

/** Instance stable renvoyée quand aucun salon n'est rejoint. */
const AUCUN: ReadonlySet<string> = new Set<string>()

/**
 * Rejoint le salon de présence de la session et renvoie l'ensemble des
 * `user_id` en ligne. Plusieurs composants peuvent l'appeler simultanément :
 * ils partagent un unique canal, compté par références.
 *
 * Passer `userId = null` (chargement, non authentifié) ne rejoint rien.
 */
export function useSessionPresence(
  sessionId: string,
  userId: string | null,
  role: 'mj' | 'joueur'
): Set<string> {
  const [enLigne, setEnLigne] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!sessionId || !userId) return
    const topic = `session-presence:${sessionId}`
    let annule = false
    let liberer: (() => void) | null = null

    const acquerir = async () => {
      // Une fermeture du même topic est en vol → l'attendre, sinon `channel()`
      // nous renverrait le canal mourant et `.on()` lèverait.
      const enVol = fermetures.get(topic)
      if (enVol) await enVol
      if (annule) return

      let entree = salons.get(topic)
      if (entree) {
        // Réutilisation : le canal est déjà souscrit, ne JAMAIS y rajouter
        // de `.on()` — on s'abonne via la liste d'écouteurs.
        if (entree.timer) {
          clearTimeout(entree.timer)
          entree.timer = null
        }
        entree.refs += 1
      } else {
        const channel: RealtimeChannel = supabase.channel(topic, {
          config: { presence: { key: userId } }
        })
        const creee: EntreePresence = {
          channel,
          refs: 1,
          timer: null,
          ecouteurs: new Set(),
          etat: new Set()
        }
        // .on(...) AVANT .subscribe().
        channel
          .on('presence', { event: 'sync' }, () => {
            creee.etat = new Set(Object.keys(channel.presenceState()))
            creee.ecouteurs.forEach((f) => f(creee.etat))
          })
          .subscribe((statut: string) => {
            if (statut === 'SUBSCRIBED') {
              void channel.track({ role, at: new Date().toISOString() })
            }
          })
        salons.set(topic, creee)
        entree = creee
      }

      const salon = entree
      const ecouteur = (ids: Set<string>) => setEnLigne(ids)
      salon.ecouteurs.add(ecouteur)
      setEnLigne(salon.etat)

      liberer = () => {
        salon.ecouteurs.delete(ecouteur)
        salon.refs -= 1
        if (salon.refs > 0) return
        salon.timer = setTimeout(() => {
          salon.timer = null
          if (salon.refs > 0) return // un consommateur est revenu entre-temps
          salons.delete(topic)
          const p = supabase.removeChannel(salon.channel)
          fermetures.set(topic, Promise.resolve(p).finally(() => {
            fermetures.delete(topic)
          }))
        }, DELAI_FERMETURE)
      }
    }

    void acquerir()

    return () => {
      annule = true
      liberer?.()
    }
  }, [sessionId, userId, role])

  // Hors salon, on renvoie un ensemble vide dérivé (pas de reset d'état dans
  // l'effet) : évite un rendu en cascade au montage.
  return sessionId && userId ? enLigne : (AUCUN as Set<string>)
}
