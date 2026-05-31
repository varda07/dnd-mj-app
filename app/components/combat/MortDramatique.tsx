'use client'

// ============================================================================
// Roadmap Modes 2.7 — Animation "Mort dramatique"
// ----------------------------------------------------------------------------
// Overlay plein écran qui s'assombrit, texte "X est tombé(e) au combat".
// Pour un boss : prompt narratif au porteur du coup fatal ("Décris ta mise
// à mort"). Le texte est ensuite poussable à l'écran narratif.
// ============================================================================

import { useEffect, useState } from 'react'

export type MortDramatiqueData = {
  victime: string
  isBoss: boolean
  /** Qui a porté le coup fatal (pour le prompt narratif si boss) */
  porteurCoupFatal?: string
}

export default function MortDramatique({
  data,
  onClose,
  onNarrationSubmit,
}: {
  data: MortDramatiqueData | null
  onClose: () => void
  /** Appelé avec le texte narratif (pour boss seulement) — à pousser comme narration. */
  onNarrationSubmit?: (texte: string) => void
}) {
  const [phase, setPhase] = useState<'dark' | 'text' | 'narratif' | 'done'>('dark')
  const [narratif, setNarratif] = useState('')

  useEffect(() => {
    if (!data) { setPhase('dark'); setNarratif(''); return }
    setPhase('dark')
    const t1 = setTimeout(() => setPhase('text'), 800)
    let t2: ReturnType<typeof setTimeout> | null = null
    if (data.isBoss) {
      t2 = setTimeout(() => setPhase('narratif'), 2800)
    } else {
      t2 = setTimeout(() => { setPhase('done'); onClose() }, 3800)
    }
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2) }
  }, [data, onClose])

  if (!data) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, textAlign: 'center',
        animation: 'codex-modal-overlay-in 0.8s ease both',
      }}
    >
      {phase !== 'narratif' && (
        <div style={{
          fontFamily: 'Georgia, serif',
          fontSize: data.isBoss ? 48 : 36,
          color: data.isBoss ? '#fbbf24' : '#fca5a5',
          textShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 80px rgba(248,113,113,0.3)',
          opacity: phase === 'dark' ? 0 : 1,
          transform: phase === 'dark' ? 'scale(0.92)' : 'scale(1)',
          transition: 'opacity 1s ease, transform 1s ease',
          letterSpacing: '0.04em',
        }}>
          {data.isBoss ? `${data.victime} est vaincu.` : `${data.victime} est tombé(e) au combat.`}
        </div>
      )}

      {phase === 'narratif' && data.isBoss && (
        <div style={{ maxWidth: 600, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#fbbf24' }}>
            Comment veux-tu tuer cet ennemi ?
          </div>
          {data.porteurCoupFatal && (
            <div style={{ fontSize: 13, color: 'rgba(232,232,236,0.7)', fontStyle: 'italic' }}>
              {data.porteurCoupFatal} a porté le coup fatal.
            </div>
          )}
          <textarea
            value={narratif}
            onChange={(e) => setNarratif(e.target.value)}
            placeholder="Décris la mise à mort…"
            autoFocus
            style={{
              width: '100%',
              minHeight: 120,
              padding: 12,
              background: 'rgba(20,23,29,0.95)',
              border: '1px solid rgba(201,168,76,0.4)',
              borderRadius: 8,
              color: '#fef3c7',
              fontFamily: 'Georgia, serif',
              fontSize: 15,
            }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { onClose() }}
              style={{ padding: '8px 14px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(232,232,236,0.7)', cursor: 'pointer' }}
            >Passer</button>
            <button type="button"
              onClick={() => { if (narratif.trim()) onNarrationSubmit?.(narratif.trim()); onClose() }}
              disabled={!narratif.trim()}
              style={{
                padding: '8px 14px', borderRadius: 6,
                background: 'linear-gradient(180deg, #C9A84C 0%, #8d7a2d 100%)',
                border: '1px solid rgba(201,168,76,0.4)',
                color: '#0a0c10', fontWeight: 'bold', cursor: 'pointer',
                opacity: narratif.trim() ? 1 : 0.4,
              }}
            >📜 Pousser à l&apos;écran</button>
          </div>
        </div>
      )}
    </div>
  )
}
