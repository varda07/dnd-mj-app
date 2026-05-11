// ============================================================================
// Items magiques D&D 5e (SRD) — modèles importables dans la table items.
// Utilisé par /dashboard/items pour pré-remplir / importer des items magiques.
// ============================================================================

export type RareteItem =
  | 'Commun'
  | 'Peu commun'
  | 'Rare'
  | 'Très rare'
  | 'Légendaire'
  | 'Artéfact'

export type TypeItem =
  | 'Arme'
  | 'Armure'
  | 'Bouclier'
  | 'Potion'
  | 'Parchemin'
  | 'Anneau'
  | 'Baguette'
  | 'Bâton'
  | 'Sceptre'
  | 'Objet merveilleux'
  | 'Autre'

export type ItemMagique = {
  nom: string
  nomEn: string
  type: TypeItem
  rarete: RareteItem
  syntonisation?: boolean
  charges?: number // 0 / undefined = pas de charges
  recharge?: string // ex. "1d6+1 à l'aube"
  effets: string[]
  description: string
}

export const ITEMS_DND5E: ItemMagique[] = [
  // =================== POTIONS ===================
  {
    nom: 'Potion de soins',
    nomEn: 'Potion of Healing',
    type: 'Potion',
    rarete: 'Commun',
    effets: ['Régénère 2d4+2 PV en action.'],
    description: "Liquide rouge vif au goût sucré. Boire la fiole en action restaure des PV."
  },
  {
    nom: 'Potion de soins supérieurs',
    nomEn: 'Potion of Greater Healing',
    type: 'Potion',
    rarete: 'Peu commun',
    effets: ['Régénère 4d4+4 PV en action.'],
    description: "Version plus concentrée de la potion de soins ; effervescence dorée."
  },
  {
    nom: 'Potion de soins suprêmes',
    nomEn: 'Potion of Superior Healing',
    type: 'Potion',
    rarete: 'Rare',
    effets: ['Régénère 8d4+8 PV en action.'],
    description: "Reflets dorés, parfum de pollen rare. Restaure les blessures les plus graves."
  },
  {
    nom: "Potion d'invisibilité",
    nomEn: 'Potion of Invisibility',
    type: 'Potion',
    rarete: 'Très rare',
    effets: [
      'Invisibilité pendant 1 heure ou jusqu\'à attaque/sort/concentration brisée.',
      'Tout ce que tu portes ou transportes devient invisible avec toi.'
    ],
    description: "La fiole semble vide jusqu'à être bue. Le buveur disparaît à la vue."
  },
  {
    nom: 'Potion de force de géant des collines',
    nomEn: 'Potion of Hill Giant Strength',
    type: 'Potion',
    rarete: 'Peu commun',
    effets: ['Force passe à 21 pendant 1 heure (si déjà ≥ 21, aucun effet).'],
    description: "Liquide bleuâtre dans une fiole de cristal taillé. Le buveur sent la puissance brute affluer."
  },
  {
    nom: 'Potion de résistance au feu',
    nomEn: 'Potion of Fire Resistance',
    type: 'Potion',
    rarete: 'Peu commun',
    effets: ['Résistance aux dégâts de feu pendant 1 heure.'],
    description: "Liquide orangé qui scintille, semblant abriter une braise."
  },
  {
    nom: 'Potion de vol',
    nomEn: 'Potion of Flying',
    type: 'Potion',
    rarete: 'Très rare',
    effets: ['Vitesse de vol égale à la vitesse au sol pendant 1 heure (vol stationnaire possible).'],
    description: "Bouchon en forme de plume. Le contenu paraît s'élever dans la fiole."
  },

  // =================== PARCHEMINS ===================
  {
    nom: 'Parchemin de boule de feu',
    nomEn: 'Scroll of Fireball',
    type: 'Parchemin',
    rarete: 'Rare',
    effets: [
      'Lance Boule de feu (8d6 dégâts feu, sauvegarde Dex DD 15) sans dépenser d\'emplacement.',
      'Le parchemin disparaît après usage.'
    ],
    description: "Parchemin enroulé scellé d'un sceau de cire rouge. Une chaleur émane du sceau."
  },

  // =================== ARMES ===================
  {
    nom: 'Épée +1',
    nomEn: '+1 Sword',
    type: 'Arme',
    rarete: 'Peu commun',
    effets: ['+1 aux jets d\'attaque et de dégâts.'],
    description: "Lame d'acier finement gravée, légère pour sa taille. Étincelle d'une faible lueur en présence de magie."
  },
  {
    nom: 'Épée +2',
    nomEn: '+2 Sword',
    type: 'Arme',
    rarete: 'Rare',
    effets: ['+2 aux jets d\'attaque et de dégâts.'],
    description: "Pommeau orné d'une gemme bleue. Le métal de la lame est plus pur que l'argent."
  },
  {
    nom: 'Épée vorpaline',
    nomEn: 'Vorpal Sword',
    type: 'Arme',
    rarete: 'Légendaire',
    syntonisation: true,
    effets: [
      '+3 aux jets d\'attaque et de dégâts.',
      'Sur un 20 naturel contre une créature avec une tête, décapitation : la cible meurt instantanément (sauf têtes multiples ou immunité crit).',
      'Ignore la résistance au tranchant.'
    ],
    description: "Lame ancienne d'une finesse irréelle. Elle semble couper l'air lui-même."
  },
  {
    nom: 'Épée de vivacité',
    nomEn: 'Sword of Sharpness',
    type: 'Arme',
    rarete: 'Très rare',
    syntonisation: true,
    effets: [
      'Sur un 20 naturel, double les dés de dégâts.',
      'Sur un 19 ou 20, la cible perd un membre (pied, main, oeil, queue).',
      'En lumière vive, brille comme une torche pendant 30 cm.'
    ],
    description: "Lame ondulée argentée. Affûtée par enchantement à la limite du possible."
  },
  {
    nom: 'Arc long elfique',
    nomEn: 'Elven Bow',
    type: 'Arme',
    rarete: 'Peu commun',
    effets: ['+1 à l\'attaque et aux dégâts à distance.', 'Aucun désavantage en lumière faible.'],
    description: "Bois doré gravé de runes elfiques. La corde semble faite de cheveux d'argent."
  },

  // =================== ARMURES & BOUCLIERS ===================
  {
    nom: 'Plate +2',
    nomEn: '+2 Plate Armor',
    type: 'Armure',
    rarete: 'Très rare',
    effets: ['+2 à la CA par rapport à la plate normale (CA 20 → 22).'],
    description: "Armure de plates polie miroir, gravée de motifs héraldiques d'une cour ancienne."
  },
  {
    nom: 'Bouclier +1',
    nomEn: '+1 Shield',
    type: 'Bouclier',
    rarete: 'Peu commun',
    effets: ['+1 à la CA en plus du bonus du bouclier.'],
    description: "Bouclier rond bordé d'argent, plus léger qu'il ne devrait l'être."
  },
  {
    nom: 'Cape elfique',
    nomEn: 'Cloak of Elvenkind',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    syntonisation: true,
    effets: [
      'Avantage à la Discrétion quand le capuchon est relevé.',
      'Désavantage aux jets pour vous percevoir via la vue.'
    ],
    description: "Tissu changeant aux teintes feuillues, doublure couleur écorce."
  },
  {
    nom: 'Cape de furtivité',
    nomEn: 'Cloak of the Bat',
    type: 'Objet merveilleux',
    rarete: 'Rare',
    syntonisation: true,
    effets: [
      'Avantage à la Discrétion.',
      'Vol 12 m dans l\'obscurité (1 minute, action bonus).',
      "Métamorphose en chauve-souris : action, jusqu'au prochain repos court."
    ],
    description: "Cape noire en peau de chauve-souris. Frissonne légèrement même sans vent."
  },

  // =================== BOTTES ===================
  {
    nom: 'Bottes elfiques',
    nomEn: 'Boots of Elvenkind',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    effets: [
      'Tes pas n\'émettent aucun son, peu importe la surface.',
      'Avantage à la Discrétion basée sur le silence.'
    ],
    description: "Bottes de cuir souple finement cousues de fil d'or."
  },
  {
    nom: 'Bottes de saut',
    nomEn: 'Boots of Striding and Springing',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    syntonisation: true,
    effets: [
      'Vitesse au sol de 9 m (sauf si supérieure).',
      'Distance de saut triplée (mais sans dépasser ta vitesse restante).'
    ],
    description: "Bottes vert-mousse avec une élasticité étrange. Ton pas devient un bond."
  },
  {
    nom: 'Bottes de vitesse',
    nomEn: 'Boots of Speed',
    type: 'Objet merveilleux',
    rarete: 'Rare',
    syntonisation: true,
    charges: 0,
    effets: [
      'Action bonus pour cliquer les talons : vitesse doublée pendant 10 minutes.',
      'Les attaques d\'opportunité contre toi ont le désavantage.',
      'Utilisable jusqu\'à 10 minutes / 24h, scindable en intervalles de 1 min.'
    ],
    description: "Bottes ailées finement gravées d'éclairs. Te font filer comme le vent."
  },

  // =================== ANNEAUX ===================
  {
    nom: 'Anneau de protection',
    nomEn: 'Ring of Protection',
    type: 'Anneau',
    rarete: 'Rare',
    syntonisation: true,
    effets: [
      '+1 à la CA et à toutes les sauvegardes.'
    ],
    description: "Anneau d'argent serti d'une opale laiteuse, bague des veilleurs."
  },
  {
    nom: 'Anneau d\'invisibilité',
    nomEn: 'Ring of Invisibility',
    type: 'Anneau',
    rarete: 'Légendaire',
    syntonisation: true,
    effets: [
      'Invisible en action ; reste invisible jusqu\'à attaque / sort / retrait.',
      'Tes affaires deviennent invisibles avec toi.'
    ],
    description: "Anneau d'or terni. La gemme semble manquer mais on devine une absence."
  },
  {
    nom: 'Anneau de résistance au feu',
    nomEn: 'Ring of Fire Resistance',
    type: 'Anneau',
    rarete: 'Rare',
    syntonisation: true,
    effets: ['Résistance aux dégâts de feu.'],
    description: "Bague faite d'un alliage rouge sombre, tiède au toucher."
  },
  {
    nom: 'Anneau de saut',
    nomEn: 'Ring of Jumping',
    type: 'Anneau',
    rarete: 'Peu commun',
    syntonisation: true,
    effets: ['Tu peux lancer Saut sur toi-même à volonté (action bonus).'],
    description: "Bague de cuivre verdi, motif de criquet en relief."
  },

  // =================== BAGUETTES ===================
  {
    nom: 'Baguette de boules de feu',
    nomEn: 'Wand of Fireballs',
    type: 'Baguette',
    rarete: 'Rare',
    syntonisation: true,
    charges: 7,
    recharge: '1d6+1 à l\'aube',
    effets: [
      'Dépense 1 charge pour Boule de feu (8d6, sauvegarde Dex DD 15) niveau 3.',
      'Dépense supplémentaire (jusqu\'à 7) pour monter d\'un niveau d\'emplacement par charge.',
      "Si la dernière charge est dépensée et qu'on jette un 1 sur 1d20 : la baguette se consume en cendres."
    ],
    description: "Baguette de chêne brûlé, cerclée de runes ardentes."
  },
  {
    nom: 'Baguette de détection magique',
    nomEn: 'Wand of Magic Detection',
    type: 'Baguette',
    rarete: 'Peu commun',
    charges: 3,
    recharge: '1d3 à l\'aube',
    effets: ['Dépense 1 charge pour Détection de la magie sans composante.'],
    description: "Petite baguette d'argent qui pulse légèrement près d'un effet magique."
  },
  {
    nom: 'Baguette de polymorphe',
    nomEn: 'Wand of Polymorph',
    type: 'Baguette',
    rarete: 'Très rare',
    syntonisation: true,
    charges: 7,
    recharge: '1d4+3 à l\'aube',
    effets: ['Dépense 1 charge pour Polymorphe (sauvegarde Sag DD 15).'],
    description: "Baguette tordue couverte de motifs animaux changeants."
  },
  {
    nom: 'Baguette de projectiles magiques',
    nomEn: 'Wand of Magic Missiles',
    type: 'Baguette',
    rarete: 'Peu commun',
    charges: 7,
    recharge: '1d6+1 à l\'aube',
    effets: ['Dépense 1 charge pour Projectile magique (1 charge = niv 1, jusqu\'à 7 = niv 7).'],
    description: "Baguette d'argent gravée d'étoiles. Quand on l'agite, des étincelles luisent."
  },

  // =================== BÂTONS ===================
  {
    nom: 'Bâton de feu',
    nomEn: 'Staff of Fire',
    type: 'Bâton',
    rarete: 'Très rare',
    syntonisation: true,
    charges: 10,
    recharge: '1d6+4 à l\'aube',
    effets: [
      'Résistance aux dégâts de feu.',
      "Charges : Mains brûlantes (1), Mur de feu (4), Boule de feu (3)."
    ],
    description: "Bâton de bois calciné qui dégage une chaleur sèche."
  },
  {
    nom: 'Bâton de soin',
    nomEn: 'Staff of Healing',
    type: 'Bâton',
    rarete: 'Rare',
    syntonisation: true,
    charges: 10,
    recharge: '1d6+4 à l\'aube',
    effets: [
      'Charges : Soins (1 / niveau 1+), Soins de masse (5), Restauration mineure (2).',
      "Si la dernière charge est dépensée et qu'on jette un 1 sur 1d20 : le bâton disparaît en lumière."
    ],
    description: "Bâton d'aubépine clair, sertis de fleurs blanches en argent."
  },
  {
    nom: 'Bâton de tonnerre',
    nomEn: 'Staff of Thunder and Lightning',
    type: 'Bâton',
    rarete: 'Très rare',
    syntonisation: true,
    effets: [
      '+2 à l\'attaque et aux dégâts au corps à corps.',
      'Pouvoirs (chacun 1/jour) : Éclair (9d6 foudre), Tonnerre, Coup tonnant (+2d6 tonnerre), Éclair lié, Tempête.'
    ],
    description: "Bâton d'argent et d'ébène. La pointe crépite parfois quand l'orage approche."
  },

  // =================== OBJETS MERVEILLEUX ===================
  {
    nom: 'Sac sans fond',
    nomEn: 'Bag of Holding',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    effets: [
      'Contient jusqu\'à 250 kg / 1,9 m³ peu importe l\'extérieur.',
      'Pèse 7 kg quel que soit le contenu.',
      "Mettre dans un autre espace extra-dimensionnel risque une déchirure planaire."
    ],
    description: "Sac de toile usée et patiné. À l'intérieur, l'espace est plus vaste qu'il n'y paraît."
  },
  {
    nom: 'Corde magique',
    nomEn: 'Rope of Climbing',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    effets: [
      'Corde de soie de 18 m. Sur ordre, s\'élance dans n\'importe quelle direction et s\'attache.',
      'Soulève jusqu\'à 1500 kg sans rompre.'
    ],
    description: "Corde de soie blanche qui s'enroule comme une couleuvre obéissante."
  },
  {
    nom: 'Heaume de télépathie',
    nomEn: 'Helm of Telepathy',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    syntonisation: true,
    effets: [
      'Connais Détection des pensées (sauvegarde Sag DD 13). Recharge à l\'aube.',
      'Communication télépathique avec une créature dans 30 m, dans une langue commune.'
    ],
    description: "Heaume d'argent serti d'une améthyste. Un murmure émane parfois de l'intérieur."
  },
  {
    nom: 'Pierre d\'aiguisage',
    nomEn: 'Whetstone of Sharpness',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    effets: [
      'Affûte une arme tranchante en 1 heure : +1 aux dégâts pour 24 heures.',
      'Une seule arme à la fois.'
    ],
    description: "Pierre noire striée de filaments d'argent."
  },
  {
    nom: 'Tapis volant',
    nomEn: 'Carpet of Flying',
    type: 'Objet merveilleux',
    rarete: 'Très rare',
    effets: [
      'Vitesse de vol 12 m, charge 250 kg.',
      'Ordres mentaux : montée/descente/cap.',
      "Plus chargé : vol divisé par 2 au-delà de la moitié de la capacité."
    ],
    description: "Tapis aux motifs sarrasins dorés. S'élève à hauteur de cheville quand on prononce le mot d'éveil."
  },
  {
    nom: 'Cor de héros',
    nomEn: 'Horn of Valhalla',
    type: 'Objet merveilleux',
    rarete: 'Rare',
    syntonisation: true,
    effets: [
      'Action : convoquer des berserkers spectraux (variante argent : 2-3 guerriers, 1 fois/jour).',
      "Les guerriers obéissent à tes ordres pendant 1 heure puis disparaissent."
    ],
    description: "Cor d'argent gravé de glyphes nordiques. Un appel grave réveille les guerriers tombés."
  },
  {
    nom: 'Amulette de protection',
    nomEn: 'Amulet of Protection',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    syntonisation: true,
    effets: [
      'Avantage à toutes les sauvegardes contre les sorts et autres effets magiques.'
    ],
    description: "Médaillon d'argent à motif d'œil ouvert. Tiède contre la peau."
  },
  {
    nom: 'Perles de force',
    nomEn: 'Pearl of Power',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    syntonisation: true,
    charges: 1,
    recharge: '1 par jour',
    effets: [
      "Action : récupère un emplacement de sort de niveau 3 ou inférieur (1/jour)."
    ],
    description: "Petite perle nacrée portant une lumière interne pulsante."
  },

  // =================== ARMES MAGIQUES SUPPLÉMENTAIRES ===================
  {
    nom: 'Hache vorpaline',
    nomEn: 'Vorpal Axe',
    type: 'Arme',
    rarete: 'Légendaire',
    syntonisation: true,
    effets: [
      '+3 attaque/dégâts.',
      "Sur un 20 naturel : décapitation (sauf têtes multiples ou immunité critique).",
      'Ignore la résistance au tranchant.'
    ],
    description: "Variante hache de la lame vorpaline. Tranche dans le métal et l'os comme dans le beurre."
  },
  {
    nom: 'Marteau de tonnerre',
    nomEn: 'Thunderhammer',
    type: 'Arme',
    rarete: 'Très rare',
    syntonisation: true,
    charges: 5,
    recharge: '1d4+1 à l\'aube',
    effets: [
      '+2 attaque/dégâts au corps à corps.',
      'Dépense 1 charge sur un coup : +2d6 dégâts tonnerre, sauvegarde Force DD 16 ou repoussée 3 m.',
      'Charges (1 chacune) : Tonnerre (3 charges → niv 3).'
    ],
    description: "Marteau de guerre de granit chargé d'éclairs. Frappe avec un boom de foudre."
  },
  {
    nom: 'Lance d\'éclair',
    nomEn: 'Lightning Lance',
    type: 'Arme',
    rarete: 'Rare',
    syntonisation: true,
    charges: 4,
    recharge: '1d4 à l\'aube',
    effets: [
      '+1 attaque/dégâts.',
      "Dépense 1 charge en attaque : la lance projette un éclair (3d6 foudre, ligne 18 m, sauvegarde Dex DD 14)."
    ],
    description: "Pointe de mithril cerclée d'éclairs. Crépite quand l'orage approche."
  },
  {
    nom: 'Arc de la chasse',
    nomEn: 'Bow of the Hunter',
    type: 'Arme',
    rarete: 'Peu commun',
    syntonisation: true,
    effets: [
      "+1 attaque/dégâts à distance.",
      'Donne le don Pisteur : avantage aux jets de Survie pour pister les bêtes / monstres.',
      'Marque sur cible : flèche tirée en action bonus marque la cible (avantage la suivante).'
    ],
    description: "Arc d'if sombre incrusté d'os de cerf. Vibre faiblement face à une bête."
  },
  {
    nom: 'Dague d\'ombre',
    nomEn: 'Shadow Dagger',
    type: 'Arme',
    rarete: 'Rare',
    syntonisation: true,
    effets: [
      '+1 attaque/dégâts.',
      'Action bonus : devient invisible jusqu\'à attaquer ou parler (max 1 min, recharge repos court).',
      'Coup en pénombre : +1d6 dégâts nécrotiques.'
    ],
    description: "Lame courte de verre noir. Absorbe la lumière qui l'atteint."
  },
  {
    nom: 'Cimeterre des ombres',
    nomEn: 'Shadow Scimitar',
    type: 'Arme',
    rarete: 'Très rare',
    syntonisation: true,
    effets: [
      '+2 attaque/dégâts.',
      'En pénombre ou obscurité : double les dégâts critiques et avantage aux attaques.'
    ],
    description: "Lame courbe noire qui semble engloutir la lumière. Forgée dans le Plan des Ombres."
  },
  {
    nom: 'Masse divine',
    nomEn: 'Mace of Disruption',
    type: 'Arme',
    rarete: 'Rare',
    syntonisation: true,
    effets: [
      '+1 attaque/dégâts.',
      'Contre mort-vivant ou fiélon : +2d6 dégâts radiants. Si tombe à 0 PV, sauvegarde Sag DD 15 ou désintégrée.',
      'Émet une lumière vive sur 6 m en présence d\'un mort-vivant.'
    ],
    description: "Masse d'argent gravée de prières célestes. Les mort-vivants la fuient."
  },
  {
    nom: 'Bâton de mage',
    nomEn: 'Staff of the Magi',
    type: 'Bâton',
    rarete: 'Légendaire',
    syntonisation: true,
    charges: 50,
    recharge: '4d6+2 à l\'aube',
    effets: [
      '+2 attaque/dégâts au corps à corps, +2 jets et DD de sort.',
      'Absorbe les sorts : sauvegarde réussie → +1 charge (jusqu\'à 50). Sinon, dépense de charges pour lancer Boule de feu, Mur de feu, Désintégration, Téléportation, etc.',
      'Briser le bâton : libère l\'énergie de toutes les charges en explosion (8 dégâts/charge, sauvegarde Dex DD 17).'
    ],
    description: "Bâton noir poli, l'arme ultime des archimages. Réceptacle d'énergies cosmiques."
  },

  // =================== ARMURES SUPPLÉMENTAIRES ===================
  {
    nom: 'Plate étincelante',
    nomEn: 'Glamoured Plate',
    type: 'Armure',
    rarete: 'Très rare',
    syntonisation: true,
    effets: [
      'CA équivalente à plate magique +1.',
      'Action bonus : altère son apparence (vêtement de cour, robe, autre armure) — l\'illusion ne résiste pas au toucher.'
    ],
    description: "Armure dorée gravée de motifs solaires. Brille faiblement à la lumière."
  },
  {
    nom: 'Cuirasse de dragon',
    nomEn: 'Dragon Scale Mail',
    type: 'Armure',
    rarete: 'Très rare',
    syntonisation: true,
    effets: [
      'CA 14 + mod Dex (max 2), CA bonus +1.',
      'Avantage aux sauvegardes contre l\'effroi des dragons.',
      "Résistance à un type de dégâts élémentaire (selon couleur du dragon)."
    ],
    description: "Écailles de dragon tannées et liées. Couleur correspond à l'ascendance draconique."
  },
  {
    nom: 'Cape de résistance',
    nomEn: 'Cloak of Resistance',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    syntonisation: true,
    effets: ['+1 à toutes les sauvegardes.'],
    description: "Cape de tissu sombre brodée de runes protectrices."
  },
  {
    nom: "Robe de l'archimage",
    nomEn: 'Robe of the Archmagi',
    type: 'Objet merveilleux',
    rarete: 'Légendaire',
    syntonisation: true,
    effets: [
      'CA 15 + mod Dex (sans armure).',
      'Avantage aux sauvegardes contre les sorts et autres effets magiques.',
      '+2 au DD de sauvegarde de tes sorts et à tes jets d\'attaque magique.'
    ],
    description: "Robe blanche, grise ou noire selon l'alignement. Tient ses promesses aux maîtres absolus de la magie."
  },

  // =================== BIJOUX ===================
  {
    nom: 'Anneau de feu',
    nomEn: 'Ring of Elemental Command (Fire)',
    type: 'Anneau',
    rarete: 'Légendaire',
    syntonisation: true,
    charges: 5,
    recharge: '1d4+1 à l\'aube',
    effets: [
      'Immunité aux dégâts de feu.',
      'Sorts (par charges) : Mains brûlantes (1), Boule de feu (3), Mur de feu (4).',
      'Domine les élémentaires de feu de FP ≤ 5 (Cha sauvegarde).'
    ],
    description: "Anneau de rubis serti dans un or rouge. Tiède au doigt, brûlant en main d'élémentaliste."
  },
  {
    nom: 'Anneau de polymorphe',
    nomEn: 'Ring of Shapechanging',
    type: 'Anneau',
    rarete: 'Très rare',
    syntonisation: true,
    charges: 3,
    recharge: '1d3 à l\'aube',
    effets: ['Action : Polymorphe (1 charge), comme le sort. Sauvegarde Sag DD 15.'],
    description: "Anneau d'argent serti d'une opale changeante."
  },
  {
    nom: 'Anneau de régénération',
    nomEn: 'Ring of Regeneration',
    type: 'Anneau',
    rarete: 'Très rare',
    syntonisation: true,
    effets: [
      'Régénère 1d6 PV toutes les 10 minutes (si tu as au moins 1 PV).',
      'Régénère un membre tranché en 1d6+1 jours.'
    ],
    description: "Anneau de jade pâle traversé de veines or. Pulsation lente comme un battement de cœur."
  },
  {
    nom: 'Anneau de l\'élémentaire',
    nomEn: 'Ring of Elemental Command',
    type: 'Anneau',
    rarete: 'Légendaire',
    syntonisation: true,
    effets: [
      'Variante par élément (Air/Eau/Feu/Terre).',
      'Pouvoirs croissants à mesure que tu tues des élémentaires de ce type.',
      'Domine les élémentaires de l\'élément choisi de FP ≤ 5.'
    ],
    description: "Anneau de matériau élémentaire pur. Choisit le porteur autant que l'inverse."
  },
  {
    nom: 'Amulette de santé',
    nomEn: 'Amulet of Health',
    type: 'Objet merveilleux',
    rarete: 'Rare',
    syntonisation: true,
    effets: ['Constitution = 19 (si déjà ≥ 19, aucun effet).'],
    description: "Médaillon en bronze doré, gravé d'un symbole de Méditation."
  },
  {
    nom: 'Amulette des plans',
    nomEn: 'Amulet of the Planes',
    type: 'Objet merveilleux',
    rarete: 'Très rare',
    syntonisation: true,
    effets: [
      'Action : nommer un plan d\'existence connu et faire un test d\'Intelligence DD 15.',
      'Réussite : Voyage planaire vers ce plan. Échec : transport sur un plan aléatoire.'
    ],
    description: "Talisman fait de cinq cercles imbriqués. Bourdonne près d'un portail."
  },
  {
    nom: 'Bracelets de défense',
    nomEn: 'Bracers of Defense',
    type: 'Objet merveilleux',
    rarete: 'Rare',
    syntonisation: true,
    effets: ['+2 CA quand tu ne portes ni armure ni bouclier.'],
    description: "Bracelets de cuir gravé de runes runiques de protection."
  },

  // =================== POTIONS ===================
  {
    nom: 'Potion d\'héroïsme',
    nomEn: 'Potion of Heroism',
    type: 'Potion',
    rarete: 'Rare',
    effets: [
      '10 PV temporaires pendant 1 heure.',
      'Bénédiction (effet de Bénédiction sans concentration) pendant la même durée.'
    ],
    description: "Liquide ambré qui mousse en bouche. Inspire courage et clameur."
  },
  {
    nom: 'Potion de gigantisme',
    nomEn: 'Potion of Growth',
    type: 'Potion',
    rarete: 'Peu commun',
    effets: [
      'Effet d\'Agrandir (de Agrandir/Rapetisser) pendant 1d4 heures.',
      'Avantage aux jets et tests de Force, dégâts d\'arme +1d4.'
    ],
    description: "Liquide bleu qui semble enfler dans la fiole."
  },
  {
    nom: 'Potion de vitesse',
    nomEn: 'Potion of Speed',
    type: 'Potion',
    rarete: 'Très rare',
    effets: [
      'Effet de Hâte (sans concentration) pendant 1 minute.',
      'Pas de torpeur à l\'arrêt.'
    ],
    description: "Liquide jaune crépitant d'éclairs internes. À avaler d'un trait."
  },
  {
    nom: 'Potion de polymorphe',
    nomEn: 'Potion of Polymorph',
    type: 'Potion',
    rarete: 'Très rare',
    effets: ['Polymorphe (sauvegarde Sag DD 15) pendant 1 heure.'],
    description: "Liquide irisé qui change de teinte quand on regarde la fiole."
  },
  {
    nom: 'Potion de résistance',
    nomEn: 'Potion of Resistance',
    type: 'Potion',
    rarete: 'Peu commun',
    effets: ['Résistance à un type de dégâts (acide/froid/feu/foudre/poison/etc.) pendant 1 heure.'],
    description: "Variantes par couleur selon le dégât résisté."
  },
  {
    nom: 'Potion d\'amitié animale',
    nomEn: 'Potion of Animal Friendship',
    type: 'Potion',
    rarete: 'Peu commun',
    effets: ['Effet d\'Amitié animale (sauvegarde Sag DD 13) pendant 1 heure ; jusqu\'à 3 bêtes.'],
    description: "Liquide laiteux flottant des morceaux de plante. Goût de prairie."
  },

  // =================== ITEMS UTILITAIRES ===================
  {
    nom: 'Cape étoilée',
    nomEn: 'Cloak of Stars',
    type: 'Objet merveilleux',
    rarete: 'Très rare',
    syntonisation: true,
    charges: 6,
    recharge: '1d6 à l\'aube',
    effets: [
      'Avantage aux jets de Discrétion la nuit ou en faible lumière.',
      'Charges : lance Étoile filante (1 charge → 4d10 force, sauvegarde Dex DD 16).'
    ],
    description: "Cape noire constellée de points lumineux qui tournent comme un ciel nocturne."
  },
  {
    nom: 'Bottes des sept lieues',
    nomEn: 'Boots of Seven League Stride',
    type: 'Objet merveilleux',
    rarete: 'Rare',
    syntonisation: true,
    charges: 1,
    recharge: '1 par jour',
    effets: [
      "Action : grand pas — téléporte jusqu'à 11 km vers une destination visible ou connue (1/jour).",
      'Si tu as déjà visité l\'endroit, pas de jet ; sinon Intelligence DD 13.'
    ],
    description: "Bottes de cuir foulé d'innombrables routes. Chaque pas couvre des lieues."
  },
  {
    nom: 'Pelle infatigable',
    nomEn: 'Tireless Shovel',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    effets: [
      "Creuse à la vitesse d'un creuseur professionnel sans fatiguer son porteur.",
      "Détecte les structures dissimulées dans la terre dans 6 m."
    ],
    description: "Pelle d'acier brune au manche d'if. Vibre quand quelque chose est enterré."
  },
  {
    nom: 'Lampe à huile éternelle',
    nomEn: 'Driftglobe',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    effets: [
      'Émet de la lumière comme une torche tant qu\'elle est allumée — sans consommer d\'huile.',
      "Mot de commande : flotte à hauteur d'épaule (1/jour) et suit le porteur."
    ],
    description: "Lampe en cristal qui contient une flamme dorée immortelle."
  },
  {
    nom: 'Sac de farine fée',
    nomEn: 'Dust of Disappearance',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    effets: [
      'Saupoudrer une cible : invisible 2d4 minutes (l\'invisibilité tient même après attaque/sort).'
    ],
    description: "Sachet de poudre argentée chatoyante. Fait disparaître ce qu'elle touche."
  },

  // =================== OBJETS MERVEILLEUX AVANCÉS ===================
  {
    nom: 'Boule de cristal',
    nomEn: 'Crystal Ball',
    type: 'Objet merveilleux',
    rarete: 'Très rare',
    syntonisation: true,
    effets: [
      'Lance Scrutation (sauvegarde Sag DD 17) en action.',
      'Variantes (légendaires) : lecture des pensées, télépathie, vraie vue.'
    ],
    description: "Sphère de cristal limpide. Reflète des images d'ailleurs quand on s'y plonge."
  },
  {
    nom: 'Œil de la spire',
    nomEn: 'Eyes of Charming',
    type: 'Objet merveilleux',
    rarete: 'Peu commun',
    syntonisation: true,
    charges: 3,
    recharge: '1 par jour',
    effets: ['Action (1 charge) : Charme-personne (sauvegarde Sag DD 13).'],
    description: "Paire de lentilles d'ambre. Donne au regard un éclat hypnotique."
  },
  {
    nom: 'Pierre philosophale',
    nomEn: 'Philosopher\'s Stone',
    type: 'Objet merveilleux',
    rarete: 'Légendaire',
    effets: [
      'Transmute le plomb en or (1 kg / jour).',
      'Restaure 1d4 années perdues par vieillissement magique.',
      'Composante d\'élixir de longévité.'
    ],
    description: "Pierre rouge sang aux veines dorées. Le rêve de tout alchimiste."
  },
  {
    nom: 'Pioche du nain',
    nomEn: 'Hammer of the Dwarvish Lords',
    type: 'Objet merveilleux',
    rarete: 'Légendaire',
    syntonisation: true,
    effets: [
      'Pioche +3 (combat).',
      'Détecte les filons précieux dans 18 m.',
      'Création de gemme : 1/semaine, transforme un bloc de pierre en gemme de 100 po.'
    ],
    description: "Marteau-pioche en mithril runique des hauts forgerons nains."
  },
  {
    nom: 'Marteau du géant',
    nomEn: 'Maul of the Titans',
    type: 'Arme',
    rarete: 'Très rare',
    syntonisation: true,
    effets: [
      '+2 attaque/dégâts.',
      'Contre objets et constructions : double les dégâts.',
      'Frappe sismique (1/repos long) : sauvegarde Force DD 17 dans un cône de 9 m, ou bousculée et 4d6 contondants.'
    ],
    description: "Massue de fer noir grosse comme un tronc. Brisera murs et titans."
  },
  {
    nom: 'Canne d\'invocation',
    nomEn: 'Wand of Conjuration',
    type: 'Baguette',
    rarete: 'Rare',
    syntonisation: true,
    charges: 7,
    recharge: '1d6+1 à l\'aube',
    effets: [
      'Charges : Invoquer un familier (1), Invoquer un élémentaire mineur (3), Porte dimensionnelle (4).'
    ],
    description: "Baguette d'os spiralé sertie de gemmes mauves."
  },

  // =================== LÉGENDAIRES UNIQUES ===================
  {
    nom: 'Lame du Roi',
    nomEn: 'Blade of the King',
    type: 'Arme',
    rarete: 'Légendaire',
    syntonisation: true,
    effets: [
      '+3 attaque/dégâts.',
      'Émet une lumière vive sur 6 m, faible sur 6 m supplémentaires (mot de commande).',
      'Reconnaît son porteur légitime : seul un héritier vrai peut la dégainer.',
      'Frappe les créatures du chaos : +2d6 radiant contre les fiélons et morts-vivants.'
    ],
    description: "Épée légendaire des rois justes. Lame d'argent runique, garde sertie d'opales."
  },
  {
    nom: 'Couronne de gloire',
    nomEn: 'Crown of Glory',
    type: 'Objet merveilleux',
    rarete: 'Légendaire',
    syntonisation: true,
    charges: 1,
    recharge: '1 par jour',
    effets: [
      'Action : aura royale 9 m. Les créatures de Cha < 13 (sauvegarde Cha DD 18) sont charmées 1 minute.',
      'Inspire le respect : avantage aux jets de Persuasion contre les nobles.'
    ],
    description: "Couronne d'or pur sertie de pierres précieuses. Brille d'une lumière intérieure."
  },
  {
    nom: 'Sceptre de domination',
    nomEn: 'Rod of Rulership',
    type: 'Sceptre',
    rarete: 'Rare',
    syntonisation: true,
    charges: 1,
    recharge: '1 par jour',
    effets: [
      'Action : commande de domination dans 36 m. Sauvegarde Sag DD 15 ou la cible obéit pendant 8 heures.',
      "L'influence dure jusqu'à la première action manifestement contraire à ses intérêts."
    ],
    description: "Sceptre d'or massif coiffé d'un orbe d'améthyste. Symbole de tyrannie ou de souveraineté."
  },

  // =================== ARMES MAGIQUES +N ===================
  { nom: 'Hache +1', nomEn: 'Battleaxe +1', type: 'Arme', rarete: 'Peu commun', effets: ['+1 au toucher et aux dégâts.'], description: "Lame d'acier nain finement ouvragée, gravée d'une rune de tranchant." },
  { nom: 'Hache +2', nomEn: 'Battleaxe +2', type: 'Arme', rarete: 'Rare', effets: ['+2 au toucher et aux dégâts.'], description: "Tranchant clair comme un miroir, le métal semble murmurer au combat." },
  { nom: 'Hache +3', nomEn: 'Battleaxe +3', type: 'Arme', rarete: 'Très rare', effets: ['+3 au toucher et aux dégâts.'], description: "Forgée par un mythril rune-runique des forges céladdines." },
  { nom: 'Lance +1', nomEn: 'Spear +1', type: 'Arme', rarete: 'Peu commun', effets: ['+1 au toucher et aux dégâts.', 'Lancée : revient en main à la fin du tour.'], description: "Hampe en frêne argenté, pointe en acier dragonné." },
  { nom: 'Lance +2', nomEn: 'Spear +2', type: 'Arme', rarete: 'Rare', effets: ['+2 au toucher et aux dégâts.', 'Lancée : revient en main à la fin du tour.'], description: "Pointe étoilée qui scintille même dans l'obscurité." },
  { nom: 'Marteau +1', nomEn: 'Warhammer +1', type: 'Arme', rarete: 'Peu commun', effets: ['+1 au toucher et aux dégâts.'], description: "Lourd marteau forgé par les Maîtres des Forges." },
  { nom: 'Marteau +2', nomEn: 'Warhammer +2', type: 'Arme', rarete: 'Rare', effets: ['+2 au toucher et aux dégâts.', 'Une fois par jour, peut frapper avec 2d6 dégâts de tonnerre additionnels.'], description: "Tête runique gravée du mot 'Whelm'." },
  { nom: 'Dague +1', nomEn: 'Dagger +1', type: 'Arme', rarete: 'Peu commun', effets: ['+1 au toucher et aux dégâts.', 'Finesse, lancer 6/18 m.'], description: "Lame fine en acier des elfes du crépuscule." },
  { nom: 'Dague +2', nomEn: 'Dagger +2', type: 'Arme', rarete: 'Rare', effets: ['+2 au toucher et aux dégâts.', 'Finesse, lancer 6/18 m.'], description: "Pommeau d'obsidienne, la lame brille faiblement quand un ennemi approche." },
  { nom: 'Arc long +1', nomEn: 'Longbow +1', type: 'Arme', rarete: 'Peu commun', effets: ['+1 au toucher et aux dégâts.', 'Portée 45/180 m.'], description: "Arc d'if patiné, corde tressée de soie elfique." },
  { nom: 'Arc long +2', nomEn: 'Longbow +2', type: 'Arme', rarete: 'Rare', effets: ['+2 au toucher et aux dégâts.', 'Portée 45/180 m.'], description: "Bois sculpté de fleurs en filigrane d'or fin." },
  { nom: 'Arbalète lourde +1', nomEn: 'Heavy Crossbow +1', type: 'Arme', rarete: 'Peu commun', effets: ['+1 au toucher et aux dégâts.', 'Charge instantanée une fois par tour.'], description: "Mécanisme d'horlogerie nain, frappe sèche et précise." },
  { nom: 'Épée flamboyante', nomEn: 'Flame Tongue', type: 'Arme', rarete: 'Rare', syntonisation: true, effets: ['Lame s\'embrase en action bonus.', '+2d6 dégâts de feu sur attaque réussie quand enflammée.', 'Émet une lumière vive sur 12 m, faible sur 12 m supplémentaires.'], description: "Lame de bronze rougeoyant, naît dans le feu d'une forge volcanique." },
  { nom: 'Épée givrée', nomEn: 'Frost Brand', type: 'Arme', rarete: 'Très rare', syntonisation: true, effets: ['+1d6 dégâts de froid sur attaque réussie.', 'Résistance au feu pendant la syntonisation.', "Émet une lumière froide bleutée à proximité d'un feu."], description: "Acier bleuté ciselé de runes glaciales, ne fond jamais." },
  { nom: 'Épée foudroyante', nomEn: 'Sword of Lightning', type: 'Arme', rarete: 'Rare', syntonisation: true, charges: 5, recharge: '1d4+1 à l\'aube', effets: ['+2 au toucher et aux dégâts.', 'Dépense 1 charge pour ajouter 4d6 dégâts de foudre.'], description: "La lame s'illumine d'arcs électriques quand on la tire." },
  { nom: 'Lame des éclairs', nomEn: 'Lightning Blade', type: 'Arme', rarete: 'Très rare', syntonisation: true, effets: ['+2 au toucher et aux dégâts.', 'Action : appel d\'éclair (ligne 9 m × 1,50 m, Dex DD 15, 5d8 foudre).', 'Recharge à l\'aube.'], description: "Lame forgée dans un nuage d'orage. Crépite en permanence." },
  { nom: 'Bâton du mage', nomEn: 'Staff of the Magi', type: 'Bâton', rarete: 'Légendaire', syntonisation: true, charges: 50, recharge: '4d6+2 à l\'aube', effets: ['+2 au toucher et aux jets de sortilèges.', 'Absorption de sortilège (réaction) : annule un sort ciblé et regagne des charges égales au niveau.', 'Permet de lancer Boule de feu, Foudre, Mur de feu, Détection de la magie, Dissipation, Lévitation, Projection astrale et bien d\'autres.', 'Action : détruire le bâton = Souffle des Arcanes (40 m de rayon, dégâts de force, mort possible).'], description: "Bâton noir gravé d'étoiles tournoyantes — l'archétype du mage légendaire." },
  { nom: 'Bâton de défense', nomEn: 'Staff of Defense', type: 'Bâton', rarete: 'Très rare', syntonisation: true, charges: 6, recharge: '1d6+4 à l\'aube', effets: ['+1 CA.', 'Permet de lancer Bouclier (1 charge), Armure de mage (2 charges) ou Sanctuaire (1 charge).'], description: "Bâton de bois clair gravé de cercles concentriques de protection." },

  // =================== ARMURES MAGIQUES ===================
  { nom: 'Cuir +1', nomEn: 'Leather Armor +1', type: 'Armure', rarete: 'Rare', effets: ['+1 CA.'], description: "Cuir tanné par un maître artisan, souple comme une seconde peau." },
  { nom: 'Cuir +2', nomEn: 'Leather Armor +2', type: 'Armure', rarete: 'Très rare', effets: ['+2 CA.'], description: "Cuir runique, semble respirer au rythme du porteur." },
  { nom: 'Mailles +1', nomEn: 'Chain Mail +1', type: 'Armure', rarete: 'Rare', effets: ['+1 CA.'], description: "Maille d'acier de Cormyr, tintement clair et rassurant." },
  { nom: 'Mailles +2', nomEn: 'Chain Mail +2', type: 'Armure', rarete: 'Très rare', effets: ['+2 CA.'], description: "Maillons forgés selon des techniques naines perdues." },
  { nom: 'Écailles +1', nomEn: 'Scale Mail +1', type: 'Armure', rarete: 'Rare', effets: ['+1 CA.'], description: "Écailles de carapace dragonne montées sur cuir." },
  { nom: 'Demi-plates +1', nomEn: 'Half Plate +1', type: 'Armure', rarete: 'Rare', effets: ['+1 CA.'], description: "Plastron et jambières gravés des armoiries d'une maison oubliée." },
  { nom: 'Plate +1', nomEn: 'Plate Armor +1', type: 'Armure', rarete: 'Rare', effets: ['+1 CA.'], description: "Plate complète polie comme un miroir, lourdes pièces magnifiquement articulées." },
  { nom: 'Plate +3', nomEn: 'Plate Armor +3', type: 'Armure', rarete: 'Légendaire', effets: ['+3 CA.'], description: "Œuvre d'un maître-forge légendaire, pratiquement indestructible." },
  {
    nom: "Armure de l'invisibilité", nomEn: 'Armor of Invisibility', type: 'Armure', rarete: 'Légendaire', syntonisation: true,
    effets: ['Action : devient invisible (le porteur + l\'armure) jusqu\'à attaque ou sort lancé.', 'Une fois par jour.'],
    description: "Plate aux contours estompés, semble se fondre dans l'air ambiant."
  },
  {
    nom: 'Plate du dragon', nomEn: 'Dragon Scale Armor', type: 'Armure', rarete: 'Très rare', syntonisation: true,
    effets: ['+1 CA, avantage aux jets contre la Présence terrifiante des dragons.', 'Résistance au type de dégâts du dragon dont sont issues les écailles.', 'Action (1/jour) : détecte tous les dragons à 9 km, jusqu\'à 1 minute.'],
    description: "Armure forgée à partir des écailles d'un dragon de couleur — résonne avec la lignée draconique."
  },
  {
    nom: 'Armure démoniaque', nomEn: 'Demon Armor', type: 'Armure', rarete: 'Très rare', syntonisation: true,
    effets: ['+1 CA, charisme +1.', 'Griffes naturelles : 1d8 tranchant + 1d8 nécrotique.', 'Malédiction : impossible de retirer l\'armure sans Délivrance des malédictions ; au repos long, jet Sag DD 17 ou tendance s\'aligne sur Chaotique Mauvais.'],
    description: "Plate noire hérissée de pointes, faces démoniaques hurlent silencieusement sur le plastron."
  },
  {
    nom: 'Cuir des ombres', nomEn: 'Shadow Leather', type: 'Armure', rarete: 'Rare', syntonisation: true,
    effets: ['+1 CA.', 'Avantage aux tests de Discrétion dans la pénombre ou l\'obscurité.', "Action : déplacement de 9 m d'ombre en ombre (1/repos court)."],
    description: "Cuir noir absorbant la lumière, brodé de fils tirés d'une cape de la Pénombre."
  },

  // =================== POTIONS SUPPLÉMENTAIRES ===================
  { nom: 'Potion de force', nomEn: 'Potion of Giant Strength (Stone)', type: 'Potion', rarete: 'Rare', effets: ['Force 23 pendant 1 heure.'], description: "Liquide gris semblable à du mortier, donne la puissance d'un géant de pierre." },
  { nom: 'Potion d\'invisibilité (petite)', nomEn: 'Potion of Invisibility (Lesser)', type: 'Potion', rarete: 'Peu commun', effets: ['Invisibilité 10 minutes (action requise pour boire).'], description: "Version mineure ; fiole transparente qui semble vide." },
  { nom: 'Potion de communication avec les morts', nomEn: 'Potion of Speak with Dead', type: 'Potion', rarete: 'Peu commun', effets: ['Permet de lancer Communication avec les morts sur un cadavre touché.'], description: "Liquide noir qui réfléchit son propre passé." },
  { nom: 'Potion de gaz', nomEn: 'Potion of Gaseous Form', type: 'Potion', rarete: 'Rare', effets: ['Le buveur prend forme gazeuse pendant 1 heure (comme le sort).'], description: "Bulles tourbillonnant dans une fiole de cristal — semble peser plus léger que l\'air." },
  { nom: "Potion d'amitié des géants", nomEn: 'Potion of Giant Friendship', type: 'Potion', rarete: 'Très rare', effets: ['Charme les géants à portée de vue pendant 1 heure (Sag DD 15 pour résister).'], description: "Liquide ambré, parfum de granit et de pin." },

  // =================== BIJOUX & AMULETTES ===================
  {
    nom: 'Anneau de la protection mentale', nomEn: 'Ring of Mind Shielding', type: 'Anneau', rarete: 'Peu commun', syntonisation: true,
    effets: ['Immunise contre la lecture des pensées et la communication télépathique non consentie.', 'Détection de l\'alignement échoue.', 'Si le porteur meurt en portant l\'anneau, son âme peut y résider.'],
    description: "Anneau d'argent gravé d'une spirale fermée."
  },
  {
    nom: 'Anneau de l\'élargissement', nomEn: 'Ring of Enlarge', type: 'Anneau', rarete: 'Peu commun', syntonisation: true, charges: 3, recharge: '1d3 à l\'aube',
    effets: ['Action (1 charge) : Agrandissement (taille +1) pendant 1 minute.'],
    description: "Anneau s'étend visiblement quand activé."
  },
  {
    nom: 'Amulette de la nature', nomEn: 'Amulet of Nature', type: 'Objet merveilleux', rarete: 'Rare', syntonisation: true,
    effets: ['Avantage aux tests de Nature et Survie.', 'Communique avec les animaux comme par le sort Communication avec les bêtes (à volonté).'],
    description: "Médaillon en bois flotté incrusté d'une feuille de chêne dorée."
  },

  // =================== BAGUETTES SUPPLÉMENTAIRES ===================
  {
    nom: 'Baguette d\'éclairs', nomEn: 'Wand of Lightning Bolts', type: 'Baguette', rarete: 'Rare', syntonisation: true, charges: 7, recharge: '1d6+1 à l\'aube',
    effets: ['Action (1-7 charges) : Foudre (5d6 + 1d6 par charge supplémentaire, jusqu\'à 7 charges).'],
    description: "Baguette de cristal traversée d'arcs bleus crépitants."
  },
  {
    nom: 'Baguette de paralysie', nomEn: 'Wand of Paralysis', type: 'Baguette', rarete: 'Rare', syntonisation: true, charges: 7, recharge: '1d6+1 à l\'aube',
    effets: ['Action (1 charge) : projette un rayon paralysant, cible Con DD 15 ou paralysée 1 minute.'],
    description: "Baguette d'os blanc gravée de motifs squelettiques."
  },
  {
    nom: 'Baguette de soins de masse', nomEn: 'Wand of Mass Healing', type: 'Baguette', rarete: 'Très rare', syntonisation: true, charges: 5, recharge: '1d4+1 à l\'aube',
    effets: ['Action (3 charges) : Soins de masse (jusqu\'à 6 créatures à 18 m, chacune regagne 3d8+5 PV).'],
    description: "Bois clair veiné d'or, dégage une chaleur apaisante."
  },

  // =================== LÉGENDAIRES & ARTÉFACTS ===================
  {
    nom: 'Œil de Vecna', nomEn: 'Eye of Vecna', type: 'Objet merveilleux', rarete: 'Artéfact', syntonisation: true,
    effets: [
      'Remplace l\'œil du porteur. Vision dans le noir 36 m, voit l\'invisible et à travers les illusions.',
      'À volonté : Détection de la magie, Vision véritable.',
      '1/jour : Souhait (mais Vecna peut corrompre le souhait).',
      'Malédiction : tendance s\'aligne sur Vecna ; voix murmurante 24/7.'
    ],
    description: "Œil tatoué d'écailles parcheminées — celui de l\'archi-liche Vecna, arraché à son orbite."
  },
  {
    nom: 'Main de Vecna', nomEn: 'Hand of Vecna', type: 'Objet merveilleux', rarete: 'Artéfact', syntonisation: true,
    effets: [
      'Remplace une main du porteur. Force 20, +1 au toucher et aux dégâts au corps à corps.',
      'Attaque : 1d8 nécrotique + drain de niveau (Con DD 18 ou -1 niveau effectif).',
      '1/jour : Frappe de mort (cible doit réussir Con DD 18 ou tombe à 0 PV).',
      'Malédiction : la tendance s\'aligne sur Vecna ; la main complotera contre son propriétaire.'
    ],
    description: "Main momifiée et noire — celle de Vecna lui-même, palpitant d'un pouls funeste."
  },
  {
    nom: 'Sphère d\'annihilation', nomEn: 'Sphere of Annihilation', type: 'Objet merveilleux', rarete: 'Légendaire', syntonisation: true,
    effets: [
      'Globe noir de 60 cm, plan de la non-existence.',
      "Mouvement par contrôle mental (Int DD 25), 1d8 × 1,50 m.",
      'Toute matière entrant en contact subit 4d10 dégâts de force par mètre cube. Pas de jet de sauvegarde.'
    ],
    description: "Trou noir parfaitement sphérique, absorbe lumière et matière. Détruite uniquement par téléportation dans un autre plan."
  },
  {
    nom: 'Talisman du pur bien', nomEn: 'Talisman of Pure Good', type: 'Objet merveilleux', rarete: 'Légendaire', syntonisation: true,
    effets: [
      '+2 aux jets d\'attaque et de sauvegarde.',
      'À volonté : peut faire chuter une créature mauvaise dans une fissure d\'énergie radiante (Dex DD 20 ou destruction).',
      'Le porteur doit être d\'alignement Bon, sinon subit 6d6 radiants par jour.'
    ],
    description: "Pendentif platine en forme de soleil rayonnant, brûlant à la main d\'un être mauvais."
  }
]

