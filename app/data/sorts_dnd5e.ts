// ============================================================================
// Bibliothèque de sorts D&D 5e — modèles importables dans le compte du joueur.
// Utilisé par /dashboard/sorts pour pré-remplir / importer des sorts officiels.
// ============================================================================

export type ClasseSort =
  | 'Magicien'
  | 'Ensorceleur'
  | 'Sorcier'
  | 'Clerc'
  | 'Druide'
  | 'Barde'
  | 'Paladin'
  | 'Rôdeur'
  | 'Artificier'

export type EcoleSort =
  | 'Abjuration'
  | 'Invocation'
  | 'Divination'
  | 'Enchantement'
  | 'Évocation'
  | 'Illusion'
  | 'Nécromancie'
  | 'Transmutation'

export type ActionType = 'action' | 'reaction' | 'bonus' | 'minute' | 'rituel'

export type SortOfficiel = {
  nom: string
  nomEn: string
  niveau: number // 0..9
  ecole: EcoleSort
  temps_incantation: string
  action_type: ActionType
  portee: string
  duree: string
  composantes_verbal: boolean
  composantes_somatique: boolean
  composantes_materiel: string // '' si pas de composante matérielle
  concentration: boolean
  rituel: boolean
  classes_compatibles: ClasseSort[]
  description: string
}

