'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import {
  construireEnveloppe,
  lireFichierJSON,
  nettoyer,
  ouvrirSelecteurFichier,
  telechargerJSON,
  validerEnveloppe
} from '@/app/lib/import-export'

// Normalise une chaîne pour comparaison : casse + diacritiques.
// "Épée éclair" → "epee eclair" — évite qu'une recherche "epee" rate l'élément.
const normaliser = (v: string) =>
  v.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

type Scenario = {
  id: string
  nom: string
  description: string | null
  bg_image_url: string | null
}

type Personnage = {
  id: string
  nom: string
  race: string | null
  classe: string | null
  niveau: number
  hp_max: number
  hp_actuel: number
  image_url: string | null
  scenario_id: string | null
}

type Ennemi = {
  id: string
  nom: string
  hp_max: number
  hp_actuel: number
  armure: number | null
  image_url: string | null
  scenario_id: string | null
}

type Item = {
  id: string
  nom: string
  description: string | null
  type: string | null
  rarete: string | null
  image_url: string | null
  scenario_id: string | null
}

type MapItem = {
  id: string
  nom: string
  description: string | null
  image_url: string | null
}

type Sort = {
  id: string
  nom: string
  niveau: number
  ecole: string | null
  description: string | null
  disponible: boolean
  personnage_id: string
}

type Pnj = {
  id: string
  nom: string
  race: string | null
  role: string | null
  description: string | null
  image_url: string | null
}

type Onglet = 'scenarios' | 'personnages' | 'ennemis' | 'items' | 'maps' | 'sorts' | 'pnj'

const ONGLET_KEY: Record<Onglet, string> = {
  scenarios: 'tab_scenarios',
  personnages: 'tab_characters',
  ennemis: 'tab_enemies',
  items: 'tab_items',
  maps: 'tab_maps',
  sorts: 'tab_spells',
  pnj: 'tab_pnj'
}
const ONGLETS: Onglet[] = ['scenarios', 'personnages', 'ennemis', 'items', 'maps', 'sorts', 'pnj']

