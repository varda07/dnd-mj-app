'use client'

// ============================================================================
// « Ma préparation » — colonne GAUCHE du cockpit MJ (Delta C.3)
// ----------------------------------------------------------------------------
// Liste compacte et cliquable : chapitre en cours, Lieux, PNJ, Rencontres,
// Combat en cours, Notes — avec compteurs et recherche rapide. L'entrée
// sélectionnée pilote la zone de travail centrale ; un clic sur une rencontre
// préparée lance directement le combat (combat-engine.ts).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { loadCombatsPrepares, type CombatPrepare } from '@/app/lib/combats-prepares'
import type { SessionState } from '@/app/lib/session-live'
import { LABEL_VUE, type VueMJ } from './vues'

export type Chapitre = { id: string; titre: string; contenu: string | null; ordre: number | null }

export default function PanneauPreparation({
  scenarioId,
  etat,
  vue,
  chapitreSel,
  combatActif,
  onSelectVue,
  onSelectChapitre,
  onMarquerChapitre,
  onLancerRencontre
}: {
  scenarioId: string
  etat: SessionState | null
  vue: VueMJ
  chapitreSel: string | null
  combatActif: boolean
  onSelectVue: (v: VueMJ) => void
  onSelectChapitre: (id: string) => void
  onMarquerChapitre: (id: string | null) => void
  onLancerRencontre: (cp: CombatPrepare) => void
}) {
  const [chapitres, setChapitres] = useState<Chapitre[]>([])
  const [rencontres, setRencontres] = useState<CombatPrepare[]>([])
  const [compteurs, setCompteurs] = useState<{ pnj: number; map: number; item: number }>({ pnj: 0, map: 0, item: 0 })
  const [nbNotes, setNbNotes] = useState(0)
  const [q, setQ] = useState('')
  const [deplie, setDeplie] = useState<VueMJ | null>('chapitre')

  const charger = useCallback(async () => {
    const [{ data: chap }, rencs, { data: liens }, { data: scn }] = await Promise.all([
      supabase.from('chapitres').select('id, titre, contenu, ordre').eq('scenario_id', scenarioId).order('ordre', { ascending: true }),
      loadCombatsPrepares(scenarioId),
      supabase.from('scenario_liens').select('element_type').eq('scenario_id', scenarioId),
      supabase.from('scenarios').select('notes_sessions').eq('id', scenarioId).maybeSingle()
    ])
    setChapitres((chap ?? []) as Chapitre[])
    setRencontres(rencs)
    const c = { pnj: 0, map: 0, item: 0 }
    for (const l of (liens ?? []) as Array<{ element_type: string }>) {
      if (l.element_type === 'pnj') c.pnj += 1
      else if (l.element_type === 'map') c.map += 1
      else if (l.element_type === 'item') c.item += 1
    }
    setCompteurs(c)
    const ns = (scn?.notes_sessions as unknown[]) ?? []
    setNbNotes(Array.isArray(ns) ? ns.length : 0)
  }, [scenarioId])

  useEffect(() => {
    void charger()
  }, [charger])

  const filtre = (t: string) => t.toLowerCase().includes(q.toLowerCase())
  const chapitresFiltres = q ? chapitres.filter((c) => filtre(c.titre) || filtre(c.contenu ?? '')) : chapitres
  const rencontresFiltrees = q ? rencontres.filter((r) => filtre(r.nom)) : rencontres

  const basculer = (v: VueMJ) => {
    onSelectVue(v)
    setDeplie((d) => (d === v ? null : v))
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔎 Rechercher…"
        className="flex-shrink-0 w-full bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1 text-xs text-gray-200 outline-none mb-2"
      />

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
        {/* Chapitres */}
        <Entree
          label={LABEL_VUE.chapitre}
          icone="📖"
          compteur={chapitres.length}
          actif={vue === 'chapitre'}
          onClick={() => basculer('chapitre')}
        />
        {deplie === 'chapitre' && (
          <ul className="space-y-0.5 pl-1">
            {chapitresFiltres.length === 0 && <SousVide texte="Aucun chapitre." />}
            {chapitresFiltres.map((c) => {
              const courant = etat?.current_chapter_id === c.id
              return (
                <li key={c.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectChapitre(c.id)}
                    className={`flex-1 min-w-0 text-left text-[11px] px-1.5 py-1 rounded truncate ${
                      chapitreSel === c.id ? 'bg-stone-800 text-yellow-100' : 'text-stone-400 hover:text-yellow-200'
                    }`}
                  >
                    {courant ? '★ ' : ''}
                    {c.titre}
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarquerChapitre(courant ? null : c.id)}
                    title={courant ? 'Chapitre courant — cliquer pour retirer' : 'Marquer comme chapitre courant'}
                    className={`flex-shrink-0 text-[10px] px-1 py-0.5 rounded ${
                      courant ? 'bg-amber-500 text-gray-900' : 'border border-yellow-800/40 text-yellow-500'
                    }`}
                  >
                    ★
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <Entree label={LABEL_VUE.lieux} icone="🗺️" compteur={compteurs.map} actif={vue === 'lieux'} onClick={() => basculer('lieux')} />
        <Entree label={LABEL_VUE.pnj} icone="🧑" compteur={compteurs.pnj} actif={vue === 'pnj'} onClick={() => basculer('pnj')} />

        {/* Rencontres préparées */}
        <Entree
          label={LABEL_VUE.rencontres}
          icone="⚔️"
          compteur={rencontres.length}
          actif={vue === 'rencontres'}
          onClick={() => basculer('rencontres')}
        />
        {deplie === 'rencontres' && (
          <ul className="space-y-0.5 pl-1">
            {rencontresFiltrees.length === 0 && <SousVide texte="Aucune rencontre préparée." />}
            {rencontresFiltrees.map((cp) => (
              <li key={cp.id}>
                <button
                  type="button"
                  onClick={() => onLancerRencontre(cp)}
                  title="Lancer cette rencontre en combat"
                  className="w-full flex items-center gap-1 text-left text-[11px] px-1.5 py-1 rounded text-stone-400 hover:text-yellow-200 hover:bg-stone-800"
                >
                  <span className="flex-1 min-w-0 truncate">{cp.nom}</span>
                  <span className="text-stone-600">{cp.participants?.length ?? 0}</span>
                  <span className="text-amber-400">▶</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <Entree
          label={LABEL_VUE.combat}
          icone="🎯"
          compteur={combatActif ? 1 : 0}
          actif={vue === 'combat'}
          onClick={() => basculer('combat')}
          alerte={combatActif}
        />
        <Entree label={LABEL_VUE.notes} icone="📝" compteur={nbNotes} actif={vue === 'notes'} onClick={() => basculer('notes')} />
      </div>
    </div>
  )
}

function Entree({
  label,
  icone,
  compteur,
  actif,
  onClick,
  alerte = false
}: {
  label: string
  icone: string
  compteur: number
  actif: boolean
  onClick: () => void
  alerte?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold border ${
        actif
          ? 'border-amber-500/50 bg-stone-900/70 text-yellow-100'
          : 'border-transparent text-stone-400 hover:text-yellow-200 hover:bg-stone-900/40'
      }`}
    >
      <span aria-hidden>{icone}</span>
      <span className="flex-1 min-w-0 truncate text-left">{label}</span>
      <span className={`text-[10px] px-1 rounded ${alerte ? 'bg-red-800/60 text-red-100' : 'text-stone-600'}`}>
        {compteur}
      </span>
    </button>
  )
}

function SousVide({ texte }: { texte: string }) {
  return <li className="text-[11px] text-stone-600 italic px-1.5 py-1">{texte}</li>
}
