'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap 5.4 — Générateur de donjons procédural
// ----------------------------------------------------------------------------
// Page autonome : génère un donjon (pièces + corridors) selon taille / thème /
// difficulté, peuple les pièces (loot, ennemis suggérés, pièges), affiche un
// aperçu canvas + un rapport textuel, puis exporte un PNG dans la
// bibliothèque de maps (bucket MAP + table `maps`, même schéma que l'éditeur).
// Aucun nouveau modèle SQL.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ----------------------------------------------------------------------------
// Configuration : tailles, thèmes, difficultés
// ----------------------------------------------------------------------------

type Taille = 'petit' | 'moyen' | 'grand'
type Theme = 'crypte' | 'temple' | 'grotte' | 'forteresse'
type Difficulte = 'facile' | 'normal' | 'difficile' | 'mortel'

const TAILLES: Record<
  Taille,
  { label: string; cols: number; rows: number; rooms: number; roomMin: number; roomMax: number; cell: number }
> = {
  petit: { label: 'Petit', cols: 24, rows: 18, rooms: 5, roomMin: 3, roomMax: 6, cell: 24 },
  moyen: { label: 'Moyen', cols: 34, rows: 24, rooms: 9, roomMin: 3, roomMax: 7, cell: 17 },
  grand: { label: 'Grand', cols: 46, rows: 32, rooms: 14, roomMin: 4, roomMax: 8, cell: 13 }
}

const THEMES: Record<
  Theme,
  {
    label: string
    floor: string
    wall: string
    liquide: string | null
    ennemis: string[]
    boss: string
    pieges: string[]
  }
> = {
  crypte: {
    label: '⚰️ Crypte',
    floor: '#3a3340',
    wall: '#161320',
    liquide: null,
    ennemis: ['Squelette', 'Zombie', 'Goule', 'Ombre', 'Spectre', 'Âme en peine'],
    boss: 'Liche mineure',
    pieges: [
      'Dalle de chute — 2d6 dégâts de chute',
      'Gaz nécrotique — jet de CON DD 13',
      'Herse rouillée qui isole la pièce',
      'Sarcophage piégé — réveille un mort-vivant'
    ]
  },
  temple: {
    label: '🛐 Temple',
    floor: '#4a4338',
    wall: '#262019',
    liquide: null,
    ennemis: ['Cultiste', 'Gardien animé', 'Acolyte', 'Golem d’argile', 'Prêtre déchu'],
    boss: 'Grand prêtre corrompu',
    pieges: [
      'Volée de fléchettes — jet de DEX DD 14',
      'Fosse dissimulée — 3d6 dégâts de chute',
      'Runes explosives — 4d6 dégâts de feu',
      'Statue qui s’anime au passage'
    ]
  },
  grotte: {
    label: '🪨 Grotte',
    floor: '#4a3f30',
    wall: '#1f1810',
    liquide: '#2c6cb5',
    ennemis: ['Gobelin', 'Ours', 'Araignée géante', 'Vase grise', 'Troll', 'Otyugh'],
    boss: 'Troll des profondeurs',
    pieges: [
      'Éboulement — 2d10 dégâts contondants',
      'Fosse naturelle noyée',
      'Spores toxiques — jet de CON DD 12',
      'Pont de pierre fragile'
    ]
  },
  forteresse: {
    label: '🏰 Forteresse',
    floor: '#4a4a52',
    wall: '#26262e',
    liquide: null,
    ennemis: ['Garde', 'Chien de guerre', 'Arbalétrier', 'Capitaine', 'Mage de bataille'],
    boss: 'Seigneur de guerre',
    pieges: [
      'Huile bouillante déversée du plafond',
      'Herse à déclenchement — sépare le groupe',
      'Alarme — renforts en 1d4 rounds',
      'Plancher effondrable au-dessus des oubliettes'
    ]
  }
}

const DIFFICULTES: Record<
  Difficulte,
  { label: string; ennemisMin: number; ennemisMax: number; lootMin: number; lootMax: number; probPiege: number }
