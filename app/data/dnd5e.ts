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
  nomEn?: string
  sousRaces?: string[]
  bonusStats: Partial<Record<StatKey, number>>
  bonusLibre?: { nb: number; valeur: number } // ex. Demi-elfe : 2 stats au choix
  vitesse: number // en mètres
  langues: string[]
  traits: string[]
}

export const RACES: Race[] = [
  // ---- Races PHB ----
  {
    nom: 'Humain',
    nomEn: 'Human',
    bonusStats: { for: 1, dex: 1, con: 1, int: 1, sag: 1, cha: 1 },
    vitesse: 9,
    langues: ['Commun', 'Une langue au choix'],
    traits: ['Polyvalent : +1 à toutes les caractéristiques.']
  },
  {
    nom: 'Elfe',
    nomEn: 'Elf',
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
    nomEn: 'Dwarf',
    sousRaces: ['Nain des collines', 'Nain des montagnes'],
    bonusStats: { con: 2 },
    vitesse: 7.5,
    langues: ['Commun', 'Nain'],
    traits: [
      'Vision dans le noir (18 m).',
      'Résilience naine : avantage et résistance contre le poison.',
      'Entraînement au combat : maîtrise des haches et marteaux.',
      "Affinité avec la pierre : double bonus de maîtrise pour les connaissances sur la pierre."
    ]
  },
  {
    nom: 'Halfelin',
    nomEn: 'Halfling',
    sousRaces: ['Pied léger', 'Robuste'],
    bonusStats: { dex: 2 },
    vitesse: 7.5,
    langues: ['Commun', 'Halfelin'],
    traits: [
      'Chanceux : relance les 1 naturels sur attaque, test ou sauvegarde.',
      'Brave : avantage contre la terreur.',
      "Agilité halfeline : peut traverser l'espace de créatures plus grandes."
    ]
  },
  {
    nom: 'Demi-elfe',
    nomEn: 'Half-Elf',
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
    nomEn: 'Half-Orc',
    bonusStats: { for: 2, con: 1 },
    vitesse: 9,
    langues: ['Commun', 'Orc'],
    traits: [
      'Vision dans le noir (18 m).',
      "Menaçant : maîtrise d'Intimidation.",
      'Endurance implacable : revient à 1 PV au lieu de 0, une fois par repos long.',
      'Attaques sauvages : +1 dé de dégâts sur coup critique au corps à corps.'
    ]
  },
  {
    nom: 'Gnome',
    nomEn: 'Gnome',
    sousRaces: ['Gnome des forêts', 'Gnome des roches'],
    bonusStats: { int: 2 },
    vitesse: 7.5,
    langues: ['Commun', 'Gnome'],
    traits: [
      'Vision dans le noir (18 m).',
      "Ruse gnome : avantage aux sauvegardes d'Int, Sag et Cha contre la magie."
    ]
  },
  {
    nom: 'Tieffelin',
    nomEn: 'Tiefling',
    sousRaces: ['Asmodéen (infernal)', 'Abyssal', 'Féerique', 'Glasya', 'Levistus', 'Mephistopheles'],
    bonusStats: { cha: 2, int: 1 },
    vitesse: 9,
    langues: ['Commun', 'Infernal'],
    traits: [
      'Vision dans le noir (18 m).',
      'Résistance infernale : résistance aux dégâts de feu.',
      'Héritage infernal : connaît le cantrip Thaumaturgie.',
      "Variante par défaut (Asmodéen). D'autres lignées modifient les sorts ou le bonus secondaire."
    ]
  },
  {
    nom: 'Tieffelin (Abyssal)',
    nomEn: 'Tiefling (Abyssal)',
    bonusStats: { cha: 2, for: 1 },
    vitesse: 9,
    langues: ['Commun', 'Abyssal'],
    traits: [
      'Vision dans le noir (18 m).',
      'Résistance infernale : résistance aux dégâts de feu.',
      "Variante : héritage démoniaque, sorts orientés contrôle plutôt qu'arcanes."
    ]
  },
  {
    nom: 'Tieffelin (Féerique)',
    nomEn: 'Tiefling (Feral)',
    bonusStats: { cha: 2, dex: 1 },
    vitesse: 9,
    langues: ['Commun', 'Infernal'],
    traits: [
      'Vision dans le noir (18 m).',
      'Résistance infernale : résistance aux dégâts de feu.',
      'Variante féerique (SCAG) : la Dextérité remplace l\'Intelligence comme bonus secondaire.'
    ]
  },
  {
    nom: 'Drakéide',
    nomEn: 'Dragonborn',
    sousRaces: ['Noir', 'Bleu', 'Vert', 'Rouge', 'Blanc', 'Or', 'Argent', 'Bronze', 'Cuivre', 'Airain'],
    bonusStats: { for: 2, cha: 1 },
    vitesse: 9,
    langues: ['Commun', 'Draconique'],
    traits: [
      'Ascendance draconique : résistance à un type de dégâts élémentaire au choix.',
      'Souffle : attaque de zone 2d6 (+1d6 tous les 5 niveaux), recharge sur repos court.'
    ]
  },

  // ---- Volo's Guide / Mordenkainen / Tasha's ----
  {
    nom: 'Goliath',
    nomEn: 'Goliath',
    bonusStats: { for: 2, con: 1 },
    vitesse: 9,
    langues: ['Commun', 'Géant'],
    traits: [
      "Acclimatation à l'altitude : pas de désavantage dû à l'altitude.",
      "Athlète né : maîtrise d'Athlétisme.",
      "Résistance des montagnes : résistance au froid.",
      "Puissance des géants des pierres : 1/repos court, ajoute 1d4 aux dégâts d'une attaque."
    ]
  },
  {
    nom: 'Aasimar',
    nomEn: 'Aasimar',
    sousRaces: ['Protecteur', 'Justicier', 'Déchu'],
    bonusStats: { cha: 2 },
    vitesse: 9,
    langues: ['Commun', 'Céleste'],
    traits: [
      'Vision dans le noir (18 m).',
      'Résistance céleste : résistance aux dégâts nécrotiques et radiants.',
      "Soin par imposition des mains : guérit des PV égaux à son niveau (1/repos long).",
      "Lumière divine : connaît le cantrip Lumière.",
      'Transformation à partir du niveau 3 selon la sous-race.'
    ]
  },
  {
    nom: "Genasi de l'Air",
    nomEn: 'Air Genasi',
    bonusStats: { con: 2, dex: 1 },
    vitesse: 9,
    langues: ['Commun', 'Primordial'],
    traits: [
      'Aisance dans les airs : retient son souffle sans limite.',
      'Vivre du vent : connaît Lévitation à partir du niveau 3.',
      'Linguiste primordial : comprend la variante aurique.'
    ]
  },
  {
    nom: 'Genasi de la Terre',
    nomEn: 'Earth Genasi',
    bonusStats: { con: 2, for: 1 },
    vitesse: 9,
    langues: ['Commun', 'Primordial'],
    traits: [
      'Marche terrestre : ignore les terrains difficiles d\'origine naturelle.',
      'Filage de la terre : peut lancer Étreinte de la Terre 1/repos long.',
      'Camouflage rocheux : avantage à la Discrétion en terrain caillouteux.'
    ]
  },
  {
    nom: 'Genasi du Feu',
    nomEn: 'Fire Genasi',
    bonusStats: { con: 2, int: 1 },
    vitesse: 9,
    langues: ['Commun', 'Primordial'],
    traits: [
      'Résistance au feu : immunité contre les dégâts de feu non magiques.',
      'Vision dans le noir (18 m).',
      'Atteinte du feu : connaît Production de Flamme, puis Mains Brûlantes au niveau 3.'
    ]
  },
  {
    nom: "Genasi de l'Eau",
    nomEn: 'Water Genasi',
    bonusStats: { con: 2, sag: 1 },
    vitesse: 9,
    langues: ['Commun', 'Primordial'],
    traits: [
      'Acclimaté à l\'eau : nage à 9 m et respire sous l\'eau.',
      'Résistance à l\'acide.',
      "Appel des vagues : connaît Façonnage des Eaux, puis Création/Destruction de l'Eau au niveau 3."
    ]
  },
  {
    nom: 'Gobelin',
    nomEn: 'Goblin',
    bonusStats: { dex: 2, con: 1 },
    vitesse: 9,
    langues: ['Commun', 'Gobelin'],
    traits: [
      'Vision dans le noir (18 m).',
      'Fureur du nain (Fury of the Small) : 1/repos court, +(niveau) dégâts contre une cible plus grande.',
      'Évasion agile : Désengagement ou Pointe en action bonus.'
    ]
  },
  {
    nom: 'Hobgobelin',
    nomEn: 'Hobgoblin',
    bonusStats: { con: 2, int: 1 },
    vitesse: 9,
    langues: ['Commun', 'Gobelin'],
    traits: [
      'Vision dans le noir (18 m).',
      'Entraînement martial : maîtrise de l\'armure légère et de 2 armes martiales.',
      'Salut au prouesse (Saving Face) : 1/repos court, +1 par allié visible (max +5) à un test raté.'
    ]
  },
  {
    nom: 'Kobold',
    nomEn: 'Kobold',
    bonusStats: { dex: 2 },
    vitesse: 9,
    langues: ['Commun', 'Draconique'],
    traits: [
      'Vision dans le noir (18 m).',
      'Bagarre en groupe : avantage à l\'attaque si un allié non-incapacité est dans 1,50 m.',
      'Sensibilité au soleil : désavantage en plein soleil sur attaque/Perception (variante).'
    ]
  },
  {
    nom: 'Kenku',
    nomEn: 'Kenku',
    bonusStats: { dex: 2, sag: 1 },
    vitesse: 9,
    langues: ['Commun', 'Auran'],
    traits: [
      'Imitation parfaite : reproduit n\'importe quel son entendu.',
      'Esprit kenku : maîtrise de 2 compétences parmi Acrobaties, Tromperie, Discrétion, Escamotage.',
      'Malédiction du kenku : ne peut parler qu\'en imitant des voix entendues.'
    ]
  },
  {
    nom: 'Tabaxi',
    nomEn: 'Tabaxi',
    bonusStats: { dex: 2, cha: 1 },
    vitesse: 9,
    langues: ['Commun', 'Une au choix'],
    traits: [
      'Vision dans le noir (18 m).',
      'Agilité féline : double sa vitesse 1 round par tour, 1/repos court.',
      'Griffes de chat : escalade à 6 m, griffes (1d4 tranchant en attaque naturelle).',
      'Sens aiguisés : maîtrise de Perception et Discrétion.'
    ]
  },
  {
    nom: 'Triton',
    nomEn: 'Triton',
    bonusStats: { for: 1, con: 1, cha: 1 },
    vitesse: 9,
    langues: ['Commun', 'Primordial'],
    traits: [
      "Amphibien : respire dans l'eau et sur terre.",
      'Vitesse de nage 9 m.',
      'Contrôle des eaux : connaît Brume au niveau 1, Marche sur l\'eau au niveau 3, Respiration aquatique au niveau 5 (1/repos long chacun).',
      'Émissaire de la mer : communique avec les bêtes aquatiques.',
      'Résistance au froid.'
    ]
  },
  {
    nom: 'Yuan-ti',
    nomEn: 'Yuan-Ti Pureblood',
    bonusStats: { cha: 2, int: 1 },
    vitesse: 9,
    langues: ['Commun', 'Abyssal', 'Draconique'],
    traits: [
      'Vision dans le noir (18 m).',
      'Résistance innée à la magie : avantage aux sauvegardes contre les sorts.',
      'Immunité au poison.',
      'Magie innée : Poison Spray puis Animal Friendship (serpents, à volonté), Suggestion (1/repos long).'
    ]
  },
  {
    nom: 'Centaure',
    nomEn: 'Centaur',
    bonusStats: { for: 2, sag: 1 },
    vitesse: 12,
    langues: ['Commun', 'Sylvestre'],
    traits: [
      'Quadrupède (forme équine) — ne peut pas porter d\'armure légère sans adaptation.',
      'Sabots : attaque naturelle 1d4 + mod For.',
      'Surge équin : double sa vitesse 1/repos court (action bonus).',
      'Connaissance de la nature : maîtrise d\'une compétence Survie/Médecine/Nature/Dressage.'
    ]
  },
  {
    nom: 'Loxodon',
    nomEn: 'Loxodon',
    bonusStats: { con: 2, sag: 1 },
    vitesse: 7.5,
    langues: ['Commun', 'Loxodon'],
    traits: [
      'Calme naturel : avantage aux sauvegardes contre la peur.',
      'Peau épaisse : CA naturelle 12 + mod Con (sans armure).',
      'Sens à la trompe : odorat aiguisé, Perception en odeur sans pénalité.',
      'Force sereine : capacité de transport doublée.'
    ]
  },
  {
    nom: 'Minotaure',
    nomEn: 'Minotaur',
    bonusStats: { for: 2, con: 1 },
    vitesse: 9,
    langues: ['Commun', 'Minotaur'],
    traits: [
      'Cornes : attaque naturelle 1d6 + mod For.',
      'Charge à corne : si la créature avance d\'au moins 3 m avant l\'attaque, +2d6 et possible bousculade.',
      'Mémoire labyrinthique : ne se perd jamais en cartographiant son chemin.'
    ]
  },
  {
    nom: 'Firbolg',
    nomEn: 'Firbolg',
    bonusStats: { sag: 2, for: 1 },
    vitesse: 9,
    langues: ['Commun', 'Elfique', 'Géant'],
    traits: [
      'Magie firbolg : Détection de la Magie + Déguisement (1/repos court).',
      "Voile firbolg : invisible 1 round en action bonus (1/repos court).",
      'Affinité avec la nature : communique avec bêtes et plantes.',
      "Robustesse géante : compté comme une créature de taille G pour pousser/transporter."
    ]
  },
  {
    nom: 'Demi-géant',
    nomEn: 'Half-Giant',
    bonusStats: { for: 2, con: 1 },
    vitesse: 9,
    langues: ['Commun', 'Géant'],
    traits: [
      'Puissance brute : compte comme une créature de taille G pour les manœuvres.',
      'Endurance des géants : 1/repos long, ignore les dégâts d\'une attaque (réaction).',
      "Héritage primordial : avantage aux sauvegardes contre les terrains élémentaires."
    ]
  },
  {
    nom: 'Changelin',
    nomEn: 'Changeling',
    bonusStats: { cha: 2 },
    bonusLibre: { nb: 1, valeur: 1 },
    vitesse: 9,
    langues: ['Commun', 'Deux au choix'],
    traits: [
      'Métamorphe : peut altérer son apparence en action (taille restant similaire).',
      'Instinct du changelin : maîtrise de 2 compétences parmi Tromperie, Persuasion, Perspicacité, Intimidation.',
      "Aucune trace : son odeur et ses traces s'estompent rapidement."
    ]
  },
  {
    nom: 'Warforged',
    nomEn: 'Warforged',
    bonusStats: { con: 2 },
    bonusLibre: { nb: 1, valeur: 1 },
    vitesse: 9,
    langues: ['Commun', 'Une au choix'],
    traits: [
      'Construit pour la guerre : +1 CA naturelle, maîtrise d\'une compétence et d\'un outil.',
      "Résilience intégrée : avantage aux sauvegardes contre poison, résistance aux dégâts de poison.",
      'Sentinelle : pas besoin de manger, boire, respirer ; sommeil léger 6 h tout en restant éveillé.'
    ]
  }
]

