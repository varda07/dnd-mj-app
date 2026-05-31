'use client'

// ============================================================================
// Roadmap Modes 1.2 — Compte à rebours / chrono de session
// ----------------------------------------------------------------------------
// Démarre automatiquement à l'ouverture (créé par MJ). Persisté en
// localStorage pour survivre aux reloads. Pause/reprise/reset.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'

type TimerState = {
  startTs: number          // timestamp ms du démarrage (ou reprise)
  accumulatedMs: number    // temps écoulé avant la dernière pause
  paused: boolean
}

function fmt(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${m}min${String(s).padStart(2, '0')}`
}

export default function SessionTimer({ sessionId }: { sessionId: string }) {
  const storageKey = `presentation_timer_${sessionId}`
  const [state, setState] = useState<TimerState | null>(null)
  const [, force] = useState(0)

  // Init depuis localStorage ou démarre maintenant
  useEffect(() => {
    let next: TimerState
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) next = JSON.parse(raw) as TimerState
      else next = { startTs: Date.now(), accumulatedMs: 0, paused: false }
    } catch {
      next = { startTs: Date.now(), accumulatedMs: 0, paused: false }
    }
    setState(next)
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* noop */ }
  }, [storageKey])

  // Tick d'affichage (1 fois/s tant que non pausé)
  useEffect(() => {
    if (!state || state.paused) return
    const id = setInterval(() => force((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [state])

  const persist = useCallback((next: TimerState) => {
    setState(next)
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* noop */ }
  }, [storageKey])

  const pauseResume = () => {
    if (!state) return
    if (state.paused) {
      persist({ ...state, paused: false, startTs: Date.now() })
    } else {
      const ecoule = state.accumulatedMs + (Date.now() - state.startTs)
      persist({ startTs: Date.now(), accumulatedMs: ecoule, paused: true })
    }
  }

  const reset = () => {
    if (!confirm('Réinitialiser le chrono de session à 00:00 ?')) return
    persist({ startTs: Date.now(), accumulatedMs: 0, paused: false })
  }

  if (!state) return null
  const ecoule = state.paused
    ? state.accumulatedMs
    : state.accumulatedMs + (Date.now() - state.startTs)

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-mono"
      title="Chrono de session — clic pause/reprise, ⟲ reset"
    >
      <button
        type="button"
        onClick={pauseResume}
        className={`px-2 py-0.5 rounded border text-xs font-bold tabular-nums ${
          state.paused
            ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-200'
            : 'bg-gray-900/50 border-gray-700 text-gray-100 hover:border-yellow-500/40'
        }`}
      >
        {state.paused ? '▶' : '⏸'} {fmt(ecoule)}
      </button>
      <button
        type="button"
        onClick={reset}
        className="text-gray-500 hover:text-yellow-300 text-xs px-1"
        title="Réinitialiser"
        aria-label="Réinitialiser"
      >⟲</button>
    </span>
  )
}
