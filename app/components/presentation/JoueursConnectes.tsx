'use client'

// ============================================================================
// Roadmap Modes 1.3 — Indicateur joueurs connectés à la diffusion
// ----------------------------------------------------------------------------
// Utilise Supabase Realtime presence. Le MJ rejoint le channel en mode
// "observe" (pas listé dans presence), les joueurs (route publique) trackent
// leur présence avec un pseudo (pris dans le profil ou "Invité").
//
// Au clic sur la pastille → liste des pseudos. Notif quand un joueur
// rejoint/quitte (toast).
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'

type PresenceUser = { name: string; joined: number }

export default function JoueursConnectes({ sessionId }: { sessionId: string }) {
  const [users, setUsers] = useState<PresenceUser[]>([])
  const [ouvert, setOuvert] = useState(false)
  const knownRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!sessionId) return
    const channel = supabase.channel(`presentation-presence:${sessionId}`, {
      config: { presence: { key: 'mj-observer' } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, Array<{ name?: string; joined?: number }>>
        const list: PresenceUser[] = []
        for (const [key, metas] of Object.entries(state)) {
          if (key === 'mj-observer') continue
          for (const meta of metas) {
            list.push({ name: meta.name ?? 'Invité', joined: meta.joined ?? Date.now() })
          }
        }
        setUsers(list)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === 'mj-observer') return
        for (const m of newPresences as Array<{ name?: string }>) {
          const n = m.name ?? 'Invité'
          if (!knownRef.current.has(key)) {
            knownRef.current.add(key)
            toast.info(`🟢 ${n} a rejoint la diffusion`)
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (key === 'mj-observer') return
        for (const m of leftPresences as Array<{ name?: string }>) {
          const n = m.name ?? 'Invité'
          knownRef.current.delete(key)
          toast.info(`⚪ ${n} a quitté la diffusion`)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Le MJ s'inscrit en observateur (sans nom pour ne pas se compter)
          await channel.track({ observer: true })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="px-2 py-0.5 rounded text-xs font-bold border bg-gray-900/50 border-gray-700 text-gray-100 hover:border-yellow-500/40 inline-flex items-center gap-1"
        title="Voir les joueurs connectés"
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${users.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
        {users.length} {users.length > 1 ? 'joueurs' : 'joueur'}
      </button>
      {ouvert && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[180px] z-50 rounded border border-yellow-500/30 bg-gray-900 p-2 shadow-lg"
          onMouseLeave={() => setOuvert(false)}
        >
          {users.length === 0 ? (
            <p className="text-xs text-gray-500 italic">Aucun joueur connecté.</p>
          ) : (
            <ul className="space-y-1">
              {users.map((u, i) => (
                <li key={`${u.name}-${i}`} className="text-xs text-gray-200 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                  {u.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </span>
  )
}
