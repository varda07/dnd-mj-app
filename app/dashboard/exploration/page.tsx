'use client'

import {
  useState,
  useEffect,
  useRef,
  PointerEvent as ReactPointerEvent
} from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ScenarioLite = { id: string; nom: string; mj_id: string }
type MapLite = { id: string; nom: string; image_url: string }
type ItemLite = { id: string; nom: string; image_url: string | null }
type EnnemiLite = { id: string; nom: string; image_url: string | null }
type PersoLite = { id: string; nom: string; image_url: string | null }

type Circle = { x: number; y: number; r: number }
type Placed = { key: string; ref_id: string; x: number; y: number }

type ExplorationRow = {
  id: string
  scenario_id: string
  map_image_url: string | null
  revealed_areas: Circle[]
  positions_pj: Placed[]
  items_caches: Placed[]
  ennemis_caches: Placed[]
}

type Mode = 'off' | 'brush' | 'erase' | 'place_item' | 'place_ennemi' | 'place_pj'

const DEFAULT_BRUSH = 80

export default function ExplorationPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [scenarios, setScenarios] = useState<ScenarioLite[]>([])
  const [scenarioId, setScenarioId] = useState('')
  const [exploration, setExploration] = useState<ExplorationRow | null>(null)
  const [maps, setMaps] = useState<MapLite[]>([])
  const [items, setItems] = useState<ItemLite[]>([])
  const [ennemis, setEnnemis] = useState<EnnemiLite[]>([])
  const [personnages, setPersonnages] = useState<PersoLite[]>([])

  const [mode, setMode] = useState<Mode>('off')
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH)
  const [showHidden, setShowHidden] = useState(true)
  const [selectedRefId, setSelectedRefId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    kind: 'positions_pj' | 'items_caches' | 'ennemis_caches'
    key: string
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

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const outerRef = useRef<HTMLDivElement>(null)
  const paintingRef = useRef(false)

  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  const viewRef = useRef(view)
  viewRef.current = view

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
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
  const markerDragRef = useRef<{
    kind: 'positions_pj' | 'items_caches' | 'ennemis_caches'
    key: string
    offsetX: number
    offsetY: number
    moved: boolean
    pointerId: number
    element: HTMLElement
  } | null>(null)
  const explorationRef = useRef<ExplorationRow | null>(null)

  const scenario = scenarios.find((s) => s.id === scenarioId)
  const isMJ = !!scenario && scenario.mj_id === userId

  const MIN_SCALE = 0.2
  const MAX_SCALE = 5

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const v = viewRef.current
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor))
      console.log('[zoom] wheel', e.deltaY, 'nouveau scale:', newScale)
      if (newScale === v.scale) return
      const wx = (px - v.x) / v.scale
      const wy = (py - v.y) / v.scale
      setView({ scale: newScale, x: px - wx * newScale, y: py - wy * newScale })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    console.log('[zoom] setView appelé avec scale:', view.scale)
  }, [view])

  const fitView = () => {
    const outer = outerRef.current
    if (!outer || imgSize.w === 0) {
      setView({ x: 0, y: 0, scale: 1 })
      return
    }
    const r = outer.getBoundingClientRect()
    const scale = Math.min(r.width / imgSize.w, r.height / imgSize.h, 1)
    const x = (r.width - imgSize.w * scale) / 2
    const y = (r.height - imgSize.h * scale) / 2
    setView({ scale, x, y })
  }

  useEffect(() => {
    fitView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSize.w, imgSize.h])

  const zoomByDelta = (delta: number) => {
    const outer = outerRef.current
    if (!outer) return
    const r = outer.getBoundingClientRect()
    const px = r.width / 2
    const py = r.height / 2
    setView((v) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale + delta))
      if (newScale === v.scale) return v
      const wx = (px - v.x) / v.scale
      const wy = (py - v.y) / v.scale
      return { scale: newScale, x: px - wx * newScale, y: py - wy * newScale }
    })
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUserId(user.id)

      const [{ data: mine }, { data: joined }] = await Promise.all([
        supabase.from('scenarios').select('id, nom, mj_id').eq('mj_id', user.id),
        supabase
          .from('scenarios_joueurs')
          .select('scenario:scenarios(id, nom, mj_id)')
          .eq('joueur_id', user.id)
      ])
      const list: ScenarioLite[] = []
      if (mine) list.push(...mine)
      if (joined) {
        for (const row of joined as { scenario: ScenarioLite | ScenarioLite[] | null }[]) {
          const s = Array.isArray(row.scenario) ? row.scenario[0] : row.scenario
          if (s && !list.some((x) => x.id === s.id)) list.push(s)
        }
      }
      setScenarios(list)
      if (list.length > 0) setScenarioId(list[0].id)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!userId) return
    const loadMaps = async () => {
      const { data, error } = await supabase
        .from('maps')
        .select('id, nom, image_url')
        .eq('mj_id', userId)
        .order('nom')
      console.log('[exploration] maps fetched:', { userId, count: data?.length, data, error })
      if (error) console.error('[exploration] erreur maps :', error)
      setMaps(data ?? [])
    }
    loadMaps()
  }, [userId])

  useEffect(() => {
    if (!scenarioId || !userId) return
    loadExploration()
    loadContext()
    const channel = supabase
      .channel(`exploration:${scenarioId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'explorations',
          filter: `scenario_id=eq.${scenarioId}`
        },
        () => {
          loadExploration()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, userId])

  const loadExploration = async () => {
    const { data } = await supabase
      .from('explorations')
      .select('*')
      .eq('scenario_id', scenarioId)
      .maybeSingle()
    if (data) {
      setExploration(data as ExplorationRow)
    } else if (isMJ) {
      const { data: inserted } = await supabase
        .from('explorations')
        .insert({ scenario_id: scenarioId })
        .select()
        .single()
      if (inserted) setExploration(inserted as ExplorationRow)
    } else {
      setExploration(null)
    }
  }

  const loadContext = async () => {
    const [{ data: it }, { data: en }, { data: pj }] = await Promise.all([
      supabase
        .from('items')
        .select('id, nom, image_url')
        .eq('scenario_id', scenarioId),
      supabase
        .from('ennemis')
        .select('id, nom, image_url')
        .eq('scenario_id', scenarioId),
      supabase
        .from('personnages')
        .select('id, nom, image_url')
        .eq('scenario_id', scenarioId)
    ])
    setItems(it ?? [])
    setEnnemis(en ?? [])
    setPersonnages(pj ?? [])
  }

  const saveExploration = async (patch: Partial<ExplorationRow>) => {
    if (!exploration || !isMJ) return
    const { error } = await supabase
      .from('explorations')
      .update(patch)
      .eq('id', exploration.id)
    if (error) console.error('[exploration] save échec :', error)
  }

  const updateLocal = (patch: Partial<ExplorationRow>) => {
    setExploration((prev) => {
      const next = prev ? { ...prev, ...patch } : prev
      explorationRef.current = next
      return next
    })
  }

  useEffect(() => {
    explorationRef.current = exploration
  }, [exploration])

  const startMarkerDrag = (
    kind: 'positions_pj' | 'items_caches' | 'ennemis_caches',
    key: string,
    clientX: number,
    clientY: number,
    element: HTMLElement,
    pointerId: number
  ) => {
    console.log('[marker-drag] start', { kind, key, isMJ, hasExploration: !!explorationRef.current })
    if (!isMJ) return
    const cur = explorationRef.current
    if (!cur) return
    const placed = (cur[kind] as Placed[]).find((p) => p.key === key)
    if (!placed) {
      console.warn('[marker-drag] placed not found', key)
      return
    }
    const wrap = wrapperRef.current
    if (!wrap) return
    const wr = wrap.getBoundingClientRect()
    const wx = (clientX - wr.left) / viewRef.current.scale
    const wy = (clientY - wr.top) / viewRef.current.scale
    try {
      element.setPointerCapture(pointerId)
    } catch (err) {
      console.warn('[marker-drag] setPointerCapture échec :', err)
    }
    markerDragRef.current = {
      kind,
      key,
      offsetX: wx - placed.x,
      offsetY: wy - placed.y,
      moved: false,
      pointerId,
      element
    }
    console.log('[marker-drag] ref set', markerDragRef.current)
  }

  const advanceMarkerDrag = (clientX: number, clientY: number) => {
    const mDrag = markerDragRef.current
    if (!mDrag) return false
    const wrap = wrapperRef.current
    if (!wrap) return false
    const wr = wrap.getBoundingClientRect()
    const wx = (clientX - wr.left) / viewRef.current.scale
    const wy = (clientY - wr.top) / viewRef.current.scale
    const nx = Math.round(wx - mDrag.offsetX)
    const ny = Math.round(wy - mDrag.offsetY)
    mDrag.moved = true
    setExploration((prev) => {
      if (!prev) return prev
      const arr = (prev[mDrag.kind] as Placed[]).map((p) =>
        p.key === mDrag.key ? { ...p, x: nx, y: ny } : p
      )
      const next = { ...prev, [mDrag.kind]: arr }
      explorationRef.current = next
      return next
    })
    return true
  }

  const endMarkerDrag = async () => {
    const mDrag = markerDragRef.current
    if (!mDrag) return false
    markerDragRef.current = null
    try {
      mDrag.element.releasePointerCapture(mDrag.pointerId)
    } catch {}
    if (mDrag.moved && explorationRef.current) {
      const arr = explorationRef.current[mDrag.kind] as Placed[]
      console.log('[marker-drag] save', mDrag.kind, arr.find((p) => p.key === mDrag.key))
      await saveExploration({ [mDrag.kind]: arr } as Partial<ExplorationRow>)
    }
    return true
  }

  // ----- Fog render -----
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !exploration || imgSize.w === 0) return
    canvas.width = imgSize.w
    canvas.height = imgSize.h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = isMJ ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,1)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'destination-out'
    for (const c of exploration.revealed_areas ?? []) {
      ctx.beginPath()
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }, [exploration, imgSize, isMJ])

  // ----- Canvas coords -----
  const getCoords = (e: ReactPointerEvent<HTMLDivElement>) => {
    const wrap = wrapperRef.current
    if (!wrap || imgSize.w === 0) return null
    const rect = wrap.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * imgSize.w
    const y = ((e.clientY - rect.top) / rect.height) * imgSize.h
    return { x, y }
  }

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button === 2) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      const outer = outerRef.current
      if (!outer) return
      const r = outer.getBoundingClientRect()
      pinchRef.current = {
        startDist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1,
        startScale: viewRef.current.scale,
        startViewX: viewRef.current.x,
        startViewY: viewRef.current.y,
        cx: (pts[0].x + pts[1].x) / 2 - r.left,
        cy: (pts[0].y + pts[1].y) / 2 - r.top
      }
      panRef.current = null
      paintingRef.current = false
      return
    }

    if (isMJ) {
      const coords = getCoords(e)
      if (coords) {
        if (mode === 'brush' || mode === 'erase') {
          paintingRef.current = true
          applyBrush(coords.x, coords.y)
          return
        }
        if (mode === 'place_item' || mode === 'place_ennemi' || mode === 'place_pj') {
          placeElement(coords.x, coords.y)
          return
        }
      }
    }

    // Default: pan
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      viewX: viewRef.current.x,
      viewY: viewRef.current.y
    }
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    const lp = longPressRef.current
    if (lp) {
      if (Math.hypot(e.clientX - lp.startX, e.clientY - lp.startY) > 8) {
        clearLongPress()
      }
    }

    // Drag d'un marker placé
    if (advanceMarkerDrag(e.clientX, e.clientY)) return

    // Pinch
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

    // Brush
    if (isMJ && paintingRef.current) {
      const coords = getCoords(e)
      if (!coords) return
      applyBrush(coords.x, coords.y)
      return
    }

    // Pan
    const pan = panRef.current
    if (pan) {
      setView((v) => ({
        ...v,
        x: pan.viewX + (e.clientX - pan.startX),
        y: pan.viewY + (e.clientY - pan.startY)
      }))
    }
  }

  const handlePointerUp = async (e: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) panRef.current = null
    clearLongPress()

    if (await endMarkerDrag()) return

    if (paintingRef.current) {
      paintingRef.current = false
      if (exploration) saveExploration({ revealed_areas: exploration.revealed_areas })
    }
  }

  const applyBrush = (x: number, y: number) => {
    if (!exploration) return
    const r = (brushSize / 2) / viewRef.current.scale
    if (mode === 'brush') {
      const next = [...(exploration.revealed_areas ?? []), { x, y, r }]
      updateLocal({ revealed_areas: next })
    } else if (mode === 'erase') {
      const next = (exploration.revealed_areas ?? []).filter(
        (c) => Math.hypot(c.x - x, c.y - y) > c.r + r
      )
      updateLocal({ revealed_areas: next })
    }
  }

  const placeElement = async (x: number, y: number) => {
    if (!exploration || !selectedRefId) return
    const placed: Placed = {
      key: crypto.randomUUID(),
      ref_id: selectedRefId,
      x: Math.round(x),
      y: Math.round(y)
    }
    const next = [...getArray(), placed]
    const patch = patchKey(next)
    updateLocal(patch)
    await saveExploration(patch)
  }

  const getArray = (): Placed[] => {
    if (!exploration) return []
    if (mode === 'place_item') return exploration.items_caches ?? []
    if (mode === 'place_ennemi') return exploration.ennemis_caches ?? []
    if (mode === 'place_pj') return exploration.positions_pj ?? []
    return []
  }

  const patchKey = (arr: Placed[]): Partial<ExplorationRow> => {
    if (mode === 'place_item') return { items_caches: arr }
    if (mode === 'place_ennemi') return { ennemis_caches: arr }
    if (mode === 'place_pj') return { positions_pj: arr }
    return {}
  }

  const removePlaced = async (kind: 'items_caches' | 'ennemis_caches' | 'positions_pj', key: string) => {
    if (!exploration || !isMJ) return
    const arr = (exploration[kind] as Placed[]).filter((p) => p.key !== key)
    const patch = { [kind]: arr } as Partial<ExplorationRow>
    updateLocal(patch)
    await saveExploration(patch)
  }

  const isRevealed = (x: number, y: number): boolean => {
    if (!exploration) return false
    for (const c of exploration.revealed_areas ?? []) {
      if (Math.hypot(c.x - x, c.y - y) <= c.r) return true
    }
    return false
  }

  const setMap = async (url: string) => {
    console.log('[exploration] setMap:', { url, isMJ, explorationId: exploration?.id })
    if (!isMJ) return
    updateLocal({ map_image_url: url })
    setImgSize({ w: 0, h: 0 })
    const { error } = await supabase
      .from('explorations')
      .update({ map_image_url: url })
      .eq('scenario_id', scenarioId)
    if (error) console.error('[exploration] setMap save échec :', error)
    else console.log('[exploration] map sauvegardée pour scenario', scenarioId)
  }

  const onUploadMap = async (file: File) => {
    if (!file || !isMJ) return
    setLoading(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `${userId}/${scenarioId}-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('maps')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) {
        alert(error.message)
        return
      }
      const { data } = supabase.storage.from('maps').getPublicUrl(path)
      await setMap(data.publicUrl)
    } finally {
      setLoading(false)
    }
  }

  const resetFog = async () => {
    if (!isMJ || !exploration) return
    if (!confirm('Tout recouvrir de brouillard ?')) return
    updateLocal({ revealed_areas: [] })
    await saveExploration({ revealed_areas: [] })
  }

  const labelFor = (refId: string) => {
    return (
      items.find((i) => i.id === refId)?.nom ||
      ennemis.find((e) => e.id === refId)?.nom ||
      personnages.find((p) => p.id === refId)?.nom ||
      ''
    )
  }
  const imageFor = (refId: string) => {
    return (
      items.find((i) => i.id === refId)?.image_url ||
      ennemis.find((e) => e.id === refId)?.image_url ||
      personnages.find((p) => p.id === refId)?.image_url ||
      null
    )
  }

  const currentPicker =
    mode === 'place_item' ? items : mode === 'place_ennemi' ? ennemis : mode === 'place_pj' ? personnages : []

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white"
          >
            ← Retour
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">🗺️ Exploration</h1>
        </div>

        <div className="grid md:grid-cols-[300px_1fr] gap-4">
          <aside className="space-y-3">
            <div className="bg-gray-800 rounded-lg p-3 space-y-2">
              <label className="text-gray-400 text-xs">Scénario</label>
              <select
                value={scenarioId}
                onChange={(e) => setScenarioId(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 text-sm"
              >
                {scenarios.length === 0 ? (
                  <option value="">— Aucun —</option>
                ) : (
                  scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom} {s.mj_id === userId ? '(MJ)' : '(Joueur)'}
                    </option>
                  ))
                )}
              </select>
            </div>

            {isMJ && (
              <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                <label className="text-gray-400 text-xs">Carte</label>
                <select
                  value={exploration?.map_image_url ?? ''}
                  onChange={(e) => setMap(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {maps.map((m) => (
                    <option key={m.id} value={m.image_url}>
                      {m.nom}
                    </option>
                  ))}
                </select>
                <label className="block">
                  <span className="sr-only">Uploader une carte</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={loading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) onUploadMap(f)
                      e.target.value = ''
                    }}
                    className="w-full text-xs text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-yellow-500 file:text-gray-900 file:font-bold"
                  />
                </label>
              </div>
            )}

            {isMJ && exploration?.map_image_url && (
              <>
                <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                  <div className="text-gray-400 text-xs font-bold">Brouillard</div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setMode(mode === 'brush' ? 'off' : 'brush')}
                      className={`p-2 rounded text-xs font-bold ${
                        mode === 'brush' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      🖌️ Révéler
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode(mode === 'erase' ? 'off' : 'erase')}
                      className={`p-2 rounded text-xs font-bold ${
                        mode === 'erase' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      🌫️ Cacher
                    </button>
                    <button
                      type="button"
                      onClick={resetFog}
                      className="p-2 rounded text-xs font-bold bg-gray-700 text-gray-200 hover:bg-red-700"
                    >
                      ↺ Reset
                    </button>
                  </div>
                  <label className="text-gray-400 text-xs">
                    Taille : <span className="text-yellow-500 font-bold">{brushSize}px</span>
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={200}
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full accent-yellow-500"
                  />
                </div>

                <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                  <div className="text-gray-400 text-xs font-bold">Placer</div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'place_item' ? 'off' : 'place_item')
                        setSelectedRefId('')
                      }}
                      className={`p-2 rounded text-xs font-bold ${
                        mode === 'place_item' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      💎 Item
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'place_ennemi' ? 'off' : 'place_ennemi')
                        setSelectedRefId('')
                      }}
                      className={`p-2 rounded text-xs font-bold ${
                        mode === 'place_ennemi' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      👹 Ennemi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'place_pj' ? 'off' : 'place_pj')
                        setSelectedRefId('')
                      }}
                      className={`p-2 rounded text-xs font-bold ${
                        mode === 'place_pj' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      🧙 PJ
                    </button>
                  </div>
                  {(mode === 'place_item' || mode === 'place_ennemi' || mode === 'place_pj') && (
                    <>
                      <select
                        value={selectedRefId}
                        onChange={(e) => setSelectedRefId(e.target.value)}
                        className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 text-xs"
                      >
                        <option value="">— Choisir —</option>
                        {currentPicker.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nom}
                          </option>
                        ))}
                      </select>
                      <p className="text-yellow-400 text-[11px]">
                        {selectedRefId
                          ? 'Clique sur la carte pour placer.'
                          : 'Sélectionne un élément.'}
                      </p>
                    </>
                  )}
                </div>

                <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                  <label className="flex items-center gap-2 text-gray-200 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHidden}
                      onChange={(e) => setShowHidden(e.target.checked)}
                      className="accent-yellow-500"
                    />
                    Afficher éléments cachés
                  </label>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="w-full p-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-sm"
                  >
                    ⚔️ Lancer Combat
                  </button>
                </div>
              </>
            )}

            {!isMJ && (
              <div className="bg-gray-800 rounded-lg p-3 text-gray-400 text-xs">
                Vue joueur — le brouillard se dissipe en temps réel au fur et à mesure que le MJ
                révèle la carte.
              </div>
            )}
          </aside>

          <div
            ref={outerRef}
            data-outer-wrap
            className="relative bg-gray-800 rounded-lg overflow-hidden"
            style={{ height: 'calc(100vh - 200px)', minHeight: 400, touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {!exploration?.map_image_url ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                {isMJ ? 'Choisis une carte pour commencer.' : 'Le MJ n\'a pas encore chargé de carte.'}
              </div>
            ) : (
              <div
                ref={wrapperRef}
                data-canvas-wrap
                className="absolute top-0 left-0 select-none"
                style={{
                  width: imgSize.w || 800,
                  height: imgSize.h || 600,
                  transformOrigin: '0 0',
                  transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                  cursor:
                    mode === 'brush' || mode === 'erase'
                      ? 'crosshair'
                      : mode.startsWith('place_')
                      ? 'pointer'
                      : 'grab'
                }}
              >
                <img
                  src={exploration.map_image_url}
                  alt="Carte"
                  className="block pointer-events-none"
                  style={{ width: '100%', height: '100%' }}
                  onLoad={(e) => {
                    const img = e.currentTarget
                    setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%' }}
                />

              </div>
            )}

            {/* Markers hors du transform layer : position/taille calculées manuellement */}
            {exploration?.map_image_url && (exploration.positions_pj ?? []).map((p) => {
              const visible = isMJ ? showHidden || isRevealed(p.x, p.y) : isRevealed(p.x, p.y)
              if (!visible) return null
              return (
                <PlacedMarker
                  key={p.key}
                  type="pj"
                  x={p.x}
                  y={p.y}
                  viewX={view.x}
                  viewY={view.y}
                  viewScale={view.scale}
                  label={labelFor(p.ref_id)}
                  image={imageFor(p.ref_id)}
                  interactive={isMJ}
                  onDragStart={
                    isMJ
                      ? (clientX, clientY, el, pointerId) =>
                          startMarkerDrag('positions_pj', p.key, clientX, clientY, el, pointerId)
                      : undefined
                  }
                  onDragMove={isMJ ? (cx, cy) => advanceMarkerDrag(cx, cy) : undefined}
                  onDragEnd={isMJ ? () => { void endMarkerDrag() } : undefined}
                  onRequestMenu={
                    isMJ
                      ? (cx, cy) =>
                          setContextMenu({ x: cx, y: cy, kind: 'positions_pj', key: p.key })
                      : undefined
                  }
                  onLongPressStart={
                    isMJ
                      ? (cx, cy, startX, startY) => {
                          clearLongPress()
                          const timer = setTimeout(() => {
                            setContextMenu({ x: cx, y: cy, kind: 'positions_pj', key: p.key })
                            longPressRef.current = null
                            markerDragRef.current = null
                            if (navigator.vibrate) navigator.vibrate(30)
                          }, 500)
                          longPressRef.current = { timer, startX, startY }
                        }
                      : undefined
                  }
                />
              )
            })}

            {exploration?.map_image_url && isMJ && showHidden &&
              (exploration.items_caches ?? []).map((p) => (
                <PlacedMarker
                  key={p.key}
                  type="item"
                  x={p.x}
                  y={p.y}
                  viewX={view.x}
                  viewY={view.y}
                  viewScale={view.scale}
                  label={labelFor(p.ref_id)}
                  image={imageFor(p.ref_id)}
                  interactive
                  onDragStart={(clientX, clientY, el, pointerId) =>
                    startMarkerDrag('items_caches', p.key, clientX, clientY, el, pointerId)
                  }
                  onDragMove={(cx, cy) => advanceMarkerDrag(cx, cy)}
                  onDragEnd={() => { void endMarkerDrag() }}
                  onRequestMenu={(cx, cy) =>
                    setContextMenu({ x: cx, y: cy, kind: 'items_caches', key: p.key })
                  }
                  onLongPressStart={(cx, cy, startX, startY) => {
                    clearLongPress()
                    const timer = setTimeout(() => {
                      setContextMenu({ x: cx, y: cy, kind: 'items_caches', key: p.key })
                      longPressRef.current = null
                      markerDragRef.current = null
                      if (navigator.vibrate) navigator.vibrate(30)
                    }, 500)
                    longPressRef.current = { timer, startX, startY }
                  }}
                />
              ))}

            {exploration?.map_image_url && isMJ && showHidden &&
              (exploration.ennemis_caches ?? []).map((p) => (
                <PlacedMarker
                  key={p.key}
                  type="ennemi"
                  x={p.x}
                  y={p.y}
                  viewX={view.x}
                  viewY={view.y}
                  viewScale={view.scale}
                  label={labelFor(p.ref_id)}
                  image={imageFor(p.ref_id)}
                  interactive
                  onDragStart={(clientX, clientY, el, pointerId) =>
                    startMarkerDrag('ennemis_caches', p.key, clientX, clientY, el, pointerId)
                  }
                  onDragMove={(cx, cy) => advanceMarkerDrag(cx, cy)}
                  onDragEnd={() => { void endMarkerDrag() }}
                  onRequestMenu={(cx, cy) =>
                    setContextMenu({ x: cx, y: cy, kind: 'ennemis_caches', key: p.key })
                  }
                  onLongPressStart={(cx, cy, startX, startY) => {
                    clearLongPress()
                    const timer = setTimeout(() => {
                      setContextMenu({ x: cx, y: cy, kind: 'ennemis_caches', key: p.key })
                      longPressRef.current = null
                      markerDragRef.current = null
                      if (navigator.vibrate) navigator.vibrate(30)
                    }, 500)
                    longPressRef.current = { timer, startX, startY }
                  }}
                />
              ))}

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
                    left: Math.min(contextMenu.x, (outerRef.current?.clientWidth ?? 0) - 190),
                    top: Math.min(contextMenu.y, (outerRef.current?.clientHeight ?? 0) - 50)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      removePlaced(contextMenu.kind, contextMenu.key)
                      setContextMenu(null)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2"
                  >
                    🗑️ Retirer de la carte
                  </button>
                </div>
              </>
            )}

            {exploration?.map_image_url && (
              <div
                className="absolute bottom-3 right-3 flex items-center gap-1 bg-gray-800/95 border border-gray-700 rounded-full px-2 py-1 shadow-lg z-50"
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
                    fitView()
                  }}
                  className="px-2 text-xs text-yellow-500 font-mono hover:text-yellow-400"
                  title="Centrer"
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
                    fitView()
                  }}
                  className="w-7 h-7 rounded-full text-gray-200 hover:bg-gray-700"
                  title="Ajuster à l'écran"
                >
                  ⌖
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

const MARKER_STYLE: Record<
  'pj' | 'ennemi' | 'item',
  { border: string; bg: string; fallback: string; dashed: boolean }
> = {
  pj: { border: '#3b82f6', bg: '#1e3a8a', fallback: 'INITIALS', dashed: false },
  ennemi: { border: '#dc2626', bg: '#7f1d1d', fallback: 'INITIALS', dashed: true },
  item: { border: '#eab308', bg: '#854d0e', fallback: '🎒', dashed: true }
}

const BASE_MARKER_SIZE = 44

function PlacedMarker({
  type,
  x,
  y,
  viewX,
  viewY,
  viewScale,
  label,
  image,
  interactive,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRequestMenu,
  onLongPressStart
}: {
  type: 'pj' | 'ennemi' | 'item'
  x: number
  y: number
  viewX: number
  viewY: number
  viewScale: number
  label: string
  image: string | null
  interactive: boolean
  onDragStart?: (clientX: number, clientY: number, element: HTMLElement, pointerId: number) => void
  onDragMove?: (clientX: number, clientY: number) => void
  onDragEnd?: () => void
  onRequestMenu?: (x: number, y: number) => void
  onLongPressStart?: (x: number, y: number, startX: number, startY: number) => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const style = MARKER_STYLE[type]
  const showImage = !!image && !imgFailed
  const initials = (label || '??').slice(0, 2).toUpperCase()

  const screenX = viewX + x * viewScale
  const screenY = viewY + y * viewScale
  const rawSize = BASE_MARKER_SIZE / viewScale
  const size = Math.min(80, Math.max(20, rawSize))
  const scaleRatio = size / BASE_MARKER_SIZE
  const borderPx = Math.max(1, 3 * scaleRatio)
  const fontPx = 12 * scaleRatio
  const iconPx = 18 * scaleRatio
  const labelPx = 10 * scaleRatio

  console.log('[marker] render avec viewScale:', viewScale, 'size:', size)

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: screenX,
        top: screenY,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        zIndex: 20
      }}
    >
      <div
        onContextMenu={(e) => {
          if (!interactive || !onRequestMenu) return
          e.preventDefault()
          e.stopPropagation()
          const wrap = (e.currentTarget.closest('[data-outer-wrap]') as HTMLElement) || null
          const r = wrap?.getBoundingClientRect()
          const cx = r ? e.clientX - r.left : e.clientX
          const cy = r ? e.clientY - r.top : e.clientY
          onRequestMenu(cx, cy)
        }}
        onPointerDown={(e) => {
          if (!interactive) return
          e.stopPropagation()
          if (e.button === 2) return
          if (onDragStart) {
            onDragStart(e.clientX, e.clientY, e.currentTarget as HTMLElement, e.pointerId)
          }
          if (e.pointerType === 'touch' && onLongPressStart) {
            const wrap = (e.currentTarget.closest('[data-outer-wrap]') as HTMLElement) || null
            const r = wrap?.getBoundingClientRect()
            const cx = r ? e.clientX - r.left : e.clientX
            const cy = r ? e.clientY - r.top : e.clientY
            onLongPressStart(cx, cy, e.clientX, e.clientY)
          }
        }}
        onPointerMove={(e) => {
          if (!interactive) return
          if (onDragMove) {
            e.stopPropagation()
            onDragMove(e.clientX, e.clientY)
          }
        }}
        onPointerUp={(e) => {
          if (!interactive) return
          if (onDragEnd) {
            e.stopPropagation()
            onDragEnd()
          }
        }}
        onPointerCancel={(e) => {
          if (!interactive) return
          if (onDragEnd) {
            e.stopPropagation()
            onDragEnd()
          }
        }}
        className="relative rounded-full overflow-hidden shadow-lg pointer-events-auto"
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          border: `${borderPx}px ${style.dashed ? 'dashed' : 'solid'} ${style.border}`,
          backgroundColor: style.bg,
          cursor: interactive ? 'grab' : 'default',
          touchAction: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title={label}
      >
        {showImage ? (
          <img
            src={image!}
            alt={label}
            draggable={false}
            onError={() => setImgFailed(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          />
        ) : style.fallback === 'INITIALS' ? (
          <span className="text-white font-bold" style={{ fontSize: fontPx, lineHeight: 1 }}>
            {initials}
          </span>
        ) : (
          <span style={{ fontSize: iconPx, lineHeight: 1 }}>{style.fallback}</span>
        )}
      </div>
      {label && (
        <div
          className="absolute left-1/2 -translate-x-1/2 font-bold text-white px-1 py-0.5 rounded bg-black/70 whitespace-nowrap truncate pointer-events-none"
          style={{
            bottom: -size / 2 - labelPx - 4,
            fontSize: labelPx,
            maxWidth: 120 * viewScale
          }}
          title={label}
        >
          {label}
        </div>
      )}
    </div>
  )
}
