'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Accessibilité — préférences utilisateur appliquées globalement via des
// attributs `data-a11y-*` sur <html> et une CSS variable --a11y-font-scale.
//
// Persistance double :
//   - localStorage (instant) → applique au mount sans flash
//   - profiles.accessibilite (jsonb) → suit l'utilisateur sur tous ses devices
// ============================================================================

export type DaltonienType = 'off' | 'deuteranopie' | 'protanopie' | 'tritanopie'

export type AccessibilitySettings = {
  daltonien: DaltonienType
  dyslexique: boolean
  fontScale: number // 80 → 150
  hautContraste: boolean
  reduireAnimations: boolean
  ariaImproved: boolean
}

export const DEFAULT_A11Y: AccessibilitySettings = {
  daltonien: 'off',
  dyslexique: false,
  fontScale: 100,
  hautContraste: false,
  reduireAnimations: false,
  ariaImproved: false
}

const LS_KEY = 'codex-a11y'

// ----------------------------------------------------------------------------
// Application des préférences sur le DOM (idempotent)
// ----------------------------------------------------------------------------
export function appliquerA11y(s: AccessibilitySettings): void {
  if (typeof document === 'undefined') return
  const html = document.documentElement

  html.dataset.a11yColorMode = s.daltonien
  html.dataset.a11yDyslexic = s.dyslexique ? 'true' : 'false'
  html.dataset.a11yContrast = s.hautContraste ? 'high' : 'normal'
  html.dataset.a11yReduceMotion = s.reduireAnimations ? 'true' : 'false'
  html.dataset.a11yAria = s.ariaImproved ? 'true' : 'false'

  // Font scale via CSS variable (multiplie tous les rem si on l'utilise sur
  // html.font-size). Ici on l'applique directement sur le font-size de html
  // pour que les unités `rem` se mettent à jour partout.
  const scale = Math.max(80, Math.min(150, s.fontScale))
  html.style.setProperty('--a11y-font-scale', String(scale / 100))
  html.style.fontSize = `${scale}%`
}

// ----------------------------------------------------------------------------
// Lecture / écriture localStorage
// ----------------------------------------------------------------------------
function lireLS(): AccessibilitySettings {
  if (typeof window === 'undefined') return DEFAULT_A11Y
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULT_A11Y
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_A11Y, ...parsed }
  } catch {
    return DEFAULT_A11Y
  }
}

function ecrireLS(s: AccessibilitySettings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(s))
  } catch {
    /* localStorage indisponible : on ne fait rien */
  }
}

// ----------------------------------------------------------------------------
// Sync Supabase — écrit dans profiles.accessibilite (debounce 400 ms)
// ----------------------------------------------------------------------------
let saveTimer: ReturnType<typeof setTimeout> | null = null
async function syncSupabase(s: AccessibilitySettings): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('profiles')
    .update({ accessibilite: s })
    .eq('id', user.id)
  if (error) {
    console.error('[a11y] sync supabase :', error)
  }
}
function scheduleSync(s: AccessibilitySettings): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => syncSupabase(s), 400)
}

// ----------------------------------------------------------------------------
// Singleton léger + subscribers (similaire au hook favoris)
// ----------------------------------------------------------------------------
let current: AccessibilitySettings = DEFAULT_A11Y
let initialized = false
const listeners = new Set<(s: AccessibilitySettings) => void>()
let loadingFromSupabase: Promise<void> | null = null

function notify(): void {
  listeners.forEach((l) => l(current))
}

async function loadInitial(): Promise<void> {
  // 1. localStorage immédiat (évite le flash)
  current = lireLS()
  appliquerA11y(current)
  initialized = true
  notify()
  // 2. Sync depuis Supabase si user connecté
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data } = await supabase
    .from('profiles')
    .select('accessibilite')
    .eq('id', user.id)
    .maybeSingle()
  const raw = data?.accessibilite
  if (raw && typeof raw === 'object') {
    current = { ...DEFAULT_A11Y, ...(raw as Partial<AccessibilitySettings>) }
    appliquerA11y(current)
    ecrireLS(current)
    notify()
  }
}

export function getA11y(): AccessibilitySettings {
  return current
}

export function setA11y(patch: Partial<AccessibilitySettings>): void {
  current = { ...current, ...patch }
  appliquerA11y(current)
  ecrireLS(current)
  scheduleSync(current)
  notify()
}

// ----------------------------------------------------------------------------
// Hook React — abonné aux changements
// ----------------------------------------------------------------------------
export function useA11y(): {
  settings: AccessibilitySettings
  update: (patch: Partial<AccessibilitySettings>) => void
  reset: () => void
} {
  const [, setTick] = useState(0)
  useEffect(() => {
    const sub = () => setTick((t) => t + 1)
    listeners.add(sub)
    if (!initialized && !loadingFromSupabase) {
      loadingFromSupabase = loadInitial()
    }
    return () => {
      listeners.delete(sub)
    }
  }, [])

  return {
    settings: current,
    update: setA11y,
    reset: () => setA11y(DEFAULT_A11Y)
  }
}
