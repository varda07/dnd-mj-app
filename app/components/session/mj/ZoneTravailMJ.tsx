'use client'

// ============================================================================
// Zone de travail — colonne CENTRALE du cockpit MJ (Delta C.3)
// ----------------------------------------------------------------------------
// Son contenu change selon l'entrée sélectionnée dans « Ma préparation » :
//   · Chapitre   — aperçu de ce qui est diffusé + texte du chapitre ;
//   · Lieux/PNJ  — éléments liés au scénario, clic image = diffusion ;
//   · Rencontres — lancement d'un combat préparé ;
//   · Combat     — le cockpit de combat existant (timeline + fiches de créature
//                  avec PV exacts, CA, attaques, résistances, immunités, tactique) ;
//   · Notes      — notes de séance et notes secrètes du scénario.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ElementsScenarioPanel from '@/app/components/presentation/ElementsScenarioPanel'
import CombatCockpitMJ from '@/app/components/presentation/CombatCockpitMJ'
import type { FogState } from '@/app/components/presentation/CombatCarte'
import { loadCombatsPrepares, type CombatPrepare } from '@/app/lib/combats-prepares'
import type { SessionState } from '@/app/lib/session-live'
import type { useCombatEngine } from '@/app/lib/combat-engine'
import type { VueMJ } from './vues'

type NoteSession = { id?: string; titre?: string; date?: string; contenu?: string }

