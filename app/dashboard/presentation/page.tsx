'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// /dashboard/presentation — REDIRECTION (Phase 5)
// ----------------------------------------------------------------------------
// L'ancien mode présentation (diffusion par snapshot) est supprimé : le mode
// session le remplace intégralement. Cette route ne subsiste que pour renvoyer
// les anciens liens, favoris et raccourcis vers l'équivalent :
//
//   · une session ouverte pour moi   → /session/<id>/mj (ou /joueur)
//   · sinon                          → la liste des scénarios, d'où l'on lance
//                                       une session (« Lancer la session »)
//
// Le paramètre ?scenario=<id> est respecté : on cherche d'abord une session sur
// ce scénario précis.
// ============================================================================

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchSessionActive } from '@/app/lib/session-active'

export default function PresentationRedirect() {
  return (
    <Suspense fallback={<Ecran texte="Redirection…" />}>
      <RedirectInner />
    </Suspense>
  )
}

function RedirectInner() {
  const router = useRouter()
  const params = useSearchParams()
  const scenarioId = params?.get('scenario') ?? null
  const [aucune, setAucune] = useState(false)

  useEffect(() => {
    let annule = false
    const rediriger = async () => {
      const s = (await fetchSessionActive(scenarioId)) ?? (await fetchSessionActive())
      if (annule) return
      if (s) router.replace(s.href)
      else {
        setAucune(true)
        router.replace('/dashboard/scenarios')
      }
    }
    void rediriger()
    return () => {
      annule = true
    }
  }, [router, scenarioId])

  return (
    <Ecran
      texte={
        aucune
          ? 'Aucune session ouverte — direction tes scénarios pour en lancer une.'
          : 'Le mode diffusion est devenu le mode session. Redirection…'
      }
    />
  )
}

function Ecran({ texte }: { texte: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0e0b06' }}>
      <p className="text-stone-400 text-sm italic text-center">{texte}</p>
    </main>
  )
}
