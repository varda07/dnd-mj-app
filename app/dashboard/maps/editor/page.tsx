'use client'

export const dynamic = 'force-dynamic'

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NumberInput from '@/app/components/NumberInput'
import { AtelierPanelContent } from '../builder/page'
import { DungeonGeneratorContent } from '../generer-donjon/page'

// ============================================================================
// Tile editor — Eclipsed Forge style
// Création de cartes par tuiles avec génération aléatoire et export PNG.
// ============================================================================

type LayerKey = 'terrain' | 'decor' | 'creatures' | 'fog'
type ToolKey = 'brush' | 'fill' | 'erase' | 'rect'

type TileDef = {
  key: string
  label: string
  emoji?: string
  color?: string // couleur de fond pour le terrain
  layer: LayerKey
}

// Palette : la clé de la tuile reste stable (utilisée dans la grille). Les
// terrains n'ont pas d'emoji, juste une couleur ; les décors/créatures sont
// des emojis posés au centre de la cellule par-dessus le terrain.
const TILES: TileDef[] = [
  // TERRAIN
  { key: 'grass', label: 'Herbe', color: '#4a7c4e', layer: 'terrain' },
  { key: 'stone', label: 'Pierre', color: '#5a5a64', layer: 'terrain' },
  { key: 'water', label: 'Eau', color: '#2c6cb5', layer: 'terrain' },
  { key: 'sand', label: 'Sable', color: '#d8b56b', layer: 'terrain' },
  { key: 'wall', label: 'Mur', color: '#1f1f24', layer: 'terrain' },
  { key: 'dirt', label: 'Terre', color: '#7a5a3a', layer: 'terrain' },
  { key: 'wood', label: 'Bois', color: '#8a5a30', layer: 'terrain' },
  { key: 'lava', label: 'Lave', color: '#d24025', layer: 'terrain' },
  { key: 'snow', label: 'Neige', color: '#e5edf2', layer: 'terrain' },

  // OBJETS
  { key: 'tree', label: 'Arbre', emoji: '🌲', layer: 'decor' },
  { key: 'rock', label: 'Rocher', emoji: '🪨', layer: 'decor' },
  { key: 'chest', label: 'Coffre', emoji: '📦', layer: 'decor' },
  { key: 'door', label: 'Porte', emoji: '🚪', layer: 'decor' },
  { key: 'stairs', label: 'Escaliers', emoji: '🪜', layer: 'decor' },
  { key: 'torch', label: 'Torche', emoji: '🔥', layer: 'decor' },
  { key: 'mushroom', label: 'Champignon', emoji: '🍄', layer: 'decor' },
  { key: 'flower', label: 'Fleur', emoji: '🌸', layer: 'decor' },

  // CRÉATURES
  { key: 'goblin', label: 'Gobelin', emoji: '👹', layer: 'creatures' },
  { key: 'wolf', label: 'Loup', emoji: '🐺', layer: 'creatures' },
  { key: 'dragon', label: 'Dragon', emoji: '🐉', layer: 'creatures' },
  { key: 'skeleton', label: 'Squelette', emoji: '💀', layer: 'creatures' },
  { key: 'spider', label: 'Araignée', emoji: '🕷️', layer: 'creatures' },
  { key: 'ghost', label: 'Fantôme', emoji: '👻', layer: 'creatures' },
  { key: 'knight', label: 'Chevalier', emoji: '🛡️', layer: 'creatures' },
  { key: 'wizard', label: 'Mage', emoji: '🧙', layer: 'creatures' }
]

const TILE_INDEX: Record<string, TileDef> = Object.fromEntries(
  TILES.map((t) => [t.key, t])
)

const LAYERS: { key: LayerKey; label: string; defaultVisible: boolean }[] = [
  { key: 'terrain', label: 'Terrain', defaultVisible: true },
  { key: 'decor', label: 'Décors', defaultVisible: true },
  { key: 'creatures', label: 'Créatures', defaultVisible: true },
  { key: 'fog', label: 'Brouillard', defaultVisible: false }
]

