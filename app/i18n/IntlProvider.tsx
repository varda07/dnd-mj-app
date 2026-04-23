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

// Tous les accès à `window` / `localStorage` passent par ces helpers et sont
// gardés par `typeof window === 'undefined'`. Ils ne doivent être appelés que
// dans un useEffect ou un event handler côté client ; ne jamais les appeler
// depuis le rendu initial (sinon hydration mismatch + ENVIRONMENT_FALLBACK
// au prerender Next.js).
function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'fr' || stored === 'en') return stored
  } catch {
    /* accès storage refusé (mode privé / iframe sandboxée) */
  }
  return null
}

function readNavigatorLocale(): Locale | null {
  if (typeof window === 'undefined') return null
  const nav = window.navigator?.language?.toLowerCase() ?? ''
  if (nav.startsWith('en')) return 'en'
  if (nav.startsWith('fr')) return 'fr'
  return null
}

function writeStoredLocale(l: Locale) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, l)
  } catch {
    /* quota plein / mode privé */
  }
}

export default function IntlProvider({ children }: { children: ReactNode }) {
  // On démarre toujours sur 'fr' côté serveur pour que le HTML prerendered
  // soit stable. La locale réelle est hydratée dans useEffect (client-only).
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    const stored = readStoredLocale() ?? readNavigatorLocale()
    if (stored && stored !== locale) setLocaleState(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        writeStoredLocale(raw)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const setLocale = async (l: Locale) => {
    setLocaleState(l)
    writeStoredLocale(l)
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
