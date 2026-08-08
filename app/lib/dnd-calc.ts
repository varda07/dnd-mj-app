// ============================================================================
// Calculs D&D 5e purs + lanceur de dés — partagés par les interfaces de session
// ----------------------------------------------------------------------------
// Réplique les helpers non exportés de la fiche (modifier/bonusMaitrise/…) en
// module réutilisable, + un lanceur de dés local (d4→d100, avantage/désavantage).
// ============================================================================

export type StatKey =
  | 'force' | 'dexterite' | 'constitution' | 'intelligence' | 'sagesse' | 'charisme'

export const modifier = (v: number): number => Math.floor(((v ?? 10) - 10) / 2)
export const formatMod = (m: number): string => (m >= 0 ? `+${m}` : `${m}`)
export const bonusMaitrise = (niv: number): number =>
  2 + Math.floor((Math.max(1, niv) - 1) / 4)

export const STATS: { key: StatKey; label: string; abbr: string }[] = [
  { key: 'force', label: 'Force', abbr: 'FOR' },
  { key: 'dexterite', label: 'Dextérité', abbr: 'DEX' },
  { key: 'constitution', label: 'Constitution', abbr: 'CON' },
  { key: 'intelligence', label: 'Intelligence', abbr: 'INT' },
  { key: 'sagesse', label: 'Sagesse', abbr: 'SAG' },
  { key: 'charisme', label: 'Charisme', abbr: 'CHA' }
]

// Compétences 5e FR → caractéristique associée (clé = libellé stocké dans
// personnages.comp_maitrises / comp_expertise).
export const COMPETENCES: { nom: string; stat: StatKey }[] = [
  { nom: 'Acrobaties', stat: 'dexterite' },
  { nom: 'Arcanes', stat: 'intelligence' },
  { nom: 'Athlétisme', stat: 'force' },
  { nom: 'Discrétion', stat: 'dexterite' },
  { nom: 'Dressage', stat: 'sagesse' },
  { nom: 'Escamotage', stat: 'dexterite' },
  { nom: 'Histoire', stat: 'intelligence' },
  { nom: 'Intimidation', stat: 'charisme' },
  { nom: 'Investigation', stat: 'intelligence' },
  { nom: 'Médecine', stat: 'sagesse' },
  { nom: 'Nature', stat: 'intelligence' },
  { nom: 'Perception', stat: 'sagesse' },
  { nom: 'Perspicacité', stat: 'sagesse' },
  { nom: 'Persuasion', stat: 'charisme' },
  { nom: 'Représentation', stat: 'charisme' },
  { nom: 'Religion', stat: 'intelligence' },
  { nom: 'Survie', stat: 'sagesse' },
  { nom: 'Tromperie', stat: 'charisme' }
]

// ----------------------------------------------------------------------------
// Lanceur de dés (côté client uniquement — Math.random OK dans le navigateur)
// ----------------------------------------------------------------------------
export type RollMode = 'normal' | 'avantage' | 'desavantage'

export function rollDie(faces: number): number {
  return Math.floor(Math.random() * faces) + 1
}

export function rollDice(faces: number, count = 1): number[] {
  return Array.from({ length: Math.max(1, count) }, () => rollDie(faces))
}

// d20 avec avantage/désavantage : garde le meilleur / le pire.
export function rollD20(mode: RollMode): { rolls: number[]; kept: number } {
  if (mode === 'normal') {
    const r = rollDie(20)
    return { rolls: [r], kept: r }
  }
  const a = rollDie(20)
  const b = rollDie(20)
  const kept = mode === 'avantage' ? Math.max(a, b) : Math.min(a, b)
  return { rolls: [a, b], kept }
}

export const DICE_FACES = [4, 6, 8, 10, 12, 20, 100] as const
