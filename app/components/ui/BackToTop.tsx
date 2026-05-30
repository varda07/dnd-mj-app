'use client'

import { useEffect, useState } from 'react'

/**
 * BackToTop — bouton flottant qui apparaît après ~400px de scroll.
 * Met aussi à jour la variable CSS --codex-scroll-progress pour l'indicateur.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let rafId: number | null = null
    const update = () => {
      const y = window.scrollY
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const pct = Math.min(100, Math.max(0, (y / max) * 100))
      document.documentElement.style.setProperty('--codex-scroll-progress', pct + '%')
      setVisible(y > 400)
      rafId = null
    }
    const onScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      <div className="codex-scroll-indicator" aria-hidden="true" />
      <button
        type="button"
        className={`codex-back-to-top ${visible ? 'is-visible' : ''}`.trim()}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Retour en haut"
        title="Retour en haut"
      >
        ▲
      </button>
    </>
  )
}
