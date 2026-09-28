'use client'

// ============================================================================
// ModaleDiffusion — saisie rapide déclenchée par la roue d'action MJ (Delta C.1)
// ----------------------------------------------------------------------------
// Image / Narration / Ambiance : trois surfaces minimales qui écrivent dans
// `session_state`. Le Realtime déjà en place fait apparaître le résultat
// IMMÉDIATEMENT chez tous les joueurs connectés.
//
// ⚠️ Rendue via le composant `Modal` de la couche ui/, qui porte lui-même la
// surface dans un portail vers document.body (piège CSS Delta D) : la roue et
// les colonnes du cockpit ne doivent jamais devenir le bloc conteneur d'une
// modale `position: fixed`. Modal gère aussi Échap et le verrou de défilement.
// ============================================================================

import { useEffect, useState } from 'react'
import Modal from '@/app/components/ui/Modal'
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

  return (
    <Modal
      open
      onClose={onFermer}
      title={TITRES[cible]}
      size="lg"
      footer={
        <>
          <button type="button" onClick={effacer} className="grim-btn codex-btn-press px-3 py-2 rounded-lg text-sm">
            Retirer
          </button>
          <button
            type="button"
            onClick={diffuser}
            className="codex-btn-press px-5 py-2 rounded-lg font-bold text-gray-900 bg-yellow-500"
          >
            Diffuser
          </button>
        </>
      }
    >
      {cible === 'narration' ? (
        <textarea
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          autoFocus
          placeholder="Texte poussé aux joueurs…"
          className="codex-input w-full h-40 resize-y"
        />
      ) : (
        <input
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          autoFocus
          placeholder={cible === 'image' ? "URL de l'image" : 'URL de la piste audio'}
          className="codex-input w-full"
        />
      )}

      {cible === 'image' && (
        <p className="text-gray-500 text-[11px] mt-1.5">
          Astuce : depuis « Lieux » ou « PNJ », un clic sur une image la diffuse directement.
        </p>
      )}
    </Modal>
  )
}
