'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { openCommandPalette } from './CommandPalette'

type NavItem = {
  label: string
  icon: string
  href: string
  match?: (path: string) => boolean
}

type NavSection = {
  title: string
  items: NavItem[]
}

const SIDEBAR_OPEN_EVENT = 'sidebar:open'
const SIDEBAR_CLOSE_EVENT = 'sidebar:close'
const COLLAPSED_KEY = 'sidebar_collapsed'
const WIDTH_EXPANDED = '200px'
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
  const tSearch = useTranslations('search')
  const [drawerOuvert, setDrawerOuvert] = useState(false)
  const [replie, setReplie] = useState(false)

  // Restaure le pli depuis localStorage à l'hydratation. Léger flash possible
  // sur le premier paint — acceptable et évite le mismatch SSR.
  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSED_KEY)
    const initial = stored === '1'
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

  const sections: NavSection[] = [
    {
      title: t('section_forge'),
      items: [
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
        { label: t('forge_sorts'), icon: '✨', href: '/dashboard/sorts' }
      ]
    },
    {
      title: t('section_aventure'),
      items: [
        { label: t('adv_combat'), icon: '⚔', href: '/dashboard/combat' },
        { label: t('adv_exploration'), icon: '🧭', href: '/dashboard/exploration' }
      ]
    },
    {
      title: t('section_outils'),
      items: [
        { label: t('tools_library'), icon: '📚', href: '/dashboard/bibliotheque' },
        { label: t('tools_community'), icon: '🌍', href: '/dashboard/communaute' }
      ]
    }
  ]

  const aller = (href: string) => {
    setDrawerOuvert(false)
    router.push(href)
  }

  // Le pli (replie) ne s'applique qu'au mode desktop. Le drawer mobile reste
  // toujours en version étendue pour la lisibilité.
  const renderContenu = (compact: boolean) => {
    const renderItem = (item: NavItem) => {
      const isMaps = item.href === '/dashboard/maps'
      const actif = item.match
        ? item.match(pathname)
        : pathname === item.href ||
          (isMaps
            ? false
            : item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => aller(item.href)}
          title={compact ? item.label : undefined}
          aria-label={compact ? item.label : undefined}
          className={`w-full flex items-center ${
            compact ? 'justify-center px-0' : 'gap-2.5 px-3'
          } py-2 text-left text-[13px] tracking-wide transition border-l-2 ${
            actif
              ? 'border-l-[#C9A84C] text-[#C9A84C] bg-[rgba(201,168,76,0.08)]'
              : 'border-l-transparent text-[#a8a8b0] hover:text-white hover:bg-[rgba(201,168,76,0.05)]'
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

    return (
      <div className="h-full flex flex-col bg-[#12141a] border-r border-[rgba(201,168,76,0.2)]">
        <div
          className={`${
            compact ? 'px-2 pt-3 pb-2' : 'px-4 pt-4 pb-3'
          } border-b border-[rgba(201,168,76,0.15)]`}
        >
          {compact ? (
            <button
              type="button"
              onClick={() => aller('/dashboard')}
              className="block w-full text-center"
              aria-label={t('home')}
              title={t('home')}
            >
              <span
                className="text-[15px] font-bold tracking-tight text-[#C9A84C]"
                style={{ fontFamily: 'var(--font-cinzel), Cinzel, serif' }}
              >
                ⚒
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => aller('/dashboard')}
              className="block w-full text-left"
              aria-label={t('home')}
            >
              <p
                className="text-[13px] font-bold tracking-[0.2em] text-[#C9A84C] truncate"
                style={{ fontFamily: 'var(--font-cinzel), Cinzel, serif' }}
              >
                CODEX
              </p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#6a6a72] mt-0.5 truncate">
                {t('tagline')}
              </p>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setDrawerOuvert(false)
              openCommandPalette()
            }}
            className={`mt-3 w-full flex items-center ${
              compact ? 'justify-center px-0 py-1.5' : 'gap-2 px-2.5 py-1.5'
            } rounded border border-[rgba(201,168,76,0.2)] bg-[rgba(0,0,0,0.3)] hover:bg-[rgba(201,168,76,0.08)] text-[#a8a8b0] hover:text-white text-xs transition`}
            title={tSearch('open_tooltip')}
            aria-label={tSearch('open_tooltip')}
          >
            <span aria-hidden="true">🔎</span>
            {!compact && (
              <>
                <span className="flex-1 truncate text-left">
                  {tSearch('open_tooltip')}
                </span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-[#0a0b0d] border border-[rgba(201,168,76,0.2)] text-[#6a6a72] font-mono">
                  {tSearch('shortcut')}
                </kbd>
              </>
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 [scrollbar-width:thin]">
          {sections.map((section) => (
            <div key={section.title} className="mb-3">
              {compact ? (
                <div
                  className="mx-3 mb-1.5 h-px"
                  style={{ background: 'rgba(201,168,76,0.12)' }}
                  aria-hidden="true"
                />
              ) : (
                <p className="px-4 mb-1.5 text-[9px] uppercase tracking-[0.22em] text-[#6a6a72] font-bold">
                  {section.title}
                </p>
              )}
              <div>{section.items.map(renderItem)}</div>
            </div>
          ))}
        </nav>

        {!compact && (
          <div className="px-3 py-2 border-t border-[rgba(201,168,76,0.15)] text-[9px] uppercase tracking-[0.2em] text-[#6a6a72] text-center">
            Eclipsed Forge
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Bouton hamburger mobile : fixé en haut à gauche, devant le contenu. */}
      <button
        type="button"
        onClick={() => setDrawerOuvert(true)}
        aria-label={t('open_menu')}
        className="md:hidden fixed top-1.5 left-1.5 z-[80] w-9 h-9 flex items-center justify-center rounded bg-[#12141a]/90 border border-[rgba(201,168,76,0.3)] text-[#C9A84C] hover:bg-[#1a1d24] active:scale-95 transition"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ☰
        </span>
      </button>

      {/* Desktop : sidebar fixe, repliable. La largeur est animée. */}
      <aside
        className="hidden md:flex fixed top-0 left-0 bottom-0 z-[70] flex-col transition-[width] duration-200 ease-out"
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
          className="absolute top-3 -right-3 z-[71] w-6 h-6 flex items-center justify-center rounded-full bg-[#12141a] border border-[rgba(201,168,76,0.4)] text-[#C9A84C] hover:bg-[#1a1d24] hover:border-[#C9A84C] shadow-md transition text-[11px] leading-none"
        >
          {replie ? '▸' : '◂'}
        </button>
      </aside>

      {/* Mobile : drawer + overlay (toujours en mode étendu). */}
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
          className={`absolute top-0 left-0 bottom-0 w-[240px] max-w-[80vw] shadow-2xl transition-transform duration-200 ease-out ${
            drawerOuvert ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label={t('main_nav')}
        >
          {renderContenu(false)}
          <button
            type="button"
            onClick={() => setDrawerOuvert(false)}
            aria-label={t('close_menu')}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded text-[#6a6a72] hover:text-white hover:bg-[rgba(255,255,255,0.05)] text-lg"
          >
            ✕
          </button>
        </aside>
      </div>
    </>
  )
}