// ------------------------- CLASSES -------------------------

export type Classe = {
  nom: string
  nomEn?: string
  deVie: string
  hpNiveau1Base: number // valeur max du dé à ajouter au mod Con
  jetsSauvegarde: StatKey[]
  caracteristiquesPrincipales: StatKey[]
  sousClasses?: string[]
}

export const CLASSES: Classe[] = [
  {
    nom: 'Barbare',
    nomEn: 'Barbarian',
    deVie: 'd12',
    hpNiveau1Base: 12,
    jetsSauvegarde: ['for', 'con'],
    caracteristiquesPrincipales: ['for'],
    sousClasses: [
      'Voie du Berserker',
      'Voie du Totem',
      "Voie de l'Ancestral",
      'Voie du Zélote',
      'Voie du Hérault de la Tempête',
      'Voie de la Magie Sauvage',
      'Voie de la Bête'
    ]
  },
  {
    nom: 'Barde',
    nomEn: 'Bard',
    deVie: 'd8',
    hpNiveau1Base: 8,
    jetsSauvegarde: ['dex', 'cha'],
    caracteristiquesPrincipales: ['cha'],
    sousClasses: [
      'Collège du Savoir',
      'Collège de la Vaillance',
      'Collège du Glamour',
      'Collège des Murmures',
      "Collège de l'Éloquence",
      'Collège des Épées',
      'Collège de la Création',
      'Collège des Esprits'
    ]
  },
  {
    nom: 'Clerc',
    nomEn: 'Cleric',
    deVie: 'd8',
    hpNiveau1Base: 8,
    jetsSauvegarde: ['sag', 'cha'],
    caracteristiquesPrincipales: ['sag'],
    sousClasses: [
      'Domaine de la Vie',
      'Domaine de la Lumière',
      'Domaine de la Tempête',
      'Domaine de la Tromperie',
      'Domaine de la Guerre',
      'Domaine de la Nature',
      'Domaine du Savoir',
      'Domaine de la Tombe',
      "Domaine de l'Ordre",
      'Domaine de la Paix',
      'Domaine du Crépuscule',
      'Domaine de la Forge'
    ]
  },
  {
    nom: 'Druide',
    nomEn: 'Druid',
    deVie: 'd8',
    hpNiveau1Base: 8,
    jetsSauvegarde: ['int', 'sag'],
    caracteristiquesPrincipales: ['sag'],
    sousClasses: [
      'Cercle de la Terre',
      'Cercle de la Lune',
      'Cercle des Rêves',
      'Cercle des Bergers',
      'Cercle des Étoiles',
      'Cercle des Spores',
      'Cercle des Vœux'
    ]
  },
  {
    nom: 'Ensorceleur',
    nomEn: 'Sorcerer',
    deVie: 'd6',
    hpNiveau1Base: 6,
    jetsSauvegarde: ['con', 'cha'],
    caracteristiquesPrincipales: ['cha'],
    sousClasses: [
      'Lignée draconique',
      'Magie sauvage',
      'Esprit aberrant',
      "Âme d'horloge",
      'Âme divine',
      'Magie de la tempête',
      'Magie de l\'ombre'
    ]
  },
  {
    nom: 'Guerrier',
    nomEn: 'Fighter',
    deVie: 'd10',
    hpNiveau1Base: 10,
    jetsSauvegarde: ['for', 'con'],
    caracteristiquesPrincipales: ['for', 'dex'],
    sousClasses: [
      'Champion',
      'Maître de guerre',
      'Chevalier mystique',
      'Archer arcanique',
      'Chevalier (Cavalier)',
      'Samouraï',
      'Chevalier-dragon pourpre',
      'Soldat des runes',
      'Guerrier psi',
      "Chevalier de l'écho"
    ]
  },
  {
    nom: 'Magicien',
    nomEn: 'Wizard',
    deVie: 'd6',
    hpNiveau1Base: 6,
    jetsSauvegarde: ['int', 'sag'],
    caracteristiquesPrincipales: ['int'],
    sousClasses: [
      'École d\'Abjuration',
      'École d\'Évocation',
      'École de Divination',
      'École d\'Enchantement',
      'École d\'Illusion',
      'École d\'Invocation',
      'École de Nécromancie',
      'École de Transmutation',
      'École de Magie de guerre',
      'Chante-lame',
      'École de Chronurgie',
      'École de Graviturgie',
      'Ordre des Écrits'
    ]
  },
  {
    nom: 'Moine',
    nomEn: 'Monk',
    deVie: 'd8',
    hpNiveau1Base: 8,
    jetsSauvegarde: ['for', 'dex'],
    caracteristiquesPrincipales: ['dex', 'sag'],
    sousClasses: [
      'Voie de la Paume Ouverte',
      'Voie de l\'Ombre',
      'Voie des Quatre Éléments',
      'Voie du Kensei',
      'Voie de l\'Âme du Soleil',
      'Voie de la Mort Lente',
      'Voie du Maître Ivre',
      'Voie de la Miséricorde',
      'Voie du Soi Astral'
    ]
  },
  {
    nom: 'Paladin',
    nomEn: 'Paladin',
    deVie: 'd10',
    hpNiveau1Base: 10,
    jetsSauvegarde: ['sag', 'cha'],
    caracteristiquesPrincipales: ['for', 'cha'],
    sousClasses: [
      'Serment de Dévotion',
      'Serment des Anciens',
      'Serment de Vengeance',
      'Serment de Conquête',
      'Serment de Rédemption',
      'Serment de la Couronne',
      'Serment de Gloire',
      'Serment des Veilleurs',
      'Serment Brisé (MJ)'
    ]
  },
  {
    nom: 'Rôdeur',
    nomEn: 'Ranger',
    deVie: 'd10',
    hpNiveau1Base: 10,
    jetsSauvegarde: ['for', 'dex'],
    caracteristiquesPrincipales: ['dex', 'sag'],
    sousClasses: [
      'Chasseur',
      'Maître des bêtes',
      "Cape grise (Pénombre)",
      'Vagabond féerique',
      'Tueur d\'horizons',
      'Tueur de monstres',
      'Garde-essaim',
      'Garde-drake'
    ]
  },
  {
    nom: 'Roublard',
    nomEn: 'Rogue',
    deVie: 'd8',
    hpNiveau1Base: 8,
    jetsSauvegarde: ['dex', 'int'],
    caracteristiquesPrincipales: ['dex'],
    sousClasses: [
      'Voleur',
      'Assassin',
      'Truand arcanique',
      'Mascarade',
      'Inquisiteur',
      'Bretteur',
      'Âme des lames',
      'Fantôme',
      'Éclaireur'
    ]
  },
  {
    nom: 'Sorcier',
    nomEn: 'Warlock',
    deVie: 'd8',
    hpNiveau1Base: 8,
    jetsSauvegarde: ['sag', 'cha'],
    caracteristiquesPrincipales: ['cha'],
    sousClasses: [
      'Pacte de l\'Archifée',
      'Pacte du Démon',
      'Pacte du Grand Ancien',
      'Pacte du Céleste',
      'Pacte du Hexblade',
      'Pacte du Génie',
      'Pacte des Profondeurs',
      'Pacte du Mort-vivant',
      'Pacte de l\'Immortel'
    ]
  },
  {
    nom: 'Artificier',
    nomEn: 'Artificer',
    deVie: 'd8',
    hpNiveau1Base: 8,
    jetsSauvegarde: ['con', 'int'],
    caracteristiquesPrincipales: ['int'],
    sousClasses: [
      'Alchimiste',
      'Artilleur',
      'Forgemage',
      'Armurier'
    ]
  },
  {
    nom: 'Sang-de-dragon',
    nomEn: 'Dragonblood',
    deVie: 'd8',
    hpNiveau1Base: 8,
    jetsSauvegarde: ['con', 'cha'],
    caracteristiquesPrincipales: ['cha', 'for'],
    sousClasses: [
      'Lignée chromatique',
      'Lignée métallique',
      'Lignée gemme',
      'Sang ancien'
    ]
  }
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
  'Tieffelin (Abyssal)': ['Akmenos', 'Damaia', 'Iados', 'Kallista', 'Mordaï', 'Rieta', 'Skamos'],
  'Tieffelin (Féerique)': ['Akmenos', 'Damaia', 'Iados', 'Kallista', 'Mordaï', 'Rieta', 'Skamos'],
  Drakéide:    ['Arjhan', 'Baragh', 'Daar', 'Kriv', 'Nadarr', 'Pandjed', 'Tazyn', 'Venmig'],
  Goliath:     ['Aukan', 'Eglyl', 'Gauthak', 'Keothi', 'Lo-Kag', 'Maveith', 'Thotham', 'Vaunea'],
  Aasimar:     ['Aramis', 'Caelar', 'Iliphar', 'Lirael', 'Mariel', 'Sariel', 'Tael', 'Zariel'],
  "Genasi de l'Air":   ['Aerios', 'Cyran', 'Iskra', 'Sylphine', 'Zephyr'],
  'Genasi de la Terre': ['Brom', 'Granitia', 'Korim', 'Stonara', 'Talgrim'],
  'Genasi du Feu':     ['Cinder', 'Embra', 'Pyrios', 'Vulkar', 'Zelara'],
  "Genasi de l'Eau":   ['Cael', 'Maris', 'Naïa', 'Tidus', 'Undina'],
  Gobelin:     ['Booyahg', 'Garr', 'Krunk', 'Pog', 'Snik', 'Yabba', 'Zog'],
  Hobgobelin:  ['Drazka', 'Garn', 'Karok', 'Mokrul', 'Trekkil', 'Vogul'],
  Kobold:      ['Drix', 'Klyx', 'Riszit', 'Sniv', 'Tikrik', 'Yax'],
  Kenku:       ['Sifflet', 'Cliquetis', 'Murmure', 'Crissement', 'Cri', 'Plume'],
  Tabaxi:      ['Cinnabar', 'Fleur-de-lune', 'Plume-d\'aurore', 'Saut-de-rivière', 'Vent-Doux'],
  Triton:      ['Belthyn', 'Corus', 'Mariel', 'Nereus', 'Vodalus', 'Yliya'],
  'Yuan-ti':   ['Hessetal', 'Issk', 'Jasaka', 'Sazz', 'Tassanal', 'Xelvys'],
  Centaure:    ['Avren', 'Faelar', 'Korin', 'Mirélion', 'Tarn', 'Velora'],
  Loxodon:     ['Ankhamon', 'Brima', 'Dunamis', 'Galena', 'Iruka', 'Pharaak'],
  Minotaure:   ['Brakkos', 'Doryn', 'Karok', 'Mathos', 'Tarvos', 'Xandros'],
  Firbolg:     ['Aerwyn', 'Brennor', 'Caelinn', 'Loranna', 'Selvath', 'Yorek'],
  'Demi-géant': ['Borak', 'Drogarn', 'Hakkar', 'Mirdun', 'Vorka'],
  Changelin:   ['Aleyd', 'Bremen', 'Cyran', 'Mireille', 'Nyx', 'Vanya'],
  Warforged:   ['Acier', 'Bouclier', 'Chrome', 'Enclume', 'Fer-V', 'Lame', 'Sentinelle']
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

// ------------------------- MONTÉE DE NIVEAU -------------------------
// Table d'XP du PHB. XP_THRESHOLDS[i] = seuil pour atteindre le niveau i+1.
// XP_THRESHOLDS[0] = 0 (niv 1), XP_THRESHOLDS[1] = 300 (niv 2), etc.
export const XP_THRESHOLDS: readonly number[] = [
  0,       // niv 1
  300,     // niv 2
  900,     // niv 3
  2700,    // niv 4
  6500,    // niv 5
  14000,   // niv 6
  23000,   // niv 7
  34000,   // niv 8
  48000,   // niv 9
  64000,   // niv 10
  85000,   // niv 11
  100000,  // niv 12
  120000,  // niv 13
  140000,  // niv 14
  165000,  // niv 15
  195000,  // niv 16
  225000,  // niv 17
  265000,  // niv 18
  305000,  // niv 19
  355000   // niv 20
]

// XP requis pour atteindre le niveau suivant. null si niveau max.
export const xpRequisProchainNiveau = (niveauActuel: number): number | null => {
  if (niveauActuel >= 20) return null
  return XP_THRESHOLDS[niveauActuel] ?? null
}

// Niveau "théorique" si on respectait simplement la table d'XP.
export const niveauPourXp = (xp: number): number => {
  let n = 1
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) n = i + 1
  }
  return n
}