> = {
  facile: { label: 'Facile', ennemisMin: 1, ennemisMax: 2, lootMin: 1, lootMax: 1, probPiege: 0.15 },
  normal: { label: 'Normal', ennemisMin: 2, ennemisMax: 3, lootMin: 1, lootMax: 2, probPiege: 0.3 },
  difficile: { label: 'Difficile', ennemisMin: 3, ennemisMax: 5, lootMin: 2, lootMax: 2, probPiege: 0.45 },
  mortel: { label: 'Mortel', ennemisMin: 4, ennemisMax: 7, lootMin: 2, lootMax: 3, probPiege: 0.6 }
}

const LOOT_TIERS: Record<Difficulte, string[]> = {
  facile: [
    'Potion de soins',
    '2d6 po en monnaie',
    'Arme courante de bonne facture',
    'Trousse d’aventurier',
    'Parchemin (sort de niveau 1)',
    '1d4 gemmes (10 po pièce)'
  ],
  normal: [
    'Potion de soins supérieure',
    '4d6 po + 1d4 gemmes',
    'Arme +1',
    'Bouclier +1',
    'Parchemin (sort de niveau 2-3)',
    'Cape elfique',
    'Sac sans fond'
  ],
  difficile: [
    'Potion de soins suprême',
    '8d6 po + gemmes (200 po)',
    'Arme +2',
    'Armure de mailles +1',
    'Anneau de protection',
    'Bottes de célérité',
    'Bâton de feu'
  ],
  mortel: [
    'Arme +3',
    'Armure de plates +2',
    'Anneau de régénération',
    'Trésor en pièces (10d6 × 10 po)',
    'Objet légendaire au choix du MJ',
    'Bâton du mage',
    'Heaume de téléportation'
  ]
}

// ----------------------------------------------------------------------------
// Algorithme de génération
// ----------------------------------------------------------------------------

type Cell = 'wall' | 'floor' | 'liquide'
type RoomType = 'entree' | 'tresor' | 'garde' | 'piege' | 'vide' | 'boss'

type DonjonRoom = {
  index: number
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
  type: RoomType
  loot: string[]
  ennemis: string[]
  piege: string | null
}

type Donjon = {
  cols: number
  rows: number
  grid: Cell[][]
  rooms: DonjonRoom[]
  theme: Theme
  taille: Taille
  difficulte: Difficulte
}

const rand = (n: number) => Math.floor(Math.random() * n)
const pick = <T,>(a: T[]): T => a[rand(a.length)]

const ROOM_META: Record<RoomType, { label: string; emoji: string; tint: string | null }> = {
  entree: { label: 'Entrée', emoji: '🚪', tint: '#4ade80' },
  tresor: { label: 'Trésor', emoji: '📦', tint: '#fbbf24' },
  garde: { label: 'Salle de garde', emoji: '⚔️', tint: '#f87171' },
  piege: { label: 'Salle piégée', emoji: '⚠️', tint: '#c084fc' },
  vide: { label: 'Salle vide', emoji: '·', tint: null },
  boss: { label: 'Antre du boss', emoji: '💀', tint: '#ef4444' }
}

