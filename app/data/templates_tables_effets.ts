// ============================================================================
// ROADMAP V1 — Phase 2.1 : Templates de tables d'effets prêtes à l'emploi
// ----------------------------------------------------------------------------
// Tables d'effets aléatoires que l'utilisateur peut importer puis customiser
// dans /dashboard/tables-effets. Chaque template fournit un dé (`de`) et une
// liste d'effets {min, max, titre, description} couvrant l'intégralité de la
// plage du dé. (Les potions ratées sont volontairement exclues.)
// ============================================================================

export type DeType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'

export type EffetTemplate = {
  min: number
  max: number
  titre: string
  description: string
}

export type TableEffetTemplate = {
  id: string
  nom: string
  icone: string
  description: string
  de: DeType
  effets: EffetTemplate[]
}

export const TEMPLATES_TABLES_EFFETS: TableEffetTemplate[] = [
  // --------------------------------------------------------------------------
  {
    id: 'mutations_sauvages',
    nom: 'Mutations sauvages',
    icone: '🧬',
    description:
      'Transformations physiques aléatoires provoquées par une magie instable, une potion mutagène ou une contamination féerique.',
    de: 'd12',
    effets: [
      { min: 1, max: 1, titre: 'Peau d’écailles', description: 'La peau se couvre d’écailles luisantes : +1 à la CA, désavantage aux jets de Charisme (Persuasion).' },
      { min: 2, max: 2, titre: 'Yeux nocturnes', description: 'Les yeux deviennent ceux d’un prédateur : vision dans le noir 18 m, sensibilité à la lumière vive.' },
      { min: 3, max: 3, titre: 'Membres allongés', description: 'Bras et jambes s’étirent : allonge +1,50 m, mais −2 m de vitesse pendant 1 heure.' },
      { min: 4, max: 4, titre: 'Branchies', description: 'Des branchies apparaissent : respiration aquatique pendant 24 heures.' },
      { min: 5, max: 5, titre: 'Pelage épais', description: 'Une fourrure pousse : résistance au froid, mais vulnérable au feu jusqu’au prochain repos long.' },
      { min: 6, max: 6, titre: 'Doigts palmés', description: 'Nage à pleine vitesse, mais manipulation d’objets fins au désavantage.' },
      { min: 7, max: 7, titre: 'Cornes', description: 'Des cornes percent le front : attaque de coup de boutoir 1d6 perforant, intimidation au charme.' },
      { min: 8, max: 8, titre: 'Langue fourchue', description: 'Odorat décuplé : avantage aux jets de Sagesse (Perception) basés sur l’odorat.' },
      { min: 9, max: 9, titre: 'Os légers', description: 'Squelette allégé : vitesse +3 m, mais dégâts contondants subis +1 par dé.' },
      { min: 10, max: 10, titre: 'Bras supplémentaire', description: 'Un troisième bras pousse : un objet supplémentaire manipulé, regard dérangé des PNJ.' },
      { min: 11, max: 11, titre: 'Bioluminescence', description: 'La peau émet une lueur (lumière faible 3 m) impossible à éteindre pendant 1 heure.' },
      { min: 12, max: 12, titre: 'Mue totale', description: 'Le corps mue entièrement : récupère 2d8 PV, mais épuisement niveau 1 le temps de s’y habituer.' }
    ]
  },
  // --------------------------------------------------------------------------
  {
    id: 'folie_demence',
    nom: 'Folie / Démence',
    icone: '🌀',
    description:
      'Effets de santé mentale inspirés des règles de folie de courte durée. À déclencher après une horreur, un effet psychique ou un pacte rompu.',
    de: 'd10',
    effets: [
      { min: 1, max: 1, titre: 'Catatonie', description: 'Le personnage reste figé et muet pendant 1 minute, incapable d’agir.' },
      { min: 2, max: 2, titre: 'Fuite irrationnelle', description: 'Pris d’une terreur incontrôlable, il fuit la source par tous les moyens pendant 1 minute.' },
      { min: 3, max: 3, titre: 'Rire nerveux', description: 'Pris d’un fou rire, il ne peut rien faire d’utile pendant 1 minute.' },
      { min: 4, max: 4, titre: 'Hallucinations', description: 'Il voit des choses qui n’existent pas et agit en conséquence (le MJ décrit).' },
      { min: 5, max: 5, titre: 'Paranoïa', description: 'Il se méfie de tous, y compris ses alliés : désavantage aux jets sociaux pendant 10 minutes.' },
      { min: 6, max: 6, titre: 'Compulsion de comptage', description: 'Il doit compter ou ordonner les objets autour de lui, distrait : désavantage à la Perception.' },
      { min: 7, max: 7, titre: 'Mutisme', description: 'Il devient incapable de parler pendant 10 minutes (ni voix, ni incantation verbale).' },
      { min: 8, max: 8, titre: 'Tremblements', description: 'Des tremblements le saisissent : désavantage aux jets d’attaque et de Dextérité pendant 1 minute.' },
      { min: 9, max: 9, titre: 'Idée fixe', description: 'Une obsession le possède (un objet, une personne, une idée) jusqu’au prochain repos long.' },
      { min: 10, max: 10, titre: 'Amnésie temporaire', description: 'Il oublie les dernières heures écoulées jusqu’à ce qu’on l’aide à se souvenir.' }
    ]
  },
  // --------------------------------------------------------------------------
  {
    id: 'table_chaos',
    nom: 'Table du Chaos',
    icone: '🎲',
    description:
      'Effets magiques chaotiques variés, dans l’esprit de la magie sauvage. Idéale pour les zones de magie instable ou les artefacts capricieux.',
    de: 'd20',
    effets: [
      { min: 1, max: 1, titre: 'Pluie de grenouilles', description: 'Des grenouilles inoffensives tombent du ciel sur 6 m pendant 1 round.' },
      { min: 2, max: 2, titre: 'Cheveux changent de couleur', description: 'La couleur de cheveux du lanceur change aléatoirement (permanent jusqu’à dissipation).' },
      { min: 3, max: 3, titre: 'Voix aiguë', description: 'La voix du personnage devient suraiguë pendant 1 heure.' },
      { min: 4, max: 4, titre: 'Téléportation courte', description: 'Le personnage se téléporte à 9 m dans une direction aléatoire.' },
      { min: 5, max: 5, titre: 'Aura lumineuse', description: 'Une lumière vive émane du personnage sur 3 m pendant 1 minute.' },
      { min: 6, max: 6, titre: 'Lévitation', description: 'Le personnage lévite à 1,50 m du sol pendant 1 minute, sans contrôle.' },
      { min: 7, max: 7, titre: 'Doublure illusoire', description: 'Une copie illusoire du personnage apparaît à ses côtés pendant 1 minute.' },
      { min: 8, max: 8, titre: 'Odeur de lavande', description: 'Le personnage dégage un parfum de lavande détectable à 9 m pendant 24 heures.' },
      { min: 9, max: 9, titre: 'Petits objets flottent', description: 'Les objets non fixés dans un rayon de 3 m flottent pendant 1 round.' },
      { min: 10, max: 10, titre: 'Regain de vitalité', description: 'Le personnage récupère 2d4 points de vie.' },
      { min: 11, max: 11, titre: 'Langue inconnue', description: 'Le personnage ne parle plus qu’une langue aléatoire pendant 1 minute.' },
      { min: 12, max: 12, titre: 'Décharge statique', description: 'Toute créature à 1,50 m subit 1 dégât de foudre.' },
      { min: 13, max: 13, titre: 'Champignons', description: 'Des champignons poussent instantanément sous les pieds du personnage.' },
      { min: 14, max: 14, titre: 'Invisibilité capricieuse', description: 'Le personnage devient invisible 1 minute ou jusqu’à ce qu’il attaque.' },
      { min: 15, max: 15, titre: 'Rajeunissement apparent', description: 'Le personnage paraît 10 ans plus jeune pendant 24 heures (cosmétique).' },
      { min: 16, max: 16, titre: 'Brume colorée', description: 'Une brume multicolore inoffensive emplit un cube de 4,50 m pendant 1 minute.' },
      { min: 17, max: 17, titre: 'Familier spontané', description: 'Un petit animal inoffensif apparaît et suit le personnage 1 heure.' },
      { min: 18, max: 18, titre: 'Poids plume', description: 'Le personnage pèse un dixième de son poids pendant 1 minute.' },
      { min: 19, max: 19, titre: 'Écho vocal', description: 'Chaque mot prononcé par le personnage est répété en écho pendant 10 minutes.' },
      { min: 20, max: 20, titre: 'Bénédiction du chaos', description: 'Le personnage gagne un avantage à son prochain jet, au choix.' }
    ]
  },
  // --------------------------------------------------------------------------
  {
    id: 'meteo_magique',
    nom: 'Météo magique',
    icone: '🌩️',
    description:
      'Phénomènes météorologiques surnaturels. À roller en zone de magie sauvage, près d’un nexus élémentaire ou lors d’un rituel raté.',
    de: 'd8',
    effets: [
      { min: 1, max: 1, titre: 'Pluie de cendres', description: 'Une cendre tiède tombe : terrain difficile et désavantage à la Perception visuelle sur la zone.' },
      { min: 2, max: 2, titre: 'Brouillard chuchotant', description: 'Un brouillard murmurant réduit la visibilité à 6 m et trouble la concentration (DD 10).' },
      { min: 3, max: 3, titre: 'Grêle d’ambre', description: 'Des grêlons d’ambre tombent : 1d4 contondant à découvert au début de chaque tour.' },
      { min: 4, max: 4, titre: 'Aurore intérieure', description: 'Des aurores colorées illuminent les lieux : lumière vive, avantage aux jets de moral.' },
      { min: 5, max: 5, titre: 'Vent inversé', description: 'Le vent souffle vers le haut : chutes ralenties, projectiles légers déviés (désavantage à distance).' },
      { min: 6, max: 6, titre: 'Pluie tiède bénie', description: 'Une pluie douce soigne : 1 PV par round aux créatures à découvert pendant 1 minute.' },
      { min: 7, max: 7, titre: 'Orage silencieux', description: 'Des éclairs sans tonnerre zèbrent le ciel : risque de foudre (1d10) sur la plus haute cible.' },
      { min: 8, max: 8, titre: 'Neige chromatique', description: 'Une neige multicolore tombe : chaque flocon donne une émotion aléatoire à qui le touche.' }
    ]
  },
  // --------------------------------------------------------------------------
  {
    id: 'surcharge_arcanique',
    nom: 'Surcharge arcanique',
    icone: '⚡',
    description:
      'Effets de magie instable lorsqu’un lanceur puise trop de puissance. À déclencher sur un échec critique d’incantation ou une surcharge volontaire.',
    de: 'd10',
    effets: [
      { min: 1, max: 1, titre: 'Retour de flamme', description: 'Le lanceur subit 1d6 dégâts de force par niveau du sort lancé.' },
      { min: 2, max: 2, titre: 'Sort amplifié', description: 'Le sort prend effet à un niveau supérieur, mais le lanceur est étourdi 1 round.' },
      { min: 3, max: 3, titre: 'Décharge en chaîne', description: 'Une décharge arcanique frappe toutes les créatures à 3 m pour 1d8 force.' },
      { min: 4, max: 4, titre: 'Emplacement consumé', description: 'Le sort réussit, mais le lanceur perd un emplacement de sort supplémentaire au hasard.' },
      { min: 5, max: 5, titre: 'Anti-magie locale', description: 'Aucune magie ne fonctionne dans un rayon de 6 m pendant 1 round.' },
      { min: 6, max: 6, titre: 'Surcharge mineure', description: 'Le sort réussit normalement, mais des étincelles trahissent le lanceur (désavantage à la discrétion 1 min).' },
      { min: 7, max: 7, titre: 'Vol d’énergie', description: 'Le lanceur récupère un emplacement de sort de niveau 1.' },
      { min: 8, max: 8, titre: 'Brèche planaire', description: 'Une faille s’ouvre : un élémentaire mineur surgit (hostile) pendant 1 minute.' },
      { min: 9, max: 9, titre: 'Écho temporel', description: 'Le sort se relance tout seul au début du prochain tour du lanceur, sans coût.' },
      { min: 10, max: 10, titre: 'Implosion arcanique', description: 'Le lanceur tombe inconscient 1 minute ; à son réveil, tous ses sorts sont rechargés.' }
    ]
  },
  // --------------------------------------------------------------------------
  {
    id: 'benedictions_divines',
    nom: 'Bénédictions divines',
    icone: '🙏',
    description:
      'Effets positifs aléatoires accordés par une divinité, un autel sacré ou un rituel réussi. Récompenses temporaires pour la piété ou le hasard.',
    de: 'd8',
    effets: [
      { min: 1, max: 1, titre: 'Souffle vital', description: 'Le bénéficiaire récupère 2d8 + 4 points de vie.' },
      { min: 2, max: 2, titre: 'Bouclier de foi', description: '+2 à la CA pendant 10 minutes.' },
      { min: 3, max: 3, titre: 'Inspiration sacrée', description: 'Le bénéficiaire gagne un dé d’inspiration (avantage à un jet au choix).' },
      { min: 4, max: 4, titre: 'Purification', description: 'Une maladie, un poison ou une condition mineure est levé.' },
      { min: 5, max: 5, titre: 'Lumière guidante', description: 'Avantage aux jets de Sagesse (Perception et Intuition) pendant 1 heure.' },
      { min: 6, max: 6, titre: 'Vigueur divine', description: 'Immunité à la peur et au charme pendant 1 heure.' },
      { min: 7, max: 7, titre: 'Seconde chance', description: 'La prochaine fois que le bénéficiaire tombe à 0 PV, il reste à 1 PV.' },
      { min: 8, max: 8, titre: 'Faveur des cieux', description: 'Le bénéficiaire relance un jet raté dans l’heure et garde le meilleur résultat.' }
    ]
  },
  // --------------------------------------------------------------------------
  {
    id: 'maledictions',
    nom: 'Malédictions',
    icone: '💀',
    description:
      'Effets négatifs persistants infligés par un objet maudit, un sort de vengeance ou un sanctuaire profané. À lever par dissipation ou quête.',
    de: 'd10',
    effets: [
      { min: 1, max: 1, titre: 'Malchance', description: 'La cible subit un désavantage à un jet de son choix une fois par jour (le MJ déclenche).' },
      { min: 2, max: 2, titre: 'Faiblesse', description: '−2 à une caractéristique au choix du MJ jusqu’à la levée de la malédiction.' },
      { min: 3, max: 3, titre: 'Soif insatiable', description: 'La cible ne récupère que la moitié des PV de soins reçus.' },
      { min: 4, max: 4, titre: 'Marque visible', description: 'Une marque maudite apparaît : désavantage aux interactions sociales.' },
      { min: 5, max: 5, titre: 'Sommeil hanté', description: 'La cible ne profite plus des bienfaits d’un repos long (cauchemars).' },
      { min: 6, max: 6, titre: 'Cupidité', description: 'La cible ne peut se résoudre à abandonner trésors et objets de valeur.' },
      { min: 7, max: 7, titre: 'Poids des fautes', description: 'La vitesse de la cible est réduite de 3 m en permanence.' },
      { min: 8, max: 8, titre: 'Voix discordante', description: 'Les incantations verbales échouent sur 1 sur 1d4.' },
      { min: 9, max: 9, titre: 'Reflet absent', description: 'La cible n’a plus de reflet ni d’ombre : malaise des PNJ superstitieux.' },
      { min: 10, max: 10, titre: 'Malédiction du sang', description: 'À chaque coup critique subi, la cible perd 1d4 PV supplémentaires.' }
    ]
  },
  // --------------------------------------------------------------------------
  {
    id: 'tresors_maudits',
    nom: 'Trésors maudits',
    icone: '🪙',
    description:
      'Objets découverts avec des effets imprévus : tantôt bénis, tantôt piégés. À roller à l’ouverture d’un coffre suspect ou à l’équipement d’un objet inconnu.',
    de: 'd12',
    effets: [
      { min: 1, max: 1, titre: 'Or qui s’évapore', description: 'Les pièces se transforment en feuilles mortes au lever du soleil.' },
      { min: 2, max: 2, titre: 'Anneau collant', description: 'L’objet ne peut plus être retiré sans un sort de Délivrance des malédictions.' },
      { min: 3, max: 3, titre: 'Lame assoiffée', description: 'L’arme inflige +1d4, mais oblige à attaquer la créature la plus proche au début du combat (DD 12).' },
      { min: 4, max: 4, titre: 'Amulette bénie', description: 'L’objet est en réalité béni : +1 aux jets de sauvegarde tant qu’il est porté.' },
      { min: 5, max: 5, titre: 'Murmures', description: 'L’objet murmure des secrets parfois vrais, parfois trompeurs.' },
      { min: 6, max: 6, titre: 'Lourdeur soudaine', description: 'L’objet pèse soudain dix fois son poids une fois ramassé.' },
      { min: 7, max: 7, titre: 'Chance volée', description: 'Le porteur gagne un avantage par jour, mais un allié subit un désavantage.' },
      { min: 8, max: 8, titre: 'Coffre vorace', description: 'Le contenant tente de mordre la main qui l’ouvre : 1d6 perforant (DD 13 Dex pour annuler).' },
      { min: 9, max: 9, titre: 'Joyau espion', description: 'Une entité observe à travers la gemme : le MJ apprend ce que voit le porteur.' },
      { min: 10, max: 10, titre: 'Cadeau sincère', description: 'Aucun piège : un objet magique mineur authentique (potion, parchemin…).' },
      { min: 11, max: 11, titre: 'Dette féerique', description: 'Accepter l’objet scelle un pacte : une faveur sera réclamée plus tard.' },
      { min: 12, max: 12, titre: 'Réplique parfaite', description: 'L’objet est une copie sans valeur, indiscernable sans un examen magique.' }
    ]
  }
]

export const TEMPLATES_TABLES_EFFETS_MAP: Record<string, TableEffetTemplate> =
  TEMPLATES_TABLES_EFFETS.reduce(
    (acc, t) => {
      acc[t.id] = t
      return acc
    },
    {} as Record<string, TableEffetTemplate>
  )
