'use client'

// ============================================================================
// TimelineInitiative — ordre des tours vertical (Delta A.5 / A.6)
// ----------------------------------------------------------------------------
// Colonne droite du poste joueur sur PC, et vue combat mobile. Affiche le score
// d'initiative de chaque combattant, met en avant celui dont c'est le tour, et
// n'expose des adversaires QUE leur état qualitatif — jamais leurs PV exacts.
// ============================================================================

import { etatQualitatif, resolveEntiteId, type EngineCombat } from '@/app/lib/combat-engine'
import type { Ennemi, Persona } from '@/app/lib/combat-types'

export default function TimelineInitiative({
  combat,
  personnages,
  ennemis,
  characterId,
  titre = 'Ordre des tours'
}: {
  combat: EngineCombat | null
  personnages: Persona[]
  ennemis: Ennemi[]
  characterId: string | null
  titre?: string | null
}) {
  if (!combat?.actif || !combat.ordre_initiative?.length) {
    return (
      <div>
        {titre && <p className="text-[10px] uppercase tracking-widest text-yellow-600 mb-1.5">{titre}</p>}
        <p className="text-stone-500 text-xs italic">Aucun combat en cours.</p>
      </div>
    )
  }

  const ordre = combat.ordre_initiative
  const parPerso = new Map(personnages.map((p) => [p.id, p]))
  const parEnnemi = new Map(ennemis.map((e) => [e.id, e]))

  return (
    <div className="min-h-0 flex flex-col">
      {titre && (
        <p className="text-[10px] uppercase tracking-widest text-yellow-600 mb-1.5 flex-shrink-0">
          {titre} · round {combat.round}
        </p>
      )}
      <ul className="space-y-1 overflow-y-auto min-h-0">
        {ordre.map((e, i) => {
          const id = resolveEntiteId(e)
          const estMoi = !!characterId && id === characterId
          const actuel = i === combat.tour_actuel
          const ennemi = e.kind === 'ennemi' && id ? parEnnemi.get(id) : null
          const perso = e.kind !== 'ennemi' && id ? parPerso.get(id) : null
          const etat = ennemi ? etatQualitatif(ennemi.hp_actuel, ennemi.hp_max) : null
          return (
            <li
              key={e.piece_id ?? `${e.nom}-${i}`}
              className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${
                actuel
                  ? 'border-amber-400 bg-amber-900/25 text-yellow-100'
                  : 'border-yellow-800/15 bg-stone-900/30 text-stone-300'
              } ${i < combat.tour_actuel ? 'opacity-55' : ''}`}
            >
              <span className="w-6 text-right font-bold text-yellow-600 flex-shrink-0">{e.init ?? '—'}</span>
              <span className="flex-1 min-w-0 truncate">
                {e.kind === 'ennemi' ? e.nom : e.nom}
                {estMoi && <span className="text-amber-300"> (toi)</span>}
              </span>
              {etat ? (
                <span className="text-[10px] flex-shrink-0" style={{ color: etat.couleur }} title={etat.label}>
                  ● {etat.label}
                </span>
              ) : perso ? (
                <span className="text-[10px] text-stone-500 flex-shrink-0">
                  {perso.hp_actuel}/{perso.hp_max}
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
