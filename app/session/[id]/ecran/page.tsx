'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// /session/[id]/ecran — Écran partagé TV (Phase 4.4)
// ----------------------------------------------------------------------------
// Vue épurée destinée à la télé (setup PC+TV). Affiche en plein écran ce que le
// MJ diffuse (image + narration) et, si un combat est actif, la vue combat
// joueurs (timeline, états qualitatifs). Lecture seule, aucune distraction.
// ============================================================================

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchSession } from '@/app/lib/session'
import { fetchSessionState, type SessionState } from '@/app/lib/session-live'
import { useCombatEngine } from '@/app/lib/combat-engine'
import CombatVueJoueurs from '@/app/components/presentation/CombatVueJoueurs'

export default function EcranPartagePage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? '')
  const [scenarioId, setScenarioId] = useState<string | null>(null)
  const [etat, setEtat] = useState<SessionState | null>(null)
  const [pret, setPret] = useState(false)

  useEffect(() => {
    let annule = false
    const init = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/')
        return
      }
      const sess = await fetchSession(id)
      if (annule) return
      if (!sess) {
        router.replace('/dashboard')
        return
      }
      setScenarioId(sess.scenario_id)
      setEtat(await fetchSessionState(id))
      setPret(true)
    }
    void init()
    return () => {
      annule = true
    }
  }, [id, router])

  useEffect(() => {
    if (!pret) return
    const channel = supabase
      .channel(`ecran:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_state', filter: `session_id=eq.${id}` },
        () => void fetchSessionState(id).then(setEtat))
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, pret])

  return <EcranContenu scenarioId={scenarioId} etat={etat} />
}

function EcranContenu({ scenarioId, etat }: { scenarioId: string | null; etat: SessionState | null }) {
  const { combat, personnages, ennemis } = useCombatEngine(scenarioId, { isMj: false })

  if (combat && combat.actif) {
    return (
      <main className="min-h-screen p-4" style={{ background: '#0a0805' }}>
        <CombatVueJoueurs combat={combat} personnages={personnages} ennemis={ennemis} />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0a0805' }}>
      {etat?.broadcast_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={etat.broadcast_image_url} alt="" className="max-w-full max-h-[80vh] object-contain" />
      ) : (
        <div className="text-6xl opacity-30">🎲</div>
      )}
      {etat?.broadcast_text && (
        <p className="mt-6 max-w-3xl text-center text-2xl text-stone-100 px-6" style={{ fontFamily: 'Georgia, serif' }}>
          {etat.broadcast_text}
        </p>
      )}
    </main>
  )
}
