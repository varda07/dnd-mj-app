'use client'

// ============================================================================
// Roadmap Modes 3.1 — Palette de tuiles pour l'éditeur de donjon
// ----------------------------------------------------------------------------
// Affiche les tuiles par catégorie. Au clic ou drag, on émet la tuile choisie
// au parent. Rotation possible (90/180/270) si rotable.
// ============================================================================

import { useState } from 'react'
import { TUILES_DONJON, CATEGORIES_LABELS, type TuileCategorie, type TuileDef } from '@/app/data/tuiles_donjon'

export default function TuilesPalette({
  onSelect,
}: {
  onSelect?: (tuile: TuileDef, rotation: 0 | 90 | 180 | 270) => void
}) {
  const [active, setActive] = useState<TuileCategorie>('piece')
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0)

  const tuiles = TUILES_DONJON.filter((t) => t.categorie === active)

  return (
    <div className="codex-card p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-yellow-500 font-bold">
          🧱 Bibliothèque de tuiles
        </span>
        <div className="flex gap-1">
          {([0, 90, 180, 270] as const).map((r) => (
            <button key={r} type="button"
              onClick={() => setRotation(r)}
              className={`text-[11px] px-2 py-1 rounded border ${rotation === r ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-200' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
            >{r}°</button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {(Object.keys(CATEGORIES_LABELS) as TuileCategorie[]).map((c) => (
          <button key={c} type="button" onClick={() => setActive(c)}
            className={`text-[11px] px-2 py-1 rounded border ${
              active === c ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-200' : 'bg-gray-800 border-gray-700 text-gray-300'
            }`}
          >{CATEGORIES_LABELS[c]}</button>
        ))}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto codex-scroll">
        {tuiles.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect?.(t, rotation)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-tuile', JSON.stringify({ id: t.id, rotation }))
            }}
            className="codex-card codex-card-hover p-1.5 flex flex-col items-center cursor-grab"
            title={`${t.label} (${t.w}×${t.h})`}
          >
            <svg
              viewBox={`0 0 ${t.w * 20} ${t.h * 20}`}
              width={56} height={56}
              style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s ease' }}
              dangerouslySetInnerHTML={{ __html: t.svg }}
            />
            <span className="text-[10px] text-gray-400 mt-1 truncate w-full text-center">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
