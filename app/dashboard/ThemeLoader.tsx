'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { applyTheme, DEFAULT_THEME, THEMES, ThemeKey } from '@/app/styles/themes'

export default function ThemeLoader() {
  useEffect(() => {
    console.log('[theme] ThemeLoader mount — application du thème par défaut')
    applyTheme(DEFAULT_THEME)
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('[theme] pas d\'utilisateur connecté, thème par défaut conservé')
        return
      }
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
      console.log(`[theme] thème récupéré depuis profiles : "${raw ?? '(null)'}" → application de "${key}"`)
      applyTheme(key)
    }
    load()
  }, [])

  return null
}
