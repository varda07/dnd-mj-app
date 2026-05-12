'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Favoris — singleton léger + hook React
// ============================================================================
// Stockage côté Supabase : profiles.favoris (jsonb), shape :
//   { "scenarios": [uuid…], "personnages": [...], "ennemis": [...], ... }
//
// Côté client, on garde une copie en mémoire et on notifie les abonnés à
// chaque mutation. Les writes vers Supabase sont coalescés (debounce 400 ms)
// pour éviter de spammer la BDD pendant qu'on toggle plusieurs étoiles.
// ============================================================================

export type FavoriType =
  | 'scenarios'
  | 'personnages'
  | 'ennemis'
  | 'pnj'
  | 'items'
  | 'maps'
  | 'sorts'

export type FavorisMap = Partial<Record<FavoriType, string[]>>

let state: FavorisMap = {}
let userId: string | null = null
let loaded = false
let loading: Promise<void> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<(s: FavorisMap) => void>()

function notifyAll() {
  listeners.forEach((l) => l(state))
}

async function loadFromSupabase(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    loaded = true
    return
  }
  userId = user.id
  const { data } = await supabase
    .from('profiles')
    .select('favoris')
    .eq('id', user.id)
    .maybeSingle()
  state = normaliser((data?.favoris as FavorisMap | null) ?? {})
  loaded = true
  notifyAll()
}

function normaliser(raw: FavorisMap): FavorisMap {
  const out: FavorisMap = {}
  ;(Object.keys(raw) as FavoriType[]).forEach((k) => {
    const v = raw[k]
    if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === 'string')
  })
  return out
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveNow, 400)
}

async function saveNow() {
  if (!userId) return
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, favoris: state }, { onConflict: 'id' })
  if (error) console.error('[favoris] save :', error)
}

export function estFavori(type: FavoriType, id: string): boolean {
  return (state[type] ?? []).includes(id)
}

export function toggleFavori(type: FavoriType, id: string): boolean {
  const arr = state[type] ? [...state[type]!] : []
  const idx = arr.indexOf(id)
  if (idx >= 0) {
    arr.splice(idx, 1)
  } else {
    arr.push(id)
  }
  state = { ...state, [type]: arr }
  notifyAll()
  scheduleSave()
  return idx < 0 // true si maintenant épinglé
}

export function getAllFavoris(): FavorisMap {
  return state
}

// ----------------------------------------------------------------------------
// Hook React : retourne la map à jour et un déclencheur de re-render à chaque
// mutation. À la première utilisation, déclenche le chargement Supabase.
// L'état `loaded` est lu directement depuis la variable module — le hook
// notifie tous les abonnés via notifyAll quand le chargement se termine, ce
// qui déclenche un re-render qui voit la nouvelle valeur. Évite tout setState
// synchrone dans l'effet.
// ----------------------------------------------------------------------------
export function useFavoris(): {
  favoris: FavorisMap
  loaded: boolean
  toggle: (type: FavoriType, id: string) => boolean
  est: (type: FavoriType, id: string) => boolean
} {
  const [, setTick] = useState(0)

  useEffect(() => {
    const sub = () => setTick((t) => t + 1)
    listeners.add(sub)
    if (!loaded && !loading) {
      // Le chargement notifie tous les abonnés à la fin via notifyAll ; pas
      // besoin de setState ici.
      loading = loadFromSupabase()
    }
    return () => {
      listeners.delete(sub)
    }
  }, [])

  return {
    favoris: state,
    loaded,
    toggle: toggleFavori,
    est: estFavori
  }
}
