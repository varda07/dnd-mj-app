'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// ElementsScenarioPanel — Corrections V1 Vague 2 (1.2)
// ----------------------------------------------------------------------------
// Panneau du cockpit de diffusion donnant au MJ un accès RAPIDE aux éléments
// qu'il a liés au scénario actif (ennemis / PNJ / maps / items) SANS quitter la
// diffusion : consultation des fiches + affichage aux joueurs (image plein
// écran) pour ceux qui ont un visuel.
//
// Les liens vivent dans `scenario_liens` (element_type, element_id). La RLS
// autorise le MJ à lire les liens de SON scénario et ses propres entités.
// ============================================================================

type Ennemi = {
  id: string
  nom: string
  image_url: string | null
  hp_max: number | null
  armure: number | null
  comportement_tactique: string | null
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
}

type Pnj = {
  id: string
  nom: string
  image_url: string | null
  race: string | null
  role: string | null
  description: string | null
  personnalite: string | null
  secrets: string | null
}

type MapItem = { id: string; nom: string; image_url: string | null; description: string | null }
type Item = { id: string; nom: string; image_url: string | null; description: string | null }

type Groupe = 'ennemi' | 'pnj' | 'map' | 'item'

const META: Record<Groupe, { icon: string; label: string }> = {
  ennemi: { icon: '👹', label: 'Ennemis' },
  pnj: { icon: '🧑', label: 'PNJ' },
  map: { icon: '🗺️', label: 'Maps' },
  item: { icon: '🎒', label: 'Items' }
}

export default function ElementsScenarioPanel({
  scenarioId,
  onAfficherImage,
  imageActive
}: {
  scenarioId: string | null | undefined
  onAfficherImage: (url: string | null) => void
  imageActive: string | null | undefined
}) {
  const [loading, setLoading] = useState(true)
  const [ennemis, setEnnemis] = useState<Ennemi[]>([])
  const [pnj, setPnj] = useState<Pnj[]>([])
  const [maps, setMaps] = useState<MapItem[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [ouverts, setOuverts] = useState<Set<Groupe>>(new Set(['ennemi', 'pnj']))
  const [detail, setDetail] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!scenarioId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: liens } = await supabase
      .from('scenario_liens')
      .select('element_type, element_id')
      .eq('scenario_id', scenarioId)

    const ids: Record<Groupe, string[]> = { ennemi: [], pnj: [], map: [], item: [] }
    ;(liens ?? []).forEach((l: { element_type: string; element_id: string }) => {
      if (l.element_type in ids) ids[l.element_type as Groupe].push(l.element_id)
    })

    const [rEnnemis, rPnj, rMaps, rItems] = await Promise.all([
      ids.ennemi.length
        ? supabase
            .from('ennemis')
            .select(
              'id, nom, image_url, hp_max, armure, comportement_tactique, force, dexterite, constitution, intelligence, sagesse, charisme'
            )
            .in('id', ids.ennemi)
        : Promise.resolve({ data: [] }),
      ids.pnj.length
        ? supabase
            .from('pnj')
            .select('id, nom, image_url, race, role, description, personnalite, secrets')
            .in('id', ids.pnj)
        : Promise.resolve({ data: [] }),
      ids.map.length
        ? supabase.from('maps').select('id, nom, image_url, description').in('id', ids.map)
        : Promise.resolve({ data: [] }),
      ids.item.length
        ? supabase.from('items').select('id, nom, image_url, description').in('id', ids.item)
        : Promise.resolve({ data: [] })
    ])

    setEnnemis((rEnnemis.data ?? []) as Ennemi[])
    setPnj((rPnj.data ?? []) as Pnj[])
    setMaps((rMaps.data ?? []) as MapItem[])
    setItems((rItems.data ?? []) as Item[])
    setLoading(false)
  }, [scenarioId])

  useEffect(() => {
    charger()
  }, [charger])

  const toggleGroupe = (g: Groupe) =>
    setOuverts((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })

  const total = ennemis.length + pnj.length + maps.length + items.length

  if (!scenarioId) {
    return (
      <p className="text-[11px] text-gray-500 italic">
        Aucun scénario actif — active un scénario pour retrouver ici tes ennemis, PNJ, maps et
        items liés.
      </p>
    )
  }

  return (
    <>
      <h3 className="cockpit-panel-title">📦 Contenu du scénario</h3>
      {loading ? (
        <p className="text-[11px] text-gray-500 italic">Chargement…</p>
      ) : total === 0 ? (
        <p className="text-[11px] text-gray-500 italic">
          Rien n'est encore lié à ce scénario. Lie des ennemis, PNJ, maps ou items depuis la fiche
          du scénario (onglet Liens).
        </p>
      ) : (
        <div className="space-y-2">
          <SectionEnnemis
            liste={ennemis}
            ouvert={ouverts.has('ennemi')}
            onToggle={() => toggleGroupe('ennemi')}
            detail={detail}
            setDetail={setDetail}
            onAfficherImage={onAfficherImage}
            imageActive={imageActive ?? null}
          />
          <SectionPnj
            liste={pnj}
            ouvert={ouverts.has('pnj')}
            onToggle={() => toggleGroupe('pnj')}
            detail={detail}
            setDetail={setDetail}
            onAfficherImage={onAfficherImage}
            imageActive={imageActive ?? null}
          />
          <SectionImages
            groupe="map"
            liste={maps}
            ouvert={ouverts.has('map')}
            onToggle={() => toggleGroupe('map')}
            onAfficherImage={onAfficherImage}
            imageActive={imageActive ?? null}
          />
          <SectionImages
            groupe="item"
            liste={items}
            ouvert={ouverts.has('item')}
            onToggle={() => toggleGroupe('item')}
            onAfficherImage={onAfficherImage}
            imageActive={imageActive ?? null}
          />
        </div>
      )}
    </>
  )
}