function genererDonjon(taille: Taille, theme: Theme, difficulte: Difficulte): Donjon {
  const cfg = TAILLES[taille]
  const tcfg = THEMES[theme]
  const dcfg = DIFFICULTES[difficulte]
  const { cols, rows } = cfg

  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 'wall' as Cell)
  )

  // 1. Placement des pièces sans chevauchement (marge d'1 case).
  const rects: { x: number; y: number; w: number; h: number }[] = []
  let essais = 0
  while (rects.length < cfg.rooms && essais < cfg.rooms * 40) {
    essais++
    const w = cfg.roomMin + rand(cfg.roomMax - cfg.roomMin + 1)
    const h = cfg.roomMin + rand(cfg.roomMax - cfg.roomMin + 1)
    const x = 1 + rand(Math.max(1, cols - w - 2))
    const y = 1 + rand(Math.max(1, rows - h - 2))
    const collision = rects.some(
      (r) =>
        x < r.x + r.w + 1 &&
        x + w + 1 > r.x &&
        y < r.y + r.h + 1 &&
        y + h + 1 > r.y
    )
    if (collision) continue
    rects.push({ x, y, w, h })
  }

  // 2. Creusement des pièces.
  rects.forEach((r) => {
    for (let dy = 0; dy < r.h; dy++) {
      for (let dx = 0; dx < r.w; dx++) {
        grid[r.y + dy][r.x + dx] = 'floor'
      }
    }
  })

  // 3. Corridors en L reliant chaque pièce à la précédente.
  for (let i = 1; i < rects.length; i++) {
    const a = rects[i - 1]
    const b = rects[i]
    const ax = a.x + Math.floor(a.w / 2)
    const ay = a.y + Math.floor(a.h / 2)
    const bx = b.x + Math.floor(b.w / 2)
    const by = b.y + Math.floor(b.h / 2)
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) {
      if (grid[ay][x] === 'wall') grid[ay][x] = 'floor'
    }
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) {
      if (grid[y][bx] === 'wall') grid[y][bx] = 'floor'
    }
  }

  // 4. Quelques mares dans les grottes.
  if (tcfg.liquide) {
    rects.forEach((r) => {
      if (Math.random() < 0.3 && r.w > 3 && r.h > 3) {
        const lx = r.x + 1 + rand(r.w - 2)
        const ly = r.y + 1 + rand(r.h - 2)
        grid[ly][lx] = 'liquide'
      }
    })
  }

  // 5. Classification + peuplement des pièces.
  const rooms: DonjonRoom[] = rects.map((r, i) => ({
    index: i + 1,
    x: r.x,
    y: r.y,
    w: r.w,
    h: r.h,
    cx: r.x + Math.floor(r.w / 2),
    cy: r.y + Math.floor(r.h / 2),
    type: 'vide' as RoomType,
    loot: [],
    ennemis: [],
    piege: null
  }))

  if (rooms.length > 0) rooms[0].type = 'entree'
  const bossActif = difficulte === 'difficile' || difficulte === 'mortel'
  if (bossActif && rooms.length > 1) rooms[rooms.length - 1].type = 'boss'

  // Au moins une salle au trésor garantie parmi les pièces intermédiaires.
  const intermediaires = rooms.filter((r) => r.type === 'vide')
  if (intermediaires.length > 0) {
    pick(intermediaires).type = 'tresor'
  }

  rooms.forEach((room) => {
    if (room.type === 'vide') {
      const roll = Math.random()
      if (roll < dcfg.probPiege) room.type = 'piege'
      else if (roll < dcfg.probPiege + 0.35) room.type = 'garde'
      else if (roll < dcfg.probPiege + 0.5) room.type = 'tresor'
      // sinon : reste vide
    }
  })

  const tirerLoot = (n: number) => {
    const table = LOOT_TIERS[difficulte]
    const out: string[] = []
    for (let i = 0; i < n; i++) out.push(pick(table))
    return out
  }
  const tirerEnnemis = (min: number, max: number) => {
    const n = min + rand(max - min + 1)
    const out: string[] = []
    for (let i = 0; i < n; i++) out.push(pick(tcfg.ennemis))
    // Regroupe « 3× Squelette ».
    const compte = new Map<string, number>()
    out.forEach((e) => compte.set(e, (compte.get(e) ?? 0) + 1))
    return [...compte.entries()].map(([e, c]) => (c > 1 ? `${c}× ${e}` : e))
  }

  rooms.forEach((room) => {
    if (room.type === 'tresor') {
      room.loot = tirerLoot(dcfg.lootMin + rand(dcfg.lootMax - dcfg.lootMin + 1))
      if (Math.random() < dcfg.probPiege * 0.6) room.piege = pick(tcfg.pieges)
    } else if (room.type === 'garde') {
      room.ennemis = tirerEnnemis(dcfg.ennemisMin, dcfg.ennemisMax)
    } else if (room.type === 'piege') {
      room.piege = pick(tcfg.pieges)
      if (Math.random() < 0.4) room.ennemis = tirerEnnemis(1, dcfg.ennemisMin)
    } else if (room.type === 'boss') {
      room.ennemis = [tcfg.boss, ...tirerEnnemis(1, Math.max(1, dcfg.ennemisMin))]
      room.loot = tirerLoot(dcfg.lootMax + 1)
      if (Math.random() < 0.5) room.piege = pick(tcfg.pieges)
    }
  })

  return { cols, rows, grid, rooms, theme, taille, difficulte }
}