// Valeur moyenne d'un dé de vie pour la prise de HP par défaut (PHB) :
// d6 → 4, d8 → 5, d10 → 6, d12 → 7. (= floor(faces/2) + 1)
export const moyenneDeVie = (deVie: string | null | undefined): number => {
  if (!deVie) return 5
  const m = deVie.match(/d(\d+)/i)
  if (!m) return 5
  const faces = parseInt(m[1], 10)
  return Math.floor(faces / 2) + 1
}

// Nombre de faces du dé de vie. Sert pour le "Lancer le dé".
export const facesDeVie = (deVie: string | null | undefined): number => {
  if (!deVie) return 8
  const m = deVie.match(/d(\d+)/i)
  if (!m) return 8
  return parseInt(m[1], 10)
}

// Niveau auquel chaque classe accède à sa sous-classe (PHB / SCAG / Tasha's).
export const NIVEAU_SOUS_CLASSE: Record<string, number> = {
  Clerc: 1,
  Ensorceleur: 1,
  Sorcier: 1,
  Druide: 2,
  Magicien: 2,
  Barbare: 3,
  Barde: 3,
  Guerrier: 3,
  Moine: 3,
  Paladin: 3,
  'Rôdeur': 3,
  Roublard: 3,
  Artificier: 3,
  'Sang-de-dragon': 3
}

