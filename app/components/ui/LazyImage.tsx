'use client'

// ============================================================================
// Roadmap Affinement 3.3 — LazyImage avec skeleton placeholder
// ----------------------------------------------------------------------------
// Affiche un placeholder Skeleton tant que l'image n'est pas chargée,
// utilise `loading="lazy"` natif et `decoding="async"`.
// ============================================================================

import { useState, type CSSProperties, type ImgHTMLAttributes } from 'react'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> & {
  src: string
  alt: string
  /** Mettre eager pour les hero/logos critiques au LCP */
  priority?: boolean
  skeletonStyle?: CSSProperties
}

export default function LazyImage({ src, alt, priority, skeletonStyle, className = '', style, ...rest }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', ...style }} className={className}>
      {!loaded && !errored && (
        <span
          className="codex-skeleton"
          style={{
            position: 'absolute', inset: 0,
            borderRadius: 'inherit',
            ...skeletonStyle,
          }}
          aria-hidden="true"
        />
      )}
      {!errored && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.25s var(--codex-ease)',
            display: 'block',
          }}
          {...rest}
        />
      )}
      {errored && (
        <span style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.04)', color: 'rgba(232,232,236,0.4)',
          fontSize: 18,
        }} aria-hidden="true">⚠</span>
      )}
    </span>
  )
}
