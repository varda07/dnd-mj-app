'use client'

// ============================================================================
// Roadmap Finalisation Phase 4 — Tutoriels guidés (overlay + spotlight)
// ----------------------------------------------------------------------------
// Monté une fois par page importante : <GuidedTour tourId="combat" />.
//   - Auto-déclenchement à la première visite (sauf si désactivé) via
//     profiles.tutoriels_vus.
//   - Déclenchement manuel via le bouton flottant 🎓 OU l'évènement
//     `tour:start` (helper startTour()).
//   - Chaque étape éclaire un élément (data-tour=…) ou s'affiche centrée.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import Tooltip from '@/app/components/ui/Tooltip'
import {
  TOURS,
  autoToursDisabled,
  setAutoToursDisabled,
  tourDejaVu,
  marquerTourVu,
} from '@/app/lib/tours'

export default function GuidedTour({ tourId }: { tourId: string }) {
  const tour = TOURS[tourId]
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [autoOff, setAutoOff] = useState(false)
  const startedRef = useRef(false)

  const step = tour?.steps[stepIndex]

  // -- Recalcule la position de la cible de l'étape courante -----------------
  const majCible = useCallback(() => {
    if (!step?.selector) { setRect(null); return }
    const el = document.querySelector(step.selector)
    if (el) setRect(el.getBoundingClientRect())
    else setRect(null)
  }, [step])

  // -- Démarrage (manuel = ignore "déjà vu") ---------------------------------
  const demarrer = useCallback(() => {
    setStepIndex(0)
    setActive(true)
  }, [])

  // -- Auto-déclenchement à la première visite -------------------------------
  useEffect(() => {
    if (!tour || startedRef.current) return
    startedRef.current = true
    if (autoToursDisabled()) return
    let cancel = false
    const timer = window.setTimeout(async () => {
      const vu = await tourDejaVu(tourId)
      if (!cancel && !vu) demarrer()
    }, 900)
    return () => { cancel = true; window.clearTimeout(timer) }
  }, [tour, tourId, demarrer])

  // -- Déclenchement manuel via évènement global -----------------------------
  useEffect(() => {
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tourId?: string } | undefined
      if (detail?.tourId === tourId) demarrer()
    }
    window.addEventListener('tour:start', onStart)
    return () => window.removeEventListener('tour:start', onStart)
  }, [tourId, demarrer])

  // -- Suivi de la cible (scroll/resize) + scroll-into-view au changement ----
  useEffect(() => {
    if (!active) return
    const el = step?.selector ? document.querySelector(step.selector) : null
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    // léger délai pour laisser le scroll se faire avant de mesurer
    const t = window.setTimeout(majCible, 320)
    window.addEventListener('scroll', majCible, true)
    window.addEventListener('resize', majCible)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('scroll', majCible, true)
      window.removeEventListener('resize', majCible)
    }
  }, [active, stepIndex, step, majCible])

  if (!tour) return null

  const fermer = (marquer: boolean) => {
    setActive(false)
    setRect(null)
    if (marquer) void marquerTourVu(tourId)
  }
  const suivant = () => {
    if (stepIndex < tour.steps.length - 1) setStepIndex((s) => s + 1)
    else fermer(true)
  }
  const precedent = () => { if (stepIndex > 0) setStepIndex((s) => s - 1) }

  // -- Position de la carte (sous la cible si place, sinon au-dessus) ---------
  const cardW = 330
  const cardStyle: React.CSSProperties = (() => {
    if (typeof window === 'undefined' || !rect) {
      return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - cardW / 2, vw - cardW - 12))
    const enBas = rect.bottom + 240 < vh
    const top = enBas ? rect.bottom + 14 : Math.max(12, rect.top - 226)
    return { left, top }
  })()

  return (
    <>
      {/* Bouton flottant 🎓 — relancer le tutoriel de la page */}
      {!active && (
        <div className="fixed z-[60]" style={{ left: 8, bottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
          <Tooltip label={`Tutoriel : ${tour.titre}`} position="top">
            <button
              type="button"
              onClick={demarrer}
              aria-label={`Lancer le tutoriel : ${tour.titre}`}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#12141a]/85 border border-[rgba(201,168,76,0.35)] text-[#C9A84C] hover:bg-[#1a1d24] hover:border-[#C9A84C] shadow-md transition-all text-base"
            >
              🎓
            </button>
          </Tooltip>
        </div>
      )}

      {active && step && (
        <>
          {/* Bloqueur d'interactions (transparent) */}
          <div
            className="fixed inset-0 z-[150]"
            style={{ background: rect ? 'transparent' : 'rgba(0,0,0,0.72)' }}
            onClick={() => { /* clics absorbés pendant le tour */ }}
            aria-hidden="true"
          />

          {/* Spotlight (dim partout sauf le trou) */}
          {rect && (
            <div
              className="fixed z-[151] pointer-events-none"
              style={{
                left: rect.left - 6,
                top: rect.top - 6,
                width: rect.width + 12,
                height: rect.height + 12,
                borderRadius: 8,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
                border: '2px solid #C9A84C',
                transition: 'all 0.2s ease',
              }}
              aria-hidden="true"
            />
          )}

          {/* Carte de l'étape */}
          <div
            className="fixed z-[160] w-[330px] max-w-[calc(100vw-24px)] rounded-xl bg-gray-900 shadow-2xl p-4"
            style={{ ...cardStyle, border: '1px solid rgba(201,168,76,0.4)' }}
            role="dialog"
            aria-modal="true"
            aria-label={step.title}
          >
            <div className="flex items-center gap-1 mb-2">
              {tour.steps.map((_, i) => (
                <span
                  key={i}
                  className="h-1 flex-1 rounded-full"
                  style={{ background: i <= stepIndex ? '#C9A84C' : 'rgba(201,168,76,0.18)' }}
                />
              ))}
            </div>

            <h3 className="text-yellow-400 font-bold text-base mb-1">{step.title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{step.text}</p>

            <label className="flex items-center gap-2 mt-3 text-[11px] text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoOff}
                onChange={(e) => { setAutoOff(e.target.checked); setAutoToursDisabled(e.target.checked) }}
                className="accent-yellow-500"
              />
              Ne plus afficher les tutoriels automatiquement
            </label>

            <div className="flex items-center justify-between gap-2 mt-3">
              <button
                type="button"
                onClick={() => fermer(true)}
                className="text-xs text-gray-400 hover:text-white px-2 py-1"
              >
                Passer
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500">{stepIndex + 1}/{tour.steps.length}</span>
                {stepIndex > 0 && (
                  <button
                    type="button"
                    onClick={precedent}
                    className="px-3 py-1.5 rounded text-sm text-gray-300 hover:bg-gray-800"
                  >
                    ← Précédent
                  </button>
                )}
                <button
                  type="button"
                  onClick={suivant}
                  className="px-4 py-1.5 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 text-sm"
                >
                  {stepIndex < tour.steps.length - 1 ? 'Suivant →' : 'Terminer ✓'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
