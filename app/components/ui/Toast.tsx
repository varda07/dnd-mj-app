'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

type ToastItem = {
  id: number
  kind: ToastKind
  message: string
  duration?: number
  leaving?: boolean
}

const KIND_ICON: Record<ToastKind, string> = {
  success: '✅',
  error:   '❌',
  info:    'ℹ️',
  warning: '⚠️'
}

let pushToast: ((t: Omit<ToastItem, 'id'>) => void) | null = null
let counter = 1

/**
 * toast.success('Scénario créé') — depuis n'importe où dans l'app.
 * Requiert <ToastHost /> monté dans le layout.
 */
export const toast = {
  success: (msg: string, duration = 3000) => pushToast?.({ kind: 'success', message: msg, duration }),
  error:   (msg: string, duration = 4000) => pushToast?.({ kind: 'error',   message: msg, duration }),
  info:    (msg: string, duration = 3000) => pushToast?.({ kind: 'info',    message: msg, duration }),
  warning: (msg: string, duration = 3500) => pushToast?.({ kind: 'warning', message: msg, duration }),
}

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    pushToast = (t) => {
      const id = counter++
      setItems((curr) => [...curr, { ...t, id }])
      if (t.duration && t.duration > 0) {
        setTimeout(() => {
          setItems((curr) => curr.map((x) => x.id === id ? { ...x, leaving: true } : x))
          setTimeout(() => setItems((curr) => curr.filter((x) => x.id !== id)), 260)
        }, t.duration)
      }
    }
    return () => { pushToast = null }
  }, [])

  const dismiss = useCallback((id: number) => {
    setItems((curr) => curr.map((x) => x.id === id ? { ...x, leaving: true } : x))
    setTimeout(() => setItems((curr) => curr.filter((x) => x.id !== id)), 260)
  }, [])

  if (typeof window === 'undefined') return null
  if (items.length === 0) return null

  return createPortal(
    <div className="codex-toast-stack" aria-live="polite" aria-atomic="false">
      {items.map((t) => (
        <div
          key={t.id}
          className={`codex-toast codex-toast-${t.kind} ${t.leaving ? 'is-leaving' : ''}`.trim()}
          role={t.kind === 'error' ? 'alert' : 'status'}
        >
          <span className="codex-toast-icon" aria-hidden="true">{KIND_ICON[t.kind]}</span>
          <span className="codex-toast-body">{t.message}</span>
          <button type="button" className="codex-toast-close" onClick={() => dismiss(t.id)} aria-label="Fermer">✕</button>
        </div>
      ))}
    </div>,
    document.body
  )
}
