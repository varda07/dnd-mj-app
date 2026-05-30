'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * PageTransition — fade-in court (200-300ms) à chaque changement de route.
 * Respecte prefers-reduced-motion : pas d'animation.
 * Le contenu reste toujours visible (pas d'unmount).
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [key, setKey] = useState(pathname)
  const prev = useRef(pathname)

  useEffect(() => {
    if (prev.current !== pathname) {
      prev.current = pathname
      setKey(pathname)
    }
  }, [pathname])

  return (
    <div key={key} className="codex-page-transition">
      {children}
    </div>
  )
}
