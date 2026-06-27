'use client'

// ============================================================================
// Moteur de combat unifié — Phase 1.1
// ----------------------------------------------------------------------------
// Logique métier centralisée et réutilisable par TOUS les points d'entrée du
// combat (rapide MJ-seul, diffusé, préparé, impromptu). N'importe QUE des types
// de la page diffusion (imports type-only → aucun cycle runtime). Toute la
// logique d'état + persistance Supabase + stats vit ici.
//
//   - helpers purs : rollInitiative, etatQualitatif, nextTurn/prevTurn…
//   - hook useCombatEngine(scenarioId) : état + actions + realtime + persistance
//
// Le mode "diffusé" (presentation/page.tsx) conserve sa propre orchestration de
// snapshot joueurs ; il peut adopter ces helpers progressivement.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logEvenementCombat } from '@/app/components/combat/HistoriqueCombat'
import type {
  CombatLite,
  InitiativeEntry,
  Persona,
  Ennemi
} from '@/app/dashboard/presentation/page'

// Combat tel que renvoyé par le moteur : CombatLite + id + horodatage.
export type EngineCombat = CombatLite & { id?: string; demarre_a?: string | null }

const COMBAT_COLUMNS =
  'id, scenario_id, round, tour_actuel, ordre_initiative, actif, en_pause, etats_combat, carte_id, carte_visible_joueurs, positions, demarre_a'

// ---------------------------------------------------------------------------
// Helpers purs (réutilisables côté UI ou serveur léger)
// ---------------------------------------------------------------------------

// Résout l'UUID d'entité quel que soit le schéma d'ordre_initiative.
export function resolveEntiteId(e: InitiativeEntry | null | undefined): string | null {
  if (!e) return null
  return e.ref_id ?? e.id ?? (e.piece_id ? e.piece_id.replace(/^(perso|ennemi)-/, '') : null)
}

// État qualitatif d'un combattant (jamais de PV exacts côté joueurs).
export type EtatQualitatif = { label: string; couleur: string }
export function etatQualitatif(hp: number, hpMax: number): EtatQualitatif {
  if (hpMax <= 0 || hp <= 0) return { label: 'Hors de combat', couleur: '#6b7280' }
  const ratio = hp / hpMax
  if (ratio >= 0.75) return { label: 'En forme', couleur: '#4ade80' }
  if (ratio >= 0.5) return { label: 'Blessé', couleur: '#facc15' }
  if (ratio >= 0.25) return { label: 'Mal en point', couleur: '#fb923c' }
  return { label: 'Mourant', couleur: '#f87171' }
}

// Tire une initiative (d20) pour tous les participants et trie décroissant.
export function rollInitiative(
  personnages: Persona[],
  ennemis: Ennemi[]
): InitiativeEntry[] {
  const d20 = () => Math.floor(Math.random() * 20) + 1
  return [
    ...personnages.map((p) => ({
      kind: 'perso' as const,
      nom: p.nom,
      piece_id: `perso-${p.id}`,
      ref_id: p.id,
      image_url: p.image_url,
      init: d20()
    })),
    ...ennemis.map((e) => ({
      kind: 'ennemi' as const,
      nom: e.nom,
      piece_id: `ennemi-${e.id}`,
      ref_id: e.id,
      image_url: e.image_url,
      init: d20()
    }))
  ].sort((a, b) => (b.init ?? 0) - (a.init ?? 0))
}

// Patch pour avancer / reculer d'un tour (avec bouclage de round).
export function nextTurnPatch(combat: CombatLite): Partial<CombatLite> {
  const n = combat.ordre_initiative.length
  if (n === 0) return {}
  const next = combat.tour_actuel + 1
  return next >= n ? { tour_actuel: 0, round: combat.round + 1 } : { tour_actuel: next }
}
export function prevTurnPatch(combat: CombatLite): Partial<CombatLite> {
  const n = combat.ordre_initiative.length
  if (n === 0) return {}
  const prev = combat.tour_actuel - 1
  if (prev < 0) {
    return combat.round > 1 ? { tour_actuel: n - 1, round: combat.round - 1 } : {}
  }
  return { tour_actuel: prev }
}

