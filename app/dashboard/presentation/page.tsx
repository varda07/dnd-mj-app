'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CONDITIONS_MAP, isConditionKey } from '@/app/data/conditions'

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

// NB : ces types + le composant DisplayView sont aussi importés par la route
// publique /presentation/[sessionId] (écran joueurs sans login). Ils sont donc
// exportés depuis ce fichier de page — Next.js ne traite que l'export default
// comme la page, les exports nommés restent de simples exports de module.
export type ScenarioActif = {
  id: string
  nom: string
  description: string | null
  mj_id: string
}

export type NarrationEntry = { texte: string; ts: number }
export type EffetRapide = {
  type: 'crit' | 'ko' | 'notif'
  cible?: string | null
  ts: number
}

export type EtatPresentation = {
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
  // Phase 2 — narration temps réel + actions rapides MJ.
  narration: string | null
  narration_historique: NarrationEntry[]
  effet: EffetRapide | null
  en_pause: boolean
  // Phase 4 — galerie d'images, ambiance sonore, ambiance visuelle.
  image_plein_ecran: string | null
  lieu_son: string | null
  lieu_son_volume: number
  ambiance: string
}

// Image utilisable dans la galerie « à pousser à l'écran ».
type ImageGalerie = { url: string; label: string }

// Templates de narration pré-faits (boutons de remplissage rapide).
const NARRATION_TEMPLATES = [
  'Vous entrez dans…',
  'Soudain…',
  'Le silence retombe…'
]

type ScenarioLite = { id: string; nom: string; actif: boolean }

export type CombatLite = {
  scenario_id: string
  round: number
  tour_actuel: number
  ordre_initiative: Array<{ kind: 'perso' | 'ennemi'; id: string; nom: string }>
  actif: boolean
}

export type Persona = {
  id: string
  nom: string
  classe: string | null
  niveau: number
  hp_actuel: number
  hp_max: number
  image_url: string | null
  conditions: string[]
}

