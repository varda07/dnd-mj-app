'use client'

// ============================================================================
// Menu « Sorts » de la roue joueur (Delta A.2 / A.3 / A.4)
// ----------------------------------------------------------------------------
// Extrait de l'ancien onglet Actions, logique inchangée (consommation de slot,
// concentration, extraction de la formule de dégâts). Nouveautés de présentation :
//   · en TÊTE du menu, une rangée de ronds d'usage par niveau d'emplacement ;
//   · les sorts sont des lignes dépliables avec « Lancer [formule] ».
// Les ronds se consomment de DROITE à GAUCHE (cf. PastillesUsage).
// ============================================================================

import { useState } from 'react'
import type { CharacterSheet, SortJoue } from '@/app/lib/session-live'
import type { SessionJoueurApi } from './useSessionJoueur'
import LigneDepliable from './LigneDepliable'
import PastillesUsage from '@/app/components/ui/PastillesUsage'

/** Première expression de dés trouvée dans la description (ex. « 2d6+3 »). */
export function extraireExpr(desc: string | null): string | null {
  if (!desc) return null
  const m = desc.match(/\d+d(?:4|6|8|10|12|20)(?:\s*[+-]\s*\d+)?/i)
  return m ? m[0] : null
}

export default function OngletSorts({
  sheet,
  spells,
  api,
  rollExpr
}: {
  sheet: CharacterSheet
  spells: SortJoue[]
  api: SessionJoueurApi
  rollExpr: (label: string, expr: string) => void
}) {
  const [ouvert, setOuvert] = useState<string | null>(null)

  const parNiveau = new Map<number, SortJoue[]>()
  for (const s of spells) {
    const arr = parNiveau.get(s.niveau) ?? []
    arr.push(s)
    parNiveau.set(s.niveau, arr)
  }
  const niveaux = [...parNiveau.keys()].sort((a, b) => a - b)

  const slotMax = (lvl: number) => sheet.sorts_slots_max?.[String(lvl)] ?? 0
  const slotUsed = (lvl: number) => api.slotsUsed?.[String(lvl)] ?? 0
  const niveauxSlots = Object.keys(sheet.sorts_slots_max ?? {})
    .map((k) => parseInt(k, 10))
    .filter((n) => Number.isFinite(n) && n > 0 && slotMax(n) > 0)
    .sort((a, b) => a - b)

  const lancerSort = async (s: SortJoue) => {
    if (s.niveau > 0) {
      const ok = await api.consommerSlot(s.niveau)
      if (!ok) return
    }
    if (s.concentration) await api.setConcentration(s.nom)
    const des = extraireExpr(s.description)
    if (des) rollExpr(`Sort : ${s.nom}`, des)
  }

  return (
    <div className="space-y-4">
      {/* Emplacements de sorts — une rangée de ronds par niveau, en tête */}
      {niveauxSlots.length > 0 && (
        <section className="rounded-xl border p-2.5" style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(0,0,0,0.3)' }}>
          <p className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Emplacements de sorts</p>
          <div className="space-y-1.5">
            {niveauxSlots.map((lvl) => {
              const max = slotMax(lvl)
              const used = slotUsed(lvl)
              return (
                <div key={lvl} className="flex items-center gap-2">
                  <span className="text-xs text-stone-300 w-16 flex-shrink-0">Niveau {lvl}</span>
                  <PastillesUsage
                    max={max}
                    used={used}
                    label={`Emplacements de niveau ${lvl}`}
                    onConsommer={() => void api.consommerSlot(lvl)}
                    onRestituer={() => void api.restaurerSlot(lvl)}
                  />
                  <span className="ml-auto text-[11px] text-stone-500">{max - used}/{max}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {api.concentration && (
        <div className="rounded-lg border px-3 py-2 flex items-center justify-between"
          style={{ borderColor: 'rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.08)' }}>
          <span className="text-cyan-200 text-sm truncate">🌀 Concentration : <b>{api.concentration}</b></span>
          <button type="button" onClick={() => api.setConcentration(null)} className="text-cyan-300 text-xs underline flex-shrink-0">
            Arrêter
          </button>
        </div>
      )}

      {/* Liste des sorts par niveau */}
      {spells.length === 0 ? (
        <p className="text-stone-500 text-sm italic">Aucun sort connu.</p>
      ) : (
        niveaux.map((lvl) => (
          <section key={lvl}>
            <p className="text-xs font-bold text-yellow-500 mb-1.5">
              {lvl === 0 ? 'Sorts mineurs' : `Niveau ${lvl}`}
            </p>
            <ul className="space-y-1">
              {(parNiveau.get(lvl) ?? []).map((s) => {
                const cle = s.junction_id
                const expr = extraireExpr(s.description)
                return (
                  <LigneDepliable
                    key={cle}
                    nom={`${s.concentration ? '🌀 ' : ''}${s.nom}`}
                    valeur={lvl === 0 ? 'Mineur' : `Niv. ${lvl}`}
                    attenue={!s.prepare}
                    ouvert={ouvert === cle}
                    onToggle={() => setOuvert((o) => (o === cle ? null : cle))}
                    description={s.description ?? 'Aucune description.'}
                    contenu={
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-stone-500">
                        <span>⏱ {s.temps_incantation ?? '—'}</span>
                        <span>🎯 {s.portee ?? '—'}</span>
                        <span>⏳ {s.duree ?? '—'}</span>
                        <span>
                          {[s.composantes_verbal && 'V', s.composantes_somatique && 'S', s.composantes_materiel && 'M']
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </span>
                      </div>
                    }
                    formule={expr ?? (lvl > 0 ? 'le sort' : 'le sort mineur')}
                    onLancer={() => void lancerSort(s)}
                  />
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
