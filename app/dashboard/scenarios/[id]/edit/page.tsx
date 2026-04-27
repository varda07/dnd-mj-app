'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Types
// ============================================================================

type Chapitre = {
  id: string
  scenario_id: string
  titre: string
  contenu: string
  ordre: number
  parent_id: string | null
}

type ElementType = 'ennemi' | 'item' | 'map' | 'pnj'

type ScenarioLien = {
  id: string
  scenario_id: string
  element_type: ElementType
  element_id: string
  chapitre_id: string | null
}

type Elem = {
  id: string
  nom: string
  image_url?: string | null
  sous_titre?: string | null
}

const ICONE: Record<ElementType, string> = {
  ennemi: '👹',
  item: '🎒',
  map: '🗺️',
  pnj: '🧑'
}

const LABEL: Record<ElementType, string> = {
  ennemi: 'Ennemis',
  item: 'Items',
  map: 'Cartes',
  pnj: 'PNJ'
}

const AUTO_SAVE_MS = 2000

// ============================================================================
// Helpers
// ============================================================================

// Construit l'arbre à partir d'une liste plate. Trie par ordre puis par titre.
type ChapNode = Chapitre & { children: ChapNode[] }
function buildTree(items: Chapitre[]): ChapNode[] {
  const map = new Map<string, ChapNode>()
  items.forEach((c) => map.set(c.id, { ...c, children: [] }))
  const roots: ChapNode[] = []
  items.forEach((c) => {
    const node = map.get(c.id)!
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  const sortRec = (arr: ChapNode[]) => {
    arr.sort((a, b) => a.ordre - b.ordre || a.titre.localeCompare(b.titre))
    arr.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

// ============================================================================
// Page
// ============================================================================

export default function ScenarioEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const scenarioId = params?.id

  const [scenarioNom, setScenarioNom] = useState('')
  const [chapitres, setChapitres] = useState<Chapitre[]>([])
  const [liens, setLiens] = useState<ScenarioLien[]>([])
  const [ennemis, setEnnemis] = useState<Elem[]>([])
  const [items, setItems] = useState<Elem[]>([])
  const [maps, setMaps] = useState<Elem[]>([])
  const [pnj, setPnj] = useState<Elem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [picker, setPicker] = useState<
    | { type: ElementType; scope: 'scenario' | 'chapitre' }
    | null
  >(null)
  const [selectedInPicker, setSelectedInPicker] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'saving'>('saved')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreNextAutoSave = useRef(false)

  const selected = selectedId ? chapitres.find((c) => c.id === selectedId) ?? null : null

  // --------------------------------------------------------------------------
  // Chargement initial
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!scenarioId) return
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data: scn } = await supabase
        .from('scenarios')
        .select('id, nom')
        .eq('id', scenarioId)
        .maybeSingle()

      if (!scn) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setScenarioNom(scn.nom)

      const [chapRes, lienRes, enn, itm, mps, pnjRes] = await Promise.all([
        supabase
          .from('chapitres')
          .select('*')
          .eq('scenario_id', scenarioId)
          .order('ordre')
          .order('created_at'),
        supabase
          .from('scenario_liens')
          .select('*')
          .eq('scenario_id', scenarioId),
        supabase
          .from('ennemis')
          .select('id, nom, image_url, notes')
          .eq('mj_id', user.id)
          .order('nom'),
        supabase
          .from('items')
          .select('id, nom, image_url, type, rarete')
          .eq('mj_id', user.id)
          .order('nom'),
        supabase
          .from('maps')
          .select('id, nom, image_url, description')
          .eq('mj_id', user.id)
          .order('nom'),
        supabase
          .from('pnj')
          .select('id, nom, image_url, race, role')
          .eq('mj_id', user.id)
          .order('nom')
      ])

      setChapitres((chapRes.data ?? []) as Chapitre[])
      setLiens((lienRes.data ?? []) as ScenarioLien[])
      setEnnemis(
        (enn.data ?? []).map((e) => ({
          id: e.id,
          nom: e.nom,
          image_url: e.image_url,
          sous_titre: e.notes ? String(e.notes).slice(0, 80) : null
        }))
      )
      setItems(
        (itm.data ?? []).map((i) => ({
          id: i.id,
          nom: i.nom,
          image_url: i.image_url,
          sous_titre: [i.type, i.rarete].filter(Boolean).join(' · ') || null
        }))
      )
      setMaps(
        (mps.data ?? []).map((m) => ({
          id: m.id,
          nom: m.nom,
          image_url: m.image_url,
          sous_titre: m.description ? String(m.description).slice(0, 80) : null
        }))
      )
      setPnj(
        (pnjRes.data ?? []).map((p) => ({
          id: p.id,
          nom: p.nom,
          image_url: p.image_url,
          sous_titre: [p.race, p.role].filter(Boolean).join(' · ') || null
        }))
      )

      // Sélectionne le premier chapitre racine s'il existe
      const firstRoot = (chapRes.data ?? [])
        .filter((c: Chapitre) => !c.parent_id)
        .sort((a: Chapitre, b: Chapitre) => a.ordre - b.ordre)[0]
      if (firstRoot) setSelectedId(firstRoot.id)

      setLoading(false)
    }
    load()
  }, [scenarioId, router])

  // --------------------------------------------------------------------------
  // Auto-save du chapitre courant (titre + contenu)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!selected || ignoreNextAutoSave.current) {
      ignoreNextAutoSave.current = false
      return
    }
    setSaveState('pending')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveState('saving')
      const { error } = await supabase
        .from('chapitres')
        .update({ titre: selected.titre, contenu: selected.contenu })
        .eq('id', selected.id)
      if (error) {
        console.error('[scenario edit] save chapitre :', error)
      }
      setSaveState('saved')
    }, AUTO_SAVE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.titre, selected?.contenu])

  // Patch local d'un chapitre (déclenche auto-save via l'effet ci-dessus)
  const patchChapitre = (id: string, patch: Partial<Chapitre>) => {
    setChapitres((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  // --------------------------------------------------------------------------
  // Actions chapitres
  // --------------------------------------------------------------------------
  const creerChapitre = async (parentId: string | null = null) => {
    if (!scenarioId) return
    const freres = chapitres.filter((c) => (c.parent_id ?? null) === parentId)
    const ordre = freres.reduce((m, c) => Math.max(m, c.ordre), -1) + 1
    const { data, error } = await supabase
      .from('chapitres')
      .insert({
        scenario_id: scenarioId,
        titre: 'Sans titre',
        contenu: '',
        parent_id: parentId,
        ordre
      })
      .select()
      .single()
    if (error) {
      console.error('[scenario edit] create chapitre :', error)
      return
    }
    if (data) {
      setChapitres((prev) => [...prev, data as Chapitre])
      ignoreNextAutoSave.current = true
      setSelectedId(data.id)
      if (parentId) {
        // Développe le parent si on crée un sous-chapitre
        setCollapsed((prev) => {
          const next = new Set(prev)
          next.delete(parentId)
          return next
        })
      }
    }
  }

  const supprimerChapitre = async (id: string) => {
    if (!window.confirm('Supprimer ce chapitre et tous ses sous-chapitres ?')) return
    const { error } = await supabase.from('chapitres').delete().eq('id', id)
    if (error) {
      console.error('[scenario edit] delete chapitre :', error)
      return
    }
    // Retire le chapitre + descendants (on se fie au cascade DB côté serveur
    // mais on nettoie aussi localement).
    const toRemove = new Set<string>([id])
    let changed = true
    while (changed) {
      changed = false
      for (const c of chapitres) {
        if (c.parent_id && toRemove.has(c.parent_id) && !toRemove.has(c.id)) {
          toRemove.add(c.id)
          changed = true
        }
      }
    }
    setChapitres((prev) => prev.filter((c) => !toRemove.has(c.id)))
    setLiens((prev) => prev.filter((l) => !l.chapitre_id || !toRemove.has(l.chapitre_id)))
    if (selectedId && toRemove.has(selectedId)) setSelectedId(null)
  }

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // --------------------------------------------------------------------------
  // Drag & drop pour réordonner au sein d'un même parent
  // --------------------------------------------------------------------------
  const [dragId, setDragId] = useState<string | null>(null)

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const onDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) return
    const src = chapitres.find((c) => c.id === dragId)
    const tgt = chapitres.find((c) => c.id === targetId)
    if (!src || !tgt) return
    // Autorise uniquement au sein d'un même parent.
    if ((src.parent_id ?? null) !== (tgt.parent_id ?? null)) {
      setDragId(null)
      return
    }
    const freres = chapitres
      .filter((c) => (c.parent_id ?? null) === (src.parent_id ?? null))
      .sort((a, b) => a.ordre - b.ordre)
    const without = freres.filter((c) => c.id !== src.id)
    const tgtIdx = without.findIndex((c) => c.id === targetId)
    const newOrder = [...without.slice(0, tgtIdx), src, ...without.slice(tgtIdx)]
    // Réécrit les ordres localement.
    const next = chapitres.map((c) => {
      const idx = newOrder.findIndex((n) => n.id === c.id)
      return idx >= 0 ? { ...c, ordre: idx } : c
    })
    setChapitres(next)
    setDragId(null)
    // Persiste les nouveaux ordres.
    await Promise.all(
      newOrder.map((c, i) =>
        supabase.from('chapitres').update({ ordre: i }).eq('id', c.id)
      )
    )
  }

  // --------------------------------------------------------------------------
  // Liens (ennemis / items / maps)
  // --------------------------------------------------------------------------
  const liensDuScenario = useMemo(
    () => liens.filter((l) => !l.chapitre_id),
    [liens]
  )
  const liensDuChapitre = useMemo(
    () => liens.filter((l) => l.chapitre_id === selectedId),
    [liens, selectedId]
  )

  const elemList = (type: ElementType): Elem[] =>
    type === 'ennemi'
      ? ennemis
      : type === 'item'
      ? items
      : type === 'map'
      ? maps
      : pnj

  const resolverElem = (type: ElementType, id: string): Elem | undefined =>
    elemList(type).find((e) => e.id === id)

  const ouvrirPicker = (type: ElementType, scope: 'scenario' | 'chapitre') => {
    setPicker({ type, scope })
    setSelectedInPicker(new Set())
  }

  const togglePickerSelection = (id: string) => {
    setSelectedInPicker((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const confirmerPicker = async () => {
    if (!picker || !scenarioId) return
    const existing = picker.scope === 'chapitre' ? liensDuChapitre : liensDuScenario
    const dejaLies = new Set(
      existing.filter((l) => l.element_type === picker.type).map((l) => l.element_id)
    )
    const chapitreId = picker.scope === 'chapitre' ? selectedId : null
    if (picker.scope === 'chapitre' && !chapitreId) return
    const rows = Array.from(selectedInPicker)
      .filter((id) => !dejaLies.has(id))
      .map((element_id) => ({
        scenario_id: scenarioId,
        element_type: picker.type,
        element_id,
        chapitre_id: chapitreId
      }))
    if (rows.length === 0) {
      setPicker(null)
      return
    }
    const { data, error } = await supabase
      .from('scenario_liens')
      .insert(rows)
      .select()
    if (error) {
      console.error('[scenario edit] ajouter liens :', error)
      setPicker(null)
      return
    }
    setLiens((prev) => [...prev, ...((data ?? []) as ScenarioLien[])])
    setPicker(null)
  }

  const retirerLien = async (id: string) => {
    const { error } = await supabase.from('scenario_liens').delete().eq('id', id)
    if (error) {
      console.error('[scenario edit] retirer lien :', error)
      return
    }
    setLiens((prev) => prev.filter((l) => l.id !== id))
  }

  // --------------------------------------------------------------------------
  // Rendu
  // --------------------------------------------------------------------------
  const tree = useMemo(() => buildTree(chapitres), [chapitres])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#1a1a1a] text-gray-200 p-6">
        <p className="text-gray-400">Chargement…</p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#1a1a1a] text-gray-200 p-6">
        <button
          type="button"
          onClick={() => router.push('/dashboard/scenarios')}
          className="text-gray-400 hover:text-white mb-4"
        >
          ← Retour
        </button>
        <p className="text-red-400">Scénario introuvable.</p>
      </main>
    )
  }

  const saveLabel =
    saveState === 'saved'
      ? '✓ Enregistré'
      : saveState === 'pending'
      ? '⋯ En attente'
      : '💾 Enregistrement…'

  return (
    <main className="min-h-screen bg-[#1a1a1a] text-gray-200 flex flex-col">
      {/* Barre supérieure */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-[#1e1e1e]">
        <button
          type="button"
          onClick={() => router.push('/dashboard/scenarios')}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Scénarios
        </button>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="md:hidden ml-auto px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm"
          aria-label="Ouvrir la liste des chapitres"
        >
          ☰ Chapitres
        </button>
        <h1 className="hidden md:block text-lg font-semibold text-gray-100 ml-2 truncate flex-1">
          📖 {scenarioNom}
        </h1>
        <span
          className={`hidden md:inline text-xs ${
            saveState === 'saved'
              ? 'text-green-400'
              : saveState === 'saving'
              ? 'text-yellow-400'
              : 'text-gray-400'
          }`}
        >
          {saveLabel}
        </span>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar — chapitres (drawer sur mobile) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#1e1e1e] border-r border-gray-800 transform transition-transform md:static md:translate-x-0 md:w-72 flex flex-col ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
              Chapitres
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="md:hidden text-gray-400 hover:text-white w-7 h-7"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {tree.length === 0 ? (
              <p className="text-gray-500 text-xs italic px-2 py-4 text-center">
                Aucun chapitre pour l&apos;instant.
              </p>
            ) : (
              <ChapterTree
                nodes={tree}
                selectedId={selectedId}
                collapsed={collapsed}
                onSelect={(id) => {
                  setSelectedId(id)
                  setDrawerOpen(false)
                }}
                onToggleCollapse={toggleCollapsed}
                onAddChild={(pid) => creerChapitre(pid)}
                onDelete={supprimerChapitre}
                dragId={dragId}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
              />
            )}
          </div>
          <div className="p-2 border-t border-gray-800">
            <button
              type="button"
              onClick={() => creerChapitre(null)}
              className="w-full px-3 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-gray-900 text-sm font-bold"
            >
              ➕ Nouveau chapitre
            </button>
          </div>
        </aside>

        {drawerOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Centre — éditeur */}
        <section className="flex-1 min-w-0 overflow-y-auto">
          {!selected ? (
            <div className="h-full flex items-center justify-center p-10 text-center">
              <div className="max-w-md">
                <p className="text-gray-400 mb-4">
                  Sélectionne un chapitre dans la colonne de gauche, ou crée-en un pour commencer.
                </p>
                <button
                  type="button"
                  onClick={() => creerChapitre(null)}
                  className="px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-bold"
                >
                  ➕ Nouveau chapitre
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-6">
              <input
                type="text"
                value={selected.titre}
                onChange={(e) => patchChapitre(selected.id, { titre: e.target.value })}
                placeholder="Titre du chapitre"
                className="w-full bg-transparent text-3xl md:text-4xl font-bold text-gray-100 border-none outline-none placeholder-gray-600 focus:ring-0"
              />
              <textarea
                value={selected.contenu}
                onChange={(e) => patchChapitre(selected.id, { contenu: e.target.value })}
                placeholder="Raconte l'histoire, décris les lieux, note les règles maison…"
                className="w-full min-h-[40vh] bg-transparent text-base text-gray-200 leading-relaxed border border-gray-800 rounded p-4 outline-none focus:border-gray-600 resize-y"
              />

              <LinkSections
                labelScope="PNJ liés au chapitre"
                elems={pnj}
                liens={liensDuChapitre.filter((l) => l.element_type === 'pnj')}
                resolveElem={(id) => resolverElem('pnj', id)}
                icone={ICONE.pnj}
                onAdd={() => ouvrirPicker('pnj', 'chapitre')}
                onRemove={retirerLien}
              />
              <LinkSections
                labelScope="Ennemis liés au chapitre"
                elems={ennemis}
                liens={liensDuChapitre.filter((l) => l.element_type === 'ennemi')}
                resolveElem={(id) => resolverElem('ennemi', id)}
                icone={ICONE.ennemi}
                onAdd={() => ouvrirPicker('ennemi', 'chapitre')}
                onRemove={retirerLien}
              />
              <LinkSections
                labelScope="Items liés au chapitre"
                elems={items}
                liens={liensDuChapitre.filter((l) => l.element_type === 'item')}
                resolveElem={(id) => resolverElem('item', id)}
                icone={ICONE.item}
                onAdd={() => ouvrirPicker('item', 'chapitre')}
                onRemove={retirerLien}
              />
              <LinkSections
                labelScope="Cartes liées au chapitre"
                elems={maps}
                liens={liensDuChapitre.filter((l) => l.element_type === 'map')}
                resolveElem={(id) => resolverElem('map', id)}
                icone={ICONE.map}
                onAdd={() => ouvrirPicker('map', 'chapitre')}
                onRemove={retirerLien}
              />
            </div>
          )}
        </section>

        {/* Droite — éléments du scénario global */}
        <aside className="hidden lg:flex w-80 border-l border-gray-800 bg-[#1e1e1e] flex-col">
          <div className="px-3 py-2 border-b border-gray-800">
            <span className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
              Scénario global
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {(['pnj', 'ennemi', 'item', 'map'] as ElementType[]).map((type) => {
              const lst = liensDuScenario.filter((l) => l.element_type === type)
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-300">
                      {ICONE[type]} {LABEL[type]} ({lst.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => ouvrirPicker(type, 'scenario')}
                      className="text-[10px] uppercase tracking-wider text-yellow-500 hover:text-yellow-400"
                      title="🔗 Lier à ce scénario"
                    >
                      🔗 Lier
                    </button>
                  </div>
                  {lst.length === 0 ? (
                    <p className="text-gray-600 text-xs italic">Aucun.</p>
                  ) : (
                    <ul className="space-y-1">
                      {lst.map((l) => {
                        const e = resolverElem(type, l.element_id)
                        return (
                          <li
                            key={l.id}
                            className="flex items-center gap-2 bg-[#151515] border border-gray-800 rounded p-2"
                          >
                            <span className="text-base leading-none">{ICONE[type]}</span>
                            <span className="text-sm text-gray-200 truncate flex-1">
                              {e?.nom ?? '(élément supprimé)'}
                            </span>
                            <button
                              type="button"
                              onClick={() => retirerLien(l.id)}
                              className="text-gray-500 hover:text-red-400 text-xs"
                              title="Retirer"
                            >
                              ✕
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </aside>
      </div>

      {/* Modale sélecteur */}
      {picker && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPicker(null)}
        >
          <div
            className="bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-gray-100 font-bold">
                {ICONE[picker.type]} Lier {LABEL[picker.type].toLowerCase()} —{' '}
                {picker.scope === 'scenario' ? 'scénario entier' : 'ce chapitre'}
              </h3>
              <button
                type="button"
                onClick={() => setPicker(null)}
                className="text-gray-400 hover:text-white w-8 h-8 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {elemList(picker.type).length === 0 ? (
                <p className="text-gray-500 text-sm italic p-4">
                  Aucun élément disponible. Crée d&apos;abord des {LABEL[picker.type].toLowerCase()} dans leur page dédiée.
                </p>
              ) : (
                <ul className="space-y-1">
                  {elemList(picker.type).map((e) => {
                    const existants =
                      picker.scope === 'chapitre'
                        ? liensDuChapitre.filter((l) => l.element_type === picker.type)
                        : liensDuScenario.filter((l) => l.element_type === picker.type)
                    const deja = existants.some((l) => l.element_id === e.id)
                    const coche = selectedInPicker.has(e.id)
                    return (
                      <li key={e.id}>
                        <label
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer border ${
                            deja
                              ? 'bg-gray-800/40 border-gray-700 opacity-50 cursor-not-allowed'
                              : coche
                              ? 'bg-yellow-600/10 border-yellow-600/60'
                              : 'bg-[#151515] border-gray-800 hover:bg-gray-800/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={coche}
                            disabled={deja}
                            onChange={() => togglePickerSelection(e.id)}
                            className="w-4 h-4 accent-yellow-500 flex-shrink-0"
                          />
                          {e.image_url ? (
                            <img
                              src={e.image_url}
                              alt=""
                              loading="lazy"
                              className="w-9 h-9 rounded object-cover bg-gray-900 flex-shrink-0"
                            />
                          ) : (
                            <span className="w-9 h-9 rounded bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
                              {ICONE[picker.type]}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-100 text-sm font-medium truncate">
                              {e.nom}
                            </p>
                            {e.sous_titre && (
                              <p className="text-gray-500 text-xs truncate">
                                {e.sous_titre}
                              </p>
                            )}
                          </div>
                          {deja && (
                            <span className="text-[10px] text-gray-500 uppercase">déjà lié</span>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="p-3 border-t border-gray-800 flex gap-2">
              <button
                type="button"
                onClick={confirmerPicker}
                disabled={selectedInPicker.size === 0}
                className="flex-1 px-3 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-bold disabled:opacity-50"
              >
                Lier ({selectedInPicker.size})
              </button>
              <button
                type="button"
                onClick={() => setPicker(null)}
                className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ============================================================================
// ChapterTree — arborescence de chapitres
// ============================================================================

function ChapterTree(props: {
  nodes: ChapNode[]
  selectedId: string | null
  collapsed: Set<string>
  onSelect: (id: string) => void
  onToggleCollapse: (id: string) => void
  onAddChild: (parentId: string) => void
  onDelete: (id: string) => void
  dragId: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, id: string) => void
}) {
  return (
    <ul className="space-y-0.5">
      {props.nodes.map((n) => (
        <ChapterRow key={n.id} node={n} depth={0} {...props} />
      ))}
    </ul>
  )
}

type ChapterRowProps = {
  node: ChapNode
  depth: number
  selectedId: string | null
  collapsed: Set<string>
  onSelect: (id: string) => void
  onToggleCollapse: (id: string) => void
  onAddChild: (parentId: string) => void
  onDelete: (id: string) => void
  dragId: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, id: string) => void
}

function ChapterRow(props: ChapterRowProps) {
  const { node, depth, ...rest } = props
  const hasChildren = node.children.length > 0
  const isCollapsed = props.collapsed.has(node.id)
  const isSelected = props.selectedId === node.id
  const isDragged = props.dragId === node.id

  return (
    <li>
      <div
        draggable
        onDragStart={(e) => props.onDragStart(e, node.id)}
        onDragOver={props.onDragOver}
        onDrop={(e) => props.onDrop(e, node.id)}
        className={`group flex items-center gap-1 rounded px-1 py-1 cursor-pointer text-sm transition ${
          isSelected
            ? 'bg-yellow-600/15 text-yellow-100'
            : 'hover:bg-gray-800/60 text-gray-200'
        } ${isDragged ? 'opacity-40' : ''}`}
        style={{ paddingLeft: 4 + depth * 14 }}
        onClick={() => props.onSelect(node.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              props.onToggleCollapse(node.id)
            }}
            className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-200"
            aria-label={isCollapsed ? 'Déplier' : 'Replier'}
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span className="w-4 h-4" aria-hidden="true" />
        )}
        <span className="flex-1 truncate">{node.titre || 'Sans titre'}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            props.onAddChild(node.id)
          }}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-yellow-400 text-xs"
          title="Ajouter un sous-chapitre"
        >
          ➕
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            props.onDelete(node.id)
          }}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-400 text-xs"
          title="Supprimer"
        >
          ✕
        </button>
      </div>
      {hasChildren && !isCollapsed && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <ChapterRow key={c.id} node={c} depth={depth + 1} {...rest} />
          ))}
        </ul>
      )}
    </li>
  )
}

// ============================================================================
// LinkSections — section pliable par type (ennemis/items/maps) pour le chapitre
// ============================================================================

function LinkSections(props: {
  labelScope: string
  elems: Elem[]
  liens: ScenarioLien[]
  resolveElem: (id: string) => Elem | undefined
  icone: string
  onAdd: () => void
  onRemove: (id: string) => Promise<void>
}) {
  const [ouvert, setOuvert] = useState(true)
  return (
    <div className="border border-gray-800 rounded bg-[#1e1e1e]">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-800/60 rounded"
      >
        <span className="text-sm font-semibold text-gray-200">
          {props.icone} {props.labelScope} ({props.liens.length})
        </span>
        <span className="text-gray-500 text-sm">{ouvert ? '▾' : '▸'}</span>
      </button>
      {ouvert && (
        <div className="p-3 border-t border-gray-800 space-y-2">
          {props.liens.length === 0 && (
            <p className="text-gray-500 text-xs italic">Aucun élément lié.</p>
          )}
          {props.liens.map((l) => {
            const e = props.resolveElem(l.element_id)
            return (
              <div
                key={l.id}
                className="flex items-center gap-3 bg-[#151515] border border-gray-800 rounded p-2"
              >
                {e?.image_url ? (
                  <img
                    src={e.image_url}
                    alt=""
                    loading="lazy"
                    className="w-9 h-9 rounded object-cover bg-gray-900 flex-shrink-0"
                  />
                ) : (
                  <span className="w-9 h-9 rounded bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
                    {props.icone}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-100 text-sm font-medium truncate">
                    {e?.nom ?? '(élément supprimé)'}
                  </p>
                  {e?.sous_titre && (
                    <p className="text-gray-500 text-xs truncate">{e.sous_titre}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => props.onRemove(l.id)}
                  className="text-gray-500 hover:text-red-400 text-sm"
                  title="Retirer"
                >
                  ✕
                </button>
              </div>
            )
          })}
          <button
            type="button"
            onClick={props.onAdd}
            className="w-full mt-1 px-3 py-2 rounded border border-dashed border-gray-700 text-gray-400 hover:border-yellow-600 hover:text-yellow-400 text-sm"
          >
            ➕ Ajouter
          </button>
        </div>
      )}
    </div>
  )
}
