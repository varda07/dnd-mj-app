'use client'

// ============================================================================
// Roadmap Modes 3.4 — Palette des pièges classiques
// ============================================================================

import { PIEGES_DONJON, type Piege } from '@/app/data/pieges_donjon'

export default function PiegesPalette({
  onSelect,
}: {
  onSelect?: (piege: Piege) => void
}) {
  return (
    <div className="codex-card p-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-yellow-500 font-bold mb-2">
        🪤 Pièges D&amp;D 5e
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto codex-scroll">
        {PIEGES_DONJON.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect?.(p)}
            className="codex-card codex-card-hover p-2 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{p.icon}</span>
              <span className="text-sm font-semibold text-yellow-300">{p.nom}</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              Détection DC {p.dd_detection} · Désamorçage DC {p.dd_desamorcage}
            </div>
            <div className="text-[10px] text-red-300">
              {p.degats} {p.type_degats}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