function EnteteGroupe({
  groupe,
  count,
  ouvert,
  onToggle
}: {
  groupe: Groupe
  count: number
  ouvert: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-gray-900/60 border border-gray-700 hover:border-yellow-700/60 text-left"
    >
      <span className="text-sm font-bold text-yellow-200">
        {META[groupe].icon} {META[groupe].label}{' '}
        <span className="text-gray-500 font-normal">({count})</span>
      </span>
      <span className="text-gray-500 text-xs">{ouvert ? '▾' : '▸'}</span>
    </button>
  )
}

function BoutonAfficher({
  url,
  actif,
  onAfficherImage
}: {
  url: string | null
  actif: boolean
  onAfficherImage: (url: string | null) => void
}) {
  if (!url) return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onAfficherImage(actif ? null : url)
      }}
      className={`text-[10px] px-2 py-1 rounded border transition ${
        actif
          ? 'border-yellow-500 text-yellow-300 bg-yellow-500/10'
          : 'border-gray-700 text-gray-300 hover:border-yellow-600 hover:text-yellow-300'
      }`}
      title="Afficher aux joueurs (image plein écran)"
    >
      {actif ? '✓ Affiché' : '🖼️ Afficher'}
    </button>
  )
}

function SectionEnnemis({
  liste,
  ouvert,
  onToggle,
  detail,
  setDetail,
  onAfficherImage,
  imageActive
}: {
  liste: Ennemi[]
  ouvert: boolean
  onToggle: () => void
  detail: string | null
  setDetail: (id: string | null) => void
  onAfficherImage: (url: string | null) => void
  imageActive: string | null
}) {
  if (liste.length === 0) return null
  return (
    <div>
      <EnteteGroupe groupe="ennemi" count={liste.length} ouvert={ouvert} onToggle={onToggle} />
      {ouvert && (
        <div className="mt-1 space-y-1">
          {liste.map((e) => {
            const expand = detail === `ennemi-${e.id}`
            return (
              <div key={e.id} className="rounded border border-gray-800 bg-gray-900/40">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setDetail(expand ? null : `ennemi-${e.id}`)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    <span className="text-yellow-100 text-sm font-bold truncate">{e.nom}</span>
                    <span className="text-[10px] text-gray-500 flex-shrink-0">
                      {e.hp_max != null ? `${e.hp_max} PV` : ''} {e.armure != null ? `· CA ${e.armure}` : ''}
                    </span>
                  </button>
                  <BoutonAfficher
                    url={e.image_url}
                    actif={imageActive === e.image_url}
                    onAfficherImage={onAfficherImage}
                  />
                </div>
                {expand && (
                  <div className="px-2.5 pb-2 text-[11px] text-gray-300 space-y-1 border-t border-gray-800 pt-1.5">
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>FOR {e.force}</span>
                      <span>DEX {e.dexterite}</span>
                      <span>CON {e.constitution}</span>
                      <span>INT {e.intelligence}</span>
                      <span>SAG {e.sagesse}</span>
                      <span>CHA {e.charisme}</span>
                    </div>
                    {e.comportement_tactique && (
                      <p className="text-gray-400 italic">🎯 {e.comportement_tactique}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SectionPnj({
  liste,
  ouvert,
  onToggle,
  detail,
  setDetail,
  onAfficherImage,
  imageActive
}: {
  liste: Pnj[]
  ouvert: boolean
  onToggle: () => void
  detail: string | null
  setDetail: (id: string | null) => void
  onAfficherImage: (url: string | null) => void
  imageActive: string | null
}) {
  if (liste.length === 0) return null
  return (
    <div>
      <EnteteGroupe groupe="pnj" count={liste.length} ouvert={ouvert} onToggle={onToggle} />
      {ouvert && (
        <div className="mt-1 space-y-1">
          {liste.map((p) => {
            const expand = detail === `pnj-${p.id}`
            return (
              <div key={p.id} className="rounded border border-gray-800 bg-gray-900/40">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setDetail(expand ? null : `pnj-${p.id}`)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    <span className="text-yellow-100 text-sm font-bold truncate">{p.nom}</span>
                    <span className="text-[10px] text-gray-500 flex-shrink-0 truncate">
                      {[p.race, p.role].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                  <BoutonAfficher
                    url={p.image_url}
                    actif={imageActive === p.image_url}
                    onAfficherImage={onAfficherImage}
                  />
                </div>
                {expand && (
                  <div className="px-2.5 pb-2 text-[11px] text-gray-300 space-y-1 border-t border-gray-800 pt-1.5">
                    {p.description && <p>{p.description}</p>}
                    {p.personnalite && <p className="text-gray-400">🎭 {p.personnalite}</p>}
                    {p.secrets && <p className="text-purple-300/80">🤫 {p.secrets}</p>}
                    {!p.description && !p.personnalite && !p.secrets && (
                      <p className="text-gray-600 italic">Pas de détails renseignés.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SectionImages({
  groupe,
  liste,
  ouvert,
  onToggle,
  onAfficherImage,
  imageActive
}: {
  groupe: 'map' | 'item'
  liste: (MapItem | Item)[]
  ouvert: boolean
  onToggle: () => void
  onAfficherImage: (url: string | null) => void
  imageActive: string | null
}) {
  if (liste.length === 0) return null
  return (
    <div>
      <EnteteGroupe groupe={groupe} count={liste.length} ouvert={ouvert} onToggle={onToggle} />
      {ouvert && (
        <div className="mt-1 space-y-1">
          {liste.map((el) => (
            <div
              key={el.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded border border-gray-800 bg-gray-900/40"
            >
              {el.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={el.image_url}
                  alt={el.nom}
                  loading="lazy"
                  className="w-8 h-8 rounded object-cover border border-gray-700 flex-shrink-0"
                />
              ) : (
                <span className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-gray-600 flex-shrink-0">
                  {META[groupe].icon}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-yellow-100 text-sm font-bold truncate">{el.nom}</p>
                {el.description && (
                  <p className="text-[10px] text-gray-500 truncate">{el.description}</p>
                )}
              </div>
              <BoutonAfficher
                url={el.image_url}
                actif={imageActive === el.image_url}
                onAfficherImage={onAfficherImage}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
