'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// /session/[id]/rejoindre — lien de secours + jonction (Phase 2.3)
// ----------------------------------------------------------------------------
// - Comptes obligatoires : non connecté → mémorise l'URL et renvoie vers login,
//   retour automatique ici après authentification (cf. app/page.tsx).
// - Membre du scénario : choix du personnage lié → join_session → /joueur.
// - Aucun PJ lié / non membre : proposer un code d'invitation OU la création
//   d'un personnage. Jamais de cul-de-sac.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchSession, joinSession, type GameSession } from '@/app/lib/session'

type Perso = {
  id: string
  nom: string
  classe: string | null
  niveau: number | null
  image_url: string | null
  scenario_id: string | null
}

type Phase = 'loading' | 'auth' | 'ready' | 'code' | 'error' | 'done'

export default function RejoindreSessionPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? '')

  const [phase, setPhase] = useState<Phase>('loading')
  const [erreur, setErreur] = useState('')
  const [session, setSession] = useState<GameSession | null>(null)
  const [scenarioNom, setScenarioNom] = useState('')
  const [persos, setPersos] = useState<Perso[]>([])
  const [choixPjId, setChoixPjId] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [code, setCode] = useState('')

  const chargerContexte = useCallback(
    async (userId: string) => {
      const sess = await fetchSession(id)
      if (!sess) {
        // Session illisible : soit inexistante, soit l'utilisateur n'est pas
        // encore membre du scénario. On propose la saisie d'un code.
        setPhase('code')
        return
      }
      setSession(sess)
      if (sess.status === 'ended') {
        setErreur('Cette session est terminée.')
        setPhase('error')
        return
      }
      // Le MJ n'a rien à « rejoindre » : direct au cockpit.
      if (sess.mj_user_id === userId) {
        router.replace(`/session/${id}/mj`)
        return
      }
      const { data: scn } = await supabase
        .from('scenarios')
        .select('nom')
        .eq('id', sess.scenario_id)
        .maybeSingle()
      setScenarioNom((scn?.nom as string) ?? '')

      const { data: mesPersos } = await supabase
        .from('personnages')
        .select('id, nom, classe, niveau, image_url, scenario_id')
        .eq('joueur_id', userId)
        .order('created_at', { ascending: false })
      const liste = (mesPersos ?? []) as Perso[]
      setPersos(liste)
      // Présélectionne un perso déjà rattaché à ce scénario, si unique.
      const duScenario = liste.filter((p) => p.scenario_id === sess.scenario_id)
      if (duScenario.length === 1) setChoixPjId(duScenario[0].id)
      setPhase('ready')
    },
    [id, router]
  )

  useEffect(() => {
    let annule = false
    const init = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        try {
          localStorage.setItem('pending_return_url', `/session/${id}/rejoindre`)
        } catch {}
        if (!annule) setPhase('auth')
        return
      }
      if (!annule) await chargerContexte(user.id)
    }
    void init()
    return () => {
      annule = true
    }
  }, [id, chargerContexte])

  const rejoindre = async () => {
    setEnCours(true)
    setErreur('')
    const res = await joinSession(id, choixPjId)
    if (!res.ok) {
      setErreur(messageErreur(res.error))
      setEnCours(false)
      return
    }
    setPhase('done')
    setTimeout(() => router.replace(`/session/${id}/joueur`), 900)
  }

  // Saisie d'un code d'invitation de scénario (non membre).
  const validerCode = async () => {
    setEnCours(true)
    setErreur('')
    const { data, error } = await supabase.rpc('rejoindre_scenario_via_code', {
      p_code: code.trim().toUpperCase(),
      p_personnage_id: null
    })
    const r = data as { ok: boolean; error?: string } | null
    if (error || !r?.ok) {
      setErreur(messageErreur(r?.error) || "Code d'invitation invalide.")
      setEnCours(false)
      return
    }
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (user) await chargerContexte(user.id)
    setEnCours(false)
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0e0b06' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{
          background:
            'linear-gradient(160deg, rgba(30,22,8,0.95) 0%, rgba(14,11,6,0.98) 100%)',
          borderColor: 'rgba(201,168,76,0.35)'
        }}
      >
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🎲</div>
          <h1
            className="text-2xl font-bold"
            style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}
          >
            Rejoindre la session
          </h1>
        </div>

        {phase === 'loading' && (
          <p className="text-center text-stone-400 text-sm italic py-8">
            Chargement…
          </p>
        )}

        {phase === 'auth' && (
          <div className="space-y-4 text-center">
            <p className="text-stone-300 text-sm">
              Connecte-toi ou crée un compte pour rejoindre la partie — tu
              reviendras directement ici.
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-lg font-bold text-gray-900"
              style={{ background: '#C9A84C' }}
            >
              Se connecter / Créer un compte
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-4 text-center">
            <p className="text-red-300 text-sm">{erreur}</p>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full py-2.5 rounded-lg font-bold border border-yellow-700/50 text-yellow-200"
            >
              Retour au tableau de bord
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-3 text-center py-4">
            <div className="text-4xl">✅</div>
            <p className="text-yellow-100 font-bold">Tu rejoins la partie…</p>
          </div>
        )}

        {phase === 'code' && (
          <div className="space-y-4">
            <p className="text-center text-stone-300 text-sm">
              Tu n&apos;es pas encore inscrit·e à ce scénario. Saisis le code
              d&apos;invitation transmis par ton MJ.
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              className="w-full text-center tracking-[0.3em] font-mono font-bold text-lg rounded-lg bg-black/40 border border-stone-700 focus:border-amber-500 px-3 py-3 text-yellow-200 outline-none"
            />
            {erreur && <p className="text-red-300 text-sm text-center">{erreur}</p>}
            <button
              type="button"
              onClick={validerCode}
              disabled={enCours || code.trim().length === 0}
              className="w-full py-3 rounded-lg font-bold text-gray-900 disabled:opacity-60"
              style={{ background: '#C9A84C' }}
            >
              {enCours ? 'Vérification…' : "Valider le code"}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/personnages')}
              className="w-full text-xs text-yellow-400/80 hover:text-yellow-300 underline"
            >
              ➕ Créer un personnage
            </button>
          </div>
        )}

        {phase === 'ready' && (
          <div className="space-y-4">
            <p className="text-center text-stone-300 text-sm">
              Rejoindre{' '}
              <span className="text-yellow-200 font-bold">
                {scenarioNom ? `« ${scenarioNom} »` : 'la partie'}
              </span>
              {session?.title ? (
                <span className="block text-stone-500 text-xs mt-0.5">
                  {session.title}
                </span>
              ) : null}
            </p>

            <div>
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-2">
                Ton personnage
              </p>
              {persos.length === 0 ? (
                <p className="text-stone-500 text-sm italic">
                  Tu n&apos;as pas encore de personnage. Tu peux rejoindre maintenant
                  et en créer un ensuite.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {persos.map((p) => {
                    const selected = choixPjId === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setChoixPjId(selected ? null : p.id)}
                        className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${
                          selected
                            ? 'border-amber-400 bg-amber-900/30'
                            : 'border-stone-700 hover:border-amber-700/60 bg-stone-900/40'
                        }`}
                      >
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt={p.nom}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-yellow-700/50"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-yellow-500 font-bold">
                            {p.nom.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-yellow-100 font-bold text-sm truncate">
                            {p.nom}
                          </p>
                          <p className="text-stone-400 text-xs">
                            {[p.classe, p.niveau ? `Niv. ${p.niveau}` : null]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </p>
                        </div>
                        {selected && <span className="text-amber-400 text-lg">✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={() => router.push('/dashboard/personnages')}
                className="mt-2 text-xs text-yellow-400/80 hover:text-yellow-300 underline"
              >
                ➕ Créer un nouveau personnage
              </button>
            </div>

            {erreur && <p className="text-red-300 text-sm">{erreur}</p>}

            <button
              type="button"
              onClick={rejoindre}
              disabled={enCours}
              className="w-full py-3 rounded-lg font-bold text-gray-900 disabled:opacity-60"
              style={{ background: '#C9A84C' }}
            >
              {enCours
                ? 'Connexion à la partie…'
                : choixPjId
                ? 'Rejoindre avec ce personnage'
                : 'Rejoindre sans personnage'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

function messageErreur(code?: string): string {
  const map: Record<string, string> = {
    not_authenticated: 'Tu dois être connecté·e pour rejoindre.',
    session_not_found: 'Session introuvable.',
    session_ended: 'Cette session est terminée.',
    not_member: "Tu n'es pas inscrit·e à ce scénario.",
    not_owner: "Ce personnage ne t'appartient pas.",
    code_not_found: "Ce code d'invitation n'existe pas ou a expiré.",
    code_not_scenario: "Ce code ne correspond pas à une invitation de scénario."
  }
  return code ? map[code] ?? '' : ''
}
