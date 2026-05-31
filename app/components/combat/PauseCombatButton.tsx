'use client'

// ============================================================================
// Roadmap Modes 2.11 — Pause / reprise de combat
// ----------------------------------------------------------------------------
// Bouton "⏸ Pause et sauvegarder" qui met combats.en_pause = true et persiste
// l'instant de pause. Le bouton "▶ Reprendre" remet en_pause = false.
// ============================================================================

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'

export default function PauseCombatButton({
  combatId,
  enPause,
  onChange,
}: {
  combatId: string
  enPause: boolean
  onChange?: (enPause: boolean) => void
}) {
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    const next = !enPause
    const { error } = await supabase
      .from('combats')
      .update({ en_pause: next, pause_a: next ? new Date().toISOString() : null })
      .eq('id', combatId)
    setLoading(false)
    if (error) toast.error(error.message)
    else {
      toast.success(next ? 'Combat sauvegardé en pause' : 'Combat repris')
      onChange?.(next)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-3 py-1.5 rounded border codex-btn-press ${
        enPause
          ? 'bg-green-500/15 border-green-400/50 text-green-200'
          : 'bg-gray-800 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10'
      } disabled:opacity-40`}
      title={enPause ? 'Reprendre le combat' : 'Mettre le combat en pause (l\'état est sauvegardé)'}
    >
      {enPause ? '▶ Reprendre le combat' : '⏸ Pause et sauvegarder'}
    </button>
  )
}
