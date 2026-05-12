'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Spinner from '@/app/components/Spinner'

// ============================================================================
// Types
// ============================================================================

type Pnj = {
  id: string
  nom: string
  race: string | null
  role: string | null
  description: string | null
  personnalite: string | null
  secrets: string | null
  hp_max: number
  hp_actuel: number
  armure: number | null
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
  notes: string | null
  image_url: string | null
}

type EntiteType = 'personnage' | 'pnj' | 'ennemi'

type TypeRelation =
  | 'ami'
  | 'ennemi'
  | 'allie'
  | 'neutre'
  | 'amoureux'
  | 'famille'
  | 'mentor'
  | 'rival'
  | 'contact'

type Relation = {
  id: string
  mj_id: string
  pnj_id: string
  entite_type: EntiteType
  entite_id: string
  type_relation: TypeRelation
  description: string | null
  intensite: number
  created_at: string
}

type Entite = {
  id: string
  nom: string
  image_url: string | null
}

const TYPE_RELATION_META: Record<TypeRelation, { label: string; icone: string; couleur: string }> = {
  ami: { label: 'Ami', icone: '🤝', couleur: '#22c55e' },
  allie: { label: 'Allié', icone: '🛡️', couleur: '#3b82f6' },
  amoureux: { label: 'Amoureux', icone: '❤️', couleur: '#ec4899' },
  famille: { label: 'Famille', icone: '👪', couleur: '#a855f7' },
  mentor: { label: 'Mentor', icone: '🧙', couleur: '#06b6d4' },
  rival: { label: 'Rival', icone: '⚔️', couleur: '#f97316' },
  ennemi: { label: 'Ennemi', icone: '💢', couleur: '#ef4444' },
  contact: { label: 'Contact', icone: '📨', couleur: '#eab308' },
  neutre: { label: 'Neutre', icone: '🪞', couleur: '#6b7280' }
}

const TYPES_RELATION_LISTE = Object.keys(TYPE_RELATION_META) as TypeRelation[]

const ENTITE_ICONE: Record<EntiteType, string> = {
  personnage: '🎭',
  pnj: '🧑',
  ennemi: '👹'
}

const ENTITE_LABEL: Record<EntiteType, string> = {
  personnage: 'Personnage',
  pnj: 'PNJ',
  ennemi: 'Ennemi'
}

// Couleur de la barre d'intensité : rouge hostile → gris neutre → vert dévoué
function couleurIntensite(v: number): string {
  if (v < 25) return '#ef4444'
  if (v < 45) return '#f97316'
  if (v < 55) return '#9ca3af'
  if (v < 75) return '#84cc16'
  return '#22c55e'
}

function labelIntensite(v: number): string {
  if (v < 15) return 'Hostile'
  if (v < 35) return 'Méfiant'
  if (v < 50) return 'Distant'
  if (v < 65) return 'Cordial'
  if (v < 85) return 'Loyal'
  return 'Dévoué'
}

// ============================================================================
// Page
// ============================================================================

