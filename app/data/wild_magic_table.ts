// ============================================================================
// Table d'effets Wild Magic (Magie Sauvage) — D&D 5e officiel
// ============================================================================
// Roll d100 (ou d20 → multiplier par 5 pour mapping).
// Source : Player's Handbook 5e, classe Sorcier (Sorcerous Origin : Wild Magic).
// Traduit en français — les noms officiels VF varient ; ici on garde clair.
// ============================================================================

export type WildMagicEffet = {
  // 1..100. La table officielle utilise un d100 avec des plages (ex. 01-02).
  // On stocke la borne basse de la plage. On définit aussi `max` pour les
  // plages > 1 case (cf. PHB).
  min: number
  max: number
  titre: string
  description: string
}

export const WILD_MAGIC_TABLE: WildMagicEffet[] = [
  { min: 1, max: 2, titre: 'Lumière colorée', description: 'Lance « Lumières dansantes » centré sur toi pour 1 minute (cd 8 + Cha).' },
  { min: 3, max: 4, titre: 'Aura féerique', description: 'Pendant 1 minute, tu peux voir toute créature invisible à 18 m, et elles te voient.' },
  { min: 5, max: 6, titre: 'Sceau noir', description: 'Tu deviens vulnérable aux dégâts perforants pendant 1 minute.' },
  { min: 7, max: 8, titre: 'Téléportation', description: 'Tu te téléportes jusqu’à 18 m vers une case visible.' },
  { min: 9, max: 10, titre: 'Plan astral', description: 'Tu es transporté sur le plan astral jusqu’à la fin de ton prochain tour. Tu reviens dans la case que tu as quittée.' },
  { min: 11, max: 12, titre: 'Maximisation des sorts', description: 'Pendant 1 minute, chaque sort de dégâts/soins infligés/soignés sont maximisés.' },
  { min: 13, max: 14, titre: 'Rajeunissement', description: 'Tu rajeunis de 1d10 ans (minimum 13 ans).' },
  { min: 15, max: 16, titre: 'Esprits modrons', description: '1d6 flumphs apparaissent dans un rayon de 18 m et restent 1 minute (sous contrôle du MJ).' },
  { min: 17, max: 18, titre: 'Régénération PV', description: 'Tu récupères 5 points de vie.' },
  { min: 19, max: 20, titre: 'Plante luxuriante', description: 'Tu te transformes en plante feuillue jusqu’à ta prochaine action (incapacité, vulnérable feu).' },
  { min: 21, max: 22, titre: 'Téléportation rapide', description: 'Pendant 1 minute, tu peux te téléporter de 6 m en action bonus.' },
  { min: 23, max: 24, titre: 'Confusion divine', description: 'Tu lances « Confusion » centré sur toi (sans concentration).' },
  { min: 25, max: 26, titre: 'Régénération continue', description: 'Pendant 1 minute, tu récupères 5 PV au début de chacun de tes tours.' },
  { min: 27, max: 28, titre: 'Barbe pousse', description: 'Une longue barbe ou des plumes te poussent et restent 24 heures.' },
  { min: 29, max: 30, titre: 'Boule de feu', description: 'Tu lances immédiatement « Boule de Feu » (cd 8) comme un sort de niveau 3.' },
  { min: 31, max: 32, titre: 'Invisibilité partielle', description: 'Tu lances « Invisibilité » sur toi-même.' },
  { min: 33, max: 34, titre: 'Croissance d’herbe', description: 'Des herbes poussent sur un rayon de 1,5 m autour de toi pendant 1 minute (terrain difficile).' },
  { min: 35, max: 36, titre: 'Disparition à 1 PV', description: 'Si tu tombes à 0 PV dans la prochaine minute, tu tombes à 1 PV à la place.' },
  { min: 37, max: 38, titre: 'Doppelgänger', description: 'Une copie illusoire de toi apparaît à 9 m et dure 1 minute.' },
  { min: 39, max: 40, titre: 'Anti-âge', description: 'Tu vieillis de 1d10 ans.' },
  { min: 41, max: 42, titre: 'Boule de papillons', description: '1d6 flamants/papillons volent autour de toi sur 3 m pendant 1 minute (obscurcissement léger).' },
  { min: 43, max: 44, titre: 'Régénération sort', description: 'Tu récupères un emplacement de sort dépensé (niveau ≤ 4) si possible.' },
  { min: 45, max: 46, titre: 'Hurlement', description: 'Pendant 1 minute, tu dois crier toutes tes paroles.' },
  { min: 47, max: 48, titre: 'Sort gratuit', description: 'Le prochain sort que tu lances dans la minute ne coûte pas d’emplacement.' },
  { min: 49, max: 50, titre: 'Peau bleue', description: 'Ta peau prend une teinte bleu vif pendant 24 heures.' },
  { min: 51, max: 52, titre: 'Œil tiers', description: 'Un œil apparaît sur ton front. Tu obtiens un avantage en Perception (vue) pendant 1 minute.' },
  { min: 53, max: 54, titre: 'Sorts maximisés', description: 'Pendant 1 minute, tu lances tous tes sorts à dégâts maximaux.' },
  { min: 55, max: 56, titre: 'PV temporaires', description: 'Tu gagnes 1d10 points de vie temporaires.' },
  { min: 57, max: 58, titre: 'Sort tactile à distance', description: 'Tu peux lancer un sort de contact à 9 m de distance pendant 1 minute.' },
  { min: 59, max: 60, titre: 'Pluie violette', description: 'Une pluie violette tombe sur 3 m autour de toi pendant 1 minute.' },
  { min: 61, max: 62, titre: 'Inversion gravité', description: 'Tu tombes vers le ciel sur 18 m, puis tu retombes (1d6 par 3 m).' },
  { min: 63, max: 64, titre: 'Téléportation alliés', description: 'Tu peux téléporter une créature consentante de 18 m à portée vue.' },
  { min: 65, max: 66, titre: 'Aveuglant', description: 'Pendant la prochaine minute, tu émets une lumière vive sur 9 m.' },
  { min: 67, max: 68, titre: 'Bouclier de force', description: 'Tu gagnes un bouclier de force qui te donne +2 CA pendant 1 minute.' },
  { min: 69, max: 70, titre: 'Cheveux qui poussent', description: 'Tes cheveux deviennent extrêmement longs (3 m) pendant 24 h.' },
  { min: 71, max: 72, titre: 'Réincarnation', description: 'Si tu meurs dans la prochaine minute, tu reviens à la vie avec la moitié de tes PV max.' },
  { min: 73, max: 74, titre: 'Petit monstre', description: 'Un petit monstre amical (ex. mille-pattes) apparaît à 9 m pour 10 minutes.' },
  { min: 75, max: 76, titre: 'Sort caché', description: 'Le prochain sort lancé contre toi te rate automatiquement.' },
  { min: 77, max: 78, titre: 'Voix profonde', description: 'Pendant 24 h, ta voix devient extrêmement grave/aiguë.' },
  { min: 79, max: 80, titre: 'Animal compagnon', description: 'Un familier de classe 0 apparaît à tes côtés pour 1 heure.' },
  { min: 81, max: 82, titre: 'Faux pas', description: 'Tes pas font 1d4 m de trop dans une direction aléatoire pour 1 minute.' },
  { min: 83, max: 84, titre: 'Tu rétrécis', description: 'Tu rétrécis de 30 cm pendant 24 h.' },
  { min: 85, max: 86, titre: 'Tu grandis', description: 'Tu grandis de 30 cm pendant 24 h.' },
  { min: 87, max: 88, titre: 'Force titanesque', description: 'Pendant 1 minute, ta Force augmente de 4 (max 25).' },
  { min: 89, max: 90, titre: 'Flammèche', description: 'Tu lances « Flammèche » sur une créature aléatoire à 9 m.' },
  { min: 91, max: 92, titre: 'Pluie d’os', description: 'Des petits os tombent du ciel sur 3 m autour de toi (sans dégâts).' },
  { min: 93, max: 94, titre: 'Saut puissant', description: 'Tu peux sauter le triple de la distance normale pendant 1 minute.' },
  { min: 95, max: 96, titre: 'Téléportation aveugle', description: 'Tu te téléportes dans une direction aléatoire de 18 m.' },
  { min: 97, max: 98, titre: 'Tornade locale', description: 'Une mini-tornade apparaît sur 1,5 m autour de toi pendant 1 minute (terrain difficile).' },
  { min: 99, max: 100, titre: 'Refaire le roll', description: 'Tu peux relancer immédiatement sur cette table (les deux effets s’appliquent).' }
]

// Helpers ---------------------------------------------------------------------

export function rollWildMagic(): WildMagicEffet {
  return rollWildMagicAvecValeur().effet
}

// V1 4.1 — variante qui expose AUSSI le nombre tiré (1..100), pour l'afficher et
// rendre visible que le tirage est bien sur d100 (pas de biais / pas un d20).
export function rollWildMagicAvecValeur(): { valeur: number; effet: WildMagicEffet } {
  const n = Math.floor(Math.random() * 100) + 1
  const found = WILD_MAGIC_TABLE.find((e) => n >= e.min && n <= e.max)
  return { valeur: n, effet: found ?? WILD_MAGIC_TABLE[WILD_MAGIC_TABLE.length - 1] }
}

export function rollD20DeclencheSurge(): boolean {
  return Math.floor(Math.random() * 20) + 1 === 1
}
