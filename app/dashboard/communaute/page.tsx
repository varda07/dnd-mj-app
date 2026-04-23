'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'

type Onglet = 'scenarios' | 'personnages' | 'ennemis' | 'items' | 'maps' | 'sorts'

type ScenarioRow = {
  id: string
  nom: string
  description: string | null
  notes: string | null
  auteur_username: string | null
  nb_copies: number
}

type PersonnageRow = {
  id: string
  nom: string
  race: string | null
  classe: string | null
  niveau: number | null
  hp_max: number | null
  hp_actuel: number | null
  force: number | null
  dexterite: number | null
  constitution: number | null
  intelligence: number | null
  sagesse: number | null
  charisme: number | null
  de_vie: string | null
  image_url: string | null
  sous_classe: string | null
  historique: string | null
  xp: number | null
  ca: number | null
  vitesse: number | null
  temp_hp: number | null
  saves_maitrises: unknown
  comp_maitrises: unknown
  comp_expertise: unknown
  armes: unknown
  equipement: string | null
  traits_espece: string | null
  traits_classe: string | null
  exploits: string | null
  langues: string | null
  autres_maitrises: string | null
  auteur_username: string | null
  nb_copies: number
}

type EnnemiRow = {
  id: string
  nom: string
  hp_max: number | null
  armure: number | null
  force: number | null
  dexterite: number | null
  constitution: number | null
  intelligence: number | null
  sagesse: number | null
  charisme: number | null
  notes: string | null
  image_url: string | null
  auteur_username: string | null
  nb_copies: number
}

type ItemRow = {
  id: string
  nom: string
  description: string | null
  type: string | null
  rarete: string | null
  image_url: string | null
  auteur_username: string | null
  nb_copies: number
}

type MapRow = {
  id: string
  nom: string
  description: string | null
  image_url: string | null
  auteur_username: string | null
  nb_copies: number
}

type SortRow = {
  id: string
  nom: string
  niveau: number
  ecole: string | null
  temps_incantation: string | null
  portee: string | null
  duree: string | null
  description: string | null
  auteur_username: string | null
  nb_copies: number
}

type PersoMini = { id: string; nom: string }

const ONGLETS_IDS: Onglet[] = ['scenarios', 'personnages', 'ennemis', 'items', 'maps', 'sorts']
const ONGLETS_KEY: Record<Onglet, string> = {
  scenarios: 'tab_scenarios',
  personnages: 'tab_characters',
  ennemis: 'tab_enemies',
  items: 'tab_items',
  maps: 'tab_maps',
  sorts: 'tab_spells'
}

