'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'

/**
 * Tooltip — apparition au hover/focus. Sur mobile (touch), long-press
 * (500ms) affiche le tooltip puis se ferme au tap suivant.
 */
export default function Tooltip({
  label,
  children,
  position = 'top',
  className = ''
}: {
  label: string
  children: ReactNode
  position?: 'top' | 'bottom'
  className?: string
}) {
  const [openTouch, setOpenTouch] = useState(false)
  const longPressTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!openTouch) return
    const onTouch = () => setOpenTouch(false)
    setTimeout(() => {
      document.addEventListener('touchstart', onTouch, { once: true })
    }, 100)
    return () => document.removeEventListener('touchstart', onTouch)
  }, [openTouch])

  return (
    <span
      className={`codex-tooltip ${position === 'bottom' ? 'codex-tooltip-bottom' : ''} ${openTouch ? 'is-open' : ''} ${className}`.trim()}
      onTouchStart={() => {
        longPressTimer.current = window.setTimeout(() => setOpenTouch(true), 500)
      }}
      onTouchEnd={() => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
      }}
      onTouchCancel={() => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
      }}
    >
      {children}
      <span className="codex-tooltip-content" role="tooltip">{label}</span>
    </span>
  )
}
