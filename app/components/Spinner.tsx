'use client'

// ============================================================================
// Spinner — anneau or pulsé, remplace les "Chargement..." textuels.
// Utilise les classes définies dans globals.css (.codex-spinner / .codex-loading)
// pour garder le style centralisé et thémé.
// ============================================================================

type SpinnerSize = 'sm' | 'md' | 'lg'

export default function Spinner({
  size = 'md',
  label,
  className = ''
}: {
  size?: SpinnerSize
  label?: string
  className?: string
}) {
  const sizeClass =
    size === 'sm' ? 'codex-spinner-sm' : size === 'lg' ? 'codex-spinner-lg' : ''
  if (label) {
    return (
      <span
        className={`codex-loading ${className}`}
        role="status"
        aria-live="polite"
      >
        <span className={`codex-spinner ${sizeClass}`} aria-hidden="true" />
        <span>{label}</span>
      </span>
    )
  }
  return (
    <span
      className={`codex-spinner ${sizeClass} ${className}`}
      role="status"
      aria-label="Chargement"
    />
  )
}