export default function Communaute() {
  const router = useRouter()
  const [onglet, setOnglet] = useState<Onglet>('scenarios')
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([])
  const [personnages, setPersonnages] = useState<PersonnageRow[]>([])
  const [ennemis, setEnnemis] = useState<EnnemiRow[]>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [maps, setMaps] = useState<MapRow[]>([])
  const [sorts, setSorts] = useState<SortRow[]>([])
  const [mesPersos, setMesPersos] = useState<PersoMini[]>([])
  const [sortCiblePersoId, setSortCiblePersoId] = useState('')
  const [chargement, setChargement] = useState(false)
  const [message, setMessage] = useState('')
  const [copiesEnCours, setCopiesEnCours] = useState<Set<string>>(new Set())
  const t = useTranslations('community')
  const tc = useTranslations('common')

  useEffect(() => {
    chargerTout()
  }, [])

  const chargerTout = async () => {
    setChargement(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }

    const [scn, per, enn, itm, mps, srt, mesPer] = await Promise.all([
      supabase.from('scenarios').select('*').eq('public', true).order('nb_copies', { ascending: false }),
      supabase.from('personnages').select('*').eq('public', true).order('nb_copies', { ascending: false }),
      supabase.from('ennemis').select('*').eq('public', true).order('nb_copies', { ascending: false }),
      supabase.from('items').select('*').eq('public', true).order('nb_copies', { ascending: false }),
      supabase.from('maps').select('*').eq('public', true).order('nb_copies', { ascending: false }),
      supabase.from('sorts').select('*').eq('public', true).order('nb_copies', { ascending: false }),
      supabase.from('personnages').select('id, nom').eq('joueur_id', user.id).order('nom')
    ])

    if (scn.data) setScenarios(scn.data as ScenarioRow[])
    if (per.data) setPersonnages(per.data as PersonnageRow[])
    if (enn.data) setEnnemis(enn.data as EnnemiRow[])
    if (itm.data) setItems(itm.data as ItemRow[])
    if (mps.data) setMaps(mps.data as MapRow[])
    if (srt.data) setSorts(srt.data as SortRow[])
    if (mesPer.data) {
      setMesPersos(mesPer.data)
      if (mesPer.data.length > 0 && !sortCiblePersoId) {
        setSortCiblePersoId(mesPer.data[0].id)
      }
    }
    setChargement(false)
  }

  const marquerCopieEnCours = (id: string, en_cours: boolean) => {
    setCopiesEnCours((prev) => {
      const next = new Set(prev)
      if (en_cours) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const incrementerCompteur = async (p_table: string, p_id: string) => {
    await supabase.rpc('incrementer_nb_copies', { p_table, p_id })
  }

  const msgErr = (e: { message: string }) => t('error_prefix', { message: e.message })

  const copierScenario = async (s: ScenarioRow) => {
    marquerCopieEnCours(s.id, true)
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('scenarios').insert({
      mj_id: user.id,
      nom: `${s.nom} (copie)`,
      description: s.description ?? '',
      notes: s.notes ?? '',
      public: false,
      nb_copies: 0,
      auteur_username: null
    })
    marquerCopieEnCours(s.id, false)
    if (error) {
      setMessage(msgErr(error))
      return
    }
    await incrementerCompteur('scenarios', s.id)
    setMessage(t('copied_to_library', { nom: s.nom }))
    chargerTout()
  }

  const copierPersonnage = async (p: PersonnageRow) => {
    marquerCopieEnCours(p.id, true)
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('personnages').insert({
      joueur_id: user.id,
      scenario_id: null,
      nom: `${p.nom} (copie)`,
      race: p.race ?? '',
      classe: p.classe ?? '',
      niveau: p.niveau ?? 1,
      hp_max: p.hp_max ?? 10,
      hp_actuel: p.hp_max ?? 10,
      force: p.force ?? 10,
      dexterite: p.dexterite ?? 10,
      constitution: p.constitution ?? 10,
      intelligence: p.intelligence ?? 10,
      sagesse: p.sagesse ?? 10,
      charisme: p.charisme ?? 10,
      de_vie: p.de_vie ?? 'd8',
      image_url: p.image_url ?? '',
      sous_classe: p.sous_classe ?? '',
      historique: p.historique ?? '',
      xp: p.xp ?? 0,
      ca: p.ca ?? 10,
      vitesse: p.vitesse ?? 9,
      temp_hp: 0,
      saves_maitrises: p.saves_maitrises ?? {},
      comp_maitrises: p.comp_maitrises ?? {},
      comp_expertise: p.comp_expertise ?? {},
      armes: p.armes ?? [],
      equipement: p.equipement ?? '',
      traits_espece: p.traits_espece ?? '',
      traits_classe: p.traits_classe ?? '',
      exploits: p.exploits ?? '',
      langues: p.langues ?? '',
      autres_maitrises: p.autres_maitrises ?? '',
      public: false,
      nb_copies: 0,
      auteur_username: null
    })
    marquerCopieEnCours(p.id, false)
    if (error) {
      setMessage(msgErr(error))
      return
    }
    await incrementerCompteur('personnages', p.id)
    setMessage(t('copied_to_characters', { nom: p.nom }))
    chargerTout()
  }

  const copierEnnemi = async (e: EnnemiRow) => {
    marquerCopieEnCours(e.id, true)
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('ennemis').insert({
      mj_id: user.id,
      scenario_id: null,
      nom: `${e.nom} (copie)`,
      hp_max: e.hp_max ?? 10,
      hp_actuel: e.hp_max ?? 10,
      armure: e.armure ?? 10,
      force: e.force ?? 10,
      dexterite: e.dexterite ?? 10,
      constitution: e.constitution ?? 10,
      intelligence: e.intelligence ?? 10,
      sagesse: e.sagesse ?? 10,
      charisme: e.charisme ?? 10,
      notes: e.notes ?? '',
      image_url: e.image_url ?? null,
      public: false,
      nb_copies: 0,
      auteur_username: null
    })
    marquerCopieEnCours(e.id, false)
    if (error) {
      setMessage(msgErr(error))
      return
    }
    await incrementerCompteur('ennemis', e.id)
    setMessage(t('copied_to_enemies', { nom: e.nom }))
    chargerTout()
  }

  const copierItem = async (i: ItemRow) => {
    marquerCopieEnCours(i.id, true)
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('items').insert({
      mj_id: user.id,
      scenario_id: null,
      personnage_id: null,
      nom: `${i.nom} (copie)`,
      description: i.description ?? '',
      type: i.type ?? 'Autre',
      rarete: i.rarete ?? 'Commun',
      image_url: i.image_url ?? null,
      public: false,
      nb_copies: 0,
      auteur_username: null
    })
    marquerCopieEnCours(i.id, false)
    if (error) {
      setMessage(msgErr(error))
      return
    }
    await incrementerCompteur('items', i.id)
    setMessage(t('copied_to_items', { nom: i.nom }))
    chargerTout()
  }

  const copierMap = async (m: MapRow) => {
    marquerCopieEnCours(m.id, true)
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('maps').insert({
      mj_id: user.id,
      nom: `${m.nom} (copie)`,
      description: m.description ?? '',
      image_url: m.image_url ?? '',
      public: false,
      nb_copies: 0,
      auteur_username: null
    })
    marquerCopieEnCours(m.id, false)
    if (error) {
      setMessage(msgErr(error))
      return
    }
    await incrementerCompteur('maps', m.id)
    setMessage(t('copied_to_maps', { nom: m.nom }))
    chargerTout()
  }

  const copierSort = async (s: SortRow) => {
    if (!sortCiblePersoId) {
      setMessage(t('spell_need_target'))
      return
    }
    marquerCopieEnCours(s.id, true)
    setMessage('')
    const { error } = await supabase.from('sorts').insert({
      personnage_id: sortCiblePersoId,
      nom: `${s.nom} (copie)`,
      niveau: s.niveau,
      ecole: s.ecole ?? '',
      temps_incantation: s.temps_incantation,
      portee: s.portee,
      duree: s.duree,
      description: s.description ?? '',
      disponible: true,
      public: false,
      nb_copies: 0,
      auteur_username: null
    })
    marquerCopieEnCours(s.id, false)
    if (error) {
      setMessage(msgErr(error))
      return
    }
    await incrementerCompteur('sorts', s.id)
    setMessage(t('copied_to_character', { nom: s.nom }))
    chargerTout()
  }

  const meta = (auteur: string | null, copies: number) => (
    <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1 flex-wrap">
      <span>👤 {auteur ?? t('anonymous')}</span>
      <span>📥 {copies} {t('copies')}</span>
    </div>
  )

  const boutonCopier = (id: string, onClick: () => void) => {
    const enCours = copiesEnCours.has(id)
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={enCours}
        className="px-3 py-2 rounded bg-yellow-500 text-gray-900 text-xs font-bold hover:bg-yellow-400 disabled:opacity-50 whitespace-nowrap"
      >
        {enCours ? '…' : t('copy_button')}
      </button>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← {tc('back')}
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">{t('title')}</h1>
          <p className="text-gray-400 text-sm w-full md:w-auto md:ml-2">
            {t('subtitle')}
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 [scrollbar-width:thin]">
          {ONGLETS_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setOnglet(id)}
              className={`px-3 py-2 rounded-md text-sm font-bold whitespace-nowrap transition ${
                onglet === id
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {t(ONGLETS_KEY[id])}
            </button>
          ))}
        </div>

        {message && (
          <div className="mb-4 p-3 rounded bg-gray-800 border border-yellow-600/50 text-yellow-300 text-sm">
            {message}
          </div>
        )}

        {chargement && <p className="text-gray-400 text-sm">{tc('loading')}</p>}

        {!chargement && onglet === 'scenarios' && (
          <div className="space-y-3">
            {scenarios.length === 0 && (
              <p className="text-gray-400 text-sm italic">{t('empty_scenarios')}</p>
            )}
            {scenarios.map((s) => (
              <div key={s.id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white">{s.nom}</h3>
                    {meta(s.auteur_username, s.nb_copies)}
                    {s.description && (
                      <p className="text-gray-400 text-sm mt-2 line-clamp-3">{s.description}</p>
                    )}
                  </div>
                  {boutonCopier(s.id, () => copierScenario(s))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!chargement && onglet === 'personnages' && (
          <div className="space-y-3">
            {personnages.length === 0 && (
              <p className="text-gray-400 text-sm italic">{t('empty_characters')}</p>
            )}
            {personnages.map((p) => (
              <div key={p.id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-start gap-3 flex-wrap">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.nom}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-yellow-500 bg-gray-900 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold flex-shrink-0">
                      {p.nom.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white break-words">{p.nom}</h3>
                    <p className="text-gray-400 text-xs">
                      {[p.race, p.classe, p.niveau ? `Niv. ${p.niveau}` : null].filter(Boolean).join(' · ')}
                    </p>
                    {meta(p.auteur_username, p.nb_copies)}
                  </div>
                  {boutonCopier(p.id, () => copierPersonnage(p))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!chargement && onglet === 'ennemis' && (
          <div className="space-y-3">
            {ennemis.length === 0 && (
              <p className="text-gray-400 text-sm italic">{t('empty_enemies')}</p>
            )}
            {ennemis.map((e) => (
              <div key={e.id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-start gap-3 flex-wrap">
                  {e.image_url && (
                    <img
                      src={e.image_url}
                      alt={e.nom}
                      className="w-20 h-20 rounded object-cover bg-gray-900 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white break-words">{e.nom}</h3>
                    <p className="text-gray-400 text-xs">
                      ❤️ {e.hp_max ?? '?'} · 🛡️ {e.armure ?? '?'}
                    </p>
                    {meta(e.auteur_username, e.nb_copies)}
                    {e.notes && (
                      <p className="text-gray-500 text-xs italic mt-2 line-clamp-2">{e.notes}</p>
                    )}
                  </div>
                  {boutonCopier(e.id, () => copierEnnemi(e))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!chargement && onglet === 'items' && (
          <div className="space-y-3">
            {items.length === 0 && (
              <p className="text-gray-400 text-sm italic">{t('empty_items')}</p>
            )}
            {items.map((i) => (
              <div key={i.id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-start gap-3 flex-wrap">
                  {i.image_url && (
                    <img
                      src={i.image_url}
                      alt={i.nom}
                      className="w-16 h-16 rounded object-cover bg-gray-900 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white break-words">{i.nom}</h3>
                    <p className="text-gray-400 text-xs">
                      📦 {i.type ?? '?'} · ✨ {i.rarete ?? '?'}
                    </p>
                    {meta(i.auteur_username, i.nb_copies)}
                    {i.description && (
                      <p className="text-gray-500 text-xs italic mt-2 line-clamp-2">{i.description}</p>
                    )}
                  </div>
                  {boutonCopier(i.id, () => copierItem(i))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!chargement && onglet === 'maps' && (
          <div className="space-y-3">
            {maps.length === 0 && (
              <p className="text-gray-400 text-sm italic">{t('empty_maps')}</p>
            )}
            {maps.map((m) => (
              <div key={m.id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white break-words">{m.nom}</h3>
                    {meta(m.auteur_username, m.nb_copies)}
                  </div>
                  {boutonCopier(m.id, () => copierMap(m))}
                </div>
                {m.image_url && (
                  <img
                    src={m.image_url}
                    alt={m.nom}
                    className="w-full max-h-80 object-contain rounded bg-gray-900"
                  />
                )}
                {m.description && (
                  <p className="text-gray-500 text-xs italic mt-2">{m.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {!chargement && onglet === 'sorts' && (
          <div className="space-y-3">
            <div className="bg-gray-800 p-3 rounded-lg border border-yellow-600/30">
              <label className="text-[11px] uppercase tracking-[0.18em] text-gray-400 block mb-1">
                {t('spell_target_label')}
              </label>
              {mesPersos.length === 0 ? (
                <p className="text-gray-400 text-xs italic">
                  {t('spell_need_character')}
                </p>
              ) : (
                <select
                  value={sortCiblePersoId}
                  onChange={(e) => setSortCiblePersoId(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                >
                  {mesPersos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {sorts.length === 0 && (
              <p className="text-gray-400 text-sm italic">{t('empty_spells')}</p>
            )}
            {sorts.map((s) => (
              <div key={s.id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white break-words">
                      {s.nom}{' '}
                      <span className="text-yellow-500 text-sm">
                        ({s.niveau === 0 ? 'T0' : `L. ${s.niveau}`})
                      </span>
                    </h3>
                    <p className="text-gray-400 text-xs italic">{s.ecole ?? '—'}</p>
                    <div className="flex gap-3 text-[11px] text-gray-500 mt-1 flex-wrap">
                      {s.temps_incantation && <span>⏱ {s.temps_incantation}</span>}
                      {s.portee && <span>🎯 {s.portee}</span>}
                      {s.duree && <span>⌛ {s.duree}</span>}
                    </div>
                    {meta(s.auteur_username, s.nb_copies)}
                    {s.description && (
                      <p className="text-gray-500 text-xs italic mt-2 line-clamp-3">{s.description}</p>
                    )}
                  </div>
                  {boutonCopier(s.id, () => copierSort(s))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
