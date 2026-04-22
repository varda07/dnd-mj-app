// ============================================================================
// D&D 5e — données de référence pour pré-remplir les fiches de personnage.
// Utilisé par app/dashboard/personnages/page.tsx.
// ============================================================================

export type StatKey = 'for' | 'dex' | 'con' | 'int' | 'sag' | 'cha'

export const STAT_KEYS: StatKey[] = ['for', 'dex', 'con', 'int', 'sag', 'cha']

export const STAT_LABELS: Record<StatKey, string> = {
  for: 'Force',
  dex: 'Dextérité',
  con: 'Constitution',
  int: 'Intelligence',
  sag: 'Sagesse',
  cha: 'Charisme'
}

export const STAT_COURT: Record<StatKey, string> = {
  for: 'For',
  dex: 'Dex',
  con: 'Con',
  int: 'Int',
  sag: 'Sag',
  cha: 'Cha'
}

// ------------------------- RACES -------------------------

export type Race = {
  nom: string
  sousRaces?: string[]
  bonusStats: Partial<Record<StatKey, number>>
  bonusLibre?: { nb: number; valeur: number } // ex. Demi-elfe : 2 stats au choix
  vitesse: number // en mètres
  langues: string[]
  traits: string[]
}

export const RACES: Race[] = [
  {
    nom: 'Humain',
    bonusStats: { for: 1, dex: 1, con: 1, int: 1, sag: 1, cha: 1 },
    vitesse: 9,
    langues: ['Commun', 'Une langue au choix'],
    traits: ['Polyvalent : +1 à toutes les caractéristiques.']
  },
  {
    nom: 'Elfe',
    sousRaces: ['Haut-elfe', 'Elfe sylvain', 'Elfe noir (drow)'],
    bonusStats: { dex: 2 },
    vitesse: 9,
    langues: ['Commun', 'Elfique'],
    traits: [
      'Vision dans le noir (18 m).',
      'Sens aiguisés : maîtrise de Perception.',
      'Ascendance féerique : avantage contre le charme, immunité au sommeil magique.',
      'Transe : 4 h de méditation remplacent 8 h de sommeil.'
    ]
  },
  {
    nom: 'Nain',
    sousRaces: ['Nain des collines', 'Nain des montagnes'],
    bonusStats: { con: 2 },
    vitesse: 7.5,
    langues: ['Commun', 'Nain'],
    traits: [
      'Vision dans le noir (18 m).',
      'Résilience naine : avantage et résistance contre le poison.',
      'Entraînement au combat : maîtrise des haches et marteaux.',
      'Affinité avec la pierre : double bonus de maîtrise pour les connaissances sur la pierre.'
    ]
  },
  {
    nom: 'Halfelin',
    sousRaces: ['Pied léger', 'Robuste'],
    bonusStats: { dex: 2 },
    vitesse: 7.5,
    langues: ['Commun', 'Halfelin'],
    traits: [
      'Chanceux : relance les 1 naturels sur attaque, test ou sauvegarde.',
      'Brave : avantage contre la terreur.',
      'Agilité halfeline : peut traverser l\'espace de créatures plus grandes.'
    ]
  },
  {
    nom: 'Demi-elfe',
    bonusStats: { cha: 2 },
    bonusLibre: { nb: 2, valeur: 1 },
    vitesse: 9,
    langues: ['Commun', 'Elfique', 'Une au choix'],
    traits: [
      'Vision dans le noir (18 m).',
      'Ascendance féerique : avantage contre le charme.',
      'Polyvalence : 2 compétences au choix.',
      '+1 à deux caractéristiques de ton choix (hors Charisme).'
    ]
  },
  {
    nom: 'Demi-orc',
    bonusStats: { for: 2, con: 1 },
    vitesse: 9,
    langues: ['Commun', 'Orc'],
    traits: [
      'Vision dans le noir (18 m).',
      'Menaçant : maîtrise d\'Intimidation.',
      'Endurance implacable : revient à 1 PV au lieu de 0, une fois par repos long.',
      'Attaques sauvages : +1 dé de dégâts sur coup critique au corps à corps.'
    ]
  },
  {
    nom: 'Gnome',
    sousRaces: ['Gnome des forêts', 'Gnome des roches'],
    bonusStats: { int: 2 },
    vitesse: 7.5,
    langues: ['Commun', 'Gnome'],
    traits: [
      'Vision dans le noir (18 m).',
      'Ruse gnome : avantage aux sauvegardes d\'Int, Sag et Cha contre la magie.'
    ]
  },
  {
    nom: 'Tieffelin',
    bonusStats: { cha: 2, int: 1 },
    vitesse: 9,
    langues: ['Commun', 'Infernal'],
    traits: [
      'Vision dans le noir (18 m).',
      'Résistance infernale : résistance aux dégâts de feu.',
      'Héritage infernal : connaît le cantrip Thaumaturgie.'
    ]
  },
  {
    nom: 'Drakéide',
    bonusStats: { for: 2, cha: 1 },
    vitesse: 9,
    langues: ['Commun', 'Draconique'],
    traits: [
      'Ascendance draconique : résistance à un type de dégâts élémentaire au choix.',
      'Souffle : attaque de zone 2d6 (+1d6 tous les 5 niveaux), recharge sur repos court.'
    ]
  }
]

