'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { applyTheme, DEFAULT_THEME, THEMES, ThemeKey } from '@/app/styles/themes'

// Roadmap 11.1 — thème custom : surcharge les variables CSS du thème de base
// si l'utilisateur a appliqué un thème personnalisé (stocké en localStorage).
function appliquerThemeCustom() {
  try {
    const custom = localStorage.getItem('customTheme')
    if (!custom) return
    const v = JSON.parse(custom) as Record<string, string>
    const root = document.documentElement
    const mapping: Record<string, string> = {
      bg_primary: '--theme-bg-primary',
      bg_secondary: '--theme-bg-secondary',
      bg_card: '--theme-bg-card',
      border_color: '--theme-border',
      text_primary: '--theme-text-primary',
      text_secondary: '--theme-text-secondary',
      accent_color: '--theme-accent'
    }
    for (const [k, cssVar] of Object.entries(mapping)) {
      if (v[k]) root.style.setProperty(cssVar, v[k])
    }
  } catch {
    /* localStorage indisponible — non bloquant */
  }
}

export default function ThemeLoader() {
  useEffect(() => {
    applyTheme(DEFAULT_THEME)
    const load = async () => {
      let user = null
      try {
        const { data } = await supabase.auth.getUser()
        user = data.user
      } catch (err) {
        // Conflit multi-onglets : un autre onglet a "volé" le lock auth
        // Supabase (AbortError / NavigatorLockAcquireTimeoutError). Non-fatal,
        // on garde le thème par défaut et on sort silencieusement.
        const name = (err as { name?: string } | null)?.name
        if (name === 'AbortError' || name === 'NavigatorLockAcquireTimeoutError') {
          return
        }
        console.warn('[theme] erreur inattendue à getUser :', err)
        return
      }
      if (!user) return
      const { data, error } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', user.id)
        .maybeSingle()
      if (error) {
        console.warn('[theme] fetch profiles échec (table absente ?) :', error.message)
        return
      }
      const raw = data?.theme as string | undefined
      const key = (raw && raw in THEMES ? raw : DEFAULT_THEME) as ThemeKey
      applyTheme(key)
      appliquerThemeCustom()
    }
    load()
  }, [])

  return null
}
