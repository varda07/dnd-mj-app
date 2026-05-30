'use client'

import type { ReactNode } from 'react'

/**
 * EmptyState — placeholder élégant pour une liste vide.
 * Utilise le style grimoire (bordure dashed dorée + gradient radial).
 */
export default function EmptyState({
  icon = '✨',
  title,
  message,
  action,
  className = ''
}: {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`codex-empty ${className}`.trim()}>
      <div className="codex-empty-icon" aria-hidden="true">{icon}</div>
      <div className="codex-empty-title">{title}</div>
      {message ? <div className="codex-empty-message">{message}</div> : null}
      {action ? <div className="codex-empty-cta">{action}</div> : null}
    </div>
  )
}
