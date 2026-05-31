'use client'

// ============================================================================
// Roadmap Modes 1.5 — Viewer sondage côté joueurs (route publique)
// ----------------------------------------------------------------------------
// Affiche le sondage actif et permet de voter. Une fois voté, montre soit
// "Merci pour ton vote", soit les résultats si le MJ les a poussés.
// Dédup par voter_key (uuid local persistant en localStorage).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Option = { id: string; label: string }
type Sondage = {
  id: string
  session_id: string
  question: string
  options: Option[]
  actif: boolean
  resultats_pousses: boolean
}
type Vote = { sondage_id: string; option_id: string; voter_key: string }

function voterKey(): string {
  if (typeof window === 'undefined') return 'anon'
  try {
    const k = window.localStorage.getItem('presentation_voter_key')
    if (k) return k
    const fresh = `v-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
    window.localStorage.setItem('presentation_voter_key', fresh)
    return fresh
  } catch {
    return `v-${Math.random().toString(36).slice(2, 10)}`
  }
}

export default function SondageViewer({ sessionId }: { sessionId: string }) {
  const [sondage, setSondage] = useState<Sondage | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])
  const [monVote, setMonVote] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from('sondages_session')
      .select('*')
      .eq('session_id', sessionId)
      .eq('actif', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setSondage((data as Sondage | null) ?? null)
    if (data) {
      const s = data as Sondage
      const k = voterKey()
      const { data: mien } = await supabase
        .from('votes_sondages').select('option_id').eq('sondage_id', s.id).eq('voter_key', k).maybeSingle()
      setMonVote((mien?.option_id as string | undefined) ?? null)
      if (s.resultats_pousses || mien) {
        const { data: vs } = await supabase
          .from('votes_sondages').select('sondage_id, option_id, voter_key').eq('sondage_id', s.id)
        setVotes((vs ?? []) as Vote[])
      }
    } else {
      setVotes([]); setMonVote(null)
    }
  }, [sessionId])

  useEffect(() => { void charger() }, [charger])

  // Realtime sur sondages (nouveau, clôture, toggle résultats)
  useEffect(() => {
    if (!sessionId) return
    const ch = supabase
      .channel(`sondages-viewer:${sessionId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sondages_session', filter: `session_id=eq.${sessionId}` },
        () => { void charger() })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes_sondages' },
        (p) => {
          const v = p.new as Vote
          if (sondage && v.sondage_id === sondage.id) setVotes((curr) => [...curr, v])
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId, charger, sondage])

  const voter = async (oid: string) => {
    if (!sondage || submitting || monVote) return
    setSubmitting(true)
    const k = voterKey()
    const { error } = await supabase
      .from('votes_sondages')
      .insert({ sondage_id: sondage.id, option_id: oid, voter_key: k })
    setSubmitting(false)
    if (!error) {
      setMonVote(oid)
      // Recharge pour avoir les résultats si poussés
      void charger()
    }
  }

  if (!sondage) return null

  const total = votes.length
  const showResults = sondage.resultats_pousses || !!monVote

  return (
    <div
      style={{
        position: 'fixed',
        top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100,
        background: 'linear-gradient(180deg, #14171dee 0%, #0a0c10ee 100%)',
        border: '1px solid rgba(201,168,76,0.48)',
        borderRadius: 12,
        padding: '14px 18px',
        maxWidth: 480,
        width: 'calc(100vw - 32px)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.55), 0 0 24px rgba(201,168,76,0.18)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em',
        color: 'rgba(201,168,76,0.7)', marginBottom: 6,
      }}>
        📊 Sondage du MJ
      </div>
      <div style={{
        fontFamily: 'Georgia, serif', fontSize: 17, color: '#fef3c7', marginBottom: 12,
      }}>
        {sondage.question}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sondage.options.map((o) => {
          const n = votes.filter((v) => v.option_id === o.id).length
          const pct = total > 0 ? Math.round((n / total) * 100) : 0
          const choisi = monVote === o.id
          return (
            <button
              key={o.id}
              type="button"
              disabled={!!monVote || submitting}
              onClick={() => voter(o.id)}
              style={{
                position: 'relative',
                padding: '10px 14px',
                borderRadius: 8,
                border: choisi ? '2px solid #C9A84C' : '1px solid rgba(255,255,255,0.12)',
                background: choisi ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.04)',
                color: '#e8e8ec',
                cursor: monVote || submitting ? 'default' : 'pointer',
                textAlign: 'left',
                fontSize: 14,
                overflow: 'hidden',
              }}
            >
              {showResults && (
                <div style={{
                  position: 'absolute', inset: 0, width: `${pct}%`,
                  background: 'linear-gradient(90deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.08) 100%)',
                  transition: 'width 0.4s',
                }} aria-hidden />
              )}
              <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>{choisi ? '✓ ' : ''}{o.label}</span>
                {showResults && (
                  <span style={{ color: '#C9A84C', fontWeight: 'bold' }}>{n} ({pct}%)</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      {monVote && !sondage.resultats_pousses && (
        <div style={{ fontSize: 11, color: 'rgba(232,232,236,0.5)', marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
          Merci pour ton vote — résultats en attente.
        </div>
      )}
    </div>
  )
}
