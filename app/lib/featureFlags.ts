'use client'

// ============================================================================
// ROADMAP V1 — Phase 3.7 : Feature flags (côté client)
// ----------------------------------------------------------------------------
// Lecture des flags depuis `feature_flags` (RLS : lecture par tous). Permet de
// masquer une feature désactivée à distance sans redéploiement. Une feature
// ABSENTE de la table est considérée ACTIVE par défaut (fail-open) pour ne
// jamais casser l'existant si la migration n'est pas appliquée.
// ============================================================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Cache module-level partagé entre composants (évite N requêtes).
let cache: Record<string, boolean> | null = null
let inflight: Promise<Record<string, boolean>> | null = null

async function chargerFlags(): Promise<Record<string, boolean>> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    const map: Record<string, boolean> = {}
    try {
      const { data, error } = await supabase.from('feature_flags').select('nom, actif')
      if (!error && data) {
        for (const f of data as { nom: string; actif: boolean }[]) map[f.nom] = f.actif
      }
    } catch {
      /* table absente : tout reste actif (fail-open) */
    }
    cache = map
    inflight = null
    return map
  })()
  return inflight
}

/** Hook : renvoie true tant que le flag n'est pas explicitement désactivé. */
export function useFeatureFlag(nom: string): boolean {
  const [actif, setActif] = useState(true)
  useEffect(() => {
    let cancel = false
    void chargerFlags().then((map) => {
      if (!cancel && map[nom] === false) setActif(false)
    })
    return () => { cancel = true }
  }, [nom])
  return actif
}
