// ============================================================================
// Bestiaire D&D 5e (SRD) — modèles importables comme ennemis dans le compte.
// Utilisé par /dashboard/ennemis pour pré-remplir / importer des monstres.
// ============================================================================

export type TypeMonstre =
  | 'Aberration'
  | 'Bête'
  | 'Céleste'
  | 'Construction'
  | 'Dragon'
  | 'Élémentaire'
  | 'Fée'
  | 'Fiélon'
  | 'Géant'
  | 'Humanoïde'
  | 'Mort-vivant'
  | 'Plante'
  | 'Vase'
  | 'Monstruosité'

export type TailleMonstre =
  | 'TP' // Très petite
  | 'P'  // Petite
  | 'M'  // Moyenne
  | 'G'  // Grande
  | 'TG' // Très grande
  | 'Gig' // Gigantesque

export type Attaque = {
  nom: string
  bonus_attaque: number
  degats: string // ex. "1d8+2"
  type_degats: string // ex. "tranchant", "feu"
  portee?: string // ex. "1,50 m", "24/96 m"
  description?: string
}

export type Monstre = {
  nom: string
  nomEn: string
  type: TypeMonstre
  taille: TailleMonstre
  alignement: string
  cd: number // Classe de Difficulté (Challenge Rating). 0.125 = 1/8, 0.25 = 1/4, 0.5 = 1/2
  hp_max: number
  hp_formule?: string // ex. "2d6"
  ca: number
  vitesse: number // m/round (terrestre principal)
  vitesses_extra?: string // ex. "Vol 18 m, nage 9 m"
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
  resistances?: string[]
  immunites?: string[]
  vulnerabilites?: string[]
  attaques: Attaque[]
  capacites_speciales?: string[]
  description: string
}

// CD officielle utilisée comme clé de tri / filtre. Helper pour l'affichage.
export const formatCD = (cd: number): string => {
  if (cd === 0) return '0'
  if (cd === 0.125) return '1/8'
  if (cd === 0.25) return '1/4'
  if (cd === 0.5) return '1/2'
  return String(cd)
}

