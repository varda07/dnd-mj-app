'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MeteoGenerator from '@/app/components/MeteoGenerator'
import GuidedTour from '@/app/components/GuidedTour'

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
  // Roadmap 1.4 — durée estimée du chapitre en minutes.
  duree_estimee: number
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
  // Roadmap 1.3 — notes secrètes MJ (jamais affichées en présentation).
  const [notesSecretes, setNotesSecretes] = useState('')
  const [notesSecretesOuvert, setNotesSecretesOuvert] = useState(false)
  // Roadmap Affinement 2.4 — Météo modale
  const [meteoOuvert, setMeteoOuvert] = useState(false)
  // Roadmap 11.2 — wallpaper d'ambiance du scénario.
  const [wallpaperUrl, setWallpaperUrl] = useState('')
  const [wallpaperOuvert, setWallpaperOuvert] = useState(false)
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
        .select('id, nom, notes_secretes, wallpaper_url, mj_id')
        .eq('id', scenarioId)
        .maybeSingle()

      if (!scn) {
        setNotFound(true)
        setLoading(false)
        return
      }

      // Roadmap 1.1 — Phase 1 — Les joueurs (non-MJ) ne peuvent pas accéder à
      // l'édition. On les renvoie vers la page de leur PJ ou le dashboard.
      if (scn.mj_id !== user.id) {
        router.replace('/dashboard')
        return
      }
      setScenarioNom(scn.nom)
      setNotesSecretes((scn.notes_secretes as string | null) ?? '')
      setWallpaperUrl((scn.wallpaper_url as string | null) ?? '')

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
  // Auto-save du chapitre courant (titre + contenu + durée estimée)
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
        .update({
          titre: selected.titre,
          contenu: selected.contenu,
          duree_estimee: selected.duree_estimee
        })
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
  }, [selected?.titre, selected?.contenu, selected?.duree_estimee])

  // Roadmap 1.3 — auto-save des notes secrètes MJ (débounce).
  const notesSecretesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notesSecretesInit = useRef(true)
  useEffect(() => {
    if (notesSecretesInit.current) {
      notesSecretesInit.current = false
      return
    }
    if (!scenarioId) return
    if (notesSecretesTimer.current) clearTimeout(notesSecretesTimer.current)
    notesSecretesTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from('scenarios')
        .update({ notes_secretes: notesSecretes || null })
        .eq('id', scenarioId)
      if (error) console.error('[scenario edit] save notes secrètes :', error)
    }, AUTO_SAVE_MS)
    return () => {
      if (notesSecretesTimer.current) clearTimeout(notesSecretesTimer.current)
    }
  }, [notesSecretes, scenarioId])

  // Roadmap 11.2 — auto-save du wallpaper du scénario (débounce).
  const wallpaperTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wallpaperInit = useRef(true)
  useEffect(() => {
    if (wallpaperInit.current) {
      wallpaperInit.current = false
      return
    }
    if (!scenarioId) return
    if (wallpaperTimer.current) clearTimeout(wallpaperTimer.current)
    wallpaperTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from('scenarios')
        .update({ wallpaper_url: wallpaperUrl.trim() || null })
        .eq('id', scenarioId)
      if (error) console.error('[scenario edit] save wallpaper :', error)
    }, AUTO_SAVE_MS)
    return () => {
      if (wallpaperTimer.current) clearTimeout(wallpaperTimer.current)
    }
  }, [wallpaperUrl, scenarioId])

  // Roadmap 1.4 — total de durée estimée sur l'ensemble des chapitres.
  const dureeTotale = chapitres.reduce(
    (sum, c) => sum + (c.duree_estimee || 0),
    0
  )

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

  // Crée un chapitre frère à une position précise (insertion entre deux
  // rangs). Décale les ordres des frères situés après la position cible.
  const creerChapitreAt = async (
    parentId: string | null,
    insertIndex: number
  ) => {
    if (!scenarioId) return
    const freres = chapitres
      .filter((c) => (c.parent_id ?? null) === parentId)
      .sort((a, b) => a.ordre - b.ordre)
    const { data, error } = await supabase
      .from('chapitres')
      .insert({
        scenario_id: scenarioId,
        titre: 'Sans titre',
        contenu: '',
        parent_id: parentId,
        ordre: insertIndex
      })
      .select()
      .single()
    if (error || !data) {
      console.error('[scenario edit] create chapitre at :', error)
      return
    }
    const newCh = data as Chapitre
    const updates = freres
      .map((c, i) => ({ id: c.id, newOrdre: i >= insertIndex ? c.ordre + 1 : c.ordre, oldOrdre: c.ordre }))
      .filter((u) => u.oldOrdre !== u.newOrdre)
    await Promise.all(
      updates.map((u) =>
        supabase.from('chapitres').update({ ordre: u.newOrdre }).eq('id', u.id)
      )
    )
    setChapitres((prev) => {
      const updated = prev.map((c) => {
        const u = updates.find((uu) => uu.id === c.id)
        return u ? { ...c, ordre: u.newOrdre } : c
      })
      return [...updated, newCh]
    })
    if (parentId) {
      setCollapsed((prev) => {
        const next = new Set(prev)
        next.delete(parentId)
        return next
      })
    }
    ignoreNextAutoSave.current = true
    setSelectedId(newCh.id)
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
          onClick={() => router.back()}
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
    <main
      className="min-h-screen bg-[#191919] text-gray-100 flex flex-col"
      style={{
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontFeatureSettings: '"cv11", "ss01", "ss03"'
      }}
    >
      {/* Roadmap 11.2 — wallpaper d'ambiance affiché discrètement en fond. */}
      {wallpaperUrl.trim() && (
        <div
          aria-hidden
          className="fixed inset-0 -z-10 bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage: `url(${wallpaperUrl.trim()})`,
            opacity: 0.12
          }}
        />
      )}
      {/* Barre supérieure — minimaliste, peu de bordures */}
      <header className="flex items-center gap-3 px-5 py-3 bg-[#191919]/95 backdrop-blur sticky top-0 z-20">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-200 text-sm transition"
        >
          ← Scénarios
        </button>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="md:hidden ml-auto px-2 py-1 rounded text-gray-300 hover:bg-white/5 text-sm transition"
          aria-label="Ouvrir la liste des chapitres"
        >
          ☰ Chapitres
        </button>
        <h1 className="hidden md:block text-sm font-medium text-gray-300 ml-2 truncate flex-1">
          {scenarioNom}
        </h1>
        <span
          className={`hidden md:inline text-xs transition ${
            saveState === 'saved'
              ? 'text-gray-500'
              : saveState === 'saving'
              ? 'text-yellow-400'
              : 'text-gray-400'
          }`}
        >
          {saveLabel}
        </span>
      </header>

      {/* Roadmap Finalisation 3.4 — accès aux sous-pages du scénario sur mobile.
          Le panneau « Scénario global » de droite est `hidden lg:flex` (invisible
          sous 1024px) : cette barre défilante le remplace sur petit écran. */}
      <GuidedTour tourId="scenario" />
      <nav data-tour="scenario-souspages" className="lg:hidden flex gap-2 overflow-x-auto px-3 py-2 bg-[#191919]/80 border-b border-yellow-900/30 [scrollbar-width:thin]">
        {[
          { label: '📋 Session zéro', sub: 'session-zero' },
          { label: '💰 Économie', sub: 'economie' },
          { label: "✨ Suivi d'XP", sub: 'xp' },
          { label: '📌 Memo MJ', sub: 'memo' },
          { label: '🗓 Calendrier', sub: 'calendrier' },
          { label: '📔 Récap', sub: 'recap' }
        ].map((it) => (
          <button
            key={it.sub}
            type="button"
            onClick={() => router.push(`/dashboard/scenarios/${scenarioId}/${it.sub}`)}
            className="whitespace-nowrap px-3 py-1.5 rounded border border-yellow-700/40 bg-[#171717] text-yellow-400 hover:border-yellow-600 text-xs font-bold uppercase tracking-[0.14em] transition"
          >
            {it.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar — chapitres (drawer sur mobile) */}
        <aside
          data-tour="scenario-chapitres"
          className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#1c1c1c] transform transition-transform md:static md:translate-x-0 md:w-72 flex flex-col ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium">
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
          <div className="flex-1 overflow-y-auto px-2 py-1">
            {tree.length === 0 ? (
              <p className="text-gray-500 text-xs italic px-3 py-6 text-center">
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
                onInsertSibling={creerChapitreAt}
                onDelete={supprimerChapitre}
                dragId={dragId}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
              />
            )}
          </div>
          <div className="px-3 py-3">
            <button
              type="button"
              onClick={() => creerChapitre(null)}
              className="w-full px-3 py-2 rounded text-gray-400 hover:text-gray-100 hover:bg-white/[0.04] text-sm text-left transition"
            >
              <span className="opacity-70">+</span> Nouveau chapitre
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
                  className="px-4 py-2 rounded text-gray-200 hover:bg-white/[0.06] transition"
                >
                  + Nouveau chapitre
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-6 md:px-16 pt-16 md:pt-24 pb-32 space-y-8">
              <ChapterHeader
                key={selected.id}
                titre={selected.titre}
                onTitreChange={(v) => patchChapitre(selected.id, { titre: v })}
              />

              {/* Roadmap 1.4 — durée estimée du chapitre + total du scénario */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 -mt-3">
                <label className="flex items-center gap-2">
                  <span className="uppercase tracking-[0.18em]">⏱ Durée estimée</span>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={selected.duree_estimee ?? 0}
                    onChange={(e) =>
                      patchChapitre(selected.id, {
                        duree_estimee: Math.max(0, Number(e.target.value) || 0)
                      })
                    }
                    className="w-20 bg-transparent border-b border-yellow-700/40 text-yellow-100 outline-none text-sm px-1 focus:border-yellow-500"
                  />
                  <span>min</span>
                </label>
                {dureeTotale > 0 && (
                  <span className="text-gray-500 italic">
                    · Total scénario : {Math.floor(dureeTotale / 60)}h{' '}
                    {String(dureeTotale % 60).padStart(2, '0')} ({dureeTotale} min)
                  </span>
                )}
              </div>

              <textarea
                value={selected.contenu}
                onChange={(e) => patchChapitre(selected.id, { contenu: e.target.value })}
                placeholder="Raconte l'histoire, décris les lieux, note les règles maison…  Tape ici."
                className="w-full min-h-[55vh] bg-transparent text-[16px] text-gray-200 leading-[1.7] border-none outline-none placeholder-gray-600 focus:ring-0 resize-y"
                style={{
                  fontFamily:
                    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
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
        <aside className="hidden lg:flex w-80 bg-[#1c1c1c] flex-col">
          <div className="px-4 pt-3 pb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium">
              Scénario global
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Roadmap 1.2 — accès à la Session zéro */}
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/scenarios/${scenarioId}/session-zero`)
              }
              className="w-full px-3 py-2 rounded border border-yellow-700/40 bg-[#171717] text-yellow-400 hover:bg-[#1c1c1c] hover:border-yellow-600 text-xs font-bold uppercase tracking-[0.16em] transition"
            >
              📋 Session zéro
            </button>

            {/* Roadmap 4.4 — accès à l'Économie de campagne */}
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/scenarios/${scenarioId}/economie`)
              }
              className="w-full px-3 py-2 rounded border border-yellow-700/40 bg-[#171717] text-yellow-400 hover:bg-[#1c1c1c] hover:border-yellow-600 text-xs font-bold uppercase tracking-[0.16em] transition"
            >
              💰 Économie de campagne
            </button>

            {/* Roadmap 8.2 — accès au suivi d'XP */}
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/scenarios/${scenarioId}/xp`)
              }
              className="w-full px-3 py-2 rounded border border-yellow-700/40 bg-[#171717] text-yellow-400 hover:bg-[#1c1c1c] hover:border-yellow-600 text-xs font-bold uppercase tracking-[0.16em] transition"
            >
              ✨ Suivi d&apos;XP
            </button>

            {/* Roadmap 8.4 — accès au Memo MJ */}
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/scenarios/${scenarioId}/memo`)
              }
              className="w-full px-3 py-2 rounded border border-yellow-700/40 bg-[#171717] text-yellow-400 hover:bg-[#1c1c1c] hover:border-yellow-600 text-xs font-bold uppercase tracking-[0.16em] transition"
            >
              📌 Memo MJ
            </button>

            {/* Préparateur de combat — combats préparés de ce scénario (Phase 2.2) */}
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/combat-prepare?scenario=${scenarioId}`)
              }
              className="w-full px-3 py-2 rounded border border-yellow-700/40 bg-[#171717] text-yellow-400 hover:bg-[#1c1c1c] hover:border-yellow-600 text-xs font-bold uppercase tracking-[0.16em] transition codex-btn-press"
            >
              ⚔️ Combats préparés
            </button>

            {/* Roadmap Affinement 2.3 — Calendrier de campagne */}
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/scenarios/${scenarioId}/calendrier`)
              }
              className="w-full px-3 py-2 rounded border border-yellow-700/40 bg-[#171717] text-yellow-400 hover:bg-[#1c1c1c] hover:border-yellow-600 text-xs font-bold uppercase tracking-[0.16em] transition codex-btn-press"
            >
              🗓 Calendrier in-game
            </button>

            {/* Roadmap Affinement 2.4 — Générer la météo */}
            <button
              type="button"
              onClick={() => setMeteoOuvert(true)}
              className="w-full px-3 py-2 rounded border border-yellow-700/40 bg-[#171717] text-yellow-400 hover:bg-[#1c1c1c] hover:border-yellow-600 text-xs font-bold uppercase tracking-[0.16em] transition codex-btn-press"
            >
              🌦 Générer la météo
            </button>

            {/* Roadmap Affinement 2.9 — Récap automatique de session */}
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/scenarios/${scenarioId}/recap`)
              }
              className="w-full px-3 py-2 rounded border border-yellow-700/40 bg-[#171717] text-yellow-400 hover:bg-[#1c1c1c] hover:border-yellow-600 text-xs font-bold uppercase tracking-[0.16em] transition codex-btn-press"
            >
              📔 Récap de session
            </button>

            {/* Roadmap 11.2 — Wallpaper d'ambiance du scénario. */}
            <div className="rounded-lg border border-yellow-800/40 bg-[#171717]">
              <button
                type="button"
                onClick={() => setWallpaperOuvert((v) => !v)}
                aria-expanded={wallpaperOuvert}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
              >
                <span className="text-xs font-bold text-yellow-500">
                  🖼️ Wallpaper d&apos;ambiance
                </span>
                <span className="text-[10px] text-gray-500">
                  {wallpaperOuvert ? '▾' : '▸'}
                </span>
              </button>
              {wallpaperOuvert && (
                <div className="px-3 pb-3 space-y-2">
                  <input
                    type="text"
                    value={wallpaperUrl}
                    onChange={(e) => setWallpaperUrl(e.target.value)}
                    placeholder="URL d'une image de fond (https://…)"
                    className="w-full bg-[#0f0f0f] text-[12px] text-gray-200 rounded border border-yellow-900/30 outline-none focus:border-yellow-700/60 p-2 placeholder-gray-600"
                  />
                  {wallpaperUrl.trim() && (
                    <div
                      className="h-24 rounded border border-yellow-900/30 bg-cover bg-center"
                      style={{ backgroundImage: `url(${wallpaperUrl.trim()})` }}
                    />
                  )}
                  <p className="text-[10px] text-gray-600 italic">
                    Affiché discrètement en fond quand le scénario est ouvert.
                    Sauvegarde automatique.
                  </p>
                </div>
              )}
            </div>

            {/* Roadmap 1.3 — Notes secrètes MJ : jamais affichées aux joueurs
                ni en mode présentation. */}
            <div className="rounded-lg border border-yellow-800/40 bg-[#171717]">
              <button
                type="button"
                onClick={() => setNotesSecretesOuvert((v) => !v)}
                aria-expanded={notesSecretesOuvert}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
              >
                <span className="text-xs font-bold text-yellow-500">
                  🔒 Notes secrètes MJ
                </span>
                <span className="text-[10px] text-gray-500">
                  {notesSecretesOuvert ? '▾' : '▸'}
                </span>
              </button>
              {notesSecretesOuvert && (
                <div className="px-3 pb-3">
                  <textarea
                    value={notesSecretes}
                    onChange={(e) => setNotesSecretes(e.target.value)}
                    placeholder="Twists, identités cachées, pièges… visible uniquement par toi, jamais en présentation."
                    className="w-full min-h-[140px] bg-[#0f0f0f] text-[13px] text-gray-200 leading-relaxed rounded border border-yellow-900/30 outline-none focus:border-yellow-700/60 p-2 resize-y placeholder-gray-600"
                  />
                  <p className="text-[10px] text-gray-600 italic mt-1">
                    Sauvegarde automatique.
                  </p>
                </div>
              )}
            </div>

            {(['pnj', 'ennemi', 'item', 'map'] as ElementType[]).map((type) => {
              const lst = liensDuScenario.filter((l) => l.element_type === type)
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                    <span className="text-xs font-bold text-gray-300">
                      {ICONE[type]} {LABEL[type]} ({lst.length})
                    </span>
                    <div className="flex gap-1 items-center">
                      {/* Roadmap 2.1 — Quick create pour chaque type d'élément */}
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            type === 'ennemi'
                              ? '/dashboard/ennemis'
                              : type === 'item'
                              ? '/dashboard/items'
                              : type === 'map'
                              ? '/dashboard/maps'
                              : '/dashboard/pnj'
                          )
                        }
                        className="text-[10px] uppercase tracking-wider text-emerald-400 hover:text-emerald-300"
                        title="+ Créer un nouvel élément dans la bibliothèque"
                      >
                        + Créer
                      </button>
                      <span className="text-gray-600 text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={() => ouvrirPicker(type, 'scenario')}
                        className="text-[10px] uppercase tracking-wider text-yellow-500 hover:text-yellow-400"
                        title="🔗 Lier à ce scénario"
                      >
                        🔗 Lier
                      </button>
                    </div>
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
      {/* Roadmap Affinement 2.4 — Modale météo */}
      <MeteoGenerator open={meteoOuvert} onClose={() => setMeteoOuvert(false)} />
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
  onInsertSibling: (parentId: string | null, insertIndex: number) => void
  onDelete: (id: string) => void
  dragId: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, id: string) => void
}) {
  return (
    <ul className="relative">
      <Inserter
        onClick={() => props.onInsertSibling(null, 0)}
        depth={0}
        first
      />
      {props.nodes.map((n, i) => (
        <li key={n.id}>
          <ChapterRow node={n} depth={0} parentId={null} {...props} />
          <Inserter
            onClick={() => props.onInsertSibling(null, i + 1)}
            depth={0}
          />
        </li>
      ))}
    </ul>
  )
}

// Petit séparateur entre deux chapitres frères qui révèle un bouton « + »
// au survol, façon Notion.
function Inserter({
  onClick,
  depth,
  first
}: {
  onClick: () => void
  depth: number
  first?: boolean
}) {
  return (
    <div
      className={`group/inserter relative h-1 hover:h-6 transition-[height] duration-150 ${
        first ? 'mt-0' : ''
      }`}
      style={{ paddingLeft: 4 + depth * 14 }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className="absolute left-2 right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 rounded px-2 py-1 opacity-0 group-hover/inserter:opacity-100 text-[11px] text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] transition"
        title="Insérer un chapitre ici"
      >
        <span className="flex-1 h-px bg-white/[0.08]" />
        <span className="font-medium">+ Ajouter</span>
        <span className="flex-1 h-px bg-white/[0.08]" />
      </button>
    </div>
  )
}

type ChapterRowProps = {
  node: ChapNode
  depth: number
  parentId: string | null
  selectedId: string | null
  collapsed: Set<string>
  onSelect: (id: string) => void
  onToggleCollapse: (id: string) => void
  onAddChild: (parentId: string) => void
  onInsertSibling: (parentId: string | null, insertIndex: number) => void
  onDelete: (id: string) => void
  dragId: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, id: string) => void
}

function ChapterRow(props: ChapterRowProps) {
  const { node, depth } = props
  const hasChildren = node.children.length > 0
  const isCollapsed = props.collapsed.has(node.id)
  const isSelected = props.selectedId === node.id
  const isDragged = props.dragId === node.id

  return (
    <>
      <div
        draggable
        onDragStart={(e) => props.onDragStart(e, node.id)}
        onDragOver={props.onDragOver}
        onDrop={(e) => props.onDrop(e, node.id)}
        className={`group flex items-center gap-1 rounded px-1.5 py-1 cursor-pointer text-sm transition ${
          isSelected
            ? 'bg-white/[0.07] text-gray-100'
            : 'text-gray-300 hover:bg-white/[0.03]'
        } ${isDragged ? 'opacity-40' : ''}`}
        style={{ paddingLeft: 4 + depth * 14 }}
        onClick={() => props.onSelect(node.id)}
      >
        <span
          className="w-4 h-4 flex items-center justify-center text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 select-none transition"
          title="Glisser pour réorganiser"
          aria-hidden="true"
        >
          ⠿
        </span>
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              props.onToggleCollapse(node.id)
            }}
            className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-200 transition"
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
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-100 text-sm transition"
          title="Ajouter un sous-chapitre"
        >
          +
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            props.onDelete(node.id)
          }}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-400 text-xs transition"
          title="Supprimer"
        >
          ✕
        </button>
      </div>
      {hasChildren && !isCollapsed && (
        <ul>
          <Inserter
            onClick={() => props.onInsertSibling(node.id, 0)}
            depth={depth + 1}
            first
          />
          {node.children.map((c, i) => (
            <li key={c.id}>
              <ChapterRow
                node={c}
                depth={depth + 1}
                parentId={node.id}
                selectedId={props.selectedId}
                collapsed={props.collapsed}
                onSelect={props.onSelect}
                onToggleCollapse={props.onToggleCollapse}
                onAddChild={props.onAddChild}
                onInsertSibling={props.onInsertSibling}
                onDelete={props.onDelete}
                dragId={props.dragId}
                onDragStart={props.onDragStart}
                onDragOver={props.onDragOver}
                onDrop={props.onDrop}
              />
              <Inserter
                onClick={() => props.onInsertSibling(node.id, i + 1)}
                depth={depth + 1}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ----------------------------------------------------------------------------
// ChapterHeader — titre éditable + emoji optionnel (Notion-style)
// ----------------------------------------------------------------------------

const EMOJIS_RAPIDES = ['📖', '📜', '⚔️', '🏰', '🌲', '🗡️', '🔮', '🎭', '🌟', '🔥', '❄️', '🦴', '🐉', '👑', '🗝️', '💀']

// Détecte si une chaîne commence par un emoji et le sépare du reste du texte.
function splitEmoji(titre: string): { emoji: string | null; rest: string } {
  if (!titre) return { emoji: null, rest: '' }
  const match = titre.match(
    /^(\p{Extended_Pictographic}(?:\u{FE0F})?(?:\u{200D}\p{Extended_Pictographic}(?:\u{FE0F})?)*)\s*/u
  )
  if (match) {
    return { emoji: match[1], rest: titre.slice(match[0].length) }
  }
  return { emoji: null, rest: titre }
}

function ChapterHeader({
  titre,
  onTitreChange
}: {
  titre: string
  onTitreChange: (v: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { emoji, rest } = splitEmoji(titre)

  const setEmoji = (next: string | null) => {
    onTitreChange(next ? `${next} ${rest}`.trimEnd() : rest)
    setPickerOpen(false)
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="text-4xl md:text-5xl leading-none hover:bg-white/[0.04] rounded px-1 -mx-1 transition"
          title={emoji ? 'Changer ou retirer l’emoji' : 'Ajouter un emoji'}
        >
          {emoji ?? <span className="text-gray-700">📄</span>}
        </button>
        {pickerOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setPickerOpen(false)}
            />
            <div className="absolute z-40 mt-2 left-0 bg-[#202020] rounded-lg shadow-2xl p-2 grid grid-cols-8 gap-1 w-72">
              {EMOJIS_RAPIDES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/[0.08] text-xl transition"
                >
                  {e}
                </button>
              ))}
              {emoji && (
                <button
                  type="button"
                  onClick={() => setEmoji(null)}
                  className="col-span-8 mt-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-100 hover:bg-white/[0.05] transition"
                >
                  Retirer l&apos;emoji
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <input
        type="text"
        value={rest}
        onChange={(e) => onTitreChange(emoji ? `${emoji} ${e.target.value}` : e.target.value)}
        placeholder="Sans titre"
        className="w-full bg-transparent text-4xl md:text-5xl font-bold text-gray-50 border-none outline-none placeholder-gray-700 focus:ring-0 leading-tight tracking-tight"
        style={{
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      />
    </div>
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
