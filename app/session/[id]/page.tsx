'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// /session/[id] — aiguillage
// ----------------------------------------------------------------------------
// Redirige vers le poste de travail adapté : le MJ vers /mj, le joueur vers
// /joueur. Un non-membre est renvoyé vers la page « rejoindre ».
// ============================================================================

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchSession } from '@/app/lib/session'

export default function SessionDispatcher() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? '')

  useEffect(() => {
    let annule = false
    const go = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        try {
          localStorage.setItem('pending_return_url', `/session/${id}`)
        } catch {}
        router.replace('/')
        return
      }
      const session = await fetchSession(id)
      if (annule) return
      if (!session) {
        router.replace(`/session/${id}/rejoindre`)
        return
      }
      if (session.mj_user_id === user.id) router.replace(`/session/${id}/mj`)
      else router.replace(`/session/${id}/joueur`)
    }
    void go()
    return () => {
      annule = true
    }
  }, [id, router])

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0e0b06' }}
    >
      <p className="text-stone-400 text-sm italic">Ouverture de la session…</p>
    </main>
  )
}
