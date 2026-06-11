'use client'

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { GRID_COLS, type WidgetInstance } from '@/app/lib/widgets'
import WidgetRender from './widgets/WidgetRender'

// ============================================================================
// CustomDashboard — affiche une configuration utilisateur sur la page d'accueil.
//   • DESKTOP (≥768px) : grille 4 colonnes positionnelle (x/y) — INCHANGÉE.
//   • MOBILE  (<768px) : 1 colonne, widgets empilés et triés par (order ?? y,x),
//     pleine largeur, hauteur proportionnelle au widget. Réordonnables au doigt
//     (Pointer Events, comme la roue d'action) si `onReorder` est fourni — le
//     nouvel ordre est persisté via le champ `order` SANS toucher x/y.
// ============================================================================

const MOBILE_ROW_H = 150 // px par unité de hauteur (h) sur mobile

const CARD_STYLE: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(20,15,8,0.45) 0%, rgba(10,8,4,0.25) 100%)',
  border: '1px solid rgba(201,168,76,0.12)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 12px rgba(0,0,0,0.18)'
}

// Clé de tri mobile : ordre explicite si présent, sinon dérivé de la position
// desktop (ligne puis colonne).
function sortKey(w: WidgetInstance): number {
  return typeof w.order === 'number' ? w.order : w.y * GRID_COLS + w.x
}

export default function CustomDashboard({
  widgets,
  onReorder
}: {
  widgets: WidgetInstance[]
  onReorder?: (widgets: WidgetInstance[]) => void
}) {
  const reorderable = !!onReorder

  // Ordre mobile (état local mutable pendant le drag).
  const [items, setItems] = useState<WidgetInstance[]>(
    () => [...widgets].sort((a, b) => sortKey(a) - sortKey(b))
  )
  const dragIdx = useRef<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)

  // Resync quand la config change (autre config, sauvegarde, ajout/retrait).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems([...widgets].sort((a, b) => sortKey(a) - sortKey(b)))
  }, [widgets])

  // --- Drag tactile/souris (Pointer Events, inspiré de ActionWheelMJ) --------
  const onHandleDown = (e: PointerEvent, i: number) => {
    if (!reorderable) return
    dragIdx.current = i
    setDragging(i)
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* noop */ }
  }
  const onHandleMove = (e: PointerEvent) => {
    if (dragIdx.current === null) return
    const cible = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest('[data-widx]') as HTMLElement | null
    if (!cible) return
    const over = Number(cible.dataset.widx)
    if (Number.isNaN(over) || over === dragIdx.current) return
    const from = dragIdx.current
    setItems((cur) => {
      const next = [...cur]
      const [moved] = next.splice(from, 1)
      next.splice(over, 0, moved)
      return next
    })
    dragIdx.current = over
    setDragging(over)
  }
  const onHandleUp = (e: PointerEvent) => {
    const bougé = dragIdx.current !== null
    dragIdx.current = null
    setDragging(null)
    try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch { /* noop */ }
    if (bougé && onReorder) {
      // Réassigne l'ordre mobile (0..n) SANS toucher x/y → desktop inchangé.
      onReorder(items.map((w, idx) => ({ ...w, order: idx })))
    }
  }

  // --- État vide -------------------------------------------------------------
  if (widgets.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-center p-6 rounded-lg"
        style={{ background: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(201,168,76,0.20)' }}
      >
        <p className="text-sm text-gray-400 italic">
          Cette configuration est vide. Ouvre la page de personnalisation pour y ajouter des widgets.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* ===== DESKTOP : grille positionnelle 4 colonnes (INCHANGÉE) ===== */}
      <div
        className="hidden md:grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
          gridAutoRows: '140px'
        }}
      >
        {widgets.map((w, i) => (
          <div
            key={`d-${w.type}-${i}`}
            className="rounded-lg overflow-hidden"
            style={{
              gridColumn: `${w.x + 1} / span ${w.w}`,
              gridRow: `${w.y + 1} / span ${w.h}`,
              ...CARD_STYLE
            }}
          >
            <WidgetRender type={w.type} />
          </div>
        ))}
      </div>

      {/* ===== MOBILE : pile 1 colonne, réordonnable au doigt ===== */}
      <div className="md:hidden flex flex-col gap-3">
        {reorderable && (
          <p className="text-[10px] text-gray-500 italic">
            Astuce : glisse la poignée ⋮⋮ pour réorganiser tes widgets.
          </p>
        )}
        {items.map((w, i) => (
          <div
            key={`m-${w.type}-${i}`}
            data-widx={i}
            className={`rounded-lg overflow-hidden flex transition-shadow ${
              dragging === i ? 'ring-2 ring-yellow-500/70' : ''
            }`}
            style={{ ...CARD_STYLE, height: w.h * MOBILE_ROW_H }}
          >
            {reorderable && (
              <button
                type="button"
                onPointerDown={(e) => onHandleDown(e, i)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
                style={{ touchAction: 'none' }}
                className="flex-shrink-0 w-11 flex items-center justify-center text-lg leading-none text-[#C9A84C]/70 hover:text-[#C9A84C] active:text-[#C9A84C] cursor-grab active:cursor-grabbing border-r border-[rgba(201,168,76,0.12)] select-none"
                aria-label="Réordonner ce widget"
                title="Glisser pour réordonner"
              >
                ⋮⋮
              </button>
            )}
            <div className="flex-1 min-w-0 overflow-hidden">
              <WidgetRender type={w.type} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
