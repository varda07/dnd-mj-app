'use client'

// ============================================================================
// LigneDepliable — la ligne standard des menus de la roue (Delta A.3)
// ----------------------------------------------------------------------------
// Nom à gauche, valeur à droite. Appui ⇒ dépli : description courte puis un
// bouton « Lancer [formule] » si l'élément se jette. L'accordéon (une seule
// ligne ouverte à la fois) est piloté par le parent via `ouvert` / `onToggle`.
// ============================================================================

import type { ReactNode } from 'react'

export default function LigneDepliable({
  nom,
  valeur,
  description,
  formule,
  onLancer,
  ouvert,
  onToggle,
  accessoire,
  contenu,
  attenue = false
}: {
  nom: ReactNode
  valeur?: ReactNode
  description?: ReactNode
  /** Formule affichée dans le bouton de jet (ex. « 1d20+5 », « 2d6+3 »). */
  formule?: string | null
  onLancer?: () => void
  ouvert: boolean
  onToggle: () => void
  /** Petit élément à droite du nom (ronds d'usage, pastille de concentration…). */
  accessoire?: ReactNode
  /** Contenu libre supplémentaire dans le dépli. */
  contenu?: ReactNode
  attenue?: boolean
}) {
  return (
    <li
      className={`rounded-lg border overflow-hidden ${
        ouvert ? 'border-amber-500/50 bg-amber-900/10' : 'border-yellow-800/20 bg-stone-900/30'
      } ${attenue ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={ouvert}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
      >
        <span className="flex-1 min-w-0 text-sm text-stone-200 truncate">{nom}</span>
        {accessoire}
        {valeur !== undefined && valeur !== null && (
          <span className="text-yellow-100 font-bold text-sm flex-shrink-0">{valeur}</span>
        )}
        <span className={`text-stone-600 text-xs flex-shrink-0 ${ouvert ? 'rotate-180' : ''}`} aria-hidden>
          ▾
        </span>
      </button>

      {ouvert && (
        <div className="px-2.5 pb-2.5 pt-0.5 space-y-2 border-t border-yellow-800/15">
          {description && (
            <p className="text-stone-400 text-xs leading-relaxed whitespace-pre-wrap">{description}</p>
          )}
          {contenu}
          {formule && onLancer && (
            <button
              type="button"
              onClick={onLancer}
              className="w-full py-2 rounded-lg font-bold text-sm text-gray-900 bg-[#C9A84C] hover:brightness-110 active:scale-[0.98] transition"
            >
              🎲 Lancer {formule}
            </button>
          )}
        </div>
      )}
    </li>
  )
}
