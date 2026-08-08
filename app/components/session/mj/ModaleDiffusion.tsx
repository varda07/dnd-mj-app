'use client'

// ============================================================================
// ModaleDiffusion — saisie rapide déclenchée par la roue d'action MJ (Delta C.1)
// ----------------------------------------------------------------------------
// Image / Narration / Ambiance : trois surfaces minimales qui écrivent dans
// `session_state`. Le Realtime déjà en place fait apparaître le résultat
// IMMÉDIATEMENT chez tous les joueurs connectés.
//
// ⚠️ Rendue dans un portail vers document.body (piège CSS Delta D) : la roue et
// les colonnes du cockpit ne doivent jamais devenir le bloc conteneur d'une
// modale `position: fixed`.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useModalEffects } from '@/app/components/ui/Modal'
import type { SessionState } from '@/app/lib/session-live'

export type CibleDiffusion = 'image' | 'narration' | 'sons'

const TITRES: Record<CibleDiffusion, string> = {
  image: 'Diffuser une image',
  narration: 'Diffuser une narration',
  sons: 'Ambiance sonore'
}

export default function ModaleDiffusion({
  cible,
  etat,
  onFermer,
  onPatchState
}: {
  cible: CibleDiffusion | null
  etat: SessionState | null
  onFermer: () => void
  onPatchState: (patch: Partial<SessionState>) => void
}) {
  const [valeur, setValeur] = useState('')
  const fermer = useCallback(() => onFermer(), [onFermer])
  useModalEffects(cible !== null, fermer)

  // Pré-remplit avec ce qui est déjà diffusé à l'ouverture.
  useEffect(() => {
    if (!cible) return
    setValeur(
      cible === 'image'
        ? etat?.broadcast_image_url ?? ''
        : cible === 'narration'
          ? etat?.broadcast_text ?? ''
          : etat?.ambient_sound?.piste ?? ''
    )
    // On ne suit volontairement pas `etat` : la saisie en cours ne doit pas être
    // écrasée par un rafraîchissement Realtime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cible])

  if (!cible) return null
  if (typeof window === 'undefined') return null

  const diffuser = () => {
    const v = valeur.trim()
    if (cible === 'image') onPatchState({ broadcast_image_url: v || null })
    else if (cible === 'narration') onPatchState({ broadcast_text: v || null })
    else onPatchState({ ambient_sound: v ? { piste: v, volume: 50, en_lecture: true } : null })
    onFermer()
  }

  const effacer = () => {
    if (cible === 'image') onPatchState({ broadcast_image_url: null })
    else if (cible === 'narration') onPatchState({ broadcast_text: null })
    else onPatchState({ ambient_sound: null })
    setValeur('')
    onFermer()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[150] bg-black/70 flex items-end sm:items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onFermer() }}
    >
      <div className="w-full max-w-lg rounded-2xl border-2 p-4" style={{ background: '#15110a', borderColor: 'rgba(201,168,76,0.5)' }}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-lg" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>
            {TITRES[cible]}
          </h3>
          <button type="button" onClick={onFermer} className="text-stone-400 text-xl leading-none" aria-label="Fermer">✕</button>
        </div>

        {cible === 'narration' ? (
          <textarea
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            autoFocus
            placeholder="Texte poussé aux joueurs…"
            className="w-full h-40 bg-stone-900/60 border border-yellow-800/30 rounded p-2.5 text-sm text-gray-200 outline-none resize-y"
          />
        ) : (
          <input
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            autoFocus
            placeholder={cible === 'image' ? "URL de l'image" : 'URL de la piste audio'}
            className="w-full bg-stone-900/60 border border-yellow-800/30 rounded px-2.5 py-2 text-sm text-gray-200 outline-none"
          />
        )}

        {cible === 'image' && (
          <p className="text-stone-600 text-[11px] mt-1.5">
            Astuce : depuis « Lieux » ou « PNJ », un clic sur une image la diffuse directement.
          </p>
        )}

        <div className="flex gap-2 mt-3">
          <button type="button" onClick={diffuser} className="flex-1 py-2 rounded-lg font-bold text-gray-900 bg-[#C9A84C]">
            Diffuser
          </button>
          <button type="button" onClick={effacer} className="px-3 py-2 rounded-lg border border-yellow-800/40 text-yellow-200 text-sm">
            Retirer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
