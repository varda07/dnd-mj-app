'use client'

// ============================================================================
// Roadmap Modes 3.12 + 3.13 — Toggle "Vue MJ" / "Vue joueurs"
// ----------------------------------------------------------------------------
// Bouton qui bascule entre les deux modes :
// - MJ : tous les pièges visibles (rouge), trésors (or), triggers (bleu),
//        annotations, ennemis cachés
// - Joueurs : seulement ce qui est découvert
// Le mode est exposé via un context ou un callback parent.
// ============================================================================

import { useState } from 'react'

export type GmViewMode = 'mj' | 'joueurs'

export default function GmViewToggle({
  mode, onChange,
}: {
  mode?: GmViewMode
  onChange: (m: GmViewMode) => void
}) {
  const [local, setLocal] = useState<GmViewMode>(mode ?? 'mj')
  const courant = mode ?? local

  const toggle = (m: GmViewMode) => {
    setLocal(m)
    onChange(m)
  }

  return (
    <div className="inline-flex items-center gap-0 rounded border border-yellow-500/30 overflow-hidden">
      <button
        type="button"
        onClick={() => toggle('mj')}
        className={`px-3 py-1.5 text-xs font-bold codex-btn-press ${
          courant === 'mj'
            ? 'bg-yellow-500 text-gray-900'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
        title="Voir la carte avec tous les éléments cachés (mode MJ)"
      >
        👁 Vue MJ
      </button>
      <button
        type="button"
        onClick={() => toggle('joueurs')}
        className={`px-3 py-1.5 text-xs font-bold codex-btn-press ${
          courant === 'joueurs'
            ? 'bg-yellow-500 text-gray-900'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
        title="Aperçu de ce que voient les joueurs"
      >
        🛡 Vue joueurs
      </button>
    </div>
  )
}
