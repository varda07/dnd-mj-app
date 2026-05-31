'use client'

// ============================================================================
// Roadmap Modes 1.1 — Navigation par onglets dans le dashboard MJ Présentation
// ----------------------------------------------------------------------------
// Tabs sticky en haut qui scroll vers la section correspondante, avec
// raccourcis clavier 1-6. Approche minimalement invasive : on n'a pas
// reconstruit la page complète (2000+ lignes), on offre juste un index
// navigable.
// Chaque section de la page doit avoir un id="mjtab-<key>" pour être ciblée.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'

type TabDef = { key: string; label: string; icon: string }

const TABS: TabDef[] = [
  { key: 'narration', label: 'Narration', icon: '📜' },
  { key: 'combat',    label: 'Combat',    icon: '⚔️' },
  { key: 'carte',     label: 'Carte',     icon: '🗺' },
  { key: 'notes',     label: 'Notes',     icon: '📝' },
  { key: 'sons',      label: 'Sons',      icon: '🎵' },
  { key: 'controle',  label: 'Contrôle',  icon: '⚙️' },
]

export default function PresentationTabsBar({
  defaultTab = 'narration',
}: {
  defaultTab?: string
}) {
  const [active, setActive] = useState(defaultTab)

  const scrollTo = useCallback((key: string) => {
    setActive(key)
    if (typeof window === 'undefined') return
    const el = document.getElementById(`mjtab-${key}`)
    if (el) {
      // Tient compte de la sticky tabs bar
      const y = el.getBoundingClientRect().top + window.scrollY - 92
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }, [])

  // Raccourcis clavier 1-6
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return
      }
      const idx = parseInt(e.key) - 1
      if (idx >= 0 && idx < TABS.length) scrollTo(TABS[idx].key)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [scrollTo])

  return (
    <nav
      aria-label="Navigation modes présentation"
      style={{
        position: 'sticky',
        top: 56,
        zIndex: 40,
        background: 'linear-gradient(180deg, rgba(17,24,39,0.92) 0%, rgba(17,24,39,0.78) 100%)',
        backdropFilter: 'blur(6px)',
        borderBottom: '1px solid rgba(201, 168, 76, 0.22)',
        marginBottom: 12,
        padding: '6px 0',
      }}
    >
      <div className="max-w-5xl mx-auto px-2 flex items-center gap-1 overflow-x-auto codex-scroll">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => scrollTo(t.key)}
            className={`codex-btn-press whitespace-nowrap rounded-md text-xs font-medium px-3 py-1.5 transition border flex items-center gap-1.5 ${
              active === t.key
                ? 'bg-yellow-500/15 border-yellow-500/60 text-yellow-200'
                : 'bg-transparent border-transparent text-gray-400 hover:text-yellow-300 hover:bg-yellow-500/5'
            }`}
            title={`${t.label} (raccourci ${i + 1})`}
          >
            <span aria-hidden>{t.icon}</span>
            <span>{t.label}</span>
            <span className="text-[9px] text-gray-500 ml-1 hidden md:inline">{i + 1}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
