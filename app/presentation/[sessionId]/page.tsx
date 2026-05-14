'use client'

// ============================================================================
// Écran joueurs PUBLIC — /presentation/[sessionId]
// ----------------------------------------------------------------------------
// Route publique : aucun login requis. Le MJ lance une diffusion depuis
// /dashboard/presentation → une ligne sessions_presentation est créée et reçoit
// en continu un snapshot complet ({scenario, etat, combat, personnages,
// ennemis}) dans etat_jeu. Cette page lit UNIQUEMENT sessions_presentation
// (lecture publique via RLS) et rejoue l'écran joueurs via <DisplayView>,
// synchronisé en temps réel.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  DisplayView,
  type ScenarioActif,
  type EtatPresentation,
  type CombatLite,
  type Persona,
  type Ennemi
} from '@/app/dashboard/presentation/page'

type Snapshot = {
  scenario?: ScenarioActif
  etat?: EtatPresentation | null
  combat?: CombatLite | null
  personnages?: Persona[]
  ennemis?: Ennemi[]
}

export default function PresentationPublique() {
  const params = useParams()
  const sessionId =
    typeof params?.sessionId === 'string' ? params.sessionId : ''
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'introuvable'>(
    'loading'
  )

  useEffect(() => {
    if (!sessionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('introuvable')
      return
    }
    let cancel = false

    const charger = async () => {
      const { data, error } = await supabase
        .from('sessions_presentation')
        .select('etat_jeu')
        .eq('id', sessionId)
        .maybeSingle()
      if (cancel) return
      if (error || !data) {
        setStatus('introuvable')
        return
      }
      setSnapshot((data.etat_jeu as Snapshot) ?? {})
      setStatus('ok')
    }
    charger()

    // Synchro temps réel : le snapshot est rejoué à chaque update du MJ.
    const channel = supabase
      .channel(`presentation-publique:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions_presentation',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const row = payload.new as { etat_jeu?: Snapshot }
          setSnapshot(row.etat_jeu ?? {})
        }
      )
      .subscribe()

    return () => {
      cancel = true
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const passerPleinEcran = () => {
    const el = rootRef.current ?? document.documentElement
    el.requestFullscreen?.().catch(() => {})
  }

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#05060a] text-gray-400 text-sm">
        Connexion à la diffusion…
      </main>
    )
  }

  if (status === 'introuvable') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#05060a] text-center px-6">
        <p
          className="text-yellow-500 text-lg font-bold mb-2"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Diffusion introuvable
        </p>
        <p className="text-gray-500 text-sm">
          Le lien est invalide ou la diffusion a été arrêtée par le MJ.
        </p>
      </main>
    )
  }

  const scenario = snapshot?.scenario
  if (!scenario) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#05060a] text-center px-6">
        <p
          className="text-[#C9A84C] text-lg"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          En attente du MJ…
        </p>
        <p className="text-gray-500 text-sm mt-2">
          L&apos;écran s&apos;affichera dès que le MJ aura ouvert la présentation.
        </p>
      </main>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={passerPleinEcran}
        aria-label="Passer en plein écran"
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 120,
          padding: '8px 14px',
          fontSize: 12,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(201,168,76,0.7)',
          background: 'rgba(10,11,13,0.7)',
          border: '1px solid rgba(201,168,76,0.3)',
          borderRadius: 6,
          cursor: 'pointer'
        }}
      >
        ⛶ Plein écran
      </button>
      <DisplayView
        root={rootRef}
        scenario={scenario}
        etat={snapshot?.etat ?? null}
        combat={snapshot?.combat ?? null}
        personnages={snapshot?.personnages ?? []}
        ennemis={snapshot?.ennemis ?? []}
      />
    </>
  )
}
