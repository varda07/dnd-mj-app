/**
 * Roadmap Affinement 3.6 — Cache localStorage pour données statiques
 * ----------------------------------------------------------------------------
 * Évite de re-requêter des listes officielles (races, classes, conditions…)
 * qui ne changent pas. Versioning via clé `__v` pour invalider si on bump.
 */

export function cacheGet<T>(key: string, version: number): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`codex_cache_${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { __v: number; data: T }
    if (parsed.__v !== version) return null
    return parsed.data
  } catch { return null }
}

export function cacheSet<T>(key: string, version: number, data: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      `codex_cache_${key}`,
      JSON.stringify({ __v: version, data })
    )
  } catch { /* quota plein ou indispo */ }
}

export async function cached<T>(key: string, version: number, loader: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key, version)
  if (hit !== null) return hit
  const data = await loader()
  cacheSet(key, version, data)
  return data
}
