'use client'

import { useRouter, usePathname } from 'next/navigation'

// Bouton "🏠 Accueil" universel — toujours visible (sauf sur /dashboard
// directement) pour permettre un retour rapide depuis n'importe quelle page.
// Roadmap Post-Test 1.6.
export default function HomeButton() {
  const router = useRouter()
  const pathname = usePathname() ?? ''

  // On masque le bouton sur le dashboard lui-même (pas besoin d'un raccourci
  // vers la page courante).
  if (pathname === '/dashboard' || pathname === '/') return null

  return (
    <button
      type="button"
      onClick={() => router.push('/dashboard')}
      aria-label="Retour à l'accueil"
      title="Retour à l'accueil"
      // Roadmap UI — Accueil en haut à gauche, première position. Discret :
      // fond sombre semi-transparent, bordure dorée subtile qui s'éclaircit
      // au hover. Marges 16px / 16px.
      className="fixed top-4 left-4 z-[75] h-9 w-9 flex items-center justify-center rounded-full bg-[#12141a]/70 border border-[rgba(201,168,76,0.20)] text-[#C9A84C]/80 hover:text-[#C9A84C] hover:bg-[#12141a]/95 hover:border-[#C9A84C] active:scale-95 transition-all duration-150 backdrop-blur-sm"
    >
      <span aria-hidden="true" className="text-base leading-none">🏠</span>
    </button>
  )
}
