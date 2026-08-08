// ============================================================================
// Mode Session — helpers client
// ----------------------------------------------------------------------------
// Petite couche au-dessus de Supabase pour le nouveau « Mode Session » (refonte
// du mode diffusion). Types partagés + wrappers des RPC (start_session,
// join_session, set_session_status) et lecture du contexte de session.
// Voir supabase/migrations/20260807120000_mode_session_phase1.sql et _phase2.sql.
// ============================================================================

import { supabase } from '@/lib/supabase'

export type SessionStatus = 'lobby' | 'active' | 'paused' | 'ended'
export type SetupMode = 'pc-tv' | 'pc-tel' | 'tel-tel' | 'mj-seul'

export type GameSession = {
  id: string
  scenario_id: string
  mj_user_id: string
  status: SessionStatus
  title: string | null
  setup_mode: SetupMode | null
  started_at: string | null
  ended_at: string | null
}

export type SessionParticipant = {
  session_id: string
  user_id: string
  character_id: string | null
  role: 'mj' | 'joueur'
  is_ready: boolean
  is_connected: boolean
  joined_at: string
  last_seen_at: string
}

export type SessionRole = 'mj' | 'joueur' | null

const SESSION_SELECT =
  'id, scenario_id, mj_user_id, status, title, setup_mode, started_at, ended_at'

// ----------------------------------------------------------------------------
// Lancer une session depuis un scénario (MJ). Idempotent côté serveur.
// ----------------------------------------------------------------------------
export async function startSession(
  scenarioId: string,
  title?: string,
  setupMode?: SetupMode
): Promise<{ ok: boolean; sessionId?: string; error?: string; notified?: number }> {
  const { data, error } = await supabase.rpc('start_session', {
    p_scenario_id: scenarioId,
    p_title: title ?? null,
    p_setup_mode: setupMode ?? null
  })
  if (error) return { ok: false, error: error.message }
  const res = data as { ok: boolean; session_id?: string; error?: string; notified?: number } | null
  if (!res?.ok) return { ok: false, error: res?.error ?? 'unknown' }
  return { ok: true, sessionId: res.session_id, notified: res.notified }
}

// ----------------------------------------------------------------------------
// Rejoindre une session (crée/réactive le participant + hydrate l'état vivant).
// ----------------------------------------------------------------------------
export async function joinSession(
  sessionId: string,
  characterId?: string | null
): Promise<{ ok: boolean; role?: SessionRole; error?: string }> {
  const { data, error } = await supabase.rpc('join_session', {
    p_session_id: sessionId,
    p_character_id: characterId ?? null
  })
  if (error) return { ok: false, error: error.message }
  const res = data as { ok: boolean; role?: SessionRole; error?: string } | null
  if (!res?.ok) return { ok: false, error: res?.error ?? 'unknown' }
  return { ok: true, role: res.role ?? null }
}

// ----------------------------------------------------------------------------
// Transition de statut (MJ) : lobby → active → paused → ended.
// ----------------------------------------------------------------------------
export async function setSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('set_session_status', {
    p_session_id: sessionId,
    p_status: status
  })
  if (error) return { ok: false, error: error.message }
  const res = data as { ok: boolean; error?: string } | null
  if (!res?.ok) return { ok: false, error: res?.error ?? 'unknown' }
  return { ok: true }
}

// ----------------------------------------------------------------------------
// Lecture d'une session (RLS : MJ ou membre du scénario). null si inaccessible.
// ----------------------------------------------------------------------------
export async function fetchSession(sessionId: string): Promise<GameSession | null> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select(SESSION_SELECT)
    .eq('id', sessionId)
    .maybeSingle()
  if (error || !data) return null
  return data as GameSession
}

export async function fetchParticipants(sessionId: string): Promise<SessionParticipant[]> {
  const { data, error } = await supabase
    .from('session_participants')
    .select('session_id, user_id, character_id, role, is_ready, is_connected, joined_at, last_seen_at')
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true })
  if (error || !data) return []
  return data as SessionParticipant[]
}

// Met à jour l'état « prêt » / connexion du participant courant (best-effort).
export async function updateSelfParticipant(
  sessionId: string,
  userId: string,
  patch: Partial<Pick<SessionParticipant, 'is_ready' | 'is_connected' | 'character_id'>>
): Promise<void> {
  await supabase
    .from('session_participants')
    .update({ ...patch, last_seen_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('user_id', userId)
}

export const SETUP_LABEL: Record<SetupMode, string> = {
  'pc-tv': '🖥️📺 PC + TV',
  'pc-tel': '🖥️📱 PC + Téléphones',
  'tel-tel': '📱📱 Tél + Tél',
  'mj-seul': '👤 MJ seul'
}
