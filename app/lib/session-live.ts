// ============================================================================
// Mode Session — état vivant, état partagé, journal (Phases 3-4)
// ----------------------------------------------------------------------------
// Couche d'accès aux tables temps réel de la session :
//   - session_state         : ce que le MJ diffuse (image/texte/son) + combat actif
//   - character_live_state   : PV/slots/ressources/conditions/concentration en séance
//   - session_events         : journal (jets de dés, changements de PV, narration…)
// + chargement de la fiche complète d'un personnage pour l'interface joueur.
// ============================================================================

import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// session_state
// ---------------------------------------------------------------------------
export type AmbientSound = {
  piste?: string | null
  volume?: number
  en_lecture?: boolean
} | null

export type SessionState = {
  session_id: string
  current_chapter_id: string | null
  current_location_id: string | null
  broadcast_image_url: string | null
  broadcast_text: string | null
  ambient_sound: AmbientSound
  active_combat_id: string | null
  updated_at: string
}

const STATE_SELECT =
  'session_id, current_chapter_id, current_location_id, broadcast_image_url, broadcast_text, ambient_sound, active_combat_id, updated_at'

export async function fetchSessionState(sessionId: string): Promise<SessionState | null> {
  const { data } = await supabase
    .from('session_state')
    .select(STATE_SELECT)
    .eq('session_id', sessionId)
    .maybeSingle()
  return (data as SessionState) ?? null
}

// Écriture réservée au MJ (RLS fn_is_session_mj).
export async function patchSessionState(
  sessionId: string,
  patch: Partial<Omit<SessionState, 'session_id' | 'updated_at'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('session_state')
    .update(patch)
    .eq('session_id', sessionId)
  return !error
}

// ---------------------------------------------------------------------------
// character_live_state
// ---------------------------------------------------------------------------
export type DeathSaves = { success: number; fail: number }

// Rythme de récupération d'une ressource limitée (règle D&D 5e). Sert aux
// boutons Repos court / Repos long du MJ : seules les ressources « court »
// reviennent au repos court, tout revient au repos long.
export type RechargeRessource = 'court' | 'long' | 'jour'

export type ClassResource = {
  label?: string
  max: number
  used: number
  recharge?: RechargeRessource
}

export type CharacterLiveState = {
  session_id: string
  character_id: string
  current_hp: number | null
  temp_hp: number
  max_hp_override: number | null
  spell_slots_used: Record<string, number>
  class_resources_used: Record<string, ClassResource>
  conditions: string[]
  concentration_spell: string | null
  death_saves: DeathSaves
  updated_at: string
  updated_by: string | null
}

const LIVE_SELECT =
  'session_id, character_id, current_hp, temp_hp, max_hp_override, spell_slots_used, class_resources_used, conditions, concentration_spell, death_saves, updated_at, updated_by'

function normalizeLive(row: Record<string, unknown>): CharacterLiveState {
  return {
    session_id: row.session_id as string,
    character_id: row.character_id as string,
    current_hp: (row.current_hp as number) ?? null,
    temp_hp: (row.temp_hp as number) ?? 0,
    max_hp_override: (row.max_hp_override as number) ?? null,
    spell_slots_used: (row.spell_slots_used as Record<string, number>) ?? {},
    class_resources_used:
      (row.class_resources_used as Record<string, ClassResource>) ?? {},
    conditions: Array.isArray(row.conditions) ? (row.conditions as string[]) : [],
    concentration_spell: (row.concentration_spell as string) ?? null,
    death_saves: (row.death_saves as DeathSaves) ?? { success: 0, fail: 0 },
    updated_at: row.updated_at as string,
    updated_by: (row.updated_by as string) ?? null
  }
}

export async function fetchLiveState(
  sessionId: string,
  characterId: string
): Promise<CharacterLiveState | null> {
  const { data } = await supabase
    .from('character_live_state')
    .select(LIVE_SELECT)
    .eq('session_id', sessionId)
    .eq('character_id', characterId)
    .maybeSingle()
  return data ? normalizeLive(data as Record<string, unknown>) : null
}

