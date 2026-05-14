// ============================================================================
// Roadmap 10.2 — Historique des actions
// ----------------------------------------------------------------------------
// Helper « fire-and-forget » pour journaliser une action utilisateur dans la
// table `historique_actions`. À appeler depuis les flux CRUD (création,
// modification, suppression, combat, fin de session…).
//
//   import { logAction } from '@/app/lib/historique'
//   await logAction('creation', 'personnage', perso.id, `Création de ${perso.nom}`)
//
// L'échec d'écriture est non bloquant : on log en console et on continue.
// ============================================================================

import { supabase } from '@/lib/supabase'

export type ActionType =
  | 'creation'
  | 'modification'
  | 'suppression'
  | 'combat'
  | 'session'

export async function logAction(
  actionType: ActionType,
  entiteType: string,
  entiteId: string | null,
  description: string
): Promise<void> {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('historique_actions').insert({
      user_id: user.id,
      action_type: actionType,
      entite_type: entiteType,
      entite_id: entiteId,
      description
    })
    if (error) console.warn('[historique] insert échoué :', error.message)
  } catch (err) {
    console.warn('[historique] erreur inattendue :', err)
  }
}
