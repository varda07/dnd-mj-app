'use client'

// ============================================================================
// Roadmap Modes 2.10 — Tour automatique pour ennemis faibles (CR < 1)
// ----------------------------------------------------------------------------
// Bouton à afficher sur un ennemi de CR < 1. Au clic :
// - choisit la cible la plus proche/faible (ici, le PJ avec le plus bas HP)
// - lance d20 + bonus d'attaque (par défaut +2 si non spécifié)
// - applique dégâts simples (1d6+1 par défaut) si touche
// - callback onDone({cibleId, hit, degats})
// ============================================================================

import { useState } from 'react'
import { toast } from '@/app/components/ui/Toast'
import { haptic } from '@/app/lib/haptic'

type Cible = { id: string; nom: string; ca: number; hp_actuel: number }

export default function TourRapideButton({
  ennemiNom,
  cr,
  bonusAttaque = 2,
  expressionDegats = '1d6+1',
  cibles,
  onDone,
}: {
  ennemiNom: string
  cr?: number
  bonusAttaque?: number
  expressionDegats?: string
  cibles: Cible[]
  onDone?: (result: { cibleId: string; cibleNom: string; jet: number; total: number; touche: boolean; degats: number }) => void
}) {
  const [running, setRunning] = useState(false)

  // Affiche uniquement si CR < 1
  if (cr !== undefined && cr >= 1) return null
  if (cibles.length === 0) return null

  const jouer = async () => {
    setRunning(true)
    // Cible : PJ avec le plus bas HP
    const cible = [...cibles].sort((a, b) => a.hp_actuel - b.hp_actuel)[0]
    const jet = Math.floor(Math.random() * 20) + 1
    const total = jet + bonusAttaque
    const touche = total >= cible.ca || jet === 20
    let degats = 0
    if (touche) {
      // Parse "XdY+Z"
      const m = expressionDegats.replace(/\s/g, '').match(/^(\d+)d(\d+)([+\-]\d+)?$/i)
      if (m) {
        const n = parseInt(m[1]), faces = parseInt(m[2]), bonus = m[3] ? parseInt(m[3]) : 0
        for (let i = 0; i < n; i++) degats += Math.floor(Math.random() * faces) + 1
        degats += bonus
        if (jet === 20) {
          for (let i = 0; i < n; i++) degats += Math.floor(Math.random() * faces) + 1
        }
      }
      haptic.tap()
      toast.success(`${ennemiNom} → ${cible.nom} : ${degats} dégâts (jet ${jet})`)
    } else {
      toast.info(`${ennemiNom} manque ${cible.nom} (jet ${total})`)
    }
    onDone?.({ cibleId: cible.id, cibleNom: cible.nom, jet, total, touche, degats })
    setRunning(false)
  }

  return (
    <button
      type="button"
      onClick={jouer}
      disabled={running}
      className="text-[11px] px-2 py-1 rounded border bg-yellow-500/10 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/20 codex-btn-press disabled:opacity-40"
      title="Tour automatique : attaque la cible la plus faible (CR < 1)"
    >
      {running ? '⏳' : '⚡'} Tour auto
    </button>
  )
}