// ---------------------------------------------------------------------------
// Statistiques de fin de combat (Phase 4.2) — calculées depuis combats_evenements.
// ---------------------------------------------------------------------------
export type CombatStats = {
  rounds: number
  dureeSecondes: number | null
  degatsInfliges: Record<string, number>
  degatsSubis: Record<string, number>
  critiques: Record<string, number>
  mvp: { nom: string; degats: number } | null
}

export async function computeCombatStats(
  combatId: string,
  round: number,
  demarreA: string | null
): Promise<CombatStats> {
  const { data } = await supabase
    .from('combats_evenements')
    .select('type, acteur_nom, cible_nom, degats, metadonnees')
    .eq('combat_id', combatId)
  const evts = (data ?? []) as Array<{
    type: string
    acteur_nom: string | null
    cible_nom: string | null
    degats: number | null
    metadonnees: Record<string, unknown> | null
  }>
  const degatsInfliges: Record<string, number> = {}
  const degatsSubis: Record<string, number> = {}
  const critiques: Record<string, number> = {}
  for (const e of evts) {
    const d = e.degats ?? 0
    if (d > 0) {
      if (e.acteur_nom) degatsInfliges[e.acteur_nom] = (degatsInfliges[e.acteur_nom] ?? 0) + d
      if (e.cible_nom) degatsSubis[e.cible_nom] = (degatsSubis[e.cible_nom] ?? 0) + d
    }
    if (e.metadonnees && (e.metadonnees as { critique?: boolean }).critique && e.acteur_nom) {
      critiques[e.acteur_nom] = (critiques[e.acteur_nom] ?? 0) + 1
    }
  }
  let mvp: { nom: string; degats: number } | null = null
  for (const [nom, deg] of Object.entries(degatsInfliges)) {
    if (!mvp || deg > mvp.degats) mvp = { nom, degats: deg }
  }
  const dureeSecondes = demarreA
    ? Math.max(0, Math.round((Date.now() - new Date(demarreA).getTime()) / 1000))
    : null
  return { rounds: round, dureeSecondes, degatsInfliges, degatsSubis, critiques, mvp }
}

