'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { applyTheme, DEFAULT_THEME, THEMES, ThemeKey } from '@/app/styles/themes'

export default function ThemeLoader() {
  useEffect(() => {
    console.log('[theme] ThemeLoader mount — application du thème par défaut')
    applyTheme(DEFAULT_THEME)
    const load = async () => {
      let user = null
      try {
        const { data } = await supabase.auth.getUser()
        user = data.user
      } catch (err) {
        // Cas connu : un autre onglet a "volé" le lock auth Supabase. Le SDK
        // throw un AbortError ou un objet { name: 'LockAcquireTimeout' }.
        // Ce n'est pas un échec d'authentification, juste un conflit
        // multi-onglets — on ignore silencieusement et on garde le thème par
        // défaut. Les requêtes suivantes récupéreront l'état correct.
        const name = (err as { name?: string } | null)?.name
        if (name === 'AbortError' || name === 'NavigatorLockAcquireTimeoutError') {
          console.log('[theme] lock auth volé par un autre onglet, on passe')
          return
        }
        console.warn('[theme] erreur inattendue à getUser :', err)
        return
      }
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