export const BESTIAIRE_DND5E: Monstre[] = [
  // ============== HUMANOÏDES BAS NIVEAU ==============
  {
    nom: 'Gobelin',
    nomEn: 'Goblin',
    type: 'Humanoïde',
    taille: 'P',
    alignement: 'Neutre Mauvais',
    cd: 0.25,
    hp_max: 7,
    hp_formule: '2d6',
    ca: 15,
    vitesse: 9,
    force: 8, dexterite: 14, constitution: 10, intelligence: 10, sagesse: 8, charisme: 8,
    attaques: [
      { nom: 'Cimeterre', bonus_attaque: 4, degats: '1d6+2', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Arc court', bonus_attaque: 4, degats: '1d6+2', type_degats: 'perforant', portee: '24/96 m' }
    ],
    capacites_speciales: [
      "Évasion agile : Désengagement ou Pointe en action bonus à chaque tour."
    ],
    description: "Petit humanoïde malicieux et lâche qui pille en bande. Vit dans les forêts, grottes ou ruines."
  },
  {
    nom: 'Hobgobelin',
    nomEn: 'Hobgoblin',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Loyal Mauvais',
    cd: 0.5,
    hp_max: 11,
    hp_formule: '2d8+2',
    ca: 18,
    vitesse: 9,
    force: 13, dexterite: 12, constitution: 12, intelligence: 10, sagesse: 10, charisme: 9,
    attaques: [
      { nom: 'Épée longue', bonus_attaque: 3, degats: '1d8+1', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Arc long', bonus_attaque: 3, degats: '1d8+1', type_degats: 'perforant', portee: '45/180 m' }
    ],
    capacites_speciales: [
      "Avantage martial : +2d6 dégâts contre une cible si un allié est dans 1,50 m d'elle."
    ],
    description: "Humanoïde militaire et discipliné, organisé en légions. Maître tacticien."
  },
  {
    nom: 'Bugbear',
    nomEn: 'Bugbear',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Chaotique Mauvais',
    cd: 1,
    hp_max: 27,
    hp_formule: '5d8+5',
    ca: 16,
    vitesse: 9,
    force: 15, dexterite: 14, constitution: 13, intelligence: 8, sagesse: 11, charisme: 9,
    attaques: [
      { nom: 'Étoile du matin', bonus_attaque: 4, degats: '2d8+2', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Javeline', bonus_attaque: 4, degats: '2d6+2', type_degats: 'perforant', portee: '9/36 m' }
    ],
    capacites_speciales: [
      'Embuscade : avantage à l\'attaque sur une cible surprise (+2d6 dégâts).',
      "Allonge : portée des attaques au corps à corps de 1,50 m supplémentaires."
    ],
    description: "Humanoïde poilu et féroce, embusqué dans la jungle ou les ruines. Souvent chef de bande gobeline."
  },
  {
    nom: 'Orc',
    nomEn: 'Orc',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Chaotique Mauvais',
    cd: 0.5,
    hp_max: 15,
    hp_formule: '2d8+6',
    ca: 13,
    vitesse: 9,
    force: 16, dexterite: 12, constitution: 16, intelligence: 7, sagesse: 11, charisme: 10,
    attaques: [
      { nom: 'Hache à deux mains', bonus_attaque: 5, degats: '1d12+3', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Javeline', bonus_attaque: 5, degats: '1d6+3', type_degats: 'perforant', portee: '9/36 m' }
    ],
    capacites_speciales: [
      'Agressif : action bonus pour avancer jusqu\'à sa vitesse vers un ennemi visible.'
    ],
    description: "Guerrier brutal au teint vert-grisâtre, dévot de Gruumsh. Pille en hordes les terres civilisées."
  },
  {
    nom: 'Kobold',
    nomEn: 'Kobold',
    type: 'Humanoïde',
    taille: 'P',
    alignement: 'Loyal Mauvais',
    cd: 0.125,
    hp_max: 5,
    hp_formule: '2d6-2',
    ca: 12,
    vitesse: 9,
    force: 7, dexterite: 15, constitution: 9, intelligence: 8, sagesse: 7, charisme: 8,
    resistances: [],
    attaques: [
      { nom: 'Dague', bonus_attaque: 4, degats: '1d4+2', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Fronde', bonus_attaque: 4, degats: '1d4+2', type_degats: 'contondant', portee: '9/36 m' }
    ],
    capacites_speciales: [
      "Bagarre en groupe : avantage à l'attaque si un allié non-incapacité est à 1,50 m de la cible.",
      "Sensibilité au soleil : désavantage en plein soleil sur attaques et Perception visuelle."
    ],
    description: "Petit reptile-humanoïde rusé. Pose pièges et embuscades dans les tunnels qu'il creuse."
  },

  // ============== MORTS-VIVANTS ==============
  {
    nom: 'Squelette',
    nomEn: 'Skeleton',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Loyal Mauvais',
    cd: 0.25,
    hp_max: 13,
    hp_formule: '2d8+4',
    ca: 13,
    vitesse: 9,
    force: 10, dexterite: 14, constitution: 15, intelligence: 6, sagesse: 8, charisme: 5,
    vulnerabilites: ['contondant'],
    immunites: ['poison'],
    attaques: [
      { nom: 'Épée courte', bonus_attaque: 4, degats: '1d6+2', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Arc court', bonus_attaque: 4, degats: '1d6+2', type_degats: 'perforant', portee: '24/96 m' }
    ],
    description: "Cadavre animé d'humanoïde. Aucune émotion, obéit aveuglément à son maître."
  },
  {
    nom: 'Zombie',
    nomEn: 'Zombie',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Neutre Mauvais',
    cd: 0.25,
    hp_max: 22,
    hp_formule: '3d8+9',
    ca: 8,
    vitesse: 6,
    force: 13, dexterite: 6, constitution: 16, intelligence: 3, sagesse: 6, charisme: 5,
    immunites: ['poison'],
    attaques: [
      { nom: 'Coup', bonus_attaque: 3, degats: '1d6+1', type_degats: 'contondant', portee: '1,50 m' }
    ],
    capacites_speciales: [
      'Acharnement mort-vivant : sauvegarde de Con (DD 5 + dégâts) à 0 PV — réussite : reste à 1 PV (sauf radiant ou crit).'
    ],
    description: "Cadavre putréfié animé. Lent, stupide, mais d'une endurance répugnante."
  },
  {
    nom: 'Goule',
    nomEn: 'Ghoul',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Chaotique Mauvais',
    cd: 1,
    hp_max: 22,
    hp_formule: '5d8',
    ca: 12,
    vitesse: 9,
    force: 13, dexterite: 15, constitution: 10, intelligence: 7, sagesse: 10, charisme: 6,
    immunites: ['poison', 'charmé', 'terrorisé'],
    attaques: [
      { nom: 'Morsure', bonus_attaque: 2, degats: '2d6+2', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Griffes', bonus_attaque: 4, degats: '2d4+2', type_degats: 'tranchant', portee: '1,50 m', description: 'Sauvegarde de Con DD 10 ou paralysé 1 minute (renouvelée fin de tour).' }
    ],
    description: "Mort-vivant cannibale aux longs ongles. Sa griffe paralyse les mortels."
  },
  {
    nom: 'Spectre',
    nomEn: 'Specter',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Chaotique Mauvais',
    cd: 1,
    hp_max: 22,
    hp_formule: '5d8',
    ca: 12,
    vitesse: 0, vitesses_extra: 'Vol 15 m (vol stationnaire)',
    force: 1, dexterite: 14, constitution: 11, intelligence: 10, sagesse: 10, charisme: 11,
    resistances: ['acide', 'froid', 'feu', 'foudre', 'tonnerre', 'contondant', 'perforant', 'tranchant non magique'],
    immunites: ['poison', 'nécrotique', 'charmé', 'paralysé', 'pétrifié', 'empoisonné', 'à terre', 'agrippé', 'inconscient'],
    attaques: [
      { nom: 'Toucher de la vie', bonus_attaque: 4, degats: '3d6', type_degats: 'nécrotique', portee: '1,50 m', description: "Réduit le PV max de la cible (regain repos long uniquement)." }
    ],
    capacites_speciales: [
      'Incorporel : peut traverser la matière (1d10 force si commence/finit son tour à l\'intérieur).',
      "Sensibilité au soleil : désavantage en plein soleil."
    ],
    description: "Âme errante d'un mort tragique, dérive dans les ombres en cherchant à voler la vie des vivants."
  },
  {
    nom: 'Spectre lumineux',
    nomEn: 'Wraith',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Neutre Mauvais',
    cd: 5,
    hp_max: 67,
    hp_formule: '9d8+27',
    ca: 13,
    vitesse: 0, vitesses_extra: 'Vol 18 m (vol stationnaire)',
    force: 6, dexterite: 16, constitution: 16, intelligence: 12, sagesse: 14, charisme: 15,
    resistances: ['acide', 'froid', 'feu', 'foudre', 'tonnerre', 'contondant', 'perforant', 'tranchant non magique'],
    immunites: ['poison', 'nécrotique', 'charmé', 'paralysé', 'pétrifié', 'empoisonné', 'à terre', 'agrippé', 'inconscient'],
    attaques: [
      { nom: 'Drain de vie', bonus_attaque: 6, degats: '4d8+3', type_degats: 'nécrotique', portee: '1,50 m', description: "Réduit le PV max de la cible." }
    ],
    capacites_speciales: [
      'Création de spectre : si une créature humanoïde tuée par drain reste sans soins divins, elle devient un spectre subordonné.',
      'Incorporel.'
    ],
    description: "Forme spectrale puissante, ombre mauvaise qui asservit les âmes des morts."
  },
  {
    nom: 'Liche',
    nomEn: 'Lich',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Toute sorte de mauvais',
    cd: 21,
    hp_max: 135,
    hp_formule: '18d8+54',
    ca: 17,
    vitesse: 9,
    force: 11, dexterite: 16, constitution: 16, intelligence: 20, sagesse: 14, charisme: 16,
    resistances: ['froid', 'foudre', 'nécrotique'],
    immunites: ['poison', 'contondant/perforant/tranchant non magique', 'charmé', 'épuisement', 'terrorisé', 'paralysé', 'empoisonné'],
    attaques: [
      { nom: 'Toucher paralysant', bonus_attaque: 12, degats: '3d6', type_degats: 'froid', portee: '1,50 m', description: "Sauvegarde Con DD 18 ou paralysé 1 min." }
    ],
    capacites_speciales: [
      'Incantation : magicien niveau 18, peut lancer Boule de feu, Doigt de mort, Cage de force, Souhait, etc.',
      'Phylactère : revient à la vie 1d10 jours après destruction si le phylactère subsiste.',
      'Régénération mort-vivant : 10 PV au début de chaque tour.'
    ],
    description: "Magicien immortel ayant transféré son âme dans un phylactère. Maître du savoir maudit et de la nécromancie."
  },

  // ============== BÊTES ==============
  {
    nom: 'Loup',
    nomEn: 'Wolf',
    type: 'Bête',
    taille: 'M',
    alignement: 'Sans alignement',
    cd: 0.25,
    hp_max: 11,
    hp_formule: '2d8+2',
    ca: 13,
    vitesse: 12,
    force: 12, dexterite: 15, constitution: 12, intelligence: 3, sagesse: 12, charisme: 6,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 4, degats: '2d4+2', type_degats: 'perforant', portee: '1,50 m', description: "Sauvegarde de Force DD 11 ou bousculée à terre." }
    ],
    capacites_speciales: [
      "Tactique de meute : avantage à l'attaque si un allié non-incapacité est à 1,50 m de la cible.",
      'Odorat & ouïe aiguisés : avantage à la Perception via odorat ou ouïe.'
    ],
    description: "Carnivore territorial, chasse en meute. Chien sauvage des forêts tempérées."
  },
  {
    nom: 'Ours',
    nomEn: 'Brown Bear',
    type: 'Bête',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 1,
    hp_max: 34,
    hp_formule: '4d10+12',
    ca: 11,
    vitesse: 12, vitesses_extra: 'Escalade 9 m',
    force: 19, dexterite: 10, constitution: 16, intelligence: 2, sagesse: 13, charisme: 7,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Une morsure et une griffe.' },
      { nom: 'Morsure', bonus_attaque: 6, degats: '1d8+4', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Griffes', bonus_attaque: 6, degats: '2d6+4', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Odorat aiguisé.'],
    description: "Ours brun massif, agressif quand affamé ou défendant ses petits."
  },
  {
    nom: 'Sanglier',
    nomEn: 'Boar',
    type: 'Bête',
    taille: 'M',
    alignement: 'Sans alignement',
    cd: 0.25,
    hp_max: 11,
    hp_formule: '2d8+2',
    ca: 11,
    vitesse: 12,
    force: 13, dexterite: 11, constitution: 12, intelligence: 2, sagesse: 9, charisme: 5,
    attaques: [
      { nom: 'Défenses', bonus_attaque: 3, degats: '1d6+1', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: [
      'Charge : si avance ≥ 6 m droit avant l\'attaque, +1d6 dégâts et possible bousculade.',
      "Acharnement : à 0 PV, sauvegarde Con DD 11 réussie → reste à 1 PV."
    ],
    description: "Cochon sauvage agressif, charge tête baissée à la moindre provocation."
  },
  {
    nom: 'Aigle géant',
    nomEn: 'Giant Eagle',
    type: 'Bête',
    taille: 'G',
    alignement: 'Neutre Bon',
    cd: 1,
    hp_max: 26,
    hp_formule: '4d10+4',
    ca: 13,
    vitesse: 3, vitesses_extra: 'Vol 24 m',
    force: 16, dexterite: 17, constitution: 13, intelligence: 8, sagesse: 14, charisme: 10,
    attaques: [
      { nom: 'Bec', bonus_attaque: 5, degats: '1d6+3', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Serres', bonus_attaque: 5, degats: '2d6+3', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Vue perçante : avantage à la Perception visuelle.'],
    description: "Aigle de la taille d'un poney, intelligent et noble. Allié naturel des elfes."
  },
  {
    nom: 'Araignée géante',
    nomEn: 'Giant Spider',
    type: 'Bête',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 1,
    hp_max: 26,
    hp_formule: '4d10+4',
    ca: 14,
    vitesse: 9, vitesses_extra: 'Escalade 9 m',
    force: 14, dexterite: 16, constitution: 12, intelligence: 2, sagesse: 11, charisme: 4,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 5, degats: '1d8+3 + 2d8 poison', type_degats: 'perforant + poison', portee: '1,50 m', description: "Sauvegarde Con DD 11 ; échec : empoisonnée 1 h, à 0 PV → stable mais paralysée 1 h." },
      { nom: 'Toile', bonus_attaque: 5, degats: '—', type_degats: '—', portee: '9/18 m', description: "Restraint la cible. Sauvegarde de Force DD 12 pour s'arracher." }
    ],
    capacites_speciales: [
      "Marche dans les toiles : ignore les terrains de toile.",
      "Sens d'araignée : sait localiser les créatures touchant ses toiles."
    ],
    description: "Araignée monstrueuse tisseuse de toiles dans les caves et forêts sombres."
  },
  {
    nom: 'Serpent constricteur',
    nomEn: 'Constrictor Snake',
    type: 'Bête',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 0.25,
    hp_max: 13,
    hp_formule: '2d10+2',
    ca: 12,
    vitesse: 9, vitesses_extra: 'Nage 9 m',
    force: 15, dexterite: 14, constitution: 12, intelligence: 1, sagesse: 10, charisme: 3,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 4, degats: '1d6+2', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Constriction', bonus_attaque: 4, degats: '1d8+2', type_degats: 'contondant', portee: '1,50 m', description: "La cible est agrippée (DD 14 Évasion)." }
    ],
    description: "Long serpent musculeux qui étreint sa proie jusqu'à l'asphyxie."
  },

  // ============== GÉANTS ==============
  {
    nom: 'Ogre',
    nomEn: 'Ogre',
    type: 'Géant',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 2,
    hp_max: 59,
    hp_formule: '7d10+21',
    ca: 11,
    vitesse: 12,
    force: 19, dexterite: 8, constitution: 16, intelligence: 5, sagesse: 7, charisme: 7,
    attaques: [
      { nom: 'Massue', bonus_attaque: 6, degats: '2d8+4', type_degats: 'contondant', portee: '1,50 m' },
      { nom: 'Javeline', bonus_attaque: 6, degats: '2d6+4', type_degats: 'perforant', portee: '9/36 m' }
    ],
    description: "Géant brutal et stupide, mercenaire pour des chefs plus rusés. Mange tout ce qu'il tue."
  },
  {
    nom: 'Troll',
    nomEn: 'Troll',
    type: 'Géant',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 5,
    hp_max: 84,
    hp_formule: '8d10+40',
    ca: 15,
    vitesse: 9,
    force: 18, dexterite: 13, constitution: 20, intelligence: 7, sagesse: 9, charisme: 7,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Une morsure et deux griffes.' },
      { nom: 'Morsure', bonus_attaque: 7, degats: '1d6+4', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Griffes', bonus_attaque: 7, degats: '2d6+4', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: [
      'Régénération : 10 PV par début de tour. Le feu ou l\'acide bloquent la régénération sur 1 tour.',
      'Odorat aiguisé.'
    ],
    description: "Géant difforme à la peau verdâtre. Quasi immortel sauf au feu ou à l'acide."
  },
  {
    nom: 'Géant des collines',
    nomEn: 'Hill Giant',
    type: 'Géant',
    taille: 'TG',
    alignement: 'Chaotique Mauvais',
    cd: 5,
    hp_max: 105,
    hp_formule: '10d12+40',
    ca: 13,
    vitesse: 12,
    force: 21, dexterite: 8, constitution: 19, intelligence: 5, sagesse: 9, charisme: 6,
    attaques: [
      { nom: 'Massue géante', bonus_attaque: 8, degats: '3d8+5', type_degats: 'contondant', portee: '3 m' },
      { nom: 'Rocher', bonus_attaque: 8, degats: '3d10+5', type_degats: 'contondant', portee: '18/72 m' }
    ],
    description: "Géant glouton et brutal, mange jusqu'à 5 fois son poids par jour."
  },
  {
    nom: 'Géant de pierre',
    nomEn: 'Stone Giant',
    type: 'Géant',
    taille: 'TG',
    alignement: 'Neutre',
    cd: 7,
    hp_max: 126,
    hp_formule: '11d12+55',
    ca: 17,
    vitesse: 12,
    force: 23, dexterite: 15, constitution: 20, intelligence: 10, sagesse: 12, charisme: 9,
    attaques: [
      { nom: 'Massue géante', bonus_attaque: 9, degats: '3d8+6', type_degats: 'contondant', portee: '3 m' },
      { nom: 'Rocher', bonus_attaque: 9, degats: '4d10+6', type_degats: 'contondant', portee: '18/72 m', description: "Si touche, sauvegarde de Force DD 17 ou à terre." }
    ],
    capacites_speciales: ["Camouflage rocheux : avantage à la Discrétion en terrain caillouteux."],
    description: "Géant introspectif et taciturne vivant dans les montagnes. Maître sculpteur."
  },
  {
    nom: 'Géant du givre',
    nomEn: 'Frost Giant',
    type: 'Géant',
    taille: 'TG',
    alignement: 'Neutre Mauvais',
    cd: 8,
    hp_max: 138,
    hp_formule: '12d12+60',
    ca: 15,
    vitesse: 12,
    force: 23, dexterite: 9, constitution: 21, intelligence: 9, sagesse: 10, charisme: 12,
    immunites: ['froid'],
    attaques: [
      { nom: 'Hache géante', bonus_attaque: 9, degats: '3d12+6', type_degats: 'tranchant', portee: '3 m' },
      { nom: 'Rocher', bonus_attaque: 9, degats: '4d10+6', type_degats: 'contondant', portee: '18/72 m' }
    ],
    description: "Guerrier sauvage des terres polaires, raideur et fierté glaciales."
  },
  {
    nom: 'Géant du feu',
    nomEn: 'Fire Giant',
    type: 'Géant',
    taille: 'TG',
    alignement: 'Loyal Mauvais',
    cd: 9,
    hp_max: 162,
    hp_formule: '13d12+78',
    ca: 18,
    vitesse: 9,
    force: 25, dexterite: 9, constitution: 23, intelligence: 10, sagesse: 14, charisme: 13,
    immunites: ['feu'],
    attaques: [
      { nom: 'Épée géante', bonus_attaque: 11, degats: '6d6+7', type_degats: 'tranchant', portee: '3 m' },
      { nom: 'Rocher', bonus_attaque: 11, degats: '4d10+7', type_degats: 'contondant', portee: '18/72 m' }
    ],
    description: "Forgeron d'élite des forteresses volcaniques. Discipline militaire impitoyable."
  },
  {
    nom: 'Géant des nuages',
    nomEn: 'Cloud Giant',
    type: 'Géant',
    taille: 'TG',
    alignement: 'Neutre',
    cd: 9,
    hp_max: 200,
    hp_formule: '16d12+96',
    ca: 14,
    vitesse: 12,
    force: 27, dexterite: 10, constitution: 22, intelligence: 12, sagesse: 16, charisme: 16,
    attaques: [
      { nom: 'Massue géante', bonus_attaque: 12, degats: '3d8+8', type_degats: 'contondant', portee: '3 m' },
      { nom: 'Rocher', bonus_attaque: 12, degats: '4d10+8', type_degats: 'contondant', portee: '18/72 m' }
    ],
    capacites_speciales: [
      'Magie innée : Détection de la magie, Brouillard, Marche sur le vent (1/jour : Vol).'
    ],
    description: "Géant aristocratique vivant dans des palais sur les nuages. Méprise les races terrestres."
  },
  {
    nom: 'Minotaure',
    nomEn: 'Minotaur',
    type: 'Monstruosité',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 3,
    hp_max: 76,
    hp_formule: '9d10+27',
    ca: 14,
    vitesse: 12,
    force: 18, dexterite: 11, constitution: 16, intelligence: 6, sagesse: 16, charisme: 9,
    attaques: [
      { nom: 'Hache à deux mains', bonus_attaque: 6, degats: '2d12+4', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Cornes', bonus_attaque: 6, degats: '2d8+4', type_degats: 'perforant', portee: '1,50 m' }
    ],
    capacites_speciales: [
      'Charge : si avance ≥ 3 m, +2d8 perforant et bousculade possible.',
      'Récupération labyrinthique : ne se perd jamais en cartographiant.'
    ],
    description: "Tête de taureau sur corps humanoïde, maître des labyrinthes et de la rage meurtrière."
  },

  // ============== FIÉLONS ==============
  {
    nom: 'Diablotin',
    nomEn: 'Imp',
    type: 'Fiélon',
    taille: 'TP',
    alignement: 'Loyal Mauvais',
    cd: 1,
    hp_max: 10,
    hp_formule: '3d4+3',
    ca: 13,
    vitesse: 6, vitesses_extra: 'Vol 12 m',
    force: 6, dexterite: 17, constitution: 13, intelligence: 11, sagesse: 12, charisme: 14,
    resistances: ['froid', 'contondant/perforant/tranchant d\'armes non magiques non argentées'],
    immunites: ['feu', 'poison', 'empoisonné'],
    attaques: [
      { nom: 'Dard (forme normale)', bonus_attaque: 5, degats: '1d4+3 + 3d6 poison', type_degats: 'perforant + poison', portee: '1,50 m', description: "Sauvegarde Con DD 11 ou la moitié des dégâts de poison." }
    ],
    capacites_speciales: [
      "Métamorphose : peut prendre la forme d'un rat, corbeau ou araignée.",
      'Invisibilité.',
      'Vue dans le noir 36 m.'
    ],
    description: "Petit diable ailé et cornu, espion fourbe au service des sorciers ou démons supérieurs."
  },
  {
    nom: 'Quasit',
    nomEn: 'Quasit',
    type: 'Fiélon',
    taille: 'TP',
    alignement: 'Chaotique Mauvais',
    cd: 1,
    hp_max: 7,
    hp_formule: '3d4',
    ca: 13,
    vitesse: 12,
    force: 5, dexterite: 17, constitution: 10, intelligence: 7, sagesse: 10, charisme: 10,
    resistances: ['froid', 'feu', 'foudre', 'contondant/perforant/tranchant d\'armes non magiques'],
    immunites: ['poison', 'empoisonné'],
    attaques: [
      { nom: 'Griffes (forme normale)', bonus_attaque: 4, degats: '1d4+3', type_degats: 'tranchant', portee: '1,50 m', description: "Sauvegarde Con DD 10 ou empoisonnée 1 minute." }
    ],
    capacites_speciales: [
      'Métamorphose : ours, chauve-souris ou crapaud.',
      'Effroi (action) : sauvegarde Sag DD 10 ou terrorisée 1 min.',
      'Invisibilité (action).'
    ],
    description: "Démon mineur familier des sorciers maléfiques. Lâche, intrigant, perfide."
  },
  {
    nom: "Diable barbu",
    nomEn: 'Bearded Devil',
    type: 'Fiélon',
    taille: 'M',
    alignement: 'Loyal Mauvais',
    cd: 3,
    hp_max: 52,
    hp_formule: '8d8+16',
    ca: 13,
    vitesse: 9,
    force: 16, dexterite: 15, constitution: 15, intelligence: 9, sagesse: 11, charisme: 11,
    resistances: ['froid', 'contondant/perforant/tranchant d\'armes non magiques non argentées'],
    immunites: ['feu', 'poison', 'empoisonné'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Barbe + glaive infernal.' },
      { nom: 'Barbe', bonus_attaque: 5, degats: '1d8+2', type_degats: 'perforant', portee: '1,50 m', description: "Maladie infernale : sauvegarde Con DD 12 ou plaies non guérissables tant que la maladie persiste." },
      { nom: 'Glaive infernal', bonus_attaque: 5, degats: '1d10+3', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Vue dans le noir magique 36 m.'],
    description: "Soldat des Neuf Enfers à la barbe vivante de serpents."
  },
  {
    nom: 'Démon abyssal (Vrock)',
    nomEn: 'Vrock',
    type: 'Fiélon',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 6,
    hp_max: 104,
    hp_formule: '11d10+44',
    ca: 15,
    vitesse: 12, vitesses_extra: 'Vol 18 m',
    force: 17, dexterite: 15, constitution: 18, intelligence: 8, sagesse: 13, charisme: 8,
    resistances: ['froid', 'feu', 'foudre', 'contondant/perforant/tranchant d\'armes non magiques'],
    immunites: ['poison', 'empoisonné'],
    attaques: [
      { nom: 'Bec', bonus_attaque: 6, degats: '2d6+3', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Serres', bonus_attaque: 6, degats: '2d10+3', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Spores assourdissantes (recharge 6)', bonus_attaque: 0, degats: '3d6 poison/round', type_degats: 'poison', portee: 'Zone 6 m', description: "Sauvegarde Con DD 14 — empoisonnée et 3d6 poison/tour pendant 1 min." }
    ],
    description: "Démon-vautour bipède au cri perçant. Cible les rangs arrière en premier."
  },

  // ============== CÉLESTES ==============
  {
    nom: 'Ange déva',
    nomEn: 'Deva',
    type: 'Céleste',
    taille: 'M',
    alignement: 'Loyal Bon',
    cd: 10,
    hp_max: 136,
    hp_formule: '16d8+64',
    ca: 17,
    vitesse: 9, vitesses_extra: 'Vol 27 m',
    force: 18, dexterite: 18, constitution: 18, intelligence: 17, sagesse: 20, charisme: 20,
    resistances: ['radiant', 'contondant/perforant/tranchant non magiques'],
    immunites: ['charmé', 'épuisement', 'terrorisé'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Deux frappes de masse.' },
      { nom: 'Masse', bonus_attaque: 8, degats: '1d8+4 + 4d8', type_degats: 'contondant + radiant', portee: '1,50 m' }
    ],
    capacites_speciales: [
      'Métamorphose : peut prendre forme humanoïde ou bête.',
      'Magie innée : Détection du mal, Bouclier de la foi, Soin (1/jour : Communion, Restauration suprême).'
    ],
    description: "Messager des dieux, ailes argentées et regard inflexible. Champion de la lumière."
  },

  // ============== DRAGONS — JEUNES (CD 9-10) ==============
  {
    nom: 'Dragon rouge (jeune)',
    nomEn: 'Young Red Dragon',
    type: 'Dragon',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 10,
    hp_max: 178,
    hp_formule: '17d10+85',
    ca: 18,
    vitesse: 12, vitesses_extra: 'Escalade 12 m, Vol 24 m',
    force: 23, dexterite: 10, constitution: 21, intelligence: 14, sagesse: 11, charisme: 19,
    immunites: ['feu'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Une morsure et deux griffes.' },
      { nom: 'Morsure', bonus_attaque: 10, degats: '2d10+6 + 1d6 feu', type_degats: 'perforant + feu', portee: '3 m' },
      { nom: 'Griffes', bonus_attaque: 10, degats: '2d6+6', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Souffle de feu (recharge 5-6)', bonus_attaque: 0, degats: '16d6', type_degats: 'feu', portee: 'Cône 9 m', description: "Sauvegarde Dex DD 17 (moitié)." }
    ],
    description: "Dragon rouge juvénile : tyran arrogant, déjà mortellement dangereux."
  },
  {
    nom: 'Dragon bleu (jeune)',
    nomEn: 'Young Blue Dragon',
    type: 'Dragon',
    taille: 'G',
    alignement: 'Loyal Mauvais',
    cd: 9,
    hp_max: 152,
    hp_formule: '16d10+64',
    ca: 18,
    vitesse: 12, vitesses_extra: 'Creusement 9 m, Vol 24 m',
    force: 21, dexterite: 10, constitution: 19, intelligence: 14, sagesse: 13, charisme: 17,
    immunites: ['foudre'],
    attaques: [
      { nom: 'Morsure', bonus_attaque: 9, degats: '2d10+5 + 1d10 foudre', type_degats: 'perforant + foudre', portee: '3 m' },
      { nom: 'Souffle d\'éclair (recharge 5-6)', bonus_attaque: 0, degats: '10d10', type_degats: 'foudre', portee: 'Ligne 18 m', description: "Sauvegarde Dex DD 16 (moitié)." }
    ],
    description: "Manipulateur cruel des déserts, foudroie de loin avant d'attaquer."
  },
  {
    nom: 'Dragon vert (jeune)',
    nomEn: 'Young Green Dragon',
    type: 'Dragon',
    taille: 'G',
    alignement: 'Loyal Mauvais',
    cd: 8,
    hp_max: 136,
    hp_formule: '16d10+48',
    ca: 18,
    vitesse: 12, vitesses_extra: 'Nage 12 m, Vol 24 m',
    force: 19, dexterite: 12, constitution: 17, intelligence: 16, sagesse: 13, charisme: 15,
    immunites: ['poison', 'empoisonné'],
    attaques: [
      { nom: 'Morsure', bonus_attaque: 8, degats: '2d10+4 + 2d6 poison', type_degats: 'perforant + poison', portee: '3 m' },
      { nom: 'Souffle de gaz toxique (recharge 5-6)', bonus_attaque: 0, degats: '12d6', type_degats: 'poison', portee: 'Cône 9 m', description: "Sauvegarde Con DD 14 (moitié)." }
    ],
    description: "Dragon forestier et fourbe, manipulateur né. Préfère la traîtrise au combat direct."
  },
  {
    nom: 'Dragon blanc (jeune)',
    nomEn: 'Young White Dragon',
    type: 'Dragon',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 6,
    hp_max: 133,
    hp_formule: '14d10+56',
    ca: 17,
    vitesse: 12, vitesses_extra: 'Creusement 6 m, Nage 12 m, Vol 24 m',
    force: 18, dexterite: 10, constitution: 18, intelligence: 6, sagesse: 11, charisme: 12,
    immunites: ['froid'],
    attaques: [
      { nom: 'Morsure', bonus_attaque: 7, degats: '2d10+4 + 1d8 froid', type_degats: 'perforant + froid', portee: '3 m' },
      { nom: 'Souffle glacial (recharge 5-6)', bonus_attaque: 0, degats: '10d8', type_degats: 'froid', portee: 'Cône 9 m', description: "Sauvegarde Con DD 15 (moitié)." }
    ],
    description: "Le moins intelligent des dragons chromatiques, mais une rage glaciale impitoyable."
  },
  {
    nom: 'Dragon noir (jeune)',
    nomEn: 'Young Black Dragon',
    type: 'Dragon',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 7,
    hp_max: 127,
    hp_formule: '15d10+45',
    ca: 18,
    vitesse: 12, vitesses_extra: 'Nage 12 m, Vol 24 m',
    force: 19, dexterite: 14, constitution: 17, intelligence: 12, sagesse: 11, charisme: 15,
    immunites: ['acide'],
    attaques: [
      { nom: 'Morsure', bonus_attaque: 7, degats: '2d10+4 + 1d8 acide', type_degats: 'perforant + acide', portee: '3 m' },
      { nom: 'Souffle acide (recharge 5-6)', bonus_attaque: 0, degats: '11d8', type_degats: 'acide', portee: 'Ligne 9 m', description: "Sauvegarde Dex DD 14 (moitié)." }
    ],
    description: "Dragon des marais, sadique et patient. Fatigue sa proie avant l'embuscade."
  },
  {
    nom: 'Dragon d\'or (jeune)',
    nomEn: 'Young Gold Dragon',
    type: 'Dragon',
    taille: 'G',
    alignement: 'Loyal Bon',
    cd: 10,
    hp_max: 178,
    hp_formule: '17d10+85',
    ca: 18,
    vitesse: 12, vitesses_extra: 'Nage 12 m, Vol 24 m',
    force: 23, dexterite: 14, constitution: 21, intelligence: 16, sagesse: 13, charisme: 17,
    immunites: ['feu'],
    attaques: [
      { nom: 'Morsure', bonus_attaque: 10, degats: '2d10+6 + 1d6 feu', type_degats: 'perforant + feu', portee: '3 m' },
      { nom: 'Souffle de feu (recharge 5-6)', bonus_attaque: 0, degats: '13d6 feu OU souffle d\'affaiblissement (sauvegarde Cha)', type_degats: 'feu/affaiblissement', portee: 'Cône 9 m' }
    ],
    description: "Le plus noble des dragons métalliques. Sage, juste, défenseur des innocents."
  },
  {
    nom: 'Dragon d\'argent (jeune)',
    nomEn: 'Young Silver Dragon',
    type: 'Dragon',
    taille: 'G',
    alignement: 'Loyal Bon',
    cd: 9,
    hp_max: 168,
    hp_formule: '16d10+80',
    ca: 18,
    vitesse: 12, vitesses_extra: 'Vol 24 m',
    force: 23, dexterite: 10, constitution: 21, intelligence: 14, sagesse: 11, charisme: 19,
    immunites: ['froid'],
    attaques: [
      { nom: 'Morsure', bonus_attaque: 10, degats: '2d10+6', type_degats: 'perforant', portee: '3 m' },
      { nom: 'Souffle glacial (recharge 5-6)', bonus_attaque: 0, degats: '12d8', type_degats: 'froid', portee: 'Cône 9 m', description: "Sauvegarde Con DD 17 (moitié)." }
    ],
    description: "Dragon civilisé, vit souvent parmi les humains sous forme polymorphée."
  },
  {
    nom: 'Dragon de bronze (jeune)',
    nomEn: 'Young Bronze Dragon',
    type: 'Dragon',
    taille: 'G',
    alignement: 'Loyal Bon',
    cd: 8,
    hp_max: 142,
    hp_formule: '15d10+60',
    ca: 18,
    vitesse: 12, vitesses_extra: 'Nage 12 m, Vol 24 m',
    force: 21, dexterite: 10, constitution: 19, intelligence: 14, sagesse: 13, charisme: 17,
    immunites: ['foudre'],
    attaques: [
      { nom: 'Morsure', bonus_attaque: 9, degats: '2d10+5', type_degats: 'perforant', portee: '3 m' },
      { nom: 'Souffle d\'éclair (recharge 5-6)', bonus_attaque: 0, degats: '10d10', type_degats: 'foudre', portee: 'Ligne 18 m', description: "Sauvegarde Dex DD 16." }
    ],
    description: "Dragon des mers, défenseur des côtes. Aime la philosophie et la guerre juste."
  },
  {
    nom: 'Dragon de cuivre (jeune)',
    nomEn: 'Young Copper Dragon',
    type: 'Dragon',
    taille: 'G',
    alignement: 'Chaotique Bon',
    cd: 7,
    hp_max: 119,
    hp_formule: '14d10+42',
    ca: 17,
    vitesse: 12, vitesses_extra: 'Escalade 12 m, Vol 24 m',
    force: 19, dexterite: 12, constitution: 17, intelligence: 14, sagesse: 11, charisme: 15,
    immunites: ['acide'],
    attaques: [
      { nom: 'Morsure', bonus_attaque: 7, degats: '2d10+4', type_degats: 'perforant', portee: '3 m' },
      { nom: 'Souffle acide (recharge 5-6)', bonus_attaque: 0, degats: '11d8', type_degats: 'acide', portee: 'Ligne 12 m', description: "Sauvegarde Dex DD 14." },
      { nom: 'Souffle de gaz ralentissant', bonus_attaque: 0, degats: '—', type_degats: '—', portee: 'Cône 9 m', description: "Sauvegarde Con DD 14 ou vitesse réduite, attaques limitées 1 min." }
    ],
    description: "Dragon farceur, adore l'humour pince-sans-rire et les énigmes."
  },

  // ============== MORTS-VIVANTS — Avancés ==============
  {
    nom: 'Banshee',
    nomEn: 'Banshee',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Chaotique Mauvais',
    cd: 4,
    hp_max: 58,
    hp_formule: '13d8',
    ca: 12,
    vitesse: 0, vitesses_extra: 'Vol 12 m (vol stationnaire)',
    force: 1, dexterite: 14, constitution: 10, intelligence: 12, sagesse: 11, charisme: 17,
    resistances: ['acide', 'feu', 'foudre', 'tonnerre', 'contondant/perforant/tranchant non magiques'],
    immunites: ['froid', 'nécrotique', 'poison', 'charmé', 'épuisement', 'terrorisé', 'paralysé', 'pétrifié', 'à terre', 'agrippé'],
    attaques: [
      { nom: 'Toucher corrosif', bonus_attaque: 4, degats: '3d6+2', type_degats: 'nécrotique', portee: '1,50 m' },
      { nom: 'Hurlement (1/jour)', bonus_attaque: 0, degats: '3d6', type_degats: 'psychique', portee: 'Auto 9 m', description: "Sauvegarde Con DD 13 ; échec : à 0 PV ; réussite : 3d6 psychique." }
    ],
    capacites_speciales: ['Incorporel.', 'Vision dans le noir 18 m.'],
    description: "Esprit elfique tourmenté qui hurle dans les ruines. Son cri tue les faibles."
  },
  {
    nom: 'Death Knight',
    nomEn: 'Death Knight',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Chaotique Mauvais',
    cd: 17,
    hp_max: 180,
    hp_formule: '19d8+95',
    ca: 20,
    vitesse: 9,
    force: 20, dexterite: 11, constitution: 20, intelligence: 12, sagesse: 16, charisme: 18,
    immunites: ['nécrotique', 'poison', 'épuisement', 'terrorisé', 'empoisonné'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: "Trois attaques d'épée à deux mains." },
      { nom: 'Épée à deux mains', bonus_attaque: 11, degats: '2d6+6 + 4d8', type_degats: 'tranchant + nécrotique', portee: '1,50 m' },
      { nom: 'Frappe ardente (1/repos court)', bonus_attaque: 11, degats: '2d6+6 + 8d8', type_degats: 'tranchant + feu', portee: '1,50 m' }
    ],
    capacites_speciales: [
      'Sorts (paladin niv 19) : Bouclier, Soin, Destruction (5e niv), Cercle d\'effroi.',
      'Aura pourpre : Allié dans 9 m a avantage aux jets de sauvegarde contre les sorts.',
      'Riposte magique : si ratée par un sort, peut le renvoyer.'
    ],
    description: "Paladin déchu transformé en mort-vivant tortionnaire par sa propre malédiction."
  },
  {
    nom: 'Momie',
    nomEn: 'Mummy',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Loyal Mauvais',
    cd: 3,
    hp_max: 58,
    hp_formule: '9d8+18',
    ca: 11,
    vitesse: 6,
    force: 16, dexterite: 8, constitution: 15, intelligence: 6, sagesse: 10, charisme: 12,
    vulnerabilites: ['feu'],
    resistances: ['contondant/perforant/tranchant non magiques'],
    immunites: ['nécrotique', 'poison', 'charmé', 'épuisement', 'terrorisé', 'paralysé', 'empoisonné'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Une attaque d\'effroi puis un coup pourrissant.' },
      { nom: 'Coup pourrissant', bonus_attaque: 5, degats: '2d6+3 + 3d6', type_degats: 'contondant + nécrotique', portee: '1,50 m', description: "Sauvegarde Con DD 12 ou Maladie de la momie (PV max ne se régénèrent pas tant qu'elle n'est pas guérie)." },
      { nom: 'Regard d\'effroi', bonus_attaque: 0, degats: '—', type_degats: '—', portee: '18 m', description: "Sauvegarde Sag DD 11 ou paralysée 1 min (renouvelée fin de tour)." }
    ],
    description: "Cadavre embaumé animé par malédiction. Gardien de tombeaux antiques."
  },
  {
    nom: 'Seigneur momie',
    nomEn: 'Mummy Lord',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Loyal Mauvais',
    cd: 15,
    hp_max: 97,
    hp_formule: '13d8+39',
    ca: 17,
    vitesse: 6,
    force: 18, dexterite: 10, constitution: 17, intelligence: 11, sagesse: 18, charisme: 16,
    vulnerabilites: [],
    resistances: ['contondant/perforant/tranchant non magiques'],
    immunites: ['nécrotique', 'poison', 'charmé', 'épuisement', 'terrorisé', 'paralysé', 'empoisonné'],
    attaques: [
      { nom: 'Coup pourrissant', bonus_attaque: 9, degats: '3d6+4 + 10d6', type_degats: 'contondant + nécrotique', portee: '1,50 m' },
      { nom: 'Regard d\'effroi', bonus_attaque: 0, degats: '—', type_degats: '—', portee: '18 m', description: 'Sauvegarde Sag DD 14 ou paralysée 1 min.' }
    ],
    capacites_speciales: [
      'Sorts (clerc niv 10) : Détection du mal, Protection, Bénédiction, Insectes en nuée, Imprécation, etc.',
      'Régénération mort-vivant : revient dans 24 h tant que son cœur intact existe ailleurs.'
    ],
    description: "Pharaon mort-vivant, jaloux et éternel, gardien des trésors d'antan."
  },
  {
    nom: 'Vampire',
    nomEn: 'Vampire',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Loyal Mauvais',
    cd: 13,
    hp_max: 144,
    hp_formule: '17d8+68',
    ca: 16,
    vitesse: 9,
    force: 18, dexterite: 18, constitution: 18, intelligence: 17, sagesse: 15, charisme: 18,
    resistances: ['nécrotique', 'contondant/perforant/tranchant non magiques'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Deux attaques (au moins une morsure).' },
      { nom: 'Frappe nue', bonus_attaque: 9, degats: '1d8+4 + 3d6', type_degats: 'contondant + nécrotique', portee: '1,50 m' },
      { nom: 'Morsure', bonus_attaque: 9, degats: '1d6+4 + 3d6', type_degats: 'perforant + nécrotique', portee: '1,50 m', description: 'Drain max-PV. Réduit à 0 → la cible meurt et risque de devenir un vampire.' },
      { nom: 'Charme', bonus_attaque: 0, degats: '—', type_degats: '—', portee: '9 m', description: 'Sauvegarde Sag DD 17 ou charmée 24 h.' }
    ],
    capacites_speciales: [
      'Régénération : 20 PV par début de tour si pas en lumière du soleil et pas en eau courante.',
      'Métamorphose : forme brume / chauve-souris géante.',
      'Faiblesses : repousse à l\'ail, eau bénite, lumière du soleil (épuisement), pieu enfoncé dans le cœur (paralysie).'
    ],
    description: "Aristocrate immortel et glacial, prédateur charmeur de la nuit."
  },
  {
    nom: 'Spawn de vampire',
    nomEn: 'Vampire Spawn',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Neutre Mauvais',
    cd: 5,
    hp_max: 82,
    hp_formule: '11d8+33',
    ca: 15,
    vitesse: 9,
    force: 16, dexterite: 16, constitution: 16, intelligence: 11, sagesse: 10, charisme: 12,
    resistances: ['nécrotique', 'contondant/perforant/tranchant non magiques'],
    attaques: [
      { nom: 'Griffes', bonus_attaque: 6, degats: '2d4+3', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Morsure', bonus_attaque: 6, degats: '1d6+3 + 2d6', type_degats: 'perforant + nécrotique', portee: '1,50 m' }
    ],
    capacites_speciales: [
      'Régénération (10 PV/round, sauf soleil ou eau courante).',
      'Sensibilité au soleil : désavantage attaque/Perception en plein soleil.'
    ],
    description: "Esclave vampirique, soldat de la nuit obéissant à un maître."
  },
  {
    nom: 'Wight',
    nomEn: 'Wight',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Neutre Mauvais',
    cd: 3,
    hp_max: 45,
    hp_formule: '6d8+18',
    ca: 14,
    vitesse: 9,
    force: 15, dexterite: 14, constitution: 16, intelligence: 10, sagesse: 13, charisme: 15,
    resistances: ['nécrotique', 'contondant/perforant/tranchant non magiques non argentés'],
    immunites: ['poison', 'épuisement', 'empoisonné'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Deux attaques au choix.' },
      { nom: 'Drain de vie', bonus_attaque: 4, degats: '1d6+2', type_degats: 'nécrotique', portee: '1,50 m', description: 'Sauvegarde Con DD 13 ou PV max réduit.' },
      { nom: 'Épée longue', bonus_attaque: 4, degats: '1d8+2', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Sensibilité au soleil.', 'Crée des zombies à partir des humanoïdes tués par drain.'],
    description: "Guerrier mort-vivant doué d'un drain mortel. Ancien chef, désormais avide de vies."
  },
  {
    nom: 'Fantôme',
    nomEn: 'Ghost',
    type: 'Mort-vivant',
    taille: 'M',
    alignement: 'Variable',
    cd: 4,
    hp_max: 45,
    hp_formule: '10d8',
    ca: 11,
    vitesse: 0, vitesses_extra: 'Vol 12 m (vol stationnaire)',
    force: 7, dexterite: 13, constitution: 10, intelligence: 10, sagesse: 12, charisme: 17,
    resistances: ['acide', 'feu', 'foudre', 'tonnerre', 'contondant/perforant/tranchant non magiques'],
    immunites: ['froid', 'nécrotique', 'poison', 'charmé', 'épuisement', 'terrorisé', 'paralysé', 'pétrifié', 'à terre', 'agrippé'],
    attaques: [
      { nom: 'Toucher d\'effroi', bonus_attaque: 5, degats: '4d6+3', type_degats: 'nécrotique', portee: '1,50 m' },
      { nom: 'Vieillissement (1/jour)', bonus_attaque: 0, degats: '4d10', type_degats: 'psychique', portee: '1,50 m', description: "Sauvegarde Cha DD 13 ou vieillit 1d4 × 10 ans." },
      { nom: 'Possession (recharge 6)', bonus_attaque: 0, degats: '—', type_degats: '—', portee: '1,50 m', description: 'Sauvegarde Cha DD 13 ou contrôle de la cible.' }
    ],
    capacites_speciales: ['Incorporel.', 'Détection éthérée.'],
    description: "Esprit hanté lié à un lieu ou une promesse non tenue."
  },

  // ============== ABERRATIONS ==============
  {
    nom: 'Tyran Oculaire',
    nomEn: 'Beholder',
    type: 'Aberration',
    taille: 'G',
    alignement: 'Loyal Mauvais',
    cd: 13,
    hp_max: 180,
    hp_formule: '19d10+76',
    ca: 18,
    vitesse: 0, vitesses_extra: 'Vol 6 m (vol stationnaire)',
    force: 10, dexterite: 14, constitution: 18, intelligence: 17, sagesse: 15, charisme: 17,
    immunites: ['à terre'],
    attaques: [
      { nom: 'Morsure', bonus_attaque: 5, degats: '4d6', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Rayons oculaires (3 par tour)', bonus_attaque: 0, degats: 'Variable', type_degats: 'variable', portee: '36 m', description: '10 rayons aléatoires : charme, paralysie, peur, lente, énervation, désintégration, mort, pétrification, sommeil, télékinésie.' },
      { nom: 'Rayon antimagique (œil central)', bonus_attaque: 0, degats: '—', type_degats: '—', portee: 'Cône 45 m', description: "Aucune magie ne fonctionne dans le cône." }
    ],
    capacites_speciales: ['Vision dans le noir 36 m.', 'Sphère de pensée (2 légendaires).'],
    description: "Sphère monstrueuse à l'œil central et 10 yeux sur tentacules. Tyran paranoïaque."
  },
  {
    nom: 'Flagelleur Mental',
    nomEn: 'Mind Flayer',
    type: 'Aberration',
    taille: 'M',
    alignement: 'Loyal Mauvais',
    cd: 7,
    hp_max: 71,
    hp_formule: '13d8+13',
    ca: 15,
    vitesse: 9,
    force: 11, dexterite: 12, constitution: 12, intelligence: 19, sagesse: 17, charisme: 17,
    attaques: [
      { nom: 'Tentacules', bonus_attaque: 7, degats: '4d10+3', type_degats: 'psychique', portee: '1,50 m', description: 'Sauvegarde Int DD 15 ou hébétée 1 min.' },
      { nom: 'Extraction de cerveau', bonus_attaque: 7, degats: '10d10', type_degats: 'perforant', portee: '1,50 m', description: 'Cible incapacitée par tentacules : extrait son cerveau et la tue.' },
      { nom: 'Onde mentale (recharge 5-6)', bonus_attaque: 0, degats: '4d8+4', type_degats: 'psychique', portee: 'Cône 18 m', description: "Sauvegarde Int DD 15." }
    ],
    capacites_speciales: ['Magie innée : Détection des pensées, Domination de personne (3/jour), Plan astral (1/jour).', 'Télépathie 36 m.'],
    description: "Humanoïde violet à tête de pieuvre, mangeur de cerveaux des cités souterraines."
  },
  {
    nom: 'Aboleth',
    nomEn: 'Aboleth',
    type: 'Aberration',
    taille: 'G',
    alignement: 'Loyal Mauvais',
    cd: 10,
    hp_max: 135,
    hp_formule: '18d10+36',
    ca: 17,
    vitesse: 3, vitesses_extra: 'Nage 12 m',
    force: 21, dexterite: 9, constitution: 15, intelligence: 18, sagesse: 15, charisme: 18,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Trois attaques de tentacules.' },
      { nom: 'Tentacule', bonus_attaque: 9, degats: '2d6+5', type_degats: 'contondant', portee: '3 m', description: "Sauvegarde Con DD 14 ou maladie : peau translucide, ne respire que sous l'eau." },
      { nom: 'Queue', bonus_attaque: 9, degats: '3d6+5', type_degats: 'contondant', portee: '3 m' },
      { nom: 'Asservissement (1/jour)', bonus_attaque: 0, degats: '—', type_degats: '—', portee: '18 m', description: 'Sauvegarde Sag DD 14 ou contrôle mental.' }
    ],
    capacites_speciales: ['Détection des pensées 36 m.', 'Mucus aquatique.'],
    description: "Poisson primordial à 3 yeux et 4 tentacules, ancien et omniscient. Méprise les mortels."
  },
  {
    nom: 'Chuul',
    nomEn: 'Chuul',
    type: 'Aberration',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 4,
    hp_max: 93,
    hp_formule: '11d10+33',
    ca: 16,
    vitesse: 9, vitesses_extra: 'Nage 9 m',
    force: 19, dexterite: 10, constitution: 16, intelligence: 5, sagesse: 11, charisme: 5,
    immunites: ['poison', 'empoisonné'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Deux attaques de pince.' },
      { nom: 'Pince', bonus_attaque: 6, degats: '2d6+4', type_degats: 'contondant', portee: '3 m', description: 'Cible M ou plus petite : agrippée.' },
      { nom: 'Tentacules', bonus_attaque: 0, degats: '—', type_degats: '—', portee: '1,50 m', description: 'Cible agrippée : sauvegarde Con DD 13 ou paralysée 1 min.' }
    ],
    description: "Crustacée monstrueuse aux pinces immenses, gardienne d'antiques cités englouties."
  },
  {
    nom: 'Cloaker',
    nomEn: 'Cloaker',
    type: 'Aberration',
    taille: 'G',
    alignement: 'Chaotique Neutre',
    cd: 8,
    hp_max: 78,
    hp_formule: '12d10+12',
    ca: 14,
    vitesse: 3, vitesses_extra: 'Vol 12 m',
    force: 17, dexterite: 15, constitution: 12, intelligence: 13, sagesse: 12, charisme: 14,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 6, degats: '2d6+3', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Queue', bonus_attaque: 6, degats: '1d8+3', type_degats: 'tranchant', portee: '3 m' },
      { nom: 'Gémissement assourdissant', bonus_attaque: 0, degats: '—', type_degats: '—', portee: 'Auto', description: 'Sauvegarde Sag DD 13 ou terrorisée 1 min.' }
    ],
    capacites_speciales: ['Camouflage : ressemble à un manteau noir tant qu\'inerte.', 'Dupliques (recharge 5-6).'],
    description: "Raie volante prédatrice qui se dissimule en imitant un manteau accroché au mur."
  },
  {
    nom: 'Gibbering Mouther',
    nomEn: 'Gibbering Mouther',
    type: 'Aberration',
    taille: 'M',
    alignement: 'Neutre',
    cd: 2,
    hp_max: 67,
    hp_formule: '9d8+27',
    ca: 9,
    vitesse: 3, vitesses_extra: 'Nage 3 m',
    force: 10, dexterite: 8, constitution: 16, intelligence: 3, sagesse: 10, charisme: 6,
    immunites: ['à terre'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Une morsure et un crachat (si en vue).' },
      { nom: 'Morsures', bonus_attaque: 2, degats: '5d6', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Crachat aveuglant', bonus_attaque: 0, degats: '—', type_degats: '—', portee: '4,50 m', description: 'Sauvegarde Dex DD 10 ou aveuglée jusqu\'à la fin de son prochain tour.' }
    ],
    capacites_speciales: ['Babillage perturbateur : sauvegarde Sag DD 10 sinon les cibles agissent au hasard.'],
    description: "Masse de chairs et de bouches, fait des terrains difficiles autour d'elle."
  },

  // ============== FIÉLONS — Avancés ==============
  {
    nom: 'Pit Fiend',
    nomEn: 'Pit Fiend',
    type: 'Fiélon',
    taille: 'G',
    alignement: 'Loyal Mauvais',
    cd: 20,
    hp_max: 300,
    hp_formule: '24d10+168',
    ca: 19,
    vitesse: 9, vitesses_extra: 'Vol 18 m',
    force: 26, dexterite: 14, constitution: 24, intelligence: 22, sagesse: 18, charisme: 24,
    resistances: ['froid', 'contondant/perforant/tranchant d\'armes non magiques non argentées'],
    immunites: ['feu', 'poison', 'empoisonné'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Morsure, griffes, masse, queue.' },
      { nom: 'Morsure', bonus_attaque: 14, degats: '4d6+8', type_degats: 'perforant', portee: '1,50 m', description: 'Sauvegarde Con DD 21 ou empoisonnée 1 min.' },
      { nom: 'Griffes', bonus_attaque: 14, degats: '2d8+8', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Masse', bonus_attaque: 14, degats: '2d10+8 + 6d6', type_degats: 'contondant + feu', portee: '3 m' },
      { nom: 'Queue', bonus_attaque: 14, degats: '3d10+8', type_degats: 'contondant', portee: '3 m' }
    ],
    capacites_speciales: [
      'Magie innée : Détection de la magie, Boule de feu, Mur de feu, Téléportation.',
      'Vision véritable 36 m.',
      'Aura de peur 6 m (sauvegarde Sag DD 21).'
    ],
    description: "Général des Neuf Enfers. Le pire des diables, intriguant et invincible au combat."
  },
  {
    nom: 'Erinyes',
    nomEn: 'Erinyes',
    type: 'Fiélon',
    taille: 'M',
    alignement: 'Loyal Mauvais',
    cd: 12,
    hp_max: 153,
    hp_formule: '18d8+72',
    ca: 18,
    vitesse: 9, vitesses_extra: 'Vol 18 m',
    force: 18, dexterite: 16, constitution: 18, intelligence: 14, sagesse: 14, charisme: 18,
    resistances: ['froid', 'contondant/perforant/tranchant d\'armes non magiques non argentées'],
    immunites: ['feu', 'poison', 'empoisonné'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Trois attaques d\'épée longue ou d\'arc long.' },
      { nom: 'Épée longue', bonus_attaque: 8, degats: '1d8+4 + 3d8', type_degats: 'tranchant + poison', portee: '1,50 m' },
      { nom: 'Arc long', bonus_attaque: 7, degats: '1d8+3 + 3d8', type_degats: 'perforant + poison', portee: '45/180 m' }
    ],
    capacites_speciales: ['Corde d\'attache (1/jour) : agrippe et tire la cible.', 'Vision véritable 36 m.'],
    description: "Diable femme ailée, ange déchu armé d'une corde et d'une flèche empoisonnée."
  },
  {
    nom: 'Cambion',
    nomEn: 'Cambion',
    type: 'Fiélon',
    taille: 'M',
    alignement: 'Tout sauf Bon',
    cd: 5,
    hp_max: 82,
    hp_formule: '11d8+33',
    ca: 19,
    vitesse: 9, vitesses_extra: 'Vol 18 m',
    force: 18, dexterite: 18, constitution: 16, intelligence: 14, sagesse: 12, charisme: 16,
    resistances: ['feu', 'froid', 'foudre', 'poison', 'contondant/perforant/tranchant d\'armes non magiques non argentées'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Deux attaques au corps à corps ou sorts.' },
      { nom: 'Sceptre', bonus_attaque: 7, degats: '1d6+4 + 3d6', type_degats: 'contondant + feu', portee: '1,50 m' },
      { nom: 'Charme infernal', bonus_attaque: 0, degats: '—', type_degats: '—', portee: '9 m', description: 'Sauvegarde Cha DD 14 ou charmée 24 h.' }
    ],
    capacites_speciales: ['Sorts (selon parent diabolique).', 'Vision dans le noir 18 m.'],
    description: "Demi-diable né d'une union mortelle/infernale. Ambition et beauté glaciales."
  },
  {
    nom: 'Hezrou',
    nomEn: 'Hezrou',
    type: 'Fiélon',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 8,
    hp_max: 136,
    hp_formule: '13d10+65',
    ca: 16,
    vitesse: 9,
    force: 19, dexterite: 17, constitution: 20, intelligence: 5, sagesse: 12, charisme: 13,
    resistances: ['froid', 'feu', 'foudre', 'contondant/perforant/tranchant d\'armes non magiques'],
    immunites: ['poison', 'empoisonné'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Une morsure et deux griffes.' },
      { nom: 'Morsure', bonus_attaque: 7, degats: '2d10+4', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Griffe', bonus_attaque: 7, degats: '2d6+4', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Stench : aura de puanteur 3 m, sauvegarde Con DD 14 ou empoisonnée.'],
    description: "Crapaud-démon massif et puant, soldat de choc des cohortes abyssales."
  },
  {
    nom: 'Glabrezu',
    nomEn: 'Glabrezu',
    type: 'Fiélon',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 9,
    hp_max: 157,
    hp_formule: '15d10+75',
    ca: 17,
    vitesse: 12,
    force: 20, dexterite: 15, constitution: 21, intelligence: 19, sagesse: 17, charisme: 16,
    resistances: ['froid', 'feu', 'foudre', 'contondant/perforant/tranchant d\'armes non magiques'],
    immunites: ['poison', 'empoisonné'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: '2 pinces + 2 poings.' },
      { nom: 'Pince', bonus_attaque: 9, degats: '2d10+5', type_degats: 'contondant', portee: '3 m', description: 'Cible plus petite : agrippée.' },
      { nom: 'Poing', bonus_attaque: 9, degats: '2d4+5', type_degats: 'contondant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Magie innée : Souhait factice (1/an), Confusion, Téléportation, Dissipation magie.'],
    description: "Démon tentateur aux quatre bras, propose des marchés démoniaques et corrompt les âmes."
  },
  {
    nom: 'Marilith',
    nomEn: 'Marilith',
    type: 'Fiélon',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 16,
    hp_max: 189,
    hp_formule: '18d10+90',
    ca: 18,
    vitesse: 12,
    force: 18, dexterite: 20, constitution: 20, intelligence: 18, sagesse: 16, charisme: 20,
    resistances: ['froid', 'feu', 'foudre', 'contondant/perforant/tranchant d\'armes non magiques'],
    immunites: ['poison', 'empoisonné'],
    attaques: [
      { nom: 'Multiattaque (6 attaques)', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Six attaques d\'épée longue OU constriction de queue.' },
      { nom: 'Épée longue', bonus_attaque: 9, degats: '2d8+4', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Queue', bonus_attaque: 9, degats: '2d10+4', type_degats: 'contondant', portee: '3 m', description: "La cible est agrippée ; constriction 4d6 par tour." }
    ],
    capacites_speciales: ['Réaction : peut faire une attaque d\'opportunité par tour de chaque ennemi visible.', 'Téléportation.'],
    description: "Femme-serpent à 6 bras tenant 6 épées. Générale des armées démoniaques."
  },
  {
    nom: 'Balor',
    nomEn: 'Balor',
    type: 'Fiélon',
    taille: 'TG',
    alignement: 'Chaotique Mauvais',
    cd: 19,
    hp_max: 262,
    hp_formule: '21d12+126',
    ca: 19,
    vitesse: 12, vitesses_extra: 'Vol 24 m',
    force: 26, dexterite: 15, constitution: 22, intelligence: 20, sagesse: 16, charisme: 22,
    resistances: ['froid', 'foudre', 'contondant/perforant/tranchant d\'armes non magiques'],
    immunites: ['feu', 'poison', 'empoisonné'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Une épée longue + un fouet.' },
      { nom: 'Épée longue ardente', bonus_attaque: 14, degats: '3d8+8 + 3d8', type_degats: 'tranchant + foudre', portee: '3 m' },
      { nom: 'Fouet', bonus_attaque: 14, degats: '2d6+8 + 3d6', type_degats: 'tranchant + feu', portee: '9 m', description: 'Cible plus petite : tirée à 7,50 m vers le balor.' }
    ],
    capacites_speciales: [
      'Aura de feu : 3d6 dégâts feu pour quiconque dans 1,50 m.',
      'Mort explosive : 20d6 dégâts feu dans 9 m à la mort.',
      'Vision véritable 36 m.', 'Téléportation.'
    ],
    description: "Démon supérieur géant aux ailes de chauve-souris et à l'épée flamboyante. Cataclysme ambulant."
  },

  // ============== ÉLÉMENTAIRES ==============
  {
    nom: 'Élémentaire d\'air',
    nomEn: 'Air Elemental',
    type: 'Élémentaire',
    taille: 'G',
    alignement: 'Neutre',
    cd: 5,
    hp_max: 90,
    hp_formule: '12d10+24',
    ca: 15,
    vitesse: 0, vitesses_extra: 'Vol 27 m (vol stationnaire)',
    force: 14, dexterite: 20, constitution: 14, intelligence: 6, sagesse: 10, charisme: 6,
    resistances: ['foudre', 'tonnerre', 'contondant/perforant/tranchant d\'armes non magiques'],
    immunites: ['poison', 'à terre', 'agrippé', 'paralysé', 'pétrifié', 'empoisonné', 'inconscient'],
    attaques: [
      { nom: 'Coups multiples', bonus_attaque: 8, degats: '2d8+5', type_degats: 'contondant', portee: '1,50 m' },
      { nom: 'Tornade (recharge 4-6)', bonus_attaque: 0, degats: '3d8', type_degats: 'contondant', portee: 'Cylindre 3×9 m', description: 'Sauvegarde Force DD 13 ou bousculée et entraînée.' }
    ],
    capacites_speciales: ['Forme aérienne : passe par tout espace de 2,5 cm sans serrage.'],
    description: "Tempête vivante invoquée des plans élémentaires, esprit du vent."
  },
  {
    nom: 'Élémentaire d\'eau',
    nomEn: 'Water Elemental',
    type: 'Élémentaire',
    taille: 'G',
    alignement: 'Neutre',
    cd: 5,
    hp_max: 114,
    hp_formule: '12d10+48',
    ca: 14,
    vitesse: 9, vitesses_extra: 'Nage 27 m',
    force: 18, dexterite: 14, constitution: 18, intelligence: 5, sagesse: 10, charisme: 8,
    resistances: ['acide', 'contondant/perforant/tranchant d\'armes non magiques'],
    immunites: ['poison', 'à terre', 'agrippé', 'paralysé', 'pétrifié', 'empoisonné', 'inconscient'],
    attaques: [
      { nom: 'Coups multiples', bonus_attaque: 7, degats: '2d8+4', type_degats: 'contondant', portee: '1,50 m' },
      { nom: 'Lavage (recharge 4-6)', bonus_attaque: 0, degats: '2d8+4', type_degats: 'contondant', portee: 'Auto 6×3 m', description: 'Sauvegarde Force DD 15 ou agrippée.' }
    ],
    capacites_speciales: ['Forme liquide.', 'Geler dans la glace : congèle en eau immobile.'],
    description: "Vague vivante venue du plan de l'eau. Furie liquide qui submerge."
  },
  {
    nom: 'Élémentaire de feu',
    nomEn: 'Fire Elemental',
    type: 'Élémentaire',
    taille: 'G',
    alignement: 'Neutre',
    cd: 5,
    hp_max: 102,
    hp_formule: '12d10+36',
    ca: 13,
    vitesse: 15,
    force: 10, dexterite: 17, constitution: 16, intelligence: 6, sagesse: 10, charisme: 7,
    resistances: ['contondant/perforant/tranchant d\'armes non magiques'],
    immunites: ['feu', 'poison', 'à terre', 'agrippé', 'paralysé', 'pétrifié', 'empoisonné', 'inconscient'],
    vulnerabilites: ['froid'],
    attaques: [
      { nom: 'Coups multiples', bonus_attaque: 6, degats: '2d6+3', type_degats: 'feu', portee: '1,50 m', description: 'La cible s\'enflamme : 1d10 feu/début de tour.' }
    ],
    capacites_speciales: ['Forme de feu : passe à travers les espaces de 2,5 cm.', 'Brûle ce qu\'il touche.'],
    description: "Flammes vivantes invoquées du plan élémentaire du feu."
  },
  {
    nom: 'Élémentaire de terre',
    nomEn: 'Earth Elemental',
    type: 'Élémentaire',
    taille: 'G',
    alignement: 'Neutre',
    cd: 5,
    hp_max: 126,
    hp_formule: '12d10+60',
    ca: 17,
    vitesse: 9, vitesses_extra: 'Creusement 9 m',
    force: 20, dexterite: 8, constitution: 20, intelligence: 5, sagesse: 10, charisme: 5,
    resistances: ['contondant/perforant/tranchant d\'armes non magiques'],
    immunites: ['poison', 'à terre', 'agrippé', 'paralysé', 'pétrifié', 'empoisonné', 'inconscient'],
    vulnerabilites: ['tonnerre'],
    attaques: [
      { nom: 'Coups multiples', bonus_attaque: 8, degats: '2d8+5', type_degats: 'contondant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Glissement terrestre : creuse à travers la pierre non magique.'],
    description: "Bloc de roche et de minerai animé. Force tellurique inflexible."
  },
  {
    nom: 'Salamandre',
    nomEn: 'Salamander',
    type: 'Élémentaire',
    taille: 'G',
    alignement: 'Neutre Mauvais',
    cd: 5,
    hp_max: 90,
    hp_formule: '12d10+24',
    ca: 15,
    vitesse: 9,
    force: 18, dexterite: 14, constitution: 15, intelligence: 11, sagesse: 10, charisme: 12,
    vulnerabilites: ['froid'],
    resistances: ['contondant/perforant/tranchant d\'armes non magiques'],
    immunites: ['feu'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Un coup de lance + une queue.' },
      { nom: 'Lance ardente', bonus_attaque: 7, degats: '1d6+4 + 1d6', type_degats: 'perforant + feu', portee: '1,50 m' },
      { nom: 'Queue', bonus_attaque: 7, degats: '2d6+4 + 1d6', type_degats: 'contondant + feu', portee: '3 m', description: 'Sauvegarde Force DD 14 ou agrippée et brûlée 1d6/tour.' }
    ],
    capacites_speciales: ['Aura ardente : 1d6 feu pour quiconque dans 1,50 m.'],
    description: "Reptile géant et brûlant venu du plan du feu. Mercenaire des sultans djinns."
  },
  {
    nom: 'Méphite de glace',
    nomEn: 'Ice Mephit',
    type: 'Élémentaire',
    taille: 'P',
    alignement: 'Neutre Mauvais',
    cd: 0.5,
    hp_max: 21,
    hp_formule: '6d6',
    ca: 11,
    vitesse: 9, vitesses_extra: 'Vol 9 m',
    force: 7, dexterite: 13, constitution: 10, intelligence: 9, sagesse: 11, charisme: 12,
    vulnerabilites: ['contondant', 'feu'],
    immunites: ['froid', 'poison', 'empoisonné'],
    attaques: [
      { nom: 'Griffes', bonus_attaque: 3, degats: '1d4+1 + 1d4', type_degats: 'tranchant + froid', portee: '1,50 m' },
      { nom: 'Souffle de givre (recharge 6)', bonus_attaque: 0, degats: '1d8', type_degats: 'froid', portee: 'Cône 4,50 m', description: 'Sauvegarde Dex DD 10.' }
    ],
    capacites_speciales: ['Mort gelée : explose en éclats de glace à 0 PV.'],
    description: "Petit élémentaire fourbe et bavard, fait de givre cassant."
  },
  {
    nom: 'Galeb Duhr',
    nomEn: 'Galeb Duhr',
    type: 'Élémentaire',
    taille: 'M',
    alignement: 'Neutre',
    cd: 6,
    hp_max: 85,
    hp_formule: '9d8+45',
    ca: 16,
    vitesse: 4.5,
    force: 20, dexterite: 14, constitution: 20, intelligence: 11, sagesse: 12, charisme: 11,
    resistances: ['contondant/perforant/tranchant d\'armes non magiques'],
    attaques: [
      { nom: 'Coup de roc', bonus_attaque: 9, degats: '3d8+5', type_degats: 'contondant', portee: '1,50 m' },
      { nom: 'Roulement (recharge 6)', bonus_attaque: 0, degats: '3d10+5', type_degats: 'contondant', portee: 'Ligne 18 m', description: 'Sauvegarde Force DD 17 ou bousculée.' }
    ],
    capacites_speciales: ['Animer des rochers : transforme deux blocs en alliés (1/jour).', 'Camouflage rocheux.'],
    description: "Esprit-roc à figure pierreuse, gardien sage et patient des montagnes."
  },

  // ============== BÊTES — Animaux ==============
  {
    nom: 'Tigre',
    nomEn: 'Tiger',
    type: 'Bête',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 1,
    hp_max: 37,
    hp_formule: '5d10+10',
    ca: 12,
    vitesse: 12,
    force: 17, dexterite: 15, constitution: 14, intelligence: 3, sagesse: 12, charisme: 8,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 5, degats: '1d10+3', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Griffe', bonus_attaque: 5, degats: '1d8+3', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Embuscade : avantage à l\'attaque sur cible surprise.', 'Odorat aiguisé.'],
    description: "Grand félin rayé, embusqué dans la jungle. Frappe en silence."
  },
  {
    nom: 'Lion',
    nomEn: 'Lion',
    type: 'Bête',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 1,
    hp_max: 26,
    hp_formule: '4d10+4',
    ca: 12,
    vitesse: 15,
    force: 17, dexterite: 15, constitution: 13, intelligence: 3, sagesse: 12, charisme: 8,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 5, degats: '1d8+3', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Griffe', bonus_attaque: 5, degats: '2d6+3', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Tactique de meute.', 'Bondir : course + attaque-griffe peut bousculer.'],
    description: "Roi des savanes, chasse en groupe. Rugissement audible à 1 km."
  },
  {
    nom: 'Panthère',
    nomEn: 'Panther',
    type: 'Bête',
    taille: 'M',
    alignement: 'Sans alignement',
    cd: 0.25,
    hp_max: 13,
    hp_formule: '3d8',
    ca: 12,
    vitesse: 15, vitesses_extra: 'Escalade 9 m',
    force: 14, dexterite: 15, constitution: 10, intelligence: 3, sagesse: 14, charisme: 7,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 4, degats: '1d6+2', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Griffe', bonus_attaque: 4, degats: '1d4+2', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Embuscade : avantage à l\'attaque sur cible surprise + bond bousculant.'],
    description: "Félin élégant et silencieux, pelage sombre, chasseuse solitaire."
  },
  {
    nom: 'Cheval (de selle)',
    nomEn: 'Riding Horse',
    type: 'Bête',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 0.25,
    hp_max: 13,
    hp_formule: '2d10+2',
    ca: 10,
    vitesse: 18,
    force: 16, dexterite: 10, constitution: 12, intelligence: 2, sagesse: 11, charisme: 7,
    attaques: [
      { nom: 'Sabots', bonus_attaque: 5, degats: '2d4+3', type_degats: 'contondant', portee: '1,50 m' }
    ],
    description: "Monture domestique vive et endurante."
  },
  {
    nom: 'Cheval de guerre',
    nomEn: 'Warhorse',
    type: 'Bête',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 0.5,
    hp_max: 19,
    hp_formule: '3d10+3',
    ca: 11,
    vitesse: 18,
    force: 18, dexterite: 12, constitution: 13, intelligence: 2, sagesse: 12, charisme: 7,
    attaques: [
      { nom: 'Sabots', bonus_attaque: 6, degats: '2d6+4', type_degats: 'contondant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Charge : si avance ≥ 6 m, attaque suivante +2d6 et bousculade possible.'],
    description: "Monture de bataille dressée, courageuse et puissante."
  },
  {
    nom: 'Crocodile',
    nomEn: 'Crocodile',
    type: 'Bête',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 0.5,
    hp_max: 19,
    hp_formule: '3d10+3',
    ca: 12,
    vitesse: 6, vitesses_extra: 'Nage 9 m',
    force: 15, dexterite: 10, constitution: 13, intelligence: 2, sagesse: 10, charisme: 5,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 4, degats: '1d10+2', type_degats: 'perforant', portee: '1,50 m', description: 'Cible : agrippée (DD 12 Évasion).' }
    ],
    capacites_speciales: ['Retient son souffle 15 min.'],
    description: "Reptile semi-aquatique, attaque par dessous."
  },
  {
    nom: 'Pieuvre géante',
    nomEn: 'Giant Octopus',
    type: 'Bête',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 1,
    hp_max: 52,
    hp_formule: '8d10+8',
    ca: 11,
    vitesse: 3, vitesses_extra: 'Nage 18 m',
    force: 17, dexterite: 13, constitution: 13, intelligence: 4, sagesse: 10, charisme: 4,
    attaques: [
      { nom: 'Tentacules', bonus_attaque: 5, degats: '2d6+3', type_degats: 'contondant', portee: '4,50 m', description: 'Sauvegarde Force DD 16 ou agrippée.' }
    ],
    capacites_speciales: ['Encre (recharge 1/repos court) : 6 m de nuage opaque sous l\'eau.', 'Camouflage en mer.'],
    description: "Mollusque immense aux 8 tentacules. Territoire littoral profond."
  },
  {
    nom: 'Anaconda',
    nomEn: 'Giant Constrictor Snake',
    type: 'Bête',
    taille: 'TG',
    alignement: 'Sans alignement',
    cd: 2,
    hp_max: 60,
    hp_formule: '8d12+8',
    ca: 12,
    vitesse: 9, vitesses_extra: 'Nage 9 m',
    force: 19, dexterite: 14, constitution: 12, intelligence: 1, sagesse: 10, charisme: 3,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 6, degats: '2d6+4', type_degats: 'perforant', portee: '3 m' },
      { nom: 'Constriction', bonus_attaque: 6, degats: '2d8+4', type_degats: 'contondant', portee: '1,50 m', description: "Cible agrippée et entravée." }
    ],
    description: "Serpent gigantesque qui asphyxie ses proies dans les jungles humides."
  },
  {
    nom: 'Renard',
    nomEn: 'Fox',
    type: 'Bête',
    taille: 'TP',
    alignement: 'Sans alignement',
    cd: 0,
    hp_max: 2,
    hp_formule: '1d4',
    ca: 13,
    vitesse: 9,
    force: 6, dexterite: 13, constitution: 11, intelligence: 2, sagesse: 12, charisme: 4,
    attaques: [{ nom: 'Morsure', bonus_attaque: 3, degats: '1', type_degats: 'perforant', portee: '1,50 m' }],
    description: "Petit carnivore agile, malicieux. Symbole de ruse."
  },
  {
    nom: 'Rat géant',
    nomEn: 'Giant Rat',
    type: 'Bête',
    taille: 'P',
    alignement: 'Sans alignement',
    cd: 0.125,
    hp_max: 7,
    hp_formule: '2d6',
    ca: 12,
    vitesse: 9,
    force: 7, dexterite: 15, constitution: 11, intelligence: 2, sagesse: 10, charisme: 4,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 4, degats: '1d4+2', type_degats: 'perforant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Tactique de meute.', 'Odorat aiguisé.'],
    description: "Rat de la taille d'un chien, vit dans les égouts et les caves."
  },
  {
    nom: 'Vache',
    nomEn: 'Ox',
    type: 'Bête',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 0.25,
    hp_max: 15,
    hp_formule: '2d10+4',
    ca: 10,
    vitesse: 9,
    force: 18, dexterite: 10, constitution: 14, intelligence: 2, sagesse: 10, charisme: 4,
    attaques: [{ nom: 'Cornes', bonus_attaque: 6, degats: '2d4+4', type_degats: 'perforant', portee: '1,50 m' }],
    description: "Bovin domestique, force tranquille."
  },

  // ============== MONSTRES CLASSIQUES ==============
  {
    nom: 'Manticore',
    nomEn: 'Manticore',
    type: 'Monstruosité',
    taille: 'G',
    alignement: 'Loyal Mauvais',
    cd: 3,
    hp_max: 68,
    hp_formule: '8d10+24',
    ca: 14,
    vitesse: 9, vitesses_extra: 'Vol 15 m',
    force: 17, dexterite: 16, constitution: 17, intelligence: 7, sagesse: 12, charisme: 8,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Morsure + 2 griffes OU 3 piquants.' },
      { nom: 'Morsure', bonus_attaque: 5, degats: '1d8+3', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Griffe', bonus_attaque: 5, degats: '1d6+3', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Piquant de queue (24 doses)', bonus_attaque: 5, degats: '1d8+3', type_degats: 'perforant', portee: '30/180 m' }
    ],
    description: "Lion ailé à tête humaine, lance des piquants depuis sa queue. Mangeur d'hommes."
  },
  {
    nom: 'Méduse',
    nomEn: 'Medusa',
    type: 'Monstruosité',
    taille: 'M',
    alignement: 'Loyal Mauvais',
    cd: 6,
    hp_max: 127,
    hp_formule: '17d8+51',
    ca: 15,
    vitesse: 9,
    force: 10, dexterite: 15, constitution: 16, intelligence: 12, sagesse: 13, charisme: 15,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Cheveux-serpents + arc court ou cimeterre.' },
      { nom: 'Cheveux-serpents', bonus_attaque: 5, degats: '1d4+2 + 4d6', type_degats: 'perforant + poison', portee: '1,50 m' },
      { nom: 'Cimeterre', bonus_attaque: 5, degats: '1d6+2', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Arc court', bonus_attaque: 5, degats: '1d6+2 + 2d6', type_degats: 'perforant + poison', portee: '24/96 m' }
    ],
    capacites_speciales: ['Regard pétrifiant : sauvegarde Con DD 14 ou progressivement pétrifiée.'],
    description: "Femme à la chevelure de serpents. Son regard pétrifie quiconque le croise."
  },
  {
    nom: 'Chimère',
    nomEn: 'Chimera',
    type: 'Monstruosité',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 6,
    hp_max: 114,
    hp_formule: '12d10+48',
    ca: 14,
    vitesse: 9, vitesses_extra: 'Vol 18 m',
    force: 19, dexterite: 11, constitution: 19, intelligence: 3, sagesse: 14, charisme: 10,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Morsure + cornes + griffe (et souffle si dispo).' },
      { nom: 'Morsure', bonus_attaque: 7, degats: '2d6+4', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Cornes', bonus_attaque: 7, degats: '1d12+4', type_degats: 'contondant', portee: '1,50 m' },
      { nom: 'Griffe', bonus_attaque: 7, degats: '2d6+4', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Souffle de feu (recharge 5-6)', bonus_attaque: 0, degats: '7d8', type_degats: 'feu', portee: 'Cône 4,50 m', description: 'Sauvegarde Dex DD 15.' }
    ],
    description: "Lion à 3 têtes (lion, chèvre, dragon) ailé. Symbole d'une horreur composite."
  },
  {
    nom: 'Hippogriffe',
    nomEn: 'Hippogriff',
    type: 'Monstruosité',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 1,
    hp_max: 19,
    hp_formule: '3d10+3',
    ca: 11,
    vitesse: 12, vitesses_extra: 'Vol 18 m',
    force: 17, dexterite: 13, constitution: 13, intelligence: 2, sagesse: 12, charisme: 8,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Bec + serres.' },
      { nom: 'Bec', bonus_attaque: 5, degats: '1d10+3', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Serres', bonus_attaque: 5, degats: '2d6+3', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    description: "Mi-aigle, mi-cheval. Monture noble dressable au prix d'un long apprivoisement."
  },
  {
    nom: 'Pégase',
    nomEn: 'Pegasus',
    type: 'Céleste',
    taille: 'G',
    alignement: 'Chaotique Bon',
    cd: 2,
    hp_max: 59,
    hp_formule: '7d10+21',
    ca: 12,
    vitesse: 18, vitesses_extra: 'Vol 27 m',
    force: 18, dexterite: 15, constitution: 16, intelligence: 10, sagesse: 15, charisme: 13,
    attaques: [{ nom: 'Sabots', bonus_attaque: 7, degats: '2d6+4', type_degats: 'contondant', portee: '1,50 m' }],
    capacites_speciales: ['Communique en commun, céleste, elfique, sylvain.'],
    description: "Cheval ailé d'origine divine. Allié des héros bons."
  },
  {
    nom: 'Licorne',
    nomEn: 'Unicorn',
    type: 'Céleste',
    taille: 'G',
    alignement: 'Loyal Bon',
    cd: 5,
    hp_max: 67,
    hp_formule: '9d10+18',
    ca: 12,
    vitesse: 15,
    force: 18, dexterite: 14, constitution: 15, intelligence: 11, sagesse: 17, charisme: 16,
    immunites: ['poison', 'charmé', 'paralysé', 'empoisonné'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Sabots + corne.' },
      { nom: 'Corne', bonus_attaque: 7, degats: '1d8+4', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Sabots', bonus_attaque: 7, degats: '2d6+4', type_degats: 'contondant', portee: '1,50 m' }
    ],
    capacites_speciales: [
      'Magie innée : Détection du mal, Druidisme, Passage sans trace.',
      'Touche guérisseuse (3/jour) : restaure 11 PV.', 'Téléportation (1/jour) : 1,5 km dans une forêt.'
    ],
    description: "Équidé blanc à corne, gardien sacré des forêts vierges."
  },
  {
    nom: 'Centaure',
    nomEn: 'Centaur',
    type: 'Monstruosité',
    taille: 'G',
    alignement: 'Neutre Bon',
    cd: 2,
    hp_max: 45,
    hp_formule: '6d10+12',
    ca: 12,
    vitesse: 15,
    force: 18, dexterite: 14, constitution: 14, intelligence: 9, sagesse: 13, charisme: 11,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Hache + sabots OU 2 arcs longs.' },
      { nom: 'Hache à deux mains', bonus_attaque: 6, degats: '1d12+4', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Sabots', bonus_attaque: 6, degats: '2d6+4', type_degats: 'contondant', portee: '1,50 m' },
      { nom: 'Arc long', bonus_attaque: 4, degats: '1d8+2', type_degats: 'perforant', portee: '45/180 m' }
    ],
    capacites_speciales: ['Charge.'],
    description: "Cavalier mi-homme mi-cheval, archer mortel et guide des forêts."
  },
  {
    nom: 'Satyre',
    nomEn: 'Satyr',
    type: 'Fée',
    taille: 'M',
    alignement: 'Chaotique Neutre',
    cd: 0.5,
    hp_max: 31,
    hp_formule: '7d8',
    ca: 14,
    vitesse: 12,
    force: 12, dexterite: 16, constitution: 11, intelligence: 12, sagesse: 10, charisme: 14,
    attaques: [
      { nom: 'Coup de tête', bonus_attaque: 3, degats: '2d4+1', type_degats: 'contondant', portee: '1,50 m' },
      { nom: 'Cimeterre', bonus_attaque: 3, degats: '1d6+1', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Arc court', bonus_attaque: 5, degats: '1d6+3', type_degats: 'perforant', portee: '24/96 m' }
    ],
    capacites_speciales: ['Magie innée par flûte : effrayer / endormir / charmer (sauvegarde Sag DD 12).', 'Résistance magique.'],
    description: "Demi-bouc espiègle, bardo féerique aimant musique, vin et fêtes nocturnes."
  },
  {
    nom: 'Dryade',
    nomEn: 'Dryad',
    type: 'Fée',
    taille: 'M',
    alignement: 'Neutre',
    cd: 1,
    hp_max: 22,
    hp_formule: '5d8',
    ca: 11,
    vitesse: 9,
    force: 10, dexterite: 12, constitution: 11, intelligence: 14, sagesse: 15, charisme: 18,
    attaques: [
      { nom: 'Massue', bonus_attaque: 2, degats: '1d4', type_degats: 'contondant', portee: '1,50 m' },
      { nom: 'Charme féerique', bonus_attaque: 0, degats: '—', type_degats: '—', portee: '9 m', description: 'Sauvegarde Sag DD 14 ou charmée 24 h, perçoit la dryade comme une amie.' }
    ],
    capacites_speciales: ['Druidisme (Druidisme à volonté + Détection du mal/animal/charme).', 'Fusion arborescente.'],
    description: "Esprit féminin lié à un arbre. Protectrice des forêts et magicienne charmante."
  },
  {
    nom: 'Sphinx Gynosphinx',
    nomEn: 'Gynosphinx',
    type: 'Monstruosité',
    taille: 'G',
    alignement: 'Loyal Neutre',
    cd: 11,
    hp_max: 136,
    hp_formule: '16d10+48',
    ca: 17,
    vitesse: 12, vitesses_extra: 'Vol 18 m',
    force: 18, dexterite: 15, constitution: 16, intelligence: 18, sagesse: 18, charisme: 18,
    resistances: ['perforant', 'contondant', 'tranchant non magiques'],
    immunites: ['psychique', 'charmé', 'terrorisé'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Deux attaques de griffe.' },
      { nom: 'Griffe', bonus_attaque: 8, degats: '2d8+4', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Sorts (magicien niveau 9) + sorts d\'oracle.', 'Vision véritable 36 m.'],
    description: "Sphinx femelle gardienne d'énigmes et de portes mystiques."
  },
  {
    nom: 'Yéti',
    nomEn: 'Yeti',
    type: 'Monstruosité',
    taille: 'G',
    alignement: 'Chaotique Mauvais',
    cd: 3,
    hp_max: 51,
    hp_formule: '6d10+18',
    ca: 12,
    vitesse: 12, vitesses_extra: 'Escalade 12 m',
    force: 18, dexterite: 13, constitution: 16, intelligence: 8, sagesse: 12, charisme: 7,
    vulnerabilites: ['feu'],
    immunites: ['froid'],
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: '2 griffes + (recharge) regard de glace.' },
      { nom: 'Griffe', bonus_attaque: 6, degats: '1d6+4 + 1d6', type_degats: 'tranchant + froid', portee: '1,50 m' },
      { nom: 'Regard de glace (recharge 6)', bonus_attaque: 0, degats: '3d6', type_degats: 'froid', portee: 'Cône 9 m', description: 'Sauvegarde Con DD 13 ou paralysée 1 min.' }
    ],
    description: "Bête hominide blanche des cimes neigeuses. Son regard glace les os."
  },
  {
    nom: 'Hibours',
    nomEn: 'Owlbear',
    type: 'Monstruosité',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 3,
    hp_max: 59,
    hp_formule: '7d10+21',
    ca: 13,
    vitesse: 12,
    force: 20, dexterite: 12, constitution: 17, intelligence: 3, sagesse: 12, charisme: 7,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Bec + griffes.' },
      { nom: 'Bec', bonus_attaque: 7, degats: '1d10+5', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Griffes', bonus_attaque: 7, degats: '2d8+5', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Vue + odorat aiguisés.'],
    description: "Croisement monstrueux d'ours et de hibou. Territorial et imprévisible."
  },
  {
    nom: 'Cocatrix',
    nomEn: 'Cockatrice',
    type: 'Monstruosité',
    taille: 'P',
    alignement: 'Sans alignement',
    cd: 0.5,
    hp_max: 27,
    hp_formule: '6d6+6',
    ca: 11,
    vitesse: 6, vitesses_extra: 'Vol 12 m',
    force: 6, dexterite: 12, constitution: 12, intelligence: 2, sagesse: 13, charisme: 5,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 3, degats: '1d4+1', type_degats: 'perforant', portee: '1,50 m', description: 'Sauvegarde Con DD 11 ou pétrifiée 24 h.' }
    ],
    description: "Volaille reptilienne dont la morsure pétrifie."
  },
  {
    nom: 'Ankheg',
    nomEn: 'Ankheg',
    type: 'Monstruosité',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 2,
    hp_max: 39,
    hp_formule: '6d10+6',
    ca: 14,
    vitesse: 9, vitesses_extra: 'Creusement 3 m',
    force: 17, dexterite: 11, constitution: 13, intelligence: 1, sagesse: 13, charisme: 6,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 5, degats: '2d6+3 + 1d6 acide', type_degats: 'tranchant + acide', portee: '1,50 m', description: 'Cible M ou plus petite : agrippée.' },
      { nom: 'Crachat acide (recharge 6)', bonus_attaque: 0, degats: '3d6', type_degats: 'acide', portee: 'Ligne 9 m', description: 'Sauvegarde Dex DD 13.' }
    ],
    description: "Insecte fouisseur géant, embuscade depuis le sous-sol des prairies."
  },
  {
    nom: 'Bulette',
    nomEn: 'Bulette',
    type: 'Monstruosité',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 5,
    hp_max: 94,
    hp_formule: '9d10+45',
    ca: 17,
    vitesse: 12, vitesses_extra: 'Creusement 12 m',
    force: 19, dexterite: 11, constitution: 21, intelligence: 2, sagesse: 10, charisme: 5,
    attaques: [
      { nom: 'Morsure', bonus_attaque: 7, degats: '4d12+4', type_degats: 'perforant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Sens de tremblement 18 m.'],
    description: "Requin de terre cuirassé. Pourchasse à travers la roche."
  },
  {
    nom: 'Wyvern',
    nomEn: 'Wyvern',
    type: 'Dragon',
    taille: 'G',
    alignement: 'Sans alignement',
    cd: 6,
    hp_max: 110,
    hp_formule: '13d10+39',
    ca: 13,
    vitesse: 6, vitesses_extra: 'Vol 24 m',
    force: 19, dexterite: 10, constitution: 16, intelligence: 5, sagesse: 12, charisme: 6,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Morsure + (queue OU griffes).' },
      { nom: 'Morsure', bonus_attaque: 7, degats: '2d6+4', type_degats: 'perforant', portee: '3 m' },
      { nom: 'Griffes', bonus_attaque: 7, degats: '2d8+4', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Dard de queue', bonus_attaque: 7, degats: '2d6+4 + 7d6', type_degats: 'perforant + poison', portee: '3 m', description: 'Sauvegarde Con DD 15 ou empoisonnée.' }
    ],
    description: "Dragon bipède à dard de queue venimeux. Prédateur volant des terres sauvages."
  },
  {
    nom: 'Roc',
    nomEn: 'Roc',
    type: 'Monstruosité',
    taille: 'Gig',
    alignement: 'Sans alignement',
    cd: 11,
    hp_max: 248,
    hp_formule: '16d20+80',
    ca: 15,
    vitesse: 6, vitesses_extra: 'Vol 36 m',
    force: 28, dexterite: 10, constitution: 20, intelligence: 3, sagesse: 10, charisme: 9,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Bec + serres.' },
      { nom: 'Bec', bonus_attaque: 13, degats: '4d8+9', type_degats: 'perforant', portee: '3 m' },
      { nom: 'Serres', bonus_attaque: 13, degats: '4d6+9', type_degats: 'tranchant', portee: '1,50 m', description: 'Cible Gig ou plus petite : agrippée.' }
    ],
    description: "Aigle gigantesque capable d'enlever un éléphant. Niche dans les pics inaccessibles."
  },
  {
    nom: 'Ogre mage',
    nomEn: 'Oni',
    type: 'Géant',
    taille: 'G',
    alignement: 'Loyal Mauvais',
    cd: 7,
    hp_max: 110,
    hp_formule: '13d10+39',
    ca: 16,
    vitesse: 9, vitesses_extra: 'Vol 9 m',
    force: 19, dexterite: 11, constitution: 16, intelligence: 14, sagesse: 12, charisme: 15,
    attaques: [
      { nom: 'Glaive', bonus_attaque: 7, degats: '2d10+4', type_degats: 'tranchant', portee: '3 m' },
      { nom: 'Griffes (forme métamorphosée)', bonus_attaque: 7, degats: '2d4+4', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: [
      'Magie innée : Sommeil, Charme, Invisibilité, Cône de froid (1/jour), Gaz nauséabond.',
      'Régénération : 10 PV/round.',
      'Métamorphose : peut prendre forme humaine.'
    ],
    description: "Ogre rusé doublé d'un magicien. Mange les enfants et hante les nuits."
  },

  // ============== HUMANOÏDES — PNJ stat blocks ==============
  {
    nom: 'Bandit',
    nomEn: 'Bandit',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout sauf Loyal',
    cd: 0.125,
    hp_max: 11,
    hp_formule: '2d8+2',
    ca: 12,
    vitesse: 9,
    force: 11, dexterite: 12, constitution: 12, intelligence: 10, sagesse: 10, charisme: 10,
    attaques: [
      { nom: 'Cimeterre', bonus_attaque: 3, degats: '1d6+1', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Arbalète légère', bonus_attaque: 3, degats: '1d8+1', type_degats: 'perforant', portee: '24/96 m' }
    ],
    description: "Brigand de grand chemin. Détrousse les voyageurs en bande."
  },
  {
    nom: 'Chef bandit',
    nomEn: 'Bandit Captain',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout sauf Loyal',
    cd: 2,
    hp_max: 65,
    hp_formule: '10d8+20',
    ca: 15,
    vitesse: 9,
    force: 15, dexterite: 16, constitution: 14, intelligence: 14, sagesse: 11, charisme: 14,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Cimeterre + dague (corps à corps).' },
      { nom: 'Cimeterre', bonus_attaque: 5, degats: '1d6+3', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Dague', bonus_attaque: 5, degats: '1d4+3', type_degats: 'perforant', portee: '6/18 m' }
    ],
    capacites_speciales: ['Parade : +2 CA contre une attaque vue (réaction).'],
    description: "Bretteur charismatique à la tête d'une bande de pillards."
  },
  {
    nom: 'Garde',
    nomEn: 'Guard',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout',
    cd: 0.125,
    hp_max: 11,
    hp_formule: '2d8+2',
    ca: 16,
    vitesse: 9,
    force: 13, dexterite: 12, constitution: 12, intelligence: 10, sagesse: 11, charisme: 10,
    attaques: [
      { nom: 'Lance', bonus_attaque: 3, degats: '1d6+1', type_degats: 'perforant', portee: '1,50 m / 6/18 m' }
    ],
    description: "Soldat municipal en armure de chaîne. Ronde quotidienne, peu motivé."
  },
  {
    nom: 'Chevalier',
    nomEn: 'Knight',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout',
    cd: 3,
    hp_max: 52,
    hp_formule: '8d8+16',
    ca: 18,
    vitesse: 9,
    force: 16, dexterite: 11, constitution: 14, intelligence: 11, sagesse: 11, charisme: 15,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Deux attaques d\'épée longue.' },
      { nom: 'Épée longue', bonus_attaque: 5, degats: '1d8+3', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Arbalète lourde', bonus_attaque: 2, degats: '1d10', type_degats: 'perforant', portee: '30/120 m' }
    ],
    capacites_speciales: ['Cri de leadership (1/repos court) : alliés à 9 m gagnent +1d4 attaque/sauvegarde.'],
    description: "Cavalier en armure de plates. Suit un code d'honneur (variable)."
  },
  {
    nom: 'Mage',
    nomEn: 'Mage',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout',
    cd: 6,
    hp_max: 40,
    hp_formule: '9d8',
    ca: 12,
    vitesse: 9,
    force: 9, dexterite: 14, constitution: 11, intelligence: 17, sagesse: 12, charisme: 11,
    attaques: [
      { nom: 'Dague', bonus_attaque: 5, degats: '1d4+2', type_degats: 'perforant', portee: '1,50 m / 6/18 m' }
    ],
    capacites_speciales: [
      'Sorts (magicien niveau 9) : Bouclier, Projectile magique, Détection magie, Boule de feu, Vol, Cône de froid, etc.'
    ],
    description: "Magicien itinérant, érudit ou conseiller de cour. Modeste équipement, immense potentiel."
  },
  {
    nom: 'Acolyte',
    nomEn: 'Acolyte',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout',
    cd: 0.25,
    hp_max: 9,
    hp_formule: '2d8',
    ca: 10,
    vitesse: 9,
    force: 10, dexterite: 10, constitution: 10, intelligence: 10, sagesse: 14, charisme: 11,
    attaques: [{ nom: 'Massue', bonus_attaque: 2, degats: '1d4', type_degats: 'contondant', portee: '1,50 m' }],
    capacites_speciales: [
      'Sorts (clerc niveau 1) : Lumière, Flamme sacrée, Soin, Bouclier de la foi.'
    ],
    description: "Novice d'un temple. Sert le clergé en attendant l'ordination."
  },
  {
    nom: 'Berserker',
    nomEn: 'Berserker',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout sauf Loyal',
    cd: 2,
    hp_max: 67,
    hp_formule: '9d8+27',
    ca: 13,
    vitesse: 9,
    force: 16, dexterite: 12, constitution: 17, intelligence: 9, sagesse: 11, charisme: 9,
    attaques: [
      { nom: 'Hache à deux mains', bonus_attaque: 5, degats: '1d12+3', type_degats: 'tranchant', portee: '1,50 m' }
    ],
    capacites_speciales: ['Furie : a l\'avantage à l\'attaque et inflige des coups critiques sur 19-20 (et désavantage sur les attaques contre lui).'],
    description: "Guerrier sauvage du nord. Combat en transe rugissante."
  },
  {
    nom: 'Cultiste',
    nomEn: 'Cultist',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout sauf Bon',
    cd: 0.125,
    hp_max: 9,
    hp_formule: '2d8',
    ca: 12,
    vitesse: 9,
    force: 11, dexterite: 12, constitution: 10, intelligence: 10, sagesse: 11, charisme: 10,
    attaques: [{ nom: 'Cimeterre', bonus_attaque: 3, degats: '1d6+1', type_degats: 'tranchant', portee: '1,50 m' }],
    capacites_speciales: ['Dévotion sombre : avantage aux sauvegardes contre charme/peur.'],
    description: "Adepte d'un dieu ou démon mineur. Robe sombre, dague rituelle."
  },
  {
    nom: 'Espion',
    nomEn: 'Spy',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout',
    cd: 1,
    hp_max: 27,
    hp_formule: '6d8',
    ca: 12,
    vitesse: 9,
    force: 10, dexterite: 15, constitution: 10, intelligence: 12, sagesse: 14, charisme: 16,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Deux attaques.' },
      { nom: 'Épée courte', bonus_attaque: 4, degats: '1d6+2', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Arbalète de poing', bonus_attaque: 4, degats: '1d6+2', type_degats: 'perforant', portee: '9/36 m' }
    ],
    capacites_speciales: ['Attaque sournoise (1/tour) : +2d6 si avantage ou allié à 1,50 m.'],
    description: "Agent secret au service d'une faction. Discret, charmeur, prêt à trahir."
  },
  {
    nom: 'Gladiateur',
    nomEn: 'Gladiator',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout',
    cd: 5,
    hp_max: 112,
    hp_formule: '15d8+45',
    ca: 16,
    vitesse: 9,
    force: 18, dexterite: 15, constitution: 16, intelligence: 10, sagesse: 12, charisme: 15,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Trois attaques de lance.' },
      { nom: 'Lance', bonus_attaque: 7, degats: '2d6+4', type_degats: 'perforant', portee: '1,50 m / 6/18 m' },
      { nom: 'Coup de bouclier', bonus_attaque: 7, degats: '2d4+4', type_degats: 'contondant', portee: '1,50 m', description: 'Sauvegarde Force DD 15 ou bousculée.' }
    ],
    capacites_speciales: ['Parade : +3 CA contre une attaque vue.', 'Riposte (réaction).'],
    description: "Combattant d'arène musclé. Spectacle et bain de sang sont son métier."
  },
  {
    nom: 'Vétéran',
    nomEn: 'Veteran',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout',
    cd: 3,
    hp_max: 58,
    hp_formule: '9d8+18',
    ca: 17,
    vitesse: 9,
    force: 16, dexterite: 13, constitution: 14, intelligence: 10, sagesse: 11, charisme: 10,
    attaques: [
      { nom: 'Multiattaque', bonus_attaque: 0, degats: '—', type_degats: '—', description: 'Épée longue + épée courte.' },
      { nom: 'Épée longue', bonus_attaque: 5, degats: '1d8+3', type_degats: 'tranchant', portee: '1,50 m' },
      { nom: 'Épée courte', bonus_attaque: 5, degats: '1d6+3', type_degats: 'perforant', portee: '1,50 m' },
      { nom: 'Arbalète lourde', bonus_attaque: 3, degats: '1d10+1', type_degats: 'perforant', portee: '30/120 m' }
    ],
    description: "Soldat aguerri. Cicatrices et habitude des longues marches."
  },
  {
    nom: 'Druide',
    nomEn: 'Druid',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout',
    cd: 2,
    hp_max: 27,
    hp_formule: '5d8+5',
    ca: 11,
    vitesse: 9,
    force: 10, dexterite: 12, constitution: 13, intelligence: 12, sagesse: 15, charisme: 11,
    attaques: [
      { nom: 'Bâton', bonus_attaque: 2, degats: '1d6', type_degats: 'contondant', portee: '1,50 m' }
    ],
    capacites_speciales: [
      'Sorts (druide niveau 4) : Druidisme, Production de flamme, Soins, Tonnerre, Ronces, Métamorphose.'
    ],
    description: "Hermite des forêts, guérisseur ou prophète. Lié à la nature."
  },
  {
    nom: 'Noble',
    nomEn: 'Noble',
    type: 'Humanoïde',
    taille: 'M',
    alignement: 'Tout',
    cd: 0.125,
    hp_max: 9,
    hp_formule: '2d8',
    ca: 15,
    vitesse: 9,
    force: 11, dexterite: 12, constitution: 11, intelligence: 12, sagesse: 14, charisme: 16,
    attaques: [{ nom: 'Rapière', bonus_attaque: 3, degats: '1d8+1', type_degats: 'perforant', portee: '1,50 m' }],
    description: "Aristocrate à la cour ou en voyage. Habille de soie, voyage avec gardes."
  }
]

// Helpers utiles pour l'importer.
export const TYPES_MONSTRE: TypeMonstre[] = [
  'Aberration', 'Bête', 'Céleste', 'Construction', 'Dragon', 'Élémentaire',
  'Fée', 'Fiélon', 'Géant', 'Humanoïde', 'Mort-vivant', 'Plante', 'Vase',
  'Monstruosité'
]

export const TAILLES_MONSTRE: { key: TailleMonstre; label: string }[] = [
  { key: 'TP', label: 'Très petite' },
  { key: 'P', label: 'Petite' },
  { key: 'M', label: 'Moyenne' },
  { key: 'G', label: 'Grande' },
  { key: 'TG', label: 'Très grande' },
  { key: 'Gig', label: 'Gigantesque' }
]

// Construit le bloc de notes texte à partir du monstre, pour stockage dans
// `ennemis.notes` (champ libre dans la table existante).
export const monstreNotes = (m: Monstre): string => {
  const lignes: string[] = []
  lignes.push(`${m.taille} ${m.type}, ${m.alignement} — CD ${formatCD(m.cd)}`)
  lignes.push(`CA ${m.ca} · PV ${m.hp_max}${m.hp_formule ? ` (${m.hp_formule})` : ''}`)
  lignes.push(
    `Vitesse ${m.vitesse} m${m.vitesses_extra ? ', ' + m.vitesses_extra : ''}`
  )
  if (m.resistances && m.resistances.length > 0) {
    lignes.push(`Résistances : ${m.resistances.join(', ')}`)
  }
  if (m.immunites && m.immunites.length > 0) {
    lignes.push(`Immunités : ${m.immunites.join(', ')}`)
  }
  if (m.vulnerabilites && m.vulnerabilites.length > 0) {
    lignes.push(`Vulnérabilités : ${m.vulnerabilites.join(', ')}`)
  }
  lignes.push('')
  lignes.push('Attaques :')
  for (const a of m.attaques) {
    const bonus = a.bonus_attaque ? ` (+${a.bonus_attaque})` : ''
    const portee = a.portee ? ` · ${a.portee}` : ''
    lignes.push(
      `  • ${a.nom}${bonus} : ${a.degats} ${a.type_degats}${portee}${
        a.description ? ` — ${a.description}` : ''
      }`
    )
  }
  if (m.capacites_speciales && m.capacites_speciales.length > 0) {
    lignes.push('')
    lignes.push('Capacités spéciales :')
    for (const c of m.capacites_speciales) lignes.push(`  • ${c}`)
  }
  lignes.push('')
  lignes.push(m.description)
  return lignes.join('\n')
}

// Construit l'objet à insérer dans la table `ennemis`. La table existante a
// les champs : nom, hp_max, hp_actuel, armure, force, dex, con, int, sag, cha,
// notes, image_url, scenario_id, public, etc. — on remplit ce qu'on peut.
export const monstreVersEnnemi = (m: Monstre, mj_id: string) => ({
  mj_id,
  nom: m.nom,
  hp_max: m.hp_max,
  hp_actuel: m.hp_max,
  armure: m.ca,
  force: m.force,
  dexterite: m.dexterite,
  constitution: m.constitution,
  intelligence: m.intelligence,
  sagesse: m.sagesse,
  charisme: m.charisme,
  notes: monstreNotes(m),
  scenario_id: null,
  image_url: null
})
