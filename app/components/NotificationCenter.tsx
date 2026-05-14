'use client'

// ============================================================================
// Roadmap 10.4 — Centre de notifications
// ----------------------------------------------------------------------------
// Cloche flottante (coin haut-droit) avec pastille de non-lues + panneau
// déroulant. Lit la table `notifications` de l'utilisateur courant ; marque
// comme lu au clic. Les notifications sont créées par d'autres flux (ex.
// « un joueur a rejoint ton scénario ») via un simple insert dans la table.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Notif = {
  id: string
  type: string
  message: string
  lien: string
  lu: boolean
  created_at: string
}

const TYPE_EMOJI: Record<string, string> = {
  info: 'ℹ️',
  joueur: '🧑‍🤝‍🧑',
  commentaire: '💬',
  like: '❤️',
  combat: '⚔️'
}

export default function NotificationCenter() {
  const router = useRouter()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const charger = useCallback(async () => {
    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      return
    }
    if (!user) {
      setActif(false)
      return
    }
    setActif(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, message, lien, lu, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) {
      // Table absente (migration non appliquée) : on désactive proprement.
      console.warn('[notifications] fetch :', error.message)
      setActif(false)
      return
    }
    setNotifs((data ?? []) as Notif[])
  }, [])

  useEffect(() => {
    charger()
    const interval = setInterval(charger, 60000)
    return () => clearInterval(interval)
  }, [charger])

  // Fermeture au clic extérieur.
  useEffect(() => {
    if (!ouvert) return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOuvert(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [ouvert])

  const nonLues = notifs.filter((n) => !n.lu).length

  const marquerLu = async (n: Notif) => {
    if (!n.lu) {
      setNotifs((ns) =>
        ns.map((x) => (x.id === n.id ? { ...x, lu: true } : x))
      )
      await supabase.from('notifications').update({ lu: true }).eq('id', n.id)
    }
    if (n.lien) {
      setOuvert(false)
      router.push(n.lien)
    }
  }

  const toutMarquerLu = async () => {
    const ids = notifs.filter((n) => !n.lu).map((n) => n.id)
    if (ids.length === 0) return
    setNotifs((ns) => ns.map((x) => ({ ...x, lu: true })))
    await supabase.from('notifications').update({ lu: true }).in('id', ids)
  }

  const supprimer = async (id: string) => {
    setNotifs((ns) => ns.filter((x) => x.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  if (!actif) return null

  return (
    <div ref={panelRef} className="fixed top-3 right-3 z-[120]">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-full flex items-center justify-center bg-[#12141a]/90 border border-[rgba(201,168,76,0.3)] hover:border-[#C9A84C] backdrop-blur transition"
      >
        <span className="text-base">🔔</span>
        {nonLues > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: '#ef4444', color: '#fff' }}
          >
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div
          className="absolute top-11 right-0 w-80 max-h-[70vh] overflow-y-auto rounded-lg shadow-2xl"
          style={{
            background: '#12141a',
            border: '1px solid rgba(201,168,76,0.35)'
          }}
        >
          <div
            className="px-3 py-2 flex items-center justify-between border-b"
            style={{ borderColor: 'rgba(201,168,76,0.2)' }}
          >
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#C9A84C] font-bold">
              Notifications
            </span>
            {nonLues > 0 && (
              <button
                type="button"
                onClick={toutMarquerLu}
                className="text-[10px] text-gray-400 hover:text-gray-200"
              >
                Tout marquer lu
              </button>
            )}
          </div>
          {notifs.length === 0 ? (
            <p className="text-gray-500 text-xs italic p-4 text-center">
              Aucune notification.
            </p>
          ) : (
            <ul>
              {notifs.map((n) => (
                <li
                  key={n.id}
                  className="border-b last:border-b-0"
                  style={{ borderColor: 'rgba(201,168,76,0.1)' }}
                >
                  <div
                    className={`flex items-start gap-2 p-3 ${
                      n.lu ? 'opacity-60' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => marquerLu(n)}
                      className="flex items-start gap-2 flex-1 min-w-0 text-left"
                    >
                      <span className="flex-shrink-0">
                        {TYPE_EMOJI[n.type] ?? 'ℹ️'}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className={`block text-xs ${
                            n.lu ? 'text-gray-400' : 'text-gray-100 font-medium'
                          }`}
                        >
                          {n.message}
                        </span>
                        <span className="block text-[10px] text-gray-600 mt-0.5">
                          {new Date(n.created_at).toLocaleString('fr-FR')}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => supprimer(n.id)}
                      className="text-gray-600 hover:text-red-300 text-xs flex-shrink-0"
                      aria-label="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
