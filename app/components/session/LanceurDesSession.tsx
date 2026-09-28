'use client'

// ============================================================================
// LanceurDesSession — le lanceur de dés DE L'APPLICATION, en séance (Delta B)
// ----------------------------------------------------------------------------
// On ne maintient pas un second lanceur pour le mode session : on réutilise
// `DiceLauncher`, celui du reste de l'app (dés 3D, sons, critiques, historique).
// Deux ajustements seulement :
//   · il est rendu dans un PORTAIL vers document.body, pour que sa modale ne
//     puisse jamais se retrouver piégée derrière la roue ni décalée par un
//     ancêtre porteur de transform / filter / backdrop-filter (piège CSS Delta D) ;
//   · on lui passe le contexte de séance : chaque jet part aussi dans
//     `session_events`, donc dans le journal de table.
//
// `BoutonDes` est le déclencheur rond : à droite au-dessus de la roue sur
// mobile, en bas de la colonne droite sur PC.
// ============================================================================

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import DiceLauncher, { type DiceSessionContext } from '@/app/components/DiceLauncher'
import { DiceFabIcon } from '@/app/components/DiceFabIcon'

export function ouvrirLanceurDes(): void {
  window.dispatchEvent(new CustomEvent('dice:open'))
}

export function BoutonDes({ className = '', taille = 52 }: { className?: string; taille?: number }) {
  return (
    <button
      type="button"
      onClick={ouvrirLanceurDes}
      aria-label="Ouvrir le lanceur de dés"
      title="Lanceur de dés"
      className={`dice-fab rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${className}`}
      style={{ width: taille, height: taille }}
    >
      {/* Même d20 que le bouton de dés du reste de l'app (bleu cobalt, « 20 »
          gravé en or) : pas de variante propre au mode session. */}
      <DiceFabIcon taille={Math.round(taille * 0.73)} />
    </button>
  )
}

export default function LanceurDesSession({ session }: { session: DiceSessionContext }) {
  const [monte, setMonte] = useState(false)
  useEffect(() => setMonte(true), [])
  if (!monte) return null
  // z-index 200 : au-dessus de la roue d'action MJ (z 90) et des modales de
  // diffusion (z 150) — la modale du lanceur ne doit jamais être piégée derrière
  // la roue (Delta B). `position: relative` ne crée PAS de bloc conteneur pour
  // `position: fixed` : l'ancrage au viewport reste intact.
  return createPortal(
    <div style={{ position: 'relative', zIndex: 200 }}>
      <DiceLauncher session={session} hideFab />
    </div>,
    document.body
  )
}