export default function PnjFichePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const pnjId = params?.id

  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [pnj, setPnj] = useState<Pnj | null>(null)
  const [mjId, setMjId] = useState<string>('')

  const [relations, setRelations] = useState<Relation[]>([])
  const [personnages, setPersonnages] = useState<Entite[]>([])
  const [pnjs, setPnjs] = useState<Entite[]>([])
  const [ennemis, setEnnemis] = useState<Entite[]>([])
  const [editor, setEditor] = useState<Relation | null>(null)

  useEffect(() => {
    if (!pnjId) return
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setMjId(user.id)

      const { data: pnjData, error } = await supabase
        .from('pnj')
        .select('*')
        .eq('id', pnjId)
        .maybeSingle()
      if (error || !pnjData) {
        setAuthorized(false)
        setLoading(false)
        return
      }
      // L'auth est portée par la RLS (proprio ou public). On affiche la fiche
      // mais on ne permet la gestion des relations qu'au propriétaire.
      setPnj(pnjData as Pnj)
      const owned = (pnjData as Pnj & { mj_id?: string }).mj_id === user.id
      setAuthorized(owned)

      if (owned) {
        const [relRes, persoRes, pnjListRes, ennRes] = await Promise.all([
          supabase
            .from('pnj_relations')
            .select('*')
            .eq('pnj_id', pnjId)
            .order('created_at', { ascending: false }),
          supabase
            .from('personnages')
            .select('id, nom, image_url')
            .order('nom'),
          supabase
            .from('pnj')
            .select('id, nom, image_url')
            .eq('mj_id', user.id)
            .neq('id', pnjId)
            .order('nom'),
          supabase
            .from('ennemis')
            .select('id, nom, image_url')
            .eq('mj_id', user.id)
            .order('nom')
        ])
        setRelations((relRes.data ?? []) as Relation[])
        setPersonnages((persoRes.data ?? []) as Entite[])
        setPnjs((pnjListRes.data ?? []) as Entite[])
        setEnnemis((ennRes.data ?? []) as Entite[])
      }
      setLoading(false)
    }
    init()
  }, [pnjId, router])

  // --------------------------------------------------------------------------
  // Résolution d'une entité (par type + id) pour affichage
  // --------------------------------------------------------------------------
  const resoudre = (type: EntiteType, id: string): Entite | undefined => {
    if (type === 'personnage') return personnages.find((p) => p.id === id)
    if (type === 'pnj') return pnjs.find((p) => p.id === id)
    return ennemis.find((p) => p.id === id)
  }

  // --------------------------------------------------------------------------
  // CRUD relations
  // --------------------------------------------------------------------------
  const sauvegarder = async (rel: Relation) => {
    const payload = {
      entite_type: rel.entite_type,
      entite_id: rel.entite_id,
      type_relation: rel.type_relation,
      description: rel.description,
      intensite: rel.intensite
    }
    const exist = relations.find((r) => r.id === rel.id)
    if (!exist) {
      const { data, error } = await supabase
        .from('pnj_relations')
        .insert({ ...payload, pnj_id: pnjId, mj_id: mjId })
        .select()
        .single()
      if (error) {
        console.error('[relations] insert :', error)
        return
      }
      if (data) setRelations((prev) => [data as Relation, ...prev])
    } else {
      const { error } = await supabase
        .from('pnj_relations')
        .update(payload)
        .eq('id', rel.id)
      if (error) {
        console.error('[relations] update :', error)
        return
      }
      setRelations((prev) => prev.map((r) => (r.id === rel.id ? { ...r, ...payload } : r)))
    }
    setEditor(null)
  }

  const supprimer = async (id: string) => {
    if (!window.confirm('Supprimer cette relation ?')) return
    const { error } = await supabase.from('pnj_relations').delete().eq('id', id)
    if (error) {
      console.error('[relations] delete :', error)
      return
    }
    setRelations((prev) => prev.filter((r) => r.id !== id))
  }

  // --------------------------------------------------------------------------
  // Rendu
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <Spinner label="Chargement de la fiche…" />
      </main>
    )
  }

  if (!pnj) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white mb-4"
        >
          ← Retour
        </button>
        <p className="text-red-400">PNJ introuvable.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            ← Retour
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-yellow-500 truncate">
            {pnj.nom}
          </h1>
        </div>

        {/* Bloc fiche */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 flex flex-col md:flex-row gap-4">
          {pnj.image_url ? (
            <img
              src={pnj.image_url}
              alt={pnj.nom}
              loading="lazy"
              className="w-32 h-32 rounded-lg object-cover flex-shrink-0 ring-2 ring-emerald-500/40"
            />
          ) : (
            <div className="w-32 h-32 rounded-lg bg-gray-700 flex items-center justify-center text-5xl flex-shrink-0">
              🧑
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-400">
              {[pnj.race, pnj.role].filter(Boolean).join(' · ') || '—'}
            </p>
            {pnj.description && (
              <p className="text-gray-200 text-sm mt-2">{pnj.description}</p>
            )}
            {pnj.personnalite && (
              <p className="text-gray-400 text-xs italic mt-2">💬 {pnj.personnalite}</p>
            )}
            <div className="grid grid-cols-3 md:grid-cols-7 gap-2 text-[11px] text-gray-400 mt-3">
              <span>❤️ {pnj.hp_actuel}/{pnj.hp_max}</span>
              <span>🛡️ CA {pnj.armure ?? 10}</span>
              <span>💪 {pnj.force}</span>
              <span>🏃 {pnj.dexterite}</span>
              <span>🫀 {pnj.constitution}</span>
              <span>🧠 {pnj.intelligence}</span>
              <span>🙏 {pnj.sagesse}</span>
            </div>
          </div>
        </div>

        {!authorized ? (
          <p className="text-gray-400 text-sm italic">
            Mode lecture seule — cette fiche appartient à un autre MJ.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-yellow-500">🤝 Relations</h2>
              <button
                type="button"
                onClick={() =>
                  setEditor({
                    id: `tmp-${Date.now()}`,
                    mj_id: mjId,
                    pnj_id: pnjId ?? '',
                    entite_type: 'pnj',
                    entite_id: '',
                    type_relation: 'neutre',
                    description: '',
                    intensite: 50,
                    created_at: ''
                  })
                }
                className="px-3 py-2 bg-yellow-500 text-gray-900 font-bold rounded text-sm hover:bg-yellow-400"
              >
                + Nouvelle relation
              </button>
            </div>

            {relations.length === 0 ? (
              <p className="text-gray-400 text-sm italic">
                Aucune relation enregistrée pour ce PNJ.
              </p>
            ) : (
              <ul className="space-y-2">
                {relations.map((r) => {
                  const meta = TYPE_RELATION_META[r.type_relation] ?? TYPE_RELATION_META.neutre
                  const ent = resoudre(r.entite_type, r.entite_id)
                  return (
                    <li
                      key={r.id}
                      className="bg-gray-800 border rounded-lg p-3 flex flex-col md:flex-row gap-3"
                      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">
                          {meta.icone}
                        </span>
                        {ent?.image_url ? (
                          <img
                            src={ent.image_url}
                            alt=""
                            loading="lazy"
                            className="w-10 h-10 rounded object-cover bg-gray-900"
                          />
                        ) : (
                          <span className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center">
                            {ENTITE_ICONE[r.entite_type]}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-bold truncate">
                              {ent?.nom ?? '(entité supprimée)'}
                            </span>
                            <span
                              className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold"
                              style={{
                                background: `${meta.couleur}22`,
                                border: `1px solid ${meta.couleur}55`,
                                color: meta.couleur
                              }}
                            >
                              {meta.label}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {ENTITE_LABEL[r.entite_type]}
                            </span>
                          </div>
                          {r.description && (
                            <p className="text-gray-400 text-xs mt-1">
                              {r.description}
                            </p>
                          )}
                          <div className="mt-1">
                            <div className="flex justify-between text-[10px] text-gray-500">
                              <span>{labelIntensite(r.intensite)}</span>
                              <span>{r.intensite}/100</span>
                            </div>
                            <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${r.intensite}%`,
                                  background: couleurIntensite(r.intensite)
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditor(r)}
                          className="text-blue-400 text-xs hover:text-blue-300"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => supprimer(r.id)}
                          className="text-red-400 text-xs hover:text-red-300"
                        >
                          Supprimer
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {editor && (
        <RelationEditor
          relation={editor}
          personnages={personnages}
          pnjs={pnjs}
          ennemis={ennemis}
          onSave={sauvegarder}
          onCancel={() => setEditor(null)}
        />
      )}
    </main>
  )
}

// ============================================================================
// RelationEditor — modale création/édition
// ============================================================================

function RelationEditor({
  relation,
  personnages,
  pnjs,
  ennemis,
  onSave,
  onCancel
}: {
  relation: Relation
  personnages: Entite[]
  pnjs: Entite[]
  ennemis: Entite[]
  onSave: (r: Relation) => Promise<void> | void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Relation>(relation)
  const [filtre, setFiltre] = useState('')
  const [saving, setSaving] = useState(false)

  const liste = useMemo(() => {
    const src =
      draft.entite_type === 'personnage'
        ? personnages
        : draft.entite_type === 'pnj'
        ? pnjs
        : ennemis
    const q = filtre.trim().toLowerCase()
    if (!q) return src
    return src.filter((e) => e.nom.toLowerCase().includes(q))
  }, [draft.entite_type, filtre, personnages, pnjs, ennemis])

  const patch = (p: Partial<Relation>) => setDraft((d) => ({ ...d, ...p }))

  const peutSauvegarder = !!draft.entite_id

  const handleSave = async () => {
    if (!peutSauvegarder) return
    setSaving(true)
    await onSave(draft)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-3"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
      >
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-yellow-500">
            {relation.entite_id ? '✎ Modifier la relation' : '+ Nouvelle relation'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-white w-8 h-8 text-xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 [scrollbar-width:thin]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400">
                Type d&apos;entité
              </label>
              <select
                value={draft.entite_type}
                onChange={(e) =>
                  patch({
                    entite_type: e.target.value as EntiteType,
                    entite_id: ''
                  })
                }
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none"
              >
                <option value="pnj">🧑 PNJ</option>
                <option value="personnage">🎭 Personnage</option>
                <option value="ennemi">👹 Ennemi</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400">
                Type de relation
              </label>
              <select
                value={draft.type_relation}
                onChange={(e) =>
                  patch({ type_relation: e.target.value as TypeRelation })
                }
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none"
              >
                {TYPES_RELATION_LISTE.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_RELATION_META[t].icone} {TYPE_RELATION_META[t].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-400">
              Entité liée
            </label>
            <input
              type="text"
              value={filtre}
              onChange={(e) => setFiltre(e.target.value)}
              placeholder={`Filtrer parmi les ${ENTITE_LABEL[draft.entite_type].toLowerCase()}s…`}
              className="w-full mt-1 mb-2 p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none text-sm"
            />
            {liste.length === 0 ? (
              <p className="text-gray-500 text-xs italic">
                Aucune entité disponible.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-gray-700 rounded p-1 space-y-0.5 [scrollbar-width:thin]">
                {liste.map((e) => {
                  const checked = draft.entite_id === e.id
                  return (
                    <label
                      key={e.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${
                        checked
                          ? 'bg-yellow-500/10 border border-yellow-500/30'
                          : 'hover:bg-gray-800 border border-transparent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="entite_id"
                        checked={checked}
                        onChange={() => patch({ entite_id: e.id })}
                        className="accent-yellow-500"
                      />
                      {e.image_url ? (
                        <img
                          src={e.image_url}
                          alt=""
                          loading="lazy"
                          className="w-7 h-7 rounded object-cover bg-gray-900"
                        />
                      ) : (
                        <span className="w-7 h-7 rounded bg-gray-800 flex items-center justify-center">
                          {ENTITE_ICONE[draft.entite_type]}
                        </span>
                      )}
                      <span className="text-gray-200">{e.nom}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-400">
              Description / contexte
            </label>
            <textarea
              value={draft.description ?? ''}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Comment se connaissent-ils ? Quel est l'enjeu ?"
              className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none text-sm min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-400 flex justify-between">
              <span>Intensité</span>
              <span className="text-gray-300 normal-case font-normal">
                {labelIntensite(draft.intensite)} ({draft.intensite}/100)
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.intensite}
              onChange={(e) => patch({ intensite: parseInt(e.target.value) })}
              className="w-full accent-yellow-500 mt-1"
              style={{
                background: `linear-gradient(to right, ${couleurIntensite(
                  draft.intensite
                )} 0%, ${couleurIntensite(draft.intensite)} ${
                  draft.intensite
                }%, #374151 ${draft.intensite}%, #374151 100%)`,
                borderRadius: 4
              }}
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>Hostile</span>
              <span>Neutre</span>
              <span>Dévoué</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-700 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!peutSauvegarder || saving}
            className="px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-sm disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