// 50+ sorts les plus représentatifs du PHB.
// Descriptions volontairement compactes (1-3 lignes) — la fiche détaillée
// reste dans le manuel officiel.
export const SORTS_DND5E: SortOfficiel[] = [
  // ---- Niveau 0 : Tours de magie ----
  {
    nom: 'Lumière',
    nomEn: 'Light',
    niveau: 0,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Contact',
    duree: '1 heure',
    composantes_verbal: true,
    composantes_somatique: false,
    composantes_materiel: 'Une luciole ou de la mousse phosphorescente',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Clerc', 'Ensorceleur', 'Magicien'],
    description:
      "Tu touches un objet de 3 m ou moins. Il émet une lumière vive sur 6 m, puis une faible lumière sur 6 m supplémentaires. Lumière au choix de couleur."
  },
  {
    nom: 'Prestidigitation',
    nomEn: 'Prestidigitation',
    niveau: 0,
    ecole: 'Transmutation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '3 m',
    duree: '1 heure',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Ensorceleur', 'Magicien', 'Sorcier', 'Artificier'],
    description:
      "Petits effets de magie : sons, étincelles, allumer/éteindre une flamme, salir/nettoyer, marquer un objet, créer un babiole illusoire."
  },
  {
    nom: 'Trait de feu',
    nomEn: 'Fire Bolt',
    niveau: 0,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '36 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien', 'Artificier'],
    description:
      "Attaque de sort à distance. En cas de coup, 1d10 dégâts de feu. Un objet inflammable non porté s'enflamme. Dégâts +1d10 aux niveaux 5/11/17."
  },
  {
    nom: 'Décharge occulte',
    nomEn: 'Eldritch Blast',
    niveau: 0,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '36 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Sorcier'],
    description:
      "Rayon d'énergie crépitante. Attaque de sort à distance, 1d10 dégâts de force en cas de coup. +1 rayon aux niveaux 5/11/17."
  },
  {
    nom: 'Rayon de givre',
    nomEn: 'Ray of Frost',
    niveau: 0,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '18 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien', 'Artificier'],
    description:
      "Attaque de sort à distance. 1d8 dégâts de froid et la vitesse de la cible est réduite de 3 m jusqu'à ton prochain tour."
  },
  {
    nom: 'Réparation',
    nomEn: 'Mending',
    niveau: 0,
    ecole: 'Transmutation',
    temps_incantation: '1 minute',
    action_type: 'minute',
    portee: 'Contact',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Deux aimants',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Clerc', 'Druide', 'Ensorceleur', 'Magicien', 'Artificier'],
    description:
      "Répare une déchirure ou cassure d'un objet (max ~30 cm). Ne restaure pas de magie."
  },
  {
    nom: 'Stabilisation',
    nomEn: 'Spare the Dying',
    niveau: 0,
    ecole: 'Nécromancie',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Contact',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Clerc', 'Artificier'],
    description: 'Stabilise une créature à 0 PV (sans la soigner).'
  },
  {
    nom: 'Flamme sacrée',
    nomEn: 'Sacred Flame',
    niveau: 0,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '18 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Clerc'],
    description:
      "Une flamme descend sur la cible. Sauvegarde de Dextérité ou 1d8 dégâts radiants (ne profite pas du couvert). +1d8 aux niveaux 5/11/17."
  },
  {
    nom: 'Druidisme',
    nomEn: 'Druidcraft',
    niveau: 0,
    ecole: 'Transmutation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '9 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Druide'],
    description:
      "Effets mineurs de la nature : prédire la météo locale (24 h), faire éclore un bourgeon, créer un effet sensoriel naturel, allumer/éteindre un petit feu."
  },
  {
    nom: 'Branche-épine',
    nomEn: 'Thorn Whip',
    niveau: 0,
    ecole: 'Transmutation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '9 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'La tige d\'une plante avec des épines',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Druide', 'Artificier'],
    description:
      "Attaque de sort au corps à corps. 1d6 dégâts perforants. Si la cible est M ou plus petite, tu la tires de 3 m vers toi. +1d6 aux niveaux 5/11/17."
  },
  {
    nom: 'Message',
    nomEn: 'Message',
    niveau: 0,
    ecole: 'Transmutation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '36 m',
    duree: '1 round',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Un petit morceau de fil de cuivre',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Ensorceleur', 'Magicien', 'Artificier'],
    description:
      "Tu murmures un message à une cible visible. Elle entend et peut chuchoter une réponse. Le sort traverse 60 cm de bois ou 30 cm de pierre, mais pas le métal commun."
  },

  // ---- Niveau 1 ----
  {
    nom: 'Bouclier',
    nomEn: 'Shield',
    niveau: 1,
    ecole: 'Abjuration',
    temps_incantation: '1 réaction',
    action_type: 'reaction',
    portee: 'Personnelle',
    duree: '1 round',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien'],
    description:
      "Réaction quand tu es touché par une attaque ou ciblé par Projectile magique. Tu gagnes +5 CA jusqu'au début de ton prochain tour, et tu n'es pas affecté par Projectile magique."
  },
  {
    nom: 'Armure de mage',
    nomEn: 'Mage Armor',
    niveau: 1,
    ecole: 'Abjuration',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Contact',
    duree: '8 heures',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Un morceau de cuir tanné',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien'],
    description:
      "Une armure protectrice entoure une créature consentante non armurée. Sa CA devient 13 + son modificateur de Dextérité. Le sort prend fin si la cible enfile une armure."
  },
  {
    nom: 'Soins',
    nomEn: 'Cure Wounds',
    niveau: 1,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Contact',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Clerc', 'Druide', 'Paladin', 'Rôdeur', 'Artificier'],
    description:
      "Une créature touchée récupère 1d8 + ton mod. de magie en PV. Niveau supérieur : +1d8 par emplacement supplémentaire. Inopérant sur morts-vivants/artificiels."
  },
  {
    nom: 'Projectile magique',
    nomEn: 'Magic Missile',
    niveau: 1,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '36 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien'],
    description:
      "Trois projectiles luisants. Chacun frappe automatiquement une cible visible et inflige 1d4+1 dégâts de force. Niveau supérieur : +1 projectile par emplacement supplémentaire."
  },
  {
    nom: 'Détection de la magie',
    nomEn: 'Detect Magic',
    niveau: 1,
    ecole: 'Divination',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Personnelle',
    duree: 'Concentration, 10 min',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: true,
    rituel: true,
    classes_compatibles: ['Barde', 'Clerc', 'Druide', 'Paladin', 'Rôdeur', 'Ensorceleur', 'Magicien', 'Artificier'],
    description:
      "Tu perçois la magie dans un rayon de 9 m. Tu peux identifier l'école d'un effet visible en utilisant ton action."
  },
  {
    nom: "Compréhension des langues",
    nomEn: 'Comprehend Languages',
    niveau: 1,
    ecole: 'Divination',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Personnelle',
    duree: '1 heure',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Une pincée de suie et de sel',
    concentration: false,
    rituel: true,
    classes_compatibles: ['Barde', 'Ensorceleur', 'Magicien', 'Sorcier'],
    description:
      "Tu comprends toute langue parlée que tu entends et toute langue écrite que tu touches. Mots sacrés / textes secrets non concernés."
  },
  {
    nom: 'Identification',
    nomEn: 'Identify',
    niveau: 1,
    ecole: 'Divination',
    temps_incantation: '1 minute',
    action_type: 'minute',
    portee: 'Contact',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Une perle de 100 po et une plume de hibou',
    concentration: false,
    rituel: true,
    classes_compatibles: ['Barde', 'Magicien', 'Artificier'],
    description:
      "Tu identifies les propriétés magiques d'un objet : pouvoirs, syntonisation requise, charges, malédictions communes."
  },
  {
    nom: 'Charme-personne',
    nomEn: 'Charm Person',
    niveau: 1,
    ecole: 'Enchantement',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '9 m',
    duree: '1 heure',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Druide', 'Ensorceleur', 'Magicien', 'Sorcier'],
    description:
      "Sauvegarde de Sagesse (avantage si tu es en combat avec elle). Échec : la cible est charmée par toi et te considère comme une connaissance amicale jusqu'à la fin du sort."
  },
  {
    nom: 'Sommeil',
    nomEn: 'Sleep',
    niveau: 1,
    ecole: 'Enchantement',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '27 m',
    duree: '1 minute',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Sable fin, pétales de rose ou un grillon',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Ensorceleur', 'Magicien'],
    description:
      "Lance 5d8 PV. Les créatures dans une sphère de 6 m, par ordre croissant de PV, tombent inconscientes jusqu'à concurrence du total. Inefficace contre morts-vivants ou créatures immunisées au charme."
  },
  {
    nom: 'Saut',
    nomEn: 'Jump',
    niveau: 1,
    ecole: 'Transmutation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Contact',
    duree: '1 minute',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Une patte arrière de sauterelle',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Druide', 'Ensorceleur', 'Magicien', 'Rôdeur', 'Artificier'],
    description: "La distance de saut de la créature touchée est triplée."
  },
  {
    nom: "Vague tonnante",
    nomEn: 'Thunderwave',
    niveau: 1,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Auto (cube de 4,5 m)',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Druide', 'Ensorceleur', 'Magicien'],
    description:
      "Sauvegarde de Constitution. Échec : 2d8 dégâts de tonnerre et la cible est repoussée de 3 m. Réussi : moitié, pas de recul. Niveau supérieur : +1d8 par niveau."
  },
  {
    nom: 'Lutin féerique',
    nomEn: 'Faerie Fire',
    niveau: 1,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '18 m',
    duree: 'Concentration, 1 min',
    composantes_verbal: true,
    composantes_somatique: false,
    composantes_materiel: '',
    concentration: true,
    rituel: false,
    classes_compatibles: ['Barde', 'Druide'],
    description:
      "Cube de 6 m. Sauvegarde de Dex pour les créatures et objets. Les cibles ratées sont entourées d'une lueur, ne peuvent pas bénéficier d'invisibilité, et les attaques contre elles ont l'avantage."
  },
  {
    nom: 'Mains brûlantes',
    nomEn: 'Burning Hands',
    niveau: 1,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Auto (cône de 4,5 m)',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien'],
    description:
      "Sauvegarde de Dex. Échec : 3d6 dégâts de feu. Réussi : moitié. Les objets non portés s'enflamment. Niveau supérieur : +1d6 par niveau."
  },
  {
    nom: 'Bénédiction',
    nomEn: 'Bless',
    niveau: 1,
    ecole: 'Enchantement',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '9 m',
    duree: 'Concentration, 1 min',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Une goutte d\'eau bénite',
    concentration: true,
    rituel: false,
    classes_compatibles: ['Clerc', 'Paladin'],
    description:
      "Jusqu'à 3 créatures de ton choix ajoutent 1d4 à chaque jet d'attaque et chaque jet de sauvegarde. Niveau supérieur : +1 cible par niveau."
  },
  {
    nom: "Frappe divine",
    nomEn: 'Searing Smite',
    niveau: 1,
    ecole: 'Évocation',
    temps_incantation: '1 bonus',
    action_type: 'bonus',
    portee: 'Personnelle',
    duree: 'Concentration, 1 min',
    composantes_verbal: true,
    composantes_somatique: false,
    composantes_materiel: '',
    concentration: true,
    rituel: false,
    classes_compatibles: ['Paladin', 'Rôdeur'],
    description:
      "Ta prochaine attaque au corps à corps inflige +1d6 dégâts de feu et enflamme la cible (1d6 par début de tour). La cible peut tenter une sauvegarde de Con à la fin de chacun de ses tours."
  },

  // ---- Niveau 2 ----
  {
    nom: 'Invisibilité',
    nomEn: 'Invisibility',
    niveau: 2,
    ecole: 'Illusion',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Contact',
    duree: 'Concentration, 1 h',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Un cil dans une gomme arabique',
    concentration: true,
    rituel: false,
    classes_compatibles: ['Barde', 'Ensorceleur', 'Magicien', 'Sorcier', 'Artificier'],
    description:
      "Une créature touchée devient invisible jusqu'à ce qu'elle attaque ou lance un sort. Niveau supérieur : +1 cible par niveau."
  },
  {
    nom: 'Toile d\'araignée',
    nomEn: 'Web',
    niveau: 2,
    ecole: 'Invocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '18 m',
    duree: 'Concentration, 1 h',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Un peu de toile d\'araignée',
    concentration: true,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien', 'Artificier'],
    description:
      "Cube de 6 m de toiles : terrain difficile, agrippé pour ceux ayant raté la sauvegarde de Dex (action pour réessayer). Inflammable : 2d4 dégâts de feu si une flamme touche la zone."
  },
  {
    nom: 'Détection des pensées',
    nomEn: 'Detect Thoughts',
    niveau: 2,
    ecole: 'Divination',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Auto',
    duree: 'Concentration, 1 min',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Une pièce de cuivre',
    concentration: true,
    rituel: false,
    classes_compatibles: ['Barde', 'Ensorceleur', 'Magicien'],
    description:
      "Lis les pensées superficielles d'une créature à 9 m. Sauvegarde de Sagesse pour résister à un sondage plus profond."
  },
  {
    nom: 'Don des langues',
    nomEn: 'Tongues',
    niveau: 3,
    ecole: 'Divination',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Contact',
    duree: '1 heure',
    composantes_verbal: true,
    composantes_somatique: false,
    composantes_materiel: 'Une petite tour modèle d\'argile',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Clerc', 'Ensorceleur', 'Magicien', 'Sorcier'],
    description:
      "La cible peut comprendre toute langue parlée et toute créature qui peut comprendre une langue qu'elle parle la comprend."
  },
  {
    nom: 'Image miroir',
    nomEn: 'Mirror Image',
    niveau: 2,
    ecole: 'Illusion',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Personnelle',
    duree: '1 minute',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien', 'Sorcier'],
    description:
      "Trois doubles illusoires. Chaque attaque dirigée contre toi peut frapper un double (CA 10 + mod Dex). Un double détruit disparaît."
  },
  {
    nom: 'Aide',
    nomEn: 'Aid',
    niveau: 2,
    ecole: 'Abjuration',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '9 m',
    duree: '8 heures',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Une bandelette de tissu blanc',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Clerc', 'Paladin', 'Artificier'],
    description:
      "Jusqu'à 3 créatures gagnent +5 PV max et PV pour la durée. Niveau supérieur : +5 PV par niveau."
  },
  {
    nom: 'Restauration mineure',
    nomEn: 'Lesser Restoration',
    niveau: 2,
    ecole: 'Abjuration',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Contact',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Clerc', 'Druide', 'Paladin', 'Rôdeur', 'Artificier'],
    description:
      "La cible touchée n'est plus aveuglée, assourdie, paralysée ou empoisonnée — au choix une seule de ces conditions."
  },
  {
    nom: "Lueur",
    nomEn: 'Moonbeam',
    niveau: 2,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '36 m',
    duree: 'Concentration, 1 min',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Plusieurs graines de plante de lune et de quartz brillant',
    concentration: true,
    rituel: false,
    classes_compatibles: ['Druide'],
    description:
      "Cylindre de 1,50 m de rayon, 12 m de haut. Sauvegarde de Con pour les créatures qui y entrent ou y commencent leur tour : 2d10 dégâts radiants (moitié si réussi). Métamorphes ont désavantage."
  },
  {
    nom: 'Rayon ardent',
    nomEn: 'Scorching Ray',
    niveau: 2,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '36 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien'],
    description:
      "Trois rayons de feu. Pour chacun, attaque de sort à distance ; touche : 2d6 dégâts de feu. Niveau supérieur : +1 rayon par niveau."
  },
  {
    nom: 'Déblocage',
    nomEn: 'Knock',
    niveau: 2,
    ecole: 'Transmutation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '18 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: false,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Ensorceleur', 'Magicien'],
    description:
      "Ouvre un objet verrouillé, scellé ou bloqué — y compris par une serrure ou Verrou arcanique. Bruit fort audible à 90 m."
  },

  // ---- Niveau 3 ----
  {
    nom: 'Boule de feu',
    nomEn: 'Fireball',
    niveau: 3,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '45 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Une boulette de guano de chauve-souris et du soufre',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien'],
    description:
      "Sphère de 6 m de rayon. Sauvegarde de Dex : 8d6 dégâts de feu (moitié si réussi). Les objets non portés s'enflamment. Niveau supérieur : +1d6 par niveau."
  },
  {
    nom: 'Éclair',
    nomEn: 'Lightning Bolt',
    niveau: 3,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Auto (ligne de 30 m)',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Un peu de fourrure et une tige (ambre, cristal ou verre)',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien'],
    description:
      "Ligne de 30 m × 1,50 m. Sauvegarde de Dex : 8d6 dégâts de foudre (moitié si réussi). Niveau supérieur : +1d6 par niveau."
  },
  {
    nom: 'Vol',
    nomEn: 'Fly',
    niveau: 3,
    ecole: 'Transmutation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Contact',
    duree: 'Concentration, 10 min',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Une plume d\'aile d\'oiseau',
    concentration: true,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien', 'Sorcier', 'Artificier'],
    description:
      "Une créature volontaire touchée gagne une vitesse de vol de 18 m. Niveau supérieur : +1 cible par niveau."
  },
  {
    nom: 'Contresort',
    nomEn: 'Counterspell',
    niveau: 3,
    ecole: 'Abjuration',
    temps_incantation: '1 réaction',
    action_type: 'reaction',
    portee: '18 m',
    duree: 'Instantanée',
    composantes_verbal: false,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien', 'Sorcier'],
    description:
      "Réaction quand tu vois une créature lancer un sort. Annule automatiquement les sorts ≤ niveau 3 ; au-delà, test de magie DD 10 + niveau du sort."
  },
  {
    nom: 'Dissipation de la magie',
    nomEn: 'Dispel Magic',
    niveau: 3,
    ecole: 'Abjuration',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '36 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Clerc', 'Druide', 'Ensorceleur', 'Magicien', 'Paladin', 'Sorcier'],
    description:
      "Met fin à un effet magique. Sorts ≤ niveau 3 : automatique. Au-delà : test de magie DD 10 + niveau de l'effet."
  },
  {
    nom: 'Soins de masse',
    nomEn: 'Mass Healing Word',
    niveau: 3,
    ecole: 'Évocation',
    temps_incantation: '1 bonus',
    action_type: 'bonus',
    portee: '18 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: false,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Clerc'],
    description:
      "Jusqu'à 6 créatures récupèrent 1d4 + mod. de magie PV. Niveau supérieur : +1d4 par niveau."
  },
  {
    nom: 'Hâte',
    nomEn: 'Haste',
    niveau: 3,
    ecole: 'Transmutation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '9 m',
    duree: 'Concentration, 1 min',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Un copeau de réglisse',
    concentration: true,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien', 'Artificier'],
    description:
      "La cible double sa vitesse, +2 CA, avantage aux sauvegardes de Dex, +1 action limitée par tour. À la fin du sort, la cible est étourdie 1 round."
  },
  {
    nom: 'Animation des morts',
    nomEn: 'Animate Dead',
    niveau: 3,
    ecole: 'Nécromancie',
    temps_incantation: '1 minute',
    action_type: 'minute',
    portee: '3 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Une goutte de sang, un morceau de chair, un peu de poussière d\'os',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Clerc', 'Magicien'],
    description:
      "Anime un cadavre Moyen ou plus petit en zombie ou squelette. Tu contrôles 1 créature (renouveler avec un sort niv 3 par 24 h ou perte de contrôle)."
  },

  // ---- Niveau 4 ----
  {
    nom: 'Polymorphe',
    nomEn: 'Polymorph',
    niveau: 4,
    ecole: 'Transmutation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '18 m',
    duree: 'Concentration, 1 h',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Un cocon de chenille',
    concentration: true,
    rituel: false,
    classes_compatibles: ['Barde', 'Druide', 'Ensorceleur', 'Magicien'],
    description:
      "Sauvegarde de Sagesse. Échec : la cible se transforme en bête (FP ≤ niveau de la cible). Garde son alignement et sa Sagesse, prend les stats de la bête."
  },
  {
    nom: 'Mur de feu',
    nomEn: 'Wall of Fire',
    niveau: 4,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '36 m',
    duree: 'Concentration, 1 min',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Un peu de phosphore',
    concentration: true,
    rituel: false,
    classes_compatibles: ['Druide', 'Ensorceleur', 'Magicien'],
    description:
      "Mur de 18 m × 6 m × 30 cm OU anneau de 6 m de diamètre. Sauvegarde de Dex : 5d8 dégâts de feu (moitié si réussi). Côté chaud : 5d8 par tour."
  },
  {
    nom: 'Liberté de mouvement',
    nomEn: 'Freedom of Movement',
    niveau: 4,
    ecole: 'Abjuration',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Contact',
    duree: '1 heure',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Une lanière de cuir tournée autour du bras',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Clerc', 'Druide', 'Rôdeur', 'Artificier'],
    description:
      "La cible n'est ni gênée par les terrains difficiles, ni paralysée, ni entravée. Peut sortir d'une étreinte ou d'une saisie en utilisant 1,50 m de mouvement."
  },
  {
    nom: 'Tempête de glace',
    nomEn: 'Ice Storm',
    niveau: 4,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '90 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Une poignée de poussière et quelques gouttes d\'eau',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Druide', 'Ensorceleur', 'Magicien'],
    description:
      "Cylindre de 6 m de rayon × 12 m de haut. Sauvegarde de Dex : 2d8 contondants + 4d6 froid (moitié si réussi). Terrain difficile pendant 1 round."
  },

  // ---- Niveau 5 ----
  {
    nom: 'Cône de froid',
    nomEn: 'Cone of Cold',
    niveau: 5,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Auto (cône de 18 m)',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Un petit cristal ou un morceau de quartz',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien'],
    description:
      "Sauvegarde de Con : 8d8 dégâts de froid (moitié si réussi). Cibles tuées sont gelées. Niveau supérieur : +1d8 par niveau."
  },
  {
    nom: 'Soins de groupe',
    nomEn: 'Mass Cure Wounds',
    niveau: 5,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '18 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Clerc', 'Druide'],
    description:
      "Jusqu'à 6 créatures dans une sphère de 9 m récupèrent 3d8 + mod. magie PV. Niveau supérieur : +1d8 par niveau."
  },
  {
    nom: 'Domination de personne',
    nomEn: 'Dominate Person',
    niveau: 5,
    ecole: 'Enchantement',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '18 m',
    duree: 'Concentration, 1 min',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: '',
    concentration: true,
    rituel: false,
    classes_compatibles: ['Barde', 'Ensorceleur', 'Magicien'],
    description:
      "Sauvegarde de Sagesse. Échec : tu domines mentalement la cible (humanoïde). Tu peux donner des ordres télépathiques. Niveau supérieur : durée plus longue / + cibles."
  },
  {
    nom: 'Résurrection',
    nomEn: 'Raise Dead',
    niveau: 5,
    ecole: 'Nécromancie',
    temps_incantation: '1 heure',
    action_type: 'minute',
    portee: 'Contact',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Un diamant de 500 po consommé',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Clerc', 'Paladin'],
    description:
      "Ramène à la vie une créature morte depuis ≤ 10 jours. La cible revient avec 1 PV. Pénalité de -4 à tous les jets pendant 4 repos longs."
  },

  // ---- Niveau 6+ (sélection) ----
  {
    nom: 'Désintégration',
    nomEn: 'Disintegrate',
    niveau: 6,
    ecole: 'Transmutation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '18 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Une magnétite et un peu de poussière',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien'],
    description:
      "Rayon vert. Sauvegarde de Dex : 10d6 + 40 dégâts de force. Cible réduite à 0 PV : pulvérisée. Niveau supérieur : +3d6 par niveau."
  },
  {
    nom: 'Chaîne d\'éclairs',
    nomEn: 'Chain Lightning',
    niveau: 6,
    ecole: 'Évocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '45 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: true,
    composantes_materiel: 'Un peu de fourrure, un morceau d\'ambre, de verre ou cristal, et 3 piques d\'argent',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien'],
    description:
      "Une cible primaire + 3 cibles secondaires (≤ 9 m). Sauvegarde de Dex : 10d8 dégâts de foudre (moitié si réussi). Niveau supérieur : +1 cible secondaire par niveau."
  },
  {
    nom: 'Téléportation',
    nomEn: 'Teleport',
    niveau: 7,
    ecole: 'Invocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '3 m',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: false,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Ensorceleur', 'Magicien'],
    description:
      "Téléporte toi + jusqu'à 8 créatures consentantes vers une destination connue. Précision dépendant de la familiarité. Risque d'erreur (table d'aléa)."
  },
  {
    nom: 'Mot de pouvoir étourdissant',
    nomEn: 'Power Word Stun',
    niveau: 8,
    ecole: 'Enchantement',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: '18 m',
    duree: 'Variable',
    composantes_verbal: true,
    composantes_somatique: false,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Barde', 'Ensorceleur', 'Magicien', 'Sorcier'],
    description:
      "Cible avec ≤ 150 PV : étourdie. Elle peut faire une sauvegarde de Con à la fin de chacun de ses tours pour mettre fin à l'effet."
  },
  {
    nom: 'Souhait',
    nomEn: 'Wish',
    niveau: 9,
    ecole: 'Invocation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Auto',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: false,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien'],
    description:
      "Le sort le plus puissant : duplique tout sort de niveau ≤ 8, ou réécrit la réalité. Effets étendus risquent d'épuiser le lanceur (impossible à relancer pendant 1d4 jours, -2 For définitif possible)."
  },
  {
    nom: 'Méta-magie',
    nomEn: 'Time Stop',
    niveau: 9,
    ecole: 'Transmutation',
    temps_incantation: '1 action',
    action_type: 'action',
    portee: 'Auto',
    duree: 'Instantanée',
    composantes_verbal: true,
    composantes_somatique: false,
    composantes_materiel: '',
    concentration: false,
    rituel: false,
    classes_compatibles: ['Ensorceleur', 'Magicien'],
    description:
      "Tu prends 1d4+1 tours d'affilée, pendant lesquels les autres sont figés dans le temps. Le sort prend fin si tu blesses une autre créature ou affectes un objet porté."
  }
]