// Helpers
export const TYPES_ITEM: TypeItem[] = [
  'Arme', 'Armure', 'Bouclier', 'Potion', 'Parchemin', 'Anneau',
  'Baguette', 'Bâton', 'Sceptre', 'Objet merveilleux', 'Autre'
]

export const RARETES_ITEM: RareteItem[] = [
  'Commun', 'Peu commun', 'Rare', 'Très rare', 'Légendaire', 'Artéfact'
]

const RARETE_ORDRE: Record<RareteItem, number> = {
  'Commun': 0,
  'Peu commun': 1,
  'Rare': 2,
  'Très rare': 3,
  'Légendaire': 4,
  'Artéfact': 5
}

export const compareRarete = (a: RareteItem, b: RareteItem): number =>
  RARETE_ORDRE[a] - RARETE_ORDRE[b]

// Construit la description longue à insérer dans `items.description`.
export const itemDescription = (item: ItemMagique): string => {
  const parts: string[] = []
  parts.push(item.description)
  if (item.effets.length > 0) {
    parts.push('')
    parts.push('Effets :')
    for (const e of item.effets) parts.push(`  • ${e}`)
  }
  if (item.charges) {
    parts.push('')
    parts.push(`Charges : ${item.charges}${item.recharge ? ` (recharge : ${item.recharge})` : ''}`)
  }
  if (item.syntonisation) {
    parts.push('')
    parts.push('⚙ Syntonisation requise')
  }
  return parts.join('\n')
}

// Construit la ligne items à insérer.
export const itemMagiqueVersItem = (item: ItemMagique, mj_id: string) => ({
  mj_id,
  nom: item.nom,
  description: itemDescription(item),
  type: item.type,
  rarete: item.rarete,
  scenario_id: null,
  personnage_id: null,
  image_url: null
})
