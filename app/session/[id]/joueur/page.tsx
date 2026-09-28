'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// /session/[id]/joueur — Lobby & poste de travail Joueur (Phase 2.4)
// ----------------------------------------------------------------------------
// Phase 2 : sélection de son personnage, aperçu de fiche, bouton « Je suis
// prêt », message d'attente. Reconnexion : si la session est déjà `active`, on
// n'affiche pas la salle d'attente — le joueur est directement « en partie »
// (le poste de jeu complet — la roue du personnage — s'affiche directement).
// Mobile-first.
// ============================================================================

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Spinner from '@/app/components/Spinner'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  fetchSession,
  fetchParticipants,
  joinSession,
  updateSelfParticipant,
  type GameSession,
  type SessionParticipant
} from '@/app/lib/session'
import SessionJoueur from '@/app/components/session/joueur/SessionJoueur'
import { ouvrirCanal, useSessionPresence } from '@/app/lib/session-realtime'

type Perso = {
  id: string
  nom: string
  classe: string | null
  niveau: number | null
  image_url: string | null
  hp_actuel: number | null
  hp_max: number | null
  ca: number | null
}

export default function LobbyJoueurPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? '')

  const [userId, setUserId] = useState<string | null>(null)
  const [session, setSession] = useState<GameSession | null>(null)
  const [scenarioNom, setScenarioNom] = useState('')
  const [persos, setPersos] = useState<Perso[]>([])
  const [monPerso, setMonPerso] = useState<string | null>(null)
  const [pret, setPret] = useState(false)
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [phase, setPhase] = useState<'loading' | 'ok' | 'refuse'>('loading')
  const [busy, setBusy] = useState(false)
  const initDone = useRef(false)

  // Présence : canal unique et partagé pour toute la session (cf. session-realtime).
  const enLigne = useSessionPresence(id, phase === 'ok' ? userId : null, 'joueur')

  const rafraichirParticipants = useCallback(async () => {
    setParticipants(await fetchParticipants(id))
  }, [id])

  useEffect(() => {
    let annule = false
    const init = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        try {
          localStorage.setItem('pending_return_url', `/session/${id}/joueur`)
        } catch {}
        router.replace('/')
        return
      }
      setUserId(user.id)

      const sess = await fetchSession(id)
      if (annule) return
      if (!sess) {
        router.replace(`/session/${id}/rejoindre`)
        return
      }
      if (sess.status === 'ended') {
        setPhase('refuse')
        return
      }
      setSession(sess)

      // join_session idempotent : crée/réactive le participant (reconnexion).
      const res = await joinSession(id)
      if (!res.ok) {
        // Pas encore membre → page de jonction.
        router.replace(`/session/${id}/rejoindre`)
        return
      }

      const { data: scn } = await supabase
        .from('scenarios')
        .select('nom')
        .eq('id', sess.scenario_id)
        .maybeSingle()
      if (!annule) setScenarioNom((scn?.nom as string) ?? '')

      const { data: mesPersos } = await supabase
        .from('personnages')
        .select('id, nom, classe, niveau, image_url, hp_actuel, hp_max, ca, scenario_id')
        .eq('joueur_id', user.id)
      const liste = ((mesPersos ?? []) as Array<Perso & { scenario_id: string | null }>).filter(
        (p) => p.scenario_id === sess.scenario_id || p.scenario_id === null
      )
      if (!annule) setPersos(liste)

      // État participant courant.
      const parts = await fetchParticipants(id)
      if (!annule) setParticipants(parts)
      const moi = parts.find((p) => p.user_id === user.id)
      if (!annule) {
        setMonPerso(moi?.character_id ?? (liste.length === 1 ? liste[0].id : null))
        setPret(moi?.is_ready ?? false)
        setPhase('ok')
      }
    }
    if (!initDone.current) {
      initDone.current = true
      void init()
    }
    return () => {
      annule = true
    }
  }, [id, router])

  // Realtime : statut de session (démarrage/pause/fin) + participants.
  useEffect(() => {
    if (phase !== 'ok') return
    return ouvrirCanal(`session-joueur:${id}`, (c) =>
      c
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${id}` },
          (payload) => {
            const next = payload.new as GameSession
            setSession((s) => (s ? { ...s, ...next } : s))
            if (next.status === 'ended') router.replace('/dashboard')
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${id}` },
          () => void rafraichirParticipants()
        )
    )
  }, [id, phase, router, rafraichirParticipants])

  const choisirPerso = async (pid: string) => {
    setBusy(true)
    setMonPerso(pid)
    await joinSession(id, pid) // upsert character_id + hydrate l'état vivant
    await rafraichirParticipants()
    setBusy(false)
  }

  const togglePret = async () => {
    if (!userId) return
    const next = !pret
    setPret(next)
    await updateSelfParticipant(id, userId, { is_ready: next })
  }

  if (phase === 'loading') {
    return (
      <Shell>
        <Spinner size="lg" label="Connexion à la session…" />
      </Shell>
    )
  }
  if (phase === 'refuse') {
    return (
      <Shell>
        <p className="text-gray-300 text-sm text-center">
          Cette session est terminée.
        </p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-4 px-4 py-2 rounded-lg font-bold border border-gray-600 text-yellow-200"
        >
          Retour à l&apos;accueil
        </button>
      </Shell>
    )
  }

  const persoActif = persos.find((p) => p.id === monPerso) ?? null
  const enPartie = session?.status === 'active' || session?.status === 'paused'
  const autres = participants.filter((p) => p.user_id !== userId)

  // Partie lancée → poste de travail joueur complet (Phase 3). Reconnexion :
  // on n'affiche jamais la salle d'attente si la session est déjà active.
  if (enPartie && session) {
    return (
      <SessionJoueur
        sessionId={id}
        scenarioId={session.scenario_id}
        characterId={monPerso}
      />
    )
  }

  return (
    <Shell>
      <div className="w-full max-w-md">
        <header className="text-center mb-5">
          <p className="text-gray-500 text-xs uppercase tracking-[0.25em]">
            {enPartie ? 'En partie' : "Salle d'attente"}
          </p>
          <h1 className="grim-title text-xl mt-1">
            {session?.title || scenarioNom || 'Session'}
          </h1>
          {scenarioNom && session?.title ? (
            <p className="text-gray-400 text-sm">{scenarioNom}</p>
          ) : null}
        </header>

        {/* Sélection du personnage */}
        <div
          className="rounded-2xl border border-gray-700 bg-gray-800 p-4 mb-4"
        >
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">
            Ton personnage
          </p>
          {persos.length === 0 ? (
            <div className="text-center py-2">
              <p className="text-gray-500 text-sm italic mb-2">
                Tu n&apos;as pas encore de personnage pour ce scénario.
              </p>
              <button
                type="button"
                onClick={() => router.push('/dashboard/personnages')}
                className="text-xs text-yellow-500 hover:text-yellow-300 underline"
              >
                ➕ Créer un personnage
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {persos.map((p) => {
                const sel = monPerso === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy || enPartie}
                    onClick={() => choisirPerso(p.id)}
                    className={`grim-card grim-card-hover w-full flex items-center gap-3 px-3 py-2 text-left disabled:opacity-70 ${
                      sel ? 'is-active' : ''
                    }`}
                  >
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt={p.nom}
                        className="w-11 h-11 rounded-full object-cover ring-1 ring-yellow-500"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gray-700 flex items-center justify-center text-yellow-500 font-bold">
                        {p.nom.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-yellow-100 font-bold text-sm truncate">{p.nom}</p>
                      <p className="text-gray-400 text-xs">
                        {[p.classe, p.niveau ? `Niv. ${p.niveau}` : null]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </div>
                    {sel && <span className="text-yellow-500 text-lg">✓</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Aperçu de fiche */}
        {persoActif && (
          <div
            className="rounded-2xl border p-4 mb-4 grid grid-cols-3 gap-2 text-center"
            style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'color-mix(in srgb, var(--theme-accent, #C9A84C) 20%, transparent)' }}
          >
            <Stat label="PV" value={`${persoActif.hp_actuel ?? '—'} / ${persoActif.hp_max ?? '—'}`} />
            <Stat label="CA" value={persoActif.ca ?? '—'} />
            <Stat label="Niveau" value={persoActif.niveau ?? '—'} />
          </div>
        )}

        {/* Actions selon le statut */}
        {enPartie ? (
          <div
            className="rounded-2xl border p-4 text-center"
            style={{ borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)' }}
          >
            <p className="text-green-300 font-bold">🟢 La partie a commencé</p>
            <p className="text-gray-400 text-xs mt-1">
              Ton poste de jeu s’ouvre : la roue du personnage arrive.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={togglePret}
            disabled={busy}
            className={`w-full py-3 rounded-lg font-bold transition disabled:opacity-60 ${
              pret
                ? 'bg-green-600 text-white hover:brightness-110'
                : 'bg-yellow-500 text-gray-900 hover:brightness-110'
            }`}
          >
            {pret ? '✓ Je suis prêt·e' : 'Je suis prêt·e'}
          </button>
        )}

        {!enPartie && (
          <p className="text-center text-gray-500 text-xs mt-3 italic">
            En attente du MJ pour démarrer la partie…
          </p>
        )}

        {/* Autres joueurs connectés */}
        {autres.length > 0 && (
          <div className="mt-4">
            <p className="text-gray-500 text-[11px] uppercase tracking-widest mb-1 text-center">
              À la table
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {autres.map((p) => (
                <span
                  key={p.user_id}
                  className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border"
                  style={{ borderColor: 'color-mix(in srgb, var(--theme-accent, #C9A84C) 20%, transparent)', background: 'rgba(0,0,0,0.25)' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: enLigne.has(p.user_id) ? '#22c55e' : '#57534e' }}
                  />
                  {p.is_ready ? '✓' : '•'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-gray-500 text-[10px] uppercase tracking-widest">{label}</p>
      <p className="text-yellow-100 font-bold text-sm mt-0.5">{value}</p>
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900">
      {children}
    </main>
  )
}
