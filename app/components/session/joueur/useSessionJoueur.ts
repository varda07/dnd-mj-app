'use client'

// ============================================================================
// useSessionJoueur — état vivant du joueur en séance (Phase 3.7)
// ----------------------------------------------------------------------------
// Charge la fiche + les sorts + l'état vivant du personnage, s'abonne au
// Realtime de character_live_state et session_state, et expose des actions à
// mise à jour OPTIMISTE (l'UI réagit tout de suite) réconciliées par Realtime.
// Chaque modification de PV est journalisée dans session_events avec l'auteur.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ouvrirCanal } from '@/app/lib/session-realtime'
import {
  fetchCharacterSheet,
  fetchCharacterSpells,
  fetchLiveState,
  fetchSessionState,
  logSessionEvent,
  patchLiveState,
  type CharacterLiveState,
  type CharacterSheet,
  type ClassResource,
  type SessionState,
  type SortJoue
} from '@/app/lib/session-live'

export type ConnState = 'connecte' | 'reconnexion' | 'hors-ligne'

function liveFromSheet(sessionId: string, s: CharacterSheet): CharacterLiveState {
  return {
    session_id: sessionId,
    character_id: s.id,
    current_hp: s.hp_actuel,
    temp_hp: s.temp_hp,
    max_hp_override: null,
    spell_slots_used: s.sorts_slots_used,
    class_resources_used: {},
    conditions: s.conditions,
    concentration_spell: null,
    death_saves: { success: s.death_success, fail: s.death_fail },
    updated_at: '',
    updated_by: null
  }
}

