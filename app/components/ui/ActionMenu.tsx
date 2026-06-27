'use client'

// ============================================================================
// ActionMenu — menu d'actions « ⋮ » réutilisable (V1 refonte des listes)
// ----------------------------------------------------------------------------
// Range les actions secondaires d'une carte de liste dans un menu déroulant
// compact, pour alléger les listes surchargées. L'action principale reste
// visible à côté du menu (gérée par l'appelant).
//
//   <ActionMenu actions={[
//     { label: 'Éditer', icon: '📖', onClick: ... },
//     { label: 'Supprimer', icon: '🗑️', onClick: ..., variant: 'danger', separatorBefore: true },
//   ]} />
//
// - Click-outside + Échap pour fermer.
// - Porté dans <body> (portal) + position calculée → ne déborde jamais de
//   l'écran (s'ouvre vers le haut/bas et se recale horizontalement).
// - Accessible : aria-haspopup/expanded, role=menu/menuitem, navigation clavier
//   (↑/↓, Échap), focus géré.
// - Cibles tactiles ≥ 44px.
// ============================================================================

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'

export type ActionItem = {
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: 'normal' | 'danger'
  disabled?: boolean
  // Insère un séparateur juste avant cet item (ex. avant « Supprimer »).
  separatorBefore?: boolean
}

type Coords = { top: number; left: number; minWidth: number }

const MENU_WIDTH = 220
const ITEM_H = 44
const MARGIN = 8

export default function ActionMenu({
  actions,
  label = 'Plus d’actions',
  buttonClassName = ''
}: {
  actions: Array<ActionItem | null | false | undefined>
  label?: string
  buttonClassName?: string
}) {
  const items = actions.filter(Boolean) as ActionItem[]
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<Coords | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const placer = useCallback(() => {
    const btn = btnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const estimatedH = Math.min(items.length * ITEM_H + 12, vh - 2 * MARGIN)

    // Horizontal : aligné à droite du bouton, recalé pour rester à l'écran.
    let left = r.right - MENU_WIDTH
    left = Math.max(MARGIN, Math.min(left, vw - MENU_WIDTH - MARGIN))

    // Vertical : sous le bouton si la place suffit, sinon au-dessus.
    const spaceBelow = vh - r.bottom
    const ouvreEnHaut = spaceBelow < estimatedH + MARGIN && r.top > spaceBelow
    let top = ouvreEnHaut ? r.top - estimatedH - 4 : r.bottom + 4
    top = Math.max(MARGIN, Math.min(top, vh - estimatedH - MARGIN))

    setCoords({ top, left, minWidth: Math.max(MENU_WIDTH, r.width) })
  }, [items.length])

  useLayoutEffect(() => {
    if (open) placer()
  }, [open, placer])

  useEffect(() => {
    if (!open) return
    const onScrollResize = () => placer()
    const onDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    window.addEventListener('scroll', onScrollResize, true)
    window.addEventListener('resize', onScrollResize)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScrollResize, true)
      window.removeEventListener('resize', onScrollResize)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, placer])

  // Navigation clavier ↑/↓ entre les items.
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const btns = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []
    )
    if (btns.length === 0) return
    const idx = btns.indexOf(document.activeElement as HTMLButtonElement)
    const next =
      e.key === 'ArrowDown'
        ? btns[(idx + 1) % btns.length]
        : btns[(idx - 1 + btns.length) % btns.length]
    next?.focus()
  }

  if (items.length === 0) return null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className={`inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-md text-gray-400 hover:text-white hover:bg-[rgba(201,168,76,0.1)] transition ${buttonClassName}`}
      >
        <span className="text-xl leading-none" aria-hidden>
          ⋮
        </span>
      </button>

      {open &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            className="fixed z-[9500] py-1 rounded-lg overflow-y-auto codex-scroll shadow-2xl"
            style={{
              top: coords.top,
              left: coords.left,
              minWidth: coords.minWidth,
              maxWidth: 'calc(100vw - 16px)',
              maxHeight: 'calc(100vh - 16px)',
              background: '#12141a',
              border: '1px solid rgba(201,168,76,0.35)',
              boxShadow: '0 12px 36px rgba(0,0,0,0.6), 0 0 18px rgba(201,168,76,0.12)'
            }}
          >
            {items.map((a, i) => (
              <div key={`${a.label}-${i}`}>
                {a.separatorBefore && (
                  <div className="my-1 border-t border-[rgba(201,168,76,0.15)]" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={a.disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(false)
                    a.onClick()
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 text-left text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    a.variant === 'danger'
                      ? 'text-red-300 hover:bg-red-700/20'
                      : 'text-gray-200 hover:bg-[rgba(201,168,76,0.12)]'
                  }`}
                  style={{ minHeight: ITEM_H }}
                >
                  {a.icon != null && (
                    <span className="w-5 text-center flex-shrink-0" aria-hidden>
                      {a.icon}
                    </span>
                  )}
                  <span className="flex-1 truncate">{a.label}</span>
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
