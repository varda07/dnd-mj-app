'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

type Onglet = 'scenarios' | 'personnages' | 'ennemis' | 'items' | 'maps' | 'sorts'

const ONGLETS: { id: Onglet; label: string; emoji: string }[] = [
  { id: 'scenarios', label: 'Scénarios', emoji: '📖' },
  { id: 'personnages', label: 'Personnages', emoji: '🧙' },
  { id: 'ennemis', label: 'Ennemis', emoji: '👹' },
  { id: 'items', label: 'Items', emoji: '🎒' },
  { id: 'maps', label: 'Maps', emoji: '🗺️' },
  { id: 'sorts', label: 'Sorts', emoji: '✨' }
]

export default function Bibliotheque() {
  const router = useRouter()
  const [onglet, setOnglet] = useState<Onglet>('scenarios')
  const [recherche, setRecherche] = useState('')
  const [loading, setLoading] = useState(true)

  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const [ennemis, setEnnemis] = useState<Ennemi[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [maps, setMaps] = useState<MapItem[]>([])
  const [sorts, setSorts] = useState<Sort[]>([])

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      const uid = user.id
      const [s, p, e, i, m] = await Promise.all([
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
          .order('nom')
      ])
      if (s.data) setScenarios(s.data)
      if (p.data) setPersonnages(p.data)
      if (e.data) setEnnemis(e.data)
      if (i.data) setItems(i.data)
      if (m.data) setMaps(m.data)
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
    fetchAll()
  }, [])

  const q = recherche.trim().toLowerCase()
  const match = (...champs: (string | null | undefined)[]) =>
    !q || champs.some((c) => c && c.toLowerCase().includes(q))

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

  const compteurs: Record<Onglet, number> = {
    scenarios: scenariosFiltres.length,
    personnages: personnagesFiltres.length,
    ennemis: ennemisFiltres.length,
    items: itemsFiltres.length,
    maps: mapsFiltres.length,
    sorts: sortsFiltres.length
  }

  const vide = (
    <p className="text-gray-400 italic">
      {q ? 'Aucun résultat pour cette recherche.' : 'Rien à afficher.'}
    </p>
  )

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
            Retour
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">📚 Bibliothèque</h1>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg mb-4">
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="🔎 Rechercher par nom, description, type..."
            className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {ONGLETS.map((o) => {
            const actif = onglet === o.id
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setOnglet(o.id)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                  actif
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {o.emoji} {o.label}
                <span
                  className={`ml-2 text-xs ${
                    actif ? 'text-gray-800' : 'text-gray-500'
                  }`}
                >
                  ({compteurs[o.id]})
                </span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : (
          <div className="space-y-3">
            {onglet === 'scenarios' && (
              scenariosFiltres.length === 0 ? vide : scenariosFiltres.map((s) => (
                <div key={s.id} className="bg-gray-800 p-4 rounded-lg flex gap-4">
                  {s.bg_image_url ? (
                    <img
                      src={s.bg_image_url}
                      alt={s.nom}
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
          </div>
        )}
      </div>
    </main>
  )
}