const SECTIONS: { title: string; layer: LayerKey }[] = [
  { title: 'Terrain', layer: 'terrain' },
  { title: 'Objets', layer: 'decor' },
  { title: 'Créatures', layer: 'creatures' }
]

const CELL_PX = 32 // taille d'affichage à l'écran
const EXPORT_PX = 48 // taille d'export pour un meilleur rendu PNG

// Map = layers × rows × cols, chaque case = clé de tuile ou null.
type MapData = Record<LayerKey, (string | null)[][]>

const emptyMap = (cols: number, rows: number): MapData => {
  const make = () =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => null as string | null)
    )
  return { terrain: make(), decor: make(), creatures: make(), fog: make() }
}

// Remplit le terrain avec une tuile par défaut (utilisé par les générateurs).
const fillTerrain = (
  data: MapData,
  cols: number,
  rows: number,
  tile: string
) => {
  data.terrain = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => tile)
  )
}

// ----------------------------------------------------------------------------
// Générateurs aléatoires
// ----------------------------------------------------------------------------

const rand = (n: number) => Math.floor(Math.random() * n)

const genererDonjon = (cols: number, rows: number): MapData => {
  const data = emptyMap(cols, rows)
  // Tout en mur d'abord
  fillTerrain(data, cols, rows, 'wall')
  const rooms: { x: number; y: number; w: number; h: number }[] = []
  const tries = 20
  for (let i = 0; i < tries; i++) {
    const w = 4 + rand(5)
    const h = 3 + rand(4)
    const x = 1 + rand(cols - w - 2)
    const y = 1 + rand(rows - h - 2)
    rooms.push({ x, y, w, h })
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        data.terrain[y + dy][x + dx] = 'stone'
      }
    }
    // 20% chance de poser une mare ou de la lave dans la salle
    if (Math.random() < 0.2) {
      const liquide = Math.random() < 0.5 ? 'water' : 'lava'
      const lx = x + 1 + rand(Math.max(1, w - 2))
      const ly = y + 1 + rand(Math.max(1, h - 2))
      data.terrain[ly][lx] = liquide
    }
  }
  // Couloirs : relie chaque salle à la suivante en L
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1]
    const b = rooms[i]
    const ax = a.x + Math.floor(a.w / 2)
    const ay = a.y + Math.floor(a.h / 2)
    const bx = b.x + Math.floor(b.w / 2)
    const by = b.y + Math.floor(b.h / 2)
    const x1 = Math.min(ax, bx)
    const x2 = Math.max(ax, bx)
    for (let x = x1; x <= x2; x++) data.terrain[ay][x] = 'stone'
    const y1 = Math.min(ay, by)
    const y2 = Math.max(ay, by)
    for (let y = y1; y <= y2; y++) data.terrain[y][bx] = 'stone'
  }
  // Quelques décors épars dans les salles
  rooms.forEach((r) => {
    if (Math.random() < 0.5) {
      const cx = r.x + 1 + rand(Math.max(1, r.w - 2))
      const cy = r.y + 1 + rand(Math.max(1, r.h - 2))
      data.decor[cy][cx] = Math.random() < 0.5 ? 'chest' : 'torch'
    }
  })
  return data
}

const genererForet = (cols: number, rows: number): MapData => {
  const data = emptyMap(cols, rows)
  fillTerrain(data, cols, rows, 'grass')
  // Chemins de terre
  let cx = rand(cols)
  let cy = rand(rows)
  for (let i = 0; i < cols + rows; i++) {
    if (cy >= 0 && cy < rows && cx >= 0 && cx < cols) {
      data.terrain[cy][cx] = 'dirt'
    }
    if (Math.random() < 0.5) cx += Math.random() < 0.5 ? 1 : -1
    else cy += Math.random() < 0.5 ? 1 : -1
  }
  // Arbres aléatoires (~25%)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (data.terrain[y][x] === 'grass' && Math.random() < 0.22) {
        data.decor[y][x] = 'tree'
      } else if (data.terrain[y][x] === 'grass' && Math.random() < 0.04) {
        data.decor[y][x] = Math.random() < 0.5 ? 'mushroom' : 'flower'
      }
    }
  }
  return data
}

