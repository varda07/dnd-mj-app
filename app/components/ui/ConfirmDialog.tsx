'use client'

import { useEffect, useState, useCallback, type ReactNode } from 'react'
import Modal from './Modal'

type ConfirmOptions = {
  title?: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type Resolver = (ok: boolean) => void

let pushDialog: ((opts: ConfirmOptions, resolve: Resolver) => void) | null = null

/**
 * confirm({ title, message, confirmLabel, destructive }) — promise based.
 * Affiche une modale de confirmation élégante. Résout `true` si confirmé,
 * `false` sinon. Le ConfirmDialogHost doit être monté quelque part dans l'app.
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (!pushDialog) {
    // Fallback si le host n'est pas monté
    return Promise.resolve(typeof window !== 'undefined'
      ? window.confirm(typeof opts.message === 'string' ? opts.message : opts.title ?? 'Confirmer ?')
      : false)
  }
  return new Promise<boolean>((resolve) => {
    pushDialog!(opts, resolve)
  })
}

/**
 * Host à monter une fois dans le layout pour activer confirmDialog().
 */
export default function ConfirmDialogHost() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const [resolver, setResolver] = useState<Resolver | null>(null)

  useEffect(() => {
    pushDialog = (o, r) => { setOpts(o); setResolver(() => r) }
    return () => { pushDialog = null }
  }, [])

  const close = useCallback((ok: boolean) => {
    if (resolver) resolver(ok)
    setOpts(null); setResolver(null)
  }, [resolver])

  if (!opts) return null

  return (
    <Modal
      open
      onClose={() => close(false)}
      title={opts.title ?? 'Confirmer'}
      size="sm"
      footer={
        <>
          <button type="button" className="codex-btn-press codex-focus-ring"
            onClick={() => close(false)}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(232,232,236,0.7)',
              fontSize: 13,
              cursor: 'pointer'
            }}>
            {opts.cancelLabel ?? 'Annuler'}
          </button>
          <button type="button" className="codex-btn-press codex-focus-ring"
            onClick={() => close(true)}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              background: opts.destructive
                ? 'linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)'
                : 'linear-gradient(180deg, #C9A84C 0%, #8d7a2d 100%)',
              border: '1px solid ' + (opts.destructive ? 'rgba(248,113,113,0.4)' : 'rgba(201,168,76,0.4)'),
              color: opts.destructive ? '#fee2e2' : '#0a0c10',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer'
            }}>
            {opts.destructive ? '🗑 ' : ''}{opts.confirmLabel ?? 'Confirmer'}
          </button>
        </>
      }
    >
      <div style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(232,232,236,0.85)' }}>
        {opts.message}
      </div>
    </Modal>
  )
}
