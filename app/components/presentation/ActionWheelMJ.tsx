'use client'

// ============================================================================
// Roue d'action MJ — cockpit de session UNIQUEMENT
// ----------------------------------------------------------------------------
// Bouton central (monogramme Master Screen) DÉPLAÇABLE (drag & drop), position
// mémorisée en localStorage. Au clic, 6 pétales se déploient sur un arc calculé
// dynamiquement selon la position du bouton : l'arc s'ouvre du côté où il y a
// de la place (vers le centre de l'écran), tous les pétales restent visibles.
// Icônes SVG fines dorées (pas d'emoji). Accessible à tout moment (même en
// combat). Le FAB dés classique est masqué tant que la roue est active.
// ============================================================================

import { useCallback, useEffect, useRef, useState, type SVGProps, type ReactElement } from 'react'

export type ActionWheelKey =
  | 'des'
  | 'magie'
  | 'rencontre'
  | 'narration'
  | 'sons'
  | 'image'

const STORAGE_KEY = 'presentation_action_wheel_pos'
const BTN = 60 // diamètre du bouton central
const PETAL = 56 // diamètre d'un pétale

// ---- Icônes SVG fines (style ligne dorée, cohérent grimoire) ----
const iconProps: SVGProps<SVGSVGElement> = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
}

