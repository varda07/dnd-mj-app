'use client'

// ============================================================================
// Sons de dés — settings (localStorage) + lecture audio tolérante
// ============================================================================
// Trois clés :
//   - 'dice-roll'     : son du jet (au clic « Lancer »)
//   - 'crit-success'  : son sur 20 naturel d20
//   - 'crit-fail'     : son sur 1 naturel d20
//
// L'utilisateur peut surcharger l'URL de chaque son via les paramètres du
// lanceur. Par défaut on pointe vers /sounds/<key>.mp3 — il suffit donc de
// déposer trois fichiers dans public/sounds/ pour que tout fonctionne.
//
// Si un son est introuvable (404, format invalide, etc.) on log mais on
// n'interrompt pas le jet — l'expérience visuelle reste intacte.
// ============================================================================

export type SoundKey = 'dice-roll' | 'crit-success' | 'crit-fail'

const KEYS_LS = {
  enabled: 'dice-sounds:enabled',
  volume: 'dice-sounds:volume',
  url: (k: SoundKey) => `dice-sounds:url:${k}`
}

const DEFAULT_URLS: Record<SoundKey, string> = {
  'dice-roll': '/sounds/dice-roll.mp3',
  'crit-success': '/sounds/crit-success.mp3',
  'crit-fail': '/sounds/crit-fail.mp3'
}

export function getSoundsEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const raw = window.localStorage.getItem(KEYS_LS.enabled)
  if (raw === null) return true // activé par défaut
  return raw === 'true'
}

export function setSoundsEnabled(v: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEYS_LS.enabled, v ? 'true' : 'false')
}

export function getVolume(): number {
  if (typeof window === 'undefined') return 70
  const raw = window.localStorage.getItem(KEYS_LS.volume)
  const n = raw === null ? 70 : parseInt(raw, 10)
  if (Number.isNaN(n)) return 70
  return Math.max(0, Math.min(100, n))
}

export function setVolume(v: number): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEYS_LS.volume, String(Math.max(0, Math.min(100, v))))
}

export function getUrl(key: SoundKey): string {
  if (typeof window === 'undefined') return DEFAULT_URLS[key]
  return window.localStorage.getItem(KEYS_LS.url(key)) ?? DEFAULT_URLS[key]
}

export function setUrl(key: SoundKey, url: string): void {
  if (typeof window === 'undefined') return
  const clean = url.trim()
  if (!clean) {
    window.localStorage.removeItem(KEYS_LS.url(key))
    return
  }
  window.localStorage.setItem(KEYS_LS.url(key), clean)
}

export function resetUrl(key: SoundKey): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(KEYS_LS.url(key))
}

// Cache des éléments Audio par URL — évite de recréer l'objet à chaque jet.
// On clone à la lecture pour pouvoir superposer plusieurs jets rapprochés.
const audioCache = new Map<string, HTMLAudioElement>()

function getOrCreate(url: string): HTMLAudioElement {
  let a = audioCache.get(url)
  if (a) return a
  a = new Audio(url)
  a.preload = 'auto'
  audioCache.set(url, a)
  return a
}

export function playSound(key: SoundKey): void {
  if (typeof window === 'undefined') return
  if (!getSoundsEnabled()) return
  const url = getUrl(key)
  if (!url) return
  try {
    const base = getOrCreate(url)
    // Clone pour permettre la superposition (utile si l'utilisateur enchaîne
    // plusieurs jets — le précédent peut continuer à jouer).
    const a = base.cloneNode(true) as HTMLAudioElement
    a.volume = getVolume() / 100
    void a.play().catch((err) => {
      console.warn(`[dice-sounds] lecture ${key} échouée :`, err?.message ?? err)
    })
  } catch (err) {
    console.warn(`[dice-sounds] init ${key} échouée :`, err)
  }
}

export const SOUND_DEFAULT_URLS = DEFAULT_URLS
