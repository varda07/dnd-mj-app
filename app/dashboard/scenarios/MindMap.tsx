'use client'

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  memo,
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent
} from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type NodeType =
  | 'lieu'
  | 'pnj'
  | 'evenement'
  | 'indice'
  | 'custom'
  | 'ennemi'
  | 'item'
  | 'map'

// Types « libres » : nœuds sans entité rattachée, créés via la barre d'outils.
type FreeNodeType = 'lieu' | 'pnj' | 'evenement' | 'indice'
const FREE_NODE_TYPES: FreeNodeType[] = ['lieu', 'pnj', 'evenement', 'indice']

// Types de nœuds liés à une entité réelle de l'app (table + fiche dédiée).
type EntityType = 'pnj' | 'ennemi' | 'item' | 'map'

// Métadonnées d'une entité liable : table Supabase, libellés, icône, couleur
// du nœud et route vers la fiche. PNJ a une vraie fiche détaillée ; ennemis /
// items / maps renvoient vers leur page de liste (pas de page [id] dédiée).
const ENTITY_META: Record<
  EntityType,
  {
    table: string
    label: string
    labelPlural: string
    icon: string
    color: string
    route: (id: string) => string
  }
> = {
  pnj: {
    table: 'pnj',
    label: 'PNJ',
    labelPlural: 'PNJ',
    icon: '🧙',
    color: '#a855f7',
    route: (id) => `/dashboard/pnj/${id}`
  },
  ennemi: {
    table: 'ennemis',
    label: 'Ennemi',
    labelPlural: 'Ennemis',
    icon: '👹',
    color: '#ef4444',
    route: () => `/dashboard/ennemis`
  },
  item: {
    table: 'items',
    label: 'Item',
    labelPlural: 'Items',
    icon: '🎒',
    color: '#eab308',
    route: () => `/dashboard/items`
  },
  map: {
    table: 'maps',
    label: 'Map',
    labelPlural: 'Cartes',
    icon: '🗺️',
    color: '#06b6d4',
    route: () => `/dashboard/maps`
  }
}

// Palette pour les types personnalisés (clé stockée en base, hex pour rendu)
type CustomColorKey = 'or' | 'rouge' | 'vert' | 'bleu' | 'violet' | 'orange' | 'gris'

const CUSTOM_COLOR_HEX: Record<CustomColorKey, string> = {
  or: '#eab308',
  rouge: '#ef4444',
  vert: '#22c55e',
  bleu: '#3b82f6',
  violet: '#a855f7',
  orange: '#f97316',
  gris: '#6b7280'
}

const isCustomColorKey = (v: string | null | undefined): v is CustomColorKey =>
  v === 'or' || v === 'rouge' || v === 'vert' || v === 'bleu' ||
  v === 'violet' || v === 'orange' || v === 'gris'

type CustomType = {
  id: string
  scenario_id: string
  nom: string
  couleur: CustomColorKey
  icone: string
}

type NoteEntry = {
  id: string
  titre: string
  date: string
  contenu: string
}

type MindNode = {
  id: string
  mindmap_id: string
  type: NodeType
  titre: string
  contenu: string
  position_x: number
  position_y: number
  couleur: string | null
  custom_type_id: string | null
  // Si renseignés : nœud rattaché à une entité réelle (PNJ, ennemi, item, map).
  entite_type: EntityType | null
  entite_id: string | null
}

// Entité liable telle que listée dans la modale de sélection.
type EntityLite = { id: string; nom: string }

type MindLink = {
  id: string
  mindmap_id: string
  noeud_from: string
  noeud_to: string
  label: string | null
  couleur: string | null
  annotation: string | null
}

type Mindmap = {
  id: string
  scenario_id: string
  nom: string
}

type ScenarioLite = { id: string; nom: string }

// Métadonnées des types prédéfinis. Le type 'custom' n'apparaît pas ici car
// son label/icône/couleur sont dynamiques et résolus via TYPE_META_RESOLVED.
const BUILTIN_TYPE_META: Record<Exclude<NodeType, 'custom'>, { label: string; icon: string; color: string }> = {
  lieu: { label: 'Lieu', icon: '📍', color: '#3b82f6' },
  pnj: { label: 'PNJ', icon: '👤', color: '#a855f7' },
  evenement: { label: 'Événement', icon: '⚡', color: '#f97316' },
  indice: { label: 'Indice', icon: '🔍', color: '#22c55e' },
  // Types « entité » : utilisés par les nœuds liés à une entité existante.
  ennemi: { label: 'Ennemi', icon: '👹', color: '#ef4444' },
  item: { label: 'Item', icon: '🎒', color: '#eab308' },
  map: { label: 'Map', icon: '🗺️', color: '#06b6d4' }
}

const CUSTOM_FALLBACK_META = { label: 'Personnalisé', icon: '✨', color: '#6b7280' }

// Résout les métadonnées d'un noeud (gère builtins + types custom).
function resolveNodeMeta(
  node: { type: NodeType; custom_type_id: string | null },
  customTypes: CustomType[]
): { label: string; icon: string; color: string } {
  if (node.type !== 'custom') return BUILTIN_TYPE_META[node.type]
  const ct = customTypes.find((t) => t.id === node.custom_type_id)
  if (!ct) return CUSTOM_FALLBACK_META
  return { label: ct.nom, icon: ct.icone, color: CUSTOM_COLOR_HEX[ct.couleur] }
}

// Helpers existants (utilisés par les autres parties du composant) — pour
// compatibilité, on conserve TYPE_META qui pointe vers les builtins. Les
// chemins qui rendent un noeud passent désormais par resolveNodeMeta.
const TYPE_META = BUILTIN_TYPE_META

// Palette des couleurs de liens. La clé est stockée en base ('or', 'rouge', …)
// et la valeur hex est utilisée pour le rendu SVG.
type ColorKey = 'auto' | 'or' | 'rouge' | 'vert' | 'bleu' | 'violet' | 'gris'

const LINK_COLORS: Record<Exclude<ColorKey, 'auto'>, { label: string; hex: string }> = {
  or: { label: 'Or', hex: '#eab308' },
  rouge: { label: 'Rouge', hex: '#ef4444' },
  vert: { label: 'Vert', hex: '#22c55e' },
  bleu: { label: 'Bleu', hex: '#3b82f6' },
  violet: { label: 'Violet', hex: '#a855f7' },
  gris: { label: 'Gris', hex: '#6b7280' }
}

const ANNOTATION_MAX = 50

const isColorKey = (v: string | null | undefined): v is ColorKey =>
  v === 'auto' ||
  v === 'or' ||
  v === 'rouge' ||
  v === 'vert' ||
  v === 'bleu' ||
  v === 'violet' ||
  v === 'gris'

const MIN_SCALE = 0.1
const MAX_SCALE = 5

// Couleurs des liens automatiques pour l'overlay « relations PNJ ».
// Aligné sur le mapping de la fiche PNJ (/dashboard/pnj/[id]).
const PNJ_RELATION_COLORS: Record<string, string> = {
  ami: '#22c55e',
  allie: '#3b82f6',
  amoureux: '#ec4899',
  famille: '#a855f7',
  mentor: '#06b6d4',
  rival: '#f97316',
  ennemi: '#ef4444',
  contact: '#eab308',
  neutre: '#6b7280'
}

// Format des fichiers d'export/import de carte mentale.
const MINDMAP_EXPORT_FORMAT = 'codex-mindmap'
const MINDMAP_EXPORT_VERSION = 1

// Déclenche le téléchargement d'un Blob dans le navigateur.
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Nettoie un nom de carte pour en faire un nom de fichier sûr.
function safeFileName(nom: string): string {
  return (nom || 'carte-mentale')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'carte-mentale'
}

// Construit un PDF minimal (une page, image JPEG plein cadre) sans dépendance
// externe : jspdf n'est pas installable dans cet environnement (le registre
// npm est derrière un proxy SSL non vérifiable). On écrit donc le PDF à la main
// — un document mono-page avec une seule image DCTDecode suffit ici.
async function canvasToPdfBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const jpegBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob a échoué'))),
      'image/jpeg',
      0.92
    )
  })
  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer())
  const iw = canvas.width
  const ih = canvas.height

  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  let length = 0
  const offsets: number[] = []
  const push = (data: Uint8Array | string) => {
    const u = typeof data === 'string' ? enc.encode(data) : data
    chunks.push(u)
    length += u.length
  }
  const obj = (n: number, body: string) => {
    offsets[n] = length
    push(`${n} 0 obj\n${body}\nendobj\n`)
  }

  push('%PDF-1.4\n')
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${iw} ${ih}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  )
  offsets[4] = length
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
      `/Length ${jpeg.length} >>\nstream\n`
  )
  push(jpeg)
  push('\nendstream\nendobj\n')
  const content = `q ${iw} 0 0 ${ih} 0 0 cm /Im0 Do Q`
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)

  const xrefOffset = length
  let xref = 'xref\n0 6\n0000000000 65535 f \n'
  for (let i = 1; i <= 5; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n'
  }
  push(xref)
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' })
}

