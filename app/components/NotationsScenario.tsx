'use client'

// ============================================================================
// Roadmap 9.3 — Étoiles + commentaires sur scénarios
// ----------------------------------------------------------------------------
// Bloc de notation réutilisable pour un scénario partagé : moyenne + nombre
// d'avis, formulaire de note (1-5 étoiles + commentaire) pour l'utilisateur
// courant, et liste des commentaires. Repliable.
// Table : notations_scenarios (cf. migration 20260515050000_roadmap_phase9).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Notation = {
  id: string
  user_id: string
  etoiles: number
  commentaire: string
  created_at: string
}

function Etoiles({
  note,
  onPick
}: {
  note: number
  onPick?: (n: number) => void
}) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onPick}
          onClick={() => onPick?.(n)}
          className={onPick ? 'cursor-pointer' : 'cursor-default'}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
        >
          <span className={n <= note ? 'text-yellow-400' : 'text-gray-600'}>
            ★
          </span>
        </button>
      ))}
    </span>
  )
}

export default function NotationsScenario({
  scenarioId
}: {
  scenarioId: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const [notations, setNotations] = useState<Notation[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [maNote, setMaNote] = useState(5)
  const [monComm, setMonComm] = useState('')
  const [actif, setActif] = useState(true)
  const [message, setMessage] = useState('')

  const charger = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)
    const { data, error } = await supabase
      .from('notations_scenarios')
      .select('id, user_id, etoiles, commentaire, created_at')
      .eq('scenario_id', scenarioId)
      .order('created_at', { ascending: false })
    if (error) {
      setActif(false)
      return
    }
    const liste = (data ?? []) as Notation[]
    setNotations(liste)
    if (user) {
      const mienne = liste.find((n) => n.user_id === user.id)
      if (mienne) {
        setMaNote(mienne.etoiles)
        setMonComm(mienne.commentaire)
      }
    }
  }, [scenarioId])

  useEffect(() => {
    charger()
  }, [charger])

  const envoyer = async () => {
    if (!userId) return
    setMessage('')
    const { error } = await supabase.from('notations_scenarios').upsert(
      {
        scenario_id: scenarioId,
        user_id: userId,
        etoiles: maNote,
        commentaire: monComm.trim()
      },
      { onConflict: 'scenario_id,user_id' }
    )
    if (error) {
      setMessage(`Erreur : ${error.message}`)
      return
    }
    setMessage('✓ Avis enregistré.')
    charger()
  }

  if (!actif) return null

  const moyenne =
    notations.length > 0
      ? notations.reduce((s, n) => s + n.etoiles, 0) / notations.length
      : 0

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="text-[11px] text-gray-400 hover:text-yellow-300 inline-flex items-center gap-1.5"
      >
        <Etoiles note={Math.round(moyenne)} />
        {notations.length > 0 ? (
          <span>
            {moyenne.toFixed(1)} · {notations.length} avis
          </span>
        ) : (
          <span>Aucun avis</span>
        )}
        <span className="text-gray-600">{ouvert ? '▾' : '▸'}</span>
      </button>

      {ouvert && (
        <div className="mt-2 rounded border border-gray-700 bg-black/30 p-3 space-y-3">
          {userId ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400">Ma note :</span>
                <Etoiles note={maNote} onPick={setMaNote} />
              </div>
              <textarea
                value={monComm}
                onChange={(e) => setMonComm(e.target.value)}
                placeholder="Commentaire (optionnel)…"
                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-xs h-14"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={envoyer}
                  className="px-3 py-1.5 rounded bg-yellow-500 text-gray-900 text-xs font-bold"
                >
                  Publier mon avis
                </button>
                {message && (
                  <span className="text-[11px] text-yellow-400">{message}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-gray-500 italic">
              Connecte-toi pour laisser un avis.
            </p>
          )}

          {notations.length > 0 && (
            <ul className="space-y-2 pt-1 border-t border-gray-700">
              {notations.map((n) => (
                <li key={n.id} className="text-xs">
                  <Etoiles note={n.etoiles} />
                  {n.commentaire && (
                    <span className="text-gray-300 ml-2">{n.commentaire}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