// Toutes les fiches vivantes de la session (vue MJ « Ma table »).
export async function fetchAllLiveStates(sessionId: string): Promise<CharacterLiveState[]> {
  const { data } = await supabase
    .from('character_live_state')
    .select(LIVE_SELECT)
    .eq('session_id', sessionId)
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeLive)
}

// Upsert partiel (la ligne existe déjà après join_session, mais on sécurise).
export async function patchLiveState(
  sessionId: string,
  characterId: string,
  patch: Partial<Omit<CharacterLiveState, 'session_id' | 'character_id' | 'updated_at'>>,
  updatedBy?: string | null
): Promise<boolean> {
  const { error } = await supabase.from('character_live_state').upsert(
    {
      session_id: sessionId,
      character_id: characterId,
      ...patch,
      updated_by: updatedBy ?? null
    },
    { onConflict: 'session_id,character_id' }
  )
  return !error
}

// ---------------------------------------------------------------------------
// session_events (journal)
// ---------------------------------------------------------------------------
export type SessionEventType =
  | 'hp_change' | 'resource_used' | 'dice_roll' | 'condition'
  | 'join' | 'leave' | 'combat_start' | 'combat_end' | 'narration'

export type SessionEvent = {
  id: string
  session_id: string
  actor_user_id: string | null
  character_id: string | null
  type: SessionEventType
  payload: Record<string, unknown>
  created_at: string
}

export async function logSessionEvent(
  sessionId: string,
  type: SessionEventType,
  payload: Record<string, unknown>,
  characterId?: string | null
): Promise<void> {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  await supabase.from('session_events').insert({
    session_id: sessionId,
    actor_user_id: user?.id ?? null,
    character_id: characterId ?? null,
    type,
    payload
  })
}