// ---------------------------------------------------------------------------
// Hook moteur : état + actions + realtime + persistance pour un scénario.
// ---------------------------------------------------------------------------
export function useCombatEngine(scenarioId: string | null, opts?: { isMj?: boolean }) {
  const isMj = opts?.isMj ?? true
  const [combat, setCombat] = useState<EngineCombat | null>(null)
  const [personnages, setPersonnages] = useState<Persona[]>([])
  const [ennemis, setEnnemis] = useState<Ennemi[]>([])
  const [loading, setLoading] = useState(true)
  const positionsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestPositions = useRef<Record<string, { x: number; y: number }>>({})

  // Chargement initial : combat + roster du scénario.
  useEffect(() => {
    if (!scenarioId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }
    let cancel = false
    const charger = async () => {
      const [combatRes, persosRes, ennemisRes] = await Promise.all([
        supabase.from('combats').select(COMBAT_COLUMNS).eq('scenario_id', scenarioId).maybeSingle(),
        supabase
          .from('personnages')
          .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url, conditions, ca, force, dexterite, constitution, intelligence, sagesse, charisme, saves_maitrises')
          .eq('scenario_id', scenarioId),
        supabase
          .from('ennemis')
          .select(
            'id, nom, hp_actuel, hp_max, image_url, conditions, armure, attaques, resistances, immunites, vulnerabilites, comportement_tactique, force, dexterite, constitution, intelligence, sagesse, charisme'
          )
          .eq('scenario_id', scenarioId)
      ])
      if (cancel) return
      if (combatRes.data) setCombat(combatRes.data as EngineCombat)
      setPersonnages(
        ((persosRes.data ?? []) as Persona[]).sort((a, b) => a.nom.localeCompare(b.nom))
      )
      setEnnemis(((ennemisRes.data ?? []) as Ennemi[]).sort((a, b) => a.nom.localeCompare(b.nom)))
      setLoading(false)
    }
    charger()
    return () => {
      cancel = true
    }
  }, [scenarioId])

  // Realtime : changements de la ligne combats du scénario.
  useEffect(() => {
    if (!scenarioId) return
    const channel = supabase
      .channel(`combat-engine:${scenarioId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'combats', filter: `scenario_id=eq.${scenarioId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') setCombat(null)
          else setCombat(payload.new as EngineCombat)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [scenarioId])

  const sauverCombat = useCallback(
    async (patch: Partial<EngineCombat>) => {
      if (!scenarioId || !isMj) return
      setCombat((c) => (c ? { ...c, ...patch } : c))
      const { error } = await supabase.from('combats').update(patch).eq('scenario_id', scenarioId)
      if (error) console.error('[combat-engine] save :', error.message)
    },
    [scenarioId, isMj]
  )

  const modifierHp = useCallback(
    async (kind: 'perso' | 'ennemi', id: string, delta: number) => {
      if (!isMj) return
      const table = kind === 'perso' ? 'personnages' : 'ennemis'
      let nouvelHp = 0
      let nom = ''
      const apply = <T extends { id: string; nom: string; hp_actuel: number; hp_max: number }>(p: T): T => {
        if (p.id !== id) return p
        nouvelHp = Math.max(0, Math.min(p.hp_max, p.hp_actuel + delta))
        nom = p.nom
        return { ...p, hp_actuel: nouvelHp }
      }
      if (kind === 'perso') setPersonnages((l) => l.map(apply))
      else setEnnemis((l) => l.map(apply))
      const { error } = await supabase.from(table).update({ hp_actuel: nouvelHp }).eq('id', id)
      if (error) console.error('[combat-engine] modifierHp :', error.message)
      // Stats : on logue les dégâts/soins (pour le récap de fin).
      if (combat?.id && delta !== 0) {
        void logEvenementCombat(
          combat.id,
          combat.round,
          delta < 0 ? 'degats' : 'soin',
          `${nom} ${delta < 0 ? 'subit' : 'récupère'} ${Math.abs(delta)} PV`,
          { cible_nom: nom, degats: Math.abs(delta) }
        )
      }
    },
    [isMj, combat]
  )

  const toggleCondition = useCallback(
    async (kind: 'perso' | 'ennemi', id: string, key: string) => {
      if (!isMj) return
      const table = kind === 'perso' ? 'personnages' : 'ennemis'
      let next: string[] = []
      const apply = <T extends { id: string; conditions: string[] }>(p: T): T => {
        if (p.id !== id) return p
        const cur = Array.isArray(p.conditions) ? p.conditions : []
        next = cur.includes(key) ? cur.filter((c) => c !== key) : [...cur, key]
        return { ...p, conditions: next }
      }
      if (kind === 'perso') setPersonnages((l) => l.map(apply))
      else setEnnemis((l) => l.map(apply))
      const { error } = await supabase.from(table).update({ conditions: next }).eq('id', id)
      if (error) console.error('[combat-engine] toggleCondition :', error.message)
    },
    [isMj]
  )

  const clearConditions = useCallback(
    async (kind: 'perso' | 'ennemi', id: string) => {
      if (!isMj) return
      const table = kind === 'perso' ? 'personnages' : 'ennemis'
      if (kind === 'perso')
        setPersonnages((l) => l.map((p) => (p.id === id ? { ...p, conditions: [] } : p)))
      else setEnnemis((l) => l.map((e) => (e.id === id ? { ...e, conditions: [] } : e)))
      const { error } = await supabase.from(table).update({ conditions: [] }).eq('id', id)
      if (error) console.error('[combat-engine] clearConditions :', error.message)
    },
    [isMj]
  )

  const tourSuivant = useCallback(() => {
    if (combat) sauverCombat(nextTurnPatch(combat))
  }, [combat, sauverCombat])
  const tourPrecedent = useCallback(() => {
    if (combat) sauverCombat(prevTurnPatch(combat))
  }, [combat, sauverCombat])

  // Lance (ou relance) un combat avec une initiative tirée pour le roster donné.
  const lancer = useCallback(
    async (participants?: { personnages: Persona[]; ennemis: Ennemi[] }) => {
      if (!scenarioId || !isMj) return
      const pjs = participants?.personnages ?? personnages
      const ens = participants?.ennemis ?? ennemis
      const ordre = rollInitiative(pjs, ens)
      if (ordre.length === 0) return
      const patch = {
        round: 1,
        tour_actuel: 0,
        ordre_initiative: ordre,
        actif: true,
        en_pause: false,
        demarre_a: new Date().toISOString()
      }
      setCombat((c) => ({ scenario_id: scenarioId, ...(c ?? {}), ...patch }) as EngineCombat)
      const { error } = await supabase
        .from('combats')
        .upsert({ scenario_id: scenarioId, ...patch }, { onConflict: 'scenario_id' })
      if (error) console.error('[combat-engine] lancer :', error.message)
    },
    [scenarioId, isMj, personnages, ennemis]
  )

  const terminer = useCallback(() => sauverCombat({ actif: false }), [sauverCombat])

  const togglePause = useCallback(
    () =>
      sauverCombat({
        en_pause: !combat?.en_pause
      }),
    [combat?.en_pause, sauverCombat]
  )

  const deplacerJeton = useCallback(
    (pieceId: string, x: number, y: number) => {
      if (!scenarioId || !isMj) return
      setCombat((c) => {
        const positions = { ...(c?.positions ?? {}), [pieceId]: { x, y } }
        latestPositions.current = positions
        return c ? { ...c, positions } : c
      })
      if (positionsTimer.current) clearTimeout(positionsTimer.current)
      positionsTimer.current = setTimeout(() => {
        supabase
          .from('combats')
          .update({ positions: latestPositions.current })
          .eq('scenario_id', scenarioId)
          .then(({ error }) => {
            if (error) console.error('[combat-engine] positions :', error.message)
          })
      }, 250)
    },
    [scenarioId, isMj]
  )

  const toggleCarteVisible = useCallback(
    () => sauverCombat({ carte_visible_joueurs: !combat?.carte_visible_joueurs }),
    [combat?.carte_visible_joueurs, sauverCombat]
  )

  // Recharge le roster (après ajout d'ennemis depuis la bibliothèque, etc.).
  const rechargerRoster = useCallback(async () => {
    if (!scenarioId) return
    const [persosRes, ennemisRes] = await Promise.all([
      supabase
        .from('personnages')
        .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url, conditions, ca, force, dexterite, constitution, intelligence, sagesse, charisme, saves_maitrises')
        .eq('scenario_id', scenarioId),
      supabase
        .from('ennemis')
        .select(
          'id, nom, hp_actuel, hp_max, image_url, conditions, armure, attaques, resistances, immunites, vulnerabilites, comportement_tactique, force, dexterite, constitution, intelligence, sagesse, charisme'
        )
        .eq('scenario_id', scenarioId)
    ])
    setPersonnages(((persosRes.data ?? []) as Persona[]).sort((a, b) => a.nom.localeCompare(b.nom)))
    setEnnemis(((ennemisRes.data ?? []) as Ennemi[]).sort((a, b) => a.nom.localeCompare(b.nom)))
  }, [scenarioId])

  return {
    combat,
    personnages,
    ennemis,
    loading,
    setCombat,
    // actions
    sauverCombat,
    modifierHp,
    toggleCondition,
    clearConditions,
    tourSuivant,
    tourPrecedent,
    lancer,
    terminer,
    togglePause,
    deplacerJeton,
    toggleCarteVisible,
    rechargerRoster
  }
}
