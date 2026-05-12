'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Spinner from '@/app/components/Spinner'

// ============================================================================
// Types
// ============================================================================

type QueteType = 'principale' | 'secondaire' | 'personnelle'
type QueteStatus = 'active' | 'terminee' | 'abandonnee' | 'echec'

type Objectif = { id: string; texte: string; complete: boolean }
type RecompenseItem = { id: string; nom: string; quantite: number }

type Quete = {
  id: string
  scenario_id: string
  titre: string
  description: string | null
  type: QueteType
  status: QueteStatus
  recompense_xp: number
  recompense_or: number
  recompense_items: RecompenseItem[]
  objectifs: Objectif[]
  pnj_lies: string[]
  created_at: string
  completed_at: string | null
}

type PnjLite = { id: string; nom: string; image_url: string | null }
type PersoLite = { id: string; nom: string; xp: number }

const TYPE_META: Record<QueteType, { label: string; icone: string; couleur: string }> = {
  principale: { label: 'Principale', icone: '📜', couleur: '#c9a84c' },
  secondaire: { label: 'Secondaire', icone: '📃', couleur: '#3b82f6' },
  personnelle: { label: 'Personnelle', icone: '💭', couleur: '#a855f7' }
}

const STATUS_LABEL: Record<QueteStatus, string> = {
  active: 'Actives',
  terminee: 'Terminées',
  abandonnee: 'Abandonnées',
  echec: 'Échec'
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

// ============================================================================
// Page
// ============================================================================

export default function QuetesPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const scenarioId = params?.id

  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [scenarioNom, setScenarioNom] = useState('')
  const [quetes, setQuetes] = useState<Quete[]>([])
  const [pnjs, setPnjs] = useState<PnjLite[]>([])

  const [editor, setEditor] = useState<Quete | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [filtreType, setFiltreType] = useState<QueteType | 'all'>('all')
  const [filtreStatus, setFiltreStatus] = useState<QueteStatus | 'all'>('all')
  const [recherche, setRecherche] = useState('')

  // --------------------------------------------------------------------------
  // Chargement initial
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!scenarioId) return
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data: scn, error } = await supabase
        .from('scenarios')
        .select('id, nom, mj_id')
        .eq('id', scenarioId)
        .maybeSingle()
      if (error || !scn || scn.mj_id !== user.id) {
        setAuthorized(false)
        setLoading(false)
        return
      }
      setAuthorized(true)
      setScenarioNom(scn.nom ?? '')

      const [qRes, pnjRes] = await Promise.all([
        supabase
          .from('quetes')
          .select('*')
          .eq('scenario_id', scenarioId)
          .order('created_at', { ascending: false }),
        supabase
          .from('pnj')
          .select('id, nom, image_url')
          .eq('mj_id', user.id)
          .order('nom')
      ])
      setQuetes(((qRes.data ?? []) as Quete[]).map(normaliserQuete))
      setPnjs((pnjRes.data ?? []) as PnjLite[])
      setLoading(false)
    }
    init()
  }, [scenarioId, router])

  // --------------------------------------------------------------------------
  // Persistance d'une quête (insert/update)
  // --------------------------------------------------------------------------
  const sauvegarderQuete = async (q: Quete) => {
    const payload = {
      titre: q.titre.trim() || 'Sans titre',
      description: q.description,
      type: q.type,
      status: q.status,
      recompense_xp: q.recompense_xp,
      recompense_or: q.recompense_or,
      recompense_items: q.recompense_items,
      objectifs: q.objectifs,
      pnj_lies: q.pnj_lies,
      completed_at: q.completed_at
    }
    const existante = quetes.find((x) => x.id === q.id)
    if (!existante) {
      const { data, error } = await supabase
        .from('quetes')
        .insert({ ...payload, scenario_id: scenarioId })
        .select()
        .single()
      if (error) {
        console.error('[quetes] insert :', error)
        return
      }
      if (data) setQuetes((prev) => [normaliserQuete(data as Quete), ...prev])
    } else {
      const { error } = await supabase.from('quetes').update(payload).eq('id', q.id)
      if (error) {
        console.error('[quetes] update :', error)
        return
      }
      setQuetes((prev) => prev.map((x) => (x.id === q.id ? { ...q, ...payload } : x)))
    }
  }

  // Update partiel optimiste (objectifs cochés, statut, etc.)
  const patchQuete = useCallback(
    async (id: string, patch: Partial<Quete>) => {
      const courante = quetes.find((q) => q.id === id)
      if (!courante) return
      const next = { ...courante, ...patch }
      setQuetes((prev) => prev.map((q) => (q.id === id ? next : q)))
      const { error } = await supabase.from('quetes').update(patch).eq('id', id)
      if (error) {
        console.error('[quetes] patch :', error)
      }
    },
    [quetes]
  )

  const supprimerQuete = async (id: string) => {
    if (!window.confirm('Supprimer cette quête ?')) return
    const { error } = await supabase.from('quetes').delete().eq('id', id)
    if (error) {
      console.error('[quetes] delete :', error)
      return
    }
    setQuetes((prev) => prev.filter((q) => q.id !== id))
    if (detailsId === id) setDetailsId(null)
  }

  // --------------------------------------------------------------------------
  // Distribution automatique des récompenses aux personnages du scénario.
  // Seul l'XP est appliqué directement (colonne sur personnages). L'or et les
  // objets sont rappelés au MJ pour qu'il les distribue dans son inventaire.
  // --------------------------------------------------------------------------
  const terminerEtDistribuer = async (q: Quete) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !scenarioId) return
    const { data: persos, error } = await supabase
      .from('personnages')
      .select('id, nom, xp')
      .eq('scenario_id', scenarioId)
    if (error) {
      console.error('[quetes] charger persos :', error)
      return
    }
    const liste = (persos ?? []) as PersoLite[]
    if (q.recompense_xp > 0 && liste.length > 0) {
      await Promise.all(
        liste.map((p) =>
          supabase
            .from('personnages')
            .update({ xp: (p.xp ?? 0) + q.recompense_xp })
            .eq('id', p.id)
        )
      )
    }
    await patchQuete(q.id, {
      status: 'terminee',
      completed_at: new Date().toISOString()
    })
    const nbPj = liste.length
    const parts: string[] = []
    if (q.recompense_xp > 0 && nbPj > 0) {
      parts.push(`✓ +${q.recompense_xp} XP appliqués à ${nbPj} personnage${nbPj > 1 ? 's' : ''}`)
    }
    if (q.recompense_or > 0) parts.push(`⚠︎ À distribuer manuellement : ${q.recompense_or} po`)
    if (q.recompense_items.length > 0) {
      parts.push(
        `⚠︎ À distribuer manuellement : ` +
          q.recompense_items.map((it) => `${it.nom} ×${it.quantite}`).join(', ')
      )
    }
    if (parts.length > 0) window.alert(parts.join('\n'))
  }

  // --------------------------------------------------------------------------
  // Filtres
  // --------------------------------------------------------------------------
  const quetesFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return quetes.filter((x) => {
      if (filtreType !== 'all' && x.type !== filtreType) return false
      if (filtreStatus !== 'all' && x.status !== filtreStatus) return false
      if (q && !x.titre.toLowerCase().includes(q)) return false
      return true
    })
  }, [quetes, filtreType, filtreStatus, recherche])

  const groupes = useMemo(() => {
    const g: Record<QueteStatus, Quete[]> = {
      active: [],
      terminee: [],
      abandonnee: [],
      echec: []
    }
    quetesFiltrees.forEach((q) => g[q.status].push(q))
    return g
  }, [quetesFiltrees])

  // --------------------------------------------------------------------------
  // Rendu
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <Spinner label="Chargement des quêtes…" />
      </main>
    )
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white mb-4"
          >
            ← Retour
          </button>
          <p className="text-red-400">
            Accès refusé : seuls les MJ du scénario peuvent gérer ces quêtes.
          </p>
        </div>
      </main>
    )
  }

  const quete = detailsId ? quetes.find((q) => q.id === detailsId) ?? null : null

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            ← Retour
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-yellow-500 truncate">
            🎯 Quêtes — {scenarioNom}
          </h1>
        </div>

        {/* Barre d'actions + filtres */}
        <div className="bg-gray-800 rounded-lg p-3 mb-4 flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() =>
              setEditor({
                id: newId(),
                scenario_id: scenarioId ?? '',
                titre: '',
                description: '',
                type: 'principale',
                status: 'active',
                recompense_xp: 0,
                recompense_or: 0,
                recompense_items: [],
                objectifs: [],
                pnj_lies: [],
                created_at: new Date().toISOString(),
                completed_at: null
              })
            }
            className="px-3 py-2 bg-yellow-500 text-gray-900 font-bold rounded text-sm hover:bg-yellow-400"
          >
            + Nouvelle quête
          </button>
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher…"
            className="px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm flex-1 min-w-[160px]"
          />
          <select
            value={filtreType}
            onChange={(e) => setFiltreType(e.target.value as QueteType | 'all')}
            className="px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
          >
            <option value="all">Tous les types</option>
            <option value="principale">📜 Principales</option>
            <option value="secondaire">📃 Secondaires</option>
            <option value="personnelle">💭 Personnelles</option>
          </select>
          <select
            value={filtreStatus}
            onChange={(e) =>
              setFiltreStatus(e.target.value as QueteStatus | 'all')
            }
            className="px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actives</option>
            <option value="terminee">Terminées</option>
            <option value="abandonnee">Abandonnées</option>
            <option value="echec">Échec</option>
          </select>
        </div>

        {quetes.length === 0 ? (
          <p className="text-gray-400 text-sm italic">
            Aucune quête pour ce scénario. Crée la première.
          </p>
        ) : (
          <div className="space-y-6">
            {(['active', 'terminee', 'abandonnee', 'echec'] as QueteStatus[]).map(
              (st) =>
                groupes[st].length > 0 && (
                  <section key={st}>
                    <h2 className="text-sm uppercase tracking-[0.18em] text-gray-400 font-bold mb-2">
                      {STATUS_LABEL[st]} ({groupes[st].length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupes[st].map((q) => (
                        <QueteCard
                          key={q.id}
                          quete={q}
                          pnjs={pnjs}
                          onOpen={() => setDetailsId(q.id)}
                          onEdit={() => setEditor(q)}
                          onDelete={() => supprimerQuete(q.id)}
                        />
                      ))}
                    </div>
                  </section>
                )
            )}
          </div>
        )}
      </div>

      {editor && (
        <QueteEditor
          quete={editor}
          pnjs={pnjs}
          onSave={async (q) => {
            await sauvegarderQuete(q)
            setEditor(null)
          }}
          onCancel={() => setEditor(null)}
        />
      )}

      {quete && (
        <QueteDetails
          quete={quete}
          pnjs={pnjs}
          onClose={() => setDetailsId(null)}
          onPatch={(patch) => patchQuete(quete.id, patch)}
          onTerminer={() => terminerEtDistribuer(quete)}
        />
      )}
    </main>
  )
}

