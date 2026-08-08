'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// /presentation/[sessionId] — REDIRECTION (Phase 5)
// ----------------------------------------------------------------------------
// Ancien écran joueurs public, alimenté par un snapshot dans
// `sessions_presentation`. Son équivalent en mode session est l'écran partagé
// /session/<id>/ecran, alimenté en direct par `session_state`.
//
// ⚠️ Différence assumée : l'écran de session demande d'être connecté (la RLS de
// game_sessions n'expose rien en anonyme), là où l'ancien lien public ne
// demandait rien. Un joueur qui veut suivre sur son téléphone passe désormais
// par /session/<id>/joueur.
// ============================================================================

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function PresentationPubliqueRedirect() {
  const params = useParams()
  const router = useRouter()
  const sessionId = typeof params?.sessionId === 'string' ? params.sessionId : ''

  useEffect(() => {
    router.replace(sessionId ? `/session/${sessionId}/ecran` : '/dashboard')
  }, [router, sessionId])

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: '#05060a' }}>
      <p className="text-stone-400 text-sm italic text-center">
        L’écran de diffusion est devenu l’écran de session. Redirection…
      </p>
    </main>
  )
}