// ------------------------- Helpers -------------------------

export const SORTS_PAR_NIVEAU = (() => {
  const map = new Map<number, SortOfficiel[]>()
  for (const s of SORTS_DND5E) {
    const arr = map.get(s.niveau) ?? []
    arr.push(s)
    map.set(s.niveau, arr)
  }
  return map
})()

// Slots de sorts par classe et par niveau (table simplifiée du PHB).
// Format : SLOTS_PAR_CLASSE[classe][personnageNiveau] = { '1': n, '2': n, ... }
type SlotProgression = Record<string, Record<string, Record<string, number>>>

// Casteurs complets (Bard, Cleric, Druid, Sorcerer, Wizard)
const CASTEUR_COMPLET: Record<string, number>[] = [
  /*1*/  { '1': 2 },
  /*2*/  { '1': 3 },
  /*3*/  { '1': 4, '2': 2 },
  /*4*/  { '1': 4, '2': 3 },
  /*5*/  { '1': 4, '2': 3, '3': 2 },
  /*6*/  { '1': 4, '2': 3, '3': 3 },
  /*7*/  { '1': 4, '2': 3, '3': 3, '4': 1 },
  /*8*/  { '1': 4, '2': 3, '3': 3, '4': 2 },
  /*9*/  { '1': 4, '2': 3, '3': 3, '4': 3, '5': 1 },
  /*10*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2 },
  /*11*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1 },
  /*12*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1 },
  /*13*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1 },
  /*14*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1 },
  /*15*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1, '8': 1 },
  /*16*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1, '8': 1 },
  /*17*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1, '8': 1, '9': 1 },
  /*18*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 3, '6': 1, '7': 1, '8': 1, '9': 1 },
  /*19*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 3, '6': 2, '7': 1, '8': 1, '9': 1 },
  /*20*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 3, '6': 2, '7': 2, '8': 1, '9': 1 }
]

// Demi-casteurs (Paladin, Ranger) — accès aux sorts à partir du niv 2
const DEMI_CASTEUR: Record<string, number>[] = [
  /*1*/  {},
  /*2*/  { '1': 2 },
  /*3*/  { '1': 3 },
  /*4*/  { '1': 3 },
  /*5*/  { '1': 4, '2': 2 },
  /*6*/  { '1': 4, '2': 2 },
  /*7*/  { '1': 4, '2': 3 },
  /*8*/  { '1': 4, '2': 3 },
  /*9*/  { '1': 4, '2': 3, '3': 2 },
  /*10*/ { '1': 4, '2': 3, '3': 2 },
  /*11*/ { '1': 4, '2': 3, '3': 3 },
  /*12*/ { '1': 4, '2': 3, '3': 3 },
  /*13*/ { '1': 4, '2': 3, '3': 3, '4': 1 },
  /*14*/ { '1': 4, '2': 3, '3': 3, '4': 1 },
  /*15*/ { '1': 4, '2': 3, '3': 3, '4': 2 },
  /*16*/ { '1': 4, '2': 3, '3': 3, '4': 2 },
  /*17*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 1 },
  /*18*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 1 },
  /*19*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2 },
  /*20*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2 }
]

// Tiers-casteurs (Eldritch Knight, Arcane Trickster, Artificier)
const TIERS_CASTEUR: Record<string, number>[] = [
  /*1*/  { '1': 2 }, // Artificier exception : caste dès le niv 1
  /*2*/  { '1': 2 },
  /*3*/  { '1': 3 },
  /*4*/  { '1': 3 },
  /*5*/  { '1': 4, '2': 2 },
  /*6*/  { '1': 4, '2': 2 },
  /*7*/  { '1': 4, '2': 3 },
  /*8*/  { '1': 4, '2': 3 },
  /*9*/  { '1': 4, '2': 3, '3': 2 },
  /*10*/ { '1': 4, '2': 3, '3': 2 },
  /*11*/ { '1': 4, '2': 3, '3': 3 },
  /*12*/ { '1': 4, '2': 3, '3': 3 },
  /*13*/ { '1': 4, '2': 3, '3': 3, '4': 1 },
  /*14*/ { '1': 4, '2': 3, '3': 3, '4': 1 },
  /*15*/ { '1': 4, '2': 3, '3': 3, '4': 2 },
  /*16*/ { '1': 4, '2': 3, '3': 3, '4': 2 },
  /*17*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 1 },
  /*18*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 1 },
  /*19*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2 },
  /*20*/ { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2 }
]

