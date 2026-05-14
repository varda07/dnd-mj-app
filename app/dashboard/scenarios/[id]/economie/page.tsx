'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap 4.4 — Économie de campagne
// ----------------------------------------------------------------------------
// Outil de planification du MJ : une fiche par région/ville, avec ses
// modificateurs de prix (par catégorie de biens) et sa liste de marchands.
// Une ligne `economie_campagne` par région ; auto-save débounce des lignes
// modifiées. RLS : réservé au MJ du scénario (cf. migration phase 4).
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ModifPrix = { categorie: string; pourcentage: number; note: string }
type Marchand = { nom: string; type: string; note: string }
type EconomieRow = {
  id: string
  region: string
  modificateurs: ModifPrix[]
  marchands: Marchand[]
}

const AUTO_SAVE_MS = 1500

// Catégories de biens proposées (le MJ peut saisir n'importe quel libellé).
const CATEGORIES = [
  'Armes',
  'Armures',
  'Potions',
  'Parchemins',
  'Nourriture',
  'Montures',
  'Objets magiques',
  'Services'
]

// Normalise une valeur JSONB brute en tableau typé, tolérant aux schémas
// anciens ou au défaut SQL `{}`.
function asArray<T>(raw: unknown, map: (o: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map(map)
}

function normaliserRow(raw: Record<string, unknown>): EconomieRow {
  return {
    id: String(raw.id),
    region: typeof raw.region === 'string' ? raw.region : '',
    modificateurs: asArray<ModifPrix>(raw.modificateurs, (o) => ({
      categorie: typeof o.categorie === 'string' ? o.categorie : '',
      pourcentage: typeof o.pourcentage === 'number' ? o.pourcentage : 0,
      note: typeof o.note === 'string' ? o.note : ''
    })),
    marchands: asArray<Marchand>(raw.marchands, (o) => ({
      nom: typeof o.nom === 'string' ? o.nom : '',
      type: typeof o.type === 'string' ? o.type : '',
      note: typeof o.note === 'string' ? o.note : ''
    }))
  }
}

export default function EconomiePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const scenarioId = params?.id

  const [scenarioNom, setScenarioNom] = useState('')
  const [regions, setRegions] = useState<EconomieRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'saving'>('saved')

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyIds = useRef<Set<string>>(new Set())
  const ignoreNextSave = useRef(true)

  // --------------------------------------------------------------------------
  // Chargement : scénario + lignes economie_campagne
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!scenarioId) return
    let cancel = false
    const charger = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data: scn } = await supabase
        .from('scenarios')
        .select('id, nom')
        .eq('id', scenarioId)
        .maybeSingle()
      if (cancel) return
      if (!scn) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setScenarioNom(scn.nom as string)

      const { data: rows } = await supabase
        .from('economie_campagne')
        .select('*')
        .eq('scenario_id', scenarioId)
        .order('created_at', { ascending: true })
      if (cancel) return
      setRegions((rows ?? []).map(normaliserRow))
      setLoading(false)
    }
    charger()
    return () => {
      cancel = true
    }
  }, [scenarioId, router])

  // --------------------------------------------------------------------------
  // Auto-save débounce — ne réécrit que les lignes marquées « dirty »
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (ignoreNextSave.current) {
      ignoreNextSave.current = false
      return
    }
    if (!scenarioId || dirtyIds.current.size === 0) return
    setSaveState('pending')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveState('saving')
      const ids = [...dirtyIds.current]
      dirtyIds.current.clear()
      let echec = false
      for (const id of ids) {
        const row = regions.find((r) => r.id === id)
        if (!row) continue
        const { error } = await supabase
          .from('economie_campagne')
          .update({
            region: row.region,
            modificateurs: row.modificateurs,
            marchands: row.marchands
          })
          .eq('id', id)
        if (error) {
          console.error('[economie] save :', {
            message: error.message,
            code: error.code,
            hint: error.hint
          })
          dirtyIds.current.add(id)
          echec = true
        }
      }
      setSaveState(echec ? 'pending' : 'saved')
    }, AUTO_SAVE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [regions, scenarioId])

  // Patch d'une ligne + marquage dirty.
  const patchRow = (id: string, p: Partial<EconomieRow>) => {
    dirtyIds.current.add(id)
    setRegions((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)))
  }

  const ajouterRegion = async () => {
    if (!scenarioId) return
    const { data, error } = await supabase
      .from('economie_campagne')
      .insert({ scenario_id: scenarioId, region: '', modificateurs: [], marchands: [] })
      .select('*')
      .single()
    if (error || !data) {
      console.error('[economie] insert :', error)
      return
    }
    setRegions((rs) => [...rs, normaliserRow(data)])
  }

  const supprimerRegion = async (id: string) => {
    if (!window.confirm('Supprimer cette région et son économie ?')) return
    dirtyIds.current.delete(id)
    setRegions((rs) => rs.filter((r) => r.id !== id))
    const { error } = await supabase.from('economie_campagne').delete().eq('id', id)
    if (error) console.error('[economie] delete :', error)
  }

  if (loading) {
    return (
      <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400">Chargement…</p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400">Scénario introuvable.</p>
      </main>
    )
  }

  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/scenarios/${scenarioId}/edit`)}
            className="px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[#C9A84C] border border-[rgba(201,168,76,0.30)] hover:bg-[rgba(201,168,76,0.08)] hover:border-[#C9A84C] rounded transition"
          >
            ← Scénario
          </button>
          <span className="text-[11px] text-gray-500 italic">
            {saveState === 'saving'
              ? 'Sauvegarde…'
              : saveState === 'pending'
              ? 'Modifié'
              : '✓ Sauvegardé'}
          </span>
        </div>

        <h1
          className="text-[#C9A84C]"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 30,
            fontWeight: 300,
            letterSpacing: '0.06em'
          }}
        >
          Économie de campagne
        </h1>
        <p className="text-gray-400 text-sm mb-1">{scenarioNom}</p>
        <p className="text-gray-500 text-xs italic mb-6">
          Une fiche par région ou ville : modificateurs de prix selon l&apos;offre
          locale et marchands disponibles.
        </p>

        <div className="space-y-5">
          {regions.length === 0 && (
            <p className="text-gray-500 text-sm italic">
              Aucune région. Ajoutez-en une pour commencer à cartographier
              l&apos;économie de votre monde.
            </p>
          )}

          {regions.map((row) => (
            <RegionFiche
              key={row.id}
              row={row}
              onPatch={(p) => patchRow(row.id, p)}
              onDelete={() => supprimerRegion(row.id)}
            />
          ))}

          <button
            type="button"
            onClick={ajouterRegion}
            className="w-full px-4 py-2.5 rounded text-sm font-bold border border-[rgba(201,168,76,0.35)] text-[#C9A84C] hover:bg-[rgba(201,168,76,0.08)] hover:border-[#C9A84C] transition"
          >
            + Ajouter une région
          </button>
        </div>
      </div>

      <style>{`
        .eco-input {
          width: 100%;
          padding: 7px 10px;
          border-radius: 6px;
          background: linear-gradient(180deg, rgba(20,15,8,0.5) 0%, rgba(10,8,4,0.35) 100%);
          border: 1px solid rgba(201,168,76,0.22);
          color: #e8e0c8;
          font-size: 14px;
          outline: none;
        }
        .eco-input::placeholder { color: #6a6a72; font-style: italic; }
        .eco-input:focus { border-color: rgba(201,168,76,0.6); }
      `}</style>
    </main>
  )
}

// ----------------------------------------------------------------------------
// Fiche d'une région : nom, modificateurs de prix, marchands.
// ----------------------------------------------------------------------------
function RegionFiche({
  row,
  onPatch,
  onDelete
}: {
  row: EconomieRow
  onPatch: (p: Partial<EconomieRow>) => void
  onDelete: () => void
}) {
  const setModif = (i: number, p: Partial<ModifPrix>) =>
    onPatch({
      modificateurs: row.modificateurs.map((m, idx) =>
        idx === i ? { ...m, ...p } : m
      )
    })
  const ajouterModif = () =>
    onPatch({
      modificateurs: [
        ...row.modificateurs,
        { categorie: CATEGORIES[0], pourcentage: 0, note: '' }
      ]
    })
  const retirerModif = (i: number) =>
    onPatch({ modificateurs: row.modificateurs.filter((_, idx) => idx !== i) })

  const setMarchand = (i: number, p: Partial<Marchand>) =>
    onPatch({
      marchands: row.marchands.map((m, idx) => (idx === i ? { ...m, ...p } : m))
    })
  const ajouterMarchand = () =>
    onPatch({ marchands: [...row.marchands, { nom: '', type: '', note: '' }] })
  const retirerMarchand = (i: number) =>
    onPatch({ marchands: row.marchands.filter((_, idx) => idx !== i) })

  return (
    <section
      className="rounded-lg p-4"
      style={{
        background:
          'linear-gradient(135deg, rgba(20,15,8,0.6) 0%, rgba(10,8,4,0.4) 100%)',
        borderLeft: '2px solid rgba(201,168,76,0.45)',
        border: '1px solid rgba(201,168,76,0.12)',
        borderLeftWidth: 2
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={row.region}
          onChange={(e) => onPatch({ region: e.target.value })}
          placeholder="Nom de la région ou ville…"
          className="eco-input"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 17,
            color: '#C9A84C'
          }}
        />
        <button
          type="button"
          onClick={onDelete}
          className="text-red-400 hover:text-red-300 text-sm px-2 flex-shrink-0"
          title="Supprimer cette région"
        >
          ✕
        </button>
      </div>

      {/* Modificateurs de prix */}
      <h3 className="text-gray-300 text-xs uppercase tracking-widest mb-2">
        💰 Modificateurs de prix
      </h3>
      <div className="space-y-2 mb-3">
        {row.modificateurs.length === 0 && (
          <p className="text-gray-600 text-xs italic">
            Prix standards partout — ajoutez un modificateur pour une spécificité
            locale.
          </p>
        )}
        {row.modificateurs.map((m, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <input
              list={`eco-cat-${row.id}`}
              type="text"
              value={m.categorie}
              onChange={(e) => setModif(i, { categorie: e.target.value })}
              placeholder="Catégorie"
              className="eco-input"
              style={{ flex: '1 1 110px', minWidth: 110 }}
            />
            <div className="flex items-center gap-1" style={{ flex: '0 0 auto' }}>
              <input
                type="number"
                value={m.pourcentage}
                onChange={(e) =>
                  setModif(i, { pourcentage: Number(e.target.value) || 0 })
                }
                step={5}
                className="eco-input"
                style={{ width: 72, textAlign: 'right' }}
              />
              <span
                className="text-sm font-bold"
                style={{ color: m.pourcentage > 0 ? '#f87171' : m.pourcentage < 0 ? '#34d399' : '#9ca3af' }}
              >
                %
              </span>
            </div>
            <input
              type="text"
              value={m.note}
              onChange={(e) => setModif(i, { note: e.target.value })}
              placeholder="Raison (pénurie, guilde, taxe…)"
              className="eco-input"
              style={{ flex: '2 1 140px', minWidth: 140 }}
            />
            <button
              type="button"
              onClick={() => retirerModif(i)}
              className="text-red-400 hover:text-red-300 text-sm px-1 flex-shrink-0"
              title="Retirer"
            >
              ✕
            </button>
          </div>
        ))}
        <datalist id={`eco-cat-${row.id}`}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <button
        type="button"
        onClick={ajouterModif}
        className="text-xs text-[#C9A84C] hover:underline mb-4"
      >
        + Modificateur de prix
      </button>

      {/* Marchands */}
      <h3 className="text-gray-300 text-xs uppercase tracking-widest mb-2">
        🏪 Marchands
      </h3>
      <div className="space-y-2 mb-3">
        {row.marchands.length === 0 && (
          <p className="text-gray-600 text-xs italic">Aucun marchand répertorié.</p>
        )}
        {row.marchands.map((m, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={m.nom}
              onChange={(e) => setMarchand(i, { nom: e.target.value })}
              placeholder="Nom"
              className="eco-input"
              style={{ flex: '1 1 110px', minWidth: 110 }}
            />
            <input
              type="text"
              value={m.type}
              onChange={(e) => setMarchand(i, { type: e.target.value })}
              placeholder="Type (forgeron, herboriste…)"
              className="eco-input"
              style={{ flex: '1 1 120px', minWidth: 120 }}
            />
            <input
              type="text"
              value={m.note}
              onChange={(e) => setMarchand(i, { note: e.target.value })}
              placeholder="Note (stock, attitude, prix…)"
              className="eco-input"
              style={{ flex: '2 1 140px', minWidth: 140 }}
            />
            <button
              type="button"
              onClick={() => retirerMarchand(i)}
              className="text-red-400 hover:text-red-300 text-sm px-1 flex-shrink-0"
              title="Retirer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={ajouterMarchand}
        className="text-xs text-[#C9A84C] hover:underline"
      >
        + Marchand
      </button>
    </section>
  )
}
