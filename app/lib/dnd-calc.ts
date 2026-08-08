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

export const STATS: { key: StatKey; label: string; abbr: string; desc: string }[] = [
  { key: 'force', label: 'Force', abbr: 'FOR', desc: 'Puissance physique brute : soulever, pousser, briser, agripper.' },
  { key: 'dexterite', label: 'Dextérité', abbr: 'DEX', desc: 'Agilité, réflexes, équilibre et précision des gestes.' },
  { key: 'constitution', label: 'Constitution', abbr: 'CON', desc: 'Endurance, santé et résistance à l’effort ou au poison.' },
  { key: 'intelligence', label: 'Intelligence', abbr: 'INT', desc: 'Mémoire, raisonnement, savoir et déduction.' },
  { key: 'sagesse', label: 'Sagesse', abbr: 'SAG', desc: 'Perception du monde, intuition et force de volonté.' },
  { key: 'charisme', label: 'Charisme', abbr: 'CHA', desc: 'Présence, assurance et capacité à influencer autrui.' }
]

// Compétences 5e FR → caractéristique associée (clé = libellé stocké dans
// personnages.comp_maitrises / comp_expertise) + description courte affichée
// au dépli de la ligne dans le menu Compétences de la roue joueur.
export const COMPETENCES: { nom: string; stat: StatKey; desc: string }[] = [
  { nom: 'Acrobaties', stat: 'dexterite', desc: 'Garder l’équilibre, amortir une chute, se contorsionner, faire une figure.' },
  { nom: 'Arcanes', stat: 'intelligence', desc: 'Reconnaître un sort, un objet magique, un plan d’existence ou une tradition occulte.' },
  { nom: 'Athlétisme', stat: 'force', desc: 'Escalader, nager, sauter, lutter, forcer un passage.' },
  { nom: 'Discrétion', stat: 'dexterite', desc: 'Se déplacer sans bruit, se cacher, échapper à la vigilance.' },
  { nom: 'Dressage', stat: 'sagesse', desc: 'Calmer, mener ou comprendre le comportement d’un animal.' },
  { nom: 'Escamotage', stat: 'dexterite', desc: 'Tour de main : faire les poches, dissimuler un objet, un tour de passe-passe.' },
  { nom: 'Histoire', stat: 'intelligence', desc: 'Se souvenir d’événements, de royaumes, de guerres, de lignées.' },
  { nom: 'Intimidation', stat: 'charisme', desc: 'Obtenir par la menace, la violence contenue ou la présence.' },
  { nom: 'Investigation', stat: 'intelligence', desc: 'Déduire à partir d’indices, fouiller une scène, trouver un mécanisme.' },
  { nom: 'Médecine', stat: 'sagesse', desc: 'Stabiliser un mourant, diagnostiquer une maladie ou une cause de mort.' },
  { nom: 'Nature', stat: 'intelligence', desc: 'Connaître terrains, plantes, météo, cycles et créatures naturelles.' },
  { nom: 'Perception', stat: 'sagesse', desc: 'Remarquer ce qui vous entoure : bruit, mouvement, détail hors de propos.' },
  { nom: 'Perspicacité', stat: 'sagesse', desc: 'Lire les intentions réelles derrière les mots et le comportement.' },
  { nom: 'Persuasion', stat: 'charisme', desc: 'Convaincre avec tact, honnêteté ou diplomatie.' },
  { nom: 'Représentation', stat: 'charisme', desc: 'Captiver un public : musique, danse, récit, comédie.' },
  { nom: 'Religion', stat: 'intelligence', desc: 'Connaître divinités, rites, symboles sacrés et hiérarchies cléricales.' },
  { nom: 'Survie', stat: 'sagesse', desc: 'Pister, s’orienter, chasser, prévoir le temps, éviter les dangers naturels.' },
  { nom: 'Tromperie', stat: 'charisme', desc: 'Mentir de façon convaincante, déguiser ses intentions, bluffer.' }
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
