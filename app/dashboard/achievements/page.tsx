'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap 8.5 — Achievements de campagne
// ----------------------------------------------------------------------------
// Affiche le catalogue d'achievements (table `achievements`) et l'état de
// déblocage de l'utilisateur (table `user_achievements`). Le déblocage
// automatique (hooks dans les flux de jeu) reste à câbler — la page propose
// en attendant un marquage manuel.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Achievement = {
  code: string
  titre: string
  description: string
  emoji: string
  ordre: number
}

export default function AchievementsPage() {
  const router = useRouter()
  const [catalogue, setCatalogue] = useState<Achievement[]>([])
  const [debloques, setDebloques] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const charger = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }
    setUserId(user.id)
    const { data: cat } = await supabase
      .from('achievements')
      .select('*')
      .order('ordre')
    setCatalogue((cat ?? []) as Achievement[])
    const { data: ua } = await supabase
      .from('user_achievements')
      .select('achievement_code')
      .eq('user_id', user.id)
    setDebloques(new Set((ua ?? []).map((r) => r.achievement_code as string)))
    setLoading(false)
  }, [router])

  useEffect(() => {
    charger()
  }, [charger])

  const toggler = async (code: string) => {
    if (!userId) return
    if (debloques.has(code)) {
      setDebloques((s) => {
        const n = new Set(s)
        n.delete(code)
        return n
      })
      await supabase
        .from('user_achievements')
        .delete()
        .eq('user_id', userId)
        .eq('achievement_code', code)
    } else {
      setDebloques((s) => new Set(s).add(code))
      await supabase
        .from('user_achievements')
        .insert({ user_id: userId, achievement_code: code })
    }
  }

  const nbDebloques = debloques.size

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">🏆 Achievements</h1>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          {loading
            ? 'Chargement…'
            : `${nbDebloques} / ${catalogue.length} débloqué${
                nbDebloques > 1 ? 's' : ''
              }`}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {catalogue.map((a) => {
            const ok = debloques.has(a.code)
            return (
              <button
                key={a.code}
                type="button"
                onClick={() => toggler(a.code)}
                title={
                  ok
                    ? 'Marquer comme non débloqué'
                    : 'Marquer comme débloqué'
                }
                className={`text-left rounded-lg p-4 border transition ${
                  ok
                    ? 'bg-yellow-500/10 border-yellow-500'
                    : 'bg-gray-800 border-gray-700 opacity-60 hover:opacity-90'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`text-3xl flex-shrink-0 ${
                      ok ? '' : 'grayscale'
                    }`}
                  >
                    {a.emoji}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`font-bold ${
                        ok ? 'text-yellow-300' : 'text-gray-300'
                      }`}
                    >
                      {a.titre}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.description}
                    </p>
                    {ok && (
                      <p className="text-[10px] text-emerald-400 mt-1 uppercase tracking-wider">
                        ✓ Débloqué
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {!loading && catalogue.length === 0 && (
          <p className="text-gray-500 text-sm italic">
            Catalogue d&apos;achievements vide — appliquez la migration Phase 8.
          </p>
        )}

        <p className="text-[11px] text-gray-600 italic mt-6">
          Le déblocage automatique (au fil des combats, niveaux, sessions…) sera
          branché progressivement. En attendant, cliquez sur un achievement pour
          basculer son état manuellement.
        </p>
      </div>
    </main>
  )
}
