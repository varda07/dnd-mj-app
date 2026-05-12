'use client'

import { useA11y } from '@/app/lib/accessibility'

// ============================================================================
// AccessibilityApplier — composant à monter UNE fois (au plus haut niveau)
// pour charger les préférences (localStorage puis Supabase) et les appliquer
// sur <html>. Rend également les <filter> SVG utilisés par le mode daltonien.
// Renvoie un <g> SVG invisible pour héberger les filtres.
// ============================================================================

export default function AccessibilityApplier() {
  // Le hook applique les prefs côté DOM dès le mount.
  useA11y()
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: 'absolute', pointerEvents: 'none', overflow: 'hidden' }}
    >
      <defs>
        {/* Matrices de correction (Daltonize) — atténuent la confusion
            rouge/vert ou bleu/jaune en pré-compensant les couleurs. */}
        <filter id="a11y-deuteranopie">
          <feColorMatrix
            type="matrix"
            values="0.8 0.2 0 0 0
                    0.258 0.742 0 0 0
                    0 0.142 0.858 0 0
                    0 0 0 1 0"
          />
        </filter>
        <filter id="a11y-protanopie">
          <feColorMatrix
            type="matrix"
            values="0.817 0.183 0 0 0
                    0.333 0.667 0 0 0
                    0 0.125 0.875 0 0
                    0 0 0 1 0"
          />
        </filter>
        <filter id="a11y-tritanopie">
          <feColorMatrix
            type="matrix"
            values="0.95 0.05 0 0 0
                    0 0.433 0.567 0 0
                    0 0.475 0.525 0 0
                    0 0 0 1 0"
          />
        </filter>
      </defs>
    </svg>
  )
}
