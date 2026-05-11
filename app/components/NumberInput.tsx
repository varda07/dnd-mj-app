'use client'

// ============================================================================
// NumberInput — wrapper de <input type="number"> qui autorise le champ vide
// pendant l'édition (sinon impossible d'effacer le premier chiffre).
//
// Pattern :
//   - on garde un buffer string local (peut être '', '-', '1.', etc.)
//   - on parse / clamp uniquement au blur ou à Enter (= commit)
//   - on resynchronise depuis la prop `value` UNIQUEMENT quand value change
//     côté parent (jamais pendant que l'utilisateur tape, sinon écrasement)
// ============================================================================

import { useEffect, useRef, useState } from 'react'

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: number
  onChange: (n: number) => void
  /** Valeur appliquée au commit si le champ est vide. Par défaut 0. */
  fallback?: number
  min?: number
  max?: number
  /** Autorise les décimaux (sinon parseInt). Par défaut false. */
  allowFloat?: boolean
}

export default function NumberInput({
  value,
  onChange,
  fallback = 0,
  min,
  max,
  allowFloat = false,
  onBlur,
  onKeyDown,
  ...rest
}: Props) {
  const [str, setStr] = useState<string>(() =>
    Number.isFinite(value) ? String(value) : ''
  )
  // Garde trace de la dernière valeur reçue depuis le parent pour ne
  // resynchroniser que sur changement externe.
  const lastExternal = useRef<number>(value)

  useEffect(() => {
    if (lastExternal.current !== value) {
      lastExternal.current = value
      setStr(Number.isFinite(value) ? String(value) : '')
    }
  }, [value])

  const commit = () => {
    // Vide ou intermédiaire ('-', '.', '-.') → on retombe sur fallback
    if (str === '' || str === '-' || str === '.' || str === '-.') {
      const v = fallback
      setStr(String(v))
      if (v !== value) onChange(v)
      lastExternal.current = v
      return
    }
    let n = allowFloat ? parseFloat(str) : parseInt(str, 10)
    if (!Number.isFinite(n)) n = fallback
    if (typeof min === 'number') n = Math.max(min, n)
    if (typeof max === 'number') n = Math.min(max, n)
    const display = String(n)
    setStr(display)
    if (n !== value) onChange(n)
    lastExternal.current = n
  }

  return (
    <input
      {...rest}
      type="number"
      inputMode={allowFloat ? 'decimal' : 'numeric'}
      value={str}
      onChange={(e) => setStr(e.target.value)}
      onBlur={(e) => {
        commit()
        onBlur?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          ;(e.currentTarget as HTMLInputElement).blur()
        }
        onKeyDown?.(e)
      }}
    />
  )
}
