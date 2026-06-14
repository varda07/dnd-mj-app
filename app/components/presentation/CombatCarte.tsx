'use client'

// ============================================================================
// Refonte combat diffusion — PHASE 3 : Carte tactique
// ----------------------------------------------------------------------------
// Plateau de jetons partagé MJ ⇄ joueurs. Positions normalisées (0..1) pour
// rester indépendantes de la résolution. Côté MJ : drag des jetons. Côté
// joueurs : lecture seule (si le MJ a activé l'affichage). Synchro via la
// ligne combats (positions jsonb) → realtime → snapshot.
// ============================================================================

import { useRef } from 'react'

export type Jeton = {
  pieceId: string
  id: string
  nom: string
  kind: 'perso' | 'ennemi'
  image_url: string | null
}

// V1 1.2 — Brouillard de guerre : grille de cellules masquées. `hidden`
// contient les index (y * cols + x) des cellules cachées. Vide = tout visible.
export type FogState = { cols: number; rows: number; hidden: number[] }

export const FOG_COLS = 24
export const FOG_ROWS = 14

export function fogVide(): FogState {
  return { cols: FOG_COLS, rows: FOG_ROWS, hidden: [] }
}

// Position par défaut si le jeton n'a pas encore été déplacé : PJ en bas,
// ennemis en haut, répartis horizontalement par index.
function positionParDefaut(jetons: Jeton[]): Record<string, { x: number; y: number }> {
  const pj = jetons.filter((j) => j.kind === 'perso')
  const en = jetons.filter((j) => j.kind === 'ennemi')
  const out: Record<string, { x: number; y: number }> = {}
  const place = (liste: Jeton[], y: number) => {
    liste.forEach((j, i) => {
      out[j.pieceId] = { x: (i + 1) / (liste.length + 1), y }
    })
  }
  place(pj, 0.82)
  place(en, 0.18)
  return out
}

export default function CombatCarte({
  jetons,
  positions,
  backgroundUrl,
  editable = false,
  onMove,
  compact = false,
  fog,
  fogEditable = false,
  brushSize = 1,
  fogMode = 'hide',
  onFogChange
}: {
  jetons: Jeton[]
  positions: Record<string, { x: number; y: number }>
  backgroundUrl?: string | null
  editable?: boolean
  onMove?: (pieceId: string, x: number, y: number) => void
  compact?: boolean
  // V1 1.2 — brouillard de guerre
  fog?: FogState | null
  fogEditable?: boolean
  brushSize?: number
  fogMode?: 'hide' | 'reveal'
  onFogChange?: (fog: FogState) => void
}) {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<string | null>(null)
  const fogPaintRef = useRef(false)
  const defauts = positionParDefaut(jetons)

  const cols = fog?.cols ?? FOG_COLS
  const rows = fog?.rows ?? FOG_ROWS
  const hidden = new Set(fog?.hidden ?? [])

  // Applique le pinceau autour de la cellule visée (rayon = brushSize).
  const peindre = (clientX: number, clientY: number) => {
    const board = boardRef.current
    if (!board || !onFogChange) return
    const rect = board.getBoundingClientRect()
    const cx = Math.floor(((clientX - rect.left) / rect.width) * cols)
    const cy = Math.floor(((clientY - rect.top) / rect.height) * rows)
    const next = new Set(hidden)
    for (let dy = -brushSize; dy <= brushSize; dy++) {
      for (let dx = -brushSize; dx <= brushSize; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue
        const idx = y * cols + x
        if (fogMode === 'hide') next.add(idx)
        else next.delete(idx)
      }
    }
    onFogChange({ cols, rows, hidden: [...next] })
  }

  const posDe = (j: Jeton) => positions[j.pieceId] ?? defauts[j.pieceId] ?? { x: 0.5, y: 0.5 }

  const onPointerMove = (e: React.PointerEvent) => {
    const pieceId = dragRef.current
    const board = boardRef.current
    if (!pieceId || !board || !onMove) return
    const rect = board.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    onMove(pieceId, x, y)
  }

  const stopDrag = (e: React.PointerEvent) => {
    if (dragRef.current) {
      dragRef.current = null
      try {
        ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
      } catch {
        /* noop */
      }
    }
  }

  return (
    <div
      ref={boardRef}
      className={`combatcarte${editable ? ' is-editable' : ''}`}
      style={{
        backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
        height: compact ? 180 : 320
      }}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerLeave={stopDrag}
    >
      {!backgroundUrl && <div className="combatcarte-grid" aria-hidden />}

      {/* V1 1.2 — Brouillard : cellules masquées (overlay non interactif). */}
      {hidden.size > 0 && (
        <div
          className="combatcarte-fog"
          aria-hidden
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
        >
          {Array.from({ length: cols * rows }, (_, idx) => (
            <span
              key={idx}
              className={hidden.has(idx) ? 'combatcarte-fog-cell is-hidden' : 'combatcarte-fog-cell'}
            />
          ))}
        </div>
      )}

      {/* Couche de peinture du brouillard (MJ, mode brouillard actif). */}
      {fogEditable && onFogChange && (
        <div
          className="combatcarte-fogpaint"
          onPointerDown={(e) => {
            fogPaintRef.current = true
            try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId) } catch { /* noop */ }
            peindre(e.clientX, e.clientY)
          }}
          onPointerMove={(e) => { if (fogPaintRef.current) peindre(e.clientX, e.clientY) }}
          onPointerUp={() => { fogPaintRef.current = false }}
          onPointerLeave={() => { fogPaintRef.current = false }}
        />
      )}

      {jetons.map((j) => {
        const p = posDe(j)
        const ko = false
        return (
          <button
            key={j.pieceId}
            type="button"
            disabled={!editable}
            onPointerDown={(e) => {
              if (!editable) return
              dragRef.current = j.pieceId
              try {
                ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
              } catch {
                /* noop */
              }
            }}
            className={`combatcarte-jeton${j.kind === 'ennemi' ? ' is-enemy' : ''}${
              ko ? ' is-ko' : ''
            }`}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            title={j.nom}
          >
            {j.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={j.image_url} alt="" className="combatcarte-jeton-img" loading="lazy" decoding="async" />
            ) : (
              <span>{j.kind === 'ennemi' ? '👹' : '🛡'}</span>
            )}
            <span className="combatcarte-jeton-nom">{j.nom}</span>
          </button>
        )
      })}
    </div>
  )
}
