'use client'

import { GRID_COLS, GRID_ROWS, type WidgetInstance } from '@/app/lib/widgets'
import WidgetRender from './widgets/WidgetRender'

// ============================================================================
// CustomDashboard — affiche une configuration utilisateur (grille 4×6) en mode
// lecture seule (pas de drag/drop, pas de delete). Utilisé sur la page d'accueil
// quand l'utilisateur a une config active.
// ============================================================================

export default function CustomDashboard({ widgets }: { widgets: WidgetInstance[] }) {
  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
        gridAutoRows: '140px'
      }}
    >
      {widgets.map((w, i) => (
        <div
          key={`${w.type}-${i}`}
          className="rounded-lg overflow-hidden"
          style={{
            gridColumn: `${w.x + 1} / span ${w.w}`,
            gridRow: `${w.y + 1} / span ${w.h}`,
            background:
              'linear-gradient(180deg, rgba(20,15,8,0.45) 0%, rgba(10,8,4,0.25) 100%)',
            border: '1px solid rgba(201,168,76,0.12)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 12px rgba(0,0,0,0.18)'
          }}
        >
          <WidgetRender type={w.type} />
        </div>
      ))}
      {widgets.length === 0 && (
        <div
          className="col-span-full row-span-2 flex items-center justify-center text-center p-6"
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px dashed rgba(201,168,76,0.20)',
            borderRadius: 8
          }}
        >
          <p className="text-sm text-gray-400 italic">
            Cette configuration est vide. Ouvre la page de personnalisation
            pour y ajouter des widgets.
          </p>
        </div>
      )}
      <style jsx>{`
        @media (max-width: 768px) {
          div :global(.grid) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  )
}
