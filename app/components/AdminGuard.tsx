'use client'

// ============================================================================
// ROADMAP V1 — Phase 3.8 : garde d'accès admin réutilisable
// ----------------------------------------------------------------------------
// Vérifie profiles.is_admin avant d'afficher une page admin. PUREMENT UX : la
// vraie barrière reste la RLS serveur (est_admin()). Affiche un état de
// chargement, un message « accès refusé », ou les enfants si autorisé.
// ============================================================================

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminGuard({
  titre,
  children
}: {
  titre: string
  children: ReactNode
}) {
  const router = useRouter()
  const [autorise, setAutorise] = useState<boolean | null>(null)

  useEffect(() => {
    let cancel = false
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()
      if (!cancel) setAutorise(!!data?.is_admin)
    })()
    return () => { cancel = true }
  }, [router])

  if (autorise === null) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400 text-sm">Vérification des droits…</p>
      </main>
    )
  }

  if (!autorise) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">⛔ Accès réservé aux administrateurs.</p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
        >
          Retour au dashboard
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/dashboard/admin')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Administration
          </button>
          <h1 className="text-2xl grim-title">{titre}</h1>
        </div>
        {children}
      </div>
    </main>
  )
}
