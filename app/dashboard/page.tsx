'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { useFavoris, type FavoriType } from '@/app/lib/favoris'
import type { DashboardPrefs, WidgetInstance } from '@/app/lib/widgets'
import CustomDashboard from '@/app/components/CustomDashboard'

type ScenarioLite = { id: string; nom: string; actif?: boolean }
type PersoLite = {
  id: string
  nom: string
  classe: string | null
  niveau: number
  hp_actuel: number
  hp_max: number
  image_url: string | null
  scenario_id: string | null
}

type FavorisQuickItem = {
  type: FavoriType
  id: string
  nom: string
  image_url: string | null
  route: string
  icone: string
}

type ScenarioActif = {
  id: string
  nom: string
  description: string | null
  nbPersos: number
  nbEnnemis: number
  nbPnj: number
  combatActif: { round: number; tour: number } | null
}

export default function Dashboard() {
  const [interface_, setInterface] = useState<'mj' | 'joueur'>('mj')
  const [modeMJ, setModeMJ] = useState<'travail' | 'action'>('travail')
  // Scénario sélectionné dans le tableau de bord « Aventure ».
  const [scenarioAventureId, setScenarioAventureId] = useState('')
  const [userId, setUserId] = useState('')
  const [scenariosMj, setScenariosMj] = useState<ScenarioLite[]>([])
  const [scenarioCibleId, setScenarioCibleId] = useState('')
  const [codePersonnage, setCodePersonnage] = useState('')
  const [messageMj, setMessageMj] = useState('')
  const [scenariosRejoints, setScenariosRejoints] = useState<ScenarioLite[]>([])
  const [personnagesJoueurs, setPersonnagesJoueurs] = useState<PersoLite[]>([])
  const [scenarioActif, setScenarioActif] = useState<ScenarioActif | null>(null)
  // Modale "Ajouter un personnage joueur" — déclenchée par l'évènement
  // global `pj:ajouter:open` (dispatché depuis la sidebar).
  const [ajoutPjOuvert, setAjoutPjOuvert] = useState(false)
  const [favorisItems, setFavorisItems] = useState<FavorisQuickItem[]>([])
  // Configuration custom du dashboard (jsonb sur profiles). Si une config
  // est marquée active, elle remplace le grimoire par défaut côté MJ.
  const [customPrefs, setCustomPrefs] = useState<DashboardPrefs | null>(null)
  // Stats affichées dans les 4 "pages" en bas du grimoire (vue MJ)
  const [stats, setStats] = useState({
    personnages: 0,
    ennemis: 0,
    scenarios: 0,
    quetesActives: 0
  })
  const { favoris } = useFavoris()
  const router = useRouter()
  const t = useTranslations('dashboard')

  // Charge la config custom du dashboard (si l'utilisateur en a sauvegardé
  // une et l'a marquée active).
  useEffect(() => {
    let cancel = false
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('dashboard_config')
        .eq('id', user.id)
        .maybeSingle()
      if (cancel) return
      const raw = data?.dashboard_config as DashboardPrefs | null
      if (raw && Array.isArray(raw.configs)) setCustomPrefs(raw)
    }
    load()
    return () => {
      cancel = true
    }
  }, [])

  // Réordonne les widgets de la config active sur MOBILE (pile 1 colonne) et
  // persiste le nouvel ordre (champ `order`) sans toucher x/y (desktop intact).
  const reordonnerWidgetsMobile = useCallback(
    async (nouveaux: WidgetInstance[]) => {
      const activeId = customPrefs?.active
      if (!activeId || !customPrefs) return
      const next: DashboardPrefs = {
        ...customPrefs,
        configs: customPrefs.configs.map((c) =>
          c.id === activeId ? { ...c, widgets: nouveaux } : c
        )
      }
      setCustomPrefs(next)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from('profiles')
        .update({ dashboard_config: next })
        .eq('id', user.id)
    },
    [customPrefs]
  )

  // Écoute l'évènement global pour ouvrir la modale d'ajout de PJ depuis la
  // sidebar (ou n'importe quel point d'entrée externe).
  useEffect(() => {
    const onOpen = () => {
      setMessageMj('')
      setCodePersonnage('')
      setScenarioCibleId('')
      setAjoutPjOuvert(true)
    }
    window.addEventListener('pj:ajouter:open', onOpen)
    return () => window.removeEventListener('pj:ajouter:open', onOpen)
  }, [])

  // --------------------------------------------------------------------------
  // Charge le nom + image des éléments épinglés en favoris pour la section
  // « ⭐ Favoris » en haut du dashboard. Re-fetch à chaque changement de
  // la map (toggle d'étoile).
  // --------------------------------------------------------------------------
  useEffect(() => {
    let cancel = false
    const fetchAll = async () => {
      const out: FavorisQuickItem[] = []
      const tables: Array<{
        table: string
        type: FavoriType
        icone: string
        route: (id: string) => string
      }> = [
        { table: 'scenarios', type: 'scenarios', icone: '📖', route: (id) => `/dashboard/scenarios/${id}/edit` },
        { table: 'personnages', type: 'personnages', icone: '🎭', route: (id) => `/dashboard/personnages/${id}` },
        { table: 'pnj', type: 'pnj', icone: '🧑', route: (id) => `/dashboard/pnj/${id}` },
        { table: 'ennemis', type: 'ennemis', icone: '👹', route: () => `/dashboard/ennemis` },
        { table: 'items', type: 'items', icone: '🎒', route: () => `/dashboard/items` },
        { table: 'maps', type: 'maps', icone: '🗺️', route: () => `/dashboard/maps` },
        { table: 'sorts', type: 'sorts', icone: '✨', route: () => `/dashboard/sorts` }
      ]
      for (const conf of tables) {
        const ids = favoris[conf.type] ?? []
        if (ids.length === 0) continue
        // La table 'sorts' n'a pas de colonne image_url — on sélectionne donc
        // un superset (id + nom) et l'image_url uniquement quand disponible.
        const select = conf.table === 'sorts' ? 'id, nom' : 'id, nom, image_url'
        const res = await supabase
          .from(conf.table)
          .select(select)
          .in('id', ids)
        const rows = (res.data ?? []) as unknown as Array<{
          id: string
          nom: string
          image_url?: string | null
        }>
        rows.forEach((r) => {
          out.push({
            type: conf.type,
            id: r.id,
            nom: r.nom,
            image_url: r.image_url ?? null,
            route: conf.route(r.id),
            icone: conf.icone
          })
        })
      }
      if (!cancel) setFavorisItems(out)
    }
    fetchAll()
    return () => {
      cancel = true
    }
  }, [favoris])

  // --------------------------------------------------------------------------
  // Stats agrégées (vue MJ) : counts pour les 4 « pages » du grimoire.
  // ennemis et quetes sont récupérés via Supabase ; les autres dérivent de
  // l'état déjà chargé (scenariosMj, personnagesJoueurs).
  // --------------------------------------------------------------------------
  useEffect(() => {
    let cancel = false
    const loadStats = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [enn, qts] = await Promise.all([
        supabase
          .from('ennemis')
          .select('id', { count: 'exact', head: true })
          .eq('mj_id', user.id),
        // RLS filtre déjà les quêtes aux scénarios du MJ → un simple count
        // suffit.
        supabase
          .from('quetes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
      ])
      if (cancel) return
      setStats({
        personnages: personnagesJoueurs.length,
        ennemis: enn.count ?? 0,
        scenarios: scenariosMj.length,
        quetesActives: qts.count ?? 0
      })
    }
    loadStats()
    return () => {
      cancel = true
    }
  }, [personnagesJoueurs.length, scenariosMj.length])

  const fetchPersonnagesJoueurs = async (scenarioIds: string[]) => {
    if (scenarioIds.length === 0) {
      setPersonnagesJoueurs([])
      return
    }
    const { data } = await supabase
      .from('personnages')
      .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url, scenario_id')
      .in('scenario_id', scenarioIds)
      .order('nom')
    if (data) setPersonnagesJoueurs(data)
  }

  const chargerScenarioActif = async (
    id: string,
    nom: string,
    description: string | null
  ) => {
    const [persos, ennemis, liens, combat] = await Promise.all([
      supabase
        .from('personnages')
        .select('id', { count: 'exact', head: true })
        .eq('scenario_id', id),
      supabase
        .from('ennemis')
        .select('id', { count: 'exact', head: true })
        .eq('scenario_id', id),
      supabase
        .from('scenario_liens')
        .select('id', { count: 'exact', head: true })
        .eq('scenario_id', id)
        .eq('element_type', 'pnj'),
      supabase
        .from('combats')
        .select('round, tour_actuel, actif')
        .eq('scenario_id', id)
        .maybeSingle()
    ])
    setScenarioActif({
      id,
      nom,
      description,
      nbPersos: persos.count ?? 0,
      nbEnnemis: ennemis.count ?? 0,
      nbPnj: liens.count ?? 0,
      combatActif:
        combat.data?.actif
          ? { round: combat.data.round, tour: combat.data.tour_actuel }
          : null
    })
  }

  const desactiverScenarioActif = async () => {
    if (!scenarioActif) return
    if (!window.confirm(t('confirm_unset_active'))) return
    const idActif = scenarioActif.id
    setScenarioActif(null)
    setScenariosMj((prev) =>
      prev.map((s) => (s.id === idActif ? { ...s, actif: false } : s))
    )
    const { error } = await supabase
      .from('scenarios')
      .update({ actif: false })
      .eq('id', idActif)
    if (error) {
      // En cas d'échec, recharge l'état pour refléter la réalité.
      console.error('[scenario] désactivation échouée :', error)
      chargerScenarioActif(idActif, scenarioActif.nom, scenarioActif.description)
      setScenariosMj((prev) =>
        prev.map((s) => (s.id === idActif ? { ...s, actif: true } : s))
      )
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/')
        return
      }
      setUserId(data.user.id)
      const [{ data: mine }, { data: joined }] = await Promise.all([
        supabase
          .from('scenarios')
          .select('id, nom, description, actif')
          .eq('mj_id', data.user.id)
          .order('nom'),
        supabase
          .from('scenarios_joueurs')
          .select('scenario:scenarios(id, nom)')
          .eq('joueur_id', data.user.id)
      ])
      if (mine) {
        setScenariosMj(mine.map((s) => ({ id: s.id, nom: s.nom, actif: s.actif })))
        fetchPersonnagesJoueurs(mine.map((s) => s.id))
        const actif = mine.find((s) => s.actif)
        if (actif) {
          chargerScenarioActif(actif.id, actif.nom, actif.description)
        } else {
          setScenarioActif(null)
        }
      }
      if (joined) {
        const list = joined
          .map((r: { scenario: ScenarioLite | ScenarioLite[] | null }) =>
            Array.isArray(r.scenario) ? r.scenario[0] : r.scenario
          )
          .filter((s): s is ScenarioLite => !!s)
        setScenariosRejoints(list)
      }
    }
    init()
  }, [])

  const ajouterPersonnageAuScenario = async (): Promise<boolean> => {
    setMessageMj('')
    const code = codePersonnage.trim().toUpperCase()
    if (!code) { setMessageMj(t('enter_code')); return false }
    if (!scenarioCibleId) { setMessageMj(t('choose_scenario')); return false }

    const { data: invit, error: err1 } = await supabase
      .from('codes_invitation')
      .select('id, personnage_id, utilise')
      .eq('code', code)
      .maybeSingle()
    if (err1 || !invit) { setMessageMj(t('code_not_found')); return false }
    if (invit.utilise) { setMessageMj(t('code_already_used')); return false }
    if (!invit.personnage_id) { setMessageMj(t('code_not_player')); return false }

    const { error: err2 } = await supabase
      .from('personnages')
      .update({ scenario_id: scenarioCibleId })
      .eq('id', invit.personnage_id)
    if (err2) { setMessageMj(t('cannot_link', { message: err2.message })); return false }

    await supabase.from('codes_invitation').update({ utilise: true }).eq('id', invit.id)

    setMessageMj(t('character_added_ok'))
    setCodePersonnage('')
    fetchPersonnagesJoueurs(scenariosMj.map((s) => s.id))
    // Notifie la sidebar (et tout autre listener) qu'un PJ vient d'être ajouté
    // pour qu'elle rafraîchisse sa propre liste.
    window.dispatchEvent(new CustomEvent('pj:ajouter:done'))
    return true
  }

  const quitterScenario = async (scenarioId: string) => {
    if (!confirm(t('confirm_leave_scenario'))) return
    const { error } = await supabase
      .from('scenarios_joueurs')
      .delete()
      .eq('scenario_id', scenarioId)
      .eq('joueur_id', userId)
    if (error) {
      console.error('[scenario] quitter échec :', error)
      window.alert(t('cannot_leave', { message: error.message }))
      return
    }
    setScenariosRejoints((prev) => prev.filter((s) => s.id !== scenarioId))
  }

  // Scénario effectif du mode Aventure : choix explicite, sinon scénario actif,
  // sinon premier scénario du MJ.
  const scenarioAventureEffectif =
    scenarioAventureId || scenarioActif?.id || scenariosMj[0]?.id || ''

  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
      {/* Identité de l'app : titre + slogan en tout premier. */}
      <header className="dashboard-hero">
        <h1 className="grimoire-codex">MASTER SCREEN</h1>
        <p className="grimoire-slogan">— Fortis Fortuna Adiuvat —</p>
        <div className="grimoire-divider-line" />
      </header>
      {/* Sous le titre : bascule MJ/Joueur. Centrée sur mobile ET desktop. */}
      <div className="h-12 md:h-auto px-3 md:p-3 flex items-center justify-center gap-2 border-b border-[rgba(201,168,76,0.10)] theme-header-border theme-no-deco">
        <div className="grimoire-pill-group">
          <button
            type="button"
            onClick={() => setInterface('mj')}
            className={`grimoire-pill ${interface_ === 'mj' ? 'is-active' : ''}`}
          >
            {t('interface_mj')}
          </button>
          <button
            type="button"
            onClick={() => setInterface('joueur')}
            className={`grimoire-pill ${interface_ === 'joueur' ? 'is-active' : ''}`}
          >
            {t('interface_player')}
          </button>
        </div>
        <div className="theme-header-glow" />
      </div>
      {interface_ === 'mj' && (
        <div>
          <div className="px-3 py-2 md:py-3 flex justify-center gap-2 md:gap-3 theme-no-deco" style={{ borderBottom: '1px solid rgba(201,168,76,0.10)' }}>
            <button
              type="button"
              onClick={() => setModeMJ('travail')}
              className={`grimoire-tab ${modeMJ === 'travail' ? 'is-active' : ''}`}
            >
              {t('forge')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/personnages')}
              className="grimoire-tab md:hidden"
            >
              {t('characters_tab')}
            </button>
            <button
              type="button"
              onClick={() => setModeMJ('action')}
              className={`grimoire-tab hidden md:inline-flex ${modeMJ === 'action' ? 'is-active' : ''}`}
            >
              {t('adventure')}
            </button>
          </div>
          <div className="px-2 sm:px-3 md:px-4 py-3 md:py-5">
            {/* === MODE FORGE — favoris, dashboard perso ou grimoire === */}
            {modeMJ === 'travail' && (
            <>
            {favorisItems.length > 0 && (
              <section className="mb-4 md:mb-6 codex-card codex-surface p-3 md:p-4">
                <h3 className="codex-section-title codex-section-title-left text-yellow-500" style={{ fontSize: 10, margin: '4px 0 12px' }}>
                  ⭐ Favoris ({favorisItems.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {favorisItems.map((it) => (
                    <button
                      key={`${it.type}-${it.id}`}
                      type="button"
                      onClick={() => router.push(it.route)}
                      className="codex-press flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all duration-200"
                      style={{
                        background: 'linear-gradient(180deg, #0e1014 0%, #0a0c10 100%)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        color: 'var(--theme-text-primary, #e8e8ec)'
                      }}
                      title={`Ouvrir ${it.nom}`}
                    >
                      {it.image_url ? (
                        <img
                          src={it.image_url}
                          alt=""
                          loading="lazy"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <span>{it.icone}</span>
                      )}
                      <span className="text-gray-200 max-w-[200px] truncate">{it.nom}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {/* === DASHBOARD CUSTOM — remplace le grimoire si l'utilisateur
                a marqué une config personnalisée comme active. === */}
            {(() => {
              const active = customPrefs?.active
              const cfg = active
                ? customPrefs?.configs.find((c) => c.id === active)
                : null
              if (cfg) {
                return (
                  <section className="mb-4 md:mb-6">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <h2 className="codex-section-title codex-section-title-left text-yellow-500" style={{ fontSize: 10 }}>
                        🎨 {cfg.nom}
                      </h2>
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard/personnalisation')}
                        className="text-xs text-gray-400 hover:text-yellow-300 underline"
                      >
                        Modifier
                      </button>
                    </div>
                    <CustomDashboard widgets={cfg.widgets} onReorder={reordonnerWidgetsMobile} />
                  </section>
                )
              }
              return null
            })()}

            {/* === GRIMOIRE — autel central + 4 pages stats (fallback) === */}
            {!(customPrefs?.active && customPrefs?.configs.find((c) => c.id === customPrefs.active)) && (
            <section className="mb-4 md:mb-6 grimoire-frame">
              <span className="grimoire-diamond-top" aria-hidden="true">◆</span>
              <div className="grimoire-inner">
                {scenarioActif ? (
                  <>
                    <div className="grimoire-altar">
                      <span className="grimoire-altar-diamond left" aria-hidden="true">◆</span>
                      <span className="grimoire-altar-diamond right" aria-hidden="true">◆</span>
                      <p className="grimoire-altar-tag">Scénario actif</p>
                      <h3 className="grimoire-altar-name">{scenarioActif.nom}</h3>
                      {scenarioActif.description && (
                        <p className="grimoire-altar-desc">« {scenarioActif.description} »</p>
                      )}
                      {scenarioActif.combatActif && (
                        <p
                          className="grimoire-altar-desc"
                          style={{
                            color: 'rgba(252,165,165,0.85)',
                            marginTop: 8,
                            fontStyle: 'normal',
                            letterSpacing: '0.12em',
                            fontSize: 10,
                            textTransform: 'uppercase'
                          }}
                        >
                          ⚔ Combat en cours — Round {scenarioActif.combatActif.round} · Tour {scenarioActif.combatActif.tour + 1}
                        </p>
                      )}
                    </div>
                    <div className="grimoire-altar-actions">
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard/combat')}
                      >
                        ⚔ Combat
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard/exploration')}
                      >
                        🧭 Exploration
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/dashboard/scenarios/${scenarioActif.id}/notes`)
                        }
                      >
                        📝 Journal
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/dashboard/scenarios/${scenarioActif.id}/quetes`)
                        }
                      >
                        🎯 Quêtes
                      </button>
                      <button
                        type="button"
                        onClick={desactiverScenarioActif}
                        title={t('unset_active_tooltip')}
                        aria-label={t('unset_active_tooltip')}
                      >
                        ✕ Désactiver
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="grimoire-altar-empty">
                    Aucun scénario actif — choisis-en un dans la liste des scénarios.
                  </div>
                )}

                <div className="grimoire-stats">
                  <div className="grimoire-stat">
                    <p className="grimoire-stat-tag">Personnages</p>
                    <p className="grimoire-stat-value">{stats.personnages}</p>
                    <p className="grimoire-stat-label">actifs</p>
                  </div>
                  <div className="grimoire-stat">
                    <p className="grimoire-stat-tag">Ennemis</p>
                    <p className="grimoire-stat-value">{stats.ennemis}</p>
                    <p className="grimoire-stat-label">créés</p>
                  </div>
                  <div className="grimoire-stat">
                    <p className="grimoire-stat-tag">Scénarios</p>
                    <p className="grimoire-stat-value">{stats.scenarios}</p>
                    <p className="grimoire-stat-label">en cours</p>
                  </div>
                  <div className="grimoire-stat">
                    <p className="grimoire-stat-tag">Quêtes</p>
                    <p className="grimoire-stat-value">{stats.quetesActives}</p>
                    <p className="grimoire-stat-label">actives</p>
                  </div>
                </div>

                {/* === Accès rapide : 7 entités principales === */}
                <div className="grimoire-quick">
                  <p className="grimoire-quick-title">Accès rapide</p>
                  <div className="grimoire-quick-grid">
                    {[
                      { titre: 'Scénarios', desc: 'Créer et gérer tes aventures', href: '/dashboard/scenarios' },
                      { titre: '🛠 Préparer un combat', desc: 'Configurer des combats à l\'avance', href: '/dashboard/combat-prepare' },
                      { titre: '⚡ Combat rapide', desc: 'Lancer un combat sans diffusion', href: '/dashboard/combat-rapide' },
                      { titre: 'Personnages', desc: 'Fiches des joueurs et PJ', href: '/dashboard/personnages' },
                      { titre: 'Ennemis', desc: 'Bestiaire et adversaires', href: '/dashboard/ennemis' },
                      { titre: 'PNJ', desc: 'Personnages non-joueurs', href: '/dashboard/pnj' },
                      { titre: 'Items', desc: 'Équipement et trésors', href: '/dashboard/items' },
                      { titre: 'Maps', desc: "Cartes d'exploration", href: '/dashboard/maps' },
                      { titre: 'Sorts', desc: 'Grimoire de sorts', href: '/dashboard/sorts' }
                    ].map((it) => (
                      <button
                        key={it.href}
                        type="button"
                        className="grimoire-quick-card"
                        onClick={() => router.push(it.href)}
                      >
                        <p className="grimoire-quick-card-title">{it.titre}</p>
                        <p className="grimoire-quick-card-desc">{it.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            )}
            </>
            )}

            {/* La liste des Personnages des joueurs et le bouton "+ Ajouter"
                ont migré dans la sidebar gauche (section dédiée). La modale
                d'invitation reste rendue en bas de cette page et s'ouvre via
                l'évènement global `pj:ajouter:open`. */}

            {/* === MODE AVENTURE — tableau de bord dédié qui remplace le
                contenu central (au lieu d'ajouter le combat en bas de page). */}
            {modeMJ === 'action' && (
              <section className="mb-4 md:mb-6 grimoire-frame">
                <span className="grimoire-diamond-top" aria-hidden="true">◆</span>
                <div className="grimoire-inner">
                  <p className="grimoire-quick-title" style={{ marginBottom: 16 }}>
                    Mode Aventure
                  </p>
                  {scenariosMj.length === 0 ? (
                    <div className="grimoire-altar-empty">
                      Aucun scénario — crée d&apos;abord un scénario pour lancer une aventure.
                    </div>
                  ) : (
                    <>
                      <div className="grimoire-aventure-picker">
                        <label htmlFor="aventure-scenario">Scénario</label>
                        <select
                          id="aventure-scenario"
                          value={scenarioAventureEffectif}
                          onChange={(e) => setScenarioAventureId(e.target.value)}
                        >
                          {scenariosMj.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grimoire-aventure-grid">
                        {[
                          {
                            icon: '🛠',
                            titre: 'Préparer un combat',
                            desc: 'Configurer et sauvegarder des combats',
                            href: `/dashboard/combat-prepare?scenario=${scenarioAventureEffectif}`
                          },
                          {
                            icon: '⚡',
                            titre: 'Combat rapide',
                            desc: 'Version légère MJ seul, sans diffusion',
                            href: `/dashboard/combat-rapide?scenario=${scenarioAventureEffectif}`
                          },
                          {
                            icon: '⚔',
                            titre: 'Combat (grille)',
                            desc: 'Combat live complet avec grille tactique',
                            href: `/dashboard/combat?scenario=${scenarioAventureEffectif}`
                          },
                          {
                            icon: '🧭',
                            titre: 'Exploration',
                            desc: 'Carte partagée et brouillard de guerre',
                            href: `/dashboard/exploration?scenario=${scenarioAventureEffectif}`
                          },
                          {
                            icon: '📺',
                            titre: 'Présentation',
                            desc: 'Combat diffusé avec vue joueurs',
                            href: `/dashboard/presentation?scenario=${scenarioAventureEffectif}`
                          },
                          {
                            icon: '📝',
                            titre: 'Journal',
                            desc: 'Notes de session du scénario',
                            href: `/dashboard/scenarios/${scenarioAventureEffectif}/notes`
                          }
                        ].map((c) => (
                          <button
                            key={c.titre}
                            type="button"
                            className="grimoire-aventure-card"
                            onClick={() => router.push(c.href)}
                          >
                            <span className="grimoire-aventure-icon" aria-hidden="true">
                              {c.icon}
                            </span>
                            <p className="grimoire-aventure-card-title">{c.titre}</p>
                            <p className="grimoire-aventure-card-desc">{c.desc}</p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {interface_ === 'joueur' && (
        <div className="px-2 sm:px-3 md:px-4 py-3 md:py-5">
          <div className="joueur-screen codex-fade-in">
            <h2 className="joueur-title">{t('player_welcome_title')}</h2>
            <p className="joueur-subtitle">{t('player_welcome_msg')}</p>
            <div className="joueur-divider" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard/personnages')}
                className="joueur-card joueur-card-interactive text-left"
              >
                <h3 className="joueur-card-title">{t('characters_tab')}</h3>
                <p className="joueur-card-desc">{t('player_characters_manage_desc')}</p>
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/sorts')}
                className="joueur-card joueur-card-interactive text-left"
              >
                <h3 className="joueur-card-title">{t('menu_spells')}</h3>
                <p className="joueur-card-desc">{t('player_spells_manage_desc')}</p>
              </button>
            </div>

            <div className="joueur-divider" />

            <h3 className="joueur-card-title mb-3" style={{ letterSpacing: '0.12em' }}>
              {t('joined_scenarios_title')}
            </h3>
            {scenariosRejoints.length === 0 ? (
              <p className="joueur-subtitle" style={{ margin: 0 }}>
                {t('no_scenarios_joined')}
              </p>
            ) : (
              <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-2 px-2 pb-2 [scrollbar-width:thin]">
                {scenariosRejoints.map((s) => (
                  <li
                    key={s.id}
                    className="joueur-card snap-start flex-shrink-0 w-64 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-xl flex-shrink-0">📖</span>
                      <span
                        className="truncate"
                        style={{
                          fontFamily: 'Georgia, serif',
                          color: 'var(--theme-accent, #C9A84C)',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {s.nom}
                      </span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard/exploration')}
                        className="joueur-btn-explore"
                      >
                        {t('explore')}
                      </button>
                      <button
                        type="button"
                        onClick={() => quitterScenario(s.id)}
                        className="joueur-btn-leave"
                      >
                        {t('leave')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {ajoutPjOuvert && (
        <div
          className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-3"
          onClick={() => setAjoutPjOuvert(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('add_player_title')}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="grimoire-modal w-full max-w-md max-h-[calc(100vh-1.5rem)] overflow-y-auto"
          >
            <div className="grimoire-modal-header">
              <h3 className="grimoire-modal-title">{t('add_player_title')}</h3>
              <button
                type="button"
                onClick={() => setAjoutPjOuvert(false)}
                className="grimoire-modal-close"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className="grimoire-modal-body">
              <p className="grimoire-modal-desc">{t('add_player_desc')}</p>
              <label className="grimoire-modal-label">Code d&apos;invitation</label>
              <input
                type="text"
                value={codePersonnage}
                onChange={(e) => setCodePersonnage(e.target.value)}
                placeholder={t('menu_join_code_ph')}
                className="grimoire-modal-input grimoire-modal-input-mono"
                autoFocus
              />
              <label className="grimoire-modal-label" style={{ marginTop: 12 }}>
                Scénario cible
              </label>
              <select
                value={scenarioCibleId}
                onChange={(e) => setScenarioCibleId(e.target.value)}
                className="grimoire-modal-input"
              >
                <option value="">{t('add_player_choose_scenario')}</option>
                {scenariosMj.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
              {messageMj && (
                <p className="grimoire-modal-message">{messageMj}</p>
              )}
            </div>
            <div className="grimoire-modal-footer">
              <button
                type="button"
                onClick={() => setAjoutPjOuvert(false)}
                className="grimoire-modal-btn grimoire-modal-btn-ghost"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await ajouterPersonnageAuScenario()
                  if (ok) setAjoutPjOuvert(false)
                }}
                className="grimoire-modal-btn grimoire-modal-btn-primary"
              >
                {t('add_player_button')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* V1 3.3 — la barre de navigation mobile du bas a été supprimée (devenue
          inutile : navigation via le tiroir latéral + FABs dés/sons). Elle ne
          servait que sur l'accueil tout en réservant 56px partout, ce qui
          décalait le lanceur de dés sur mobile. */}
    </main>
  )
}