export default function Bibliotheque() {
  const router = useRouter()
  const [onglet, setOnglet] = useState<Onglet>('scenarios')
  const [recherche, setRecherche] = useState('')
  const [loading, setLoading] = useState(true)
  const t = useTranslations('library')
  const tc = useTranslations('common')

  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const [ennemis, setEnnemis] = useState<Ennemi[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [maps, setMaps] = useState<MapItem[]>([])
  const [sorts, setSorts] = useState<Sort[]>([])
  const [pnj, setPnj] = useState<Pnj[]>([])
  const [ioMessage, setIoMessage] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const uid = user.id
    const [s, p, e, i, m, pn] = await Promise.all([
      supabase
        .from('scenarios')
        .select('id, nom, description, bg_image_url')
        .eq('mj_id', uid)
        .order('nom'),
      supabase
        .from('personnages')
        .select('id, nom, race, classe, niveau, hp_max, hp_actuel, image_url, scenario_id')
        .eq('joueur_id', uid)
        .order('nom'),
      supabase
        .from('ennemis')
        .select('id, nom, hp_max, hp_actuel, armure, image_url, scenario_id')
        .eq('mj_id', uid)
        .order('nom'),
      supabase
        .from('items')
        .select('id, nom, description, type, rarete, image_url, scenario_id')
        .eq('mj_id', uid)
        .order('nom'),
      supabase
        .from('maps')
        .select('id, nom, description, image_url')
        .eq('mj_id', uid)
        .order('nom'),
      supabase
        .from('pnj')
        .select('id, nom, race, role, description, image_url')
        .eq('mj_id', uid)
        .order('nom')
    ])
    if (s.data) setScenarios(s.data)
    if (p.data) setPersonnages(p.data)
    if (e.data) setEnnemis(e.data)
    if (i.data) setItems(i.data)
    if (m.data) setMaps(m.data)
    if (pn.data) setPnj(pn.data as Pnj[])
    const mesPersosIds = (p.data ?? []).map((pp) => pp.id)
    if (mesPersosIds.length > 0) {
      const { data: so } = await supabase
        .from('sorts')
        .select('id, nom, niveau, ecole, description, disponible, personnage_id')
        .in('personnage_id', mesPersosIds)
        .order('niveau')
        .order('nom')
      if (so) setSorts(so)
    } else {
      setSorts([])
    }
    setLoading(false)
  }
  useEffect(() => {
    fetchAll()
  }, [])

  const q = normaliser(recherche.trim())
  const match = (...champs: (string | null | undefined)[]) =>
    !q || champs.some((c) => c && normaliser(c).includes(q))

  const nomScenario = (id: string | null) =>
    id ? scenarios.find((s) => s.id === id)?.nom ?? null : null
  const nomPersonnage = (id: string) =>
    personnages.find((p) => p.id === id)?.nom ?? 'Inconnu'

  const scenariosFiltres = useMemo(
    () => scenarios.filter((s) => match(s.nom, s.description)),
    [scenarios, q]
  )
  const personnagesFiltres = useMemo(
    () =>
      personnages.filter((p) =>
        match(p.nom, p.race, p.classe, nomScenario(p.scenario_id))
      ),
    [personnages, scenarios, q]
  )
  const ennemisFiltres = useMemo(
    () => ennemis.filter((e) => match(e.nom, nomScenario(e.scenario_id))),
    [ennemis, scenarios, q]
  )
  const itemsFiltres = useMemo(
    () =>
      items.filter((i) =>
        match(i.nom, i.description, i.type, i.rarete, nomScenario(i.scenario_id))
      ),
    [items, scenarios, q]
  )
  const mapsFiltres = useMemo(
    () => maps.filter((m) => match(m.nom, m.description)),
    [maps, q]
  )
  const sortsFiltres = useMemo(
    () =>
      sorts.filter((s) =>
        match(s.nom, s.ecole, s.description, nomPersonnage(s.personnage_id))
      ),
    [sorts, personnages, q]
  )
  const pnjFiltres = useMemo(
    () => pnj.filter((p) => match(p.nom, p.race, p.role, p.description)),
    [pnj, q]
  )

  const compteurs: Record<Onglet, number> = {
    scenarios: scenariosFiltres.length,
    personnages: personnagesFiltres.length,
    ennemis: ennemisFiltres.length,
    items: itemsFiltres.length,
    maps: mapsFiltres.length,
    sorts: sortsFiltres.length,
    pnj: pnjFiltres.length
  }

  const vide = (
    <p className="text-gray-400 italic">
      {q ? t('no_results') : t('empty')}
    </p>
  )

  const exporterToutLaBibliotheque = async () => {
    setIoMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = user.id

    // Récupère les lignes complètes (pas celles déjà filtrées côté UI, qui
    // manquent des colonnes) pour un export exhaustif.
    const [fs, fp, fe, fi, fm] = await Promise.all([
      supabase.from('scenarios').select('*').eq('mj_id', uid),
      supabase.from('personnages').select('*').eq('joueur_id', uid),
      supabase.from('ennemis').select('*').eq('mj_id', uid),
      supabase.from('items').select('*').eq('mj_id', uid),
      supabase.from('maps').select('*').eq('mj_id', uid)
    ])
    const persosComplets = (fp.data ?? []) as Record<string, unknown>[]
    const persosMap = new Map<string, string>()
    persosComplets.forEach((p) => persosMap.set(String(p.id), String(p.nom ?? '')))
    const persoIds = persosComplets.map((p) => String(p.id))

    const fs_data = fs.data ?? []
    const fe_data = fe.data ?? []
    const fi_data = fi.data ?? []
    const fm_data = fm.data ?? []
    let fsorts: Record<string, unknown>[] = []
    if (persoIds.length > 0) {
      const { data: so } = await supabase
        .from('sorts')
        .select('*')
        .in('personnage_id', persoIds)
      fsorts = (so ?? []) as Record<string, unknown>[]
    }

    // Sorts : attache le nom du perso parent pour pouvoir réassocier à l'import.
    const sortsWithParent = fsorts.map((s) => {
      const cleaned = nettoyer(s)
      cleaned._personnage_nom = persosMap.get(String(s.personnage_id)) ?? null
      return cleaned
    })

    const env = construireEnveloppe('bibliotheque', {
      scenarios: fs_data.map((x) => nettoyer(x as Record<string, unknown>)),
      personnages: persosComplets.map((x) => nettoyer(x)),
      ennemis: fe_data.map((x) => nettoyer(x as Record<string, unknown>)),
      items: fi_data.map((x) => nettoyer(x as Record<string, unknown>)),
      maps: fm_data.map((x) => nettoyer(x as Record<string, unknown>)),
      sorts: sortsWithParent
    })

    const date = new Date().toISOString().slice(0, 10)
    telechargerJSON(`bibliotheque-${date}.json`, env)
  }

  type LibPayload = {
    scenarios?: Record<string, unknown>[]
    personnages?: Record<string, unknown>[]
    ennemis?: Record<string, unknown>[]
    items?: Record<string, unknown>[]
    maps?: Record<string, unknown>[]
    sorts?: Record<string, unknown>[]
  }

  const importerToutLaBibliotheque = () => {
    ouvrirSelecteurFichier(async (f) => {
      setIoMessage('')
      try {
        const raw = await lireFichierJSON(f)
        const env = validerEnveloppe<LibPayload>(raw, ['bibliotheque'])
        if (!window.confirm(t('import_confirm'))) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const uid = user.id
        const payload = env.data
        let total = 0

        if (payload.scenarios?.length) {
          const rows = payload.scenarios.map((x) => ({ ...nettoyer(x), mj_id: uid }))
          const { error } = await supabase.from('scenarios').insert(rows)
          if (error) throw error
          total += rows.length
        }

        // Personnages : on insère et on récupère les nouveaux IDs pour les sorts.
        const persoNomToId = new Map<string, string>()
        if (payload.personnages?.length) {
          const rows = payload.personnages.map((x) => ({ ...nettoyer(x), joueur_id: uid }))
          const { data, error } = await supabase
            .from('personnages')
            .insert(rows)
            .select('id, nom')
          if (error) throw error
          ;(data ?? []).forEach((d) => {
            const nom = String((d as { nom?: unknown }).nom ?? '')
            const id = String((d as { id?: unknown }).id ?? '')
            if (nom && id && !persoNomToId.has(nom)) persoNomToId.set(nom, id)
          })
          total += rows.length
        }

        if (payload.ennemis?.length) {
          const rows = payload.ennemis.map((x) => {
            const clean = nettoyer(x)
            const hp = typeof clean.hp_max === 'number' ? clean.hp_max : 10
            return { ...clean, hp_actuel: hp, mj_id: uid }
          })
          const { error } = await supabase.from('ennemis').insert(rows)
          if (error) throw error
          total += rows.length
        }

        if (payload.items?.length) {
          const rows = payload.items.map((x) => ({ ...nettoyer(x), mj_id: uid }))
          const { error } = await supabase.from('items').insert(rows)
          if (error) throw error
          total += rows.length
        }

        if (payload.maps?.length) {
          const rows = payload.maps.map((x) => ({ ...nettoyer(x), mj_id: uid }))
          const { error } = await supabase.from('maps').insert(rows)
          if (error) throw error
          total += rows.length
        }

        if (payload.sorts?.length) {
          // Cherche un perso de repli : soit premier importé, soit premier existant.
          const { data: existants } = await supabase
            .from('personnages')
            .select('id, nom')
            .eq('joueur_id', uid)
            .limit(1)
          const fallback = existants?.[0]?.id ? String(existants[0].id) : null
          if (!fallback && persoNomToId.size === 0) {
            throw new Error(t('import_need_char'))
          }
          const rows: Record<string, unknown>[] = []
          for (const s of payload.sorts) {
            const clean = { ...nettoyer(s) }
            const parentNom = typeof clean._personnage_nom === 'string' ? clean._personnage_nom : null
            delete clean._personnage_nom
            const pid = (parentNom && persoNomToId.get(parentNom)) ?? fallback
            if (!pid) continue
            rows.push({ ...clean, personnage_id: pid })
          }
          if (rows.length > 0) {
            const { error } = await supabase.from('sorts').insert(rows)
            if (error) throw error
            total += rows.length
          }
        }

        setIoMessage(t('import_done', { n: total }))
        fetchAll()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setIoMessage(tc('import_error', { message: msg }))
      }
    })
  }

  const fallback = (nom: string, couleur: string) => (
    <div
      className={`w-16 h-16 rounded flex items-center justify-center font-bold text-white text-lg flex-shrink-0 ${couleur}`}
    >
      {nom.slice(0, 2).toUpperCase() || '?'}
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white"
          >
            {tc('back')}
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">{t('title')}</h1>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg mb-4">
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
              aria-hidden="true"
            >
              🔎
            </span>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder={t('search_placeholder')}
              className="w-full pl-10 pr-10 p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none focus:border-yellow-600"
              aria-label={t('search_placeholder')}
            />
            {recherche && (
              <button
                type="button"
                onClick={() => setRecherche('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-gray-400 hover:text-white hover:bg-gray-600"
                aria-label={tc('close')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={exporterToutLaBibliotheque}
            className="px-3 py-2 rounded-lg font-bold text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 border border-yellow-600/40"
          >
            {t('export_all')}
          </button>
          <button
            type="button"
            onClick={importerToutLaBibliotheque}
            className="px-3 py-2 rounded-lg font-bold text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 border border-yellow-600/40"
          >
            {t('import_all')}
          </button>
        </div>
        {ioMessage && (
          <div className="mb-4 p-3 rounded bg-gray-800 border border-yellow-600/40 text-yellow-300 text-sm">
            {ioMessage}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {ONGLETS.map((id) => {
            const actif = onglet === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setOnglet(id)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                  actif
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {t(ONGLET_KEY[id])}
                <span
                  className={`ml-2 text-xs ${
                    actif ? 'text-gray-800' : 'text-gray-500'
                  }`}
                >
                  ({compteurs[id]})
                </span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <p className="text-gray-400">{tc('loading')}</p>
        ) : (
          <div className="space-y-3">
            {onglet === 'scenarios' && (
              scenariosFiltres.length === 0 ? vide : scenariosFiltres.map((s) => (
                <div key={s.id} className="bg-gray-800 p-4 rounded-lg flex gap-4">
                  {s.bg_image_url ? (
                    <img
                      src={s.bg_image_url}
                      alt={s.nom}
                      loading="lazy"
                      className="w-16 h-16 object-cover rounded bg-gray-900 flex-shrink-0"
                    />
                  ) : (
                    fallback(s.nom, 'bg-purple-600')
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white">{s.nom}</h3>
                    {s.description && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                        {s.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}

            {onglet === 'personnages' && (
              personnagesFiltres.length === 0 ? vide : personnagesFiltres.map((p) => (
                <div key={p.id} className="bg-gray-800 p-4 rounded-lg flex gap-4">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.nom}
                      loading="lazy"
                      className="w-16 h-16 object-cover rounded-full bg-gray-900 flex-shrink-0 ring-2 ring-blue-400"
                    />
                  ) : (
                    fallback(p.nom, 'bg-blue-500 rounded-full')
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white">{p.nom}</h3>
                    <p className="text-gray-400 text-sm">
                      {[p.race, p.classe].filter(Boolean).join(' · ')}
                      {p.niveau ? ` · Niv. ${p.niveau}` : ''}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      ❤️ {p.hp_actuel}/{p.hp_max}
                      {nomScenario(p.scenario_id) && (
                        <span className="ml-2">📖 {nomScenario(p.scenario_id)}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}

            {onglet === 'ennemis' && (
              ennemisFiltres.length === 0 ? vide : ennemisFiltres.map((e) => (
                <div key={e.id} className="bg-gray-800 p-4 rounded-lg flex gap-4">
                  {e.image_url ? (
                    <img
                      src={e.image_url}
                      alt={e.nom}
                      loading="lazy"
                      className="w-16 h-16 object-cover rounded bg-gray-900 flex-shrink-0 ring-2 ring-red-400"
                    />
                  ) : (
                    fallback(e.nom, 'bg-red-500')
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white">{e.nom}</h3>
                    <p className="text-gray-400 text-sm">
                      ❤️ {e.hp_actuel}/{e.hp_max}
                      {e.armure !== null && <span className="ml-2">🛡️ {e.armure}</span>}
                    </p>
                    {nomScenario(e.scenario_id) && (
                      <p className="text-gray-500 text-xs mt-1">
                        📖 {nomScenario(e.scenario_id)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}

            {onglet === 'items' && (
              itemsFiltres.length === 0 ? vide : itemsFiltres.map((i) => (
                <div key={i.id} className="bg-gray-800 p-4 rounded-lg flex gap-4">
                  {i.image_url ? (
                    <img
                      src={i.image_url}
                      alt={i.nom}
                      loading="lazy"
                      className="w-16 h-16 object-cover rounded bg-gray-900 flex-shrink-0"
                    />
                  ) : (
                    fallback(i.nom, 'bg-amber-600')
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white">{i.nom}</h3>
                    <p className="text-gray-400 text-sm">
                      {[i.type && `📦 ${i.type}`, i.rarete && `✨ ${i.rarete}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {i.description && (
                      <p className="text-gray-500 text-xs italic mt-1 line-clamp-2">
                        {i.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}

            {onglet === 'maps' && (
              mapsFiltres.length === 0 ? vide : mapsFiltres.map((m) => (
                <div key={m.id} className="bg-gray-800 p-4 rounded-lg flex gap-4">
                  {m.image_url ? (
                    <img
                      src={m.image_url}
                      alt={m.nom}
                      loading="lazy"
                      className="w-16 h-16 object-cover rounded bg-gray-900 flex-shrink-0"
                    />
                  ) : (
                    fallback(m.nom, 'bg-emerald-600')
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white">{m.nom}</h3>
                    {m.description && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                        {m.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}

            {onglet === 'sorts' && (
              sortsFiltres.length === 0 ? vide : sortsFiltres.map((s) => (
                <div
                  key={s.id}
                  className={`bg-gray-800 p-4 rounded-lg flex gap-4 ${
                    !s.disponible ? 'opacity-60' : ''
                  }`}
                >
                  {fallback(s.nom, 'bg-indigo-600')}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-lg font-bold ${
                        s.disponible ? 'text-white' : 'text-gray-500 line-through'
                      }`}
                    >
                      {s.nom}
                    </h3>
                    <p className="text-gray-400 text-sm flex gap-3 flex-wrap">
                      <span>🧙 {nomPersonnage(s.personnage_id)}</span>
                      <span>
                        🎯 {s.niveau === 0 ? 'Tour de magie' : `Niveau ${s.niveau}`}
                      </span>
                      {s.ecole && <span>📚 {s.ecole}</span>}
                    </p>
                    {s.description && (
                      <p className="text-gray-500 text-xs italic mt-1 line-clamp-2">
                        {s.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}

            {onglet === 'pnj' && (
              pnjFiltres.length === 0 ? vide : pnjFiltres.map((p) => (
                <div key={p.id} className="bg-gray-800 p-4 rounded-lg flex gap-4">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.nom}
                      loading="lazy"
                      className="w-16 h-16 object-cover rounded bg-gray-900 flex-shrink-0 ring-2 ring-emerald-500/40"
                    />
                  ) : (
                    fallback(p.nom, 'bg-emerald-600')
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white">{p.nom}</h3>
                    <p className="text-gray-400 text-sm">
                      {[p.race, p.role].filter(Boolean).join(' · ') || '—'}
                    </p>
                    {p.description && (
                      <p className="text-gray-500 text-xs italic mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}