function IcoDes() {
  return (
    <svg {...iconProps} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function IcoMagie() {
  return (
    <svg {...iconProps} aria-hidden>
      <path d="M12 3.5 13.7 9.4 19.5 11 13.7 12.6 12 18.5 10.3 12.6 4.5 11 10.3 9.4Z" />
      <path d="M18.5 3.5v3M17 5h3" />
    </svg>
  )
}
function IcoRencontre() {
  return (
    <svg {...iconProps} aria-hidden>
      <path d="M13 2 5 13.5h5l-1 8.5 9-12h-6l1-8Z" />
    </svg>
  )
}
function IcoNarration() {
  return (
    <svg {...iconProps} aria-hidden>
      <path d="M12 6c-2-1.2-4.5-1.2-7 0v12c2.5-1.2 5-1.2 7 0 2-1.2 4.5-1.2 7 0V6c-2.5-1.2-5-1.2-7 0Z" />
      <path d="M12 6v12" />
    </svg>
  )
}
function IcoSons() {
  return (
    <svg {...iconProps} aria-hidden>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </svg>
  )
}
function IcoImage() {
  return (
    <svg {...iconProps} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="8" cy="10" r="1.6" />
      <path d="M4.5 17.5 10 12l3 3 3.5-4 3 4" />
    </svg>
  )
}

const PETALS: Array<{ key: ActionWheelKey; Icon: () => ReactElement; label: string }> = [
  { key: 'des', Icon: IcoDes, label: 'Dés' },
  { key: 'magie', Icon: IcoMagie, label: 'Magie' },
  { key: 'rencontre', Icon: IcoRencontre, label: 'Rencontre' },
  { key: 'narration', Icon: IcoNarration, label: 'Narration' },
  { key: 'sons', Icon: IcoSons, label: 'Sons' },
  { key: 'image', Icon: IcoImage, label: 'Image' }
]

type Pos = { x: number; y: number } // centre du bouton, coords écran

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

// Position par défaut : BAS-GAUCHE (zone du FAB dés classique). ⚠️ La sidebar
// de l'app est à DROITE — un défaut à droite passerait DERRIÈRE elle et serait
// invisible. On reste donc à gauche ; l'arc se déploie vers le haut-droite.
// Le bouton reste déplaçable (position mémorisée en localStorage).
function defaultPos(w: number, h: number): Pos {
  const x = BTN / 2 + 22
  if (w >= 768) return { x, y: h - BTN / 2 - 22 }
  // Mobile : ancré en bas avec marge (V1 3.3 — bottom bar supprimée).
  return { x, y: h - (16 + BTN / 2) }
}

// Calcule les offsets (dx,dy) de chaque pétale par rapport au centre du bouton.
// L'arc est centré sur la direction bouton→centre-écran ; son ampleur dépend de
// la proximité des bords (coin = quart de cercle, bord = ~demi, libre = large).
// Chaque pétale est ensuite borné à l'écran (sécurité anti-débordement).
function computeOffsets(pos: Pos, w: number, h: number): Array<{ x: number; y: number }> {
  const N = PETALS.length
  const margin = PETAL / 2 + 6
  const cx = w / 2
  const cy = h / 2
  // Direction vers le centre de l'écran (l'arc s'ouvre de ce côté).
  const base = Math.atan2(cy - pos.y, cx - pos.x)
  const nearL = pos.x < w * 0.25
  const nearR = pos.x > w * 0.75
  const nearT = pos.y < h * 0.25
  const nearB = pos.y > h * 0.75
  const horiz = nearL || nearR
  const vert = nearT || nearB
  // Coin = quart de cercle (90°), bord = ~demi, espace libre = large arc.
  const spanDeg = horiz && vert ? 90 : horiz || vert ? 170 : 250
  const span = (spanDeg * Math.PI) / 180
  // Rayon : assez grand pour éviter le chevauchement des pétales SUR l'arc
  // (corde entre 2 pétales adjacents ≥ diamètre d'un pétale).
  const stepDeg = spanDeg / (N - 1)
  let R = PETAL / (2 * Math.sin(((stepDeg / 2) * Math.PI) / 180)) + 8
  R = clamp(R, 150, 210)

  // Positions brutes des pétales sur l'arc (coords écran).
  const raw = PETALS.map((_, i) => {
    const a = base - span / 2 + (span * i) / (N - 1)
    return { x: pos.x + Math.cos(a) * R, y: pos.y + Math.sin(a) * R }
  })

  // V1 3.2 — anti-superposition : plutôt que de borner CHAQUE pétale à l'écran
  // (ce qui les empilait tous sur un même bord dans un coin), on translate
  // l'ENSEMBLE du groupe vers l'intérieur, en bloc, ce qui préserve l'espacement
  // angulaire → aucun chevauchement.
  const xs = raw.map((p) => p.x)
  const ys = raw.map((p) => p.y)
  let shiftX = 0
  let shiftY = 0
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  if (minX < margin) shiftX = margin - minX
  else if (maxX > w - margin) shiftX = w - margin - maxX
  if (minY < margin) shiftY = margin - minY
  else if (maxY > h - margin) shiftY = h - margin - maxY

  return raw.map((p) => ({ x: p.x + shiftX - pos.x, y: p.y + shiftY - pos.y }))
}

export default function ActionWheelMJ({
  onSelect
}: {
  onSelect: (key: ActionWheelKey) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos | null>(null)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null)

  // Init : dimensions + position (localStorage ou défaut ergonomique).
  useEffect(() => {
    const w = window.innerWidth
    const h = window.innerHeight
    // Init client-only (dimensions + position) : sync state légitime au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDims({ w, h })
    let next: Pos | null = null
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const p = JSON.parse(raw) as Pos
        // Position valide (nombres finis) ET hors de la zone droite occupée par
        // la sidebar (sinon la roue serait masquée derrière → on réinitialise).
        if (
          Number.isFinite(p?.x) &&
          Number.isFinite(p?.y) &&
          p.x <= w - 96
        ) {
          next = p
        }
      }
    } catch {
      /* noop */
    }
    if (!next) next = defaultPos(w, h)
    next = {
      x: clamp(next.x, BTN / 2 + 6, w - BTN / 2 - 6),
      y: clamp(next.y, BTN / 2 + 6, h - BTN / 2 - 6)
    }
    setPos(next)
  }, [])

  // Re-clamp à la position à chaque redimensionnement de fenêtre.
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setDims({ w, h })
      setPos((p) =>
        p
          ? {
              x: clamp(p.x, BTN / 2 + 6, w - BTN / 2 - 6),
              y: clamp(p.y, BTN / 2 + 6, h - BTN / 2 - 6)
            }
          : p
      )
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!pos) return
    drag.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y, moved: false }
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      /* noop */
    }
  }, [pos])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current
    if (!d || !dims) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) > 5) {
      d.moved = true
      setOpen(false) // on referme la roue dès qu'on déplace
    }
    if (!d.moved) return
    setPos({
      x: clamp(d.baseX + dx, BTN / 2 + 6, dims.w - BTN / 2 - 6),
      y: clamp(d.baseY + dy, BTN / 2 + 6, dims.h - BTN / 2 - 6)
    })
  }, [dims])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    } catch {
      /* noop */
    }
    if (!d) return
    if (d.moved) {
      // Persiste la nouvelle position.
      setPos((p) => {
        if (p) {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
          } catch {
            /* noop */
          }
        }
        return p
      })
    } else {
      // Simple clic → ouvre / ferme la roue.
      setOpen((o) => !o)
    }
  }, [])

  if (!pos || !dims) return null
  const offsets = computeOffsets(pos, dims.w, dims.h)

  return (
    <>
      {open && (
        <div className="aw-backdrop" onClick={() => setOpen(false)} aria-hidden />
      )}
      <div
        className="aw-root"
        role="group"
        aria-label="Roue d'action MJ"
        style={{ left: pos.x - BTN / 2, top: pos.y - BTN / 2 }}
      >
        {PETALS.map((p, i) => (
          <button
            key={p.key}
            type="button"
            className="aw-petal"
            style={{
              transform: open
                ? `translate(-50%, -50%) translate(${offsets[i].x}px, ${offsets[i].y}px) scale(1)`
                : 'translate(-50%, -50%) scale(0)',
              opacity: open ? 1 : 0,
              pointerEvents: open ? 'auto' : 'none',
              transitionDelay: `${open ? i * 30 : (PETALS.length - 1 - i) * 12}ms`
            }}
            tabIndex={open ? 0 : -1}
            onClick={() => {
              onSelect(p.key)
              setOpen(false)
            }}
            title={p.label}
          >
            <span className="aw-petal-icon">
              <p.Icon />
            </span>
            <span className="aw-petal-label">{p.label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`aw-center${open ? ' is-open' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          aria-expanded={open}
          aria-label={open ? 'Fermer la roue d’action (glisser pour déplacer)' : 'Ouvrir la roue d’action (glisser pour déplacer)'}
          title="Glisser pour déplacer · cliquer pour ouvrir"
        >
          {open ? <span className="aw-center-close">✕</span> : <MasterScreenLogo />}
        </button>
      </div>
    </>
  )
}

// Monogramme Master Screen (mini), dérivé de public/icon.svg.
function MasterScreenLogo() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="aw-ms-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffdd88" />
          <stop offset="50%" stopColor="#C9A84C" />
          <stop offset="100%" stopColor="#5a4520" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="#0a0b0d" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="url(#aw-ms-gold)" strokeWidth="2" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#aw-ms-gold)" strokeWidth="0.6" strokeDasharray="2 2" />
      <text x="49" y="69" textAnchor="middle" fontFamily="Georgia, serif" fontSize="60" fill="url(#aw-ms-gold)" fontWeight="bold" fontStyle="italic">M</text>
      <text x="64" y="73" textAnchor="middle" fontFamily="Georgia, serif" fontSize="29" fill="#0a0a0a" fontWeight="bold" fontStyle="italic" stroke="#f5f1e8" strokeWidth="0.7" paintOrder="stroke">S</text>
    </svg>
  )
}
