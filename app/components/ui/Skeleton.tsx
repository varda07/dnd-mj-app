'use client'

import type { CSSProperties } from 'react'

type SkeletonType = 'text' | 'line' | 'title' | 'card' | 'avatar' | 'thumb'

/**
 * Skeleton — placeholder pulsé doré pour les états de chargement.
 * Remplace les "Chargement..." textuels.
 */
export default function Skeleton({
  type = 'line',
  className = '',
  style,
  count = 1
}: {
  type?: SkeletonType
  className?: string
  style?: CSSProperties
  count?: number
}) {
  const cls = `codex-skeleton codex-skeleton-${type} ${className}`.trim()
  if (count === 1) return <span className={cls} style={style} aria-hidden="true" />
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={cls} style={style} aria-hidden="true" />
      ))}
    </>
  )
}

/**
 * SkeletonList — liste verticale de Skeletons espacés, pour remplacer
 * une liste de cartes en cours de chargement.
 */
export function SkeletonList({
  count = 3,
  type = 'card',
  gap = 12
}: {
  count?: number
  type?: SkeletonType
  gap?: number
}) {
  return (
    <div className="flex flex-col" style={{ gap }} role="status" aria-label="Chargement">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} type={type} />
      ))}
    </div>
  )
}
