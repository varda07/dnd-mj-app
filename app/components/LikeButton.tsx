'use client'

// ============================================================================
// Roadmap 9.2 — Système de likes
// ----------------------------------------------------------------------------
// Bouton ❤️ réutilisable pour n'importe quelle entité partagée. Affiche le
// compteur, l'état liké/non-liké de l'utilisateur courant, et bascule au clic.
// Table : likes (cf. migration 20260515050000_roadmap_phase9).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LikeButton({
  entiteType,
  entiteId
}: {
  entiteType: string
  entiteId: string
}) {
  const [count, setCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actif, setActif] = useState(true)

  const charger = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    const { count: c, error } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('entite_type', entiteType)
      .eq('entite_id', entiteId)
    if (error) {
      // Table absente (migration non appliquée) : on masque proprement.
      setActif(false)
      return
    }
    setCount(c ?? 0)

    if (user) {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('entite_type', entiteType)
        .eq('entite_id', entiteId)
        .eq('user_id', user.id)
        .maybeSingle()
      setLiked(!!data)
    }
  }, [entiteType, entiteId])

  useEffect(() => {
    charger()
  }, [charger])

  const toggle = async () => {
    if (!userId || busy) return
    setBusy(true)
    if (liked) {
      setLiked(false)
      setCount((c) => Math.max(0, c - 1))
      await supabase
        .from('likes')
        .delete()
        .eq('entite_type', entiteType)
        .eq('entite_id', entiteId)
        .eq('user_id', userId)
    } else {
      setLiked(true)
      setCount((c) => c + 1)
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: userId, entite_type: entiteType, entite_id: entiteId })
      if (error) {
        // Rollback optimiste si l'insert échoue (ex. doublon).
        setLiked(false)
        setCount((c) => Math.max(0, c - 1))
      }
    }
    setBusy(false)
  }

  if (!actif) return null

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!userId || busy}
      title={
        !userId
          ? 'Connecte-toi pour aimer'
          : liked
          ? 'Retirer ton like'
          : 'Aimer'
      }
      className={`inline-flex items-center gap-1 text-[11px] transition ${
        liked ? 'text-red-400' : 'text-gray-500 hover:text-red-300'
      } disabled:opacity-60`}
    >
      <span>{liked ? '❤️' : '🤍'}</span>
      <span>{count}</span>
    </button>
  )
}
