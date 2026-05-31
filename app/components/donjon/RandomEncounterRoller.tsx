'use client'

// ============================================================================
// Roadmap Modes 3.2 — Test d'une rencontre aléatoire dans une zone
// ----------------------------------------------------------------------------
// Le MJ clique sur "🎲 Test encounter" — l'app lance un d20, et si le résultat
// est ≤ probabilite_pour_20, déclenche le contenu de la zone (à valider
// manuellement par le MJ).
// ============================================================================

import { useState } from 'react'
import { toast } from '@/app/components/ui/Toast'

export type Zone = {
  id: string
  nom: string
  probabilite_pour_20: number
  type: 'combat' | 'dialogue' | 'loot' | 'piege'
  contenu: Record<string, unknown>
}

export default function RandomEncounterRoller({
  zone,
  onTrigger,
}: {
  zone: Zone
  onTrigger?: (z: Zone) => void
}) {
  const [dernierJet, setDernierJet] = useState<number | null>(null)

  const tester = () => {
    const d20 = Math.floor(Math.random() * 20) + 1
    setDernierJet(d20)
    if (d20 <= zone.probabilite_pour_20) {
      toast.success(`🎲 ${d20} — Encounter déclenchée : ${zone.nom}`)
      onTrigger?.(zone)
    } else {
      toast.info(`🎲 ${d20} / ≤${zone.probabilite_pour_20} — Rien ne se passe.`)
    }
  }

  return (
    <button
      type="button"
      onClick={tester}
      className="text-xs px-2 py-1 rounded border bg-gray-800 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 codex-btn-press inline-flex items-center gap-1"
      title={`Zone : ${zone.nom} — Probabilité ≤${zone.probabilite_pour_20}/20`}
    >
      🎲 {dernierJet ?? 'Test'} <span className="text-gray-500">/{zone.probabilite_pour_20}</span>
    </button>
  )
}
