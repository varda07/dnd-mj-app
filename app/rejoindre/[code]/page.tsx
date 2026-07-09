'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { notifyOwnerOfEntity } from '@/app/lib/notifications'

// ============================================================================
// /rejoindre/[code] — Corrections V1 Vague 2 (1.1)
// ----------------------------------------------------------------------------
// Page d'atterrissage du lien d'invitation. Un joueur clique le lien envoyé
// par le MJ → il arrive ici → « Rejoindre [scénario] » → choisit son PJ (ou en
// crée un / rejoint sans PJ) → c'est fait. Un minimum de clics.
// Non connecté : on mémorise le code et on renvoie vers l'accueil pour se
// connecter / créer un compte, puis retour automatique ici (cf. app/page.tsx).
// ============================================================================

type Perso = {
  id: string
  nom: string
  classe: string | null
  niveau: number | null
  image_url: string | null
  scenario_id: string | null
}

export default function RejoindrePage() {
  const params = useParams()
  const router = useRouter()
  const code = String(params?.code ?? '').toUpperCase()

  const [phase, setPhase] = useState<'loading' | 'auth' | 'ready' | 'error' | 'done'>('loading')
  const [erreur, setErreur] = useState('')
  const [scenarioNom, setScenarioNom] = useState('')
  const [persos, setPersos] = useState<Perso[]>([])
  const [choixPjId, setChoixPjId] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    let annule = false
    const init = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        // Mémorise l'invitation pour y revenir après connexion.
        try {
          localStorage.setItem('pending_invite_code', code)
        } catch {}
        if (!annule) setPhase('auth')
        return
      }

      // Récupère le nom du scénario (RPC SECURITY DEFINER : contourne la RLS
      // qui empêche un joueur non-inscrit de lire la fiche scénario).
      const { data: infos, error } = await supabase.rpc('infos_scenario_via_code', {
        p_code: code
      })
      const res = infos as
        | { ok: boolean; error?: string; scenario_id?: string; scenario_nom?: string }
        | null
      if (error || !res?.ok) {
        if (!annule) {
          setErreur(messageErreur(res?.error) || "Ce lien d'invitation est invalide.")
          setPhase('error')
        }
        return
      }
      if (!annule) setScenarioNom(res.scenario_nom ?? '')

      // Charge les personnages du joueur pour proposer un PJ à lier.
      const { data: mesPersos } = await supabase
        .from('personnages')
        .select('id, nom, classe, niveau, image_url, scenario_id')
        .eq('joueur_id', user.id)
        .order('created_at', { ascending: false })
      if (!annule) {
        setPersos((mesPersos ?? []) as Perso[])
        setPhase('ready')
      }
    }
    init()
    return () => {
      annule = true
    }
  }, [code])

  const rejoindre = async () => {
    setEnCours(true)
    const { data, error } = await supabase.rpc('rejoindre_scenario_via_code', {
      p_code: code,
      p_personnage_id: choixPjId
    })
    const res = data as { ok: boolean; error?: string; scenario_id?: string } | null
    if (error || !res?.ok) {
      setErreur(messageErreur(res?.error) || 'Impossible de rejoindre ce scénario.')
      setPhase('error')
      setEnCours(false)
      return
    }
    // Notifie le MJ (best-effort).
    if (res.scenario_id) {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user?.id ?? '')
        .maybeSingle()
      const username =
        (profile?.username as string | undefined) || user?.email || 'Un joueur'
      await notifyOwnerOfEntity({
        entiteType: 'scenario',
        entiteId: res.scenario_id,
        type: 'joueur',
        message: `🧑‍🤝‍🧑 ${username} a rejoint ton scénario`,
        lien: `/dashboard/scenarios/${res.scenario_id}/edit`,
        exclureUserId: user?.id
      })
    }
    try {
      localStorage.removeItem('pending_invite_code')
    } catch {}
    setPhase('done')
    setEnCours(false)
    setTimeout(() => router.push('/dashboard/scenarios'), 1600)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0e0b06' }}>
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, rgba(30,22,8,0.95) 0%, rgba(14,11,6,0.98) 100%)',
          borderColor: 'rgba(201,168,76,0.35)'
        }}
      >
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">📜</div>
          <h1 className="text-2xl font-bold" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>
            Invitation à une partie
          </h1>
        </div>

        {phase === 'loading' && (
          <p className="text-center text-stone-400 text-sm italic py-8">Chargement de l'invitation…</p>
        )}

        {phase === 'auth' && (
          <div className="space-y-4 text-center">
            <p className="text-stone-300 text-sm">
              Tu es invité·e à rejoindre une partie&nbsp;! Connecte-toi ou crée un compte pour
              continuer — tu reviendras directement ici.
            </p>
            <div className="rounded-lg bg-black/40 border border-yellow-800/40 px-3 py-2">
              <p className="text-stone-500 text-[11px] uppercase tracking-widest">Code</p>
              <code className="text-yellow-300 font-mono font-bold text-lg">{code}</code>
            </div>
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
            <p className="text-yellow-100 font-bold">
              Tu as rejoint {scenarioNom ? `« ${scenarioNom} »` : 'le scénario'}&nbsp;!
            </p>
            <p className="text-stone-400 text-sm">Redirection…</p>
          </div>
        )}

        {phase === 'ready' && (
          <div className="space-y-4">
            <p className="text-center text-stone-300 text-sm">
              Rejoindre{' '}
              <span className="text-yellow-200 font-bold">
                {scenarioNom ? `« ${scenarioNom} »` : 'le scénario'}
              </span>
            </p>

            <div>
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-2">
                Ton personnage
              </p>
              {persos.length === 0 ? (
                <p className="text-stone-500 text-sm italic">
                  Tu n'as pas encore de personnage. Tu peux rejoindre maintenant et en créer un
                  ensuite.
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
                          <p className="text-yellow-100 font-bold text-sm truncate">{p.nom}</p>
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
                : 'Rejoindre le scénario'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

function messageErreur(code?: string): string {
  const map: Record<string, string> = {
    code_not_found: "Ce code d'invitation n'existe pas ou a expiré.",
    code_not_scenario: "Ce code ne correspond pas à une invitation de scénario.",
    scenario_not_found: 'Le scénario invité est introuvable.',
    not_authenticated: 'Tu dois être connecté·e pour rejoindre.',
    personnage_not_found: 'Le personnage sélectionné est introuvable.',
    not_owner: "Ce personnage ne t'appartient pas."
  }
  return code ? map[code] ?? '' : ''
}