// Rapport textuel — affiché et stocké dans `maps.description`.
function rapportTexte(d: Donjon): string {
  const t = THEMES[d.theme]
  const lignes: string[] = [
    `Donjon procédural — ${t.label} · ${TAILLES[d.taille].label} · difficulté ${DIFFICULTES[d.difficulte].label}`,
    `${d.rooms.length} pièces.`,
    ''
  ]
  d.rooms.forEach((r) => {
    const meta = ROOM_META[r.type]
    let ligne = `Pièce ${r.index} — ${meta.label}`
    const détails: string[] = []
    if (r.ennemis.length) détails.push(`Ennemis : ${r.ennemis.join(', ')}`)
    if (r.loot.length) détails.push(`Loot : ${r.loot.join(', ')}`)
    if (r.piege) détails.push(`Piège : ${r.piege}`)
    if (détails.length) ligne += ` — ${détails.join(' · ')}`
    lignes.push(ligne)
  })
  return lignes.join('\n')
}

// ----------------------------------------------------------------------------
// Rendu canvas
// ----------------------------------------------------------------------------

function dessinerDonjon(ctx: CanvasRenderingContext2D, cell: number, d: Donjon) {
  const t = THEMES[d.theme]
  // Fond / murs
  ctx.fillStyle = t.wall
  ctx.fillRect(0, 0, d.cols * cell, d.rows * cell)
  // Sol + liquide
  for (let y = 0; y < d.rows; y++) {
    for (let x = 0; x < d.cols; x++) {
      const c = d.grid[y][x]
      if (c === 'floor') {
        ctx.fillStyle = t.floor
        ctx.fillRect(x * cell, y * cell, cell, cell)
      } else if (c === 'liquide' && t.liquide) {
        ctx.fillStyle = t.liquide
        ctx.fillRect(x * cell, y * cell, cell, cell)
      }
    }
  }
  // Grille fine sur le sol
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'
  ctx.lineWidth = 1
  for (let y = 0; y < d.rows; y++) {
    for (let x = 0; x < d.cols; x++) {
      if (d.grid[y][x] !== 'wall') {
        ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell, cell)
      }
    }
  }
  // Teinte + numéro + emoji par pièce
  d.rooms.forEach((r) => {
    const meta = ROOM_META[r.type]
    if (meta.tint) {
      ctx.fillStyle = meta.tint
      ctx.globalAlpha = 0.16
      ctx.fillRect(r.x * cell, r.y * cell, r.w * cell, r.h * cell)
      ctx.globalAlpha = 1
      ctx.strokeStyle = meta.tint
      ctx.lineWidth = 2
      ctx.strokeRect(r.x * cell + 1, r.y * cell + 1, r.w * cell - 2, r.h * cell - 2)
    }
    // Numéro de pièce (coin haut-gauche)
    ctx.fillStyle = '#f5e8c8'
    ctx.font = `bold ${Math.max(9, Math.floor(cell * 0.55))}px Georgia, serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(String(r.index), r.x * cell + 3, r.y * cell + 2)
    // Emoji représentatif au centre
    if (meta.emoji && meta.emoji !== '·') {
      ctx.font = `${Math.floor(cell * 1.1)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(meta.emoji, r.cx * cell + cell / 2, r.cy * cell + cell / 2)
    }
  })
}

// ----------------------------------------------------------------------------
// Composant
// ----------------------------------------------------------------------------

