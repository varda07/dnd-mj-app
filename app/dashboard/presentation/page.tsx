'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Mode Présentation
// ----------------------------------------------------------------------------
// /dashboard/presentation             → vue MJ (panneau de contrôle + preview)
// /dashboard/presentation?display=1   → vue "TV" plein écran à diffuser
//
// Toutes les données viennent de Supabase Realtime :
//   - presentation_etats (lieu, chapitre, ennemis_visibles, dernier_jet)
//   - combats (round, tour_actuel, ordre_initiative, actif)
//   - personnages + ennemis (HP en temps réel via les pages MJ)
// ============================================================================

type ScenarioActif = {
  id: string
  nom: string
  description: string | null
  mj_id: string
}

type EtatPresentation = {
  scenario_id: string
  lieu_nom: string | null
  lieu_description: string | null
  chapitre_actuel: string | null
  ennemis_visibles: boolean
  dernier_jet:
    | { type: string; valeurs: number[]; total: number; auteur?: string }
    | null
  personnages_ids: string[]
  ennemis_ids: string[]
}

type ScenarioLite = { id: string; nom: string; actif: boolean }

type CombatLite = {
  scenario_id: string
  round: number
  tour_actuel: number
  ordre_initiative: Array<{ kind: 'perso' | 'ennemi'; id: string; nom: string }>
  actif: boolean
}

type Persona = {
  id: string
  nom: string
  classe: string | null
  niveau: number
  hp_actuel: number
  hp_max: number
  image_url: string | null
}

type Ennemi = {
  id: string
  nom: string
  hp_actuel: number
  hp_max: number
  image_url: string | null
}

// ----------------------------------------------------------------------------

// useSearchParams exige un <Suspense> parent pour que la page compile au
// build Vercel (même en force-dynamic). On garde un wrapper Presentation
// minimal exporté par défaut et toute la logique reste dans PresentationInner.
export default function Presentation() {
  return (
    <Suspense fallback={null}>
      <PresentationInner />
    </Suspense>
  )
}

