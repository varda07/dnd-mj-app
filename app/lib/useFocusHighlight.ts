'use client'

import { useEffect } from 'react'

// ============================================================================
// useFocusHighlight — V1 3.5
// ----------------------------------------------------------------------------
// Permet aux pages de liste (ennemis, items, maps…) de réagir au paramètre
// d'URL ?focus=<id> (posé par les liens de la carte mentale). Une fois la liste
// chargée (`ready`), on fait défiler jusqu'à l'élément `id="focus-<id>"` et on
// le surligne brièvement, au lieu d'afficher juste la liste générale.
//
// NB : on lit `window.location.search` directement (pas `useSearchParams`) pour
// éviter d'imposer une frontière Suspense au prerender (Next 16 bascule en CSR
// dès qu'une page utilise useSearchParams).
//
// Côté page : rendre chaque carte avec `id={`focus-${item.id}`}` et appeler
// `useFocusHighlight(donneesChargees)`.
// ============================================================================
export function useFocusHighlight(ready: boolean) {
  useEffect(() => {
    if (!ready || typeof window === 'undefined') return
    const focusId = new URLSearchParams(window.location.search).get('focus')
    if (!focusId) return
    // Laisse le DOM se peindre avant de chercher l'élément.
    const t = window.setTimeout(() => {
      const el = document.getElementById(`focus-${focusId}`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('focus-highlight')
      window.setTimeout(() => el.classList.remove('focus-highlight'), 2400)
    }, 120)
    return () => window.clearTimeout(t)
  }, [ready])
}
