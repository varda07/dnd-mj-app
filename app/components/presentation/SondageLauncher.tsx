'use client'

// ============================================================================
// Roadmap Modes 1.5 — Sondages rapides (MJ → joueurs)
// ----------------------------------------------------------------------------
// Bouton "📊 Sondage" → modale (question + 2-4 options) → push à la session.
// Les joueurs votent depuis la vue publique. Les résultats live arrivent en
// realtime côté MJ. Toggle "Afficher les résultats aux joueurs".
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/app/components/ui/Modal'
import { toast } from '@/app/components/ui/Toast'
import { logHistorique } from './HistoriqueSessionPanel'

type Option = { id: string; label: string }
type Sondage = {
  id: string
  question: string
  options: Option[]
  actif: boolean
  resultats_pousses: boolean
  created_at: string
}
type Vote = { sondage_id: string; option_id: string; voter_key: string }

export default function SondageLauncher({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['Oui', 'Non'])
  const [actifCourant, setActifCourant] = useState<Sondage | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])

  const chargerActif = useCallback(async () => {
    const { data } = await supabase
      .from('sondages_session')
      .select('*')
      .eq('session_id', sessionId)
      .eq('actif', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setActifCourant((data as Sondage | null) ?? null)
    if (data) {
      const { data: vs } = await supabase
        .from('votes_sondages').select('sondage_id, option_id, voter_key').eq('sondage_id', (data as Sondage).id)
      setVotes((vs ?? []) as Vote[])
    } else {
      setVotes([])
    }
  }, [sessionId])

  useEffect(() => { void chargerActif() }, [chargerActif])

  // Realtime sur votes
  useEffect(() => {
    if (!actifCourant) return
    const ch = supabase
      .channel(`votes:${actifCourant.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes_sondages', filter: `sondage_id=eq.${actifCourant.id}` },
        (payload) => setVotes((curr) => [...curr, payload.new as Vote])
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [actifCourant])

  const lancer = async () => {
    const opts: Option[] = options
      .map((label, i) => ({ id: String.fromCharCode(97 + i), label: label.trim() }))
      .filter((o) => o.label.length > 0)
    if (!question.trim() || opts.length < 2) {
      toast.error('Il faut une question + au moins 2 options.')
      return
    }
    // Désactive les sondages précédents
    await supabase
      .from('sondages_session')
      .update({ actif: false })
      .eq('session_id', sessionId)
      .eq('actif', true)
    const { data, error } = await supabase
      .from('sondages_session')
      .insert({ session_id: sessionId, question: question.trim(), options: opts })
      .select('*').single()
    if (error) { toast.error(error.message); return }
    toast.success('Sondage envoyé aux joueurs')
    void logHistorique(sessionId, 'sondage', `Sondage : ${question.trim()}`, { sondage_id: (data as Sondage).id })
    setOpen(false)
    setQuestion('')
    setOptions(['Oui', 'Non'])
    setActifCourant(data as Sondage)
  }

  const cloturer = async () => {
    if (!actifCourant) return
    await supabase.from('sondages_session').update({ actif: false }).eq('id', actifCourant.id)
    toast.info('Sondage clôturé')
    setActifCourant(null)
    setVotes([])
  }

  const togglePousseResultats = async () => {
    if (!actifCourant) return
    const next = !actifCourant.resultats_pousses
    await supabase.from('sondages_session').update({ resultats_pousses: next }).eq('id', actifCourant.id)
    setActifCourant({ ...actifCourant, resultats_pousses: next })
  }

  const compte = (oid: string) => votes.filter((v) => v.option_id === oid).length
  const total = votes.length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2 py-0.5 rounded text-xs font-bold border bg-gray-900/50 border-gray-700 text-gray-100 hover:border-yellow-500/40 inline-flex items-center gap-1"
        title="Lancer un sondage rapide"
      >
        📊 Sondage{actifCourant ? ` (${total})` : ''}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="📊 Sondage rapide"
        footer={
          <>
            {actifCourant && (
              <button type="button" onClick={cloturer} className="px-3 py-2 rounded bg-gray-800 border border-red-500/30 text-red-300 text-sm">
                Clôturer le sondage actif
              </button>
            )}
            <button type="button" onClick={lancer} className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold text-sm">
              {actifCourant ? 'Remplacer par un nouveau' : 'Lancer'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          {actifCourant && (
            <div className="codex-card p-3">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Sondage en cours</div>
              <div className="text-yellow-300 font-serif" style={{ fontFamily: 'Georgia, serif' }}>{actifCourant.question}</div>
              <ul className="mt-2 space-y-1">
                {actifCourant.options.map((o) => {
                  const n = compte(o.id)
                  const pct = total > 0 ? Math.round((n / total) * 100) : 0
                  return (
                    <li key={o.id} className="text-xs">
                      <div className="flex justify-between text-gray-300"><span>{o.label}</span><span>{n} ({pct}%)</span></div>
                      <div className="h-1.5 bg-gray-800 rounded mt-0.5 overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: `${pct}%`, transition: 'width 0.4s' }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
              <label className="flex items-center gap-2 mt-3 text-xs text-gray-300 cursor-pointer">
                <input type="checkbox" checked={actifCourant.resultats_pousses} onChange={togglePousseResultats} />
                Afficher les résultats aux joueurs
              </label>
            </div>
          )}
          <label className="text-xs text-gray-400">
            Question
            <input value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="Vous attaquez ou parlementez ?"
              className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
          </label>
          <div>
            <div className="text-xs text-gray-400 mb-1">Options (2 à 4)</div>
            <div className="flex flex-col gap-1">
              {options.map((o, i) => (
                <div key={i} className="flex gap-1">
                  <input value={o} onChange={(e) => setOptions((arr) => arr.map((x, j) => j === i ? e.target.value : x))}
                    className="flex-1 p-2 rounded bg-gray-800 border border-gray-700 text-white text-xs" />
                  {options.length > 2 && (
                    <button type="button" onClick={() => setOptions((arr) => arr.filter((_, j) => j !== i))}
                      className="px-2 text-red-400 text-xs">✕</button>
                  )}
                </div>
              ))}
              {options.length < 4 && (
                <button type="button" onClick={() => setOptions((arr) => [...arr, ''])}
                  className="text-xs px-2 py-1 rounded bg-gray-800 border border-yellow-500/30 text-yellow-300 self-start">+ Ajouter une option</button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
