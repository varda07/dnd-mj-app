'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'

// Normalise une chaîne pour matcher "epee" contre "Épée".
const normaliser = (v: string) =>
  v.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

type Category =
  | 'scenarios'
  | 'personnages'
  | 'ennemis'
  | 'items'
  | 'maps'
  | 'sorts'
  | 'communaute'

type Resultat = {
  id: string
  categorie: Category
  titre: string
  sous_titre?: string
  image_url?: string | null
  haystack: string
  href: string
}

const CATEGORY_LABEL_KEY: Record<Category, string> = {
  scenarios: 'section_scenarios',
  personnages: 'section_characters',
  ennemis: 'section_enemies',
  items: 'section_items',
  maps: 'section_maps',
  sorts: 'section_spells',
  communaute: 'section_community'
}

const CATEGORY_ORDER: Category[] = [
  'scenarios',
  'personnages',
  'ennemis',
  'items',
  'maps',
  'sorts',
  'communaute'
]

// Événement custom — permet d'ouvrir la recherche depuis n'importe où dans l'app
// sans passer par un contexte React.
export const GLOBAL_SEARCH_OPEN_EVENT = 'global-search:open'

export function openGlobalSearch() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GLOBAL_SEARCH_OPEN_EVENT))
  }
}

export default function GlobalSearch() {
  const router = useRouter()
  const t = useTranslations('search')
  const [ouvert, setOuvert] = useState(false)
  const [requete, setRequete] = useState('')
  const [chargement, setChargement] = useState(false)
  const [indexe, setIndexe] = useState<Resultat[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const indexeRef = useRef<Resultat[]>([])

  const fetchIndex = useCallback(async () => {
    setChargement(true)
    const resultats: Resultat[] = []

    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id

    // User's own content — en parallèle.
    const [mesScenarios, mesPersos, mesEnnemis, mesItems, mesMaps] = await Promise.all([
      uid
        ? supabase
            .from('scenarios')
            .select('id, nom, description')
            .eq('mj_id', uid)
            .limit(200)
        : Promise.resolve({ data: [] as { id: string; nom: string; description: string | null }[] }),
      uid
        ? supabase
            .from('personnages')
            .select('id, nom, race, classe, niveau, image_url')
            .eq('joueur_id', uid)
            .limit(200)
        : Promise.resolve({ data: [] as { id: string; nom: string; race: string | null; classe: string | null; niveau: number | null; image_url: string | null }[] }),
      uid
        ? supabase
            .from('ennemis')
            .select('id, nom, notes, image_url')
            .eq('mj_id', uid)
            .limit(200)
        : Promise.resolve({ data: [] as { id: string; nom: string; notes: string | null; image_url: string | null }[] }),
      uid
        ? supabase
            .from('items')
            .select('id, nom, description, type, rarete, image_url')
            .eq('mj_id', uid)
            .limit(200)
        : Promise.resolve({ data: [] as { id: string; nom: string; description: string | null; type: string | null; rarete: string | null; image_url: string | null }[] }),
      uid
        ? supabase
            .from('maps')
            .select('id, nom, description, image_url')
            .eq('mj_id', uid)
            .limit(200)
        : Promise.resolve({ data: [] as { id: string; nom: string; description: string | null; image_url: string | null }[] })
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

    // Sorts (via persos du user)
    if (perso_ids.length > 0) {
      const { data: mesSorts } = await supabase
        .from('sorts')
        .select('id, nom, niveau, ecole, description, personnage_id')
        .in('personnage_id', perso_ids)
        .limit(400)
      ;(mesSorts ?? []).forEach((s) => {
        resultats.push({
          id: `so-${s.id}`,
          categorie: 'sorts',
          titre: s.nom,
          sous_titre: [
            s.niveau === 0 ? 'Tour' : `Niv. ${s.niveau}`,
            s.ecole
          ]
            .filter(Boolean)
            .join(' · '),
          haystack: normaliser(
            [s.nom, s.ecole ?? '', s.description ?? ''].join(' ')
          ),
          href: `/dashboard/sorts`
        })
      })
    }

    // Communauté : tout contenu public — on n'essaie pas d'être exhaustif
    // sur tous les champs, juste les titres/desc principaux.
    const [comScenarios, comPersos, comEnnemis, comItems, comMaps, comSorts] = await Promise.all([
      supabase.from('scenarios').select('id, nom, description, auteur_username').eq('public', true).limit(100),
      supabase.from('personnages').select('id, nom, race, classe, auteur_username, image_url').eq('public', true).limit(100),
      supabase.from('ennemis').select('id, nom, auteur_username, image_url').eq('public', true).limit(100),
      supabase.from('items').select('id, nom, description, type, auteur_username, image_url').eq('public', true).limit(100),
      supabase.from('maps').select('id, nom, description, auteur_username, image_url').eq('public', true).limit(100),
      supabase.from('sorts').select('id, nom, niveau, ecole, auteur_username').eq('public', true).limit(100)
    ])

    const pushCommunaute = (
      prefix: string,
      nom: string,
      extra: string[],
      auteur: string | null | undefined,
      image_url: string | null | undefined,
      id: string
    ) => {
      resultats.push({
        id: `c-${prefix}-${id}`,
        categorie: 'communaute',
        titre: nom,
        sous_titre: [t('from_community'), ...extra, auteur ? `👤 ${auteur}` : null]
          .filter(Boolean)
          .join(' · '),
        image_url: image_url ?? null,
        haystack: normaliser([nom, ...extra, auteur ?? ''].join(' ')),
        href: '/dashboard/communaute'
      })
    }

    ;(comScenarios.data ?? []).forEach((x) => pushCommunaute('s', x.nom, [x.description ?? ''], x.auteur_username, null, x.id))
    ;(comPersos.data ?? []).forEach((x) => pushCommunaute('p', x.nom, [x.race ?? '', x.classe ?? ''], x.auteur_username, x.image_url, x.id))
    ;(comEnnemis.data ?? []).forEach((x) => pushCommunaute('e', x.nom, [], x.auteur_username, x.image_url, x.id))
    ;(comItems.data ?? []).forEach((x) => pushCommunaute('i', x.nom, [x.type ?? '', x.description ?? ''], x.auteur_username, x.image_url, x.id))
    ;(comMaps.data ?? []).forEach((x) => pushCommunaute('m', x.nom, [x.description ?? ''], x.auteur_username, x.image_url, x.id))
    ;(comSorts.data ?? []).forEach((x) => pushCommunaute('so', x.nom, [x.ecole ?? '', x.niveau === 0 ? 'Tour' : `Niv. ${x.niveau}`], x.auteur_username, null, x.id))

    setIndexe(resultats)
    indexeRef.current = resultats
    setChargement(false)
  }, [t])

  // Ouvre la modale : via Ctrl+K, Cmd+K, ou événement custom.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOuvert(true)
      }
      if (e.key === 'Escape') setOuvert(false)
    }
    const onOpen = () => setOuvert(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(GLOBAL_SEARCH_OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(GLOBAL_SEARCH_OPEN_EVENT, onOpen)
    }
  }, [])

  // Au premier ouvert : charge l'index. Les re-ouvertures réutilisent le cache.
  useEffect(() => {
    if (ouvert && indexeRef.current.length === 0) {
      fetchIndex()
    }
    if (ouvert) {
      setRequete('')
      setSelectedIdx(0)
      // Focus input une fois rendu
      queueMicrotask(() => inputRef.current?.focus())
    }
  }, [ouvert, fetchIndex])

  const q = normaliser(requete.trim())
  const resultatsFiltres = useMemo(() => {
    if (!q) return [] as Resultat[]
    return indexe.filter((r) => r.haystack.includes(q)).slice(0, 80)
  }, [indexe, q])

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

  // Liste plate pour la navigation clavier.
  const flat = useMemo(
    () => groupes.flatMap((g) => g.items),
    [groupes]
  )

  useEffect(() => {
    if (selectedIdx >= flat.length) setSelectedIdx(0)
  }, [flat.length, selectedIdx])

  const aller = (r: Resultat) => {
    setOuvert(false)
    router.push(r.href)
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
      if (r) aller(r)
    }
  }

  if (!ouvert) return null

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 flex items-start justify-center p-4 md:p-6"
      onClick={() => setOuvert(false)}
      role="dialog"
      aria-modal="true"
      aria-label={t('placeholder')}
    >
      <div
        className="bg-gray-800 border border-yellow-700/40 rounded-xl shadow-2xl w-full max-w-2xl mt-10 md:mt-20 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <span
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl"
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
            className="w-full pl-12 pr-24 py-4 bg-gray-800 text-white text-lg outline-none border-b border-gray-700"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <kbd className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-700 border border-gray-600 text-gray-400 font-mono">
              Esc
            </kbd>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="w-8 h-8 rounded text-gray-400 hover:text-white hover:bg-gray-700 text-lg"
              aria-label={t('close')}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!q && (
            <p className="px-5 py-6 text-gray-400 text-sm text-center">
              {t('hint')}
            </p>
          )}

          {q && chargement && (
            <p className="px-5 py-6 text-gray-400 text-sm text-center">{t('loading')}</p>
          )}

          {q && !chargement && flat.length === 0 && (
            <p className="px-5 py-6 text-gray-400 text-sm text-center italic">
              {t('no_results')}
            </p>
          )}

          {q && !chargement && groupes.map((g) => (
            <div key={g.categorie} className="border-t border-gray-700/60 first:border-t-0">
              <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-yellow-500/80">
                {t(CATEGORY_LABEL_KEY[g.categorie])}
              </p>
              <ul>
                {g.items.map((r) => {
                  const idx = flat.indexOf(r)
                  const selected = idx === selectedIdx
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => aller(r)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition ${
                          selected ? 'bg-yellow-500/10' : 'hover:bg-gray-700/60'
                        }`}
                      >
                        {r.image_url ? (
                          <img
                            src={r.image_url}
                            alt=""
                            className="w-9 h-9 rounded object-cover bg-gray-900 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
                            {r.titre.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{r.titre}</p>
                          {r.sous_titre && (
                            <p className="text-gray-400 text-xs truncate">
                              {r.sous_titre}
                            </p>
                          )}
                        </div>
                        {selected && (
                          <kbd className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-700 border border-gray-600 text-gray-400 font-mono flex-shrink-0">
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