export async function fetchSessionEvents(
  sessionId: string,
  limit = 60
): Promise<SessionEvent[]> {
  const { data } = await supabase
    .from('session_events')
    .select('id, session_id, actor_user_id, character_id, type, payload, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as SessionEvent[]
}

// ---------------------------------------------------------------------------
// Fiche complète du personnage (lecture) pour l'interface joueur
// ---------------------------------------------------------------------------
export type Arme = { nom: string; bonus: string; degats: string }

export type CharacterSheet = {
  id: string
  nom: string
  race: string | null
  classe: string | null
  sous_classe: string | null
  niveau: number
  image_url: string | null
  hp_max: number
  hp_actuel: number
  temp_hp: number
  ca: number
  vitesse: number
  de_vie: string | null
  de_vie_utilises: number
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
  saves_maitrises: Record<string, boolean>
  comp_maitrises: Record<string, boolean>
  comp_expertise: Record<string, boolean>
  armes: Arme[]
  sorts_slots_max: Record<string, number>
  sorts_slots_used: Record<string, number>
  traits_classe: string
  traits_espece: string
  exploits: string
  historique: string | null
  conditions: string[]
  death_success: number
  death_fail: number
  pc: number; pa: number; pe: number; po: number; pp: number
}

const SHEET_SELECT =
  'id, nom, race, classe, sous_classe, niveau, image_url, hp_max, hp_actuel, temp_hp, ca, vitesse, de_vie, de_vie_utilises, force, dexterite, constitution, intelligence, sagesse, charisme, saves_maitrises, comp_maitrises, comp_expertise, armes, sorts_slots_max, sorts_slots_used, traits_classe, traits_espece, exploits, historique, conditions, death_success, death_fail, pc, pa, pe, po, pp'

export async function fetchCharacterSheet(characterId: string): Promise<CharacterSheet | null> {
  const { data } = await supabase
    .from('personnages')
    .select(SHEET_SELECT)
    .eq('id', characterId)
    .maybeSingle()
  if (!data) return null
  const r = data as Record<string, unknown>
  return {
    id: r.id as string,
    nom: (r.nom as string) ?? '',
    race: (r.race as string) ?? null,
    classe: (r.classe as string) ?? null,
    sous_classe: (r.sous_classe as string) ?? null,
    niveau: (r.niveau as number) ?? 1,
    image_url: (r.image_url as string) ?? null,
    hp_max: (r.hp_max as number) ?? 0,
    hp_actuel: (r.hp_actuel as number) ?? 0,
    temp_hp: (r.temp_hp as number) ?? 0,
    ca: (r.ca as number) ?? 10,
    vitesse: (r.vitesse as number) ?? 9,
    de_vie: (r.de_vie as string) ?? null,
    de_vie_utilises: (r.de_vie_utilises as number) ?? 0,
    force: (r.force as number) ?? 10,
    dexterite: (r.dexterite as number) ?? 10,
    constitution: (r.constitution as number) ?? 10,
    intelligence: (r.intelligence as number) ?? 10,
    sagesse: (r.sagesse as number) ?? 10,
    charisme: (r.charisme as number) ?? 10,
    saves_maitrises: (r.saves_maitrises as Record<string, boolean>) ?? {},
    comp_maitrises: (r.comp_maitrises as Record<string, boolean>) ?? {},
    comp_expertise: (r.comp_expertise as Record<string, boolean>) ?? {},
    armes: Array.isArray(r.armes) ? (r.armes as Arme[]) : [],
    sorts_slots_max: (r.sorts_slots_max as Record<string, number>) ?? {},
    sorts_slots_used: (r.sorts_slots_used as Record<string, number>) ?? {},
    traits_classe: (r.traits_classe as string) ?? '',
    traits_espece: (r.traits_espece as string) ?? '',
    exploits: (r.exploits as string) ?? '',
    historique: (r.historique as string) ?? null,
    conditions: Array.isArray(r.conditions) ? (r.conditions as string[]) : [],
    death_success: (r.death_success as number) ?? 0,
    death_fail: (r.death_fail as number) ?? 0,
    pc: (r.pc as number) ?? 0,
    pa: (r.pa as number) ?? 0,
    pe: (r.pe as number) ?? 0,
    po: (r.po as number) ?? 0,
    pp: (r.pp as number) ?? 0
  }
}

// ---------------------------------------------------------------------------
// Sorts du personnage
// ---------------------------------------------------------------------------
export type SortJoue = {
  junction_id: string
  id: string
  nom: string
  niveau: number
  ecole: string | null
  description: string | null
  temps_incantation: string | null
  portee: string | null
  duree: string | null
  composantes_verbal: boolean
  composantes_somatique: boolean
  composantes_materiel: string | null
  concentration: boolean
  rituel: boolean
  prepare: boolean
  disponible: boolean
}

export async function fetchCharacterSpells(characterId: string): Promise<SortJoue[]> {
  const { data } = await supabase
    .from('personnage_sorts')
    .select(
      'id, disponible, prepare, sorts(id, nom, niveau, ecole, description, temps_incantation, portee, duree, composantes_verbal, composantes_somatique, composantes_materiel, concentration, rituel)'
    )
    .eq('personnage_id', characterId)
  const rows = (data ?? []) as Array<Record<string, unknown>>
  return rows
    .map((row): SortJoue | null => {
      const s = Array.isArray(row.sorts) ? row.sorts[0] : row.sorts
      if (!s) return null
      const so = s as Record<string, unknown>
      return {
        junction_id: row.id as string,
        id: so.id as string,
        nom: (so.nom as string) ?? '',
        niveau: (so.niveau as number) ?? 0,
        ecole: (so.ecole as string) ?? null,
        description: (so.description as string) ?? null,
        temps_incantation: (so.temps_incantation as string) ?? null,
        portee: (so.portee as string) ?? null,
        duree: (so.duree as string) ?? null,
        composantes_verbal: !!so.composantes_verbal,
        composantes_somatique: !!so.composantes_somatique,
        composantes_materiel: (so.composantes_materiel as string) ?? null,
        concentration: !!so.concentration,
        rituel: !!so.rituel,
        prepare: (row.prepare as boolean) ?? true,
        disponible: (row.disponible as boolean) ?? true
      }
    })
    .filter((x): x is SortJoue => x !== null)
    .sort(
      (a, b) =>
        (a.prepare === b.prepare ? 0 : a.prepare ? -1 : 1) ||
        a.niveau - b.niveau ||
        a.nom.localeCompare(b.nom)
    )
}
