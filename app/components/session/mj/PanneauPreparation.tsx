'use client'

// Panneau « Ma préparation » (Phase 4.1) — chapitres (marquer le courant →
// session_state), éléments liés (PNJ/ennemis/maps/items via ElementsScenarioPanel,
// diffusion d'image), rencontres préparées (lancer en combat), notes.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ElementsScenarioPanel from '@/app/components/presentation/ElementsScenarioPanel'
import { loadCombatsPrepares, lancerCombatPrepare, type CombatPrepare } from '@/app/lib/combats-prepares'
import type { SessionState } from '@/app/lib/session-live'

type Chapitre = { id: string; titre: string; contenu: string | null; ordre: number | null }
type NoteSession = { id?: string; titre?: string; date?: string; contenu?: string }

export default function PanneauPreparation({
  sessionId,
  scenarioId,
  etat,
  onPatchState
}: {
  sessionId: string
  scenarioId: string
  etat: SessionState | null
  onPatchState: (patch: Partial<SessionState>) => void
}) {
  const [chapitres, setChapitres] = useState<Chapitre[]>([])
  const [rencontres, setRencontres] = useState<CombatPrepare[]>([])
  const [notes, setNotes] = useState<NoteSession[]>([])
  const [notesSecretes, setNotesSecretes] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')

  const charger = useCallback(async () => {
    const [{ data: chap }, rencs, { data: scn }] = await Promise.all([
      supabase.from('chapitres').select('id, titre, contenu, ordre').eq('scenario_id', scenarioId).order('ordre', { ascending: true }),
      loadCombatsPrepares(scenarioId),
      supabase.from('scenarios').select('notes_sessions, notes_secretes').eq('id', scenarioId).maybeSingle()
    ])
    setChapitres((chap ?? []) as Chapitre[])
    setRencontres(rencs)
    const ns = (scn?.notes_sessions as NoteSession[]) ?? []
    setNotes(Array.isArray(ns) ? ns : [])
    setNotesSecretes((scn?.notes_secretes as string) ?? '')
  }, [scenarioId])

  useEffect(() => {
    void charger()
  }, [charger])

  const filtre = (t: string) => t.toLowerCase().includes(q.toLowerCase())
  const chapitresFiltres = q
    ? chapitres.filter((c) => filtre(c.titre) || filtre(c.contenu ?? ''))
    : chapitres

  const lancerRencontre = async (cp: CombatPrepare) => {
    setMsg('')
    const res = await lancerCombatPrepare(cp, 'rapide')
    if (res) {
      // Récupère l'id du combat pour le référencer dans l'état de session.
      const { data } = await supabase.from('combats').select('id').eq('scenario_id', scenarioId).maybeSingle()
      if (data?.id) onPatchState({ active_combat_id: data.id as string })
      setMsg(`⚔️ Rencontre « ${cp.nom} » lancée — va dans Outils live › Combat.`)
    } else {
      setMsg('Impossible de lancer cette rencontre.')
    }
  }

  return (
    <div className="space-y-5">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Rechercher dans la préparation…"
        className="w-full bg-stone-900/60 border border-yellow-800/30 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none" />

      {msg && <p className="text-sm text-yellow-300">{msg}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chapitres */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Chapitres</h2>
          {chapitresFiltres.length === 0 ? (
            <p className="text-stone-500 text-sm italic">Aucun chapitre.</p>
          ) : (
            <ul className="space-y-1.5">
              {chapitresFiltres.map((c) => {
                const actuel = etat?.current_chapter_id === c.id
                return (
                  <li key={c.id} className={`rounded-lg border px-3 py-2 ${actuel ? 'border-amber-400 bg-amber-900/20' : 'border-yellow-800/25 bg-stone-900/40'}`}>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 min-w-0 text-yellow-100 text-sm font-medium truncate">{c.titre}</span>
                      <button type="button" onClick={() => onPatchState({ current_chapter_id: actuel ? null : c.id })}
                        className={`px-2 py-1 rounded text-xs font-bold ${actuel ? 'bg-amber-500 text-gray-900' : 'bg-stone-800 border border-yellow-800/40 text-yellow-200'}`}>
                        {actuel ? '★ Actuel' : 'Marquer'}
                      </button>
                    </div>
                    {c.contenu && <p className="text-stone-500 text-xs mt-1 line-clamp-2">{c.contenu}</p>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Rencontres préparées */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Rencontres préparées</h2>
          {rencontres.length === 0 ? (
            <p className="text-stone-500 text-sm italic">Aucune rencontre préparée.</p>
          ) : (
            <ul className="space-y-1.5">
              {rencontres.map((cp) => (
                <li key={cp.id} className="flex items-center gap-2 rounded-lg border border-yellow-800/25 bg-stone-900/40 px-3 py-2">
                  <span className="flex-1 min-w-0 text-yellow-100 text-sm truncate">⚔️ {cp.nom}</span>
                  <span className="text-stone-500 text-xs">{cp.participants?.length ?? 0} part.</span>
                  <button type="button" onClick={() => lancerRencontre(cp)}
                    className="px-2.5 py-1 rounded bg-[#C9A84C] text-gray-900 text-xs font-bold">▶ Lancer</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Éléments liés (PNJ / ennemis / maps / items) */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Contenu lié — clic image pour diffuser</h2>
        <ElementsScenarioPanel
          scenarioId={scenarioId}
          onAfficherImage={(url) => onPatchState({ broadcast_image_url: url })}
          imageActive={etat?.broadcast_image_url}
        />
      </section>

      {/* Notes */}
      {(notes.length > 0 || notesSecretes.trim()) && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Notes</h2>
          {notesSecretes.trim() && (
            <p className="text-stone-300 text-sm whitespace-pre-wrap mb-2 rounded-lg border border-yellow-800/20 bg-stone-900/30 p-2">{notesSecretes}</p>
          )}
          <ul className="space-y-1">
            {notes.map((n, i) => (
              <li key={n.id ?? i} className="rounded border border-yellow-800/15 bg-stone-900/30 px-2.5 py-1.5">
                <p className="text-yellow-100 text-sm font-medium">{n.titre || 'Note'}</p>
                {n.contenu && <p className="text-stone-400 text-xs whitespace-pre-wrap">{n.contenu}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
