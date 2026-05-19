// ============================================================================
// Helpers de création de notifications
// ----------------------------------------------------------------------------
// La table `notifications` est créée par
// `supabase/migrations/20260515060000_roadmap_phase10.sql`. Insert ouvert à
// tous les `authenticated` (RLS `with check (true)`), select restreint à
// `user_id = auth.uid()`.
//
// On centralise ici la résolution « entité → propriétaire » pour les flux
// inter-utilisateurs (like, commentaire, rejoindre scénario, etc.). Erreurs
// silencieuses (console.warn) car ces notifications ne sont jamais critiques :
// rater une notif ne doit jamais bloquer l'action principale.
// ============================================================================

import { supabase } from '@/lib/supabase'

export type NotifType = 'info' | 'joueur' | 'commentaire' | 'like' | 'combat'

export type EntiteNotif =
  | 'scenario'
  | 'personnage'
  | 'ennemi'
  | 'item'
  | 'map'
  | 'pnj'
  | 'sort'

// Mapping entité → (table, colonne propriétaire). user_id pour sort (legacy
// historique), joueur_id pour personnage, mj_id pour le reste.
const OWNER_COLS: Record<EntiteNotif, { table: string; col: string }> = {
  scenario: { table: 'scenarios', col: 'mj_id' },
  personnage: { table: 'personnages', col: 'joueur_id' },
  ennemi: { table: 'ennemis', col: 'mj_id' },
  item: { table: 'items', col: 'mj_id' },
  map: { table: 'maps', col: 'mj_id' },
  pnj: { table: 'pnj', col: 'mj_id' },
  sort: { table: 'sorts', col: 'user_id' }
}

// ----------------------------------------------------------------------------
// Notifier un utilisateur en direct (id connu)
// ----------------------------------------------------------------------------
export async function notifyUser(params: {
  userId: string
  type: NotifType
  message: string
  lien?: string
}): Promise<void> {
  const { userId, type, message, lien = '' } = params
  if (!userId || !message) return
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    message,
    lien
  })
  if (error) console.warn('[notifications] insert :', error.message)
}

// ----------------------------------------------------------------------------
// Notifier le propriétaire d'une entité (résout user/mj via une requête)
// ----------------------------------------------------------------------------
export async function notifyOwnerOfEntity(params: {
  entiteType: EntiteNotif
  entiteId: string
  type: NotifType
  message: string
  lien?: string
  // Si l'auteur de l'action est lui-même le propriétaire, on n'envoie rien
  // (un MJ qui like son propre scénario ne reçoit pas de notif).
  exclureUserId?: string
}): Promise<void> {
  const { entiteType, entiteId, type, message, lien = '', exclureUserId } = params
  const cfg = OWNER_COLS[entiteType]
  if (!cfg) return
  const { data, error } = await supabase
    .from(cfg.table)
    .select(cfg.col)
    .eq('id', entiteId)
    .maybeSingle()
  if (error || !data) {
    console.warn('[notifications] owner lookup échoué :', error?.message)
    return
  }
  const ownerId = (data as unknown as Record<string, string>)[cfg.col]
  if (!ownerId) return
  if (exclureUserId && ownerId === exclureUserId) return
  await notifyUser({ userId: ownerId, type, message, lien })
}

// ----------------------------------------------------------------------------
// Notifier plusieurs utilisateurs d'un coup (ex. tous les joueurs d'un scénario)
// ----------------------------------------------------------------------------
export async function notifyUsers(params: {
  userIds: string[]
  type: NotifType
  message: string
  lien?: string
  exclureUserId?: string
}): Promise<void> {
  const { userIds, type, message, lien = '', exclureUserId } = params
  const cibles = userIds.filter((id) => id && id !== exclureUserId)
  if (cibles.length === 0) return
  const rows = cibles.map((id) => ({
    user_id: id,
    type,
    message,
    lien
  }))
  const { error } = await supabase.from('notifications').insert(rows)
  if (error) console.warn('[notifications] bulk insert :', error.message)
}