// ------------------------- CLASSES -------------------------

export type Classe = {
  nom: string
  deVie: string
  hpNiveau1Base: number // valeur max du dé à ajouter au mod Con
  jetsSauvegarde: StatKey[]
  caracteristiquesPrincipales: StatKey[]
}

export const CLASSES: Classe[] = [
  { nom: 'Barbare',     deVie: 'd12', hpNiveau1Base: 12, jetsSauvegarde: ['for', 'con'], caracteristiquesPrincipales: ['for'] },
  { nom: 'Barde',       deVie: 'd8',  hpNiveau1Base: 8,  jetsSauvegarde: ['dex', 'cha'], caracteristiquesPrincipales: ['cha'] },
  { nom: 'Clerc',       deVie: 'd8',  hpNiveau1Base: 8,  jetsSauvegarde: ['sag', 'cha'], caracteristiquesPrincipales: ['sag'] },
  { nom: 'Druide',      deVie: 'd8',  hpNiveau1Base: 8,  jetsSauvegarde: ['int', 'sag'], caracteristiquesPrincipales: ['sag'] },
  { nom: 'Ensorceleur', deVie: 'd6',  hpNiveau1Base: 6,  jetsSauvegarde: ['con', 'cha'], caracteristiquesPrincipales: ['cha'] },
  { nom: 'Guerrier',    deVie: 'd10', hpNiveau1Base: 10, jetsSauvegarde: ['for', 'con'], caracteristiquesPrincipales: ['for', 'dex'] },
  { nom: 'Magicien',    deVie: 'd6',  hpNiveau1Base: 6,  jetsSauvegarde: ['int', 'sag'], caracteristiquesPrincipales: ['int'] },
  { nom: 'Moine',       deVie: 'd8',  hpNiveau1Base: 8,  jetsSauvegarde: ['for', 'dex'], caracteristiquesPrincipales: ['dex', 'sag'] },
  { nom: 'Paladin',     deVie: 'd10', hpNiveau1Base: 10, jetsSauvegarde: ['sag', 'cha'], caracteristiquesPrincipales: ['for', 'cha'] },
  { nom: 'Rôdeur',      deVie: 'd10', hpNiveau1Base: 10, jetsSauvegarde: ['for', 'dex'], caracteristiquesPrincipales: ['dex', 'sag'] },
  { nom: 'Roublard',    deVie: 'd8',  hpNiveau1Base: 8,  jetsSauvegarde: ['dex', 'int'], caracteristiquesPrincipales: ['dex'] },
  { nom: 'Sorcier',     deVie: 'd8',  hpNiveau1Base: 8,  jetsSauvegarde: ['sag', 'cha'], caracteristiquesPrincipales: ['cha'] }
]

// ------------------------- HISTORIQUES -------------------------

export type Historique = {
  nom: string
  competences: string[]
}

export const HISTORIQUES: Historique[] = [
  { nom: 'Acolyte',            competences: ['Perspicacité', 'Religion'] },
  { nom: 'Artisan de guilde',  competences: ['Persuasion', 'Investigation'] },
  { nom: 'Charlatan',          competences: ['Escamotage', 'Tromperie'] },
  { nom: 'Criminel',           competences: ['Discrétion', 'Tromperie'] },
  { nom: 'Enfant des rues',    competences: ['Discrétion', 'Escamotage'] },
  { nom: 'Ermite',             competences: ['Médecine', 'Religion'] },
  { nom: 'Héros du peuple',    competences: ['Dressage', 'Survie'] },
  { nom: 'Marin',              competences: ['Athlétisme', 'Perception'] },
  { nom: 'Noble',              competences: ['Histoire', 'Persuasion'] },
  { nom: 'Sage',               competences: ['Arcanes', 'Histoire'] },
  { nom: 'Soldat',             competences: ['Athlétisme', 'Intimidation'] }
]

// ------------------------- COMPÉTENCES -------------------------

export type Competence = { nom: string; stat: StatKey }

