'use client'

import {
  useState,
  useEffect,
  useRef,
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent
} from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type NodeType = 'lieu' | 'pnj' | 'evenement' | 'indice'

type NoteEntry = {
  id: string
  titre: string
  date: string
  contenu: string
}

type MindNode = {
  id: string
  scenario_id: string
  type: NodeType
  titre: string
  contenu: string
  position_x: number
  position_y: number
  couleur: string | null
}

type MindLink = {
  id: string
  scenario_id: string
  noeud_from: string
  noeud_to: string
  label: string | null
}

type ScenarioLite = { id: string; nom: string }

const TYPE_META: Record<NodeType, { label: string; icon: string; color: string }> = {
  lieu: { label: 'Lieu', icon: '📍', color: '#3b82f6' },
  pnj: { label: 'PNJ', icon: '👤', color: '#a855f7' },
  evenement: { label: 'Événement', icon: '⚡', color: '#f97316' },
  indice: { label: 'Indice', icon: '🔍', color: '#22c55e' }
}

const MIN_SCALE = 0.1
const MAX_SCALE = 5

export default function MindMap({ scenarios }: { scenarios: ScenarioLite[] }) {
  const router = useRouter()
  const [scenarioId, setScenarioId] = useState<string>(scenarios[0]?.id ?? '')
  const [nodes, setNodes] = useState<MindNode[]>([])
  const [links, setLinks] = useState<MindLink[]>([])
  const [pendingFrom, setPendingFrom] = useState<string | null>(null)
  const [editingNode, setEditingNode] = useState<MindNode | null>(null)
  const [linksBrowser, setLinksBrowser] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState<NoteEntry[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [contextMenu, setContextMenu] = useState<
    | { kind: 'node'; x: number; y: number; nodeId: string }
    | { kind: 'link'; x: number; y: number; linkId: string }
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

  const clearLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer)
      longPressRef.current = null
    }
  }

  useEffect(() => {
    if (!scenarioId) {
      setNodes([])
      setLinks([])
      setNotes([])
      return
    }
    const load = async () => {
      const [n, l] = await Promise.all([
        supabase.from('mindmap_noeuds').select('*').eq('scenario_id', scenarioId),
        supabase.from('mindmap_liens').select('*').eq('scenario_id', scenarioId)
      ])
      setNodes((n.data as MindNode[]) ?? [])
      setLinks((l.data as MindLink[]) ?? [])
      setPendingFrom(null)
      setView({ x: 0, y: 0, scale: 1 })
    }
    load()
  }, [scenarioId])

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

  const addNode = async (type: NodeType) => {
    if (!scenarioId) return
    const rect = canvasRef.current?.getBoundingClientRect()
    const w = rect?.width ?? 800
    const h = rect?.height ?? 600
    const v = viewRef.current
    const cx = (w / 2 - v.x) / v.scale
    const cy = (h / 2 - v.y) / v.scale
    const jitter = () => Math.round((Math.random() - 0.5) * 120)
    const payload = {
      scenario_id: scenarioId,
      type,
      titre: TYPE_META[type].label,
      contenu: '',
      position_x: Math.round(cx + jitter()),
      position_y: Math.round(cy + jitter()),
      couleur: TYPE_META[type].color
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

  const connect = async (from: string, to: string) => {
    if (from === to) return
    if (
      links.some(
        (l) =>
          (l.noeud_from === from && l.noeud_to === to) ||
          (l.noeud_from === to && l.noeud_to === from)
      )
    )
      return
    const { data, error } = await supabase
      .from('mindmap_liens')
      .insert({ scenario_id: scenarioId, noeud_from: from, noeud_to: to })
      .select()
      .single()
    if (error) {
      console.error('[mindmap] insert lien échec :', error)
      return
    }
    if (data) setLinks((ls) => [...ls, data as MindLink])
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

  const onNodePointerDown = (e: ReactPointerEvent<HTMLDivElement>, node: MindNode) => {
    if (e.button === 2) return
    e.stopPropagation()

    if (pendingFrom) {
      if (pendingFrom !== node.id) connect(pendingFrom, node.id)
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
  }

  const onNodeContextMenu = (e: ReactMouseEvent<HTMLDivElement>, node: MindNode) => {
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
  }

  const onLinkPointerDown = (e: ReactPointerEvent<SVGLineElement>, link: MindLink) => {
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
  }

  const onLinkContextMenu = (e: ReactMouseEvent<SVGLineElement>, link: MindLink) => {
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
  }

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
      setNodes((ns) =>
        ns.map((n) => (n.id === drag.id ? { ...n, position_x: x, position_y: y } : n))
      )
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
      dragRef.current = null
      if (drag.moved) {
        const n = nodes.find((nn) => nn.id === drag.id)
        if (n) {
          await supabase
            .from('mindmap_noeuds')
            .update({ position_x: n.position_x, position_y: n.position_y })
            .eq('id', drag.id)
        }
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
          {(Object.keys(TYPE_META) as NodeType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addNode(t)}
              disabled={!scenarioId}
              className="px-3 py-2 rounded-full text-sm font-bold text-white disabled:opacity-40"
              style={{ backgroundColor: TYPE_META[t].color }}
              title={`Ajouter ${TYPE_META[t].label}`}
            >
              {TYPE_META[t].icon} {TYPE_META[t].label}
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
        <p className="text-gray-400 text-xs ml-auto">
          <span className="text-yellow-500">Shift + clic</span> sur 2 nœuds pour les relier ·
          molette/pinch = zoom · glisser le fond = déplacer
        </p>
      </div>

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
                <g key={l.id}>
                  <line
                    x1={a.position_x}
                    y1={a.position_y}
                    x2={b.position_x}
                    y2={b.position_y}
                    stroke="black"
                    strokeOpacity={0}
                    strokeWidth={16}
                    vectorEffect="non-scaling-stroke"
                    onPointerDown={(e) => onLinkPointerDown(e, l)}
                    onContextMenu={(e) => onLinkContextMenu(e, l)}
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  />
                  <line
                    x1={a.position_x}
                    y1={a.position_y}
                    x2={b.position_x}
                    y2={b.position_y}
                    stroke="#eab308"
                    strokeWidth={2}
                    strokeOpacity={0.85}
                    vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              )
            })}
          </svg>

          {nodes.map((n) => {
            const meta = TYPE_META[n.type]
            const color = n.couleur ?? meta.color
            const selected = pendingFrom === n.id
            return (
              <div
                key={n.id}
                onPointerDown={(e) => onNodePointerDown(e, n)}
                onContextMenu={(e) => onNodeContextMenu(e, n)}
                onDoubleClick={() => setEditingNode(n)}
                className={`absolute shadow-lg cursor-grab active:cursor-grabbing ${
                  selected ? 'ring-4 ring-yellow-300 animate-pulse' : ''
                }`}
                style={{
                  left: n.position_x,
                  top: n.position_y,
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
                  <span className="truncate">{n.titre || meta.label}</span>
                </div>
                {n.contenu && (
                  <div className="text-[11px] text-gray-300 text-center mt-1 line-clamp-2 break-words">
                    {n.contenu}
                  </div>
                )}
              </div>
            )
          })}
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
                    const meta = other ? TYPE_META[other.type] : null
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
              {TYPE_META[editingNode.type].icon} Éditer {TYPE_META[editingNode.type].label}
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
    </div>
  )
}
