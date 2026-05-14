// ============================================================================
// Roadmap 11.3 — Custom emojis pour conditions
// ----------------------------------------------------------------------------
// L'utilisateur peut remplacer l'emoji par défaut de chaque condition D&D.
// Les surcharges sont persistées dans `profiles.emojis_conditions` (jsonb) et
// mises en cache en localStorage pour une lecture synchrone par l'UI.
//
//   import { emojiCondition } from '@/app/lib/conditionEmojis'
//   <span>{emojiCondition('empoisonne')}</span>
// ============================================================================

import { CONDITIONS, type ConditionKey } from '@/app/data/conditions'

const LS_KEY = 'emojisConditions'

export function getEmojisConditions(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function setEmojisConditionsCache(map: Record<string, string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map))
  } catch {
    /* localStorage indisponible — non bloquant */
  }
}

// Emoji effectif d'une condition : surcharge utilisateur si présente, sinon
// l'icône par défaut du référentiel `conditions.ts`.
export function emojiCondition(key: ConditionKey): string {
  const override = getEmojisConditions()[key]
  if (override && override.trim()) return override
  return CONDITIONS.find((c) => c.key === key)?.icone ?? '•'
}