// ============================================================================
// QueteCard
// ============================================================================

function QueteCard({
  quete,
  pnjs,
  onOpen,
  onEdit,
  onDelete
}: {
  quete: Quete
  pnjs: PnjLite[]
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = TYPE_META[quete.type]
  const nbObj = quete.objectifs.length
  const nbDone = quete.objectifs.filter((o) => o.complete).length
  const pct = nbObj > 0 ? Math.round((nbDone / nbObj) * 100) : 0
  const pnjNoms = quete.pnj_lies
    .map((id) => pnjs.find((p) => p.id === id)?.nom)
    .filter(Boolean) as string[]

  return (
    <div
      className="bg-gray-800 border rounded-lg p-3 cursor-pointer hover:bg-gray-750 transition"
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      onClick={onOpen}
      role="button"
    >
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none">{meta.icone}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white truncate">
              {quete.titre || 'Sans titre'}
            </h3>
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
          </div>
          {quete.description && (
            <p className="text-xs text-gray-400 line-clamp-2 mt-1">
              {quete.description}
            </p>
          )}
          {nbObj > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>
                  Objectifs : {nbDone}/{nbObj}
                </span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: meta.couleur
                  }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] text-gray-400">
            {quete.recompense_xp > 0 && <span>✨ {quete.recompense_xp} XP</span>}
            {quete.recompense_or > 0 && <span>🪙 {quete.recompense_or} po</span>}
            {quete.recompense_items.length > 0 && (
              <span>🎁 {quete.recompense_items.length}</span>
            )}
            {pnjNoms.length > 0 && (
              <span className="truncate" title={pnjNoms.join(', ')}>
                🧑 {pnjNoms.slice(0, 2).join(', ')}
                {pnjNoms.length > 2 ? ` +${pnjNoms.length - 2}` : ''}
              </span>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="text-blue-400 text-xs hover:text-blue-300"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="text-red-400 text-xs hover:text-red-300"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// QueteEditor — modale création/édition
// ============================================================================

function QueteEditor({
  quete,
  pnjs,
  onSave,
  onCancel
}: {
  quete: Quete
  pnjs: PnjLite[]
  onSave: (q: Quete) => Promise<void> | void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Quete>(quete)
  const [saving, setSaving] = useState(false)
  const [pnjFilter, setPnjFilter] = useState('')

  const patch = (p: Partial<Quete>) => setDraft((d) => ({ ...d, ...p }))

  const ajouterObjectif = () =>
    patch({
      objectifs: [
        ...draft.objectifs,
        { id: newId(), texte: '', complete: false }
      ]
    })
  const supprimerObjectif = (id: string) =>
    patch({ objectifs: draft.objectifs.filter((o) => o.id !== id) })

  const ajouterItem = () =>
    patch({
      recompense_items: [
        ...draft.recompense_items,
        { id: newId(), nom: '', quantite: 1 }
      ]
    })
  const supprimerItem = (id: string) =>
    patch({
      recompense_items: draft.recompense_items.filter((i) => i.id !== id)
    })

  const togglerPnj = (id: string) => {
    const set = new Set(draft.pnj_lies)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    patch({ pnj_lies: Array.from(set) })
  }

  const pnjFiltres = useMemo(() => {
    const q = pnjFilter.trim().toLowerCase()
    if (!q) return pnjs
    return pnjs.filter((p) => p.nom.toLowerCase().includes(q))
  }, [pnjs, pnjFilter])

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      ...draft,
      titre: draft.titre.trim() || 'Sans titre',
      objectifs: draft.objectifs.filter((o) => o.texte.trim() !== ''),
      recompense_items: draft.recompense_items.filter((i) => i.nom.trim() !== '')
    })
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
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-yellow-500">
            {quete.titre ? '✎ Modifier la quête' : '+ Nouvelle quête'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-white w-8 h-8 text-xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin]">
          <div>
            <label className="text-xs uppercase tracking-wider text-gray-400">
              Titre
            </label>
            <input
              type="text"
              value={draft.titre}
              onChange={(e) => patch({ titre: e.target.value })}
              autoFocus
              className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-yellow-500"
              placeholder="Le retour du dragon noir…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400">
                Type
              </label>
              <select
                value={draft.type}
                onChange={(e) => patch({ type: e.target.value as QueteType })}
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none"
              >
                <option value="principale">📜 Principale</option>
                <option value="secondaire">📃 Secondaire</option>
                <option value="personnelle">💭 Personnelle</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400">
                Statut
              </label>
              <select
                value={draft.status}
                onChange={(e) =>
                  patch({ status: e.target.value as QueteStatus })
                }
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none"
              >
                <option value="active">Active</option>
                <option value="terminee">Terminée</option>
                <option value="abandonnee">Abandonnée</option>
                <option value="echec">Échec</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-400">
              Description
            </label>
            <textarea
              value={draft.description ?? ''}
              onChange={(e) => patch({ description: e.target.value })}
              className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-yellow-500 min-h-[120px]"
              placeholder="Décris la mission, les enjeux, les indices initiaux…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400">
                ✨ Récompense XP
              </label>
              <input
                type="number"
                min={0}
                value={draft.recompense_xp}
                onChange={(e) =>
                  patch({ recompense_xp: parseInt(e.target.value) || 0 })
                }
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400">
                🪙 Récompense or (pièces)
              </label>
              <input
                type="number"
                min={0}
                value={draft.recompense_or}
                onChange={(e) =>
                  patch({ recompense_or: parseInt(e.target.value) || 0 })
                }
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs uppercase tracking-wider text-gray-400">
                🎁 Objets en récompense
              </label>
              <button
                type="button"
                onClick={ajouterItem}
                className="text-yellow-400 text-xs hover:text-yellow-300"
              >
                + Ajouter
              </button>
            </div>
            {draft.recompense_items.length === 0 ? (
              <p className="text-gray-500 text-xs italic">Aucun objet.</p>
            ) : (
              <ul className="space-y-1">
                {draft.recompense_items.map((it) => (
                  <li key={it.id} className="flex gap-2">
                    <input
                      type="text"
                      value={it.nom}
                      onChange={(e) =>
                        patch({
                          recompense_items: draft.recompense_items.map((x) =>
                            x.id === it.id ? { ...x, nom: e.target.value } : x
                          )
                        })
                      }
                      placeholder="Nom de l'objet"
                      className="flex-1 p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none text-sm"
                    />
                    <input
                      type="number"
                      min={1}
                      value={it.quantite}
                      onChange={(e) =>
                        patch({
                          recompense_items: draft.recompense_items.map((x) =>
                            x.id === it.id
                              ? { ...x, quantite: parseInt(e.target.value) || 1 }
                              : x
                          )
                        })
                      }
                      className="w-16 p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => supprimerItem(it.id)}
                      className="text-red-400 hover:text-red-300 px-2 text-sm"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs uppercase tracking-wider text-gray-400">
                ☑ Objectifs
              </label>
              <button
                type="button"
                onClick={ajouterObjectif}
                className="text-yellow-400 text-xs hover:text-yellow-300"
              >
                + Ajouter
              </button>
            </div>
            {draft.objectifs.length === 0 ? (
              <p className="text-gray-500 text-xs italic">Aucun objectif.</p>
            ) : (
              <ul className="space-y-1">
                {draft.objectifs.map((o) => (
                  <li key={o.id} className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={o.complete}
                      onChange={(e) =>
                        patch({
                          objectifs: draft.objectifs.map((x) =>
                            x.id === o.id
                              ? { ...x, complete: e.target.checked }
                              : x
                          )
                        })
                      }
                      className="accent-yellow-500"
                    />
                    <input
                      type="text"
                      value={o.texte}
                      onChange={(e) =>
                        patch({
                          objectifs: draft.objectifs.map((x) =>
                            x.id === o.id ? { ...x, texte: e.target.value } : x
                          )
                        })
                      }
                      placeholder="Décrire l'objectif…"
                      className="flex-1 p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => supprimerObjectif(o.id)}
                      className="text-red-400 hover:text-red-300 px-2 text-sm"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-400">
              🧑 PNJ liés
            </label>
            {pnjs.length === 0 ? (
              <p className="text-gray-500 text-xs italic">
                Crée des PNJ pour pouvoir les lier ici.
              </p>
            ) : (
              <>
                <input
                  type="text"
                  value={pnjFilter}
                  onChange={(e) => setPnjFilter(e.target.value)}
                  placeholder="Filtrer les PNJ…"
                  className="w-full mt-1 mb-2 p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none text-sm"
                />
                <div className="max-h-48 overflow-y-auto border border-gray-700 rounded p-1 space-y-0.5 [scrollbar-width:thin]">
                  {pnjFiltres.map((p) => {
                    const checked = draft.pnj_lies.includes(p.id)
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${
                          checked
                            ? 'bg-yellow-500/10 border border-yellow-500/30'
                            : 'hover:bg-gray-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglerPnj(p.id)}
                          className="accent-yellow-500"
                        />
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            loading="lazy"
                            className="w-7 h-7 rounded object-cover bg-gray-900"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded bg-gray-800 flex items-center justify-center">
                            🧑
                          </span>
                        )}
                        <span className="text-gray-200">{p.nom}</span>
                      </label>
                    )
                  })}
                </div>
              </>
            )}
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
            disabled={saving}
            className="px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-sm disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// QueteDetails — modale lecture + actions
// ============================================================================

function QueteDetails({
  quete,
  pnjs,
  onClose,
  onPatch,
  onTerminer
}: {
  quete: Quete
  pnjs: PnjLite[]
  onClose: () => void
  onPatch: (patch: Partial<Quete>) => Promise<void> | void
  onTerminer: () => Promise<void> | void
}) {
  const meta = TYPE_META[quete.type]
  const nbObj = quete.objectifs.length
  const nbDone = quete.objectifs.filter((o) => o.complete).length
  const pct = nbObj > 0 ? Math.round((nbDone / nbObj) * 100) : 0

  const toggleObjectif = (id: string) => {
    const next = quete.objectifs.map((o) =>
      o.id === id ? { ...o, complete: !o.complete } : o
    )
    onPatch({ objectifs: next })
  }

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/75 flex items-center justify-center p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2 min-w-0">
            <span>{meta.icone}</span>
            <span className="truncate">{quete.titre}</span>
            <span
              className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
              style={{
                background: `${meta.couleur}22`,
                border: `1px solid ${meta.couleur}55`,
                color: meta.couleur
              }}
            >
              {meta.label}
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white w-8 h-8 text-xl flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin]">
          {quete.description && (
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {quete.description}
            </p>
          )}

          {nbObj > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>
                  Objectifs : {nbDone}/{nbObj}
                </span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: meta.couleur }}
                />
              </div>
              <ul className="space-y-1">
                {quete.objectifs.map((o) => (
                  <li key={o.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={o.complete}
                      onChange={() => toggleObjectif(o.id)}
                      className="accent-yellow-500 w-4 h-4"
                      disabled={quete.status !== 'active'}
                    />
                    <span
                      className={
                        o.complete ? 'line-through text-gray-500' : 'text-gray-200'
                      }
                    >
                      {o.texte}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(quete.recompense_xp > 0 ||
            quete.recompense_or > 0 ||
            quete.recompense_items.length > 0) && (
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                Récompenses
              </h4>
              <div className="flex flex-wrap gap-2 text-sm">
                {quete.recompense_xp > 0 && (
                  <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
                    ✨ {quete.recompense_xp} XP
                  </span>
                )}
                {quete.recompense_or > 0 && (
                  <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    🪙 {quete.recompense_or} po
                  </span>
                )}
                {quete.recompense_items.map((it) => (
                  <span
                    key={it.id}
                    className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30"
                  >
                    🎁 {it.nom} × {it.quantite}
                  </span>
                ))}
              </div>
            </div>
          )}

          {quete.pnj_lies.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                PNJ liés
              </h4>
              <div className="flex flex-wrap gap-2">
                {quete.pnj_lies.map((id) => {
                  const p = pnjs.find((x) => x.id === id)
                  if (!p) return null
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-2 px-2 py-1 rounded bg-gray-800 border border-gray-700 text-sm"
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          loading="lazy"
                          className="w-5 h-5 rounded object-cover"
                        />
                      ) : (
                        '🧑'
                      )}
                      {p.nom}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {quete.status !== 'active' && quete.completed_at && (
            <p className="text-xs text-gray-500 italic">
              Terminée le {new Date(quete.completed_at).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-700 flex flex-wrap gap-2 justify-end">
          {quete.status === 'active' ? (
            <>
              <button
                type="button"
                onClick={() => onPatch({ status: 'echec' })}
                className="px-3 py-2 rounded bg-red-900/50 hover:bg-red-900 text-red-200 text-sm border border-red-800"
              >
                Échec
              </button>
              <button
                type="button"
                onClick={() => onPatch({ status: 'abandonnee' })}
                className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
              >
                Abandonner
              </button>
              <button
                type="button"
                onClick={onTerminer}
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-bold text-sm"
              >
                ✓ Marquer comme terminée
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() =>
                onPatch({ status: 'active', completed_at: null })
              }
              className="px-3 py-2 rounded bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-sm"
            >
              ↻ Rouvrir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function normaliserQuete(q: Quete): Quete {
  return {
    ...q,
    description: q.description ?? '',
    recompense_items: Array.isArray(q.recompense_items) ? q.recompense_items : [],
    objectifs: Array.isArray(q.objectifs) ? q.objectifs : [],
    pnj_lies: Array.isArray(q.pnj_lies) ? q.pnj_lies : []
  }
}
