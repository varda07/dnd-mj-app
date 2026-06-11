'use client'

// ============================================================================
// Mode Admin / Mode Public — bascule UX côté client pour les comptes admin
// ----------------------------------------------------------------------------
// Permet à un compte `profiles.is_admin = true` de masquer les accès admin
// (liens, boutons) afin de tester l'expérience d'un utilisateur lambda sans se
// déconnecter. PUREMENT COSMÉTIQUE : ne touche jamais `is_admin` en base — la
// sécurité réelle reste la RLS serveur (`est_admin()`). L'état est persisté en
// localStorage et synchronisé entre composants via un évènement global.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const KEY = 'admin_mode_actif'
const EVENT = 'adminmode:change'

/** Lit la préférence (défaut = true → Mode Admin au premier login). */
export function getAdminModeActif(): boolean {
  try {
    const v = window.localStorage.getItem(KEY)
    return v === null ? true : v === '1'
  } catch {
    return true
  }
}

/** Persiste la préférence et notifie les composants montés. */
export function setAdminModeActif(v: boolean): void {
  try {
    window.localStorage.setItem(KEY, v ? '1' : '0')
  } catch {
    /* localStorage indisponible : changement en mémoire seulement */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: v }))
  }
}

/**
 * Hook : { isAdmin, modeActif, vueAdmin, setMode }.
 * - `isAdmin`   : vrai is_admin (base). Sert à AFFICHER le toggle lui-même.
 * - `modeActif` : le toggle est-il sur « Admin » (true) ou « Public » (false).
 * - `vueAdmin`  : isAdmin && modeActif → faut-il montrer les accès admin.
 */
export function useAdminMode() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [modeActif, setModeActif] = useState(true)

  useEffect(() => {
    let cancel = false
    // Init depuis localStorage (lecture client uniquement).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModeActif(getAdminModeActif())

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancel) return
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()
      if (!cancel) setIsAdmin(!!data?.is_admin)
    })()

    const onChange = (e: Event) => setModeActif(!!(e as CustomEvent).detail)
    window.addEventListener(EVENT, onChange)
    return () => {
      cancel = true
      window.removeEventListener(EVENT, onChange)
    }
  }, [])

  const setMode = useCallback((v: boolean) => {
    setModeActif(v)
    setAdminModeActif(v)
  }, [])

  return { isAdmin, modeActif, vueAdmin: isAdmin && modeActif, setMode }
}
