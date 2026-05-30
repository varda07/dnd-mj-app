'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

/**
 * Modal — composant réutilisable, fond semi-transparent, bordure or, animation
 * fade + scale. Bouton fermeture en haut à droite. Bouton principal en bas à
 * droite via le slot `footer`. Echap ferme la modale.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  className = ''
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  closeOnOverlay?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // Lock body scroll
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  if (typeof window === 'undefined') return null

  const sizeClass = size === 'sm' ? 'codex-modal-sm' : size === 'lg' ? 'codex-modal-lg' : size === 'xl' ? 'codex-modal-xl' : ''

  return createPortal(
    <div
      className="codex-modal-overlay"
      onClick={closeOnOverlay ? (e) => { if (e.target === e.currentTarget) onClose() } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
    >
      <div ref={ref} className={`codex-modal ${sizeClass} ${className}`.trim()}>
        {title !== undefined ? (
          <div className="codex-modal-header">
            <div className="codex-modal-title">{title}</div>
            <button type="button" className="codex-modal-close" onClick={onClose} aria-label="Fermer">
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="codex-modal-close"
            onClick={onClose}
            aria-label="Fermer"
            style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
          >
            ✕
          </button>
        )}
        <div className="codex-modal-body">{children}</div>
        {footer ? <div className="codex-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  )
}
