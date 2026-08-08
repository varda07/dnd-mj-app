'use client'

// ============================================================================
// Menu « Compétences » de la roue joueur (Delta A.2 / A.3)
// ----------------------------------------------------------------------------
// Même logique et mêmes données que l'ancien onglet Fiche — seule la
// présentation change : des lignes dépliables « nom à gauche, valeur à droite »
// avec un bouton « Lancer 1d20+X ». Un seul dépli à la fois.
//
// ⚠️ Aucun rond d'usage ici (règle D&D 5e — Delta A.4) : ni les caractéristiques,
// ni les sauvegardes, ni les compétences n'ont d'usages limités.
// Le bloc Points de vie a quitté ce menu : il vit désormais dans le panneau
// ouvert par le centre de la roue (PanneauPointsDeVie).
// ============================================================================

import { useState } from 'react'
import {
  bonusMaitrise,
  formatMod,
  modifier,
  COMPETENCES,
  STATS,
  type StatKey
} from '@/app/lib/dnd-calc'
import type { CharacterSheet } from '@/app/lib/session-live'
import type { SessionJoueurApi } from './useSessionJoueur'
import LigneDepliable from './LigneDepliable'

export default function OngletFiche({
  sheet,
  roll
}: {
  sheet: CharacterSheet
  api: SessionJoueurApi
  roll: (label: string, bonus: number) => void
}) {
  const [ouvert, setOuvert] = useState<string | null>(null)
  const bascule = (cle: string) => setOuvert((o) => (o === cle ? null : cle))

  const bm = bonusMaitrise(sheet.niveau)
  const initiative = modifier(sheet.dexterite)

  return (
    <div className="space-y-4">
      {/* Défenses & repères (aucun jet limité, aucune pastille) */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <MiniStat label="CA" value={sheet.ca} />
        <MiniStat label="Init." value={formatMod(initiative)} onClick={() => roll('Initiative', initiative)} />
        <MiniStat label="Vitesse" value={`${sheet.vitesse}`} />
        <MiniStat label="Maîtrise" value={formatMod(bm)} />
      </div>
      <p className="text-center text-xs text-stone-500">
        Dés de vie : {sheet.de_vie ?? '—'} ({Math.max(0, sheet.niveau - sheet.de_vie_utilises)}/{sheet.niveau} dispo)
      </p>

      {/* Caractéristiques */}
      <section>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">Caractéristiques</p>
        <ul className="space-y-1">
          {STATS.map((s) => {
            const val = sheet[s.key as StatKey] as number
            const mod = modifier(val)
            const cle = `car:${s.key}`
            return (
              <LigneDepliable
                key={cle}
                nom={`${s.label} (${val})`}
                valeur={formatMod(mod)}
                description={s.desc}
                formule={`1d20${formatMod(mod)}`}
                onLancer={() => roll(`Test de ${s.abbr}`, mod)}
                ouvert={ouvert === cle}
                onToggle={() => bascule(cle)}
              />
            )
          })}
        </ul>
      </section>

      {/* Jets de sauvegarde */}
      <section>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">Jets de sauvegarde</p>
        <ul className="space-y-1">
          {STATS.map((s) => {
            const mod = modifier(sheet[s.key as StatKey] as number)
            const maitrise = !!sheet.saves_maitrises?.[s.key]
            const bonus = mod + (maitrise ? bm : 0)
            const cle = `sav:${s.key}`
            return (
              <LigneDepliable
                key={cle}
                nom={`${maitrise ? '●' : '○'} ${s.label}`}
                valeur={formatMod(bonus)}
                description={`Sauvegarde de ${s.label}${maitrise ? ` — maîtrisée (${formatMod(bm)} de bonus de maîtrise)` : ' — non maîtrisée'}.`}
                formule={`1d20${formatMod(bonus)}`}
                onLancer={() => roll(`Sauvegarde de ${s.abbr}`, bonus)}
                ouvert={ouvert === cle}
                onToggle={() => bascule(cle)}
              />
            )
          })}
        </ul>
      </section>

      {/* Compétences */}
      <section>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">Compétences</p>
        <ul className="space-y-1">
          {COMPETENCES.map((c) => {
            const mod = modifier(sheet[c.stat] as number)
            const maitrise = !!sheet.comp_maitrises?.[c.nom]
            const expertise = !!sheet.comp_expertise?.[c.nom]
            const rang = expertise ? 2 : maitrise ? 1 : 0
            const bonus = mod + bm * rang
            const cle = `comp:${c.nom}`
            const stat = STATS.find((s) => s.key === c.stat)
            return (
              <LigneDepliable
                key={cle}
                nom={`${expertise ? '◆' : maitrise ? '●' : '○'} ${c.nom}`}
                valeur={formatMod(bonus)}
                description={`${c.desc}${stat ? ` (${stat.abbr})` : ''}${
                  expertise ? ' — expertise' : maitrise ? ' — maîtrisée' : ''
                }`}
                formule={`1d20${formatMod(bonus)}`}
                onLancer={() => roll(c.nom, bonus)}
                ouvert={ouvert === cle}
                onToggle={() => bascule(cle)}
              />
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function MiniStat({ label, value, onClick }: { label: string; value: string | number; onClick?: () => void }) {
  const inner = (
    <>
      <span className="block text-[10px] uppercase text-yellow-600">{label}</span>
      <span className="block text-yellow-100 font-bold">{value}</span>
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-lg border border-yellow-800/30 bg-stone-900/40 py-1.5 hover:border-yellow-600 transition">
      {inner}
    </button>
  ) : (
    <div className="rounded-lg border border-yellow-800/20 bg-stone-900/40 py-1.5">{inner}</div>
  )
}
