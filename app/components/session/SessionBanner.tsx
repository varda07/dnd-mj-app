'use client'

// ============================================================================
// SessionBanner — bandeau « Une session t'attend » (Phase 2.2)
// ----------------------------------------------------------------------------
// Bandeau persistant en haut de l'accueil : « 🎲 [MJ] a lancé [Scénario] —
// Rejoindre ». Un seul clic → /session/[id]/rejoindre. Apparaît en TEMPS RÉEL
// (Realtime sur game_sessions) sans rafraîchir la page. Disparaît si la session
// est terminée ou déjà rejointe (bouton « Reprendre » si en cours).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type SessionARejoindre = {
  session_id: string
  scenario_id: string
  title: string | null
  status: 'lobby' | 'active' | 'paused' | 'ended'
  scenario_nom: string
  mj_nom: string
  deja_rejoint: boolean
}

export default function SessionBanner() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionARejoindre[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [masquees, setMasquees] = useState<Set<string>>(new Set())

  const charger = useCallback(async () => {
    const { data, error } = await supabase.rpc('sessions_a_rejoindre')
    if (error || !data) return
    setSessions(data as SessionARejoindre[])
  }, [])

  useEffect(() => {
    let cancel = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancel) return
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) void charger()
    })
    return () => {
      cancel = true
    }
  }, [charger])

  // Realtime : une session lancée / mise à jour apparaît sans rafraîchir.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`session-banner:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions' },
        () => void charger()
      )
      .subscribe()
    const interval = setInterval(() => void charger(), 5 * 60 * 1000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [userId, charger])

  const visibles = sessions.filter(
    (s) => s.status !== 'ended' && !masquees.has(s.session_id)
  )
  if (visibles.length === 0) return null

  return (
    <div className="px-2 sm:px-3 md:px-4 pt-2 space-y-2">
      {visibles.map((s) => {
        const enCours = s.deja_rejoint || s.status === 'active' || s.status === 'paused'
        return (
          <div
            key={s.session_id}
            className="flex items-center gap-3 rounded-xl border px-3 py-2.5 shadow-lg"
            style={{
              background:
                'linear-gradient(120deg, rgba(201,168,76,0.16) 0%, rgba(30,22,8,0.85) 60%)',
              borderColor: 'rgba(201,168,76,0.5)'
            }}
          >
            <span className="text-2xl flex-shrink-0">🎲</span>
            <div className="flex-1 min-w-0">
              <p className="text-yellow-100 font-bold text-sm truncate">
                {s.mj_nom} a lancé{' '}
                <span className="text-[#C9A84C]">« {s.scenario_nom} »</span>
              </p>
              <p className="text-stone-400 text-xs truncate">
                {s.title || 'Session de jeu'}
                {s.status === 'lobby'
                  ? ' — Salle d’attente ouverte'
                  : s.status === 'paused'
                  ? ' — En pause'
                  : ' — Partie en cours'}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  s.deja_rejoint
                    ? `/session/${s.session_id}/joueur`
                    : `/session/${s.session_id}/rejoindre`
                )
              }
              className="flex-shrink-0 px-4 py-2 rounded-lg font-bold text-gray-900 bg-[#C9A84C] hover:brightness-110 transition text-sm"
            >
              {enCours ? '▶ Reprendre' : '➜ Rejoindre'}
            </button>
            <button
              type="button"
              onClick={() =>
                setMasquees((m) => new Set(m).add(s.session_id))
              }
              className="flex-shrink-0 text-stone-500 hover:text-stone-300 text-sm"
              aria-label="Masquer"
              title="Masquer"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
