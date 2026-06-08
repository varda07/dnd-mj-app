'use client'

// ============================================================================
// Préparateur de combat — accès données + lancement (Phases 2 & 3)
// ----------------------------------------------------------------------------
// CRUD sur combats_prepares + lancement d'un combat préparé : on applique la
// config (ennemis liés au scénario, conditions de départ, positions, carte) à
// la ligne `combats` du scénario, puis la page navigue vers combat rapide ou
// diffusion. Le moteur (combat-engine) reste la source des helpers d'init.
// ============================================================================

import { supabase } from '@/lib/supabase'
import { rollInitiative } from '@/app/lib/combat-engine'
import type { InitiativeEntry, Persona, Ennemi } from '@/app/dashboard/presentation/page'

export type PrepParticipant = {
  kind: 'ennemi' | 'perso'
  ref_id: string
  nom: string
  image_url: string | null
}

export type ConditionsDepart = {
  surprise?: boolean
  conditions?: Record<string, string[]> // piece_id -> conditions
  note?: string
}

export type CombatPrepare = {
  id: string
  scenario_id: string | null
  mj_id: string
  nom: string
  notes: string | null
  participants: PrepParticipant[]
  pj_ids: string[]
  carte_id: string | null
  avec_carte: boolean
  positions: Record<string, { x: number; y: number }>
  conditions_depart: ConditionsDepart
  initiative_preset: InitiativeEntry[] | null
  est_template: boolean
  created_at?: string
}

const COLS =
  'id, scenario_id, mj_id, nom, notes, participants, pj_ids, carte_id, avec_carte, positions, conditions_depart, initiative_preset, est_template, created_at'

function normalise(row: Record<string, unknown>): CombatPrepare {
  return {
    id: row.id as string,
    scenario_id: (row.scenario_id as string | null) ?? null,
    mj_id: row.mj_id as string,
    nom: (row.nom as string) ?? '',
    notes: (row.notes as string | null) ?? null,
    participants: Array.isArray(row.participants) ? (row.participants as PrepParticipant[]) : [],
    pj_ids: Array.isArray(row.pj_ids) ? (row.pj_ids as string[]) : [],
    carte_id: (row.carte_id as string | null) ?? null,
    avec_carte: !!row.avec_carte,
    positions: (row.positions as Record<string, { x: number; y: number }>) ?? {},
    conditions_depart: (row.conditions_depart as ConditionsDepart) ?? {},
    initiative_preset: Array.isArray(row.initiative_preset)
      ? (row.initiative_preset as InitiativeEntry[])
      : null,
    est_template: !!row.est_template,
    created_at: row.created_at as string | undefined
  }
}

export async function loadCombatsPrepares(scenarioId?: string | null): Promise<CombatPrepare[]> {
  let q = supabase.from('combats_prepares').select(COLS).order('created_at', { ascending: false })
  if (scenarioId) q = q.eq('scenario_id', scenarioId)
  const { data, error } = await q
  if (error) {
    console.error('[combats_prepares] load :', error.message)
    return []
  }
  return (data ?? []).map((r) => normalise(r as Record<string, unknown>))
}

// Crée ou met à jour un combat préparé. Renvoie l'id.
export async function saveCombatPrepare(
  cp: Partial<CombatPrepare> & { nom: string }
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const payload = {
    scenario_id: cp.scenario_id ?? null,
    mj_id: user.id,
    nom: cp.nom,
    notes: cp.notes ?? null,
    participants: cp.participants ?? [],
    pj_ids: cp.pj_ids ?? [],
    carte_id: cp.avec_carte ? cp.carte_id ?? null : null,
    avec_carte: !!cp.avec_carte,
    positions: cp.positions ?? {},
    conditions_depart: cp.conditions_depart ?? {},
    initiative_preset: cp.initiative_preset ?? null,
    est_template: !!cp.est_template,
    updated_at: new Date().toISOString()
  }
  if (cp.id) {
    const { error } = await supabase.from('combats_prepares').update(payload).eq('id', cp.id)
    if (error) {
      console.error('[combats_prepares] update :', error.message)
      return null
    }
    return cp.id
  }
  const { data, error } = await supabase
    .from('combats_prepares')
    .insert(payload)
    .select('id')
    .single()
  if (error || !data) {
    console.error('[combats_prepares] insert :', error?.message)
    return null
  }
  return data.id as string
}

