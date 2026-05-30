'use client'

// ============================================================================
// Roadmap Affinement 2.15 — Bouton "Suivre" sur un profil public.
// ============================================================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'

export default function FollowButton({ targetUserId }: { targetUserId: string }) {
  const [me, setMe] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancel = false
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancel) return
      setMe(user?.id ?? null)
      if (user?.id && user.id !== targetUserId) {
        const { data } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .maybeSingle()
        if (!cancel) setFollowing(!!data)
      }
    })()
    return () => { cancel = true }
  }, [targetUserId])

  if (!me || me === targetUserId) return null

  const toggle = async () => {
    setLoading(true)
    if (following) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', me)
        .eq('following_id', targetUserId)
      if (error) toast.error(error.message)
      else { setFollowing(false); toast.info('Tu ne suis plus cet utilisateur.') }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: me, following_id: targetUserId })
      if (error) toast.error(error.message)
      else { setFollowing(true); toast.success('Utilisateur suivi !') }
    }
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`px-3 py-1.5 rounded text-xs font-bold border codex-btn-press ${
        following
          ? 'bg-gray-800 border-yellow-500/40 text-yellow-300 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-300'
          : 'bg-yellow-500 border-yellow-400 text-gray-900 hover:bg-yellow-400'
      } disabled:opacity-40`}
      title={following ? 'Cliquer pour ne plus suivre' : 'Suivre cet utilisateur'}
    >
      {following ? '✓ Suivi' : '+ Suivre'}
    </button>
  )
}
