'use client'

// ============================================================================
// AdminAlert — V1 6.1
// ----------------------------------------------------------------------------
// À la connexion, UNIQUEMENT pour l'admin (profiles.is_admin), affiche une
// pastille discrète s'il y a des éléments à traiter :
//   - feedback au statut 'nouveau'
//   - signalements au statut 'nouveau'
// La pastille mène au hub admin. Refermable ; on ne la ré-affiche pas pour la
// même session (sessionStorage) afin de ne pas harceler à chaque navigation.
// La sécurité réelle reste la RLS serveur ; ceci est purement informatif.
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DISMISS_KEY = 'admin_alert_dismissed'

export default function AdminAlert() {
  const router = useRouter()
  const [feedbacks, setFeedbacks] = useState(0)
  const [signalements, setSignalements] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancel = false
    void (async () => {
      try {
        if (window.sessionStorage.getItem(DISMISS_KEY) === '1') return
      } catch {
        /* sessionStorage indisponible : on continue */
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancel) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()
      if (cancel || !profile?.is_admin) return

      const [fb, sg] = await Promise.all([
        supabase
          .from('feedback')
          .select('id', { count: 'exact', head: true })
          .eq('statut', 'nouveau'),
        supabase
          .from('signalements')
          .select('id', { count: 'exact', head: true })
          .eq('statut', 'nouveau')
      ])
      if (cancel) return
      const nbFb = fb.count ?? 0
      const nbSg = sg.count ?? 0
      setFeedbacks(nbFb)
      setSignalements(nbSg)
      if (nbFb + nbSg > 0) setVisible(true)
    })()
    return () => {
      cancel = true
    }
  }, [])

  const fermer = () => {
    setVisible(false)
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* noop */
    }
  }

  if (!visible) return null

  const parts: string[] = []
  if (feedbacks > 0) parts.push(`${feedbacks} feedback${feedbacks > 1 ? 's' : ''}`)
  if (signalements > 0)
    parts.push(`${signalements} signalement${signalements > 1 ? 's' : ''}`)

  return (
    <div
      role="status"
      className="fixed z-[120] top-3 left-1/2 -translate-x-1/2 max-w-[92vw] flex items-center gap-3 px-4 py-2.5 rounded-lg border border-[rgba(201,168,76,0.45)] bg-[#12141a]/95 shadow-2xl backdrop-blur"
      style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 18px rgba(201,168,76,0.18)' }}
    >
      <span className="text-lg" aria-hidden>🛡</span>
      <button
        type="button"
        onClick={() => {
          fermer()
          router.push('/dashboard/admin')
        }}
        className="text-sm text-[#e6c878] hover:text-white font-medium text-left"
      >
        À traiter : {parts.join(' · ')}
        <span className="ml-2 text-[11px] text-gray-400 underline">Ouvrir l&apos;admin →</span>
      </button>
      <button
        type="button"
        onClick={fermer}
        aria-label="Masquer"
        className="ml-1 text-gray-500 hover:text-white text-lg leading-none flex-shrink-0"
      >
        ✕
      </button>
    </div>
  )
}