export default function GenererDonjonPage() {
  const router = useRouter()
  const [taille, setTaille] = useState<Taille>('moyen')
  const [theme, setTheme] = useState<Theme>('crypte')
  const [difficulte, setDifficulte] = useState<Difficulte>('normal')
  const [donjon, setDonjon] = useState<Donjon | null>(null)
  const [mapName, setMapName] = useState('')
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const lancer = useCallback(() => {
    setDonjon(genererDonjon(taille, theme, difficulte))
    setMessage('')
  }, [taille, theme, difficulte])

  // Première génération au montage.
  useEffect(() => {
    setDonjon(genererDonjon('moyen', 'crypte', 'normal'))
  }, [])

  // Rendu de l'aperçu.
  useEffect(() => {
    const c = canvasRef.current
    if (!c || !donjon) return
    const cell = TAILLES[donjon.taille].cell
    c.width = donjon.cols * cell
    c.height = donjon.rows * cell
    const ctx = c.getContext('2d')
    if (!ctx) return
    dessinerDonjon(ctx, cell, donjon)
  }, [donjon])

  const exporter = async () => {
    if (!donjon) return
    if (!mapName.trim()) {
      setMessage('Donne un nom au donjon.')
      return
    }
    setExporting(true)
    try {
      const EXPORT_CELL = 36
      const off = document.createElement('canvas')
      off.width = donjon.cols * EXPORT_CELL
      off.height = donjon.rows * EXPORT_CELL
      const ctx = off.getContext('2d')
      if (!ctx) throw new Error('Canvas indisponible')
      dessinerDonjon(ctx, EXPORT_CELL, donjon)
      const blob: Blob | null = await new Promise((resolve) =>
        off.toBlob((b) => resolve(b), 'image/png')
      )
      if (!blob) throw new Error('Génération PNG échouée')

      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentification requise')

      const safeName = mapName.trim().replace(/[^a-z0-9-_]/gi, '-').toLowerCase()
      const path = `${user.id}/${Date.now()}-${safeName}.png`
      const { error: upErr } = await supabase.storage
        .from('MAP')
        .upload(path, blob, { contentType: 'image/png', upsert: false })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('MAP').getPublicUrl(path)

      const { error: insErr } = await supabase.from('maps').insert({
        nom: mapName.trim(),
        description: rapportTexte(donjon),
        image_url: urlData.publicUrl,
        mj_id: user.id
      })
      if (insErr) throw insErr

      setMessage('✓ Donjon enregistré dans tes maps !')
      setTimeout(() => router.push('/dashboard/maps'), 900)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage(`Erreur : ${msg}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#050608] text-gray-200 p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto">
        <header className="flex items-center gap-4 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/dashboard/maps')}
            className="text-gray-500 hover:text-gray-200 text-sm"
          >
            ← Maps
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-[#C9A84C]">
            🏰 Générateur de donjons
          </h1>
          <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 ml-auto">
            Procédural
          </span>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[230px_1fr_280px] gap-4">
          {/* === Paramètres === */}
          <aside className="bg-[#12141a] border border-[rgba(201,168,76,0.18)] rounded-lg p-3 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]/80 mb-2">
                Taille
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(TAILLES) as Taille[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTaille(k)}
                    className={`px-2 py-1.5 text-xs font-bold rounded border transition ${
                      taille === k
                        ? 'border-[#C9A84C] bg-[#C9A84C]/15 text-[#e6c878]'
                        : 'border-[rgba(201,168,76,0.2)] text-gray-400 hover:border-[rgba(201,168,76,0.4)]'
                    }`}
                  >
                    {TAILLES[k].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]/80 mb-2">
                Thème
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(THEMES) as Theme[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTheme(k)}
                    className={`px-2 py-1.5 text-xs font-bold rounded border transition ${
                      theme === k
                        ? 'border-[#C9A84C] bg-[#C9A84C]/15 text-[#e6c878]'
                        : 'border-[rgba(201,168,76,0.2)] text-gray-400 hover:border-[rgba(201,168,76,0.4)]'
                    }`}
                  >
                    {THEMES[k].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]/80 mb-2">
                Difficulté
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(DIFFICULTES) as Difficulte[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDifficulte(k)}
                    className={`px-2 py-1.5 text-xs font-bold rounded border transition ${
                      difficulte === k
                        ? 'border-[#C9A84C] bg-[#C9A84C]/15 text-[#e6c878]'
                        : 'border-[rgba(201,168,76,0.2)] text-gray-400 hover:border-[rgba(201,168,76,0.4)]'
                    }`}
                  >
                    {DIFFICULTES[k].label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={lancer}
              className="w-full px-3 py-2.5 rounded text-sm font-bold bg-[#C9A84C]/15 text-[#e6c878] border border-[#C9A84C] hover:bg-[#C9A84C]/25 transition"
            >
              🎲 Générer
            </button>

            <p className="text-[10px] text-gray-600 leading-relaxed">
              Chaque génération place des pièces, des corridors, et peuple le
              donjon de loot, d&apos;ennemis et de pièges selon la difficulté.
            </p>
          </aside>

          {/* === Aperçu canvas === */}
          <section className="bg-[#12141a] border border-[rgba(201,168,76,0.18)] rounded-lg p-3 overflow-auto min-w-0">
            <canvas
              ref={canvasRef}
              style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto' }}
            />
          </section>

          {/* === Rapport + export === */}
          <aside className="bg-[#12141a] border border-[rgba(201,168,76,0.18)] rounded-lg p-3 space-y-3 max-h-[80vh] overflow-y-auto">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]/80">
              Rapport du donjon
            </p>
            {donjon && (
              <>
                <p className="text-xs text-gray-400">
                  {donjon.rooms.length} pièces · {THEMES[donjon.theme].label} ·{' '}
                  {DIFFICULTES[donjon.difficulte].label}
                </p>
                <ul className="space-y-2">
                  {donjon.rooms.map((r) => {
                    const meta = ROOM_META[r.type]
                    return (
                      <li
                        key={r.index}
                        className="text-xs rounded border border-[rgba(201,168,76,0.12)] bg-black/30 p-2"
                      >
                        <p className="font-bold text-gray-200">
                          {meta.emoji !== '·' ? `${meta.emoji} ` : ''}Pièce {r.index} —{' '}
                          <span style={{ color: meta.tint ?? '#9ca3af' }}>{meta.label}</span>
                        </p>
                        {r.ennemis.length > 0 && (
                          <p className="text-red-300/80 mt-0.5">⚔️ {r.ennemis.join(', ')}</p>
                        )}
                        {r.loot.length > 0 && (
                          <p className="text-yellow-300/80 mt-0.5">📦 {r.loot.join(', ')}</p>
                        )}
                        {r.piege && (
                          <p className="text-purple-300/80 mt-0.5">⚠️ {r.piege}</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </>
            )}

            <div className="pt-2 border-t border-[rgba(201,168,76,0.12)] space-y-2">
              <label className="text-[11px] uppercase tracking-[0.18em] text-gray-500 block">
                Nom du donjon
              </label>
              <input
                type="text"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                placeholder="Ex : Crypte des murmures"
                className="w-full p-2 rounded bg-black/40 text-white border border-[rgba(201,168,76,0.3)] outline-none text-sm"
              />
              {message && (
                <p
                  className={`text-sm ${
                    message.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {message}
                </p>
              )}
              <button
                type="button"
                onClick={exporter}
                disabled={exporting || !donjon || !mapName.trim()}
                className="w-full p-2 bg-[#C9A84C]/20 text-[#e6c878] border border-[#C9A84C] font-bold rounded hover:bg-[#C9A84C]/30 disabled:opacity-50 text-sm"
              >
                {exporting ? 'Enregistrement…' : '💾 Enregistrer dans mes maps'}
              </button>
              <p className="text-[10px] text-gray-600">
                Le PNG est sauvegardé dans la bibliothèque ; le rapport complet
                (pièces, loot, ennemis, pièges) est stocké dans la description.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
