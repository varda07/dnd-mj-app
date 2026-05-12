'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { applyTheme, DEFAULT_THEME, THEMES, ThemeKey } from '@/app/styles/themes'

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
    }
    load()
  }, [])

  return null
}
