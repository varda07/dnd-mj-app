'use client'

// Onglet « Scène » (Phase 3.4) — ce que le MJ diffuse (image/texte/son) et, si
// un combat est actif, bascule en vue combat joueur (timeline, mon tour, états
// qualitatifs des ennemis, « Fin de mon tour »).

import { useEffect, useRef, useState } from 'react'
import { useCombatEngine, resolveEntiteId } from '@/app/lib/combat-engine'
import CombatVueJoueurs from '@/app/components/presentation/CombatVueJoueurs'
import { logSessionEvent, type SessionState } from '@/app/lib/session-live'

export default function OngletScene({
  sessionId,
  scenarioId,
  characterId,
  characterNom,
  sessionState
}: {
  sessionId: string
  scenarioId: string
  characterId: string | null
  characterNom: string
  sessionState: SessionState | null
}) {
  const { combat, personnages, ennemis } = useCombatEngine(scenarioId, { isMj: false })
  const [plein, setPlein] = useState(false)
  const dejaVibre = useRef<string | null>(null)

  // Mon tour ?
  const entree = combat?.ordre_initiative?.[combat.tour_actuel ?? 0]
  const monTour = !!combat?.actif && !!characterId && resolveEntiteId(entree ?? null) === characterId

  // Vibration mobile au passage de mon tour.
  useEffect(() => {
    if (monTour) {
      const cle = `${combat?.round}-${combat?.tour_actuel}`
      if (dejaVibre.current !== cle) {
        dejaVibre.current = cle
        try {
          navigator.vibrate?.([120, 60, 120])
        } catch {}
      }
    }
  }, [monTour, combat?.round, combat?.tour_actuel])

  const finDeTour = () => {
    void logSessionEvent(
      sessionId,
      'narration',
      { action: 'fin_tour', nom: characterNom },
      characterId
    )
  }

  if (combat && combat.actif) {
    return (
      <div className="space-y-3">
        {monTour && (
          <div className="rounded-lg border px-3 py-2 text-center animate-pulse"
            style={{ borderColor: 'rgba(74,222,128,0.5)', background: 'rgba(74,222,128,0.12)' }}>
            <p className="text-green-300 font-bold">🎯 C'est ton tour !</p>
          </div>
        )}
        <CombatVueJoueurs combat={combat} personnages={personnages} ennemis={ennemis} />
        {monTour && (
          <button type="button" onClick={finDeTour}
            className="w-full py-3 rounded-lg font-bold text-gray-900 bg-[#C9A84C] hover:brightness-110">
            ✔ Fin de mon tour
          </button>
        )}
      </div>
    )
  }

  const img = sessionState?.broadcast_image_url
  const texte = sessionState?.broadcast_text
  const son = sessionState?.ambient_sound

  return (
    <div className="space-y-4">
      {img ? (
        <button type="button" onClick={() => setPlein(true)} className="block w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="Scène" className="w-full rounded-xl border border-yellow-800/30 object-cover max-h-72" />
        </button>
      ) : (
        <div className="rounded-xl border border-yellow-800/20 bg-stone-900/40 py-12 text-center">
          <p className="text-stone-500 text-sm italic">Le MJ n'a rien diffusé pour l'instant.</p>
        </div>
      )}

      {texte && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(201,168,76,0.3)', background: 'rgba(0,0,0,0.3)' }}>
          <p className="text-stone-200 text-sm whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
            {texte}
          </p>
        </div>
      )}

      {son?.piste && (
        <p className="text-center text-stone-500 text-xs">🎵 Ambiance en cours{son.en_lecture === false ? ' (en pause)' : ''}</p>
      )}

      {plein && img && (
        <div className="fixed inset-0 z-[140] bg-black flex items-center justify-center p-2" onClick={() => setPlein(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="Scène" className="max-w-full max-h-full object-contain" />
          <button type="button" onClick={() => setPlein(false)} className="absolute top-3 right-3 text-white text-2xl">✕</button>
        </div>
      )}
    </div>
  )
}