export default function MindMap({ scenarios }: { scenarios: ScenarioLite[] }) {
  const router = useRouter()
  const [scenarioId, setScenarioId] = useState<string>(scenarios[0]?.id ?? '')
  const [mindmaps, setMindmaps] = useState<Mindmap[]>([])
  const [mindmapId, setMindmapId] = useState<string>('')
  const [customTypes, setCustomTypes] = useState<CustomType[]>([])
  const [customCreatorOpen, setCustomCreatorOpen] = useState(false)
  const [nodes, setNodes] = useState<MindNode[]>([])
  const [links, setLinks] = useState<MindLink[]>([])
  const [pendingFrom, setPendingFrom] = useState<string | null>(null)
  const [editingNode, setEditingNode] = useState<MindNode | null>(null)
  const [linksBrowser, setLinksBrowser] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState<NoteEntry[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  // Overlay « relations PNJ » : lignes auto-calculées entre noeuds de type pnj
  // qui correspondent (par nom, casse ignorée) à deux PNJ liés par une relation
  // dans la table pnj_relations.
  const [showPnjRelations, setShowPnjRelations] = useState(false)
  const [pnjRelationsRaw, setPnjRelationsRaw] = useState<
    Array<{
      id: string
      pnj_id: string
      entite_type: 'personnage' | 'pnj' | 'ennemi'
      entite_id: string
      type_relation: string
    }>
  >([])
  const [pnjByName, setPnjByName] = useState<Map<string, string>>(new Map())
  // Modale de sélection d'entités existantes à lier (PNJ / ennemi / item / map).
  const [entityPicker, setEntityPicker] = useState<EntityType | null>(null)
  // Menu déroulant d'export + état d'import en cours.
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [contextMenu, setContextMenu] = useState<
    | { kind: 'node'; x: number; y: number; nodeId: string }
    | { kind: 'link'; x: number; y: number; linkId: string }
    | null
  >(null)
  const [linkEditor, setLinkEditor] = useState<
    | { mode: 'create'; from: string; to: string; couleur: ColorKey; annotation: string }
    | { mode: 'edit'; link: MindLink; couleur: ColorKey; annotation: string }
    | null
  >(null)
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  const [panning, setPanning] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef(view)
  viewRef.current = view

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const dragRef = useRef<{
    id: string
    offsetX: number
    offsetY: number
    moved: boolean
  } | null>(null)
  const panRef = useRef<{
    startX: number
    startY: number
    viewX: number
    viewY: number
  } | null>(null)
  const pinchRef = useRef<{
    startDist: number
    startScale: number
    startViewX: number
    startViewY: number
    cx: number
    cy: number
  } | null>(null)
  const longPressRef = useRef<{
    timer: ReturnType<typeof setTimeout>
    startX: number
    startY: number
  } | null>(null)

  const pendingFromRef = useRef(pendingFrom)
  pendingFromRef.current = pendingFrom
  const linksRef = useRef(links)
  linksRef.current = links

  // rAF throttling for drag updates
  const dragRafRef = useRef<number | null>(null)
  const dragLatestRef = useRef<{ x: number; y: number } | null>(null)

  // Debounced save for node position updates (1s)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  const flushPositionSaves = useCallback(async () => {
    const pending = Array.from(pendingPositionsRef.current.entries())
    pendingPositionsRef.current.clear()
    for (const [id, pos] of pending) {
      const { error } = await supabase
        .from('mindmap_noeuds')
        .update({ position_x: pos.x, position_y: pos.y })
        .eq('id', id)
      if (error) console.error('[mindmap] save position échec :', error)
    }
  }, [])

  const schedulePositionSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      void flushPositionSaves()
    }, 1000)
  }, [flushPositionSaves])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (dragRafRef.current !== null) cancelAnimationFrame(dragRafRef.current)
    }
  }, [])

  const clearLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer)
      longPressRef.current = null
    }
  }, [])

  // Charge les types de noeud personnalisés du scénario sélectionné.
  useEffect(() => {
    if (!scenarioId) {
      setCustomTypes([])
      return
    }
    const load = async () => {
      const { data } = await supabase
        .from('mindmap_types_custom')
        .select('id, scenario_id, nom, couleur, icone')
        .eq('scenario_id', scenarioId)
        .order('created_at', { ascending: true })
      const list: CustomType[] = ((data ?? []) as Array<{
        id: string
        scenario_id: string
        nom: string
        couleur: string
        icone: string
      }>).map((row) => ({
        id: row.id,
        scenario_id: row.scenario_id,
        nom: row.nom,
        couleur: isCustomColorKey(row.couleur) ? row.couleur : 'gris',
        icone: row.icone || '✨'
      }))
      setCustomTypes(list)
    }
    load()
  }, [scenarioId])

  // Charge la liste des cartes mentales du scénario sélectionné. S'il n'en
  // existe aucune, on en crée une par défaut pour ne jamais afficher l'écran
  // vide.
  useEffect(() => {
    if (!scenarioId) {
      setMindmaps([])
      setMindmapId('')
      setNodes([])
      setLinks([])
      setNotes([])
      return
    }
    const loadMindmaps = async () => {
      const { data } = await supabase
        .from('mindmaps')
        .select('id, scenario_id, nom')
        .eq('scenario_id', scenarioId)
        .order('created_at', { ascending: true })
      let list = (data as Mindmap[]) ?? []
      if (list.length === 0) {
        const { data: created } = await supabase
          .from('mindmaps')
          .insert({ scenario_id: scenarioId, nom: 'Carte principale' })
          .select('id, scenario_id, nom')
          .single()
        if (created) list = [created as Mindmap]
      }
      setMindmaps(list)
      setMindmapId(list[0]?.id ?? '')
    }
    loadMindmaps()
  }, [scenarioId])

  // Charge les noeuds et liens de la carte mentale sélectionnée.
  useEffect(() => {
    if (!mindmapId) {
      setNodes([])
      setLinks([])
      return
    }
    const load = async () => {
      const [n, l] = await Promise.all([
        supabase.from('mindmap_noeuds').select('*').eq('mindmap_id', mindmapId),
        supabase.from('mindmap_liens').select('*').eq('mindmap_id', mindmapId)
      ])
      setNodes((n.data as MindNode[]) ?? [])
      setLinks((l.data as MindLink[]) ?? [])
      setPendingFrom(null)
      setView({ x: 0, y: 0, scale: 1 })
    }
    load()
  }, [mindmapId])

  const fetchNotes = async () => {
    if (!scenarioId) {
      setNotes([])
      return
    }
    setNotesLoading(true)
    const { data, error } = await supabase
      .from('scenarios')
      .select('notes_sessions')
      .eq('id', scenarioId)
      .maybeSingle()
    if (error) console.error('[mindmap] fetch notes échec :', error)
    const raw = (data?.notes_sessions as NoteEntry[] | null) ?? []
    setNotes(raw)
    setNotesLoading(false)
  }

  useEffect(() => {
    if (notesOpen) fetchNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesOpen, scenarioId])

  // Charge les relations PNJ + le mapping nom→id du MJ courant pour pouvoir
  // tracer les liens automatiques entre noeuds 'pnj' qui matchent un PNJ.
  useEffect(() => {
    if (!showPnjRelations) return
    let cancel = false
    const charger = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [relRes, pnjRes] = await Promise.all([
        supabase
          .from('pnj_relations')
          .select('id, pnj_id, entite_type, entite_id, type_relation')
          .eq('mj_id', user.id),
        supabase
          .from('pnj')
          .select('id, nom')
          .eq('mj_id', user.id)
      ])
      if (cancel) return
      setPnjRelationsRaw(
        (relRes.data ?? []) as Array<{
          id: string
          pnj_id: string
          entite_type: 'personnage' | 'pnj' | 'ennemi'
          entite_id: string
          type_relation: string
        }>
      )
      const map = new Map<string, string>()
      ;((pnjRes.data ?? []) as Array<{ id: string; nom: string }>).forEach((p) => {
        map.set(p.nom.trim().toLowerCase(), p.id)
      })
      setPnjByName(map)
    }
    charger()
    return () => {
      cancel = true
    }
  }, [showPnjRelations, scenarioId])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const v = viewRef.current
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor))
      if (newScale === v.scale) return
      const wx = (px - v.x) / v.scale
      const wy = (py - v.y) / v.scale
      setView({ scale: newScale, x: px - wx * newScale, y: py - wy * newScale })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const creerMindmap = async () => {
    if (!scenarioId) return
    const nom = window.prompt('Nom de la nouvelle carte mentale ?', 'Nouvelle carte')
    if (!nom || !nom.trim()) return
    const { data, error } = await supabase
      .from('mindmaps')
      .insert({ scenario_id: scenarioId, nom: nom.trim() })
      .select('id, scenario_id, nom')
      .single()
    if (error) {
      console.error('[mindmap] insert mindmap échec :', error)
      return
    }
    if (data) {
      setMindmaps((prev) => [...prev, data as Mindmap])
      setMindmapId((data as Mindmap).id)
    }
  }

  const renommerMindmap = async (id: string) => {
    const courant = mindmaps.find((m) => m.id === id)
    if (!courant) return
    const nom = window.prompt('Nouveau nom de la carte ?', courant.nom)
    if (!nom || !nom.trim() || nom.trim() === courant.nom) return
    const { error } = await supabase
      .from('mindmaps')
      .update({ nom: nom.trim() })
      .eq('id', id)
    if (error) {
      console.error('[mindmap] rename échec :', error)
      return
    }
    setMindmaps((prev) =>
      prev.map((m) => (m.id === id ? { ...m, nom: nom.trim() } : m))
    )
  }

  const supprimerMindmap = async (id: string) => {
    if (mindmaps.length <= 1) {
      alert('Impossible de supprimer la dernière carte mentale du scénario.')
      return
    }
    const courant = mindmaps.find((m) => m.id === id)
    if (!courant) return
    if (!confirm(`Supprimer la carte « ${courant.nom} » et tous ses noeuds/liens ?`)) return
    const { error } = await supabase.from('mindmaps').delete().eq('id', id)
    if (error) {
      console.error('[mindmap] delete mindmap échec :', error)
      return
    }
    const restantes = mindmaps.filter((m) => m.id !== id)
    setMindmaps(restantes)
    if (mindmapId === id) setMindmapId(restantes[0]?.id ?? '')
  }

  const addNode = async (type: Exclude<NodeType, 'custom'>) => {
    if (!mindmapId) return
    const rect = canvasRef.current?.getBoundingClientRect()
    const w = rect?.width ?? 800
    const h = rect?.height ?? 600
    const v = viewRef.current
    const cx = (w / 2 - v.x) / v.scale
    const cy = (h / 2 - v.y) / v.scale
    const jitter = () => Math.round((Math.random() - 0.5) * 120)
    const meta = BUILTIN_TYPE_META[type]
    const payload = {
      mindmap_id: mindmapId,
      type,
      titre: meta.label,
      contenu: '',
      position_x: Math.round(cx + jitter()),
      position_y: Math.round(cy + jitter()),
      couleur: meta.color,
      custom_type_id: null
    }
    const { data, error } = await supabase
      .from('mindmap_noeuds')
      .insert(payload)
      .select()
      .single()
    if (error) {
      console.error('[mindmap] insert noeud échec :', error)
      return
    }
    if (data) setNodes((ns) => [...ns, data as MindNode])
  }

  // Ajoute un noeud d'un type personnalisé (référence à mindmap_types_custom).
  const addCustomNode = async (customTypeId: string) => {
    if (!mindmapId) return
    const ct = customTypes.find((t) => t.id === customTypeId)
    if (!ct) return
    const rect = canvasRef.current?.getBoundingClientRect()
    const w = rect?.width ?? 800
    const h = rect?.height ?? 600
    const v = viewRef.current
    const cx = (w / 2 - v.x) / v.scale
    const cy = (h / 2 - v.y) / v.scale
    const jitter = () => Math.round((Math.random() - 0.5) * 120)
    const payload = {
      mindmap_id: mindmapId,
      type: 'custom' as const,
      titre: ct.nom,
      contenu: '',
      position_x: Math.round(cx + jitter()),
      position_y: Math.round(cy + jitter()),
      couleur: CUSTOM_COLOR_HEX[ct.couleur],
      custom_type_id: ct.id
    }
    const { data, error } = await supabase
      .from('mindmap_noeuds')
      .insert(payload)
      .select()
      .single()
    if (error) {
      console.error('[mindmap] insert noeud custom échec :', error)
      return
    }
    if (data) setNodes((ns) => [...ns, data as MindNode])
  }

  // Crée un nouveau type personnalisé pour le scénario courant.
  const creerCustomType = async (
    nom: string,
    couleur: CustomColorKey,
    icone: string
  ) => {
    if (!scenarioId) return null
    const trimmed = nom.trim()
    if (!trimmed) return null
    const { data, error } = await supabase
      .from('mindmap_types_custom')
      .insert({
        scenario_id: scenarioId,
        nom: trimmed,
        couleur,
        icone: icone.trim() || '✨'
      })
      .select('id, scenario_id, nom, couleur, icone')
      .single()
    if (error || !data) {
      console.error('[mindmap] insert custom type échec :', error)
      return null
    }
    const created: CustomType = {
      id: data.id,
      scenario_id: data.scenario_id,
      nom: data.nom,
      couleur: isCustomColorKey(data.couleur) ? data.couleur : 'gris',
      icone: data.icone || '✨'
    }
    setCustomTypes((prev) => [...prev, created])
    return created
  }

  const supprimerCustomType = async (id: string) => {
    if (!confirm('Supprimer ce type personnalisé ? Les noeuds existants conserveront leur libellé mais perdront le lien avec le type.')) return
    const { error } = await supabase
      .from('mindmap_types_custom')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('[mindmap] delete custom type échec :', error)
      return
    }
    setCustomTypes((prev) => prev.filter((t) => t.id !== id))
  }

  const currentMindmap = mindmaps.find((m) => m.id === mindmapId)

  // --------------------------------------------------------------------------
  // Nœuds liés à des entités existantes (PNJ / ennemi / item / map)
  // --------------------------------------------------------------------------

  // Crée un nœud par entité sélectionnée dans la modale, rattaché à l'entité.
  const addEntityNodes = async (type: EntityType, entities: EntityLite[]) => {
    if (!mindmapId || entities.length === 0) return
    const rect = canvasRef.current?.getBoundingClientRect()
    const w = rect?.width ?? 800
    const h = rect?.height ?? 600
    const v = viewRef.current
    const cx = (w / 2 - v.x) / v.scale
    const cy = (h / 2 - v.y) / v.scale
    const meta = ENTITY_META[type]
    // Disposition en grille autour du centre pour ne pas empiler les nœuds.
    const payloads = entities.map((ent, i) => {
      const col = i % 4
      const row = Math.floor(i / 4)
      const jitter = () => Math.round((Math.random() - 0.5) * 36)
      return {
        mindmap_id: mindmapId,
        type,
        titre: ent.nom,
        contenu: '',
        position_x: Math.round(cx + (col - 1.5) * 190 + jitter()),
        position_y: Math.round(cy + (row - 0.5) * 120 + jitter()),
        couleur: meta.color,
        custom_type_id: null,
        entite_type: type,
        entite_id: ent.id
      }
    })
    const { data, error } = await supabase
      .from('mindmap_noeuds')
      .insert(payloads)
      .select()
    if (error) {
      console.error('[mindmap] insert noeuds entités échec :', error)
      alert(
        "Échec de l'ajout des nœuds. As-tu exécuté la migration supabase/mindmap_entites.sql ?"
      )
      return
    }
    if (data) setNodes((ns) => [...ns, ...((data as MindNode[]) ?? [])])
  }

  // --------------------------------------------------------------------------
  // Export / Import de la carte mentale
  // --------------------------------------------------------------------------

  // Rend la carte mentale courante dans un <canvas> hors écran (nœuds + liens).
  // On dessine directement depuis le modèle de données plutôt qu'en capturant
  // le DOM : rendu net, indépendant du zoom courant et des effets CSS.
  const renderMindmapCanvas = (): HTMLCanvasElement | null => {
    if (nodes.length === 0) return null
    const PAD_X = 180
    const PAD_Y = 110
    const xs = nodes.map((n) => n.position_x)
    const ys = nodes.map((n) => n.position_y)
    const minX = Math.min(...xs) - PAD_X
    const maxX = Math.max(...xs) + PAD_X
    const minY = Math.min(...ys) - PAD_Y
    const maxY = Math.max(...ys) + PAD_Y
    const w = Math.max(1, maxX - minX)
    const h = Math.max(1, maxY - minY)
    const dpr = 2
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.scale(dpr, dpr)
    ctx.translate(-minX, -minY)
    // Fond + grille pointillée discrète (rappel du canvas de l'app).
    ctx.fillStyle = '#0a0b0d'
    ctx.fillRect(minX, minY, w, h)

    // Liens
    links.forEach((l) => {
      const a = nodes.find((n) => n.id === l.noeud_from)
      const b = nodes.find((n) => n.id === l.noeud_to)
      if (!a || !b) return
      const metaA = resolveNodeMeta(a, customTypes)
      const metaB = resolveNodeMeta(b, customTypes)
      const ck = isColorKey(l.couleur) ? l.couleur : 'auto'
      let stroke: string | CanvasGradient
      if (ck === 'auto') {
        if (metaA.color === metaB.color) {
          stroke = metaA.color
        } else {
          const g = ctx.createLinearGradient(
            a.position_x,
            a.position_y,
            b.position_x,
            b.position_y
          )
          g.addColorStop(0, metaA.color)
          g.addColorStop(1, metaB.color)
          stroke = g
        }
      } else {
        stroke = LINK_COLORS[ck].hex
      }
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.moveTo(a.position_x, a.position_y)
      ctx.lineTo(b.position_x, b.position_y)
      ctx.stroke()
      ctx.globalAlpha = 1
      const annotation = (l.annotation ?? '').trim()
      if (annotation) {
        const mx = (a.position_x + b.position_x) / 2
        const my = (a.position_y + b.position_y) / 2
        ctx.font = '11px system-ui, sans-serif'
        const tw = ctx.measureText(annotation).width
        ctx.fillStyle = 'rgba(10,11,13,0.85)'
        ctx.fillRect(mx - tw / 2 - 6, my - 9, tw + 12, 18)
        ctx.fillStyle = '#e8e8ec'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(annotation, mx, my)
      }
    })

    // Nœuds (pilules arrondies)
    nodes.forEach((n) => {
      const meta = resolveNodeMeta(n, customTypes)
      const color = n.couleur ?? meta.color
      const label = `${meta.icon} ${n.titre || meta.label}`
      ctx.font = 'bold 14px system-ui, sans-serif'
      const tw = ctx.measureText(label).width
      const boxW = Math.min(260, Math.max(150, tw + 36))
      const boxH = 40
      const x = n.position_x - boxW / 2
      const y = n.position_y - boxH / 2
      ctx.beginPath()
      ctx.roundRect(x, y, boxW, boxH, 20)
      ctx.fillStyle = color + '33'
      ctx.fill()
      ctx.strokeStyle = '#eab308'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, n.position_x, n.position_y, boxW - 22)
    })

    return canvas
  }

  // Export PNG ou PDF (image plein cadre).
  const handleExportImage = async (format: 'png' | 'pdf') => {
    setExportMenuOpen(false)
    const canvas = renderMindmapCanvas()
    if (!canvas) {
      alert('Carte vide — ajoute des nœuds avant d’exporter.')
      return
    }
    const base = safeFileName(currentMindmap?.nom ?? 'carte-mentale')
    if (format === 'png') {
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${base}.png`)
      }, 'image/png')
    } else {
      try {
        const blob = await canvasToPdfBlob(canvas)
        downloadBlob(blob, `${base}.pdf`)
      } catch (e) {
        console.error('[mindmap] export PDF échec :', e)
        alert("Échec de l'export PDF — voir la console.")
      }
    }
  }

  // Export JSON (format Master Screen, réimportable).
  const handleExportJSON = () => {
    setExportMenuOpen(false)
    if (nodes.length === 0) {
      alert('Carte vide — ajoute des nœuds avant d’exporter.')
      return
    }
    // On n'embarque que les types personnalisés réellement utilisés.
    const usedCustomIds = new Set(
      nodes
        .filter((n) => n.type === 'custom' && n.custom_type_id)
        .map((n) => n.custom_type_id as string)
    )
    const payload = {
      format: MINDMAP_EXPORT_FORMAT,
      version: MINDMAP_EXPORT_VERSION,
      exported_at: new Date().toISOString(),
      mindmap: { nom: currentMindmap?.nom ?? 'Carte mentale' },
      customTypes: customTypes
        .filter((t) => usedCustomIds.has(t.id))
        .map((t) => ({
          id: t.id,
          nom: t.nom,
          couleur: t.couleur,
          icone: t.icone
        })),
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        titre: n.titre,
        contenu: n.contenu,
        position_x: n.position_x,
        position_y: n.position_y,
        couleur: n.couleur,
        custom_type_id: n.custom_type_id,
        entite_type: n.entite_type,
        entite_id: n.entite_id
      })),
      links: links.map((l) => ({
        noeud_from: l.noeud_from,
        noeud_to: l.noeud_to,
        couleur: l.couleur,
        annotation: l.annotation
      }))
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    })
    downloadBlob(blob, `${safeFileName(currentMindmap?.nom ?? 'carte-mentale')}.json`)
  }

  // Import d'un fichier JSON exporté depuis Master Screen : crée une nouvelle carte
  // dans le scénario courant avec tous ses nœuds, liens et types personnalisés.
  const handleImportFile = async (file: File) => {
    if (!scenarioId) {
      alert('Sélectionne d’abord un scénario.')
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      alert('Fichier JSON invalide.')
      return
    }
    const data = parsed as {
      format?: string
      mindmap?: { nom?: string }
      customTypes?: Array<{ id?: string; nom?: string; couleur?: string; icone?: string }>
      nodes?: Array<Record<string, unknown>>
      links?: Array<Record<string, unknown>>
    }
    if (data?.format !== MINDMAP_EXPORT_FORMAT || !Array.isArray(data.nodes)) {
      alert('Format non reconnu — attendu : un export Master Screen de carte mentale.')
      return
    }
    setImporting(true)
    try {
      // 1. Nouvelle carte
      const nom = data.mindmap?.nom
        ? `${data.mindmap.nom} (importé)`
        : 'Carte importée'
      const { data: mm, error: mmErr } = await supabase
        .from('mindmaps')
        .insert({ scenario_id: scenarioId, nom })
        .select('id, scenario_id, nom')
        .single()
      if (mmErr || !mm) throw mmErr ?? new Error('création de la carte échouée')
      const newMindmapId = (mm as Mindmap).id

      // 2. Types personnalisés : réutilise ceux du scénario (match par nom),
      //    crée les manquants. ctMap : ancien id → nouvel id.
      const ctMap = new Map<string, string>()
      const existingByName = new Map(
        customTypes.map((t) => [t.nom.trim().toLowerCase(), t.id])
      )
      for (const ct of data.customTypes ?? []) {
        const key = String(ct.nom ?? '').trim().toLowerCase()
        if (!key) continue
        let newId = existingByName.get(key)
        if (!newId) {
          const couleur = isCustomColorKey(ct.couleur) ? ct.couleur : 'gris'
          const { data: created } = await supabase
            .from('mindmap_types_custom')
            .insert({
              scenario_id: scenarioId,
              nom: String(ct.nom),
              couleur,
              icone: String(ct.icone || '✨')
            })
            .select('id, scenario_id, nom, couleur, icone')
            .single()
          if (created) {
            newId = created.id as string
            existingByName.set(key, newId)
            setCustomTypes((prev) => [
              ...prev,
              {
                id: created.id,
                scenario_id: created.scenario_id,
                nom: created.nom,
                couleur: isCustomColorKey(created.couleur)
                  ? created.couleur
                  : 'gris',
                icone: created.icone || '✨'
              }
            ])
          }
        }
        if (newId && ct.id) ctMap.set(String(ct.id), newId)
      }

      // 3. Nœuds : insertion séquentielle pour fiabiliser le mapping d'id.
      const validTypes = [
        'lieu',
        'pnj',
        'evenement',
        'indice',
        'custom',
        'ennemi',
        'item',
        'map'
      ]
      const idMap = new Map<string, string>()
      for (const raw of data.nodes) {
        const rawType = String(raw.type ?? 'indice')
        let type = validTypes.includes(rawType) ? rawType : 'indice'
        let custom_type_id: string | null = null
        if (type === 'custom') {
          custom_type_id = raw.custom_type_id
            ? ctMap.get(String(raw.custom_type_id)) ?? null
            : null
          // Type custom introuvable → on retombe sur un nœud « indice ».
          if (!custom_type_id) type = 'indice'
        }
        let entite_type: EntityType | null = null
        let entite_id: string | null = null
        const rawEntiteType = raw.entite_type
        if (
          (rawEntiteType === 'pnj' ||
            rawEntiteType === 'ennemi' ||
            rawEntiteType === 'item' ||
            rawEntiteType === 'map') &&
          raw.entite_id
        ) {
          entite_type = rawEntiteType
          entite_id = String(raw.entite_id)
        }
        const px = Number(raw.position_x)
        const py = Number(raw.position_y)
        const { data: created } = await supabase
          .from('mindmap_noeuds')
          .insert({
            mindmap_id: newMindmapId,
            type,
            titre: String(raw.titre ?? ''),
            contenu: String(raw.contenu ?? ''),
            position_x: Number.isFinite(px) ? Math.round(px) : 0,
            position_y: Number.isFinite(py) ? Math.round(py) : 0,
            couleur: typeof raw.couleur === 'string' ? raw.couleur : null,
            custom_type_id,
            entite_type,
            entite_id
          })
          .select('id')
          .single()
        if (created && raw.id) idMap.set(String(raw.id), created.id as string)
      }

      // 4. Liens : on remappe les extrémités, on ignore les liens orphelins.
      const linkPayloads: Array<{
        mindmap_id: string
        noeud_from: string
        noeud_to: string
        couleur: string
        annotation: string
      }> = []
      for (const raw of data.links ?? []) {
        const from = idMap.get(String(raw.noeud_from))
        const to = idMap.get(String(raw.noeud_to))
        if (!from || !to) continue
        linkPayloads.push({
          mindmap_id: newMindmapId,
          noeud_from: from,
          noeud_to: to,
          couleur: typeof raw.couleur === 'string' ? raw.couleur : 'auto',
          annotation:
            typeof raw.annotation === 'string'
              ? raw.annotation.slice(0, ANNOTATION_MAX)
              : ''
        })
      }
      if (linkPayloads.length > 0) {
        const { error: lErr } = await supabase
          .from('mindmap_liens')
          .insert(linkPayloads)
        if (lErr) console.error('[mindmap] import liens échec :', lErr)
      }

      // 5. Bascule sur la carte importée (recharge nœuds/liens via l'effet).
      setMindmaps((prev) => [...prev, mm as Mindmap])
      setMindmapId(newMindmapId)
      alert(
        `Carte « ${nom} » importée : ${idMap.size} nœud(s), ${linkPayloads.length} lien(s).`
      )
    } catch (e) {
      console.error('[mindmap] import échec :', e)
      alert("Échec de l'import — voir la console.")
    } finally {
      setImporting(false)
    }
  }

  const connect = useCallback((from: string, to: string) => {
    if (from === to) return
    if (
      linksRef.current.some(
        (l) =>
          (l.noeud_from === from && l.noeud_to === to) ||
          (l.noeud_from === to && l.noeud_to === from)
      )
    )
      return
    setLinkEditor({
      mode: 'create',
      from,
      to,
      couleur: 'auto',
      annotation: ''
    })
  }, [])

  const saveLink = async () => {
    if (!linkEditor) return
    const couleur = linkEditor.couleur
    const annotation = linkEditor.annotation.slice(0, ANNOTATION_MAX)
    if (linkEditor.mode === 'create') {
      if (!mindmapId) return
      const { data, error } = await supabase
        .from('mindmap_liens')
        .insert({
          mindmap_id: mindmapId,
          noeud_from: linkEditor.from,
          noeud_to: linkEditor.to,
          couleur,
          annotation
        })
        .select()
        .single()
      if (error) {
        console.error('[mindmap] insert lien échec :', error)
        return
      }
      if (data) setLinks((ls) => [...ls, data as MindLink])
    } else {
      const id = linkEditor.link.id
      const { error } = await supabase
        .from('mindmap_liens')
        .update({ couleur, annotation })
        .eq('id', id)
      if (error) {
        console.error('[mindmap] update lien échec :', error)
        return
      }
      setLinks((ls) =>
        ls.map((l) => (l.id === id ? { ...l, couleur, annotation } : l))
      )
    }
    setLinkEditor(null)
  }

  const openEditLink = (link: MindLink) => {
    setLinkEditor({
      mode: 'edit',
      link,
      couleur: isColorKey(link.couleur) ? link.couleur : 'auto',
      annotation: link.annotation ?? ''
    })
    setContextMenu(null)
  }

  const deleteNode = async (id: string) => {
    if (!confirm('Supprimer ce nœud et ses connexions ?')) return
    await supabase.from('mindmap_liens').delete().or(`noeud_from.eq.${id},noeud_to.eq.${id}`)
    await supabase.from('mindmap_noeuds').delete().eq('id', id)
    setNodes((ns) => ns.filter((n) => n.id !== id))
    setLinks((ls) => ls.filter((l) => l.noeud_from !== id && l.noeud_to !== id))
    if (pendingFrom === id) setPendingFrom(null)
    setContextMenu(null)
  }

  const deleteLink = async (id: string) => {
    if (!confirm('Supprimer ce lien ?')) return
    const { error } = await supabase.from('mindmap_liens').delete().eq('id', id)
    if (error) {
      console.error('[mindmap] delete lien échec :', error)
      return
    }
    setLinks((ls) => ls.filter((l) => l.id !== id))
    setContextMenu(null)
  }

  const saveEdit = async () => {
    if (!editingNode) return
    const { error } = await supabase
      .from('mindmap_noeuds')
      .update({ titre: editingNode.titre, contenu: editingNode.contenu })
      .eq('id', editingNode.id)
    if (error) {
      console.error('[mindmap] update noeud échec :', error)
      return
    }
    setNodes((ns) => ns.map((n) => (n.id === editingNode.id ? editingNode : n)))
    setEditingNode(null)
  }

  const onNodePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>, node: MindNode) => {
    if (e.button === 2) return
    e.stopPropagation()

    if (pendingFromRef.current) {
      if (pendingFromRef.current !== node.id) connect(pendingFromRef.current, node.id)
      setPendingFrom(null)
      return
    }

    if (e.shiftKey) {
      setPendingFrom(node.id)
      return
    }

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const v = viewRef.current
    const wx = (e.clientX - rect.left - v.x) / v.scale
    const wy = (e.clientY - rect.top - v.y) / v.scale
    dragRef.current = {
      id: node.id,
      offsetX: wx - node.position_x,
      offsetY: wy - node.position_y,
      moved: false
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    if (e.pointerType === 'touch') {
      const startX = e.clientX
      const startY = e.clientY
      const canvasRect = rect
      const timer = setTimeout(() => {
        setContextMenu({
          kind: 'node',
          x: startX - canvasRect.left,
          y: startY - canvasRect.top,
          nodeId: node.id
        })
        dragRef.current = null
        longPressRef.current = null
        if (navigator.vibrate) navigator.vibrate(30)
      }, 500)
      longPressRef.current = { timer, startX, startY }
    }
  }, [connect])

  const onNodeContextMenu = useCallback((e: ReactMouseEvent<HTMLDivElement>, node: MindNode) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setContextMenu({
      kind: 'node',
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      nodeId: node.id
    })
  }, [])

  const onNodeDoubleClick = useCallback((node: MindNode) => {
    setEditingNode(node)
  }, [])

  const onLinkPointerDown = useCallback((e: ReactPointerEvent<SVGLineElement>, link: MindLink) => {
    if (e.button === 2) return
    e.stopPropagation()
    if (e.pointerType !== 'touch') return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const startX = e.clientX
    const startY = e.clientY
    const timer = setTimeout(() => {
      setContextMenu({
        kind: 'link',
        x: startX - rect.left,
        y: startY - rect.top,
        linkId: link.id
      })
      longPressRef.current = null
      if (navigator.vibrate) navigator.vibrate(30)
    }, 500)
    longPressRef.current = { timer, startX, startY }
  }, [])

  const onLinkContextMenu = useCallback((e: ReactMouseEvent<SVGLineElement>, link: MindLink) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setContextMenu({
      kind: 'link',
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      linkId: link.id
    })
  }, [])

  const onCanvasPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button === 2) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      const rect = canvasRef.current!.getBoundingClientRect()
      pinchRef.current = {
        startDist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1,
        startScale: viewRef.current.scale,
        startViewX: viewRef.current.x,
        startViewY: viewRef.current.y,
        cx: (pts[0].x + pts[1].x) / 2 - rect.left,
        cy: (pts[0].y + pts[1].y) / 2 - rect.top
      }
      panRef.current = null
      setPanning(false)
    } else if (pointersRef.current.size === 1 && !dragRef.current) {
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        viewX: viewRef.current.x,
        viewY: viewRef.current.y
      }
      setPanning(true)
    }
  }

  const onCanvasPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    const lp = longPressRef.current
    if (lp) {
      if (Math.hypot(e.clientX - lp.startX, e.clientY - lp.startY) > 8) {
        clearLongPress()
      }
    }

    const drag = dragRef.current
    if (drag) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const v = viewRef.current
      const wx = (e.clientX - rect.left - v.x) / v.scale
      const wy = (e.clientY - rect.top - v.y) / v.scale
      const x = Math.round(wx - drag.offsetX)
      const y = Math.round(wy - drag.offsetY)
      drag.moved = true
      dragLatestRef.current = { x, y }
      if (dragRafRef.current === null) {
        dragRafRef.current = requestAnimationFrame(() => {
          dragRafRef.current = null
          const latest = dragLatestRef.current
          const cur = dragRef.current
          if (!latest || !cur) return
          setNodes((ns) =>
            ns.map((n) => (n.id === cur.id ? { ...n, position_x: latest.x, position_y: latest.y } : n))
          )
        })
      }
      return
    }

    const pinch = pinchRef.current
    if (pinch && pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, pinch.startScale * (dist / pinch.startDist))
      )
      const wx = (pinch.cx - pinch.startViewX) / pinch.startScale
      const wy = (pinch.cy - pinch.startViewY) / pinch.startScale
      setView({ scale: newScale, x: pinch.cx - wx * newScale, y: pinch.cy - wy * newScale })
      return
    }

    const pan = panRef.current
    if (pan) {
      setView((v) => ({
        ...v,
        x: pan.viewX + (e.clientX - pan.startX),
        y: pan.viewY + (e.clientY - pan.startY)
      }))
    }
  }

  const onCanvasPointerUp = async (e: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) {
      panRef.current = null
      setPanning(false)
    }
    clearLongPress()

    const drag = dragRef.current
    if (drag) {
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current)
        dragRafRef.current = null
      }
      const latest = dragLatestRef.current
      dragLatestRef.current = null
      dragRef.current = null
      if (drag.moved && latest) {
        const id = drag.id
        setNodes((ns) =>
          ns.map((n) => (n.id === id ? { ...n, position_x: latest.x, position_y: latest.y } : n))
        )
        pendingPositionsRef.current.set(id, { x: latest.x, y: latest.y })
        schedulePositionSave()
      }
    }
  }

  const zoomByDelta = (delta: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = rect.width / 2
    const py = rect.height / 2
    setView((v) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale + delta))
      if (newScale === v.scale) return v
      const wx = (px - v.x) / v.scale
      const wy = (py - v.y) / v.scale
      return { scale: newScale, x: px - wx * newScale, y: py - wy * newScale }
    })
  }
  const resetView = () => setView({ x: 0, y: 0, scale: 1 })

  // Overlay relations PNJ : pour chaque relation (pnj→pnj), si les deux PNJ
  // ont un noeud mindmap de type 'pnj' dont le titre matche le nom, on génère
  // une ligne overlay. La couleur dépend du type de relation.
  const pnjRelationOverlays = useMemo(() => {
    if (!showPnjRelations || pnjRelationsRaw.length === 0) return []
    // Index nodes par pnj_id (résolu via nom).
    const nodeByPnjId = new Map<string, MindNode>()
    nodes.forEach((n) => {
      if (n.type !== 'pnj') return
      const key = (n.titre ?? '').trim().toLowerCase()
      const pid = pnjByName.get(key)
      if (pid) nodeByPnjId.set(pid, n)
    })
    const out: Array<{
      id: string
      from: MindNode
      to: MindNode
      type: string
      color: string
    }> = []
    pnjRelationsRaw.forEach((r) => {
      if (r.entite_type !== 'pnj') return
      const a = nodeByPnjId.get(r.pnj_id)
      const b = nodeByPnjId.get(r.entite_id)
      if (!a || !b || a.id === b.id) return
      out.push({
        id: r.id,
        from: a,
        to: b,
        type: r.type_relation,
        color: PNJ_RELATION_COLORS[r.type_relation] ?? '#9ca3af'
      })
    })
    return out
  }, [showPnjRelations, pnjRelationsRaw, pnjByName, nodes])

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-3 border-b border-gray-700 flex flex-wrap items-center gap-2">
        <select
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none"
        >
          {scenarios.length === 0 ? (
            <option value="">— Aucun scénario —</option>
          ) : (
            scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))
          )}
        </select>
        <div className="flex flex-wrap gap-1">
          {FREE_NODE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addNode(t)}
              disabled={!scenarioId}
              className="px-3 py-2 rounded-full text-sm font-bold text-white disabled:opacity-40"
              style={{ backgroundColor: BUILTIN_TYPE_META[t].color }}
              title={`Ajouter ${BUILTIN_TYPE_META[t].label}`}
            >
              {BUILTIN_TYPE_META[t].icon} {BUILTIN_TYPE_META[t].label}
            </button>
          ))}
          {customTypes.map((ct) => (
            <span
              key={ct.id}
              className="group inline-flex items-stretch rounded-full overflow-hidden disabled:opacity-40"
            >
              <button
                type="button"
                onClick={() => addCustomNode(ct.id)}
                disabled={!scenarioId}
                className="px-3 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: CUSTOM_COLOR_HEX[ct.couleur] }}
                title={`Ajouter ${ct.nom}`}
              >
                {ct.icone} {ct.nom}
              </button>
              <button
                type="button"
                onClick={() => supprimerCustomType(ct.id)}
                className="px-2 text-white/70 hover:text-red-200 hover:bg-black/30"
                title="Supprimer ce type personnalisé"
                style={{ backgroundColor: CUSTOM_COLOR_HEX[ct.couleur] }}
              >
                ✕
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setCustomCreatorOpen(true)}
            disabled={!scenarioId}
            className="px-3 py-2 rounded-full text-sm font-bold text-yellow-300 bg-gray-800 border border-yellow-600/50 hover:bg-gray-700 disabled:opacity-40"
            title="Créer un type personnalisé"
          >
            ✨ Personnalisé
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(ENTITY_META) as EntityType[]).map((et) => (
            <button
              key={et}
              type="button"
              onClick={() => setEntityPicker(et)}
              disabled={!scenarioId || !mindmapId}
              className="px-3 py-2 rounded-full text-sm font-bold text-white disabled:opacity-40 border border-white/10"
              style={{ backgroundColor: `${ENTITY_META[et].color}cc` }}
              title={`Lier ${ENTITY_META[et].label} existant·e`}
            >
              🔗 {ENTITY_META[et].icon} Lier un{et === 'map' ? 'e' : ''}{' '}
              {ENTITY_META[et].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          disabled={!scenarioId}
          className={`px-3 py-2 rounded-full text-sm font-bold disabled:opacity-40 transition ${
            notesOpen
              ? 'bg-yellow-500 text-gray-900'
              : 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
          }`}
          title="Afficher les notes de session"
        >
          📝 Notes de session
        </button>
        <button
          type="button"
          onClick={() => setShowPnjRelations((v) => !v)}
          disabled={!scenarioId}
          className={`px-3 py-2 rounded-full text-sm font-bold disabled:opacity-40 transition ${
            showPnjRelations
              ? 'bg-yellow-500 text-gray-900'
              : 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
          }`}
          title="Afficher les relations entre PNJ (matching par nom)"
        >
          🤝 Relations PNJ
        </button>

        {/* Export : menu déroulant PNG / PDF / JSON */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportMenuOpen((v) => !v)}
            disabled={!mindmapId}
            className="px-3 py-2 rounded-full text-sm font-bold bg-gray-700 text-yellow-400 hover:bg-gray-600 disabled:opacity-40"
            title="Exporter la carte mentale"
          >
            📥 Exporter ▾
          </button>
          {exportMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-[60]"
                onClick={() => setExportMenuOpen(false)}
              />
              <div className="absolute left-0 mt-1 z-[61] min-w-[180px] bg-gray-900 border-2 border-yellow-500 rounded-lg shadow-2xl py-1">
                <button
                  type="button"
                  onClick={() => handleExportImage('png')}
                  className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-gray-800"
                >
                  🖼️ Image PNG
                </button>
                <button
                  type="button"
                  onClick={() => handleExportImage('pdf')}
                  className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-gray-800"
                >
                  📄 Document PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-gray-800"
                >
                  🧾 JSON (réimportable)
                </button>
              </div>
            </>
          )}
        </div>

        {/* Import : fichier JSON Master Screen */}
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          disabled={!scenarioId || importing}
          className="px-3 py-2 rounded-full text-sm font-bold bg-gray-700 text-yellow-400 hover:bg-gray-600 disabled:opacity-40"
          title="Importer une carte mentale (JSON Master Screen)"
        >
          {importing ? '⏳ Import…' : '📤 Importer'}
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) handleImportFile(file)
          }}
        />

        <p className="text-gray-400 text-xs ml-auto">
          <span className="text-yellow-500">Shift + clic</span> sur 2 nœuds pour les relier ·
          molette/pinch = zoom · glisser le fond = déplacer
        </p>
      </div>

      {scenarioId && (
        <div className="px-3 py-2 border-b border-gray-700 bg-gray-900/40 flex flex-wrap items-center gap-1">
          <span className="text-[11px] uppercase tracking-[0.18em] text-gray-500 mr-1">
            Cartes mentales
          </span>
          {mindmaps.map((m) => {
            const actif = m.id === mindmapId
            return (
              <div
                key={m.id}
                className={`group flex items-center gap-1 rounded-full pl-3 pr-1 py-1 text-sm border transition ${
                  actif
                    ? 'bg-yellow-500/15 border-yellow-500 text-yellow-200'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setMindmapId(m.id)}
                  className="font-medium"
                >
                  {m.nom}
                </button>
                <button
                  type="button"
                  onClick={() => renommerMindmap(m.id)}
                  className="opacity-60 hover:opacity-100 hover:text-yellow-300 px-1"
                  title="Renommer"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => supprimerMindmap(m.id)}
                  className="opacity-60 hover:opacity-100 hover:text-red-400 px-1"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            )
          })}
          <button
            type="button"
            onClick={creerMindmap}
            className="px-3 py-1 rounded-full text-sm font-bold bg-gray-700 hover:bg-gray-600 text-yellow-400 border border-gray-600"
            title="Nouvelle carte mentale"
          >
            ➕ Nouvelle carte mentale
          </button>
        </div>
      )}

      {pendingFrom && (
        <div className="bg-yellow-500/15 border-b-2 border-yellow-500 px-3 py-2 text-sm text-yellow-400 flex items-center justify-between gap-2">
          <span>🔗 Sélectionne un nœud à lier…</span>
          <button
            type="button"
            onClick={() => setPendingFrom(null)}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded font-bold"
          >
            Annuler
          </button>
        </div>
      )}

      <div
        ref={canvasRef}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerCancel={onCanvasPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className="relative w-full bg-gray-900 overflow-hidden select-none"
        style={{
          height: 'calc(100vh - 260px)',
          minHeight: 400,
          touchAction: 'none',
          cursor: panning ? 'grabbing' : 'grab',
          backgroundImage:
            'radial-gradient(circle, rgba(234,179,8,0.08) 1px, transparent 1px)',
          backgroundSize: `${24 * view.scale}px ${24 * view.scale}px`,
          backgroundPosition: `${view.x}px ${view.y}px`
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            transformOrigin: '0 0',
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
          }}
        >
          <svg
            width="1"
            height="1"
            style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none' }}
          >
            {links.map((l) => {
              const a = nodes.find((n) => n.id === l.noeud_from)
              const b = nodes.find((n) => n.id === l.noeud_to)
              if (!a || !b) return null
              return (
                <MindLinkView
                  key={l.id}
                  link={l}
                  fromNode={a}
                  toNode={b}
                  customTypes={customTypes}
                  onPointerDown={onLinkPointerDown}
                  onContextMenu={onLinkContextMenu}
                />
              )
            })}
            {pnjRelationOverlays.map((o) => {
              const mx = (o.from.position_x + o.to.position_x) / 2
              const my = (o.from.position_y + o.to.position_y) / 2
              return (
                <g key={`pnj-rel-${o.id}`} style={{ pointerEvents: 'none' }}>
                  <line
                    x1={o.from.position_x}
                    y1={o.from.position_y}
                    x2={o.to.position_x}
                    y2={o.to.position_y}
                    stroke={o.color}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    strokeOpacity={0.85}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={mx}
                    y={my - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fill={o.color}
                    style={{
                      paintOrder: 'stroke',
                      stroke: '#0a0b0d',
                      strokeWidth: 3,
                      fontWeight: 600
                    }}
                  >
                    {o.type}
                  </text>
                </g>
              )
            })}
          </svg>

          {nodes.map((n) => (
            <MindNodeView
              key={n.id}
              node={n}
              customTypes={customTypes}
              selected={pendingFrom === n.id}
              onPointerDown={onNodePointerDown}
              onContextMenu={onNodeContextMenu}
              onDoubleClick={onNodeDoubleClick}
            />
          ))}
        </div>

        <div
          className="absolute bottom-3 right-3 flex items-center gap-1 bg-gray-800/90 border border-gray-700 rounded-full px-2 py-1 shadow-lg z-50"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              zoomByDelta(-0.2)
            }}
            className="w-7 h-7 rounded-full text-gray-200 hover:bg-gray-700 font-bold"
            title="Zoom arrière"
          >
            −
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              resetView()
            }}
            className="px-2 text-xs text-yellow-500 font-mono hover:text-yellow-400"
            title="Réinitialiser la vue"
          >
            {Math.round(view.scale * 100)}%
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              zoomByDelta(0.2)
            }}
            className="w-7 h-7 rounded-full text-gray-200 hover:bg-gray-700 font-bold"
            title="Zoom avant"
          >
            +
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              resetView()
            }}
            className="w-7 h-7 rounded-full text-gray-200 hover:bg-gray-700"
            title="Centrer"
          >
            ⌖
          </button>
        </div>

        {nodes.length === 0 && scenarioId && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-500 text-sm">
              Aucun nœud. Ajoute-en un via les boutons ci-dessus.
            </p>
          </div>
        )}

        {contextMenu && (
          <>
            <div
              className="absolute inset-0 z-40"
              onPointerDown={(e) => {
                e.stopPropagation()
                setContextMenu(null)
              }}
            />
            <div
              className="absolute bg-gray-900 border-2 border-yellow-500 rounded-lg shadow-2xl py-1 z-50 min-w-[180px]"
              style={{
                left: Math.min(contextMenu.x, (canvasRef.current?.clientWidth ?? 0) - 190),
                top: Math.min(contextMenu.y, (canvasRef.current?.clientHeight ?? 0) - 130)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {contextMenu.kind === 'node' && (
                <>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      const n = nodes.find((nn) => nn.id === contextMenu.nodeId)
                      if (n) setEditingNode(n)
                      setContextMenu(null)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-gray-800 flex items-center gap-2"
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingFrom(contextMenu.nodeId)
                      setContextMenu(null)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-gray-800 flex items-center gap-2"
                  >
                    🔗 Lier à…
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setLinksBrowser(contextMenu.nodeId)
                      setContextMenu(null)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-gray-800 flex items-center gap-2"
                  >
                    🔗❌ Supprimer un lien
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNode(contextMenu.nodeId)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2"
                  >
                    🗑️ Supprimer
                  </button>
                </>
              )}
              {contextMenu.kind === 'link' && (
                <>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      const l = links.find((ll) => ll.id === contextMenu.linkId)
                      if (l) openEditLink(l)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-gray-800 flex items-center gap-2"
                  >
                    🎨 Couleur / annotation
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteLink(contextMenu.linkId)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2"
                  >
                    🗑️ Supprimer le lien
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {linksBrowser && (() => {
        const node = nodes.find((n) => n.id === linksBrowser)
        const related = links.filter(
          (l) => l.noeud_from === linksBrowser || l.noeud_to === linksBrowser
        )
        return (
          <div
            className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4"
            onClick={() => setLinksBrowser(null)}
          >
            <div
              className="bg-gray-800 border-2 border-yellow-500 rounded-lg shadow-2xl w-full max-w-md p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-yellow-500 font-bold">
                🔗❌ Supprimer un lien de « {node?.titre || '—'} »
              </h3>
              {related.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun lien pour ce nœud.</p>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                  {related.map((l) => {
                    const otherId = l.noeud_from === linksBrowser ? l.noeud_to : l.noeud_from
                    const other = nodes.find((n) => n.id === otherId)
                    const meta = other ? resolveNodeMeta(other, customTypes) : null
                    return (
                      <li
                        key={l.id}
                        className="flex items-center justify-between gap-2 bg-gray-900 rounded border border-gray-700 p-2"
                      >
                        <span className="text-sm text-gray-200 truncate flex items-center gap-2">
                          <span>{meta?.icon ?? '❓'}</span>
                          <span className="truncate">{other?.titre || '(nœud supprimé)'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteLink(l.id)
                          }}
                          className="px-3 py-1 text-xs font-bold bg-red-600 text-white rounded hover:bg-red-500 flex-shrink-0"
                        >
                          Supprimer
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setLinksBrowser(null)}
                className="w-full p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Fermer
              </button>
            </div>
          </div>
        )
      })()}

      {notesOpen && (
        <aside
          className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-gray-900 border-l-2 border-yellow-600 shadow-2xl z-[70] flex flex-col"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-700 flex items-center justify-between gap-2 flex-shrink-0">
            <h3 className="text-lg font-bold text-yellow-500 truncate">
              📝 Notes de session
            </h3>
            <button
              type="button"
              onClick={() => setNotesOpen(false)}
              className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center flex-shrink-0"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/scenarios/${scenarioId}/notes`)}
              disabled={!scenarioId}
              className="w-full px-3 py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 text-sm disabled:opacity-40"
            >
              ✏️ Ouvrir l&apos;éditeur
            </button>
            <p className="text-gray-500 text-xs mt-2">
              Lecture seule ici — l&apos;édition se fait dans la page dédiée.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notesLoading && (
              <p className="text-gray-500 text-sm text-center">Chargement…</p>
            )}
            {!notesLoading && notes.length === 0 && (
              <p className="text-gray-500 text-sm text-center">
                Aucune entrée pour ce scénario.
              </p>
            )}
            {!notesLoading &&
              notes.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="font-bold text-yellow-400 text-sm truncate">
                      {entry.titre || '(Sans titre)'}
                    </h4>
                    <span className="text-[10px] text-gray-500 font-mono flex-shrink-0">
                      {entry.date}
                    </span>
                  </div>
                  {entry.contenu ? (
                    <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">
                      {entry.contenu}
                    </p>
                  ) : (
                    <p className="text-gray-600 text-xs italic">(vide)</p>
                  )}
                </div>
              ))}
          </div>
        </aside>
      )}

      {linkEditor && (() => {
        const fromId = linkEditor.mode === 'create' ? linkEditor.from : linkEditor.link.noeud_from
        const toId = linkEditor.mode === 'create' ? linkEditor.to : linkEditor.link.noeud_to
        const a = nodes.find((n) => n.id === fromId)
        const b = nodes.find((n) => n.id === toId)
        const metaA = a ? resolveNodeMeta(a, customTypes) : null
        const metaB = b ? resolveNodeMeta(b, customTypes) : null
        const autoHint =
          metaA && metaB
            ? metaA.label === metaB.label
              ? metaA.label
              : `${metaA.label} ↔ ${metaB.label}`
            : ''
        return (
          <div
            className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4"
            onClick={() => setLinkEditor(null)}
          >
            <div
              className="bg-gray-800 border-2 border-yellow-600 rounded-lg shadow-2xl w-full max-w-md p-4 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-yellow-500 font-bold">
                {linkEditor.mode === 'create' ? '🔗 Nouveau lien' : '🎨 Modifier le lien'}
              </h3>
              {a && b && metaA && metaB && (
                <p className="text-gray-300 text-sm flex items-center gap-2 flex-wrap">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${metaA.color}33`, color: metaA.color }}
                  >
                    {metaA.icon} {a.titre || metaA.label}
                  </span>
                  <span className="text-gray-500">↔</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${metaB.color}33`, color: metaB.color }}
                  >
                    {metaB.icon} {b.titre || metaB.label}
                  </span>
                </p>
              )}

              <div>
                <label className="text-[11px] uppercase tracking-[0.18em] text-gray-400 block mb-2">
                  Couleur
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {(['auto', 'or', 'rouge', 'vert', 'bleu', 'violet', 'gris'] as ColorKey[]).map((key) => {
                    const actif = linkEditor.couleur === key
                    const commun = {
                      'aria-label': key === 'auto' ? 'Couleur auto' : LINK_COLORS[key].label,
                      title: key === 'auto' ? `Couleur auto (${autoHint})` : LINK_COLORS[key].label,
                      onClick: () =>
                        setLinkEditor((prev) => (prev ? { ...prev, couleur: key } : prev)),
                      className: `relative w-10 h-10 rounded-full border-2 transition ${
                        actif ? 'border-yellow-400 scale-110' : 'border-gray-700 hover:border-gray-500'
                      }`
                    }
                    if (key === 'auto') {
                      return (
                        <button
                          key={key}
                          type="button"
                          {...commun}
                          style={{
                            background:
                              'conic-gradient(from 45deg, #3b82f6, #a855f7, #f97316, #22c55e, #3b82f6)'
                          }}
                        >
                          <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold drop-shadow">
                            A
                          </span>
                        </button>
                      )
                    }
                    return (
                      <button
                        key={key}
                        type="button"
                        {...commun}
                        style={{ backgroundColor: LINK_COLORS[key].hex }}
                      />
                    )
                  })}
                </div>
                {linkEditor.couleur === 'auto' && autoHint && (
                  <p className="text-[11px] text-gray-500 mt-2 italic">
                    Auto → dérivé des types ({autoHint}).
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.18em] text-gray-400 block mb-1">
                  Annotation (optionnel)
                </label>
                <input
                  type="text"
                  maxLength={ANNOTATION_MAX}
                  value={linkEditor.annotation}
                  onChange={(e) =>
                    setLinkEditor((prev) =>
                      prev ? { ...prev, annotation: e.target.value } : prev
                    )
                  }
                  placeholder="Ex : ami de jeunesse, caché dans…"
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                />
                <p className="text-[11px] text-gray-500 mt-1 text-right">
                  {linkEditor.annotation.length}/{ANNOTATION_MAX}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveLink}
                  className="flex-1 p-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400"
                >
                  {linkEditor.mode === 'create' ? 'Créer le lien' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setLinkEditor(null)}
                  className="px-4 p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {editingNode && (
        <div
          className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4"
          onClick={() => setEditingNode(null)}
        >
          <div
            className="bg-gray-800 border border-yellow-600 rounded-lg shadow-2xl w-full max-w-md p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-yellow-500 font-bold">
              {(() => {
                const m = resolveNodeMeta(editingNode, customTypes)
                return `${m.icon} Éditer ${m.label}`
              })()}
            </h3>
            <input
              type="text"
              value={editingNode.titre}
              onChange={(e) => setEditingNode({ ...editingNode, titre: e.target.value })}
              placeholder="Titre"
              className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none"
            />
            <textarea
              value={editingNode.contenu}
              onChange={(e) => setEditingNode({ ...editingNode, contenu: e.target.value })}
              placeholder="Contenu"
              className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none h-32"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveEdit}
                className="flex-1 p-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                className="px-4 p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {customCreatorOpen && (
        <CustomTypeCreator
          onCancel={() => setCustomCreatorOpen(false)}
          onCreate={async (nom, couleur, icone) => {
            const created = await creerCustomType(nom, couleur, icone)
            if (created) {
              setCustomCreatorOpen(false)
              // Place tout de suite un noeud du nouveau type au centre.
              await addCustomNode(created.id)
            }
          }}
        />
      )}

      {entityPicker && (
        <EntityPicker
          type={entityPicker}
          existingEntiteIds={
            new Set(
              nodes
                .filter((n) => n.entite_type === entityPicker && n.entite_id)
                .map((n) => n.entite_id as string)
            )
          }
          onCancel={() => setEntityPicker(null)}
          onConfirm={async (selected) => {
            await addEntityNodes(entityPicker, selected)
            setEntityPicker(null)
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// CustomTypeCreator — modale de création d'un type personnalisé
// ============================================================================

function CustomTypeCreator({
  onCancel,
  onCreate
}: {
  onCancel: () => void
  onCreate: (
    nom: string,
    couleur: CustomColorKey,
    icone: string
  ) => Promise<void>
}) {
  const [nom, setNom] = useState('')
  const [couleur, setCouleur] = useState<CustomColorKey>('or')
  const [icone, setIcone] = useState('✨')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!nom.trim() || submitting) return
    setSubmitting(true)
    try {
      await onCreate(nom, couleur, icone)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-gray-800 border-2 border-yellow-600 rounded-lg shadow-2xl w-full max-w-md p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-yellow-500 font-bold flex items-center gap-2">
          ✨ Nouveau type personnalisé
        </h3>

        <div>
          <label className="text-[11px] uppercase tracking-[0.18em] text-gray-400 block mb-1">
            Nom du type
          </label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Quête, Trésor, Faction…"
            maxLength={40}
            autoFocus
            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
          />
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.18em] text-gray-400 block mb-2">
            Couleur
          </label>
          <div className="grid grid-cols-7 gap-2">
            {(Object.keys(CUSTOM_COLOR_HEX) as CustomColorKey[]).map((key) => {
              const actif = couleur === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCouleur(key)}
                  className={`w-10 h-10 rounded-full border-2 transition ${
                    actif
                      ? 'border-yellow-400 scale-110'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: CUSTOM_COLOR_HEX[key] }}
                  title={key}
                  aria-label={key}
                />
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.18em] text-gray-400 block mb-1">
            Icône (emoji)
          </label>
          <input
            type="text"
            value={icone}
            onChange={(e) => setIcone(e.target.value)}
            maxLength={4}
            placeholder="✨"
            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm text-center text-2xl"
          />
          <p className="text-[10px] text-gray-500 mt-1 italic">
            Tape n&apos;importe quel emoji ou caractère court (max 4 chars).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!nom.trim() || submitting}
            className="flex-1 p-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 disabled:opacity-50"
          >
            {submitting ? 'Création…' : 'Créer le type'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EntityPicker — modale de sélection d'entités existantes à lier
// ============================================================================

function EntityPicker({
  type,
  existingEntiteIds,
  onCancel,
  onConfirm
}: {
  type: EntityType
  existingEntiteIds: Set<string>
  onCancel: () => void
  onConfirm: (selected: EntityLite[]) => Promise<void>
}) {
  const meta = ENTITY_META[type]
  const [entities, setEntities] = useState<EntityLite[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancel = false
    const load = async () => {
      setLoading(true)
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancel) {
          setEntities([])
          setLoading(false)
        }
        return
      }
      const { data, error } = await supabase
        .from(meta.table)
        .select('id, nom')
        .eq('mj_id', user.id)
        .order('nom', { ascending: true })
      if (cancel) return
      if (error) console.error('[mindmap] chargement entités échec :', error)
      setEntities(((data ?? []) as EntityLite[]).filter((e) => e.nom))
      setLoading(false)
    }
    load()
    return () => {
      cancel = true
    }
  }, [meta.table])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = entities.filter((e) =>
    e.nom.toLowerCase().includes(search.trim().toLowerCase())
  )

  const submit = async () => {
    if (selected.size === 0 || submitting) return
    setSubmitting(true)
    try {
      await onConfirm(entities.filter((e) => selected.has(e.id)))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-gray-800 border-2 border-yellow-600 rounded-lg shadow-2xl w-full max-w-md p-4 space-y-3 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-yellow-500 font-bold flex items-center gap-2">
          <span>{meta.icon}</span> Lier un{type === 'map' ? 'e' : ''} {meta.label}
        </h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Rechercher parmi tes ${meta.labelPlural}…`}
          className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
        />
        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1 min-h-[120px]">
          {loading && (
            <p className="text-gray-500 text-sm text-center py-6">Chargement…</p>
          )}
          {!loading && entities.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-6">
              Aucun·e {meta.label} dans ta bibliothèque.
            </p>
          )}
          {!loading && entities.length > 0 && filtered.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-6">
              Aucun résultat pour « {search} ».
            </p>
          )}
          {!loading &&
            filtered.map((e) => {
              const dejaLie = existingEntiteIds.has(e.id)
              const checked = selected.has(e.id)
              return (
                <label
                  key={e.id}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition ${
                    checked
                      ? 'bg-yellow-500/15 border-yellow-500'
                      : 'bg-gray-900 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(e.id)}
                    className="accent-yellow-500"
                  />
                  <span className="text-sm text-gray-200 truncate flex-1">
                    {e.nom}
                  </span>
                  {dejaLie && (
                    <span
                      className="text-[10px] text-gray-500 flex-shrink-0"
                      title="Un nœud lié à cette entité existe déjà sur cette carte"
                    >
                      déjà lié
                    </span>
                  )}
                </label>
              )
            })}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={submit}
            disabled={selected.size === 0 || submitting}
            className="flex-1 p-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 disabled:opacity-50"
          >
            {submitting
              ? 'Ajout…'
              : `Ajouter ${selected.size || ''} nœud${selected.size > 1 ? 's' : ''}`.trim()}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

const MindNodeView = memo(function MindNodeView({
  node,
  customTypes,
  selected,
  onPointerDown,
  onContextMenu,
  onDoubleClick
}: {
  node: MindNode
  customTypes: CustomType[]
  selected: boolean
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>, node: MindNode) => void
  onContextMenu: (e: ReactMouseEvent<HTMLDivElement>, node: MindNode) => void
  onDoubleClick: (node: MindNode) => void
}) {
  const meta = resolveNodeMeta(node, customTypes)
  const color = node.couleur ?? meta.color
  return (
    <div
      onPointerDown={(e) => onPointerDown(e, node)}
      onContextMenu={(e) => onContextMenu(e, node)}
      onDoubleClick={() => onDoubleClick(node)}
      className={`absolute shadow-lg cursor-grab active:cursor-grabbing ${
        selected ? 'ring-4 ring-yellow-300 animate-pulse' : ''
      }`}
      style={{
        left: node.position_x,
        top: node.position_y,
        transform: 'translate(-50%, -50%)',
        minWidth: 140,
        maxWidth: 220,
        padding: '10px 18px',
        borderRadius: 9999,
        backgroundColor: `${color}33`,
        border: '2px solid #eab308',
        backdropFilter: 'blur(2px)',
        touchAction: 'none'
      }}
    >
      <div
        className="text-sm font-bold flex items-center justify-center gap-1 text-center leading-tight"
        style={{ color }}
      >
        <span>{meta.icon}</span>
        <span className="truncate">{node.titre || meta.label}</span>
      </div>
      {node.contenu && (
        <div className="text-[11px] text-gray-300 text-center mt-1 line-clamp-2 break-words">
          {node.contenu}
        </div>
      )}
      {node.entite_type && node.entite_id && (
        <a
          href={ENTITY_META[node.entite_type].route(node.entite_id)}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="block text-[10px] text-center mt-1 underline decoration-dotted hover:opacity-80"
          style={{ color }}
          title={`Ouvrir la fiche ${ENTITY_META[node.entite_type].label}`}
        >
          Ouvrir la fiche ↗
        </a>
      )}
    </div>
  )
})

const MindLinkView = memo(function MindLinkView({
  link,
  fromNode,
  toNode,
  customTypes,
  onPointerDown,
  onContextMenu
}: {
  link: MindLink
  fromNode: MindNode
  toNode: MindNode
  customTypes: CustomType[]
  onPointerDown: (e: ReactPointerEvent<SVGLineElement>, link: MindLink) => void
  onContextMenu: (e: ReactMouseEvent<SVGLineElement>, link: MindLink) => void
}) {
  const a = fromNode
  const b = toNode
  const metaA = resolveNodeMeta(a, customTypes)
  const metaB = resolveNodeMeta(b, customTypes)
  const colorKey = isColorKey(link.couleur) ? link.couleur : 'auto'
  // Pour le gradient on compare les couleurs résolues plutôt que les types
  // bruts (deux types custom différents = gradient).
  const sameColor = metaA.color === metaB.color
  const usesGradient = colorKey === 'auto' && !sameColor
  let stroke: string
  if (colorKey === 'auto') {
    stroke = sameColor ? metaA.color : `url(#mindmap-grad-${link.id})`
  } else {
    stroke = LINK_COLORS[colorKey].hex
  }
  const mx = (a.position_x + b.position_x) / 2
  const my = (a.position_y + b.position_y) / 2
  const annotation = (link.annotation ?? '').trim()
  const annotationWidth = Math.min(160, annotation.length * 7 + 16)
  return (
    <g>
      {usesGradient && (
        <defs>
          <linearGradient
            id={`mindmap-grad-${link.id}`}
            x1={a.position_x}
            y1={a.position_y}
            x2={b.position_x}
            y2={b.position_y}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={metaA.color} />
            <stop offset="100%" stopColor={metaB.color} />
          </linearGradient>
        </defs>
      )}
      <line
        x1={a.position_x}
        y1={a.position_y}
        x2={b.position_x}
        y2={b.position_y}
        stroke="black"
        strokeOpacity={0}
        strokeWidth={16}
        vectorEffect="non-scaling-stroke"
        onPointerDown={(e) => onPointerDown(e, link)}
        onContextMenu={(e) => onContextMenu(e, link)}
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
      >
        <title>{annotation || 'Lien'}</title>
      </line>
      <line
        x1={a.position_x}
        y1={a.position_y}
        x2={b.position_x}
        y2={b.position_y}
        stroke={stroke}
        strokeWidth={2}
        strokeOpacity={0.85}
        vectorEffect="non-scaling-stroke"
        style={{ pointerEvents: 'none' }}
      />
      {annotation && (
        <g pointerEvents="none" transform={`translate(${mx}, ${my})`}>
          <rect
            x={-annotationWidth / 2}
            y={-9}
            width={annotationWidth}
            height={18}
            rx={4}
            ry={4}
            fill="rgba(10,11,13,0.85)"
            stroke="rgba(234,179,8,0.35)"
            strokeWidth={0.5}
          />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#e8e8ec"
            fontSize={11}
            fontFamily="system-ui, sans-serif"
          >
            {annotation.length > 24 ? annotation.slice(0, 23) + '…' : annotation}
          </text>
        </g>
      )}
    </g>
  )
})
