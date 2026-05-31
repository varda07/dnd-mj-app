'use client'

// ============================================================================
// Roadmap Modes 2.1 — Vue tactique sans battle map (positions relatives)
// ----------------------------------------------------------------------------
// Représentation linéaire : PJ à gauche, ennemis à droite. Distance approx
// (en mètres). Drag-and-drop pour réorganiser. Marqueur "engagé CàC" si la
// distance est ≤ 1.5 m.
// ============================================================================

import { useState, type DragEvent } from 'react'

export type Combatant = {
  id: string
  nom: string
  kind: 'perso' | 'ennemi'
  image_url?: string | null
  hp_actuel: number
  hp_max: number
}

type Position = { combatantId: string; xMetres: number }

export default function VueTactique({
  combatants,
  positionsInitiales,
  onChange,
}: {
  combatants: Combatant[]
  positionsInitiales?: Position[]
  onChange?: (positions: Position[]) => void
}) {
  const [positions, setPositions] = useState<Position[]>(() => {
    if (positionsInitiales && positionsInitiales.length) return positionsInitiales
    // Placement par défaut : PJ à 0m, ennemis à 9m
    return combatants.map((c, i) => ({
      combatantId: c.id,
      xMetres: c.kind === 'perso' ? 0 + i * 1.5 : 9 + i * 1.5,
    }))
  })

  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropX, setDropX] = useState<number | null>(null)

  const longueurMetres = 18 // ligne tactique de 18m
  const pxParMetre = 32

  const getPos = (id: string) => positions.find((p) => p.combatantId === id)?.xMetres ?? 0

  const setPos = (id: string, x: number) => {
    const clamped = Math.max(0, Math.min(longueurMetres, Math.round(x * 2) / 2)) // pas de 0.5m
    setPositions((curr) => {
      const next = curr.some((p) => p.combatantId === id)
        ? curr.map((p) => p.combatantId === id ? { ...p, xMetres: clamped } : p)
        : [...curr, { combatantId: id, xMetres: clamped }]
      onChange?.(next)
      return next
    })
  }

  const onDragStart = (id: string) => (e: DragEvent) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / pxParMetre
    setDropX(Math.max(0, Math.min(longueurMetres, x)))
  }
  const onDrop = () => {
    if (draggedId && dropX !== null) setPos(draggedId, dropX)
    setDraggedId(null); setDropX(null)
  }

  // Détecte les paires engagées au corps à corps (perso ↔ ennemi distance ≤ 1.5m)
  const engagees = new Set<string>()
  const persos = combatants.filter((c) => c.kind === 'perso')
  const ennemis = combatants.filter((c) => c.kind === 'ennemi')
  for (const p of persos) {
    for (const e of ennemis) {
      if (Math.abs(getPos(p.id) - getPos(e.id)) <= 1.5) {
        engagees.add(p.id); engagees.add(e.id)
      }
    }
  }

  return (
    <div className="codex-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-yellow-500 font-bold">
          ⚔ Vue tactique
        </span>
        <span className="text-[10px] text-gray-500 italic">Drag pour positionner — pas de 0.5m</span>
      </div>

      {/* Règle graduée */}
      <div
        className="relative bg-gray-900/50 border border-gray-700 rounded overflow-x-auto"
        style={{ height: 110, width: '100%' }}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div style={{ position: 'relative', width: longueurMetres * pxParMetre + 40, height: '100%' }}>
          {/* Graduations */}
          {Array.from({ length: longueurMetres + 1 }).map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: i * pxParMetre + 20, top: 0, bottom: 0, width: 1, background: i % 3 === 0 ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.04)' }}>
              {i % 3 === 0 && (
                <span style={{ position: 'absolute', top: 2, left: 2, fontSize: 9, color: 'rgba(232,232,236,0.4)' }}>{i}m</span>
              )}
            </div>
          ))}
          {/* Drop indicator */}
          {dropX !== null && (
            <div style={{ position: 'absolute', left: dropX * pxParMetre + 20 - 1, top: 0, bottom: 0, width: 2, background: '#fbbf24' }} />
          )}
          {/* Combatants */}
          {combatants.map((c) => {
            const x = getPos(c.id)
            const isEngaged = engagees.has(c.id)
            return (
              <div
                key={c.id}
                draggable
                onDragStart={onDragStart(c.id)}
                title={`${c.nom} — ${c.hp_actuel}/${c.hp_max} pv${isEngaged ? ' (engagé)' : ''}`}
                style={{
                  position: 'absolute',
                  left: x * pxParMetre + 20 - 18,
                  top: c.kind === 'perso' ? 18 : 58,
                  width: 36, height: 36,
                  borderRadius: '50%',
                  border: `2px solid ${isEngaged ? '#fbbf24' : c.kind === 'perso' ? '#60a5fa' : '#f87171'}`,
                  background: c.image_url ? `url(${c.image_url}) center/cover` : (c.kind === 'perso' ? '#1e3a5f' : '#3f1d1d'),
                  cursor: 'grab',
                  boxShadow: isEngaged ? '0 0 10px rgba(251,191,36,0.5)' : '0 2px 6px rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: '#fff', fontWeight: 'bold',
                }}
              >
                {!c.image_url && c.nom.slice(0, 1).toUpperCase()}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-gray-500">
        <span>🛡 PJ (haut, bleu)</span>
        <span>👹 Ennemis (bas, rouge)</span>
        <span>⚔ Engagé CàC = ≤ 1.5m</span>
      </div>
    </div>
  )
}
