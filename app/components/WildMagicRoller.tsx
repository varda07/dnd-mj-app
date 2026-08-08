'use client'

// ============================================================================
// WildMagicRoller — Roadmap Phase 5
// ============================================================================
// Composant autonome (modal + bouton flottant) qui permet au MJ de :
//   - Roll un effet de Wild Magic (manuel via bouton, ou auto sur d20=1)
//   - Choisir s'il affiche ou non l'effet aux joueurs (mode présentation)
// L'effet en cours est stocké en localStorage + diffusé via Supabase
// (presentation_etats) pour la sync avec l'écran joueurs.
// ============================================================================

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { rollWildMagicAvecValeur, type WildMagicEffet } from '@/app/data/wild_magic_table'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'wild_magic_last'

type Props = {
  scenarioId?: string | null
  // Affiche le bouton flottant en bas-droite (true par défaut). Sinon, le
  // parent rend lui-même le déclencheur et passe ouvert/onClose.
  flottant?: boolean
  ouvert?: boolean
  onClose?: () => void
}

export default function WildMagicRoller({ scenarioId, flottant = true, ouvert: ouvertProp, onClose }: Props) {
  const [ouvertInterne, setOuvertInterne] = useState(false)
  const [effet, setEffet] = useState<WildMagicEffet | null>(null)
  const [valeur, setValeur] = useState<number | null>(null)
  const [visiblePourJoueurs, setVisiblePourJoueurs] = useState(false)
  // Portail : la modale doit s'ancrer au viewport quel que soit son ancêtre
  // (un parent porteur de transform / filter la décalerait — piège CSS connu).
  const [monte, setMonte] = useState(false)
  useEffect(() => setMonte(true), [])

  const ouvert = ouvertProp ?? ouvertInterne

  const fermer = () => {
    setOuvertInterne(false)
    onClose?.()
  }

  const lancer = () => {
    const { valeur, effet: e } = rollWildMagicAvecValeur()
    setEffet(e)
    setValeur(valeur)
    setVisiblePourJoueurs(false)
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(e)) } catch {}
  }

  const toggleVisible = async () => {
    const next = !visiblePourJoueurs
    setVisiblePourJoueurs(next)
    if (!scenarioId || !effet) return
    // Sync écran joueurs via presentation_etats.wild_magic
    const wildMagicPayload = next ? { titre: effet.titre, description: effet.description } : null
    await supabase
      .from('presentation_etats')
      .upsert({ scenario_id: scenarioId, wild_magic: wildMagicPayload, updated_at: new Date().toISOString() })
      .select()
  }

  return (
    <>
      {flottant && !ouvert && (
        <button
          type="button"
          onClick={() => setOuvertInterne(true)}
          aria-label="Wild Magic — table d'effets"
          title="Wild Magic — roll un effet de magie sauvage"
          // Roadmap 1.7 — sidebar à droite : le FAB est en bas-gauche, juste
          // au-dessus du lanceur de dés (60px de dé + 12px de gap = ~72px).
          // V1 3.3 — bottom bar mobile supprimée : plus de réserve de 56px.
          className="wild-magic-fab fixed z-[60] h-11 w-11 rounded-full bg-gradient-to-br from-purple-700 to-fuchsia-900 border border-[#C9A84C] text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
          style={{
            left: 'calc(max(24px, env(safe-area-inset-left)) + 8px)',
            bottom: `calc(env(safe-area-inset-bottom) + 24px + 60px + 12px)`
          }}
        >
          <span aria-hidden="true">✨</span>
        </button>
      )}
      <style>{`
        @media (min-width: 768px) {
          .wild-magic-fab {
            bottom: calc(max(24px, env(safe-area-inset-bottom)) + 60px + 12px) !important;
          }
        }
      `}</style>

      {ouvert && monte && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[160] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/70" onClick={fermer} />
          <div
            className="relative z-[1] w-full max-w-lg rounded-lg p-5 border border-[rgba(201,168,76,0.30)]"
            style={{
              background: 'radial-gradient(ellipse at top, #1a1429 0%, #0f0a18 80%)',
              boxShadow: '0 0 30px rgba(168,85,247,0.25)',
              fontFamily: 'Georgia, serif'
            }}
          >
            <header className="flex items-center justify-between mb-4 pb-2 border-b border-[rgba(201,168,76,0.20)]">
              <h2 className="text-xl font-bold text-[#C9A84C]">✨ Magie Sauvage</h2>
              <button
                type="button"
                onClick={fermer}
                aria-label="Fermer"
                className="text-[#a8a8b0] hover:text-white text-2xl leading-none"
              >
                ✕
              </button>
            </header>

            {!effet ? (
              <div className="text-center py-6">
                <p className="text-[#a8a8b0] mb-4 text-sm">
                  Roll un d100 sur la table officielle Wild Magic D&D 5e.
                </p>
                <button
                  type="button"
                  onClick={lancer}
                  className="px-6 py-3 bg-fuchsia-700 hover:bg-fuchsia-600 text-white rounded-lg font-bold tracking-wide shadow-lg uppercase text-sm"
                >
                  🎲 Roll d100
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded p-4 border border-fuchsia-800/40 bg-fuchsia-950/30">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-fuchsia-300 mb-1 flex items-center justify-between">
                    <span>Effet déclenché</span>
                    {valeur != null && (
                      <span className="text-fuchsia-200 font-mono normal-case tracking-normal">
                        🎲 d100 = {valeur}
                      </span>
                    )}
                  </p>
                  <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                    {effet.titre}
                  </h3>
                  <p className="text-sm text-[#d8d8e0] leading-relaxed">{effet.description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={lancer}
                    className="flex-1 px-4 py-2 bg-[#1a1d24] border border-[rgba(201,168,76,0.30)] hover:border-[#C9A84C] text-[#C9A84C] rounded font-bold text-xs uppercase tracking-wider"
                  >
                    🎲 Re-roll
                  </button>
                  <button
                    type="button"
                    onClick={toggleVisible}
                    className={`flex-1 px-4 py-2 rounded font-bold text-xs uppercase tracking-wider transition-all ${
                      visiblePourJoueurs
                        ? 'bg-green-700 text-white border border-green-500'
                        : 'bg-[#1a1d24] border border-[rgba(201,168,76,0.30)] hover:border-[#C9A84C] text-[#C9A84C]'
                    }`}
                  >
                    {visiblePourJoueurs ? '👁 Visible' : '🙈 MJ seul'}
                  </button>
                </div>
                {scenarioId && (
                  <p className="text-[10px] text-[#6a6a72] text-center italic">
                    {visiblePourJoueurs
                      ? 'L\'effet est diffusé sur l\'écran joueurs.'
                      : 'Effet caché aux joueurs.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
