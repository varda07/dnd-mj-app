'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { openCommandPalette } from './CommandPalette'
import { useLocale } from '@/app/i18n/IntlProvider'
import { supabase } from '@/lib/supabase'
import { notifyOwnerOfEntity } from '@/app/lib/notifications'
import {
  THEMES,
  THEME_KEYS,
  DEFAULT_THEME,
  PREMIUM_THEMES,
  applyTheme,
  type ThemeKey
} from '@/app/styles/themes'

type NavItem = {
  label: string
  icon: string
  // Soit on navigue (href) soit on déclenche une action (action). L'un OU
  // l'autre — pas les deux. L'action est utilisée pour la Sound Box, qui
  // ouvre un panneau global plutôt que de changer de page.
  href?: string
  action?: () => void
  match?: (path: string) => boolean
}

type PjLite = {
  id: string
  nom: string
  classe: string | null
  niveau: number
  hp_actuel: number
  hp_max: number
  image_url: string | null
}

type NavSection = {
  id: string
  title: string
  items: NavItem[]
}

const SIDEBAR_OPEN_EVENT = 'sidebar:open'
const SIDEBAR_CLOSE_EVENT = 'sidebar:close'
const COLLAPSED_KEY = 'sidebar_collapsed'
// État déplié/replié de chaque section de nav (persisté entre sessions).
const SECTIONS_KEY = 'sidebar_sections_replie'
const WIDTH_EXPANDED = '220px'
const WIDTH_COLLAPSED = '52px'

export function openSidebar() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SIDEBAR_OPEN_EVENT))
  }
}

export function closeSidebar() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SIDEBAR_CLOSE_EVENT))
  }
}

