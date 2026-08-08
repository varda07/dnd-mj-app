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
      className={`rounded-full flex items-center justify-center flex-shrink-0 border-2 shadow-lg active:scale-95 transition ${className}`}
      style={{
        width: taille,
        height: taille,
        background: 'radial-gradient(circle at 30% 25%, #2a2114, #12100a)',
        borderColor: 'rgba(201,168,76,0.6)'
      }}
    >
      <span style={{ fontSize: taille * 0.42, lineHeight: 1 }} aria-hidden>
        🎲
      </span>
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