export default function ZoneTravailMJ({
  scenarioId,
  vue,
  chapitreSel,
  etat,
  onPatchState,
  combatApi,
  onLancerRencontre
}: {
  scenarioId: string
  vue: VueMJ
  chapitreSel: string | null
  etat: SessionState | null
  onPatchState: (patch: Partial<SessionState>) => void
  combatApi: ReturnType<typeof useCombatEngine>
  onLancerRencontre: (cp: CombatPrepare) => void
}) {
  const [chapitre, setChapitre] = useState<{ titre: string; contenu: string | null } | null>(null)
  const [rencontres, setRencontres] = useState<CombatPrepare[]>([])
  const [notes, setNotes] = useState<NoteSession[]>([])
  const [notesSecretes, setNotesSecretes] = useState('')

  const idChapitre = chapitreSel ?? etat?.current_chapter_id ?? null

  useEffect(() => {
    let annule = false
    if (vue !== 'chapitre' || !idChapitre) {
      setChapitre(null)
      return
    }
    supabase
      .from('chapitres')
      .select('titre, contenu')
      .eq('id', idChapitre)
      .maybeSingle()
      .then(({ data }) => {
        if (!annule) setChapitre((data as { titre: string; contenu: string | null }) ?? null)
      })
    return () => {
      annule = true
    }
  }, [vue, idChapitre])

  const chargerRencontres = useCallback(async () => {
    setRencontres(await loadCombatsPrepares(scenarioId))
  }, [scenarioId])

  useEffect(() => {
    if (vue === 'rencontres') void chargerRencontres()
  }, [vue, chargerRencontres])

  useEffect(() => {
    let annule = false
    if (vue !== 'notes') return
    supabase
      .from('scenarios')
      .select('notes_sessions, notes_secretes')
      .eq('id', scenarioId)
      .maybeSingle()
      .then(({ data }) => {
        if (annule) return
        const ns = (data?.notes_sessions as NoteSession[]) ?? []
        setNotes(Array.isArray(ns) ? ns : [])
        setNotesSecretes((data?.notes_secretes as string) ?? '')
      })
    return () => {
      annule = true
    }
  }, [vue, scenarioId])

  if (vue === 'combat') {
    return (
      <CombatCockpitMJ
        combat={combatApi.combat}
        personnages={combatApi.personnages}
        ennemis={combatApi.ennemis}
        onModifierHp={combatApi.modifierHp}
        onToggleCondition={combatApi.toggleCondition}
        onClearConditions={combatApi.clearConditions}
        onTourSuivant={combatApi.tourSuivant}
        onTourPrecedent={combatApi.tourPrecedent}
        onTerminer={combatApi.terminer}
        onLancer={() => combatApi.lancer()}
        onMoveJeton={combatApi.deplacerJeton}
        onToggleCarteVisible={combatApi.toggleCarteVisible}
        onTogglePause={combatApi.togglePause}
        enPause={combatApi.combat?.en_pause}
        onFogChange={(fog: FogState) => combatApi.sauverCombat({ fog })}
        carteBackground={null}
      />
    )
  }

  if (vue === 'lieux' || vue === 'pnj') {
    return (
      <div className="space-y-2">
        <h2 className="text-xs uppercase tracking-widest text-yellow-600">
          Contenu lié — clic sur une image pour la diffuser
        </h2>
        <ElementsScenarioPanel
          scenarioId={scenarioId}
          onAfficherImage={(url) => onPatchState({ broadcast_image_url: url })}
          imageActive={etat?.broadcast_image_url}
        />
      </div>
    )
  }

  if (vue === 'rencontres') {
    return (
      <div className="space-y-2 max-w-2xl">
        <h2 className="text-xs uppercase tracking-widest text-yellow-600">Rencontres préparées</h2>
        {rencontres.length === 0 ? (
          <p className="text-stone-500 text-sm italic">Aucune rencontre préparée pour ce scénario.</p>
        ) : (
          <ul className="space-y-1.5">
            {rencontres.map((cp) => (
              <li key={cp.id} className="flex items-center gap-2 rounded-lg border border-yellow-800/25 bg-stone-900/40 px-3 py-2">
                <span className="flex-1 min-w-0 text-yellow-100 text-sm truncate">⚔️ {cp.nom}</span>
                <span className="text-stone-500 text-xs">{cp.participants?.length ?? 0} participants</span>
                <button type="button" onClick={() => onLancerRencontre(cp)}
                  className="px-2.5 py-1 rounded bg-[#C9A84C] text-gray-900 text-xs font-bold">▶ Lancer</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  if (vue === 'notes') {
    return (
      <div className="space-y-3 max-w-2xl">
        <h2 className="text-xs uppercase tracking-widest text-yellow-600">Notes</h2>
        {notesSecretes.trim() && (
          <p className="text-stone-300 text-sm whitespace-pre-wrap rounded-lg border border-yellow-800/20 bg-stone-900/30 p-2.5">
            {notesSecretes}
          </p>
        )}
        {notes.length === 0 && !notesSecretes.trim() ? (
          <p className="text-stone-500 text-sm italic">Aucune note pour ce scénario.</p>
        ) : (
          <ul className="space-y-1">
            {notes.map((n, i) => (
              <li key={n.id ?? i} className="rounded border border-yellow-800/15 bg-stone-900/30 px-2.5 py-1.5">
                <p className="text-yellow-100 text-sm font-medium">{n.titre || 'Note'}</p>
                {n.contenu && <p className="text-stone-400 text-xs whitespace-pre-wrap">{n.contenu}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // vue === 'chapitre' : aperçu de ce qui est diffusé + contenu du chapitre.
  return (
    <div className="space-y-4 max-w-3xl">
      <section>
        <h2 className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">Ce que voient les joueurs</h2>
        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(0,0,0,0.3)' }}>
          {etat?.broadcast_image_url ? (
            <div className="flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={etat.broadcast_image_url} alt="" className="max-h-40 rounded border border-yellow-800/30" />
              <button type="button" onClick={() => onPatchState({ broadcast_image_url: null })}
                className="text-red-300 text-xs underline flex-shrink-0">Retirer</button>
            </div>
          ) : (
            <p className="text-stone-600 text-xs italic">Aucune image diffusée.</p>
          )}
          {etat?.broadcast_text ? (
            <div className="flex items-start gap-2">
              <p className="flex-1 text-stone-200 text-sm whitespace-pre-wrap" style={{ fontFamily: 'Georgia, serif' }}>
                {etat.broadcast_text}
              </p>
              <button type="button" onClick={() => onPatchState({ broadcast_text: null })}
                className="text-red-300 text-xs underline flex-shrink-0">Effacer</button>
            </div>
          ) : (
            <p className="text-stone-600 text-xs italic">Aucune narration diffusée.</p>
          )}
          {etat?.ambient_sound?.piste ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-stone-400 text-xs truncate">🎵 {etat.ambient_sound.piste}</p>
              <button type="button" onClick={() => onPatchState({ ambient_sound: null })}
                className="text-red-300 text-xs underline flex-shrink-0">Stop</button>
            </div>
          ) : (
            <p className="text-stone-600 text-xs italic">Aucune ambiance sonore.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">
          {chapitre ? chapitre.titre : 'Chapitre'}
        </h2>
        {chapitre?.contenu ? (
          <p className="text-stone-300 text-sm whitespace-pre-wrap leading-relaxed">{chapitre.contenu}</p>
        ) : (
          <p className="text-stone-500 text-sm italic">
            Sélectionne un chapitre à gauche, ou marque-le comme chapitre courant avec l’étoile.
          </p>
        )}
      </section>
    </div>
  )
}