export type Ennemi = {
  id: string
  nom: string
  hp_actuel: number
  hp_max: number
  image_url: string | null
  conditions: string[]
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
  // Phase 2 — narration à pousser + cible de l'action « K.O. »
  const [draftNarration, setDraftNarration] = useState('')
  const [koCible, setKoCible] = useState('')
  // Phase 4 — galerie d'images poussables + URL d'ambiance sonore en cours
  // de saisie.
  const [galerie, setGalerie] = useState<ImageGalerie[]>([])
  const [draftSon, setDraftSon] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Diffusion multi-écran : session publique partagée aux joueurs (sans login).
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [diffusionMsg, setDiffusionMsg] = useState('')
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
          ennemis_ids: [],
          narration: null,
          narration_historique: [],
          effet: null,
          en_pause: false,
          image_plein_ecran: null,
          lieu_son: null,
          lieu_son_volume: 50,
          ambiance: 'auto'
        })
      } else if (pres) {
        setEtat({
          ...(pres as EtatPresentation),
          personnages_ids: (pres.personnages_ids as string[] | null) ?? [],
          ennemis_ids: (pres.ennemis_ids as string[] | null) ?? [],
          narration: (pres.narration as string | null) ?? null,
          narration_historique: Array.isArray(pres.narration_historique)
            ? (pres.narration_historique as NarrationEntry[])
            : [],
          effet: (pres.effet as EffetRapide | null) ?? null,
          en_pause: (pres.en_pause as boolean | null) ?? false,
          image_plein_ecran: (pres.image_plein_ecran as string | null) ?? null,
          lieu_son: (pres.lieu_son as string | null) ?? null,
          lieu_son_volume: (pres.lieu_son_volume as number | null) ?? 50,
          ambiance: (pres.ambiance as string | null) ?? 'auto'
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
          .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url, conditions')
          .eq('scenario_id', scenario.id),
        idsP.length > 0
          ? supabase
              .from('personnages')
              .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url, conditions')
              .in('id', idsP)
          : Promise.resolve({ data: [] }),
        supabase
          .from('ennemis')
          .select('id, nom, hp_actuel, hp_max, image_url, conditions')
          .eq('scenario_id', scenario.id),
        idsE.length > 0
          ? supabase
              .from('ennemis')
              .select('id, nom, hp_actuel, hp_max, image_url, conditions')
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
        // PostgrestError se sérialise mal en objet vide via console.error :
        // on extrait explicitement les champs utiles.
        console.error('[presentation] save :', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        setStatusMsg('Erreur')
        return
      }
      setStatusMsg('✓ Sauvegardé')
      setTimeout(() => setStatusMsg(''), 1500)
    },
    [scenario, isMj]
  )

  // --------------------------------------------------------------------------
  // Phase 2 — narration temps réel + actions rapides MJ
  // --------------------------------------------------------------------------

  // Pousse un texte narratif à l'écran et l'empile dans l'historique (3 max).
  const pousserNarration = useCallback(async () => {
    const texte = draftNarration.trim()
    if (!texte) return
    const histo: NarrationEntry[] = [
      { texte, ts: Date.now() },
      ...(etat?.narration_historique ?? [])
    ].slice(0, 3)
    await sauverChamp({ narration: texte, narration_historique: histo })
    setDraftNarration('')
  }, [draftNarration, etat?.narration_historique, sauverChamp])

  const effacerNarration = useCallback(
    () => sauverChamp({ narration: null }),
    [sauverChamp]
  )

  // Déclenche une action rapide transitoire (crit / ko / notif). On change le
  // `ts` à chaque fois pour que l'écran joueurs rejoue l'animation même si le
  // type est identique au précédent.
  const declencherEffet = useCallback(
    (type: EffetRapide['type'], cible?: string) =>
      sauverChamp({ effet: { type, cible: cible ?? null, ts: Date.now() } }),
    [sauverChamp]
  )

  const togglePause = useCallback(
    () => sauverChamp({ en_pause: !etat?.en_pause }),
    [etat?.en_pause, sauverChamp]
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
              .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url, conditions')
              .in('scenario_id', myScenarioIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('personnages')
          .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url, conditions')
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
        .select('id, nom, hp_actuel, hp_max, image_url, conditions')
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

  // URL publique de l'écran joueurs (aucun login requis) — disponible une fois
  // la diffusion lancée.
  const sessionUrl =
    sessionId && typeof window !== 'undefined'
      ? `${window.location.origin}/presentation/${sessionId}`
      : ''

  // --------------------------------------------------------------------------
  // Diffusion multi-écran : crée une session publique et y pousse en continu
  // un snapshot complet. La route publique (non authentifiée) ne peut lire QUE
  // sessions_presentation — d'où le snapshot plutôt qu'un accès direct aux
  // tables protégées par RLS.
  // --------------------------------------------------------------------------
  const lancerDiffusion = useCallback(async () => {
    if (!scenario || !isMj) return
    setDiffusionMsg('Création de la session…')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Réutilise la session existante de ce scénario s'il y en a une.
    const { data: existante } = await supabase
      .from('sessions_presentation')
      .select('id')
      .eq('mj_id', user.id)
      .eq('scenario_id', scenario.id)
      .maybeSingle()
    if (existante) {
      setSessionId(existante.id as string)
      setDiffusionMsg('')
      return
    }
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const { data, error } = await supabase
      .from('sessions_presentation')
      .insert({
        mj_id: user.id,
        scenario_id: scenario.id,
        code_session: code,
        etat_jeu: {}
      })
      .select('id')
      .single()
    if (error || !data) {
      console.error('[presentation] lancer diffusion :', error)
      setDiffusionMsg('Erreur — exécute supabase/sessions_presentation.sql dans Supabase.')
      return
    }
    setSessionId(data.id as string)
    setDiffusionMsg('')
  }, [scenario, isMj])

  const arreterDiffusion = useCallback(async () => {
    if (!sessionId) return
    await supabase.from('sessions_presentation').delete().eq('id', sessionId)
    setSessionId(null)
    setDiffusionMsg('')
  }, [sessionId])

  // Pousse le snapshot complet à chaque changement d'état pendant la diffusion.
  useEffect(() => {
    if (!sessionId || !scenario) return
    const snapshot = { scenario, etat, combat, personnages, ennemis }
    supabase
      .from('sessions_presentation')
      .update({ etat_jeu: snapshot })
      .eq('id', sessionId)
      .then(({ error }) => {
        if (error) console.error('[presentation] snapshot :', error)
      })
  }, [sessionId, scenario, etat, combat, personnages, ennemis])

  // --------------------------------------------------------------------------
  // Phase 4 — galerie d'images poussables : portraits PNJ / ennemis, items,
  // cartes. Chargée une fois pour le MJ courant.
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isMj || !scenario) return
    let cancel = false
    const charger = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [pnj, enn, items, maps] = await Promise.all([
        supabase.from('pnj').select('nom, image_url').eq('mj_id', user.id),
        supabase.from('ennemis').select('nom, image_url').eq('mj_id', user.id),
        supabase.from('items').select('nom, image_url').eq('mj_id', user.id),
        supabase.from('maps').select('nom, image_url').eq('mj_id', user.id)
      ])
      if (cancel) return
      const out: ImageGalerie[] = []
      const ajouter = (rows: unknown, prefixe: string) => {
        ;(
          (rows as Array<{ nom: string; image_url: string | null }> | null) ?? []
        ).forEach((r) => {
          if (r.image_url) out.push({ url: r.image_url, label: `${prefixe} ${r.nom}` })
        })
      }
      ajouter(pnj.data, '🧑')
      ajouter(enn.data, '👹')
      ajouter(items.data, '🎒')
      ajouter(maps.data, '🗺')
      setGalerie(out)
    }
    charger()
    return () => {
      cancel = true
    }
  }, [isMj, scenario])

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

              {/* === Narration temps réel === */}
              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
                  Pousser à l&apos;écran (narration)
                </label>
                <textarea
                  value={draftNarration}
                  onChange={(e) => setDraftNarration(e.target.value)}
                  placeholder="« Une lueur pâle filtre entre les colonnes brisées… »"
                  className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none focus:border-yellow-500 text-sm min-h-[80px]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {NARRATION_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() =>
                        setDraftNarration((v) => (v.trim() ? v.trimEnd() + ' ' : '') + tpl)
                      }
                      className="px-2 py-1 text-[10px] rounded border border-gray-700 text-gray-300 hover:border-yellow-600 hover:text-yellow-300 transition"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={pousserNarration}
                    disabled={!draftNarration.trim()}
                    className="flex-1 px-3 py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 text-xs uppercase tracking-wider disabled:opacity-40"
                  >
                    📜 Pousser à l&apos;écran
                  </button>
                  {etat?.narration && (
                    <button
                      type="button"
                      onClick={effacerNarration}
                      className="px-3 py-2 border border-gray-700 text-gray-400 rounded hover:border-red-600 hover:text-red-300 text-xs flex-shrink-0"
                      title="Retirer la narration de l'écran"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {etat?.narration && (
                  <p className="text-[10px] text-gray-500 italic mt-1.5 truncate">
                    À l&apos;écran : « {etat.narration} »
                  </p>
                )}
              </div>

              {/* === Actions rapides === */}
              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 block mb-2">
                  Actions rapides
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => declencherEffet('crit')}
                    className="presentation-action-btn"
                  >
                    ⚔ Critique 20
                  </button>
                  <button
                    type="button"
                    onClick={() => declencherEffet('notif')}
                    className="presentation-action-btn"
                  >
                    🔔 Notif tour
                  </button>
                  <button
                    type="button"
                    onClick={togglePause}
                    className={`presentation-action-btn${etat?.en_pause ? ' is-on' : ''}`}
                  >
                    {etat?.en_pause ? '▶ Reprendre' : '⏸ Pause'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      sauverChamp({ ennemis_visibles: !etat?.ennemis_visibles })
                    }
                    className={`presentation-action-btn${
                      etat?.ennemis_visibles ? ' is-on' : ''
                    }`}
                  >
                    {etat?.ennemis_visibles ? '👁 Ennemis révélés' : '🌫 Voile mystère'}
                  </button>
                </div>
                {/* K.O. — choisir une cible puis déclencher l'animation */}
                <div className="flex gap-2 mt-2">
                  <select
                    value={koCible}
                    onChange={(e) => setKoCible(e.target.value)}
                    className="flex-1 min-w-0 p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none focus:border-yellow-500 text-xs"
                  >
                    <option value="">— Cible du K.O. —</option>
                    {[...personnages, ...ennemis].map((c) => (
                      <option key={c.id} value={c.nom}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (koCible) declencherEffet('ko', koCible)
                    }}
                    disabled={!koCible}
                    className="presentation-action-btn flex-shrink-0 disabled:opacity-40"
                  >
                    💀 K.O.
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 italic mt-1.5">
                  « Voile mystère » masque noms et HP des ennemis côté joueurs.
                </p>
              </div>

              {/* === Galerie d'images à pousser plein écran === */}
              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 block mb-2">
                  Galerie — image plein écran
                </label>
                {etat?.image_plein_ecran && (
                  <button
                    type="button"
                    onClick={() => sauverChamp({ image_plein_ecran: null })}
                    className="w-full mb-2 px-3 py-2 border border-red-700/50 text-red-300 rounded hover:bg-red-900/20 text-xs uppercase tracking-wider"
                  >
                    ✕ Retirer l&apos;image de l&apos;écran
                  </button>
                )}
                {galerie.length === 0 ? (
                  <p className="text-[10px] text-gray-500 italic">
                    Aucune image — ajoute des portraits/visuels à tes PNJ,
                    ennemis, items ou cartes.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto">
                    {galerie.map((img) => {
                      const actif = etat?.image_plein_ecran === img.url
                      return (
                        <button
                          key={img.url}
                          type="button"
                          onClick={() =>
                            sauverChamp({ image_plein_ecran: img.url })
                          }
                          title={`Afficher : ${img.label}`}
                          className={`relative aspect-square rounded overflow-hidden border transition ${
                            actif
                              ? 'border-yellow-500 ring-1 ring-yellow-500'
                              : 'border-gray-700 hover:border-yellow-600'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={img.label}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* === Ambiance sonore en boucle === */}
              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
                  Ambiance sonore (URL en boucle)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draftSon}
                    onChange={(e) => setDraftSon(e.target.value)}
                    placeholder="https://… .mp3"
                    className="flex-1 min-w-0 p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none focus:border-yellow-500 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      sauverChamp({ lieu_son: draftSon.trim() || null })
                    }
                    className="presentation-action-btn flex-shrink-0"
                  >
                    ▶ Lancer
                  </button>
                </div>
                {etat?.lieu_son && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-green-400 italic flex-shrink-0">
                      ♪ En boucle
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={etat.lieu_son_volume}
                      onChange={(e) =>
                        sauverChamp({ lieu_son_volume: Number(e.target.value) })
                      }
                      className="flex-1 accent-yellow-500"
                      aria-label="Volume de l'ambiance sonore"
                    />
                    <button
                      type="button"
                      onClick={() => sauverChamp({ lieu_son: null })}
                      className="text-[10px] text-red-300 hover:text-red-200 flex-shrink-0"
                    >
                      ✕ Couper
                    </button>
                  </div>
                )}
              </div>

              {/* === Ambiance visuelle du fond === */}
              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 block mb-2">
                  Ambiance visuelle du fond
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'auto', label: '✨ Auto' },
                    { key: 'combat', label: '⚔ Combat' },
                    { key: 'mystere', label: '🔮 Mystère' },
                    { key: 'exploration', label: '🧭 Exploration' }
                  ].map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => sauverChamp({ ambiance: a.key })}
                      className={`presentation-action-btn${
                        (etat?.ambiance ?? 'auto') === a.key ? ' is-on' : ''
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
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

            {/* Diffusion multi-écran : lien public sans login */}
            {isMj && (
              <div className="border-t border-gray-700 pt-4">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                  🎮 Diffusion multi-écran
                </p>
                {!sessionId ? (
                  <>
                    <button
                      type="button"
                      onClick={lancerDiffusion}
                      className="w-full px-4 py-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 text-sm uppercase tracking-wider"
                    >
                      🎮 Lancer la diffusion
                    </button>
                    <p className="text-[10px] text-gray-500 italic mt-2">
                      Génère un lien public — les joueurs ouvrent l&apos;écran sur
                      n&apos;importe quel appareil, sans compte.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        readOnly
                        value={sessionUrl}
                        className="flex-1 p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(sessionUrl)}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                        title="Copier le lien public"
                      >
                        📋
                      </button>
                    </div>
                    <div className="flex justify-center mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(sessionUrl)}`}
                        alt="QR code de l'écran joueurs public"
                        className="rounded bg-white p-2"
                        width={200}
                        height={200}
                      />
                    </div>
                    <p className="text-[10px] text-green-400 italic text-center mb-2">
                      ● Diffusion active — synchro temps réel
                    </p>
                    <button
                      type="button"
                      onClick={arreterDiffusion}
                      className="w-full px-3 py-2 border border-red-700/50 text-red-300 rounded hover:bg-red-900/20 text-xs uppercase tracking-wider"
                    >
                      ⏹ Arrêter la diffusion
                    </button>
                  </>
                )}
                {diffusionMsg && (
                  <p className="text-[10px] text-yellow-300 italic mt-2">
                    {diffusionMsg}
                  </p>
                )}
              </div>
            )}
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

// Bip discret pour la « Notif tour » — généré via Web Audio, aucun asset son
// requis. Échoue silencieusement si l'audio est indisponible.
function jouerBipNotif() {
  try {
    const Ctx = window.AudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.34)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.36)
    osc.onended = () => ctx.close()
  } catch {
    /* audio indisponible : le flash visuel suffit */
  }
}

// Formate des secondes en mm:ss.
function formatSecs(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Fonds cinématiques par ambiance (Phase 4). En 'auto', le client retombe sur
// 'combat' si un combat est actif, sinon 'normal'.
const AMBIANCE_FONDS: Record<string, string> = {
  normal:
    'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.10) 0%, transparent 55%), linear-gradient(180deg, #08090c 0%, #05060a 100%)',
  combat:
    'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 50%), radial-gradient(ellipse at 50% 110%, rgba(150,30,30,0.24) 0%, transparent 60%), linear-gradient(180deg, #0c0607 0%, #07050a 100%)',
  mystere:
    'radial-gradient(ellipse at 50% 0%, rgba(150,90,220,0.13) 0%, transparent 55%), radial-gradient(ellipse at 50% 110%, rgba(60,20,110,0.32) 0%, transparent 65%), linear-gradient(180deg, #0a0712 0%, #06040c 100%)',
  exploration:
    'radial-gradient(ellipse at 50% 0%, rgba(80,130,210,0.13) 0%, transparent 55%), radial-gradient(ellipse at 50% 110%, rgba(20,40,90,0.32) 0%, transparent 65%), linear-gradient(180deg, #060a12 0%, #05070c 100%)'
}

// ============================================================================
// DisplayView — vue plein écran "TV" pour les joueurs.
// Exporté : réutilisé tel quel par la route publique /presentation/[sessionId].
// ============================================================================

export function DisplayView({
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

  // Action rapide transitoire : on rejoue l'animation chaque fois que
  // `effet.ts` change (même si le type est identique).
  const [effetActif, setEffetActif] = useState<EffetRapide | null>(null)
  const effetTsRef = useRef<number | null>(etat?.effet?.ts ?? null)
  useEffect(() => {
    const effet = etat?.effet
    if (!effet || effet.ts === effetTsRef.current) return
    effetTsRef.current = effet.ts
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEffetActif(effet)
    if (effet.type === 'notif') jouerBipNotif()
    const duree = effet.type === 'notif' ? 1600 : 3200
    const timer = setTimeout(() => setEffetActif(null), duree)
    return () => clearTimeout(timer)
  }, [etat?.effet])

  // Intermission : minuteur qui compte depuis la mise en pause.
  const enPause = etat?.en_pause ?? false
  const [pauseSecs, setPauseSecs] = useState(0)
  useEffect(() => {
    if (!enPause) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPauseSecs(0)
    const t = setInterval(() => setPauseSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [enPause])

  // Ambiance visuelle (Phase 4) : 'auto' retombe sur combat / normal.
  const ambianceChoisie = etat?.ambiance && etat.ambiance !== 'auto'
    ? etat.ambiance
    : combat?.actif
    ? 'combat'
    : 'normal'
  const fond = AMBIANCE_FONDS[ambianceChoisie] ?? AMBIANCE_FONDS.normal

  // Ambiance sonore en boucle (Phase 4). L'autoplay peut être bloqué par le
  // navigateur tant qu'il n'y a pas eu d'interaction : on propose alors un
  // bouton « Activer le son ».
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioBloque, setAudioBloque] = useState(false)
  const lieuSon = etat?.lieu_son ?? null
  const lieuSonVolume = etat?.lieu_son_volume ?? 50
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.volume = Math.max(0, Math.min(1, lieuSonVolume / 100))
  }, [lieuSon, lieuSonVolume])
  useEffect(() => {
    const a = audioRef.current
    if (!a || !lieuSon) return
    a.play().catch(() => setAudioBloque(true))
  }, [lieuSon])

  return (
    <div
      ref={root}
      className={`min-h-screen text-white relative ${compact ? 'min-h-0' : ''}`}
      style={{
        // Fond cinématique piloté par l'ambiance choisie par le MJ.
        background: fond,
        transition: 'background 0.6s ease'
      }}
    >
      {/* Couche de particules dorées subtiles (optionnel, pur CSS). */}
      {!compact && <div className="presentation-particles" aria-hidden="true" />}

      {/* Ambiance sonore en boucle. */}
      {lieuSon && (
        <audio ref={audioRef} src={lieuSon} loop autoPlay preload="auto" />
      )}
      {!compact && lieuSon && audioBloque && (
        <button
          type="button"
          onClick={() => {
            audioRef.current
              ?.play()
              .then(() => setAudioBloque(false))
              .catch(() => {})
          }}
          className="presentation-son-activer"
        >
          🔊 Activer le son
        </button>
      )}
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

        {/* Narration poussée par le MJ — encadré or, citation italique, et
            historique des 2 textes précédents. `key` sur le ts pour rejouer
            l'animation de fade-in à chaque nouveau texte. */}
        {etat?.narration && (
          <section
            key={etat.narration_historique?.[0]?.ts ?? etat.narration}
            className="presentation-narration"
          >
            <p className="presentation-narration-label">Narration</p>
            <p
              className="presentation-narration-text"
              style={{ fontSize: compact ? 14 : 18 }}
            >
              « {etat.narration} »
            </p>
            {(etat.narration_historique?.length ?? 0) > 1 && (
              <div className="presentation-narration-histo">
                {etat.narration_historique.slice(1).map((h) => (
                  <p key={h.ts}>« {h.texte} »</p>
                ))}
              </div>
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

        {/* Rosters PJ + Ennemis — empilés, chacun en grille de cartes portraits */}
        <div className="space-y-6">
          <Roster
            titre="Compagnons"
            icone="🛡"
            variant="pj"
            currentTurnId={tourCourant?.id ?? null}
            entries={personnages.map((p) => ({
              id: p.id,
              nom: p.nom,
              sous: [p.classe, `Niv. ${p.niveau}`].filter(Boolean).join(' · '),
              hp: p.hp_actuel,
              hpMax: p.hp_max,
              image: p.image_url,
              conditions: Array.isArray(p.conditions) ? p.conditions : []
            }))}
            compact={compact}
            obscure={false}
            onAdd={onAddPj}
            addLabel="+ Ajouter un compagnon"
          />
          <Roster
            titre="Adversaires"
            icone="👹"
            variant="ennemi"
            currentTurnId={tourCourant?.id ?? null}
            entries={ennemis.map((e) => ({
              id: e.id,
              nom: ennemisVisibles ? e.nom : 'Créature obscure',
              sous: null,
              hp: ennemisVisibles ? e.hp_actuel : null,
              hpMax: ennemisVisibles ? e.hp_max : null,
              image: ennemisVisibles ? e.image_url : null,
              conditions:
                ennemisVisibles && Array.isArray(e.conditions) ? e.conditions : []
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

      {/* Overlays plein écran (image / effets / intermission) : `position:
          fixed` → ils ne doivent JAMAIS être rendus dans l'aperçu compact du
          panneau MJ, sinon ils débordent du cadre et recouvrent toute la page
          du MJ (le bouton « Reprendre » devient alors inatteignable). On les
          réserve donc à la vraie vue diffusion. */}
      {!compact && etat?.image_plein_ecran && (
        <div
          className="presentation-image-plein"
          style={{ backgroundImage: `url(${etat.image_plein_ecran})` }}
          aria-hidden="true"
        />
      )}

      {/* === Actions rapides : animations plein écran (transitoires) === */}
      {!compact && effetActif?.type === 'crit' && (
        <div className="presentation-effet presentation-effet-crit">
          <span className="presentation-effet-crit-text">CRITIQUE&nbsp;!</span>
          <span className="presentation-effet-crit-sub">20 naturel</span>
        </div>
      )}
      {!compact && effetActif?.type === 'ko' && (
        <div className="presentation-effet presentation-effet-ko">
          <span className="presentation-effet-ko-name">
            {effetActif.cible || 'Une créature'}
          </span>
          <span className="presentation-effet-ko-sub">est K.O.</span>
        </div>
      )}
      {!compact && effetActif?.type === 'notif' && (
        <div className="presentation-effet-notif" aria-hidden="true" />
      )}

      {/* === Intermission (Pause) — overlay soutenu avec minuteur === */}
      {!compact && enPause && (
        <div className="presentation-intermission">
          <p className="presentation-intermission-label">⏸ Intermission</p>
          <p className="presentation-intermission-timer">{formatSecs(pauseSecs)}</p>
          <p className="presentation-intermission-sub">
            La partie reprend dans un instant…
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Roster — groupe de cartes portraits (PJ ou ennemis)
// ============================================================================

type RosterEntry = {
  id: string
  nom: string
  sous: string | null
  hp: number | null
  hpMax: number | null
  image: string | null
  conditions: string[]
}

function Roster({
  titre,
  icone,
  variant,
  currentTurnId,
  entries,
  compact,
  obscure,
  onAdd,
  addLabel
}: {
  titre: string
  icone: string
  variant: 'pj' | 'ennemi'
  currentTurnId: string | null
  entries: RosterEntry[]
  compact: boolean
  obscure: boolean
  onAdd?: () => void
  addLabel?: string
}) {
  return (
    <div className={`presentation-roster presentation-roster-${variant}`}>
      <h3 className="presentation-roster-title">
        <span aria-hidden="true">{icone}</span>
        {titre}
        <span className="presentation-roster-count">({entries.length})</span>
      </h3>
      {entries.length === 0 ? (
        <p className="presentation-roster-empty">Aucun.</p>
      ) : (
        <div className={`presentation-roster-grid${compact ? ' is-compact' : ''}`}>
          {entries.map((e) => (
            <PresentationCard
              key={e.id}
              entry={e}
              variant={variant}
              obscure={obscure}
              isCurrentTurn={!!currentTurnId && currentTurnId === e.id}
            />
          ))}
        </div>
      )}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="presentation-roster-add"
        >
          {addLabel ?? '+ Ajouter'}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// PresentationCard — carte portrait d'un combattant
// ----------------------------------------------------------------------------
// Portrait circulaire, nom serif, barre HP, pastilles de conditions D&D, et
// états dynamiques : K.O. (grisé), tour en cours (glow doré), HP bas (barre
// qui clignote), flash rouge/vert sur dégât/soin.
// ============================================================================

function PresentationCard({
  entry,
  variant,
  obscure,
  isCurrentTurn
}: {
  entry: RosterEntry
  variant: 'pj' | 'ennemi'
  obscure: boolean
  isCurrentTurn: boolean
}) {
  const { hp, hpMax } = entry
  const hpKnown = hp !== null && hpMax !== null
  const ratio =
    hpKnown && (hpMax as number) > 0
      ? Math.max(0, Math.min(1, (hp as number) / (hpMax as number)))
      : 0
  const ko = hpKnown && (hp as number) <= 0
  const low = hpKnown && !ko && ratio <= 0.25

  // Flash dégât / soin : on compare le HP courant au HP précédent.
  const prevHpRef = useRef<number | null>(hp)
  const [flash, setFlash] = useState<'dmg' | 'heal' | null>(null)
  useEffect(() => {
    const prev = prevHpRef.current
    prevHpRef.current = hp
    if (hp === null || prev === null || hp === prev) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlash(hp < prev ? 'dmg' : 'heal')
    const timer = setTimeout(() => setFlash(null), 700)
    return () => clearTimeout(timer)
  }, [hp])

  // Conditions D&D résolues (icône + libellé), 3 visibles max.
  const conds = entry.conditions.filter(isConditionKey).map((k) => CONDITIONS_MAP[k])
  const condsVisibles = conds.slice(0, 3)
  const condsReste = conds.length - condsVisibles.length

  const initiales =
    entry.nom.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?'

  const classes = [
    'presentation-card',
    `presentation-card-${variant}`,
    ko ? 'is-ko' : '',
    isCurrentTurn && !ko ? 'is-turn' : '',
    low ? 'is-low' : '',
    flash === 'dmg' ? 'flash-dmg' : '',
    flash === 'heal' ? 'flash-heal' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <span className="presentation-card-corner tl" aria-hidden="true" />
      <span className="presentation-card-corner br" aria-hidden="true" />
      {ko && <span className="presentation-card-ko-badge">K.O.</span>}

      <div className="presentation-card-portrait">
        {entry.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.image} alt="" loading="lazy" />
        ) : (
          <span className="presentation-card-initials">
            {obscure ? '👤' : initiales}
          </span>
        )}
      </div>

      <p className="presentation-card-name">{entry.nom}</p>
      {entry.sous && <p className="presentation-card-sub">{entry.sous}</p>}

      {hpKnown ? (
        <>
          <div className="presentation-card-hp-track">
            <div
              className="presentation-card-hp-fill"
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          <p className="presentation-card-hp-text">
            {hp}/{hpMax} HP
          </p>
        </>
      ) : (
        <p className="presentation-card-hp-text presentation-card-hp-unknown">
          ?? / ?? HP
        </p>
      )}

      {condsVisibles.length > 0 && (
        <div className="presentation-card-conditions">
          {condsVisibles.map((c) => (
            <span
              key={c.key}
              className="presentation-condition-pill"
              title={`${c.nom} — ${c.description}`}
            >
              {c.icone}
            </span>
          ))}
          {condsReste > 0 && (
            <span
              className="presentation-condition-pill is-more"
              title={conds
                .slice(3)
                .map((c) => c.nom)
                .join(', ')}
            >
              +{condsReste}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
