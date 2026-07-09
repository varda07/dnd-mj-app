'use client'

import type { ReactNode } from 'react'

// ============================================================================
// FormKit — composants de formulaire cohérents (Roadmap Créations, Phase 4.3)
// ----------------------------------------------------------------------------
// Style grimoire : sombre, or #C9A84C, Georgia serif pour les titres. Pensés
// mobile-first (champs pleine largeur, touch targets ≥ 44px).
//   • FormHeader   — en-tête de formulaire (titre + accroche + action)
//   • FormField    — label (icône) au-dessus + indication contextuelle + champ
//   • FormActions  — zone de boutons alignée à droite, séparateur fin
//   • GenerateButton — le 🎲 qui (re)génère un champ
//   • ChoiceCard / ChoiceGrid — cartes cliquables (sélecteurs, wizards)
//   • StepProgress — barre de progression segmentée des assistants
// ============================================================================

const OR = '#C9A84C'

// ---------------------------------------------------------------------------
export function FormHeader({
  title,
  subtitle,
  icon,
  action
}: {
  title: string
  subtitle?: string
  icon?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2
            className="text-xl md:text-2xl font-bold"
            style={{ color: OR, fontFamily: 'Georgia, serif' }}
          >
            {icon ? `${icon} ` : ''}
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-0.5 italic">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {/* Ornement séparateur (cohérent avec le dashboard). */}
      <div className="flex items-center gap-2 mt-3" aria-hidden>
        <span className="h-px flex-1" style={{ background: 'rgba(201,168,76,0.25)' }} />
        <span style={{ color: 'rgba(201,168,76,0.6)' }}>◆</span>
        <span className="h-px flex-1" style={{ background: 'rgba(201,168,76,0.25)' }} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function FormField({
  label,
  icon,
  hint,
  htmlFor,
  children
}: {
  label: string
  icon?: string
  hint?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label
          htmlFor={htmlFor}
          className="text-[11px] uppercase tracking-[0.15em] font-bold"
          style={{ color: 'rgba(201,168,76,0.85)' }}
        >
          {icon ? `${icon} ` : ''}
          {label}
        </label>
        {hint && <span className="text-[10px] text-gray-500 italic">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bouton dé de génération. `title` sert d'aria-label + tooltip.
export function GenerateButton({
  onClick,
  title = 'Générer',
  label,
  className = ''
}: {
  onClick: () => void
  title?: string
  label?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex-shrink-0 min-w-[44px] min-h-[44px] px-3 rounded-lg border font-bold transition inline-flex items-center justify-center gap-1.5 ${className}`}
      style={{
        background: 'rgba(201,168,76,0.12)',
        borderColor: 'rgba(201,168,76,0.5)',
        color: OR
      }}
    >
      <span aria-hidden className="text-lg leading-none">🎲</span>
      {label && <span className="text-xs">{label}</span>}
    </button>
  )
}

// ---------------------------------------------------------------------------
export function FormActions({
  onCancel,
  cancelLabel = 'Annuler',
  children
}: {
  onCancel?: () => void
  cancelLabel?: string
  children: ReactNode
}) {
  return (
    <div className="mt-5">
      <div className="h-px mb-4" style={{ background: 'rgba(201,168,76,0.18)' }} />
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-sm transition"
          >
            {cancelLabel}
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Carte de choix cliquable (sélecteurs de point de départ, wizards).
export function ChoiceCard({
  icon,
  title,
  subtitle,
  selected = false,
  recommended = false,
  onClick,
  disabled = false
}: {
  icon?: string
  title: string
  subtitle?: string
  selected?: boolean
  recommended?: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`relative text-left rounded-xl border p-4 min-h-[88px] transition-all w-full ${
        disabled
          ? 'opacity-40 cursor-not-allowed border-stone-800 bg-stone-900/30'
          : selected
          ? 'bg-[#C9A84C]/15'
          : 'bg-[#12141a] hover:bg-[#1a1d24]'
      }`}
      style={{
        borderColor: selected
          ? OR
          : recommended
          ? 'rgba(201,168,76,0.6)'
          : 'rgba(201,168,76,0.2)',
        boxShadow: selected ? `0 0 0 1px ${OR}` : recommended ? '0 0 14px rgba(201,168,76,0.12)' : undefined
      }}
    >
      {recommended && (
        <span
          className="absolute -top-2 right-3 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
          style={{ background: OR, color: '#1a1410' }}
        >
          Recommandé
        </span>
      )}
      <div className="flex items-start gap-3">
        {icon && <span className="text-2xl leading-none flex-shrink-0">{icon}</span>}
        <div className="min-w-0">
          <p className="font-bold text-yellow-100" style={{ fontFamily: 'Georgia, serif' }}>
            {title}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </button>
  )
}

export function ChoiceGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 ${
        cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3'
      }`}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Barre de progression segmentée « n / total » des assistants.
export function StepProgress({
  current,
  total,
  labels
}: {
  current: number // 1-based
  total: number
  labels?: string[]
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
          Étape {current} / {total}
        </span>
        {labels && labels[current - 1] && (
          <span className="text-[11px] text-yellow-400/80">{labels[current - 1]}</span>
        )}
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all"
            style={{
              background: i < current ? OR : 'rgba(201,168,76,0.18)'
            }}
          />
        ))}
      </div>
    </div>
  )
}
