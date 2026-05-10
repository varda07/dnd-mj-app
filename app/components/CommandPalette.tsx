'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'

// Normalise une chaîne pour matcher "epee" contre "Épée".
const normaliser = (v: string) =>
  v.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

type Category =
  | 'actions'
  | 'scenarios'
  | 'personnages'
  | 'ennemis'
  | 'pnj'
  | 'items'
  | 'maps'
  | 'sorts'

type ActionKey =
  | 'create_scenario'
  | 'open_combat'
  | 'open_exploration'
  | 'roll_d20'
  | 'open_library'
  | 'open_community'
  | 'open_dashboard'

type Resultat = {
  id: string
  categorie: Category
  titre: string
  sous_titre?: string
  image_url?: string | null
  haystack: string
  href?: string
  action?: ActionKey
  shortcut?: string
}

const CATEGORY_ORDER: Category[] = [
  'actions',
  'scenarios',
  'personnages',
  'ennemis',
  'pnj',
  'items',
  'maps',
  'sorts'
]

export const COMMAND_PALETTE_OPEN_EVENT = 'command-palette:open'

export function openCommandPalette() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT))
  }
}

export default function CommandPalette() {
  const router = useRouter()
  const t = useTranslations('palette')
  const tSearch = useTranslations('search')
  const [ouvert, setOuvert] = useState(false)
  const [requete, setRequete] = useState('')
  const [chargement, setChargement] = useState(false)
  const [indexe, setIndexe] = useState<Resultat[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const indexeRef = useRef<Resultat[]>([])

  // Actions toujours disponibles — même si l'utilisateur n'a rien tapé.
  const actions: Resultat[] = useMemo(() => {
    const list: Array<Omit<Resultat, 'haystack' | 'categorie'>> = [
      {
        id: 'a-home',
        action: 'open_dashboard',
        titre: t('action_home'),
        sous_titre: t('action_home_desc')
      },
      {
        id: 'a-create-scenario',
        action: 'create_scenario',
        titre: t('action_create_scenario'),
        sous_titre: t('action_create_scenario_desc'),
        shortcut: 'Ctrl+N'
      },
      {
        id: 'a-combat',
        action: 'open_combat',
        titre: t('action_combat'),
        sous_titre: t('action_combat_desc')
      },
      {
        id: 'a-explo',
        action: 'open_exploration',
        titre: t('action_exploration'),
        sous_titre: t('action_exploration_desc')
      },
      {
        id: 'a-roll',
        action: 'roll_d20',
        titre: t('action_roll_d20'),
        sous_titre: t('action_roll_d20_desc'),
        shortcut: 'Ctrl+D'
      },
      {
        id: 'a-library',
        action: 'open_library',
        titre: t('action_library'),
        sous_titre: t('action_library_desc')
      },
      {
        id: 'a-community',
        action: 'open_community',
        titre: t('action_community'),
        sous_titre: t('action_community_desc')
      }
    ]
    return list.map((a) => ({
      ...a,
      categorie: 'actions' as const,
      haystack: normaliser([a.titre, a.sous_titre ?? ''].join(' '))
    }))
  }, [t])

  const fetchIndex = useCallback(async () => {
    setChargement(true)
    const resultats: Resultat[] = []

    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id

    if (!uid) {
      setIndexe(resultats)
      indexeRef.current = resultats
      setChargement(false)
      return
    }

    const [mesScenarios, mesPersos, mesEnnemis, mesPnj, mesItems, mesMaps] = await Promise.all([
      supabase
        .from('scenarios')
        .select('id, nom, description')
        .eq('mj_id', uid)
        .limit(200),
      supabase
        .from('personnages')
        .select('id, nom, race, classe, niveau, image_url')
        .eq('joueur_id', uid)
        .limit(200),
      supabase
        .from('ennemis')
        .select('id, nom, notes, image_url')
        .eq('mj_id', uid)
        .limit(200),
      supabase
        .from('pnj')
        .select('id, nom, role, description')
        .eq('mj_id', uid)
        .limit(200),
      supabase
        .from('items')
        .select('id, nom, description, type, rarete, image_url')
        .eq('mj_id', uid)
        .limit(200),
      supabase
        .from('maps')
        .select('id, nom, description, image_url')
        .eq('mj_id', uid)
        .limit(200)
    ])

    ;(mesScenarios.data ?? []).forEach((s) => {
      resultats.push({
        id: `s-${s.id}`,
        categorie: 'scenarios',
        titre: s.nom,
        sous_titre: s.description ?? undefined,
        haystack: normaliser([s.nom, s.description ?? ''].join(' ')),
        href: `/dashboard/scenarios/${s.id}/notes`
      })
    })

    const perso_ids: string[] = []
    ;(mesPersos.data ?? []).forEach((p) => {
      perso_ids.push(p.id)
      resultats.push({
        id: `p-${p.id}`,
        categorie: 'personnages',
        titre: p.nom,
        sous_titre: [p.race, p.classe, p.niveau ? `Niv. ${p.niveau}` : null]
          .filter(Boolean)
          .join(' · '),
        image_url: p.image_url,
        haystack: normaliser([p.nom, p.race ?? '', p.classe ?? ''].join(' ')),
        href: `/dashboard/personnages/${p.id}`
      })
    })

    ;(mesEnnemis.data ?? []).forEach((e) => {
      resultats.push({
        id: `e-${e.id}`,
        categorie: 'ennemis',
        titre: e.nom,
        sous_titre: e.notes ?? undefined,
        image_url: e.image_url,
        haystack: normaliser([e.nom, e.notes ?? ''].join(' ')),
        href: `/dashboard/ennemis`
      })
    })

    ;(mesPnj.data ?? []).forEach((n) => {
      resultats.push({
        id: `n-${n.id}`,
        categorie: 'pnj',
        titre: n.nom,
        sous_titre: [n.role, n.description].filter(Boolean).join(' · ') || undefined,
        haystack: normaliser([n.nom, n.role ?? '', n.description ?? ''].join(' ')),
        href: `/dashboard/pnj`
      })
    })

    ;(mesItems.data ?? []).forEach((i) => {
      resultats.push({
        id: `i-${i.id}`,
        categorie: 'items',
        titre: i.nom,
        sous_titre: [i.type, i.rarete].filter(Boolean).join(' · ') || i.description || undefined,
        image_url: i.image_url,
        haystack: normaliser(
          [i.nom, i.description ?? '', i.type ?? '', i.rarete ?? ''].join(' ')
        ),
        href: `/dashboard/items`
      })
    })

    ;(mesMaps.data ?? []).forEach((m) => {
      resultats.push({
        id: `m-${m.id}`,
        categorie: 'maps',
        titre: m.nom,
        sous_titre: m.description ?? undefined,
        image_url: m.image_url,
        haystack: normaliser([m.nom, m.description ?? ''].join(' ')),
        href: `/dashboard/maps`
      })
    })

    if (perso_ids.length > 0) {
      const { data: mesSorts } = await supabase
        .from('sorts')
        .select('id, nom, niveau, ecole, description')
        .in('personnage_id', perso_ids)
        .limit(400)
      ;(mesSorts ?? []).forEach((s) => {
        resultats.push({
          id: `so-${s.id}`,
          categorie: 'sorts',
          titre: s.nom,
          sous_titre: [s.niveau === 0 ? 'Tour' : `Niv. ${s.niveau}`, s.ecole]
            .filter(Boolean)
            .join(' · '),
          haystack: normaliser(
            [s.nom, s.ecole ?? '', s.description ?? ''].join(' ')
          ),
          href: `/dashboard/sorts`
        })
      })
    }

    setIndexe(resultats)
    indexeRef.current = resultats
    setChargement(false)
  }, [])

  // Ouverture par Ctrl+K, événement custom, ou Ctrl+N / Ctrl+D pour les actions.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrlMeta = e.ctrlKey || e.metaKey
      if (ctrlMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOuvert(true)
        return
      }
      // Ctrl+N : créer un scénario, partout dans l'app.
      if (ctrlMeta && e.key.toLowerCase() === 'n') {
        const target = e.target as HTMLElement | null
        // Évite de capturer Ctrl+N quand l'utilisateur tape dans un champ.
        const tag = target?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
        e.preventDefault()
        setOuvert(false)
        router.push('/dashboard/scenarios')
        return
      }
      // Ctrl+D : ouvrir le lanceur de dés (D20).
      if (ctrlMeta && e.key.toLowerCase() === 'd') {
        const target = e.target as HTMLElement | null
        const tag = target?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
        e.preventDefault()
        setOuvert(false)
        window.dispatchEvent(new CustomEvent('dice:open', { detail: { dice: 'd20' } }))
        return
      }
      if (e.key === 'Escape') setOuvert(false)
    }
    const onOpen = () => setOuvert(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen)
    }
  }, [router])

  useEffect(() => {
    if (ouvert && indexeRef.current.length === 0) {
      fetchIndex()
    }
    if (ouvert) {
      setRequete('')
      setSelectedIdx(0)
      queueMicrotask(() => inputRef.current?.focus())
    }
  }, [ouvert, fetchIndex])

  const q = normaliser(requete.trim())
  const resultatsFiltres = useMemo(() => {
    // Quand vide → on n'affiche QUE les actions.
    if (!q) return actions
    const matched = indexe.filter((r) => r.haystack.includes(q)).slice(0, 80)
    const matchedActions = actions.filter((a) => a.haystack.includes(q))
    return [...matchedActions, ...matched]
  }, [indexe, q, actions])

  const groupes = useMemo(() => {
    const map = new Map<Category, Resultat[]>()
    resultatsFiltres.forEach((r) => {
      const arr = map.get(r.categorie) ?? []
      arr.push(r)
      map.set(r.categorie, arr)
    })
    return CATEGORY_ORDER
      .filter((c) => map.has(c))
      .map((c) => ({ categorie: c, items: map.get(c)! }))
  }, [resultatsFiltres])

  const flat = useMemo(
    () => groupes.flatMap((g) => g.items),
    [groupes]
  )

  useEffect(() => {
    if (selectedIdx >= flat.length) setSelectedIdx(0)
  }, [flat.length, selectedIdx])

  const declencher = (r: Resultat) => {
    setOuvert(false)
    if (r.action) {
      switch (r.action) {
        case 'open_dashboard':
          router.push('/dashboard')
          break
        case 'create_scenario':
          router.push('/dashboard/scenarios')
          break
        case 'open_combat':
          router.push('/dashboard/combat')
          break
        case 'open_exploration':
          router.push('/dashboard/exploration')
          break
        case 'open_library':
          router.push('/dashboard/bibliotheque')
          break
        case 'open_community':
          router.push('/dashboard/communaute')
          break
        case 'roll_d20':
          window.dispatchEvent(
            new CustomEvent('dice:open', { detail: { dice: 'd20' } })
          )
          break
      }
      return
    }
    if (r.href) router.push(r.href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const r = flat[selectedIdx]
      if (r) declencher(r)
    }
  }

  if (!ouvert) return null

  const labelCategorie = (c: Category) => t(`section_${c}`)

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/75 flex items-start justify-center p-4 md:p-6"
      onClick={() => setOuvert(false)}
      role="dialog"
      aria-modal="true"
      aria-label={t('placeholder')}
    >
      <div
        className="w-full max-w-2xl mt-10 md:mt-20 overflow-hidden rounded-xl shadow-2xl"
        style={{
          background: '#12141a',
          border: '1px solid rgba(201,168,76,0.4)',
          boxShadow:
            '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.1) inset'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <span
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#C9A84C] text-xl"
            aria-hidden="true"
          >
            🔎
          </span>
          <input
            ref={inputRef}
            type="text"
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('placeholder')}
            className="w-full pl-12 pr-24 py-4 bg-transparent text-white text-lg outline-none border-b"
            style={{ borderColor: 'rgba(201,168,76,0.2)' }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <kbd
              className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: '#a8a8b0'
              }}
            >
              Esc
            </kbd>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="w-8 h-8 rounded text-[#a8a8b0] hover:text-white hover:bg-[rgba(201,168,76,0.08)] text-lg"
              aria-label={tSearch('close')}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto [scrollbar-width:thin]">
          {q && chargement && (
            <p className="px-5 py-6 text-[#a8a8b0] text-sm text-center">
              {tSearch('loading')}
            </p>
          )}

          {q && !chargement && flat.length === 0 && (
            <p className="px-5 py-6 text-[#a8a8b0] text-sm text-center italic">
              {tSearch('no_results')}
            </p>
          )}

          {groupes.map((g) => (
            <div
              key={g.categorie}
              className="border-t first:border-t-0"
              style={{ borderColor: 'rgba(201,168,76,0.1)' }}
            >
              <p
                className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.22em] font-bold"
                style={{ color: '#C9A84C' }}
              >
                {labelCategorie(g.categorie)}
              </p>
              <ul>
                {g.items.map((r) => {
                  const idx = flat.indexOf(r)
                  const selected = idx === selectedIdx
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => declencher(r)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition`}
                        style={{
                          background: selected
                            ? 'rgba(201,168,76,0.12)'
                            : 'transparent'
                        }}
                      >
                        {r.image_url ? (
                          <img
                            src={r.image_url}
                            alt=""
                            loading="lazy"
                            className="w-9 h-9 rounded object-cover bg-black/40 flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid rgba(201,168,76,0.15)',
                              color: '#C9A84C'
                            }}
                          >
                            {r.action ? '⚡' : r.titre.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{r.titre}</p>
                          {r.sous_titre && (
                            <p className="text-[#a8a8b0] text-xs truncate">
                              {r.sous_titre}
                            </p>
                          )}
                        </div>
                        {r.shortcut && (
                          <kbd
                            className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0"
                            style={{
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid rgba(201,168,76,0.2)',
                              color: '#a8a8b0'
                            }}
                          >
                            {r.shortcut}
                          </kbd>
                        )}
                        {selected && !r.shortcut && (
                          <kbd
                            className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0"
                            style={{
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid rgba(201,168,76,0.2)',
                              color: '#a8a8b0'
                            }}
                          >
                            ↵
                          </kbd>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
