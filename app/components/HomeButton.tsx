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
      className="fixed top-2 left-2 z-[75] h-9 px-3 flex items-center gap-1.5 rounded-md bg-[#12141a]/95 border border-[rgba(201,168,76,0.30)] text-[#C9A84C] hover:bg-[#1a1d24] hover:border-[#C9A84C] active:scale-95 transition-all duration-150 text-xs font-bold uppercase tracking-wider shadow-md backdrop-blur-sm"
      style={{ fontFamily: 'Georgia, serif' }}
    >
      <span aria-hidden="true" className="text-base leading-none">🏠</span>
      <span className="hidden sm:inline">Accueil</span>
    </button>
  )
}