// Niveaux où la classe gagne une augmentation de caractéristique (ASI).
// Le Guerrier en a 7, le Roublard en a 6, les autres 5.
const ASI_DEFAULT: readonly number[] = [4, 8, 12, 16, 19]
export const NIVEAUX_ASI: Record<string, readonly number[]> = {
  Guerrier: [4, 6, 8, 12, 14, 16, 19],
  Roublard: [4, 8, 10, 12, 16, 19]
}
export const getNiveauxASI = (classe: string | null | undefined): readonly number[] =>
  (classe && NIVEAUX_ASI[classe]) || ASI_DEFAULT

export const estNiveauASI = (classe: string | null | undefined, niveau: number): boolean =>
  getNiveauxASI(classe).includes(niveau)

// Prérequis pour multiclasser dans une classe (stat ≥ 13).
// On ne modélise pas les "ou" complexes (ex. Guerrier = For OU Dex) → on prend
// la plus accessible (Dex pour Guerrier) et on documente. À ajuster si besoin.
export const PREREQUIS_MULTICLASSE: Record<string, StatKey[]> = {
  Barbare: ['for'],
  Barde: ['cha'],
  Clerc: ['sag'],
  Druide: ['sag'],
  Ensorceleur: ['cha'],
  Guerrier: ['for'],
  Magicien: ['int'],
  Moine: ['dex', 'sag'],
  Paladin: ['for', 'cha'],
  'Rôdeur': ['dex', 'sag'],
  Roublard: ['dex'],
  Sorcier: ['cha'],
  Artificier: ['int'],
  'Sang-de-dragon': ['cha']
}

