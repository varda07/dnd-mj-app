// ============================================================================
// Roadmap Affinement 2.1 — Templates de scénarios pré-faits
// ----------------------------------------------------------------------------
// Bibliothèque de squelettes de scénarios. Au clic, on crée un scénario
// pré-rempli (nom + description + notes + chapitres) que le MJ peut customiser.
// Chaque template définit son propre set de chapitres (sera inséré dans la
// table `chapitres` après la création du scénario).
// ============================================================================

export type ScenarioTemplate = {
  id: string
  emoji: string
  nom: string
  description: string
  notes: string
  /** Brève description shown dans la galerie de templates */
  pitch: string
  /** Couleur d'accent ambiance (gradient card) */
  ambient: string
  chapitres: Array<{ titre: string; resume: string; ordre: number }>
}

export const TEMPLATES_SCENARIOS: ScenarioTemplate[] = [
  {
    id: 'donjon_classique',
    emoji: '🏰',
    nom: 'Donjon classique',
    pitch: 'Exploration → énigme → mini-boss → boss final',
    ambient: 'linear-gradient(135deg, #2a1810 0%, #0e1014 100%)',
    description:
      'Un donjon en cinq actes : les PJ s’aventurent dans une crypte oubliée, résolvent une énigme antique, affrontent un mini-boss puis un boss final pour récupérer une relique.',
    notes:
      '— Préparer les plans du donjon (5 salles).\n— Définir l’objet de quête final (relique, MacGuffin).\n— Prévoir 2 PNJ aux étages (gardien fou, ombre captive).',
    chapitres: [
      { ordre: 1, titre: 'Entrée du donjon', resume: 'Les PJ découvrent l’entrée scellée, doivent l’ouvrir (énigme/force/rituel).' },
      { ordre: 2, titre: 'Exploration des salles', resume: 'Pièges, monstres mineurs, trésor caché, indices.' },
      { ordre: 3, titre: 'L’énigme antique', resume: 'Une grande salle avec un mécanisme à résoudre pour avancer.' },
      { ordre: 4, titre: 'Le mini-boss', resume: 'Un gardien protège l’antichambre du boss final.' },
      { ordre: 5, titre: 'Le boss final', resume: 'Affrontement épique, récupération de la relique, sortie précipitée.' },
    ],
  },
  {
    id: 'mystere_social',
    emoji: '🔍',
    nom: 'Mystère social',
    pitch: 'Enquête en ville, PNJ suspects, déduction',
    ambient: 'linear-gradient(135deg, #1a1228 0%, #0e1014 100%)',
    description:
      'Un crime a été commis en ville. Les PJ enquêtent : interrogatoires, fouilles, suspects multiples. Un coupable est désigné.',
    notes:
      '— Préparer 4-5 suspects avec mobiles différents.\n— Désigner le vrai coupable à l’avance ou laisser l’improvisation.\n— Préparer les lieux clés (scène du crime, taverne, manoir du noble).',
    chapitres: [
      { ordre: 1, titre: 'La scène du crime', resume: 'Les PJ arrivent, observent, collectent des indices initiaux.' },
      { ordre: 2, titre: 'Les premiers suspects', resume: 'Interrogatoires de témoins et de proches de la victime.' },
      { ordre: 3, titre: 'La piste sérieuse', resume: 'Un indice mène à un lieu/PNJ spécifique. Filature, fouille.' },
      { ordre: 4, titre: 'Confrontation finale', resume: 'Le vrai coupable est démasqué. Combat, fuite ou jugement.' },
    ],
  },
  {
    id: 'heist',
    emoji: '🗝',
    nom: 'Heist / Cambriolage',
    pitch: 'Préparation → infiltration → exécution → fuite',
    ambient: 'linear-gradient(135deg, #102028 0%, #0e1014 100%)',
    description:
      'Les PJ doivent voler un objet protégé. Phase de préparation (recherche d’infos, équipement), infiltration, exécution, fuite.',
    notes:
      '— Définir la cible (objet, lieu, qui le protège).\n— Préparer 2-3 voies d’accès.\n— Prévoir les complications (alarme, garde imprévu, traître).',
    chapitres: [
      { ordre: 1, titre: 'La cible', resume: 'Un commanditaire confie la mission. Briefing.' },
      { ordre: 2, titre: 'Préparation', resume: 'Repérage, achat d’équipement, recrutement de contacts.' },
      { ordre: 3, titre: 'L’infiltration', resume: 'Phase furtive : éviter gardes, désamorcer pièges.' },
      { ordre: 4, titre: 'L’imprévu', resume: 'Quelque chose tourne mal. Improvisation des PJ.' },
      { ordre: 5, titre: 'La fuite', resume: 'Course-poursuite, livraison, paiement (ou trahison).' },
    ],
  },
  {
    id: 'voyage_epique',
    emoji: '🗺',
    nom: 'Voyage épique',
    pitch: 'Étapes, rencontres aléatoires, destination lointaine',
    ambient: 'linear-gradient(135deg, #143020 0%, #0e1014 100%)',
    description:
      'Une longue traversée à travers monts et forêts. Chaque étape apporte sa rencontre, sa météo, son péril.',
    notes:
      '— Préparer 5-7 étapes avec biomes différents.\n— Tables de rencontres aléatoires par biome.\n— Météo générée à chaque étape (utiliser le générateur).',
    chapitres: [
      { ordre: 1, titre: 'Le départ', resume: 'Préparatifs, achats, derniers conseils du commanditaire.' },
      { ordre: 2, titre: 'Forêt ancienne', resume: 'Sentiers brumeux, créatures sauvages, druides.' },
      { ordre: 3, titre: 'Col de montagne', resume: 'Froid, tempête, embuscade de gobelins ou éboulis.' },
      { ordre: 4, titre: 'Vallée du repos', resume: 'Étape sociale : village, taverne, repos long.' },
      { ordre: 5, titre: 'Marécages putrides', resume: 'Maladie, mort-vivants, marécages instables.' },
      { ordre: 6, titre: 'La destination', resume: 'Arrivée au lieu visé. Climax narratif.' },
    ],
  },
  {
    id: 'sandbox_urbain',
    emoji: '🏛',
    nom: 'Sandbox urbain',
    pitch: 'Ville libre, multiples factions et quêtes',
    ambient: 'linear-gradient(135deg, #1f1c10 0%, #0e1014 100%)',
    description:
      'Une grande ville fourmillant de quêtes. 4 factions s’opposent. Les PJ choisissent leurs alliances et leurs missions.',
    notes:
      '— 4 factions : nobles, guilde des voleurs, culte, milice.\n— Liste de 10-15 quêtes secondaires.\n— Carte de la ville avec quartiers distincts.',
    chapitres: [
      { ordre: 1, titre: 'Arrivée en ville', resume: 'Premier contact avec l’ambiance, rencontres clés.' },
      { ordre: 2, titre: 'Les factions', resume: 'Les PJ identifient les jeux de pouvoir.' },
      { ordre: 3, titre: 'Quêtes secondaires', resume: 'Plusieurs petites missions au choix.' },
      { ordre: 4, titre: 'Le grand complot', resume: 'Une intrigue principale émerge et exige un choix.' },
      { ordre: 5, titre: 'Conséquences', resume: 'Selon les choix, la ville change visiblement.' },
    ],
  },
  {
    id: 'survival_horror',
    emoji: '🕯',
    nom: 'Survival horror',
    pitch: 'Manoir hanté, ressources rares, terreur',
    ambient: 'linear-gradient(135deg, #220a0a 0%, #0e1014 100%)',
    description:
      'Un vieux manoir hanté. Les PJ y entrent et n’en sortiront peut-être pas. Ressources limitées, terreur croissante, secrets à dévoiler.',
    notes:
      '— Réduire les ressources (pochette à torches, repos longs difficiles).\n— Ambiance : descriptions sensorielles, sons.\n— Prévoir 3-4 horreurs spectaculaires.',
    chapitres: [
      { ordre: 1, titre: 'La nuit tombe', resume: 'Les PJ se réfugient dans le manoir. La porte se ferme.' },
      { ordre: 2, titre: 'Le rez-de-chaussée', resume: 'Exploration des salles communes. Premiers indices.' },
      { ordre: 3, titre: 'Les étages', resume: 'Chambres, journaux intimes, première apparition.' },
      { ordre: 4, titre: 'La cave maudite', resume: 'Rituel ancien, origine de la malédiction.' },
      { ordre: 5, titre: 'L’aube ou la mort', resume: 'Sortir avant le lever du jour ou être consumés.' },
    ],
  },
  {
    id: 'combat_naval',
    emoji: '⚓',
    nom: 'Combat naval',
    pitch: 'Escarmouches en mer, abordage, trésor',
    ambient: 'linear-gradient(135deg, #082030 0%, #0e1014 100%)',
    description:
      'Un voyage en mer ponctué de combats navals. Tempêtes, pirates, mystère sous-marin. L’abordage est l’apothéose.',
    notes:
      '— Définir le navire des PJ (statistiques, équipage).\n— Préparer 2-3 navires ennemis.\n— Tables d’événements maritimes.',
    chapitres: [
      { ordre: 1, titre: 'L’embarquement', resume: 'Recrutement de l’équipage, préparation du navire.' },
      { ordre: 2, titre: 'La tempête', resume: 'Premier péril : la mer elle-même.' },
      { ordre: 3, titre: 'L’escarmouche', resume: 'Premier combat naval contre des pirates.' },
      { ordre: 4, titre: 'L’abordage', resume: 'Combat sur deux navires, capture ou destruction.' },
      { ordre: 5, titre: 'L’île au trésor', resume: 'Découverte d’un lieu mystérieux : trésor, ruines.' },
    ],
  },
  {
    id: 'tribal',
    emoji: '🪶',
    nom: 'Aventure tribale',
    pitch: 'Sauvage, PNJ tribaux, esprits ancestraux',
    ambient: 'linear-gradient(135deg, #2a200a 0%, #0e1014 100%)',
    description:
      'Les PJ sont accueillis (ou capturés) par une tribu isolée. Ils doivent gagner le respect des anciens, accomplir une épreuve sacrée, et affronter une menace ancestrale.',
    notes:
      '— Créer 4-5 PNJ tribaux marquants (chef, chamane, jeune guerrier…).\n— Définir l’épreuve sacrée (chasse, vision, combat rituel).\n— Préparer la menace finale (esprit corrompu, créature sacrée).',
    chapitres: [
      { ordre: 1, titre: 'Le premier contact', resume: 'Rencontre tendue avec les éclaireurs.' },
      { ordre: 2, titre: 'Le village', resume: 'Découverte des coutumes, des PNJ, des conflits.' },
      { ordre: 3, titre: 'L’épreuve', resume: 'Test pour être accepté.' },
      { ordre: 4, titre: 'La menace', resume: 'Une force ancienne menace la tribu.' },
      { ordre: 5, titre: 'Le rituel final', resume: 'Combat ou cérémonie pour repousser la menace.' },
    ],
  },
]

export function getTemplateById(id: string): ScenarioTemplate | undefined {
  return TEMPLATES_SCENARIOS.find((t) => t.id === id)
}
