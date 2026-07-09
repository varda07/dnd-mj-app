// ============================================================================
// Dons (Feats) D&D 5e — Corrections V1 Vague 2 (2.4)
// ----------------------------------------------------------------------------
// Liste de dons courants (PHB / SRD-like) proposés aux niveaux d'amélioration
// de caractéristique (ASI) en alternative au +2/+1. Chaque don peut avoir un
// prérequis vérifiable (stat minimale, lanceur de sorts). Les prérequis non
// automatisables (ex. maîtrise d'armure) sont décrits en texte, non bloquants.
// ============================================================================

export type DonContext = {
  for: number
  dex: number
  con: number
  int: number
  sag: number
  cha: number
  lanceurDeSorts: boolean
}

export type Don = {
  nom: string
  description: string
  // Prérequis affiché au joueur (informe même si non bloquant).
  prerequisTexte?: string
  // Prérequis vérifiable automatiquement. Absent = toujours accessible.
  prerequisOk?: (ctx: DonContext) => boolean
}

export const DONS: Don[] = [
  {
    nom: 'Alerte',
    description:
      '+5 à l\'initiative. Vous ne pouvez pas être surpris tant que vous êtes conscient, et les créatures cachées n\'ont pas l\'avantage contre vous.'
  },
  {
    nom: 'Athlète',
    description:
      '+1 en Force ou Dextérité. Vous vous relevez plus vite, escaladez sans coût supplémentaire et sautez mieux.'
  },
  {
    nom: 'Acteur',
    description:
      '+1 en Charisme. Avantage aux tests de Représentation et Tromperie pour imiter, et vous pouvez imiter voix et sons.'
  },
  {
    nom: 'Chanceux',
    description:
      '3 points de chance par repos long : relancez un d20 (attaque, test ou sauvegarde) ou forcez la relance d\'une attaque contre vous.'
  },
  {
    nom: 'Robuste',
    description: 'Vos points de vie maximum augmentent de 2 par niveau (2 × niveau immédiatement).'
  },
  {
    nom: 'Sentinelle',
    description:
      'Les attaques d\'opportunité réduisent la vitesse de la cible à 0. Vous pouvez réagir quand un allié adjacent est attaqué.'
  },
  {
    nom: 'Observateur',
    description:
      '+1 en Intelligence ou Sagesse. +5 passif en Perception et Investigation, et vous lisez sur les lèvres.'
  },
  {
    nom: 'Expert de la mobilité',
    description:
      '+3 m de vitesse. Le terrain difficile ne vous ralentit pas quand vous vous ruez (Dash), et attaquer une cible ne provoque plus d\'attaque d\'opportunité de sa part.'
  },
  {
    nom: 'Maître d\'armes lourdes',
    description:
      'Great Weapon Master : après un critique ou une mise à 0 PV, attaque bonus. Option −5 à l\'attaque pour +10 aux dégâts avec une arme lourde.'
  },
  {
    nom: 'Tireur d\'élite',
    description:
      'Sharpshooter : ignore le couvert partiel et le désavantage à longue portée. Option −5 à l\'attaque à distance pour +10 aux dégâts.'
  },
  {
    nom: 'Maître arbalétrier',
    description:
      'Crossbow Expert : pas de désavantage au corps à corps, ignore la propriété rechargement, et attaque bonus à l\'arbalète légère.'
  },
  {
    nom: 'Combattant à deux armes',
    description:
      'Dual Wielder : +1 CA en combat à deux armes, utilisez des armes de corps à corps non légères, et dégainez/rengainez deux armes.'
  },
  {
    nom: 'Expert des boucliers',
    description:
      'Shield Master : bousculade en action bonus après une attaque, bonus aux sauvegardes de Dex avec bouclier.'
  },
  {
    nom: 'Duelliste défensif',
    description:
      'Defensive Duelist : en réaction, ajoutez votre bonus de maîtrise à la CA contre une attaque de mêlée avec une arme de finesse.',
    prerequisTexte: 'Dextérité 13+',
    prerequisOk: (c) => c.dex >= 13
  },
  {
    nom: 'Furtif',
    description:
      'Skulker : vous cacher dans une légère obscurité, rater une attaque à distance ne révèle pas votre position, et pas de désavantage à la vision faible.',
    prerequisTexte: 'Dextérité 13+',
    prerequisOk: (c) => c.dex >= 13
  },
  {
    nom: 'Résilient',
    description:
      '+1 dans une caractéristique et maîtrise de son jet de sauvegarde (souvent Constitution pour la concentration).'
  },
  {
    nom: 'Doué',
    description: 'Skilled : maîtrise de trois compétences ou outils de votre choix.'
  },
  {
    nom: 'Initié à la magie',
    description:
      'Magic Initiate : apprenez 2 tours de magie et un sort de niveau 1 d\'une classe (Barde, Clerc, Druide, Ensorceleur, Magicien ou Occultiste).'
  },
  {
    nom: 'Mage de guerre',
    description:
      'War Caster : avantage aux sauvegardes de concentration, incantation somatique avec armes/bouclier en main, et sort en attaque d\'opportunité.',
    prerequisTexte: 'Être lanceur de sorts',
    prerequisOk: (c) => c.lanceurDeSorts
  },
  {
    nom: 'Adepte élémentaire',
    description:
      'Elemental Adept : ignorez la résistance à un type de dégâts (acide, froid, feu, foudre ou tonnerre) et traitez les 1 des dés de dégâts comme des 2.',
    prerequisTexte: 'Être lanceur de sorts',
    prerequisOk: (c) => c.lanceurDeSorts
  },
  {
    nom: 'Vif d\'esprit',
    description:
      'Keen Mind : +1 en Intelligence, sens toujours du nord, connaissez l\'heure et vous souvenez de tout ce que vous avez vu ou entendu le mois passé.'
  },
  {
    nom: 'Sauvage intérieur',
    description:
      'Savage Attacker : une fois par tour, relancez les dés de dégâts d\'une arme de mêlée et gardez le meilleur résultat.'
  },
  {
    nom: 'Charge-lourde',
    description:
      'Charger (Charger) : après un Dash, une attaque en action bonus avec +5 aux dégâts ou une bousculade de 3 m.'
  },
  {
    nom: 'Maître de guerre',
    description:
      'Martial Adept : apprenez 2 manœuvres de Maître de guerre et gagnez un dé de supériorité (d6).'
  },
  {
    nom: 'Frappeur infatigable',
    description:
      'Grand Maître d\'hast (Polearm Master) : attaque bonus avec le talon d\'une arme d\'hast, et attaque d\'opportunité quand un ennemi entre dans votre allonge.'
  },
  {
    nom: 'Combattant monté',
    description:
      'Mounted Combatant : avantage contre les créatures plus petites que votre monture et protégez-la des attaques.'
  },
  {
    nom: 'Guérisseur',
    description:
      'Healer (Soigneur) : avec une trousse de soins, stabilisez et rendez des PV à un allié.'
  },
  {
    nom: 'Armure intermédiaire',
    description:
      'Moderately Armored : +1 en Force ou Dextérité, maîtrise des armures intermédiaires et des boucliers.',
    prerequisTexte: 'Maîtrise des armures légères (à vérifier avec le MJ)'
  },
  {
    nom: 'Armure lourde',
    description:
      'Heavily Armored : +1 en Force et maîtrise des armures lourdes.',
    prerequisTexte: 'Maîtrise des armures intermédiaires (à vérifier avec le MJ)'
  },
  {
    nom: 'Talent inné',
    description:
      'Prodigy / Talentueux : une maîtrise de compétence, une d\'outil, une langue, et une expertise dans une compétence maîtrisée.'
  }
]

// Un don est accessible si aucun prérequis automatique ou s'il est satisfait.
export const donAccessible = (don: Don, ctx: DonContext): boolean =>
  !don.prerequisOk || don.prerequisOk(ctx)