const genererVillage = (cols: number, rows: number): MapData => {
  const data = emptyMap(cols, rows)
  fillTerrain(data, cols, rows, 'grass')
  // Place centrale
  const px = Math.floor(cols / 2) - 1
  const py = Math.floor(rows / 2) - 1
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = px + dx
      const ny = py + dy
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        data.terrain[ny][nx] = 'dirt'
      }
    }
  }
  // Bâtiments en bois (3-5 maisons)
  const nbMaisons = 3 + rand(3)
  for (let i = 0; i < nbMaisons; i++) {
    const w = 3 + rand(2)
    const h = 3 + rand(2)
    const x = 1 + rand(cols - w - 2)
    const y = 1 + rand(rows - h - 2)
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const isEdge =
          dx === 0 || dy === 0 || dx === w - 1 || dy === h - 1
        data.terrain[y + dy][x + dx] = isEdge ? 'wood' : 'stone'
      }
    }
    // Porte
    data.decor[y + h - 1][x + Math.floor(w / 2)] = 'door'
  }
  // Quelques arbres
  for (let i = 0; i < cols / 2; i++) {
    const x = rand(cols)
    const y = rand(rows)
    if (data.terrain[y][x] === 'grass' && !data.decor[y][x]) {
      data.decor[y][x] = 'tree'
    }
  }
  return data
}

const genererMontagne = (cols: number, rows: number): MapData => {
  const data = emptyMap(cols, rows)
  fillTerrain(data, cols, rows, 'stone')
  // Bandes de neige aléatoires (sommets)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const altitude = (rows - y) / rows + (Math.random() - 0.5) * 0.3
      if (altitude > 0.65) data.terrain[y][x] = 'snow'
      else if (altitude < 0.2 && Math.random() < 0.3) {
        data.terrain[y][x] = 'grass'
      }
    }
  }
  // Rochers épars
  for (let i = 0; i < (cols * rows) / 20; i++) {
    const x = rand(cols)
    const y = rand(rows)
    if (data.terrain[y][x] === 'stone' || data.terrain[y][x] === 'snow') {
      data.decor[y][x] = 'rock'
    }
  }
  return data
}

// ----------------------------------------------------------------------------
// Composant
// ----------------------------------------------------------------------------

const HISTORY_MAX = 30