function PresentationInner() {
  const router = useRouter()
  const params = useSearchParams()
  const isDisplayView = params?.get('display') === '1'

  const [loading, setLoading] = useState(true)
  const [scenario, setScenario] = useState<ScenarioActif | null>(null)
  const [isMj, setIsMj] = useState(false)
  const [mesScenarios, setMesScenarios] = useState<ScenarioLite[]>([])
  const [etat, setEtat] = useState<EtatPresentation | null>(null)
  const [combat, setCombat] = useState<CombatLite | null>(null)
  const [personnages, setPersonnages] = useState<Persona[]>([])
  const [ennemis, setEnnemis] = useState<Ennemi[]>([])
  const [draftLieuNom, setDraftLieuNom] = useState('')
  const [draftLieuDesc, setDraftLieuDesc] = useState('')
  const [draftChapitre, setDraftChapitre] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Picker modal pour ajouter des PJ / ennemis depuis la bibliothèque
  const [picker, setPicker] = useState<'pj' | 'ennemi' | null>(null)
  const [libPersos, setLibPersos] = useState<Persona[]>([])
  const [libEnnemis, setLibEnnemis] = useState<Ennemi[]>([])

  const rootRef = useRef<HTMLDivElement | null>(null)

  // --------------------------------------------------------------------------
  // Chargement initial : scénario actif + état presentation + données combat
  // --------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      // 1. Charge tous les scénarios DU MJ courant (pour le sélecteur) et
      //    identifie l'actif. Si l'utilisateur n'est pas MJ d'un scénario,
      //    on tente de retrouver le scénario actif d'un MJ qu'il a rejoint.
      const { data: mine } = await supabase
        .from('scenarios')
        .select('id, nom, description, mj_id, actif')
        .eq('mj_id', user.id)
        .order('nom')

      const mineList = (mine ?? []) as Array<ScenarioActif & { actif: boolean }>
      let activeScn: ScenarioActif | null = null
      let userIsMj = false

      const actifMine = mineList.find((s) => s.actif)
      if (actifMine) {
        activeScn = actifMine
        userIsMj = true
      } else {
        // Côté joueur : récupère un scénario actif d'un MJ rejoint
        const { data: joined } = await supabase
          .from('scenarios_joueurs')
          .select('scenario:scenarios(id, nom, description, mj_id, actif)')
          .eq('joueur_id', user.id)
        const joinedActive = ((joined ?? []) as Array<{
          scenario: ScenarioActif & { actif: boolean } | Array<ScenarioActif & { actif: boolean }> | null
        }>)
          .map((r) =>
            Array.isArray(r.scenario) ? r.scenario[0] : r.scenario
          )
          .find((s): s is ScenarioActif & { actif: boolean } =>
            !!s && s.actif === true
          )
        if (joinedActive) {
          activeScn = joinedActive
          userIsMj = false
        }
      }

      if (cancelled) return
      setMesScenarios(
        mineList.map((s) => ({ id: s.id, nom: s.nom, actif: s.actif }))
      )
      setIsMj(userIsMj)

      if (!activeScn) {
        // Aucun scénario actif → affiche un état vide (le rendu gère
        // cela en proposant de choisir/activer un scénario).
        setScenario(null)
        setLoading(false)
        return
      }
      setScenario(activeScn)

      // 2. Récupère (ou crée) la ligne d'état de présentation
      const { data: pres } = await supabase
        .from('presentation_etats')
        .select('*')
        .eq('scenario_id', activeScn.id)
        .maybeSingle()
      if (!pres && userIsMj) {
        await supabase
          .from('presentation_etats')
          .insert({ scenario_id: activeScn.id })
        setEtat({
          scenario_id: activeScn.id,
          lieu_nom: null,
          lieu_description: null,
          chapitre_actuel: null,
          ennemis_visibles: false,
          dernier_jet: null,
          personnages_ids: [],
          ennemis_ids: []
        })
      } else if (pres) {
        setEtat({
          ...(pres as EtatPresentation),
          personnages_ids: (pres.personnages_ids as string[] | null) ?? [],
          ennemis_ids: (pres.ennemis_ids as string[] | null) ?? []
        })
      }

      // 3. État de combat
      const { data: combatData } = await supabase
        .from('combats')
        .select('scenario_id, round, tour_actuel, ordre_initiative, actif')
        .eq('scenario_id', activeScn.id)
        .maybeSingle()
      if (cancelled) return
      if (combatData) setCombat(combatData as CombatLite)
      setLoading(false)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [router])

  // --------------------------------------------------------------------------
  // (Re)charge la roster affichée = union scenario-link + IDs supplémentaires
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!scenario) return
    let cancel = false
    const refetch = async () => {
      const idsP = etat?.personnages_ids ?? []
      const idsE = etat?.ennemis_ids ?? []
      const [linkedP, addedP, linkedE, addedE] = await Promise.all([
        supabase
          .from('personnages')
          .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url')
          .eq('scenario_id', scenario.id),
        idsP.length > 0
          ? supabase
              .from('personnages')
              .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url')
              .in('id', idsP)
          : Promise.resolve({ data: [] }),
        supabase
          .from('ennemis')
          .select('id, nom, hp_actuel, hp_max, image_url')
          .eq('scenario_id', scenario.id),
        idsE.length > 0
          ? supabase
              .from('ennemis')
              .select('id, nom, hp_actuel, hp_max, image_url')
              .in('id', idsE)
          : Promise.resolve({ data: [] })
      ])
      if (cancel) return
      // Dédupe par id
      const mapP = new Map<string, Persona>()
      ;([...(linkedP.data ?? []), ...(addedP.data ?? [])] as Persona[]).forEach(
        (p) => mapP.set(p.id, p)
      )
      const mapE = new Map<string, Ennemi>()
      ;([...(linkedE.data ?? []), ...(addedE.data ?? [])] as Ennemi[]).forEach(
        (e) => mapE.set(e.id, e)
      )
      setPersonnages(
        Array.from(mapP.values()).sort((a, b) => a.nom.localeCompare(b.nom))
      )
      setEnnemis(
        Array.from(mapE.values()).sort((a, b) => a.nom.localeCompare(b.nom))
      )
    }
    refetch()
    return () => {
      cancel = true
    }
  }, [scenario, etat?.personnages_ids, etat?.ennemis_ids])

  // --------------------------------------------------------------------------
  // Plein écran : tracking + toggle
  // --------------------------------------------------------------------------
  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Synchronise les drafts MJ quand l'état change (re-fetch ou changement
  // distant via realtime). Pattern legit "sync external state → internal" :
  // les drafts sont des inputs contrôlés que l'on veut hydrater au moment
  // où la source change. ESLint flagge mais c'est intentionnel.
  useEffect(() => {
    if (!etat) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftLieuNom(etat.lieu_nom ?? '')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftLieuDesc(etat.lieu_description ?? '')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftChapitre(etat.chapitre_actuel ?? '')
  }, [etat?.lieu_nom, etat?.lieu_description, etat?.chapitre_actuel, etat])

  // --------------------------------------------------------------------------
  // Realtime : presentation_etats + combats + jets_de_des (dernier)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!scenario) return
    const channel = supabase
      .channel(`presentation:${scenario.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presentation_etats',
          filter: `scenario_id=eq.${scenario.id}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setEtat(null)
            return
          }
          setEtat(payload.new as EtatPresentation)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'combats',
          filter: `scenario_id=eq.${scenario.id}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setCombat(null)
            return
          }
          setCombat(payload.new as CombatLite)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [scenario])

  // --------------------------------------------------------------------------
  // MJ : sauvegarde live d'un champ
  // --------------------------------------------------------------------------
  const sauverChamp = useCallback(
    async (patch: Partial<EtatPresentation>) => {
      if (!scenario || !isMj) return
      setStatusMsg('Sauvegarde…')
      const { error } = await supabase
        .from('presentation_etats')
        .update(patch)
        .eq('scenario_id', scenario.id)
      if (error) {
        console.error('[presentation] save :', error)
        setStatusMsg('Erreur')
        return
      }
      setStatusMsg('✓ Sauvegardé')
      setTimeout(() => setStatusMsg(''), 1500)
    },
    [scenario, isMj]
  )

  // --------------------------------------------------------------------------
  // Plein écran — toggle (entrer / sortir)
  // --------------------------------------------------------------------------
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
      return
    }
    const el = rootRef.current ?? document.documentElement
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
  }

  // --------------------------------------------------------------------------
  // Retour vers /dashboard : sort du plein écran si actif puis navigue.
  // --------------------------------------------------------------------------
  const handleExit = useCallback(async () => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        /* ignore : si exit échoue on navigue quand même */
      }
    }
    router.push('/dashboard')
  }, [router])

  // --------------------------------------------------------------------------
  // Esc clavier : raccourci global pour quitter la présentation. Désactivé
  // quand un modal est ouvert (le modal gère son propre Esc via overlay).
  // --------------------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Quand un modal est ouvert, on le laisse gérer son propre Esc.
      if (picker !== null) return
      handleExit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleExit, picker])

  // --------------------------------------------------------------------------
  // Bascule le scénario actif (un seul actif à la fois côté MJ).
  // --------------------------------------------------------------------------
  const activerScenario = useCallback(
    async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setStatusMsg('Activation…')
      // Désactive tous les autres scénarios du MJ
      await supabase
        .from('scenarios')
        .update({ actif: false })
        .eq('mj_id', user.id)
        .eq('actif', true)
      // Active celui-ci
      const { error } = await supabase
        .from('scenarios')
        .update({ actif: true })
        .eq('id', id)
      if (error) {
        console.error('[presentation] activer scénario :', error)
        setStatusMsg('Erreur')
        return
      }
      setStatusMsg('✓ Activé')
      setTimeout(() => setStatusMsg(''), 1500)
      // Recharge la page pour rafraîchir tout l'état (scénario, etat, etc.)
      router.refresh()
      window.location.reload()
    },
    [router]
  )

  // --------------------------------------------------------------------------
  // Picker — charge la bibliothèque PJ / ennemis du MJ à la demande
  // --------------------------------------------------------------------------
  const ouvrirPicker = async (kind: 'pj' | 'ennemi') => {
    setPicker(kind)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (kind === 'pj') {
      // PJ joueurs liés à un scénario du MJ + PJ "joueur_id = user.id"
      const myScenarioIds = mesScenarios.map((s) => s.id)
      const [linked, owned] = await Promise.all([
        myScenarioIds.length > 0
          ? supabase
              .from('personnages')
              .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url')
              .in('scenario_id', myScenarioIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('personnages')
          .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url')
          .eq('joueur_id', user.id)
      ])
      const map = new Map<string, Persona>()
      ;([...(linked.data ?? []), ...(owned.data ?? [])] as Persona[]).forEach(
        (p) => map.set(p.id, p)
      )
      setLibPersos(
        Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom))
      )
    } else {
      const { data } = await supabase
        .from('ennemis')
        .select('id, nom, hp_actuel, hp_max, image_url')
        .eq('mj_id', user.id)
        .order('nom')
      setLibEnnemis((data ?? []) as Ennemi[])
    }
  }

  // Toggle (ajoute/retire) un ID dans le tableau correspondant + sauve
  const toggleIdDansEtat = async (kind: 'pj' | 'ennemi', id: string) => {
    if (!etat) return
    const key = kind === 'pj' ? 'personnages_ids' : 'ennemis_ids'
    const liste = etat[key]
    const next = liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id]
    await sauverChamp({ [key]: next } as Partial<EtatPresentation>)
  }

  const displayUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/dashboard/presentation?display=1`
      : ''

  // --------------------------------------------------------------------------
  // Rendus
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400">Chargement…</p>
      </main>
    )
  }

  if (!scenario) {
    return (
      <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white text-sm mb-4"
          >
            ← Retour à l&apos;accueil
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-yellow-500 mb-3">
            📺 Mode présentation
          </h1>
          <div
            className="rounded-lg p-5 mb-4"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 55%), linear-gradient(180deg, #0e0b07 0%, #08060a 100%)',
              border: '1px solid rgba(201,168,76,0.20)'
            }}
          >
            <p className="text-gray-300 text-sm leading-relaxed">
              Sélectionne d&apos;abord un scénario actif depuis ta page d&apos;accueil
              pour commencer une présentation.
            </p>
          </div>
          {mesScenarios.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                Activer un scénario maintenant
              </p>
              <div className="flex flex-col gap-2">
                {mesScenarios.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => activerScenario(s.id)}
                    className="text-left px-3 py-2 rounded border border-gray-700 hover:border-yellow-600 hover:bg-yellow-500/5 text-sm text-gray-200 transition"
                  >
                    📖 {s.nom}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    )
  }

  if (isDisplayView) {
    return (
      <DisplayView
        root={rootRef}
        scenario={scenario}
        etat={etat}
        combat={combat}
        personnages={personnages}
        ennemis={ennemis}
        onExit={handleExit}
      />
    )
  }

  // Vue MJ : contrôles + preview compact
  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[#C9A84C] border border-[rgba(201,168,76,0.30)] hover:bg-[rgba(201,168,76,0.08)] hover:border-[#C9A84C] rounded transition"
          >
            ← Retour
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-yellow-500">
            📺 Mode présentation
          </h1>
          {statusMsg && (
            <span className="text-xs text-yellow-300 italic ml-1">
              {statusMsg}
            </span>
          )}
        </div>

        {/* Sélecteur de scénario actif (MJ uniquement, et seulement s'il a
            plusieurs scénarios). */}
        {isMj && mesScenarios.length > 1 && (
          <div className="bg-gray-800 rounded-lg p-3 mb-4 flex items-center gap-2 flex-wrap">
            <label className="text-[10px] uppercase tracking-[0.22em] text-gray-400 font-bold">
              Scénario actif
            </label>
            <select
              value={scenario.id}
              onChange={(e) => activerScenario(e.target.value)}
              className="flex-1 min-w-[200px] p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none focus:border-yellow-500 text-sm"
            >
              {mesScenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-gray-500 italic">
              Changer recharge la présentation.
            </span>
          </div>
        )}

        <h2 className="text-base font-bold text-gray-300 mb-4">
          📖 {scenario.nom}
        </h2>

        {!isMj && (
          <div className="bg-gray-800 border border-yellow-700/40 rounded-lg p-3 mb-4">
            <p className="text-yellow-300 text-sm">
              Mode lecture seule — seul le MJ peut modifier l&apos;état.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Colonne gauche : contrôles MJ */}
          {isMj && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-4">
              <h2 className="codex-section-title codex-section-title-left text-yellow-500" style={{ fontSize: 10 }}>
                Contrôles MJ
              </h2>

              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
                  Chapitre actuel
                </label>
                <input
                  type="text"
                  value={draftChapitre}
                  onChange={(e) => setDraftChapitre(e.target.value)}
                  onBlur={() => sauverChamp({ chapitre_actuel: draftChapitre.trim() || null })}
                  placeholder="Acte II — Les Catacombes"
                  className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none focus:border-yellow-500 text-sm"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
                  Lieu actuel — nom
                </label>
                <input
                  type="text"
                  value={draftLieuNom}
                  onChange={(e) => setDraftLieuNom(e.target.value)}
                  onBlur={() => sauverChamp({ lieu_nom: draftLieuNom.trim() || null })}
                  placeholder="Crypte oubliée"
                  className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none focus:border-yellow-500 text-sm"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
                  Lieu actuel — description (lue par les joueurs)
                </label>
                <textarea
                  value={draftLieuDesc}
                  onChange={(e) => setDraftLieuDesc(e.target.value)}
                  onBlur={() => sauverChamp({ lieu_description: draftLieuDesc.trim() || null })}
                  placeholder="L'air glacial vous saisit. Des torches vacillantes éclairent…"
                  className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none focus:border-yellow-500 text-sm min-h-[120px]"
                />
              </div>

              <div className="flex items-center justify-between gap-3 p-3 bg-gray-900 rounded border border-gray-700">
                <div>
                  <p className="text-sm font-bold text-white">
                    {etat?.ennemis_visibles ? '👁 Ennemis visibles' : '🔒 Ennemis masqués'}
                  </p>
                  <p className="text-[11px] text-gray-400 italic mt-0.5">
                    {etat?.ennemis_visibles
                      ? 'Les joueurs voient les vrais noms et HP.'
                      : 'Les joueurs voient « Créature obscure » et « ?? » au lieu des stats.'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={etat?.ennemis_visibles ?? false}
                  onClick={() =>
                    sauverChamp({ ennemis_visibles: !etat?.ennemis_visibles })
                  }
                  className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
                    etat?.ennemis_visibles ? 'bg-yellow-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block w-5 h-5 transform rounded-full bg-white shadow transition-transform ${
                      etat?.ennemis_visibles ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Colonne droite : partage + lancement plein écran */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            <h2 className="codex-section-title codex-section-title-left text-yellow-500" style={{ fontSize: 10 }}>
              Diffusion
            </h2>

            <button
              type="button"
              onClick={() => router.push('/dashboard/presentation?display=1')}
              className="w-full px-4 py-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 text-sm uppercase tracking-wider"
            >
              📺 Ouvrir la vue diffusion
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-full px-4 py-3 border border-yellow-600/40 text-yellow-300 rounded hover:bg-yellow-500/10 text-sm uppercase tracking-wider"
            >
              {isFullscreen ? '↙️ Quitter le plein écran' : '📺 Plein écran'}
            </button>

            <div className="border-t border-gray-700 pt-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                Partager aux joueurs
              </p>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  readOnly
                  value={displayUrl}
                  className="flex-1 p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(displayUrl)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                  title="Copier le lien"
                >
                  📋
                </button>
              </div>
              <div className="flex justify-center">
                {/* QR code via service public (pas de dépendance) */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(displayUrl)}`}
                  alt="QR code à scanner pour ouvrir la vue présentation"
                  className="rounded bg-white p-2"
                  width={200}
                  height={200}
                />
              </div>
              <p className="text-[10px] text-gray-500 italic text-center mt-2">
                Scanne ce QR depuis un téléphone connecté au compte joueur.
              </p>
            </div>
          </div>
        </div>

        {/* Preview de ce que voient les joueurs */}
        <div className="mt-6">
          <h2 className="codex-section-title codex-section-title-left text-yellow-500" style={{ fontSize: 10 }}>
            Aperçu
          </h2>
          <div className="rounded-lg overflow-hidden border border-yellow-700/30">
            <DisplayView
              root={{ current: null }}
              scenario={scenario}
              etat={etat}
              combat={combat}
              personnages={personnages}
              ennemis={ennemis}
              compact
              onAddPj={isMj ? () => ouvrirPicker('pj') : undefined}
              onAddEnnemi={isMj ? () => ouvrirPicker('ennemi') : undefined}
              onExit={handleExit}
            />
          </div>
        </div>
      </div>

      {/* Picker modal pour ajouter un PJ ou un ennemi à la roster */}
      {picker && (
        <PickerModal
          kind={picker}
          ids={
            picker === 'pj'
              ? etat?.personnages_ids ?? []
              : etat?.ennemis_ids ?? []
          }
          items={picker === 'pj' ? libPersos : libEnnemis}
          onToggle={(id) => toggleIdDansEtat(picker, id)}
          onClose={() => setPicker(null)}
        />
      )}
    </main>
  )
}

// ============================================================================
// PickerModal — checklist pour ajouter/retirer des entités de la roster
// ============================================================================
function PickerModal({
  kind,
  ids,
  items,
  onToggle,
  onClose
}: {
  kind: 'pj' | 'ennemi'
  ids: string[]
  items: Array<{ id: string; nom: string; image_url: string | null }>
  onToggle: (id: string) => void | Promise<void>
  onClose: () => void
}) {
  const labelTitre = kind === 'pj' ? 'Ajouter un compagnon' : 'Ajouter un adversaire'
  const empty =
    kind === 'pj'
      ? 'Aucun personnage joueur dans ta bibliothèque.'
      : 'Aucun ennemi dans ta bibliothèque. Crée-en depuis Forge → Ennemis.'

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={labelTitre}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="grimoire-modal w-full max-w-md max-h-[85vh] flex flex-col"
      >
        <div className="grimoire-modal-header">
          <h3 className="grimoire-modal-title">{labelTitre}</h3>
          <button
            type="button"
            onClick={onClose}
            className="grimoire-modal-close"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <div className="grimoire-modal-body flex-1 overflow-y-auto [scrollbar-width:thin]">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-4">
              {empty}
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((it) => {
                const coche = ids.includes(it.id)
                return (
                  <li key={it.id}>
                    <label
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition ${
                        coche
                          ? 'bg-yellow-500/10 border border-yellow-500/40'
                          : 'border border-transparent hover:bg-gray-800/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={coche}
                        onChange={() => onToggle(it.id)}
                        className="accent-yellow-500 w-4 h-4 flex-shrink-0"
                      />
                      {it.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.image_url}
                          alt=""
                          loading="lazy"
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gray-900"
                        />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs flex-shrink-0">
                          {kind === 'pj' ? '🧙' : '👹'}
                        </span>
                      )}
                      <span className="flex-1 text-sm text-gray-200 truncate">
                        {it.nom}
                      </span>
                      {coche && (
                        <span className="text-[10px] uppercase tracking-wider text-yellow-300 flex-shrink-0">
                          Affiché
                        </span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="grimoire-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="grimoire-modal-btn grimoire-modal-btn-primary"
          >
            Terminé
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// DisplayView — vue plein écran "TV" pour les joueurs.
// ============================================================================

function DisplayView({
  root,
  scenario,
  etat,
  combat,
  personnages,
  ennemis,
  compact = false,
  onAddPj,
  onAddEnnemi,
  onExit
}: {
  root: React.RefObject<HTMLDivElement | null>
  scenario: ScenarioActif
  etat: EtatPresentation | null
  combat: CombatLite | null
  personnages: Persona[]
  ennemis: Ennemi[]
  compact?: boolean
  onAddPj?: () => void
  onAddEnnemi?: () => void
  onExit?: () => void
}) {
  const ennemisVisibles = etat?.ennemis_visibles ?? false
  const tourCourant =
    combat && combat.actif && combat.ordre_initiative
      ? combat.ordre_initiative[combat.tour_actuel]
      : null

  return (
    <div
      ref={root}
      className={`min-h-screen text-white relative ${compact ? 'min-h-0' : ''}`}
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.10) 0%, transparent 55%), linear-gradient(180deg, #08090c 0%, #05060a 100%)'
      }}
    >
      {/* Bouton retour — toujours visible, même en plein écran. Positionné
          absolument pour rester en place quand le parent passe en fullscreen.
          Style or 50% au repos, plus marqué au hover. */}
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          aria-label="Retour au dashboard"
          className="presentation-exit"
        >
          <span aria-hidden="true">←</span>
          <span className="presentation-exit-label">Retour au dashboard</span>
        </button>
      )}
      <div className={`${compact ? 'p-6 pt-12' : 'p-8 md:p-12 pt-16 md:pt-20'} max-w-7xl mx-auto`}>
        {/* Bandeau de titre */}
        <header className="text-center mb-8">
          <p
            className="uppercase tracking-[0.4em] text-[#C9A84C] mb-2"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: compact ? 11 : 14,
              opacity: 0.75
            }}
          >
            {etat?.chapitre_actuel ?? scenario.nom}
          </p>
          {etat?.chapitre_actuel && (
            <h1
              className="text-[#f5f2e8]"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: compact ? 22 : 36,
                fontWeight: 300,
                letterSpacing: '0.04em'
              }}
            >
              {scenario.nom}
            </h1>
          )}
          <div
            className="mx-auto my-4 h-px"
            style={{
              width: compact ? 80 : 160,
              background:
                'linear-gradient(to right, transparent 0%, rgba(201,168,76,0.7) 50%, transparent 100%)'
            }}
          />
        </header>

        {/* Lieu actuel */}
        {(etat?.lieu_nom || etat?.lieu_description) && (
          <section
            className="rounded-lg p-6 md:p-8 mb-8 text-center"
            style={{
              background:
                'radial-gradient(ellipse at 50% 130%, rgba(150,30,30,0.20) 0%, transparent 70%), linear-gradient(180deg, rgba(20,14,8,0.6) 0%, rgba(8,5,3,0.5) 100%)',
              border: '1px solid rgba(201,168,76,0.30)'
            }}
          >
            <p
              className="uppercase tracking-[0.3em] mb-3"
              style={{
                color: '#C9A84C',
                opacity: 0.75,
                fontSize: compact ? 10 : 12,
                fontWeight: 700
              }}
            >
              Lieu actuel
            </p>
            {etat?.lieu_nom && (
              <h2
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#f5f2e8',
                  fontSize: compact ? 28 : 48,
                  fontWeight: 300,
                  letterSpacing: '0.04em',
                  marginBottom: 8
                }}
              >
                {etat.lieu_nom}
              </h2>
            )}
            {etat?.lieu_description && (
              <p
                className="italic mx-auto"
                style={{
                  color: 'rgba(232,232,236,0.7)',
                  fontSize: compact ? 14 : 18,
                  lineHeight: 1.6,
                  maxWidth: compact ? 600 : 900,
                  fontFamily: 'Georgia, serif'
                }}
              >
                « {etat.lieu_description} »
              </p>
            )}
          </section>
        )}

        {/* Tour de combat */}
        {combat?.actif && tourCourant && (
          <section
            className="rounded-lg p-4 md:p-5 mb-8 text-center"
            style={{
              background: 'rgba(120, 30, 30, 0.20)',
              border: '1px solid rgba(220, 90, 90, 0.40)'
            }}
          >
            <p
              className="uppercase tracking-[0.3em]"
              style={{ color: '#fca5a5', fontSize: compact ? 9 : 11, fontWeight: 700, marginBottom: 4 }}
            >
              ⚔ Combat en cours — Round {combat.round}
            </p>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                color: '#fff',
                fontSize: compact ? 20 : 28,
                fontWeight: 400
              }}
            >
              C&apos;est à <span style={{ color: '#fca5a5' }}>{tourCourant.nom}</span>
            </p>
          </section>
        )}

        {/* Grille PJ + Ennemis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Roster
            titre="Compagnons"
            icone="🛡"
            entries={personnages.map((p) => ({
              id: p.id,
              nom: p.nom,
              sous: [p.classe, `Niv. ${p.niveau}`].filter(Boolean).join(' · '),
              hp: p.hp_actuel,
              hpMax: p.hp_max,
              image: p.image_url
            }))}
            compact={compact}
            obscure={false}
            onAdd={onAddPj}
            addLabel="+ Ajouter un compagnon"
          />
          <Roster
            titre="Adversaires"
            icone="👹"
            entries={ennemis.map((e) => ({
              id: e.id,
              nom: ennemisVisibles ? e.nom : 'Créature obscure',
              sous: null,
              hp: ennemisVisibles ? e.hp_actuel : null,
              hpMax: ennemisVisibles ? e.hp_max : null,
              image: ennemisVisibles ? e.image_url : null
            }))}
            compact={compact}
            obscure={!ennemisVisibles}
            onAdd={onAddEnnemi}
            addLabel="+ Ajouter un adversaire"
          />
        </div>

        {/* Dernier jet */}
        {etat?.dernier_jet && (
          <section
            className="mt-8 rounded-lg p-4 md:p-5 text-center"
            style={{
              border: '1px solid rgba(201,168,76,0.25)',
              background: 'rgba(0,0,0,0.3)'
            }}
          >
            <p
              className="uppercase tracking-[0.3em]"
              style={{ color: '#C9A84C', fontSize: compact ? 9 : 11, fontWeight: 700, marginBottom: 4 }}
            >
              🎲 Dernier jet
            </p>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                color: '#f5f2e8',
                fontSize: compact ? 22 : 32,
                fontWeight: 400
              }}
            >
              {etat.dernier_jet.total}
              <span className="text-gray-400 text-sm ml-3">
                ({etat.dernier_jet.type} · {etat.dernier_jet.valeurs.join(' + ')})
              </span>
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Roster — liste compacte de combattants (PJ ou ennemis)
// ============================================================================

function Roster({
  titre,
  icone,
  entries,
  compact,
  obscure,
  onAdd,
  addLabel
}: {
  titre: string
  icone: string
  entries: Array<{
    id: string
    nom: string
    sous: string | null
    hp: number | null
    hpMax: number | null
    image: string | null
  }>
  compact: boolean
  obscure: boolean
  onAdd?: () => void
  addLabel?: string
}) {
  return (
    <div
      className="rounded-lg p-4 md:p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(20,15,8,0.40) 0%, rgba(10,8,4,0.20) 100%)',
        border: '1px solid rgba(201,168,76,0.15)'
      }}
    >
      <h3
        className="uppercase tracking-[0.3em] mb-3 flex items-center gap-2"
        style={{ color: '#C9A84C', fontSize: compact ? 10 : 12, fontWeight: 700 }}
      >
        <span>{icone}</span>
        {titre}
      </h3>
      {entries.length === 0 && (
        <p className="text-gray-500 text-sm italic text-center py-4">
          Aucun.
        </p>
      )}
      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((e) => {
            const ratio = e.hpMax ? Math.max(0, Math.min(1, (e.hp ?? 0) / e.hpMax)) : 0
            return (
              <li
                key={e.id}
                className="flex items-center gap-3 p-2 rounded"
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.04)'
                }}
              >
                {e.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.image}
                    alt=""
                    loading="lazy"
                    className="rounded-full object-cover flex-shrink-0"
                    style={{ width: compact ? 36 : 56, height: compact ? 36 : 56 }}
                  />
                ) : (
                  <span
                    className="rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0"
                    style={{ width: compact ? 36 : 56, height: compact ? 36 : 56, fontSize: compact ? 16 : 22 }}
                  >
                    {obscure ? '👤' : e.nom.slice(0, 1)}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#f5f2e8',
                      fontSize: compact ? 14 : 20,
                      fontWeight: 400
                    }}
                    className="truncate"
                  >
                    {e.nom}
                  </p>
                  {e.sous && (
                    <p
                      className="italic text-gray-400 truncate"
                      style={{ fontSize: compact ? 10 : 12 }}
                    >
                      {e.sous}
                    </p>
                  )}
                  {e.hp !== null && e.hpMax !== null ? (
                    <div className="mt-1">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>HP</span>
                        <span>
                          {e.hp}/{e.hpMax}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${ratio * 100}%`,
                            background:
                              ratio > 0.5
                                ? '#22c55e'
                                : ratio > 0.25
                                ? '#eab308'
                                : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p
                      className="italic text-gray-500 mt-0.5"
                      style={{ fontSize: compact ? 10 : 12 }}
                    >
                      ?? / ??
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-3 w-full px-3 py-2 text-[11px] uppercase tracking-[0.22em] font-bold rounded transition"
          style={{
            color: 'var(--theme-accent, #C9A84C)',
            background: 'color-mix(in srgb, var(--theme-accent, #C9A84C) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--theme-accent, #C9A84C) 30%, transparent)'
          }}
        >
          {addLabel ?? '+ Ajouter'}
        </button>
      )}
    </div>
  )
}
