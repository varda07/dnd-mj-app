// ============================================================================
// Templates de PNJ — points de départ génériques pour le MJ.
// Utilisé par /dashboard/pnj pour pré-remplir/importer des PNJ-types courants.
// ============================================================================

export type CategoriePnj =
  | 'Commerce'
  | 'Société'
  | 'Loi'
  | 'Hors-la-loi'
  | 'Aventuriers'
  | 'Religion'
  | 'Autres'

export type AttaqueSimple = {
  nom: string
  bonus: string // ex. "+3"
  degats: string // ex. "1d4+1 perforant"
}

export type PnjTemplate = {
  nom: string // Nom générique, ex. "Marchand"
  nomEn: string
  categorie: CategoriePnj
  description: string
  personnalite: string // Personnalité-type, ton du PNJ
  hp_max: number
  ca: number
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
  attaques: AttaqueSimple[]
  hooks: string[] // Idées de quêtes / accroches narratives pour le MJ
}

export const CATEGORIES_PNJ: CategoriePnj[] = [
  'Commerce',
  'Société',
  'Loi',
  'Hors-la-loi',
  'Aventuriers',
  'Religion',
  'Autres'
]

export const PNJ_TEMPLATES: PnjTemplate[] = [
  // ============== COMMERCE ==============
  {
    nom: 'Marchand',
    nomEn: 'Merchant',
    categorie: 'Commerce',
    description: "Commerçant itinérant ou installé, vend des biens variés (tissus, épices, bibelots).",
    personnalite: "Affable mais retors. Connaît tout le monde, marchande sur tout, tient un livre de comptes minutieux.",
    hp_max: 12, ca: 11, force: 10, dexterite: 11, constitution: 11, intelligence: 13, sagesse: 12, charisme: 14,
    attaques: [{ nom: 'Dague', bonus: '+2', degats: '1d4 perforant' }],
    hooks: [
      "A reçu une cargaison étrange — qui la veut absolument ?",
      "Doit de l'argent à un usurier, cherche des protecteurs.",
      "Connaît un secret commercial qu'il échange contre un service."
    ]
  },
  {
    nom: 'Aubergiste',
    nomEn: 'Innkeeper',
    categorie: 'Commerce',
    description: "Tient une auberge à la croisée des chemins. Sert chambres, chopes et ragots.",
    personnalite: "Joviale en façade, observatrice en privé. Mémorise chaque visage qui passe la porte.",
    hp_max: 14, ca: 11, force: 12, dexterite: 10, constitution: 14, intelligence: 11, sagesse: 13, charisme: 13,
    attaques: [{ nom: 'Gourdin sous le comptoir', bonus: '+3', degats: '1d4+1 contondant' }],
    hooks: [
      "Un client n'est pas redescendu depuis trois jours.",
      "Reçoit un visiteur encapuchonné chaque pleine lune.",
      "Cherche un homme de main pour disperser une bande de soûlards."
    ]
  },
  {
    nom: 'Forgeron',
    nomEn: 'Blacksmith',
    categorie: 'Commerce',
    description: "Bras massifs, tablier de cuir brûlé. Forge armes, outils et serrures.",
    personnalite: "Bourru et taciturne. S'anime quand on parle métal. Méprise les armes mal entretenues.",
    hp_max: 22, ca: 12, force: 17, dexterite: 11, constitution: 15, intelligence: 11, sagesse: 12, charisme: 9,
    attaques: [{ nom: 'Marteau de forge', bonus: '+5', degats: '1d6+3 contondant' }],
    hooks: [
      "Demande à récupérer un minerai rare dans une mine abandonnée.",
      "A reforgé une arme ancestrale — refuse de dire à qui elle appartient.",
      "Sa fille a disparu. Il n'a pas porté l'épée depuis 20 ans, mais…"
    ]
  },
  {
    nom: 'Apothicaire',
    nomEn: 'Apothecary',
    categorie: 'Commerce',
    description: "Vend potions, herbes médicinales et baumes. Peut préparer des poisons en privé.",
    personnalite: "Précis, méthodique, parfois condescendant. Sait écouter sans poser de questions.",
    hp_max: 11, ca: 11, force: 9, dexterite: 12, constitution: 11, intelligence: 16, sagesse: 14, charisme: 11,
    attaques: [{ nom: 'Bâton', bonus: '+1', degats: '1d6 contondant' }],
    hooks: [
      "Cherche une plante rare dans un marais.",
      "Soupçonne une fausse alchimiste de copier ses recettes.",
      "Vend un poison — pour qui, vraiment ?"
    ]
  },
  {
    nom: 'Bibliothécaire',
    nomEn: 'Librarian',
    categorie: 'Commerce',
    description: "Gardienne d'une collection de livres et grimoires. Connaît la valeur de chaque page.",
    personnalite: "Discrète, érudite, susceptible. Hait la poussière et les mains sales.",
    hp_max: 11, ca: 10, force: 8, dexterite: 11, constitution: 11, intelligence: 17, sagesse: 14, charisme: 11,
    attaques: [{ nom: 'Coupe-papier', bonus: '+0', degats: '1 perforant' }],
    hooks: [
      "Un manuscrit a été volé — son grimoire de jeunesse.",
      "Cherche à déchiffrer une langue ancienne et offre un savoir en échange.",
      "Suspecte qu'une page a été remplacée par une fausse."
    ]
  },
  {
    nom: 'Marchand d\'esclaves',
    nomEn: 'Slaver',
    categorie: 'Commerce',
    description: "Trafique des êtres vivants. Souvent toléré par les autorités locales corrompues.",
    personnalite: "Cynique, glacial, calculateur. Voit chaque être comme une marchandise.",
    hp_max: 30, ca: 14, force: 13, dexterite: 14, constitution: 13, intelligence: 12, sagesse: 11, charisme: 13,
    attaques: [
      { nom: 'Cimeterre', bonus: '+4', degats: '1d6+2 tranchant' },
      { nom: 'Fouet', bonus: '+4', degats: '1d4+2 tranchant (allonge 3 m)' }
    ],
    hooks: [
      "Cherche à \"acquérir\" une cible spécifique.",
      "Une cargaison s'est échappée — il offre une prime au retour.",
      "Doit un service à un noble et a besoin d'aide pour le rembourser en sang."
    ]
  },

  // ============== SOCIÉTÉ ==============
  {
    nom: 'Noble',
    nomEn: 'Noble',
    categorie: 'Société',
    description: "Aristocrate de cour ou de campagne. Maintient son rang par tradition et intrigues.",
    personnalite: "Hautain, élégant, bien éduqué. Méprise les manières rustres mais sait flatter qui sert ses fins.",
    hp_max: 18, ca: 15, force: 11, dexterite: 12, constitution: 11, intelligence: 12, sagesse: 14, charisme: 16,
    attaques: [{ nom: 'Rapière', bonus: '+3', degats: '1d8+1 perforant' }],
    hooks: [
      "Cherche à écarter un rival politique.",
      "A perdu un objet de famille au jeu et doit le récupérer en secret.",
      "Reçoit des lettres de chantage — par qui ?"
    ]
  },
  {
    nom: 'Roi / Reine',
    nomEn: 'Monarch',
    categorie: 'Société',
    description: "Souverain d'un royaume. Couronne lourde, conseillers nombreux, ennemis innombrables.",
    personnalite: "Solitaire malgré la cour. Cherche un cercle de confiance restreint. Méfiance permanente.",
    hp_max: 30, ca: 16, force: 13, dexterite: 11, constitution: 13, intelligence: 14, sagesse: 15, charisme: 18,
    attaques: [{ nom: 'Épée d\'apparat', bonus: '+4', degats: '1d8+1 tranchant' }],
    hooks: [
      "Soupçonne un membre de sa cour de comploter.",
      "Prépare une succession — qui héritera ?",
      "Cherche une relique de couronnement disparue."
    ]
  },
  {
    nom: 'Conseiller',
    nomEn: 'Royal Advisor',
    categorie: 'Société',
    description: "Voix dans l'oreille du souverain. Plume, sceau, savoir.",
    personnalite: "Subtil, patient, énigmatique. Ne donne jamais de réponse droite.",
    hp_max: 16, ca: 12, force: 10, dexterite: 11, constitution: 11, intelligence: 17, sagesse: 16, charisme: 15,
    attaques: [{ nom: 'Dague', bonus: '+2', degats: '1d4 perforant' }],
    hooks: [
      "A besoin d'agents discrets pour une affaire sensible.",
      "Soupçonne la trahison d'un autre membre du conseil.",
      "Cherche à manipuler les héros pour servir ses propres fins."
    ]
  },
  {
    nom: 'Chambellan',
    nomEn: 'Chamberlain',
    categorie: 'Société',
    description: "Maître de cérémonie et chef du personnel d'un palais ou d'un manoir.",
    personnalite: "Méticuleux jusqu'à l'absurde. Son protocole est la mesure de toute chose.",
    hp_max: 14, ca: 13, force: 10, dexterite: 12, constitution: 11, intelligence: 14, sagesse: 14, charisme: 13,
    attaques: [{ nom: 'Canne', bonus: '+1', degats: '1d6 contondant' }],
    hooks: [
      "Recherche un protocole oublié dans les archives.",
      "Tente de cacher un scandale impliquant un membre de la famille.",
      "Soupçonne une intrigue chez les domestiques."
    ]
  },
  {
    nom: 'Hérault',
    nomEn: 'Herald',
    categorie: 'Société',
    description: "Annonce, lit les proclamations, transporte les messages royaux. Parle fort et clair.",
    personnalite: "Solennel et théâtral. Adore les grandes phrases.",
    hp_max: 16, ca: 13, force: 11, dexterite: 13, constitution: 11, intelligence: 12, sagesse: 12, charisme: 16,
    attaques: [{ nom: 'Épée courte', bonus: '+3', degats: '1d6+1 perforant' }],
    hooks: [
      "Doit livrer un message vital au-delà de territoires hostiles.",
      "Connaît une rumeur explosive qu'il n'ose pas annoncer.",
      "Cherche un témoin pour authentifier un édit royal contesté."
    ]
  },
  {
    nom: 'Baron',
    nomEn: 'Baron',
    categorie: 'Société',
    description: "Petit seigneur sur un domaine rural ou une ville mineure. Justicier et taxateur.",
    personnalite: "Fier de son fief, jaloux des grands seigneurs. Hospitalier sous condition.",
    hp_max: 25, ca: 16, force: 14, dexterite: 12, constitution: 13, intelligence: 11, sagesse: 12, charisme: 13,
    attaques: [{ nom: 'Épée longue', bonus: '+4', degats: '1d8+2 tranchant' }],
    hooks: [
      "Sa frontière est attaquée par des bêtes (ou des bandits).",
      "Une famille rivale conteste sa lignée.",
      "A signé un pacte qu'il regrette amèrement."
    ]
  },

  // ============== LOI ==============
  {
    nom: 'Garde de ville',
    nomEn: 'City Guard',
    categorie: 'Loi',
    description: "Soldat municipal à la solde du conseil ou du baron. Patrouille de jour et de nuit.",
    personnalite: "Ferme mais fatigué. Connaît bien le quartier. Accepte parfois un pot-de-vin.",
    hp_max: 11, ca: 16, force: 13, dexterite: 12, constitution: 12, intelligence: 10, sagesse: 11, charisme: 10,
    attaques: [{ nom: 'Lance', bonus: '+3', degats: '1d6+1 perforant' }],
    hooks: [
      "A vu quelque chose qu'il ne devait pas voir.",
      "Soupçonne un collègue d'être corrompu.",
      "Cherche à protéger un témoin avant un procès."
    ]
  },
  {
    nom: 'Capitaine de la garde',
    nomEn: 'Guard Captain',
    categorie: 'Loi',
    description: "Commande la milice ou la garde de la ville. Politique autant que militaire.",
    personnalite: "Discipline avant tout. Loyale au seigneur, mais lasse de la corruption locale.",
    hp_max: 65, ca: 17, force: 15, dexterite: 14, constitution: 14, intelligence: 12, sagesse: 13, charisme: 14,
    attaques: [
      { nom: 'Épée longue', bonus: '+5', degats: '1d8+3 tranchant' },
      { nom: 'Arbalète lourde', bonus: '+4', degats: '1d10+2 perforant' }
    ],
    hooks: [
      "Un meurtrier a échappé deux fois aux patrouilles.",
      "Doit gérer une émeute sans verser de sang.",
      "Soupçonne le bourreau d'aider une bande à fuir."
    ]
  },
  {
    nom: 'Juge',
    nomEn: 'Magistrate',
    categorie: 'Loi',
    description: "Tranche les affaires civiles et criminelles. Robe écarlate, sceau et parchemins.",
    personnalite: "Impassible et soigneuse. Préfère la justice à l'émotion.",
    hp_max: 16, ca: 11, force: 9, dexterite: 11, constitution: 11, intelligence: 16, sagesse: 17, charisme: 14,
    attaques: [{ nom: 'Bâton de justice', bonus: '+0', degats: '1d6 contondant' }],
    hooks: [
      "Reçoit des menaces avant un grand procès.",
      "Cherche un témoin clé qui s'est évanoui.",
      "Soupçonne qu'un dossier a été falsifié."
    ]
  },
  {
    nom: 'Bourreau',
    nomEn: 'Executioner',
    categorie: 'Loi',
    description: "Capuche noire, hache. Exécute les condamnés sur ordre judiciaire.",
    personnalite: "Silencieux. Boit beaucoup en privé. Ne se mêle pas aux autres.",
    hp_max: 32, ca: 13, force: 16, dexterite: 11, constitution: 14, intelligence: 9, sagesse: 11, charisme: 8,
    attaques: [{ nom: 'Hache à deux mains', bonus: '+5', degats: '1d12+3 tranchant' }],
    hooks: [
      "Sait quelque chose sur la condamnation suivante.",
      "Cache un condamné qu'il n'a pas exécuté.",
      "Cherche à se racheter en aidant un innocent."
    ]
  },
  {
    nom: 'Chasseur de primes',
    nomEn: 'Bounty Hunter',
    categorie: 'Loi',
    description: "Mercenaire spécialisé dans la traque de fugitifs et de monstres. Tarifs élevés.",
    personnalite: "Calme et observateur. Loyal à son contrat plus qu'à la justice.",
    hp_max: 33, ca: 15, force: 13, dexterite: 16, constitution: 13, intelligence: 12, sagesse: 14, charisme: 11,
    attaques: [
      { nom: 'Arbalète lourde', bonus: '+5', degats: '1d10+3 perforant' },
      { nom: 'Épée courte', bonus: '+5', degats: '1d6+3 perforant' }
    ],
    hooks: [
      "Traque la même cible que les héros.",
      "Cherche à recruter pour une chasse difficile.",
      "Refuse une prime qu'il considère injuste."
    ]
  },

  // ============== HORS-LA-LOI ==============
  {
    nom: 'Voleur',
    nomEn: 'Thief',
    categorie: 'Hors-la-loi',
    description: "Pickpocket, monte-en-l'air, casseur de serrures. Travaille seul ou en bande.",
    personnalite: "Vif, méfiant, charmeur. Connaît tous les toits du quartier.",
    hp_max: 18, ca: 13, force: 10, dexterite: 16, constitution: 11, intelligence: 12, sagesse: 11, charisme: 12,
    attaques: [
      { nom: 'Dague', bonus: '+5', degats: '1d4+3 perforant' },
      { nom: 'Attaque sournoise', bonus: '+5', degats: '+2d6 si surprise/allié à proximité' }
    ],
    hooks: [
      "Veut monter un coup et cherche complices.",
      "Cherche à se ranger après un dernier vol.",
      "Doit livrer un objet volé à un commanditaire mystérieux."
    ]
  },
  {
    nom: 'Assassin',
    nomEn: 'Assassin',
    categorie: 'Hors-la-loi',
    description: "Tueur professionnel. Souvent membre d'une guilde — ou ex-membre.",
    personnalite: "Glacial, méthodique. Code d'honneur strict (ou supposé tel).",
    hp_max: 78, ca: 15, force: 11, dexterite: 16, constitution: 14, intelligence: 13, sagesse: 11, charisme: 10,
    attaques: [
      { nom: 'Épée courte (poison)', bonus: '+6', degats: '1d6+3 perforant + 4d6 poison' },
      { nom: 'Arbalète légère (poison)', bonus: '+6', degats: '1d8+3 perforant + 4d6 poison' }
    ],
    hooks: [
      "A reçu un contrat sur l'un des héros.",
      "Veut quitter sa guilde — ils ne le laisseront pas.",
      "Refuse un contrat ; cherche protecteurs contre la guilde."
    ]
  },
  {
    nom: 'Contrebandier',
    nomEn: 'Smuggler',
    categorie: 'Hors-la-loi',
    description: "Transporte illicitement marchandises, drogues ou personnes. Connaît passages secrets et marées.",
    personnalite: "Pragmatique, confiant en ses réseaux. Méfiant des étrangers.",
    hp_max: 22, ca: 14, force: 12, dexterite: 14, constitution: 13, intelligence: 12, sagesse: 12, charisme: 13,
    attaques: [
      { nom: 'Cimeterre', bonus: '+4', degats: '1d6+2 tranchant' },
      { nom: 'Arbalète légère', bonus: '+4', degats: '1d8+2 perforant' }
    ],
    hooks: [
      "Cherche un passeur fiable pour une cargaison sensible.",
      "Trahit son maître, demande la protection des héros.",
      "Connaît un passage secret essentiel à l'intrigue."
    ]
  },
  {
    nom: 'Mendiant',
    nomEn: 'Beggar',
    categorie: 'Hors-la-loi',
    description: "Sans-toit qui survit dans les rues. Souvent membre invisible d'un réseau d'informateurs.",
    personnalite: "Humble en façade, rusé en privé. Voit et entend tout.",
    hp_max: 6, ca: 10, force: 8, dexterite: 11, constitution: 10, intelligence: 11, sagesse: 13, charisme: 9,
    attaques: [{ nom: 'Coup de poing', bonus: '+0', degats: '1 contondant' }],
    hooks: [
      "Sait qui est entré dans tel manoir cette nuit.",
      "Cherche désespérément un guérisseur pour un proche malade.",
      "A trouvé un objet précieux abandonné dans une ruelle."
    ]
  },
  {
    nom: 'Pickpocket',
    nomEn: 'Pickpocket',
    categorie: 'Hors-la-loi',
    description: "Spécialiste des bourses sur les places de marché. Doigts agiles, sourire d'enfant.",
    personnalite: "Bavard, distrayant, opportuniste. Travaille en duo avec un complice qui distrait.",
    hp_max: 11, ca: 13, force: 9, dexterite: 16, constitution: 10, intelligence: 12, sagesse: 11, charisme: 13,
    attaques: [{ nom: 'Dague', bonus: '+5', degats: '1d4+3 perforant' }],
    hooks: [
      "A volé sans le savoir un objet maudit ou recherché.",
      "Demande l'aide des héros contre un proxénète.",
      "Identifie un faux marchand qui escroque le quartier."
    ]
  },
  {
    nom: 'Chef de gang',
    nomEn: 'Gang Boss',
    categorie: 'Hors-la-loi',
    description: "Tête d'une faction criminelle de quartier. Contrôle des rues, des bordels ou des docks.",
    personnalite: "Charismatique et brutal. Loyauté à son équipe, sang-froid en négociation.",
    hp_max: 65, ca: 15, force: 15, dexterite: 16, constitution: 14, intelligence: 14, sagesse: 11, charisme: 15,
    attaques: [
      { nom: 'Cimeterre', bonus: '+5', degats: '1d6+3 tranchant' },
      { nom: 'Arbalète de poing', bonus: '+5', degats: '1d6+3 perforant' }
    ],
    hooks: [
      "Une autre bande empiète sur son territoire.",
      "Cherche à passer un marché avec les héros contre un pire ennemi.",
      "Tient en otage un proche d'un PJ."
    ]
  },

  // ============== AVENTURIERS ==============
  {
    nom: 'Mercenaire',
    nomEn: 'Mercenary',
    categorie: 'Aventuriers',
    description: "Soldat à la solde du plus offrant. Cicatrices, équipement éclectique.",
    personnalite: "Pragmatique. Loyauté = bourse. Mais code interne sur ce qu'il refuse de faire.",
    hp_max: 32, ca: 16, force: 14, dexterite: 12, constitution: 14, intelligence: 10, sagesse: 11, charisme: 10,
    attaques: [
      { nom: 'Épée longue', bonus: '+4', degats: '1d8+2 tranchant' },
      { nom: 'Arc court', bonus: '+3', degats: '1d6+1 perforant' }
    ],
    hooks: [
      "Cherche un nouveau contrat.",
      "Connaît la vraie identité d'un employeur précédent.",
      "Refuse de retourner sur un champ de bataille hanté."
    ]
  },
  {
    nom: 'Vétéran',
    nomEn: 'Veteran',
    categorie: 'Aventuriers',
    description: "Soldat aguerri retiré ou en mission. Cicatrices et regard distant.",
    personnalite: "Stoïque, économe en paroles. Boit pour oublier — ou pour ne pas oublier.",
    hp_max: 58, ca: 17, force: 16, dexterite: 13, constitution: 14, intelligence: 10, sagesse: 11, charisme: 10,
    attaques: [
      { nom: 'Épée longue', bonus: '+5', degats: '1d8+3 tranchant' },
      { nom: 'Arbalète lourde', bonus: '+3', degats: '1d10+1 perforant' }
    ],
    hooks: [
      "Reconnaît un ennemi de sa vieille guerre dans la foule.",
      "Recherche le corps d'un compagnon tombé.",
      "Refuse une mission — cherche à dissuader les héros."
    ]
  },
  {
    nom: 'Explorateur',
    nomEn: 'Pathfinder',
    categorie: 'Aventuriers',
    description: "Cartographe et éclaireur. Endurance, sens de l'orientation, inventaire de cartes.",
    personnalite: "Curieux et indépendant. Aime la solitude des grands espaces.",
    hp_max: 24, ca: 14, force: 12, dexterite: 16, constitution: 13, intelligence: 13, sagesse: 15, charisme: 11,
    attaques: [
      { nom: 'Arc long', bonus: '+5', degats: '1d8+3 perforant' },
      { nom: 'Épée courte', bonus: '+5', degats: '1d6+3 perforant' }
    ],
    hooks: [
      "Vend une carte d'un endroit que personne ne croit réel.",
      "Cherche un compagnon pour traverser une région hostile.",
      "Découvre des ruines inconnues mais a peur d'y retourner seul."
    ]
  },
  {
    nom: 'Chasseur de monstres',
    nomEn: 'Monster Hunter',
    categorie: 'Aventuriers',
    description: "Spécialiste de la traque des créatures. Lourdement équipé, méthodique.",
    personnalite: "Obsessionnel, compétent, isolé socialement. Perdu hors de la chasse.",
    hp_max: 45, ca: 15, force: 14, dexterite: 14, constitution: 13, intelligence: 13, sagesse: 14, charisme: 10,
    attaques: [
      { nom: 'Argentine + flèche', bonus: '+5', degats: '1d8+2 perforant + bonus contre fiélon/mort-vivant' }
    ],
    hooks: [
      "Une bête a échappé à sa traque — elle approche du village.",
      "Cherche un guide vers une zone où il a entendu parler d'une créature légendaire.",
      "Refuse l'aide… puis revient blessé, désespéré."
    ]
  },
  {
    nom: 'Pillard de tombes',
    nomEn: 'Tomb Raider',
    categorie: 'Aventuriers',
    description: "Aventurier-archéologue à l'éthique douteuse. Sait désamorcer les pièges.",
    personnalite: "Cynique, drôle, peu loyal. Plus motivé par l'or que par la science.",
    hp_max: 25, ca: 14, force: 12, dexterite: 16, constitution: 12, intelligence: 14, sagesse: 11, charisme: 13,
    attaques: [
      { nom: 'Rapière', bonus: '+5', degats: '1d8+3 perforant' },
      { nom: 'Arbalète de poing', bonus: '+5', degats: '1d6+3 perforant' }
    ],
    hooks: [
      "Prétend connaître une crypte intacte à plusieurs jours de marche.",
      "Cherche à échapper à une malédiction posée par sa dernière fouille.",
      "A perdu un compagnon dans un piège — refuse d'en parler."
    ]
  },

  // ============== RELIGION ==============
  {
    nom: 'Prêtre',
    nomEn: 'Priest',
    categorie: 'Religion',
    description: "Officiant d'un temple ou itinérant. Soigne, prêche, conseille.",
    personnalite: "Bienveillant et patient. Convaincu de sa foi mais ouvert au doute des autres.",
    hp_max: 27, ca: 13, force: 10, dexterite: 10, constitution: 12, intelligence: 13, sagesse: 16, charisme: 13,
    attaques: [{ nom: 'Masse', bonus: '+2', degats: '1d6 contondant' }],
    hooks: [
      "Reçoit des visions troublantes.",
      "Cherche une relique disparue de son temple.",
      "Doit traverser des terres profanes pour livrer un message divin."
    ]
  },
  {
    nom: 'Moine',
    nomEn: 'Monk',
    categorie: 'Religion',
    description: "Adepte d'un ordre spirituel. Vie ascétique, discipline du corps et de l'esprit.",
    personnalite: "Calme, observateur, parfois énigmatique. Réponses en koan.",
    hp_max: 39, ca: 16, force: 13, dexterite: 16, constitution: 14, intelligence: 11, sagesse: 16, charisme: 11,
    attaques: [
      { nom: 'Coup à mains nues', bonus: '+5', degats: '1d6+3 contondant (deux attaques)' }
    ],
    hooks: [
      "Cherche son maître disparu.",
      "Garde secrètement un disciple proscrit.",
      "Reçoit un signe d'une puissance ancienne — il doit voyager."
    ]
  },
  {
    nom: 'Inquisiteur',
    nomEn: 'Inquisitor',
    categorie: 'Religion',
    description: "Religieux mandaté par l'ordre pour traquer hérétiques et démons. Robe sombre, sceau d'or.",
    personnalite: "Rigide, brûlant d'une foi inflexible. Méfiance envers la magie profane.",
    hp_max: 45, ca: 16, force: 13, dexterite: 12, constitution: 14, intelligence: 14, sagesse: 16, charisme: 13,
    attaques: [
      { nom: 'Épée longue', bonus: '+5', degats: '1d8+3 tranchant' },
      { nom: 'Sorts cléricaux', bonus: '+5', degats: 'variable selon sort (Flamme sacrée, etc.)' }
    ],
    hooks: [
      "Soupçonne l'un des héros d'un péché grave.",
      "Recherche un démon caché dans la ville.",
      "Cherche à brûler un livre que les héros considèrent sacré."
    ]
  },
  {
    nom: 'Cultiste',
    nomEn: 'Cultist',
    categorie: 'Religion',
    description: "Adepte d'un dieu ou démon mineur. Robe sombre, rituels secrets.",
    personnalite: "Fanatique mais maladroit. Cite des prophéties à tort et à travers.",
    hp_max: 9, ca: 12, force: 11, dexterite: 12, constitution: 10, intelligence: 10, sagesse: 11, charisme: 10,
    attaques: [{ nom: 'Cimeterre', bonus: '+3', degats: '1d6+1 tranchant' }],
    hooks: [
      "Tente d'attirer un PJ vers son culte.",
      "A des informations sur un grand rituel à venir.",
      "Veut quitter le culte mais a peur des représailles."
    ]
  },
  {
    nom: 'Oracle',
    nomEn: 'Oracle',
    categorie: 'Religion',
    description: "Voyante recluse, parle en métaphores. Liée à un sanctuaire ou un arbre.",
    personnalite: "Cryptique. Ne répond jamais directement. Voix lente, regard vide.",
    hp_max: 22, ca: 11, force: 8, dexterite: 11, constitution: 12, intelligence: 14, sagesse: 18, charisme: 15,
    attaques: [{ nom: 'Bâton rituel', bonus: '+0', degats: '1d6 contondant' }],
    hooks: [
      "Ses visions sont fragmentées — elle a besoin d'aide pour reconstituer un message.",
      "Tente d'avertir d'un danger qui n'est pas encore arrivé.",
      "Refuse de parler à l'un des héros — pourquoi ?"
    ]
  },
  {
    nom: 'Prophète',
    nomEn: 'Prophet',
    categorie: 'Religion',
    description: "Voix tonitruante sur la place du marché. Annonce la fin ou la rédemption.",
    personnalite: "Exalté, certain. Charismatique pour les uns, fou pour les autres.",
    hp_max: 18, ca: 11, force: 10, dexterite: 11, constitution: 11, intelligence: 13, sagesse: 16, charisme: 16,
    attaques: [{ nom: 'Bâton', bonus: '+1', degats: '1d6 contondant' }],
    hooks: [
      "Sa prophétie commence à se réaliser — qui veut l'empêcher ?",
      "L'Église officielle veut le faire taire.",
      "Soupçonne un PJ d'être l'élu de sa vision."
    ]
  },

  // ============== AUTRES ==============
  {
    nom: 'Paysan',
    nomEn: 'Peasant',
    categorie: 'Autres',
    description: "Cultivateur ou éleveur. Le sel de la terre. Vit selon les saisons.",
    personnalite: "Direct, méfiant des étrangers, généreux pour qui il accepte chez lui.",
    hp_max: 7, ca: 10, force: 12, dexterite: 10, constitution: 11, intelligence: 9, sagesse: 11, charisme: 9,
    attaques: [{ nom: 'Faux ou fourche', bonus: '+1', degats: '1d4+1 tranchant ou perforant' }],
    hooks: [
      "Sa récolte a été détruite — par qui ?",
      "A vu une lumière étrange sur la colline trois nuits de suite.",
      "Cherche son fils qui n'est pas rentré du champ."
    ]
  },
  {
    nom: 'Pêcheur',
    nomEn: 'Fisherman',
    categorie: 'Autres',
    description: "Vit du fleuve ou de la mer. Tannées par le sel, mains calleuses.",
    personnalite: "Patient, superstitieux. Croit aux esprits de l'eau.",
    hp_max: 11, ca: 11, force: 12, dexterite: 12, constitution: 13, intelligence: 9, sagesse: 12, charisme: 10,
    attaques: [{ nom: 'Harpon', bonus: '+1', degats: '1d6+1 perforant' }],
    hooks: [
      "Quelque chose de gros agite les filets la nuit.",
      "A pêché un objet ancien — ou un cadavre.",
      "Refuse de sortir en mer après une rencontre traumatisante."
    ]
  },
  {
    nom: 'Forestier',
    nomEn: 'Forester',
    categorie: 'Autres',
    description: "Bûcheron, garde-chasse ou guide. Connaît la forêt mieux que sa propre cabane.",
    personnalite: "Solitaire, économe en paroles, protecteur de son territoire.",
    hp_max: 21, ca: 14, force: 13, dexterite: 15, constitution: 13, intelligence: 11, sagesse: 14, charisme: 9,
    attaques: [
      { nom: 'Hache', bonus: '+3', degats: '1d6+1 tranchant' },
      { nom: 'Arc court', bonus: '+4', degats: '1d6+2 perforant' }
    ],
    hooks: [
      "A vu quelque chose qu'il refuse de nommer.",
      "Demande aux héros d'éliminer une bête qui dévaste les troupeaux.",
      "Cherche son apprenti disparu en forêt."
    ]
  },
  {
    nom: 'Médecin',
    nomEn: 'Physician',
    categorie: 'Autres',
    description: "Soigne les maux du corps avec savoir, herbes et instruments. Charge ferme.",
    personnalite: "Méthodique, parfois condescendant. Souffre du regard que les paysans portent sur sa science.",
    hp_max: 16, ca: 11, force: 9, dexterite: 12, constitution: 11, intelligence: 16, sagesse: 14, charisme: 11,
    attaques: [{ nom: 'Scalpel', bonus: '+2', degats: '1d4 perforant' }],
    hooks: [
      "Une maladie inconnue se propage. Il a besoin d'ingrédients dangereux.",
      "Soupçonne un empoisonnement répété parmi ses patients.",
      "Cherche le corps d'un patient pour comprendre une maladie."
    ]
  },
  {
    nom: 'Sage',
    nomEn: 'Sage',
    categorie: 'Autres',
    description: "Érudit retiré dans une tour ou une cabane. Vaste savoir, peu d'amis.",
    personnalite: "Excentrique, distrait. Long discours sur des détails obscurs. Profondeur réelle.",
    hp_max: 11, ca: 11, force: 9, dexterite: 11, constitution: 11, intelligence: 18, sagesse: 16, charisme: 12,
    attaques: [{ nom: 'Bâton', bonus: '+0', degats: '1d6 contondant' }],
    hooks: [
      "A besoin d'un livre rare conservé dans une bibliothèque hostile.",
      "A traduit un parchemin que quelqu'un veut récupérer.",
      "Possède une carte très ancienne — il ne sait à qui faire confiance."
    ]
  },
  {
    nom: 'Barde vagabond',
    nomEn: 'Wandering Bard',
    categorie: 'Autres',
    description: "Voyage de taverne en taverne. Chants, lutes et rumeurs en monnaie d'échange.",
    personnalite: "Chaleureux, théâtral, opportuniste. Connaît une chanson pour chaque drame.",
    hp_max: 22, ca: 12, force: 11, dexterite: 14, constitution: 12, intelligence: 13, sagesse: 12, charisme: 17,
    attaques: [
      { nom: 'Rapière', bonus: '+4', degats: '1d8+2 perforant' },
      { nom: 'Sort cantrip (Vicious Mockery)', bonus: '+5', degats: '1d4 psychique (sauvegarde Sag)' }
    ],
    hooks: [
      "A vu un événement qu'il a écrit en chanson — la chanson dérange quelqu'un.",
      "Cherche des compagnons pour un château hanté digne d'une ballade.",
      "Connaît la rumeur juste, mais demande paiement."
    ]
  },
  {
    nom: 'Sorcière du village',
    nomEn: 'Village Witch',
    categorie: 'Autres',
    description: "Habite à l'écart. Soigne, conseille, maudit selon son humeur. Ambivalente.",
    personnalite: "Énigmatique, ironique, indépendante. Peu d'amis, peu d'ennemis vivants.",
    hp_max: 27, ca: 12, force: 10, dexterite: 13, constitution: 12, intelligence: 15, sagesse: 16, charisme: 13,
    attaques: [
      { nom: 'Bâton', bonus: '+2', degats: '1d6 contondant' },
      { nom: 'Sorts (druide niv 4)', bonus: '+4', degats: 'variable (Production de flamme, Ronces, etc.)' }
    ],
    hooks: [
      "Un chasseur l'accuse d'avoir maudit son bétail.",
      "Cherche un ingrédient rare dans une grotte habitée.",
      "Apparaît au moment opportun — quelle est sa vraie motivation ?"
    ]
  }
]

// ----------------------------------------------------------------------------
// Construit la ligne pnj à insérer en BDD à partir d'un template.
// ----------------------------------------------------------------------------
export const templateNotes = (t: PnjTemplate): string => {
  const lignes: string[] = []
  if (t.attaques.length > 0) {
    lignes.push('Attaques :')
    for (const a of t.attaques) {
      lignes.push(`  • ${a.nom} (${a.bonus}) : ${a.degats}`)
    }
    lignes.push('')
  }
  if (t.hooks.length > 0) {
    lignes.push('Idées de hooks pour le MJ :')
    for (const h of t.hooks) lignes.push(`  • ${h}`)
  }
  return lignes.join('\n')
}

export const templateVersPnj = (t: PnjTemplate, mj_id: string) => ({
  mj_id,
  nom: t.nom,
  race: null,
  role: t.categorie,
  description: t.description,
  personnalite: t.personnalite,
  secrets: null,
  image_url: null,
  hp_max: t.hp_max,
  hp_actuel: t.hp_max,
  armure: t.ca,
  force: t.force,
  dexterite: t.dexterite,
  constitution: t.constitution,
  intelligence: t.intelligence,
  sagesse: t.sagesse,
  charisme: t.charisme,
  notes: templateNotes(t)
})
