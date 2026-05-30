// ============================================================================
// Roadmap Affinement 2.10 — Helpers pour déclencher un achievement
// ----------------------------------------------------------------------------
// `unlockAchievement('premier_de')` insère silencieusement dans
// user_achievements (idempotent grâce au UNIQUE), puis pousse un toast
// "Achievement débloqué".
//
// La détection des compteurs (dés lancés, sorts créés…) reste à câbler dans
// les flux où ils se produisent — ici on fournit juste l'API.
// ============================================================================

import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'

const SESSION_GRANTED = new Set<string>()

export async function unlockAchievement(code: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (SESSION_GRANTED.has(code)) return false
  SESSION_GRANTED.add(code)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    // Skip si déjà débloqué
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', user.id)
      .eq('achievement_code', code)
      .maybeSingle()
    if (existing) return false

    // Charge le label pour le toast
    const { data: meta } = await supabase
      .from('achievements')
      .select('titre, emoji, description')
      .eq('code', code)
      .maybeSingle()

    const { error } = await supabase
      .from('user_achievements')
      .insert({ user_id: user.id, achievement_code: code })
    if (error) return false

    const emoji = (meta?.emoji as string | undefined) ?? '🏆'
    const titre = (meta?.titre as string | undefined) ?? 'Achievement débloqué'
    toast.success(`${emoji} Achievement : ${titre}`, 5000)
    return true
  } catch {
    return false
  }
}

/** Compteur local (incrémente une clé en localStorage et débloque
 *  l'achievement si le seuil est atteint). */
export async function incrementCounter(key: string, threshold: number, code: string) {
  if (typeof window === 'undefined') return
  try {
    const k = `codex_counter_${key}`
    const prev = parseInt(window.localStorage.getItem(k) ?? '0', 10) || 0
    const next = prev + 1
    window.localStorage.setItem(k, String(next))
    if (next >= threshold) await unlockAchievement(code)
  } catch { /* noop */ }
}
