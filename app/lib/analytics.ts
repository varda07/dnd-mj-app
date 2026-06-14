// ============================================================================
// ROADMAP V1 — Phase 3.5 : Analytics d'usage (tracking basique)
// ----------------------------------------------------------------------------
// Helper non bloquant pour logger une action dans `usage_analytics`. Les
// erreurs sont silencieuses : le tracking ne doit jamais gêner l'utilisateur.
// L'identité peut être omise (anonyme) ; par défaut on attache l'utilisateur
// courant. Agrégats côté admin via la RPC admin_analytics_top().
// ============================================================================

import { supabase } from '@/lib/supabase'

export async function logUsage(
  action: string,
  metadonnees: Record<string, unknown> = {},
  options: { anonyme?: boolean } = {}
): Promise<void> {
  try {
    let userId: string | null = null
    if (!options.anonyme) {
      const { data } = await supabase.auth.getUser()
      userId = data.user?.id ?? null
    }
    await supabase.from('usage_analytics').insert({
      user_id: userId,
      action,
      metadonnees
    })
  } catch {
    /* tracking non critique — on ignore toute erreur (table absente, offline…) */
  }
}
