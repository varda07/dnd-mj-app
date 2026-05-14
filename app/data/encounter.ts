// Calculateur de rencontres D&D 5e (roadmap 2.6).
// Tables DMG p.82 : seuils d'XP par niveau de personnage + multiplicateur de
// rencontre selon le nombre de monstres.

export type Difficulte = 'facile' | 'moyen' | 'difficile' | 'mortel'

// Seuils d'XP par niveau de personnage : [facile, moyen, difficile, mortel].
export const SEUILS_XP_PAR_NIVEAU: Record<number, [number, number, number, number]> = {
  1: [25, 50, 75, 100],
  2: [50, 100, 150, 200],
  3: [75, 150, 225, 400],
  4: [125, 250, 375, 500],
  5: [250, 500, 750, 1100],
  6: [300, 600, 900, 1400],
  7: [350, 750, 1100, 1700],
  8: [450, 900, 1400, 2100],
  9: [550, 1100, 1600, 2400],
  10: [600, 1200, 1900, 2800],
  11: [800, 1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100],
  14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400],
  16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800],
  18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900],
  20: [2800, 5700, 8500, 12700]
}

export type BudgetRencontre = {
  facile: number
  moyen: number
  difficile: number
  mortel: number
}

// Budget total du groupe = seuil par PJ × nombre de PJ.
export function calculerBudget(nbPj: number, niveauMoyen: number): BudgetRencontre {
  const niveau = Math.max(1, Math.min(20, Math.round(niveauMoyen)))
  const [f, m, d, mo] = SEUILS_XP_PAR_NIVEAU[niveau]
  const n = Math.max(1, nbPj)
  return {
    facile: f * n,
    moyen: m * n,
    difficile: d * n,
    mortel: mo * n
  }
}

// Multiplicateur de rencontre selon le nombre total de monstres (DMG p.82).
export function multiplicateurRencontre(nbMonstres: number): number {
  if (nbMonstres <= 0) return 1
  if (nbMonstres === 1) return 1
  if (nbMonstres === 2) return 1.5
  if (nbMonstres <= 6) return 2
  if (nbMonstres <= 10) return 2.5
  if (nbMonstres <= 14) return 3
  return 4
}

// XP ajusté d'une rencontre : (somme des XP bruts) × multiplicateur.
export function xpAjuste(xpBrutTotal: number, nbMonstres: number): number {
  return Math.round(xpBrutTotal * multiplicateurRencontre(nbMonstres))
}

// Évalue la difficulté d'une rencontre par rapport au budget du groupe.
// Renvoie null si la rencontre est triviale (sous le seuil facile).
export function evaluerDifficulte(
  xpAjusteRencontre: number,
  budget: BudgetRencontre
): Difficulte | null {
  if (xpAjusteRencontre >= budget.mortel) return 'mortel'
  if (xpAjusteRencontre >= budget.difficile) return 'difficile'
  if (xpAjusteRencontre >= budget.moyen) return 'moyen'
  if (xpAjusteRencontre >= budget.facile) return 'facile'
  return null
}

export const DIFFICULTE_LABEL: Record<Difficulte, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
  mortel: 'Mortel'
}

export const DIFFICULTE_COULEUR: Record<Difficulte, string> = {
  facile: '#22c55e',
  moyen: '#eab308',
  difficile: '#f97316',
  mortel: '#ef4444'
}