const setLayoutWidth = (collapsed: boolean) => {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty(
    '--sidebar-w',
    collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED
  )
}

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const t = useTranslations('sidebar')
  const td = useTranslations('dashboard')
  const tSearch = useTranslations('search')
  const tLang = useTranslations('language')
  const { locale, setLocale } = useLocale()

  const [drawerOuvert, setDrawerOuvert] = useState(false)
  const [replie, setReplie] = useState(false)
  // États collapsibles pour les sous-menus paramètres
  const [themeOuvert, setThemeOuvert] = useState(false)
  const [langueOuvert, setLangueOuvert] = useState(false)
  const [rejoindreOuvert, setRejoindreOuvert] = useState(false)
  const [themeActuel, setThemeActuel] = useState<ThemeKey>(DEFAULT_THEME)
  const [codeScenario, setCodeScenario] = useState('')
  const [messageJoindre, setMessageJoindre] = useState('')
  // Personnages des joueurs liés aux scénarios du MJ — section "PJ" du menu.
  const [pjs, setPjs] = useState<PjLite[]>([])
  const [pjsOuvert, setPjsOuvert] = useState(true)
  // Sections de nav dépliables. Clé = id de section, valeur true = repliée.
  // Objet vide (défaut au premier chargement) = toutes les sections dépliées.
  const [sectionsReplie, setSectionsReplie] = useState<Record<string, boolean>>({})

  // --------------------------------------------------------------------------
  // Restauration de l'état replié
  // --------------------------------------------------------------------------
  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSED_KEY)
    const initial = stored === '1'
    // setState dans un effet : nécessaire pour lire localStorage côté client
    // sans casser l'hydratation SSR. Léger flash possible au premier paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReplie(initial)
    setLayoutWidth(initial)
  }, [])

  useEffect(() => {
    const open = () => setDrawerOuvert(true)
    const close = () => setDrawerOuvert(false)
    window.addEventListener(SIDEBAR_OPEN_EVENT, open)
    window.addEventListener(SIDEBAR_CLOSE_EVENT, close)
    return () => {
      window.removeEventListener(SIDEBAR_OPEN_EVENT, open)
      window.removeEventListener(SIDEBAR_CLOSE_EVENT, close)
    }
  }, [])

  // --------------------------------------------------------------------------
  // Restauration de l'état déplié/replié des sections de nav
  // --------------------------------------------------------------------------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SECTIONS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSectionsReplie(parsed as Record<string, boolean>)
        }
      }
    } catch {
      /* localStorage indisponible ou JSON corrompu : on garde tout déplié. */
    }
  }, [])

  // --------------------------------------------------------------------------
  // Charge le thème courant pour cocher la bonne entrée
  // --------------------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', user.id)
        .maybeSingle()
      const raw = data?.theme as string | undefined
      if (raw && raw in THEMES) setThemeActuel(raw as ThemeKey)
    }
    load()
  }, [])

  // --------------------------------------------------------------------------
  // Charge la liste des personnages des joueurs (liés à un scénario du MJ).
  // Refetch automatique quand l'évènement `pj:ajouter:done` est dispatché
  // (depuis la modale d'ajout, vivant dans le dashboard).
  // --------------------------------------------------------------------------
  const fetchPjs = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setPjs([])
      return
    }
    // Récupère d'abord les scénarios du MJ pour filtrer les PJ associés.
    const { data: mesScenarios } = await supabase
      .from('scenarios')
      .select('id')
      .eq('mj_id', user.id)
    const ids = (mesScenarios ?? []).map((s: { id: string }) => s.id)
    if (ids.length === 0) {
      setPjs([])
      return
    }
    const { data } = await supabase
      .from('personnages')
      .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url')
      .in('scenario_id', ids)
      .order('nom')
    setPjs((data ?? []) as PjLite[])
  }

  useEffect(() => {
    fetchPjs()
    const onAdded = () => fetchPjs()
    window.addEventListener('pj:ajouter:done', onAdded)
    return () => window.removeEventListener('pj:ajouter:done', onAdded)
  }, [])

  const togglerReplie = () => {
    setReplie((cur) => {
      const next = !cur
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* localStorage indisponible : on garde l'état en mémoire seulement. */
      }
      setLayoutWidth(next)
      return next
    })
  }

  // Déplie / replie une section de nav et persiste l'état.
  const toggleSection = (id: string) => {
    setSectionsReplie((cur) => {
      const next = { ...cur, [id]: !cur[id] }
      try {
        window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(next))
      } catch {
        /* localStorage indisponible : état conservé en mémoire seulement. */
      }
      return next
    })
  }

  const changerTheme = async (key: ThemeKey) => {
    applyTheme(key)
    setThemeActuel(key)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: existing } = await supabase
      .from('profiles')
      .select('username, role')
      .eq('id', user.id)
      .maybeSingle()
    const username = (existing?.username as string | undefined) ?? user.email ?? user.id
    const role = (existing?.role as string | undefined) ?? 'joueur'
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username, role, theme: key })
    if (error) console.error('[theme] save :', error)
  }

  const seDeconnecter = async () => {
    setDrawerOuvert(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  const refaireTutoriel = () => {
    setDrawerOuvert(false)
    window.dispatchEvent(new Event('onboarding:open'))
  }

  const rejoindreScenario = async () => {
    setMessageJoindre('')
    const code = codeScenario.trim().toUpperCase()
    if (!code) return setMessageJoindre(td('enter_code'))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: invit, error: err1 } = await supabase
      .from('codes_invitation')
      .select('id, scenario_id, utilise')
      .eq('code', code)
      .maybeSingle()
    if (err1 || !invit) return setMessageJoindre(td('code_not_found'))
    if (invit.utilise) return setMessageJoindre(td('code_already_used'))
    if (!invit.scenario_id) return setMessageJoindre(td('code_not_scenario'))
    const { error: err2 } = await supabase
      .from('scenarios_joueurs')
      .insert({ scenario_id: invit.scenario_id, joueur_id: user.id })
    if (err2 && !err2.message.toLowerCase().includes('duplicate')) {
      return setMessageJoindre(td('cannot_join', { message: err2.message }))
    }
    await supabase.from('codes_invitation').update({ utilise: true }).eq('id', invit.id)
    // Notifie le MJ du scénario qu'un joueur l'a rejoint.
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
    const username = (profile?.username as string | undefined) || user.email || 'Un joueur'
    await notifyOwnerOfEntity({
      entiteType: 'scenario',
      entiteId: invit.scenario_id,
      type: 'joueur',
      message: `🧑‍🤝‍🧑 ${username} a rejoint ton scénario`,
      lien: `/dashboard/scenarios/${invit.scenario_id}/edit`,
      exclureUserId: user.id
    })
    setMessageJoindre(td('scenario_joined_short'))
    setCodeScenario('')
  }

  // 📚 CODEX — la bibliothèque centralisée. Rendue à part (et pas via `sections`)
  // car elle intègre deux blocs spéciaux : les avatars « Personnages joueurs »
  // (après Personnages) et le panneau « Rejoindre un scénario » (à la fin).
  const codexItems: NavItem[] = [
    { label: t('forge_scenarios'), icon: '📖', href: '/dashboard/scenarios' },
    { label: t('forge_personnages'), icon: '🧙', href: '/dashboard/personnages' },
    { label: t('forge_ennemis'), icon: '👹', href: '/dashboard/ennemis' },
    { label: t('forge_pnj'), icon: '🧑', href: '/dashboard/pnj' },
    { label: t('forge_items'), icon: '🎒', href: '/dashboard/items' },
    {
      label: t('forge_maps'),
      icon: '🗺',
      href: '/dashboard/maps',
      match: (p) => p.startsWith('/dashboard/maps')
    },
    { label: t('forge_sorts'), icon: '✦', href: '/dashboard/sorts' },
    { label: t('tools_library'), icon: '📚', href: '/dashboard/bibliotheque' },
    { label: t('tools_community'), icon: '🌍', href: '/dashboard/communaute' }
  ]

  const sections: NavSection[] = [
    {
      // ⚔️ AVENTURE — ce qu'on joue activement.
      id: 'aventure',
      title: t('section_aventure'),
      items: [
        { label: t('adv_combat'), icon: '⚔', href: '/dashboard/combat' },
        { label: t('adv_exploration'), icon: '🏞', href: '/dashboard/exploration' },
        { label: t('adv_presentation'), icon: '📺', href: '/dashboard/presentation' }
      ]
    },
    {
      // ⚙️ OUTILS — utilitaires transverses.
      id: 'outils',
      title: t('section_outils'),
      items: [
        {
          label: t('tools_soundbox'),
          icon: '🎵',
          action: () => {
            setDrawerOuvert(false)
            window.dispatchEvent(new CustomEvent('soundbox:open'))
          }
        },
        { label: t('tools_customize'), icon: '🎨', href: '/dashboard/personnalisation' },
        { label: t('tools_accessibility'), icon: '♿', href: '/dashboard/accessibilite' },
        // Roadmap Affinement 4.4 — accès rapide au centre d'aide.
        { label: 'Aide', icon: '❓', href: '/dashboard/aide' }
      ]
    }
  ]

  const aller = (href: string) => {
    setDrawerOuvert(false)
    router.push(href)
  }

  const declencher = (item: NavItem) => {
    if (item.action) {
      item.action()
    } else if (item.href) {
      aller(item.href)
    }
  }

  // ---------------------------------------------------------------------------
  // Rendu du contenu (compact = desktop replié, sinon mobile drawer ou desktop)
  // ---------------------------------------------------------------------------
  const renderContenu = (compact: boolean) => {
    const renderNavItem = (item: NavItem) => {
      // Item de type action (Sound Box) : jamais marqué actif, on déclenche
      // simplement l'action au clic.
      const isAction = !item.href
      const isMaps = item.href === '/dashboard/maps'
      const actif = isAction
        ? false
        : item.match
        ? item.match(pathname)
        : pathname === item.href ||
          (isMaps
            ? false
            : item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
      return (
        <button
          key={item.href ?? `action-${item.label}`}
          type="button"
          onClick={() => declencher(item)}
          title={compact ? item.label : undefined}
          aria-label={compact ? item.label : undefined}
          className={`w-full flex items-center ${
            compact ? 'justify-center px-0' : 'gap-2.5 px-3'
          } py-2 text-left text-[13px] tracking-wide transition-all duration-150 border-l-2 ${
            actif
              ? 'border-l-[#C9A84C] text-[#C9A84C] bg-[rgba(201,168,76,0.08)]'
              : 'border-l-transparent text-[#a8a8b0] hover:text-white hover:bg-[rgba(201,168,76,0.05)] hover:border-l-[rgba(201,168,76,0.4)]'
          }`}
        >
          <span
            className="text-base leading-none w-5 text-center flex-shrink-0"
            aria-hidden="true"
          >
            {item.icon}
          </span>
          {!compact && <span className="truncate">{item.label}</span>}
        </button>
      )
    }

    // Item « collapsible » pour Thème/Langue/Rejoindre. En mode compact on
    // affiche juste un bouton qui (re)déplie la sidebar plutôt que d'ouvrir un
    // sous-menu inline.
    const renderToggleItem = (
      icon: string,
      label: string,
      ouvert: boolean,
      onToggle: () => void,
      meta?: string
    ) => {
      if (compact) {
        return (
          <button
            type="button"
            onClick={togglerReplie}
            title={label}
            aria-label={label}
            className="w-full flex items-center justify-center py-2 border-l-2 border-l-transparent text-[#a8a8b0] hover:text-white hover:bg-[rgba(201,168,76,0.05)] transition-all duration-150"
          >
            <span className="text-base leading-none">{icon}</span>
          </button>
        )
      }
      return (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={ouvert}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] tracking-wide border-l-2 border-l-transparent text-[#a8a8b0] hover:text-white hover:bg-[rgba(201,168,76,0.05)] hover:border-l-[rgba(201,168,76,0.4)] transition-all duration-150"
        >
          <span className="text-base leading-none w-5 text-center flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
          <span className="truncate flex-1">{label}</span>
          {meta && <span className="text-[10px] text-[#6a6a72] truncate">{meta}</span>}
          <span className="text-[10px] text-[#6a6a72]">{ouvert ? '▾' : '▸'}</span>
        </button>
      )
    }

    // Section de nav dépliable : titre cliquable (chevron + losange décoratif)
    // + corps animé via la transition grid-template-rows (0fr ↔ 1fr).
    // En mode compact (rail d'icônes), pas de titre : juste un filet + le corps.
    const renderCollapsible = (id: string, title: string, body: ReactNode) => {
      if (compact) {
        return (
          <div key={id} className="mb-3">
            <div
              className="mx-3 mb-1.5 h-px"
              style={{ background: 'rgba(201,168,76,0.12)' }}
              aria-hidden="true"
            />
            {body}
          </div>
        )
      }
      const replieSection = !!sectionsReplie[id]
      return (
        <div key={id} className="sidebar-section">
          <button
            type="button"
            onClick={() => toggleSection(id)}
            aria-expanded={!replieSection}
            className="sidebar-section-title"
          >
            <span className="sidebar-section-deco" aria-hidden="true">◆</span>
            <span className="sidebar-section-label">{title}</span>
            <span className="sidebar-section-chevron" aria-hidden="true">
              {replieSection ? '▸' : '▾'}
            </span>
          </button>
          <div
            className={`sidebar-section-body${replieSection ? ' is-collapsed' : ''}`}
          >
            <div className="sidebar-section-body-inner">{body}</div>
          </div>
        </div>
      )
    }

    return (
      <div className="h-full flex flex-col bg-[#12141a] border-l border-[rgba(201,168,76,0.15)]">
        {/* En-tête épuré : juste la recherche. L'identité MASTER SCREEN / La
            Forge Éclipsée est portée par le titre central du dashboard, plus
            par la sidebar. */}
        <div
          className={`${
            compact ? 'px-2 pt-3 pb-2' : 'px-3 pt-3 pb-2.5'
          } border-b border-[rgba(201,168,76,0.10)]`}
        >
          <button
            type="button"
            onClick={() => {
              setDrawerOuvert(false)
              openCommandPalette()
            }}
            className={`w-full flex items-center ${
              compact ? 'justify-center px-0 py-1.5' : 'gap-2 px-2.5 py-1.5'
            } rounded border border-[rgba(201,168,76,0.10)] bg-[rgba(0,0,0,0.3)] hover:bg-[rgba(201,168,76,0.08)] hover:border-[rgba(201,168,76,0.30)] text-[#a8a8b0] hover:text-white text-xs transition-all duration-150`}
            title={tSearch('open_tooltip')}
            aria-label={tSearch('open_tooltip')}
          >
            <span aria-hidden="true">🔎</span>
            {!compact && (
              <>
                <span className="flex-1 truncate text-left">
                  {tSearch('open_tooltip')}
                </span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-[#0a0b0d] border border-[rgba(201,168,76,0.10)] text-[#6a6a72] font-mono">
                  {tSearch('shortcut')}
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Sections de navigation */}
        <nav className="flex-1 overflow-y-auto py-3 [scrollbar-width:thin]">
          {/* ===== 📚 CODEX : bibliothèque + personnages joueurs + rejoindre ===== */}
          {renderCollapsible(
            'codex',
            t('section_forge'),
            <>
            {/* Scénarios + Personnages */}
            {codexItems.slice(0, 2).map(renderNavItem)}

          {/* ----- Personnages joueurs (avatars), juste après Personnages ----- */}
          <div className="mb-3">
            {compact ? (
              <div
                className="mx-3 mb-1.5 h-px"
                style={{ background: 'rgba(201,168,76,0.12)' }}
                aria-hidden="true"
              />
            ) : (
              <div className="px-4 mb-1.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPjsOuvert((v) => !v)}
                  aria-expanded={pjsOuvert}
                  className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] text-[#6a6a72] hover:text-[#a8a8b0] font-bold transition-colors"
                >
                  <span
                    className="inline-block text-[10px] transition-transform"
                    style={{ transform: pjsOuvert ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    aria-hidden="true"
                  >
                    ▸
                  </span>
                  <span>Personnages joueurs</span>
                  <span className="text-[#6a6a72]/80">({pjs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOuvert(false)
                    window.dispatchEvent(new CustomEvent('pj:ajouter:open'))
                  }}
                  title="Ajouter un personnage joueur via code d'invitation"
                  className="text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded text-[#C9A84C] hover:bg-[rgba(201,168,76,0.10)] border border-[rgba(201,168,76,0.20)] hover:border-[rgba(201,168,76,0.55)] transition-all"
                >
                  + Ajouter
                </button>
              </div>
            )}
            {compact ? (
              // En mode compact : un seul bouton "+" qui (re)déplie la sidebar
              // puis ouvre la modale via l'évènement global. Évite de tasser le
              // rail avec des avatars qu'on ne saurait pas lire.
              <button
                type="button"
                onClick={() => {
                  // Déplie la sidebar pour donner le contexte avant l'ajout.
                  togglerReplie()
                  window.dispatchEvent(new CustomEvent('pj:ajouter:open'))
                }}
                title="Ajouter un personnage joueur"
                aria-label="Ajouter un personnage joueur"
                className="w-full flex items-center justify-center py-2 border-l-2 border-l-transparent text-[#a8a8b0] hover:text-[#C9A84C] hover:bg-[rgba(201,168,76,0.05)] transition-all duration-150"
              >
                <span className="text-base leading-none" aria-hidden="true">🎭</span>
              </button>
            ) : (
              pjsOuvert && (
                <div className="px-2 space-y-1">
                  {pjs.length === 0 ? (
                    <p className="px-2 py-2 text-[10px] italic text-[#6a6a72] leading-relaxed">
                      Aucun PJ rattaché à un scénario.
                    </p>
                  ) : (
                    pjs.map((p) => {
                      const actif = pathname === `/dashboard/personnages/${p.id}`
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => aller(`/dashboard/personnages/${p.id}`)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[12px] transition-all ${
                            actif
                              ? 'text-[#C9A84C] bg-[rgba(201,168,76,0.08)]'
                              : 'text-[#a8a8b0] hover:text-white hover:bg-[rgba(201,168,76,0.05)]'
                          }`}
                          title={`${p.nom} — ${[p.classe, `Niv. ${p.niveau}`].filter(Boolean).join(' · ')}`}
                        >
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt=""
                              loading="lazy"
                              className="w-6 h-6 rounded-full object-cover flex-shrink-0 ring-1 ring-[rgba(201,168,76,0.30)]"
                            />
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-[rgba(201,168,76,0.10)] border border-[rgba(201,168,76,0.20)] flex items-center justify-center text-[9px] font-bold flex-shrink-0 text-[#C9A84C]">
                              {p.nom.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <span className="flex-1 truncate">{p.nom}</span>
                          <span className="text-[9px] text-[#6a6a72] flex-shrink-0">
                            N{p.niveau}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              )
            )}
          </div>

            {/* Ennemis, PNJ, Items, Maps, Sorts, Bibliothèque, Communauté */}
            {codexItems.slice(2).map(renderNavItem)}

            {/* ----- Rejoindre un scénario (code d'invitation) ----- */}
            {renderToggleItem(
              '🎟️',
              t('params_join'),
              rejoindreOuvert,
              () => setRejoindreOuvert((v) => !v)
            )}
            {!compact && rejoindreOuvert && (
              <div className="bg-[rgba(0,0,0,0.3)] border-y border-[rgba(201,168,76,0.08)] p-2 space-y-2">
                <p className="text-[10px] text-[#6a6a72] leading-relaxed">
                  {td('menu_join_placeholder')}
                </p>
                <input
                  type="text"
                  value={codeScenario}
                  onChange={(e) => setCodeScenario(e.target.value)}
                  placeholder={td('menu_join_code_ph')}
                  className="w-full p-1.5 rounded bg-[#0a0b0d] text-white border border-[rgba(201,168,76,0.15)] outline-none font-mono uppercase text-xs focus:border-[rgba(201,168,76,0.5)]"
                />
                <button
                  type="button"
                  onClick={rejoindreScenario}
                  className="w-full px-2 py-1.5 bg-[#C9A84C] text-[#0a0b0d] font-bold rounded hover:bg-[#d4b558] text-[11px] uppercase tracking-wider transition-all"
                >
                  {td('menu_join_button')}
                </button>
                {messageJoindre && (
                  <p className="text-yellow-400 text-[10px]">{messageJoindre}</p>
                )}
              </div>
            )}
            </>
          )}

          {/* ===== ⚔️ AVENTURE + ⚙️ OUTILS ===== */}
          {sections.map((section) =>
            renderCollapsible(
              section.id,
              section.title,
              <div>{section.items.map(renderNavItem)}</div>
            )
          )}

          {/* ===== 🔧 PARAMÈTRES ===== */}
          {renderCollapsible(
            'params',
            t('section_params'),
            <>
            {/* Langue */}
            {renderToggleItem(
              '🌍',
              t('params_language'),
              langueOuvert,
              () => setLangueOuvert((v) => !v),
              locale === 'fr' ? '🇫🇷' : '🇬🇧'
            )}
            {!compact && langueOuvert && (
              <div className="bg-[rgba(0,0,0,0.3)] border-y border-[rgba(201,168,76,0.08)] p-2 space-y-1">
                <button
                  type="button"
                  onClick={async () => {
                    await setLocale('fr')
                    setLangueOuvert(false)
                  }}
                  className={`w-full flex items-center gap-2 p-1.5 rounded text-left text-[12px] transition-all ${
                    locale === 'fr' ? 'bg-[rgba(201,168,76,0.12)] text-white font-bold' : 'text-[#a8a8b0] hover:bg-[rgba(201,168,76,0.06)]'
                  }`}
                >
                  <span className="flex-1">{tLang('fr')}</span>
                  {locale === 'fr' && <span className="text-green-400">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await setLocale('en')
                    setLangueOuvert(false)
                  }}
                  className={`w-full flex items-center gap-2 p-1.5 rounded text-left text-[12px] transition-all ${
                    locale === 'en' ? 'bg-[rgba(201,168,76,0.12)] text-white font-bold' : 'text-[#a8a8b0] hover:bg-[rgba(201,168,76,0.06)]'
                  }`}
                >
                  <span className="flex-1">{tLang('en')}</span>
                  {locale === 'en' && <span className="text-green-400">✓</span>}
                </button>
              </div>
            )}

            {/* Thème */}
            {renderToggleItem(
              '🎨',
              t('params_theme'),
              themeOuvert,
              () => setThemeOuvert((v) => !v),
              THEMES[themeActuel].label
            )}
            {!compact && themeOuvert && (
              <div className="bg-[rgba(0,0,0,0.3)] border-y border-[rgba(201,168,76,0.08)] p-2 space-y-1 max-h-80 overflow-y-auto [scrollbar-width:thin]">
                {THEME_KEYS.map((key) => {
                  const theme = THEMES[key]
                  const actif = themeActuel === key
                  const premium = PREMIUM_THEMES.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => changerTheme(key)}
                      className={`w-full flex items-center gap-2 p-1.5 rounded text-left transition-all ${
                        actif
                          ? 'bg-[rgba(201,168,76,0.12)] ring-1 ring-[rgba(201,168,76,0.4)]'
                          : 'hover:bg-[rgba(201,168,76,0.06)]'
                      } ${premium ? 'ring-1 ring-yellow-600/30' : ''}`}
                    >
                      <div
                        className="flex flex-shrink-0 rounded overflow-hidden"
                        style={{ border: `1px solid ${theme.colors.border_color}` }}
                      >
                        <span
                          className="block w-2 h-6"
                          style={{ backgroundColor: theme.colors.bg_primary }}
                        />
                        <span
                          className="block w-2 h-6"
                          style={{ backgroundColor: theme.colors.bg_secondary }}
                        />
                        <span
                          className="block w-2 h-6"
                          style={{ backgroundColor: theme.colors.accent_color }}
                        />
                      </div>
                      <span
                        className={`flex-1 text-[12px] truncate ${
                          actif ? 'text-white font-bold' : 'text-[#a8a8b0]'
                        }`}
                      >
                        {premium && <span className="mr-0.5">👑</span>}
                        {theme.label}
                      </span>
                      {actif && (
                        <span className="text-green-400 text-[11px] flex-shrink-0">✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Refaire le tutoriel */}
            <button
              type="button"
              onClick={refaireTutoriel}
              title={compact ? t('params_tutorial') : undefined}
              aria-label={compact ? t('params_tutorial') : undefined}
              className={`w-full flex items-center ${
                compact ? 'justify-center px-0' : 'gap-2.5 px-3'
              } py-2 text-left text-[13px] tracking-wide border-l-2 border-l-transparent text-[#a8a8b0] hover:text-white hover:bg-[rgba(201,168,76,0.05)] hover:border-l-[rgba(201,168,76,0.4)] transition-all duration-150`}
            >
              <span className="text-base leading-none w-5 text-center flex-shrink-0" aria-hidden="true">
                🎓
              </span>
              {!compact && <span className="truncate">{t('params_tutorial')}</span>}
            </button>
            </>
          )}
        </nav>

        {/* Pied de sidebar : déconnexion */}
        <div className="border-t border-[rgba(201,168,76,0.12)]">
          <button
            type="button"
            onClick={seDeconnecter}
            title={compact ? t('params_logout') : undefined}
            aria-label={compact ? t('params_logout') : undefined}
            className={`w-full flex items-center ${
              compact ? 'justify-center px-0' : 'gap-2.5 px-3'
            } py-2.5 text-left text-[13px] tracking-wide border-l-2 border-l-transparent text-[#a8a8b0] hover:text-red-300 hover:bg-[rgba(220,38,38,0.08)] hover:border-l-red-500/60 transition-all duration-150`}
          >
            <span className="text-base leading-none w-5 text-center flex-shrink-0" aria-hidden="true">
              🚪
            </span>
            {!compact && <span className="truncate">{t('params_logout')}</span>}
          </button>
          {!compact && (
            <div className="px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-[#6a6a72] text-center">
              Eclipsed Forge
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Bouton hamburger mobile : fixé en haut à droite, devant le contenu.
          Roadmap 1.7 — la sidebar s'ouvre depuis la droite désormais. */}
      <button
        type="button"
        onClick={() => setDrawerOuvert(true)}
        aria-label={t('open_menu')}
        className="md:hidden fixed top-1.5 right-1.5 z-[80] w-9 h-9 flex items-center justify-center rounded bg-[#12141a]/90 border border-[rgba(201,168,76,0.3)] text-[#C9A84C] hover:bg-[#1a1d24] active:scale-95 transition-all duration-150"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ☰
        </span>
      </button>

      {/* Desktop : sidebar fixe (à droite), repliable. La largeur est animée. */}
      <aside
        className="hidden md:flex fixed top-0 right-0 bottom-0 z-[70] flex-col transition-[width] duration-200 ease-out"
        aria-label={t('main_nav')}
        style={{ width: replie ? WIDTH_COLLAPSED : WIDTH_EXPANDED }}
      >
        {renderContenu(replie)}
        <button
          type="button"
          onClick={togglerReplie}
          aria-label={replie ? t('expand') : t('collapse')}
          aria-pressed={replie}
          title={replie ? t('expand') : t('collapse')}
          className="absolute top-3 -left-3 z-[71] w-6 h-6 flex items-center justify-center rounded-full bg-[#12141a] border border-[rgba(201,168,76,0.4)] text-[#C9A84C] hover:bg-[#1a1d24] hover:border-[#C9A84C] shadow-md transition-all duration-150 text-[11px] leading-none"
        >
          {replie ? '◂' : '▸'}
        </button>
      </aside>

      {/* Mobile : drawer + overlay (toujours en mode étendu). Slide depuis la
          droite désormais (roadmap 1.7). */}
      <div
        className={`md:hidden fixed inset-0 z-[90] transition-opacity duration-200 ${
          drawerOuvert ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!drawerOuvert}
      >
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setDrawerOuvert(false)}
        />
        <aside
          className={`absolute top-0 right-0 bottom-0 w-[260px] max-w-[85vw] shadow-2xl transition-transform duration-200 ease-out ${
            drawerOuvert ? 'translate-x-0' : 'translate-x-full'
          }`}
          aria-label={t('main_nav')}
        >
          {renderContenu(false)}
          <button
            type="button"
            onClick={() => setDrawerOuvert(false)}
            aria-label={t('close_menu')}
            className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center rounded text-[#6a6a72] hover:text-white hover:bg-[rgba(255,255,255,0.05)] text-lg transition-all"
          >
            ✕
          </button>
        </aside>
      </div>
    </>
  )
}