// Renvoie la liste des stats < 13 qui empêchent de multiclasser. Vide = OK.
export const prerequisManquants = (
  classe: string,
  stats: { for: number; dex: number; con: number; int: number; sag: number; cha: number }
): StatKey[] => {
  const requis = PREREQUIS_MULTICLASSE[classe]
  if (!requis) return []
  return requis.filter((s) => stats[s] < 13)
}

// Classes considérées comme "lanceurs de sorts connus" — le joueur choisit
// explicitement ses sorts (vs Clerc/Druide qui préparent dans toute la liste).
export const CLASSES_SORTS_CONNUS: readonly string[] = [
  'Barde',
  'Ensorceleur',
  'Sorcier',
  'Magicien',
  'Rôdeur',
  'Paladin'
]
export const apprendSorts = (classe: string | null | undefined): boolean =>
  !!classe && CLASSES_SORTS_CONNUS.includes(classe)

// Une entrée dans l'historique multiclasse.
export type ClasseMultiple = {
  classe: string
  sous_classe?: string
  niveau: number
}

// Calcule le niveau total à partir de l'historique multiclasse (ou retourne
// le niveau passé en argument si l'historique est vide).
export const niveauTotal = (classes: ClasseMultiple[], fallback: number): number => {
  if (!classes || classes.length === 0) return fallback
  return classes.reduce((sum, c) => sum + (c.niveau || 0), 0)
}

