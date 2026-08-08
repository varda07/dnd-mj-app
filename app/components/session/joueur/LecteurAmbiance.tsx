'use client'

// ============================================================================
// LecteurAmbiance — lecture de session_state.ambient_sound côté joueur (Delta D)
// ----------------------------------------------------------------------------
// Le MJ pousse une piste dans session_state ; chaque joueur la joue avec SON
// propre volume (mémorisé localement). Les navigateurs mobiles refusent la
// lecture automatique tant que l'utilisateur n'a pas interagi avec la page :
// on affiche alors un bouton « Activer l'ambiance » et on ne réessaie qu'après
// ce geste.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AmbientSound } from '@/app/lib/session-live'

const CLE_VOLUME = 'session_ambiance_volume'

export default function LecteurAmbiance({ son }: { son: AmbientSound }) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [volume, setVolume] = useState(60)
  const [bloque, setBloque] = useState(false)
  const [enLecture, setEnLecture] = useState(false)

  const piste = son?.piste ?? null
  const voulu = piste !== null && son?.en_lecture !== false

  // Volume mémorisé sur l'appareil.
  useEffect(() => {
    try {
      const v = parseInt(window.localStorage.getItem(CLE_VOLUME) ?? '', 10)
      if (Number.isFinite(v)) setVolume(Math.max(0, Math.min(100, v)))
    } catch {
      /* stockage indisponible */
    }
  }, [])

  useEffect(() => {
    if (ref.current) ref.current.volume = volume / 100
  }, [volume, piste])

  const tenterLecture = useCallback(async () => {
    const el = ref.current
    if (!el || !voulu) return
    try {
      await el.play()
      setBloque(false)
      setEnLecture(true)
    } catch {
      // Lecture automatique refusée : il faut un geste de l'utilisateur.
      setBloque(true)
      setEnLecture(false)
    }
  }, [voulu])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!voulu) {
      el.pause()
      setEnLecture(false)
      return
    }
    void tenterLecture()
  }, [voulu, piste, tenterLecture])

  if (!piste) return null

  return (
    <div className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
      style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(0,0,0,0.3)' }}>
      <audio ref={ref} src={piste} loop preload="auto" />
      <span className="text-sm" aria-hidden>🎵</span>
      <span className="text-[11px] text-stone-400 flex-1 min-w-0 truncate">
        {bloque ? 'Ambiance prête' : enLecture ? 'Ambiance en cours' : 'Ambiance en pause'}
      </span>
      {bloque ? (
        <button
          type="button"
          onClick={() => void tenterLecture()}
          className="px-2 py-1 rounded bg-[#C9A84C] text-gray-900 text-[11px] font-bold flex-shrink-0"
        >
          🔊 Activer l’ambiance
        </button>
      ) : (
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          aria-label="Volume de l’ambiance"
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            setVolume(v)
            try {
              window.localStorage.setItem(CLE_VOLUME, String(v))
            } catch {
              /* stockage indisponible */
            }
          }}
          className="w-24 accent-yellow-500 flex-shrink-0"
        />
      )}
    </div>
  )
}
