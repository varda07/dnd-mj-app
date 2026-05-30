/**
 * Feedback haptique mobile — wrapper sur navigator.vibrate avec respect
 * d'un toggle accessibilité (localStorage 'a11y_haptic' === 'off').
 *
 * Usage : haptic.tap() / haptic.crit() / haptic.ko()
 */

type HapticKind = 'tap' | 'success' | 'warn' | 'crit' | 'ko'

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap:     12,
  success: [20, 40, 20],
  warn:    [30, 30, 30],
  crit:    [60, 50, 60, 50, 80],
  ko:      [100, 60, 100, 60, 150],
}

function enabled(): boolean {
  if (typeof window === 'undefined') return false
  if (!('vibrate' in navigator)) return false
  try { return window.localStorage.getItem('a11y_haptic') !== 'off' } catch { return true }
}

function fire(kind: HapticKind) {
  if (!enabled()) return
  try { navigator.vibrate(PATTERNS[kind]) } catch { /* noop */ }
}

export const haptic = {
  tap:     () => fire('tap'),
  success: () => fire('success'),
  warn:    () => fire('warn'),
  crit:    () => fire('crit'),
  ko:      () => fire('ko'),
  isEnabled: enabled,
  setEnabled: (on: boolean) => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem('a11y_haptic', on ? 'on' : 'off') } catch { /* noop */ }
  }
}