export const COMPETENCES: Competence[] = [
  { nom: 'Acrobaties',     stat: 'dex' },
  { nom: 'Arcanes',        stat: 'int' },
  { nom: 'Athlétisme',     stat: 'for' },
  { nom: 'Discrétion',     stat: 'dex' },
  { nom: 'Dressage',       stat: 'sag' },
  { nom: 'Escamotage',     stat: 'dex' },
  { nom: 'Histoire',       stat: 'int' },
  { nom: 'Intimidation',   stat: 'cha' },
  { nom: 'Investigation',  stat: 'int' },
  { nom: 'Médecine',       stat: 'sag' },
  { nom: 'Nature',         stat: 'int' },
  { nom: 'Perception',     stat: 'sag' },
  { nom: 'Perspicacité',   stat: 'sag' },
  { nom: 'Persuasion',     stat: 'cha' },
  { nom: 'Religion',       stat: 'int' },
  { nom: 'Représentation', stat: 'cha' },
  { nom: 'Survie',         stat: 'sag' },
  { nom: 'Tromperie',      stat: 'cha' }
]

// ------------------------- ALIGNEMENTS -------------------------

export const ALIGNEMENTS = [
  'Loyal Bon',
  'Neutre Bon',
  'Chaotique Bon',
  'Loyal Neutre',
  'Neutre',
  'Chaotique Neutre',
  'Loyal Mauvais',
  'Neutre Mauvais',
  'Chaotique Mauvais'
]

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

// ------------------------- NOMS FANTASY PAR RACE -------------------------

export const NOMS_PAR_RACE: Record<string, string[]> = {
  Humain:      ['Alwin', 'Brienne', 'Cormac', 'Élise', 'Garen', 'Lys', 'Orin', 'Selene', 'Talvar', 'Wynn'],
  Elfe:        ['Aelindra', 'Faelar', 'Ilyana', 'Lyrandar', 'Mialee', 'Nyrelle', 'Silvyr', 'Thaëlin'],
  Nain:        ['Bruni', 'Dain', 'Gunhild', 'Harbek', 'Kildrak', 'Morgran', 'Thordak', 'Vondra'],
  Halfelin:    ['Bilba', 'Corwin', 'Finn', 'Lilla', 'Merric', 'Pip', 'Rosie', 'Tamlin'],
  'Demi-elfe': ['Arannis', 'Cael', 'Enna', 'Iskra', 'Meliora', 'Ryleth', 'Vaelen'],
  'Demi-orc':  ['Brakka', 'Durgan', 'Grommak', 'Kriv', 'Murka', 'Shakha', 'Ulruk'],
  Gnome:       ['Boddynock', 'Fibbl', 'Nimbledon', 'Orryn', 'Sindri', 'Wrenn', 'Zook'],
  Tieffelin:   ['Akmenos', 'Damaia', 'Iados', 'Kallista', 'Mordaï', 'Rieta', 'Skamos'],
  Drakéide:    ['Arjhan', 'Baragh', 'Daar', 'Kriv', 'Nadarr', 'Pandjed', 'Tazyn', 'Venmig']
}

// ------------------------- HELPERS -------------------------

export const modificateur = (stat: number): number => Math.floor((stat - 10) / 2)

export const bonusMaitrise = (niveau: number): number => Math.ceil(niveau / 4) + 1

export const findRace = (nom: string): Race | undefined =>
  RACES.find((r) => r.nom === nom)

export const findClasse = (nom: string): Classe | undefined =>
  CLASSES.find((c) => c.nom === nom)

export const findHistorique = (nom: string): Historique | undefined =>
  HISTORIQUES.find((h) => h.nom === nom)

export const pickRandom = <T,>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]

// Distribue 15/14/13/12/10/8 aléatoirement sur les 6 stats (avant bonus racial)
export const distribuerStandardArray = (): Record<StatKey, number> => {
  const arr = [...STANDARD_ARRAY]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return { for: arr[0], dex: arr[1], con: arr[2], int: arr[3], sag: arr[4], cha: arr[5] }
}

// Applique les bonus raciaux à un set de stats
export const appliquerBonusRace = (
  stats: Record<StatKey, number>,
  race: Race
): Record<StatKey, number> => ({
  for: stats.for + (race.bonusStats.for ?? 0),
  dex: stats.dex + (race.bonusStats.dex ?? 0),
  con: stats.con + (race.bonusStats.con ?? 0),
  int: stats.int + (race.bonusStats.int ?? 0),
  sag: stats.sag + (race.bonusStats.sag ?? 0),
  cha: stats.cha + (race.bonusStats.cha ?? 0)
})