// ------------------------- XP PAR DÉFI (CD/CR) -------------------------
// Table PHB / DMG p.275 — XP attribué par créature en fonction de son CD.
// Les fractions 1/8, 1/4, 1/2 sont stockées en numérique (0.125, 0.25, 0.5).
export const XP_PAR_CD: Record<string, number> = {
  '0':     10,
  '0.125': 25,    // 1/8
  '0.25':  50,    // 1/4
  '0.5':   100,   // 1/2
  '1':     200,
  '2':     450,
  '3':     700,
  '4':     1100,
  '5':     1800,
  '6':     2300,
  '7':     2900,
  '8':     3900,
  '9':     5000,
  '10':    5900,
  '11':    7200,
  '12':    8400,
  '13':    10000,
  '14':    11500,
  '15':    13000,
  '16':    15000,
  '17':    18000,
  '18':    20000,
  '19':    22000,
  '20':    25000
}

export const xpPourCD = (cd: number | string | null | undefined): number => {
  if (cd === null || cd === undefined || cd === '') return 0
  const num = typeof cd === 'string' ? parseFloat(cd) : cd
  if (!isFinite(num)) return 0
  // Lookup direct via le format string normalisé (gère 0.125 / 0.25 / 0.5).
  const direct = XP_PAR_CD[String(num)]
  if (direct !== undefined) return direct
  // Pour les CD entiers > 20, on plafonne à 25000 ; en-dessous on retourne 0.
  if (num > 20) return 25000
  return 0
}

// Label affichable d'un CD (1/8, 1/4, 1/2 ou entier).
export const labelCD = (cd: number | string | null | undefined): string => {
  if (cd === null || cd === undefined || cd === '') return '—'
  const num = typeof cd === 'string' ? parseFloat(cd) : cd
  if (!isFinite(num)) return '—'
  if (num === 0.125) return '1/8'
  if (num === 0.25) return '1/4'
  if (num === 0.5) return '1/2'
  return String(num)
}
