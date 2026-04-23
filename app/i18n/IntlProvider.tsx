'use client'

import { NextIntlClientProvider } from 'next-intl'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import fr from '@/messages/fr.json'
import en from '@/messages/en.json'

export type Locale = 'fr' | 'en'
const MESSAGES = { fr, en } as const
const STORAGE_KEY = 'dnd-mj-locale'

type Ctx = {
  locale: Locale
  setLocale: (l: Locale) => Promise<void>
}

const LocaleContext = createContext<Ctx | null>(null)

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used inside IntlProvider')
  return ctx
}

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'fr'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'fr' || stored === 'en') return stored
  const nav = window.navigator?.language?.toLowerCase() ?? ''
  if (nav.startsWith('en')) return 'en'
  return 'fr'
}

export default function IntlProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    setLocaleState(readInitialLocale())
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase
        .from('profiles')
        .select('langue')
        .eq('id', user.id)
        .maybeSingle()
      const raw = (data?.langue as string | undefined) ?? null
      if (raw === 'fr' || raw === 'en') {
        if (cancelled) return
        setLocaleState(raw)
        try {
          window.localStorage.setItem(STORAGE_KEY, raw)
        } catch {
          /* quota / private mode */
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const setLocale = async (l: Locale) => {
    setLocaleState(l)
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: existing } = await supabase
      .from('profiles')
      .select('username, role, theme')
      .eq('id', user.id)
      .maybeSingle()
    const username = (existing?.username as string | undefined) ?? user.email ?? user.id
    const role = (existing?.role as string | undefined) ?? 'joueur'
    const theme = (existing?.theme as string | undefined) ?? 'classique'
    await supabase
      .from('profiles')
      .upsert({ id: user.id, username, role, theme, langue: l })
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={MESSAGES[locale] as Record<string, unknown>}
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  )
}
