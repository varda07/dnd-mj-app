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
  compact = false
}: {
  jetons: Jeton[]
  positions: Record<string, { x: number; y: number }>
  backgroundUrl?: string | null
  editable?: boolean
  onMove?: (pieceId: string, x: number, y: number) => void
  compact?: boolean
}) {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<string | null>(null)
  const defauts = positionParDefaut(jetons)

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
              <img src={j.image_url} alt="" className="combatcarte-jeton-img" />
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