// Contenu « Dessiner » (éditeur de tuiles), sans chrome de page → monté dans
// l'éditeur unifié (onglet par défaut) ou via le wrapper de route hérité.
export function TileEditorContent() {
  const router = useRouter()
  const [cols, setCols] = useState(20)
  const [rows, setRows] = useState(15)
  const [data, setData] = useState<MapData>(() => emptyMap(20, 15))
  const [tool, setTool] = useState<ToolKey>('brush')
  const [currentTile, setCurrentTile] = useState<string>('grass')
  const [layerVisibility, setLayerVisibility] = useState<Record<LayerKey, boolean>>(
    () =>
      LAYERS.reduce(
        (acc, l) => {
          acc[l.key] = l.defaultVisible
          return acc
        },
        {} as Record<LayerKey, boolean>
      )
  )
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null)
  const [history, setHistory] = useState<MapData[]>([])
  const [future, setFuture] = useState<MapData[]>([])
  const [exportOpen, setExportOpen] = useState(false)
  const [mapName, setMapName] = useState('')
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')

  const isPaintingRef = useRef(false)
  const dataRef = useRef(data)
  dataRef.current = data

  // Tuile sélectionnée détermine le calque ciblé.
  const currentTileDef = TILE_INDEX[currentTile]
  const targetLayer: LayerKey = currentTileDef?.layer ?? 'terrain'

  const cloneMap = (m: MapData): MapData => ({
    terrain: m.terrain.map((r) => [...r]),
    decor: m.decor.map((r) => [...r]),
    creatures: m.creatures.map((r) => [...r]),
    fog: m.fog.map((r) => [...r])
  })

  const pushHistory = useCallback((current: MapData) => {
    setHistory((h) => {
      const next = [...h, cloneMap(current)]
      if (next.length > HISTORY_MAX) next.shift()
      return next
    })
    setFuture([])
  }, [])

  const undo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setFuture((f) => [...f, cloneMap(dataRef.current)])
    setData(prev)
  }

  const redo = () => {
    if (future.length === 0) return
    const next = future[future.length - 1]
    setFuture((f) => f.slice(0, -1))
    setHistory((h) => [...h, cloneMap(dataRef.current)])
    setData(next)
  }

  // Redimensionnement : on conserve le contenu existant en débordement.
  const resizeMap = (newCols: number, newRows: number) => {
    if (newCols < 1 || newRows < 1) return
    pushHistory(dataRef.current)
    setData((prev) => {
      const next = emptyMap(newCols, newRows)
      ;(['terrain', 'decor', 'creatures', 'fog'] as LayerKey[]).forEach((L) => {
        for (let y = 0; y < Math.min(newRows, prev[L].length); y++) {
          for (let x = 0; x < Math.min(newCols, prev[L][y]?.length ?? 0); x++) {
            next[L][y][x] = prev[L][y][x]
          }
        }
      })
      return next
    })
    setCols(newCols)
    setRows(newRows)
  }

  // Application d'une action sur une cellule (selon l'outil courant).
  const applyTool = useCallback(
    (x: number, y: number, opts: { startStroke?: boolean } = {}) => {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return
      if (opts.startStroke) pushHistory(dataRef.current)

      setData((prev) => {
        const next = cloneMap(prev)
        if (tool === 'brush') {
          next[targetLayer][y][x] = currentTile
        } else if (tool === 'erase') {
          next.terrain[y][x] = null
          next.decor[y][x] = null
          next.creatures[y][x] = null
          next.fog[y][x] = null
        } else if (tool === 'fill') {
          const start = next[targetLayer][y][x]
          const stack: [number, number][] = [[x, y]]
          const seen = new Set<string>()
          while (stack.length) {
            const [cx, cy] = stack.pop()!
            const key = `${cx},${cy}`
            if (seen.has(key)) continue
            if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue
            if (next[targetLayer][cy][cx] !== start) continue
            seen.add(key)
            next[targetLayer][cy][cx] = currentTile
            stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
          }
        }
        return next
      })
    },
    [cols, rows, tool, targetLayer, currentTile, pushHistory]
  )

  const applyRectangle = (x1: number, y1: number, x2: number, y2: number) => {
    pushHistory(dataRef.current)
    const xa = Math.min(x1, x2)
    const xb = Math.max(x1, x2)
    const ya = Math.min(y1, y2)
    const yb = Math.max(y1, y2)
    setData((prev) => {
      const next = cloneMap(prev)
      for (let y = ya; y <= yb; y++) {
        for (let x = xa; x <= xb; x++) {
          if (x < 0 || y < 0 || x >= cols || y >= rows) continue
          next[targetLayer][y][x] = currentTile
        }
      }
      return next
    })
  }

  // -----------------------------------------------------------------------
  // Rendu canvas (à chaque changement de data ou de visibilité)
  // -----------------------------------------------------------------------

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawAt = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cell: number,
      visibility: Record<LayerKey, boolean>
    ) => {
      ctx.save()
      ctx.fillStyle = '#0a0b0d'
      ctx.fillRect(0, 0, cell * cols, cell * rows)
      // Terrain
      if (visibility.terrain) {
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const k = data.terrain[y][x]
            if (!k) continue
            const def = TILE_INDEX[k]
            if (def?.color) {
              ctx.fillStyle = def.color
              ctx.fillRect(x * cell, y * cell, cell, cell)
            }
          }
        }
      }
      // Grille fine
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'
      ctx.lineWidth = 1
      for (let i = 0; i <= cols; i++) {
        ctx.beginPath()
        ctx.moveTo(i * cell, 0)
        ctx.lineTo(i * cell, rows * cell)
        ctx.stroke()
      }
      for (let i = 0; i <= rows; i++) {
        ctx.beginPath()
        ctx.moveTo(0, i * cell)
        ctx.lineTo(cols * cell, i * cell)
        ctx.stroke()
      }
      // Décors + créatures (emojis)
      const drawEmojiLayer = (L: LayerKey) => {
        if (!visibility[L]) return
        ctx.font = `${Math.floor(cell * 0.7)}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const k = data[L][y][x]
            if (!k) continue
            const def = TILE_INDEX[k]
            if (def?.emoji) {
              ctx.fillText(def.emoji, x * cell + cell / 2, y * cell + cell / 2)
            }
          }
        }
      }
      drawEmojiLayer('decor')
      drawEmojiLayer('creatures')
      // Brouillard
      if (visibility.fog) {
        ctx.fillStyle = 'rgba(20,22,30,0.55)'
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (data.fog[y][x]) {
              ctx.fillRect(x * cell, y * cell, cell, cell)
            }
          }
        }
      }
      ctx.restore()
    },
    [cols, rows, data]
  )

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    c.width = cols * CELL_PX
    c.height = rows * CELL_PX
    const ctx = c.getContext('2d')
    if (!ctx) return
    drawAt(ctx, CELL_PX, layerVisibility)
    // Surimpression rectangle preview
    if (tool === 'rect' && rectStart && hoverCell) {
      const x1 = Math.min(rectStart.x, hoverCell.x)
      const y1 = Math.min(rectStart.y, hoverCell.y)
      const x2 = Math.max(rectStart.x, hoverCell.x)
      const y2 = Math.max(rectStart.y, hoverCell.y)
      ctx.save()
      ctx.strokeStyle = '#C9A84C'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.strokeRect(
        x1 * CELL_PX + 1,
        y1 * CELL_PX + 1,
        (x2 - x1 + 1) * CELL_PX - 2,
        (y2 - y1 + 1) * CELL_PX - 2
      )
      ctx.restore()
    }
    // Curseur de hover
    if (hoverCell && !rectStart) {
      ctx.save()
      ctx.strokeStyle = 'rgba(201,168,76,0.8)'
      ctx.lineWidth = 2
      ctx.strokeRect(
        hoverCell.x * CELL_PX + 1,
        hoverCell.y * CELL_PX + 1,
        CELL_PX - 2,
        CELL_PX - 2
      )
      ctx.restore()
    }
  }, [cols, rows, drawAt, layerVisibility, tool, rectStart, hoverCell])

  // -----------------------------------------------------------------------
  // Pointer events sur le canvas
  // -----------------------------------------------------------------------

  const cellFromPointer = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current
    if (!c) return null
    const rect = c.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const x = Math.floor((px / rect.width) * cols)
    const y = Math.floor((py / rect.height) * rows)
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null
    return { x, y }
  }

  const onCanvasPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button === 2) return
    e.preventDefault()
    const cell = cellFromPointer(e)
    if (!cell) return
    ;(e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId)
    if (tool === 'rect') {
      setRectStart(cell)
      return
    }
    isPaintingRef.current = true
    applyTool(cell.x, cell.y, { startStroke: true })
  }

  const onCanvasPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const cell = cellFromPointer(e)
    setHoverCell(cell)
    if (!cell) return
    if (tool === 'rect') return
    if (!isPaintingRef.current) return
    applyTool(cell.x, cell.y)
  }

  const onCanvasPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const cell = cellFromPointer(e)
    if (tool === 'rect' && rectStart && cell) {
      applyRectangle(rectStart.x, rectStart.y, cell.x, cell.y)
      setRectStart(null)
    }
    isPaintingRef.current = false
    try {
      ;(e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onCanvasPointerLeave = () => {
    setHoverCell(null)
  }

  // -----------------------------------------------------------------------
  // Générateurs : push history puis remplace data
  // -----------------------------------------------------------------------

  const lancerGenerateur = (kind: 'donjon' | 'foret' | 'village' | 'montagne') => {
    pushHistory(dataRef.current)
    let next: MapData
    if (kind === 'donjon') next = genererDonjon(cols, rows)
    else if (kind === 'foret') next = genererForet(cols, rows)
    else if (kind === 'village') next = genererVillage(cols, rows)
    else next = genererMontagne(cols, rows)
    setData(next)
  }

  // -----------------------------------------------------------------------
  // Export : rend dans un canvas hors écran à `EXPORT_PX` puis upload
  // -----------------------------------------------------------------------

  const ouvrirExport = () => {
    setMapName('')
    setMessage('')
    setExportOpen(true)
  }

  const exporterPNG = async () => {
    if (!mapName.trim()) {
      setMessage('Donne un nom à ta carte.')
      return
    }
    setExporting(true)
    try {
      const off = document.createElement('canvas')
      off.width = cols * EXPORT_PX
      off.height = rows * EXPORT_PX
      const ctx = off.getContext('2d')
      if (!ctx) throw new Error('Canvas indisponible')
      // Pour l'export on force la visibilité de toutes les couches (sauf
      // brouillard, qui resterait à la main de l'utilisateur).
      const exportVisibility: Record<LayerKey, boolean> = {
        terrain: true,
        decor: true,
        creatures: true,
        fog: layerVisibility.fog
      }
      drawAt(ctx, EXPORT_PX, exportVisibility)
      const blob: Blob | null = await new Promise((resolve) =>
        off.toBlob((b) => resolve(b), 'image/png')
      )
      if (!blob) throw new Error('Génération PNG échouée')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentification requise')

      const safeName = mapName.trim().replace(/[^a-z0-9-_]/gi, '-').toLowerCase()
      const path = `${user.id}/${Date.now()}-${safeName}.png`
      const { error: upErr } = await supabase.storage
        .from('MAP')
        .upload(path, blob, { contentType: 'image/png', upsert: false })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('MAP').getPublicUrl(path)
      const imageUrl = urlData.publicUrl

      const { error: insErr } = await supabase.from('maps').insert({
        nom: mapName.trim(),
        description: `Map créée avec l'éditeur (${cols}×${rows})`,
        image_url: imageUrl,
        mj_id: user.id
      })
      if (insErr) throw insErr

      setMessage('✓ Carte enregistrée !')
      setTimeout(() => router.push('/dashboard/maps'), 800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage(`Erreur : ${msg}`)
    } finally {
      setExporting(false)
    }
  }

  // -----------------------------------------------------------------------
  // Rendu UI
  // -----------------------------------------------------------------------

  return (
    <>
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_180px] gap-4">
          {/* === Palette gauche === */}
          <aside className="bg-[#12141a] border border-[rgba(201,168,76,0.18)] rounded-lg p-3 space-y-4 max-h-[80vh] overflow-y-auto">
            {SECTIONS.map((s) => (
              <div key={s.layer}>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]/80 mb-2">
                  {s.title}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {TILES.filter((t) => t.layer === s.layer).map((t) => {
                    const actif = currentTile === t.key
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setCurrentTile(t.key)}
                        title={t.label}
                        className={`aspect-square rounded border flex items-center justify-center text-xl transition ${
                          actif
                            ? 'border-[#C9A84C] ring-2 ring-[#C9A84C]/40'
                            : 'border-[rgba(201,168,76,0.15)] hover:border-[rgba(201,168,76,0.4)]'
                        }`}
                        style={{
                          backgroundColor: t.color ?? '#0a0b0d',
                          color: '#fff'
                        }}
                      >
                        {t.emoji ?? ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-[rgba(201,168,76,0.12)] text-[10px] text-gray-500">
              Sélection :{' '}
              <span className="text-[#C9A84C] font-bold">
                {currentTileDef?.label ?? '—'}
              </span>{' '}
              ({targetLayer})
            </div>
          </aside>

          {/* === Centre : toolbar + canvas === */}
          <section className="space-y-3 min-w-0">
            <div className="bg-[#12141a] border border-[rgba(201,168,76,0.18)] rounded-lg p-2 flex flex-wrap items-center gap-1">
              {[
                { key: 'brush' as const, icon: '🖌', label: 'Pinceau' },
                { key: 'fill' as const, icon: '🪣', label: 'Remplir' },
                { key: 'erase' as const, icon: '🧽', label: 'Effacer' },
                { key: 'rect' as const, icon: '📏', label: 'Rectangle' }
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTool(t.key)}
                  title={t.label}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                    tool === t.key
                      ? 'bg-[#C9A84C]/20 text-[#e6c878] border border-[#C9A84C]'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {t.icon} <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
              <span className="mx-1 h-5 w-px bg-[rgba(201,168,76,0.2)]" />
              <button
                type="button"
                onClick={undo}
                disabled={history.length === 0}
                className="px-3 py-1.5 rounded text-sm text-gray-300 hover:bg-white/5 disabled:opacity-40"
                title="Annuler"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={future.length === 0}
                className="px-3 py-1.5 rounded text-sm text-gray-300 hover:bg-white/5 disabled:opacity-40"
                title="Rétablir"
              >
                ↷
              </button>
              <span className="mx-1 h-5 w-px bg-[rgba(201,168,76,0.2)]" />
              <button
                type="button"
                onClick={() => {
                  pushHistory(dataRef.current)
                  setData(emptyMap(cols, rows))
                }}
                className="px-3 py-1.5 rounded text-sm text-gray-400 hover:text-red-300 hover:bg-red-500/10"
                title="Vider la grille"
              >
                🎲 <span className="hidden sm:inline">Vider</span>
              </button>
              <span className="ml-auto" />
              <button
                type="button"
                onClick={ouvrirExport}
                className="px-3 py-1.5 rounded text-sm font-bold bg-[#C9A84C]/15 text-[#e6c878] border border-[#C9A84C] hover:bg-[#C9A84C]/25"
              >
                💾 Export
              </button>
            </div>

            <div className="bg-[#12141a] border border-[rgba(201,168,76,0.18)] rounded-lg p-3 overflow-auto">
              <canvas
                ref={canvasRef}
                onPointerDown={onCanvasPointerDown}
                onPointerMove={onCanvasPointerMove}
                onPointerUp={onCanvasPointerUp}
                onPointerCancel={onCanvasPointerUp}
                onPointerLeave={onCanvasPointerLeave}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  imageRendering: 'pixelated',
                  touchAction: 'none',
                  display: 'block'
                }}
              />
            </div>
          </section>

          {/* === Panneau droit : calques + dimensions + générateurs === */}
          <aside className="bg-[#12141a] border border-[rgba(201,168,76,0.18)] rounded-lg p-3 space-y-4 max-h-[80vh] overflow-y-auto">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]/80 mb-2">
                Calques
              </p>
              <div className="space-y-1">
                {LAYERS.map((l) => (
                  <label
                    key={l.key}
                    className="flex items-center gap-2 text-sm text-gray-300 px-2 py-1 rounded hover:bg-white/[0.04] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={layerVisibility[l.key]}
                      onChange={(e) =>
                        setLayerVisibility((v) => ({
                          ...v,
                          [l.key]: e.target.checked
                        }))
                      }
                      className="accent-[#C9A84C]"
                    />
                    <span>{l.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]/80 mb-2">
                Dimensions
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-gray-500">
                  Largeur
                  <NumberInput
                    min={1}
                    max={60}
                    fallback={cols}
                    value={cols}
                    onChange={(v) => resizeMap(v, rows)}
                    className="w-full p-1.5 mt-1 rounded bg-black/40 text-white border border-[rgba(201,168,76,0.2)] outline-none text-sm"
                  />
                </label>
                <label className="text-[11px] text-gray-500">
                  Hauteur
                  <NumberInput
                    min={1}
                    max={60}
                    fallback={rows}
                    value={rows}
                    onChange={(v) => resizeMap(cols, v)}
                    className="w-full p-1.5 mt-1 rounded bg-black/40 text-white border border-[rgba(201,168,76,0.2)] outline-none text-sm"
                  />
                </label>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]/80 mb-2">
                Générateur
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'donjon' as const, label: '🏰 Donjon' },
                  { key: 'foret' as const, label: '🌲 Forêt' },
                  { key: 'village' as const, label: '🏘 Village' },
                  { key: 'montagne' as const, label: '⛰ Montagne' }
                ].map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => lancerGenerateur(g.key)}
                    className="px-2 py-2 text-xs font-bold rounded border border-[rgba(201,168,76,0.3)] text-[#e6c878] hover:bg-[#C9A84C]/15 hover:border-[#C9A84C] transition"
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* === Modale d'export === */}
      {exportOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => !exporting && setExportOpen(false)}
        >
          <div
            className="bg-[#12141a] border-2 border-[#C9A84C] rounded-lg shadow-2xl w-full max-w-md p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[#C9A84C] font-bold text-lg">💾 Sauvegarder la carte</h3>
            <p className="text-sm text-gray-400">
              Génère un PNG ({cols}×{rows} tuiles) et l&apos;enregistre dans tes
              maps.
            </p>
            <div>
              <label className="text-[11px] uppercase tracking-[0.18em] text-gray-500 block mb-1">
                Nom de la carte
              </label>
              <input
                type="text"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                placeholder="Ex: Donjon des cryptes"
                autoFocus
                className="w-full p-2 rounded bg-black/40 text-white border border-[rgba(201,168,76,0.3)] outline-none text-sm"
              />
            </div>
            {message && (
              <p className={`text-sm ${message.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                {message}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exporterPNG}
                disabled={exporting || !mapName.trim()}
                className="flex-1 p-2 bg-[#C9A84C]/20 text-[#e6c878] border border-[#C9A84C] font-bold rounded hover:bg-[#C9A84C]/30 disabled:opacity-50"
              >
                {exporting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                disabled={exporting}
                className="px-4 p-2 text-gray-300 hover:text-white border border-gray-700 rounded"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// Éditeur de cartes UNIFIÉ (Corrections V1 Vague 2 — chantier fusion)
// ----------------------------------------------------------------------------
// Une seule porte : maps/editor. Des onglets montent les modes existants sans
// les réécrire :
//   • 🎨 Dessiner   → TileEditorContent (éditeur de tuiles, ce fichier)
//   • 🏗 Outils MJ  → AtelierPanelContent (ex-Atelier, maps/builder)
//   • 🏰 Générer    → ajouté au Lot 2
// Le mode initial est piloté par ?tab=draw|gm|generate (et ?id= pour la carte
// des outils MJ).
// ============================================================================

type EditorTab = 'draw' | 'generate' | 'gm'

const EDITOR_TABS: { key: EditorTab; icon: string; label: string }[] = [
  { key: 'draw', icon: '🎨', label: 'Dessiner' },
  { key: 'generate', icon: '🏰', label: 'Générer' },
  { key: 'gm', icon: '🏗', label: 'Outils MJ' }
]

export default function MapsEditorShell() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#050608] text-gray-200 p-6">
          <p className="text-gray-400">Chargement de l&apos;éditeur…</p>
        </main>
      }
    >
      <MapsEditorShellInner />
    </Suspense>
  )
}

function MapsEditorShellInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab: EditorTab =
    tabParam === 'gm' || tabParam === 'generate' ? tabParam : 'draw'
  const [tab, setTab] = useState<EditorTab>(initialTab)

  return (
    <main className="min-h-screen bg-[#050608] text-gray-200 p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto">
        <header className="flex items-center gap-3 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/dashboard/maps')}
            className="text-gray-500 hover:text-gray-200 text-sm"
          >
            ← Cartes
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-[#C9A84C]">
            🗺️ Éditeur de cartes
          </h1>
        </header>

        {/* Onglets de mode */}
        <nav className="flex flex-wrap gap-1.5 mb-5" aria-label="Mode d'édition">
          {EDITOR_TABS.map((t) => {
            const actif = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={actif}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${
                  actif
                    ? 'bg-[#C9A84C]/20 text-[#e6c878] border-[#C9A84C]'
                    : 'bg-[#12141a] text-gray-400 border-[rgba(201,168,76,0.18)] hover:border-[rgba(201,168,76,0.4)] hover:text-gray-200'
                }`}
              >
                <span aria-hidden>{t.icon}</span> {t.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Contenu du mode actif (un seul monté à la fois) */}
      <div className="max-w-[1400px] mx-auto">
        {tab === 'draw' && <TileEditorContent />}
        {tab === 'gm' && <AtelierPanelContent />}
        {tab === 'generate' && <DungeonGeneratorContent />}
      </div>
    </main>
  )
}