export async function deleteCombatPrepare(id: string): Promise<void> {
  const { error } = await supabase.from('combats_prepares').delete().eq('id', id)
  if (error) console.error('[combats_prepares] delete :', error.message)
}

export async function duplicateCombatPrepare(cp: CombatPrepare): Promise<string | null> {
  return saveCombatPrepare({ ...cp, id: undefined, nom: `${cp.nom} (copie)` })
}

// Applique un combat préparé à la ligne combats du scénario et l'active.
// Renvoie le scenario_id (ou null si échec). La page se charge de naviguer
// vers le mode choisi.
export async function lancerCombatPrepare(
  cp: CombatPrepare,
  mode: 'rapide' | 'diffusion'
): Promise<string | null> {
  if (!cp.scenario_id) {
    console.warn('[combats_prepares] lancer : aucun scénario lié')
    return null
  }
  const ennemiIds = cp.participants.filter((p) => p.kind === 'ennemi').map((p) => p.ref_id)

  // 1. Lier les ennemis préparés au scénario (pour que le moteur les charge).
  if (ennemiIds.length > 0) {
    await supabase.from('ennemis').update({ scenario_id: cp.scenario_id }).in('id', ennemiIds)
  }

  // 2. Construire l'ordre d'initiative (preset sinon roll via le MOTEUR partagé
  //    rollInitiative → pas de divergence avec combat rapide / diffusion).
  let ordre: InitiativeEntry[] | null = cp.initiative_preset
  if (!ordre || ordre.length === 0) {
    const [pjRes, enRes] = await Promise.all([
      cp.pj_ids.length > 0
        ? supabase.from('personnages').select('id, nom, image_url').in('id', cp.pj_ids)
        : Promise.resolve({ data: [] as Array<{ id: string; nom: string; image_url: string | null }> }),
      ennemiIds.length > 0
        ? supabase.from('ennemis').select('id, nom, image_url').in('id', ennemiIds)
        : Promise.resolve({ data: [] as Array<{ id: string; nom: string; image_url: string | null }> })
    ])
    // rollInitiative n'utilise que id/nom/image_url → on caste les lignes minimales.
    ordre = rollInitiative(
      (pjRes.data ?? []) as unknown as Persona[],
      (enRes.data ?? []) as unknown as Ennemi[]
    )
  }

  // 3. Appliquer les conditions de départ aux participants.
  const conds = cp.conditions_depart?.conditions ?? {}
  for (const [pieceId, list] of Object.entries(conds)) {
    if (!Array.isArray(list) || list.length === 0) continue
    const isPerso = pieceId.startsWith('perso-')
    const id = pieceId.replace(/^(perso|ennemi)-/, '')
    await supabase
      .from(isPerso ? 'personnages' : 'ennemis')
      .update({ conditions: list })
      .eq('id', id)
  }

  // 4. Upsert de la ligne combats (active).
  const patch = {
    scenario_id: cp.scenario_id,
    round: 1,
    tour_actuel: 0,
    ordre_initiative: ordre ?? [],
    actif: true,
    en_pause: false,
    positions: cp.avec_carte ? cp.positions ?? {} : {},
    carte_id: cp.avec_carte ? cp.carte_id : null,
    carte_visible_joueurs: false,
    etats_combat: {},
    demarre_a: new Date().toISOString()
  }
  const { error } = await supabase
    .from('combats')
    .upsert(patch, { onConflict: 'scenario_id' })
  if (error) {
    console.error('[combats_prepares] lancer combat :', error.message)
    return null
  }

  // 5. Surprise → masque les ennemis côté joueurs (diffusion uniquement).
  if (mode === 'diffusion' && cp.conditions_depart?.surprise) {
    await supabase
      .from('presentation_etats')
      .upsert(
        { scenario_id: cp.scenario_id, ennemis_visibles: false, updated_at: new Date().toISOString() },
        { onConflict: 'scenario_id' }
      )
  }

  return cp.scenario_id
}