export function useSessionJoueur(sessionId: string, characterId: string | null) {
  const [userId, setUserId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<CharacterSheet | null>(null)
  const [spells, setSpells] = useState<SortJoue[]>([])
  const [live, setLive] = useState<CharacterLiveState | null>(null)
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [conn, setConn] = useState<ConnState>('reconnexion')
  const [loading, setLoading] = useState(true)
  const liveRef = useRef<CharacterLiveState | null>(null)
  liveRef.current = live

  useEffect(() => {
    let annule = false
    const charger = async () => {
      setLoading(true)
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!annule) setUserId(user?.id ?? null)

      const st = await fetchSessionState(sessionId)
      if (!annule) setSessionState(st)

      if (characterId) {
        const [sh, sp, lv] = await Promise.all([
          fetchCharacterSheet(characterId),
          fetchCharacterSpells(characterId),
          fetchLiveState(sessionId, characterId)
        ])
        if (annule) return
        setSheet(sh)
        setSpells(sp)
        setLive(lv ?? (sh ? liveFromSheet(sessionId, sh) : null))
      }
      if (!annule) setLoading(false)
    }
    void charger()
    return () => {
      annule = true
    }
  }, [sessionId, characterId])

  // Realtime : état vivant (MJ ↔ PJ) + état diffusé.
  useEffect(() => {
    return ouvrirCanal(
      `session-live:${sessionId}:${characterId ?? 'none'}`,
      (c) =>
        c
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'character_live_state',
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              const row = payload.new as Record<string, unknown>
              if (row && characterId && row.character_id === characterId) {
                void fetchLiveState(sessionId, characterId).then((lv) => lv && setLive(lv))
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'session_state',
              filter: `session_id=eq.${sessionId}`
            },
            () => void fetchSessionState(sessionId).then(setSessionState)
          ),
      (status) => {
        setConn(status === 'SUBSCRIBED' ? 'connecte' : status === 'CLOSED' ? 'hors-ligne' : 'reconnexion')
      }
    )
  }, [sessionId, characterId])

  // Applique un patch optimiste + persiste.
  const apply = useCallback(
    async (patch: Partial<CharacterLiveState>) => {
      if (!characterId) return
      setLive((l) => (l ? { ...l, ...patch } : l))
      await patchLiveState(sessionId, characterId, patch, userId)
    },
    [sessionId, characterId, userId]
  )

  const maxHp = (sheet?.hp_max ?? 0)
  const effectiveMaxHp = live?.max_hp_override ?? maxHp
  const currentHp = live?.current_hp ?? sheet?.hp_actuel ?? 0

  // --- Actions PV ---
  const modifierHp = useCallback(
    async (delta: number) => {
      const from = liveRef.current?.current_hp ?? currentHp
      const to = Math.max(0, Math.min(effectiveMaxHp, from + delta))
      await apply({ current_hp: to })
      await logSessionEvent(
        sessionId,
        'hp_change',
        { delta, from, to, par: 'joueur' },
        characterId
      )
    },
    [apply, currentHp, effectiveMaxHp, sessionId, characterId]
  )

  const setTempHp = useCallback(
    async (val: number) => apply({ temp_hp: Math.max(0, val) }),
    [apply]
  )

  // --- Emplacements de sorts ---
  const consommerSlot = useCallback(
    async (niveau: number) => {
      const key = String(niveau)
      const max = sheet?.sorts_slots_max?.[key] ?? 0
      const used = liveRef.current?.spell_slots_used?.[key] ?? 0
      if (used >= max) return false
      const next = { ...(liveRef.current?.spell_slots_used ?? {}), [key]: used + 1 }
      await apply({ spell_slots_used: next })
      await logSessionEvent(sessionId, 'resource_used', { slot: niveau }, characterId)
      return true
    },
    [apply, sheet, sessionId, characterId]
  )

  const restaurerSlot = useCallback(
    async (niveau: number) => {
      const key = String(niveau)
      const used = liveRef.current?.spell_slots_used?.[key] ?? 0
      if (used <= 0) return
      const next = { ...(liveRef.current?.spell_slots_used ?? {}), [key]: used - 1 }
      await apply({ spell_slots_used: next })
      await logSessionEvent(sessionId, 'resource_used', { slot: niveau, restitue: true }, characterId)
    },
    [apply, sessionId, characterId]
  )

  // --- Concentration ---
  const setConcentration = useCallback(
    async (sort: string | null) => {
      await apply({ concentration_spell: sort })
      await logSessionEvent(
        sessionId,
        'condition',
        { concentration: sort },
        characterId
      )
    },
    [apply, sessionId, characterId]
  )

  // --- Conditions ---
  const toggleCondition = useCallback(
    async (key: string) => {
      const cur = liveRef.current?.conditions ?? []
      const next = cur.includes(key) ? cur.filter((c) => c !== key) : [...cur, key]
      await apply({ conditions: next })
      await logSessionEvent(sessionId, 'condition', { conditions: next }, characterId)
    },
    [apply, sessionId, characterId]
  )

  // --- Jets de sauvegarde contre la mort ---
  const setDeathSaves = useCallback(
    async (ds: { success: number; fail: number }) => apply({ death_saves: ds }),
    [apply]
  )

  // --- Ressources de classe (compteurs personnalisés) ---
  const setResources = useCallback(
    async (res: Record<string, ClassResource>) => apply({ class_resources_used: res }),
    [apply]
  )

  // Consomme / restitue UN usage d'une ressource limitée, journalisé.
  const majRessource = useCallback(
    async (key: string, delta: 1 | -1) => {
      const res = liveRef.current?.class_resources_used ?? {}
      const r = res[key]
      if (!r) return
      const used = Math.max(0, Math.min(r.max, r.used + delta))
      if (used === r.used) return
      await apply({ class_resources_used: { ...res, [key]: { ...r, used } } })
      await logSessionEvent(
        sessionId,
        'resource_used',
        { ressource: r.label ?? key, restitue: delta < 0, restants: r.max - used, max: r.max },
        characterId
      )
    },
    [apply, sessionId, characterId]
  )

  return {
    userId,
    sheet,
    spells,
    live,
    sessionState,
    conn,
    loading,
    currentHp,
    effectiveMaxHp,
    tempHp: live?.temp_hp ?? sheet?.temp_hp ?? 0,
    conditions: live?.conditions ?? [],
    concentration: live?.concentration_spell ?? null,
    deathSaves: live?.death_saves ?? { success: 0, fail: 0 },
    resources: live?.class_resources_used ?? {},
    slotsUsed: live?.spell_slots_used ?? {},
    // actions
    modifierHp,
    setTempHp,
    consommerSlot,
    restaurerSlot,
    setConcentration,
    toggleCondition,
    setDeathSaves,
    setResources,
    majRessource
  }
}

export type SessionJoueurApi = ReturnType<typeof useSessionJoueur>