// Sorcier (Warlock) — table de Pacte Magique (slots particuliers, repos COURT)
const WARLOCK: Record<string, number>[] = [
  /*1*/  { '1': 1 },
  /*2*/  { '1': 2 },
  /*3*/  { '2': 2 },
  /*4*/  { '2': 2 },
  /*5*/  { '3': 2 },
  /*6*/  { '3': 2 },
  /*7*/  { '4': 2 },
  /*8*/  { '4': 2 },
  /*9*/  { '5': 2 },
  /*10*/ { '5': 2 },
  /*11*/ { '5': 3 },
  /*12*/ { '5': 3 },
  /*13*/ { '5': 3 },
  /*14*/ { '5': 3 },
  /*15*/ { '5': 3 },
  /*16*/ { '5': 3 },
  /*17*/ { '5': 4 },
  /*18*/ { '5': 4 },
  /*19*/ { '5': 4 },
  /*20*/ { '5': 4 }
]

const tableParPerso = (
  arr: Record<string, number>[]
): Record<string, Record<string, number>> =>
  Object.fromEntries(arr.map((s, i) => [String(i + 1), s]))

export const SLOTS_PAR_CLASSE: SlotProgression = {
  Magicien: tableParPerso(CASTEUR_COMPLET),
  Ensorceleur: tableParPerso(CASTEUR_COMPLET),
  Clerc: tableParPerso(CASTEUR_COMPLET),
  Druide: tableParPerso(CASTEUR_COMPLET),
  Barde: tableParPerso(CASTEUR_COMPLET),
  Paladin: tableParPerso(DEMI_CASTEUR),
  'Rôdeur': tableParPerso(DEMI_CASTEUR),
  Artificier: tableParPerso(TIERS_CASTEUR),
  Sorcier: tableParPerso(WARLOCK)
}

// Renvoie les slots max recommandés pour une classe + niveau donnés.
export const slotsRecommandes = (
  classe: string | null | undefined,
  niveau: number
): Record<string, number> => {
  if (!classe) return {}
  const table = SLOTS_PAR_CLASSE[classe]
  if (!table) return {}
  const lvl = Math.max(1, Math.min(20, niveau))
  return table[String(lvl)] ?? {}
}

// Le sorcier récupère ses slots sur repos COURT.
export const usesShortRest = (classe: string | null | undefined): boolean =>
  classe === 'Sorcier'

// Détecte les expressions de dés dans une description ("3d6", "1d8 + 4", etc.)
const DICE_RE = /(\d+)d(4|6|8|10|12|20)/gi
export type DiceExpr = { n: number; faces: number }
export const extraireDes = (texte: string | null | undefined): DiceExpr[] => {
  if (!texte) return []
  const out: DiceExpr[] = []
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  DICE_RE.lastIndex = 0
  while ((m = DICE_RE.exec(texte)) !== null) {
    const key = `${m[1]}d${m[2]}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ n: parseInt(m[1], 10), faces: parseInt(m[2], 10) })
  }
  return out
}
