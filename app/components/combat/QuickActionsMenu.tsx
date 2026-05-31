'use client'

// ============================================================================
// Roadmap Modes 2.3 — Menu contextuel actions rapides (clic droit / long press)
// ----------------------------------------------------------------------------
// Menu compact qui apparaît à la position du clic. Désaffiché au clic
// extérieur ou Escape.
// ============================================================================

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type QuickAction = 'attaque' | 'sort' | 'action' | 'bonus' | 'reaction' | 'ko' | 'soin'

const ACTIONS: Array<{ key: QuickAction; label: string; icon: string }> = [
  { key: 'attaque',  label: 'Attaquer',     icon: '⚔️' },
  { key: 'sort',     label: 'Lancer un sort', icon: '✨' },
  { key: 'action',   label: 'Action',       icon: '🎯' },
  { key: 'bonus',    label: 'Action bonus', icon: '⚡' },
  { key: 'reaction', label: 'Réaction',     icon: '🛡' },
  { key: 'soin',     label: 'Soigner',      icon: '🌟' },
  { key: 'ko',       label: 'K.O.',         icon: '💀' },
]

export default function QuickActionsMenu({
  x, y, ouvert, onAction, onClose,
}: {
  x: number; y: number; ouvert: boolean
  onAction: (a: QuickAction) => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!ouvert) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-quickactions-root]')) onClose()
    }
    document.addEventListener('keydown', onKey)
    setTimeout(() => document.addEventListener('click', onClick), 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [ouvert, onClose])

  if (!ouvert || typeof window === 'undefined') return null
  // Clamp dans la fenêtre
  const cx = Math.min(x, window.innerWidth - 200)
  const cy = Math.min(y, window.innerHeight - 280)

  return createPortal(
    <div
      data-quickactions-root
      style={{
        position: 'fixed', top: cy, left: cx, zIndex: 9999,
        background: 'linear-gradient(180deg, #14171d 0%, #0a0c10 100%)',
        border: '1px solid rgba(201, 168, 76, 0.4)',
        borderRadius: 8,
        boxShadow: '0 8px 28px rgba(0,0,0,0.55), 0 0 18px rgba(201,168,76,0.18)',
        padding: 6, minWidth: 180,
        animation: 'codex-modal-in 0.15s ease both',
      }}
    >
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {ACTIONS.map((a) => (
          <li key={a.key}>
            <button
              type="button"
              onClick={() => { onAction(a.key); onClose() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', border: 0, background: 'transparent',
                color: '#e8e8ec', cursor: 'pointer', fontSize: 13, borderRadius: 4,
                textAlign: 'left',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.1)' }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              <span>{a.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>,
    document.body
  )
}

/** Hook : ouvre le menu au clic droit ou long-press tactile sur un élément. */
export function useQuickActions() {
  const [state, setState] = useState<{ x: number; y: number; payload?: unknown } | null>(null)
  const open = (e: React.MouseEvent | React.TouchEvent, payload?: unknown) => {
    e.preventDefault()
    let x = 0, y = 0
    if ('clientX' in e) { x = e.clientX; y = e.clientY }
    else if (e.touches[0]) { x = e.touches[0].clientX; y = e.touches[0].clientY }
    setState({ x, y, payload })
  }
  const close = () => setState(null)
  return { state, open, close }
}
