'use client'

// ============================================================================
// ZoneDiffusion — ce que le MJ pousse à la table (Delta A.5)
// ----------------------------------------------------------------------------
// Remplace l'ancien onglet « Scène » : ce n'est plus un onglet, c'est une zone
// permanente (centre de l'écran sur PC, bandeau haut sur mobile).
//
//   · image / narration / ambiance sonore en temps réel ;
//   · image agrandissable en plein écran (portail vers document.body) ;
//   · JAMAIS vide : sans diffusion, elle affiche le journal de table en direct ;
//   · en combat sur mobile, elle bascule sur la vue combat (timeline + états
//     QUALITATIFS des autres — jamais les PV exacts des ennemis).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { resolveEntiteId, type EngineCombat } from '@/app/lib/combat-engine'
import type { Ennemi, Persona } from '@/app/lib/combat-types'
import CombatVueJoueurs from '@/app/components/presentation/CombatVueJoueurs'
import { useModalEffects } from '@/app/components/ui/Modal'
import type { SessionState } from '@/app/lib/session-live'
import { demanderFinDeTour } from '@/app/lib/session-tour'
import JournalTable from './JournalTable'
import LecteurAmbiance from './LecteurAmbiance'

export default function ZoneDiffusion({
  sessionId,
  characterId,
  characterNom,
  userId,
  sessionState,
  combat,
  personnages,
  ennemis
}: {
  sessionId: string
  characterId: string | null
  characterNom: string
  userId: string | null
  sessionState: SessionState | null
  combat: EngineCombat | null
  personnages: Persona[]
  ennemis: Ennemi[]
}) {
  const [plein, setPlein] = useState(false)
  const dejaVibre = useRef<string | null>(null)

  const quitterPlein = useCallback(() => setPlein(false), [])
  useModalEffects(plein, quitterPlein)

  const enCombat = !!combat?.actif
  const entree = combat?.ordre_initiative?.[combat.tour_actuel ?? 0]
  const monTour = enCombat && !!characterId && resolveEntiteId(entree ?? null) === characterId

  // Vibration mobile au passage de mon tour.
  useEffect(() => {
    if (!monTour) return
    const cle = `${combat?.round}-${combat?.tour_actuel}`
    if (dejaVibre.current === cle) return
    dejaVibre.current = cle
    try {
      navigator.vibrate?.([120, 60, 120])
    } catch {
      /* vibration indisponible */
    }
  }, [monTour, combat?.round, combat?.tour_actuel])

  const img = sessionState?.broadcast_image_url ?? null
  const texte = sessionState?.broadcast_text ?? null
  const son = sessionState?.ambient_sound ?? null
  const rienDeDiffuse = !img && !texte

  return (
    <div className="flex flex-col gap-3 min-h-0">
      {/* Vue combat — mobile/tablette uniquement : sur PC, l'ordre des tours
          vit dans la colonne de droite (même composant, deux dispositions). */}
      {enCombat && combat && (
        <div className="lg:hidden">
          <CombatVueJoueurs combat={combat} personnages={personnages} ennemis={ennemis} />
        </div>
      )}

      {/* Image diffusée */}
      {img && (
        <button type="button" onClick={() => setPlein(true)} className="block w-full" title="Agrandir">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt="Scène diffusée par le MJ"
            className="w-full rounded-xl border border-yellow-800/30 object-contain bg-black/40 max-h-[38vh] lg:max-h-[52vh]"
          />
        </button>
      )}

      {/* Narration diffusée */}
      {texte && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(201,168,76,0.3)', background: 'rgba(0,0,0,0.3)' }}>
          <p className="text-stone-200 text-sm whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
            {texte}
          </p>
        </div>
      )}

      {/* Ambiance sonore (lecture locale, volume par joueur) */}
      <LecteurAmbiance son={son} />

      {/* Jamais vide : à défaut de diffusion, le journal de table en direct */}
      {rienDeDiffuse && (
        <div className="flex-1 min-h-0 rounded-xl border p-2.5" style={{ borderColor: 'rgba(201,168,76,0.2)', background: 'rgba(0,0,0,0.25)' }}>
          <JournalTable sessionId={sessionId} userId={userId} titre="Journal de table" />
        </div>
      )}

      {/* C'est ton tour + fin de tour */}
      {monTour && (
        <div className="mt-auto space-y-2">
          <div className="rounded-lg border px-3 py-2 text-center animate-pulse"
            style={{ borderColor: 'rgba(74,222,128,0.5)', background: 'rgba(74,222,128,0.12)' }}>
            <p className="text-green-300 font-bold">🎯 C’est ton tour !</p>
          </div>
          <button
            type="button"
            onClick={() => void demanderFinDeTour(sessionId, characterId, characterNom)}
            className="w-full py-3 rounded-lg font-bold text-gray-900 bg-[#C9A84C] hover:brightness-110"
          >
            ✔ Fin de mon tour
          </button>
        </div>
      )}

      {/* Visionneuse plein écran — portail vers document.body : l'ancrage
          viewport ne doit dépendre d'aucun ancêtre (piège CSS, Delta D). */}
      {plein && img && createPortal(
        <div className="fixed inset-0 z-[140] bg-black flex items-center justify-center p-2"
          role="dialog" aria-modal="true" onClick={() => setPlein(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="Scène diffusée par le MJ" className="max-w-full max-h-full object-contain" />
          <button type="button" onClick={() => setPlein(false)} className="absolute top-3 right-3 text-white text-2xl" aria-label="Fermer">✕</button>
        </div>,
        document.body
      )}
    </div>
  )
}
