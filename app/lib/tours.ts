// ============================================================================
// Roadmap Finalisation Phase 4 — Tutoriels contextuels guidés (tooltips/spotlight)
// ----------------------------------------------------------------------------
// Registre des tours + helpers de persistance. Chaque tour est une suite
// d'étapes ; une étape peut cibler un élément du DOM (selector) — le composant
// GuidedTour l'éclaire alors (spotlight) — ou rester centrée (informative) si
// aucun selector n'est fourni ou si la cible est absente.
// ============================================================================

import { supabase } from '@/lib/supabase'

export type TourStep = {
  /** Selector CSS de l'élément ciblé (ex: '[data-tour="combat-lancer"]').
   *  Absent ou introuvable → l'étape s'affiche centrée, sans spotlight. */
  selector?: string
  title: string
  text: string
}

export type Tour = {
  id: string
  titre: string
  steps: TourStep[]
}

export const TOURS: Record<string, Tour> = {
  combat: {
    id: 'combat',
    titre: 'Le combat',
    steps: [
      { title: '⚔️ Bienvenue dans le combat', text: "Cet écran gère un combat tour par tour : initiative, points de vie, conditions et fin de combat. Suivons les éléments clés." },
      { selector: '[data-tour="combat-lancer"]', title: 'Lancer le combat', text: "Ce bouton tire l'initiative automatiquement pour tous les participants et démarre le premier tour." },
      { selector: '[data-tour="combat-initiative"]', title: "L'ordre d'initiative", text: "La frise montre l'ordre de jeu. Le participant actif est mis en valeur ; clique un combattant pour le sélectionner." },
      { selector: '[data-tour="combat-actions"]', title: 'Les actions rapides', text: "Tour précédent / suivant, pause, jet groupé, et fin de combat. Les dégâts et soins s'appliquent sur chaque carte de combattant." },
      { title: '💀 Conditions & fin de combat', text: "Ajoute des conditions (empoisonné, à terre…) sur chaque combattant, et clique « Terminer le combat » pour clôturer avec le récap." },
    ],
  },
  'combat-prepare': {
    id: 'combat-prepare',
    titre: 'Le préparateur de combat',
    steps: [
      { title: '🛠 Préparer un combat', text: "Configure tes combats à l'avance : choisis les ennemis, règle l'initiative et sauvegarde-les pour les lancer en un clic pendant la session." },
      { selector: '[data-tour="prepare-creer"]', title: 'Créer un combat préparé', text: "Donne un nom à ton combat et ajoute-le à la liste des combats de ce scénario." },
      { title: '⚡ Lancer plus tard', text: "Tes combats préparés sont accessibles depuis le cockpit MJ de la session et le dashboard — prêts à lancer instantanément." },
    ],
  },
  // ==========================================================================
  // Phase 5 — le mode diffusion a été remplacé par le mode session. Deux tours
  // distincts : un par poste, car MJ et joueur ne voient pas le même écran.
  // ==========================================================================
  'session-mj': {
    id: 'session-mj',
    titre: 'Le cockpit MJ',
    steps: [
      { title: '🎲 Ta session est ouverte', text: "Tout tient sur un écran : ta préparation à gauche, ta zone de travail au centre, ta table à droite. Les joueurs ont chacun leur poste, synchronisé en temps réel." },
      { selector: '[data-tour="session-preparation"]', title: 'Ma préparation', text: "Chapitres, lieux, PNJ, rencontres, notes — avec compteurs et recherche. Un clic sur une entrée change la zone de travail ; un clic sur une rencontre préparée lance le combat." },
      { selector: '[data-tour="session-table"]', title: 'Ma table', text: "Une carte par joueur, toujours visible : connexion, PV exacts, CA, ressources, concentration. Les boutons −5 / +5 arrivent instantanément sur l'écran du joueur." },
      { selector: '[data-tour="session-repos"]', title: 'Repos court & repos long', text: "Applique un repos à toute la table d'un clic : les ressources et les emplacements de sorts se rechargent chez chaque joueur, PV au maximum pour le repos long." },
      { title: '🎡 La roue d\'action', text: "Le bouton MS flottant (déplaçable) déploie six pétales : image, narration, sons, dés, rencontre et magie sauvage. Les trois premiers apparaissent immédiatement chez tous les joueurs." },
    ],
  },
  'session-joueur': {
    id: 'session-joueur',
    titre: 'Ton poste de jeu',
    steps: [
      { title: '🎲 Bienvenue à la table', text: "Ton personnage tient dans une roue, en bas de l'écran. Le reste de l'écran est à ce que le MJ te montre." },
      { selector: '[data-tour="roue-joueur"]', title: 'La roue du personnage', text: "L'arc extérieur est ta jauge de points de vie — c'est le seul endroit où ils s'affichent. Les cinq pétales ouvrent tes menus : Compétences, Sorts, Notes, Actions, Sac. Appuie au centre pour gérer tes PV." },
      { title: '📖 Déplier une ligne', text: "Dans un menu, appuie sur une ligne : sa description apparaît, avec un bouton « Lancer » quand l'élément se jette. Une seule ligne ouverte à la fois." },
      { title: '⭕ Les ronds d\'usage', text: "Emplacements de sorts, capacités limitées et objets à charges affichent des ronds : ils se consomment de droite à gauche, et un clic sur un rond gris te le restitue. Tes compétences et tes attaques d'arme n'en ont pas — elles ne sont pas limitées." },
      { selector: '[data-tour="zone-diffusion"]', title: 'Ce que le MJ diffuse', text: "Image, narration et ambiance sonore arrivent ici en direct. Quand le MJ ne diffuse rien, la zone affiche le journal de table. En combat, elle bascule sur la vue combat." },
    ],
  },
  scenario: {
    id: 'scenario',
    titre: 'La création de scénario',
    steps: [
      { title: '📖 Ton scénario', text: "Construis ton aventure : chapitres imbriqués, notes de session et carte mentale. Voyons comment t'y retrouver." },
      { selector: '[data-tour="scenario-chapitres"]', title: 'Les chapitres', text: "Organise ton scénario en chapitres imbriqués (façon Notion). Clique pour éditer, glisse pour réordonner." },
      { selector: '[data-tour="scenario-souspages"]', title: 'Les outils du scénario', text: "Session zéro, économie, suivi d'XP, memo MJ, calendrier, récap… accessibles ici (et dans le panneau de droite sur grand écran)." },
      { title: '🧠 Carte mentale', text: "L'onglet Mindmap te laisse relier visuellement PNJ, lieux et intrigues de ton scénario." },
    ],
  },
  personnage: {
    id: 'personnage',
    titre: 'La fiche personnage',
    steps: [
      { title: '🎭 La fiche personnage', text: "Une fiche D&D 5e complète : caractéristiques, sorts, points de vie et repos. Survol des sections clés." },
      { selector: '[data-tour="perso-stats"]', title: 'Caractéristiques', text: "Force, Dextérité… modificateurs et jets de sauvegarde sont calculés automatiquement." },
      { selector: '[data-tour="perso-hp"]', title: 'Points de vie & repos', text: "Gère les PV, PV temporaires et les repos courts/longs qui restaurent ressources et dés de vie." },
      { title: '✨ Sorts & équipement', text: "Ajoute des sorts depuis la bibliothèque, gère l'équipement et les emplacements de sorts par niveau." },
    ],
  },
  mindmap: {
    id: 'mindmap',
    titre: 'La carte mentale',
    steps: [
      { title: '🧠 La carte mentale', text: "Relie visuellement les entités de ton scénario : PNJ, lieux, intrigues, indices." },
      { selector: '[data-tour="mindmap-add"]', title: 'Créer des nœuds', text: "Ajoute un nœud puis fais-le glisser. Double-clique pour le renommer." },
      { title: '🔗 Lier des entités', text: "Tire un trait d'un nœud à l'autre pour matérialiser une relation (allié, ennemi, mène à…)." },
    ],
  },
  // ==========================================================================
  // V1 Phase 5.1 — tutoriels guidés sur les pages restantes. Étapes surtout
  // informatives (centrées) pour rester robustes sans dépendre du DOM exact.
  // ==========================================================================
  ennemis: {
    id: 'ennemis',
    titre: 'Les ennemis',
    steps: [
      { title: '👹 Tes ennemis', text: "Crée et gère les créatures de tes combats : PV, CA, attaques, résistances et comportement tactique." },
      { title: '📚 Importer du bestiaire', text: "Pars d'une créature du bestiaire D&D 5e prête à l'emploi, puis ajuste-la à ta sauce." },
      { title: '🧬 Variantes', text: "Duplique un ennemi pour créer des variantes (élite, champion, blessé…) sans tout recommencer." },
    ],
  },
  pnj: {
    id: 'pnj',
    titre: 'Les PNJ',
    steps: [
      { title: '🧑 Tes PNJ', text: "Gère les personnages non-joueurs : nom, personnalité, rôle et relations." },
      { title: '🎲 Génération assistée', text: "Génère un nom et une personnalité aléatoires pour donner vie à un PNJ en quelques secondes." },
      { title: '🔗 Relations', text: "Relie tes PNJ entre eux et à ton scénario pour ne jamais perdre le fil de tes intrigues." },
    ],
  },
  items: {
    id: 'items',
    titre: 'Les items',
    steps: [
      { title: '🎒 Tes items', text: "Crée armes, armures, objets et trésors avec leurs effets et leur rareté." },
      { title: '✨ Objets magiques', text: "Définis des objets magiques avec bonus, charges et propriétés spéciales." },
      { title: '📚 Bibliothèque', text: "Importe des items officiels depuis la bibliothèque D&D 5e pour gagner du temps." },
    ],
  },
  sorts: {
    id: 'sorts',
    titre: 'Les sorts',
    steps: [
      { title: '✨ Le grimoire', text: "Parcours tous les sorts D&D 5e : niveau, école, classes, composantes et description." },
      { title: '🔎 Filtrer', text: "Filtre par niveau, classe ou école pour trouver le sort qu'il te faut en un instant." },
      { title: '➕ Créer un sort', text: "Crée tes propres sorts maison et réutilise-les sur les fiches de personnage." },
    ],
  },
  maps: {
    id: 'maps',
    titre: 'Les cartes',
    steps: [
      { title: '🗺️ Tes cartes', text: "Crée et organise les cartes de ton univers : régions, donjons, villes." },
      { title: '🖌 L’éditeur', text: "Annote, ajoute des marqueurs, des calques et des liens entre cartes." },
      { title: '🏰 Builder de donjon', text: "Génère un donjon à partir de tuiles, ou construis-le pièce par pièce." },
    ],
  },
  bibliotheque: {
    id: 'bibliotheque',
    titre: 'La bibliothèque',
    steps: [
      { title: '📚 La bibliothèque', text: "Tout le contenu D&D 5e à portée de main : monstres, sorts, items, règles." },
      { title: '📥 Importer', text: "Importe un élément officiel dans tes propres contenus en un clic, puis personnalise-le." },
    ],
  },
  communaute: {
    id: 'communaute',
    titre: 'La communauté',
    steps: [
      { title: '🌐 La communauté', text: "Découvre les créations partagées par les autres MJ : scénarios, ennemis, PNJ, items…" },
      { title: '❤️ Aimer & commenter', text: "Like, commente et suis tes créateurs préférés pour ne rien rater." },
      { title: '📥 Importer & partager', text: "Importe une création dans tes contenus, ou partage les tiennes en les rendant publiques." },
    ],
  },
  'situations-random': {
    id: 'situations-random',
    titre: 'Les situations aléatoires',
    steps: [
      { title: '🎲 Situations aléatoires', text: "Génère une rencontre ou un événement imprévu pour relancer une session qui s'essouffle." },
      { title: '🎯 Adapter', text: "Relance jusqu'à trouver l'étincelle, puis improvise à partir de la suggestion." },
    ],
  },
  'wild-magic': {
    id: 'wild-magic',
    titre: 'La magie sauvage',
    steps: [
      { title: '🌀 Magie sauvage', text: "La table de magie sauvage officielle : un effet aléatoire à chaque déclenchement." },
      { title: '🎲 Lancer', text: "Lance le d100 et applique l'effet — pour pimenter les sorts de tes ensorceleurs." },
      { title: '✨ Tables custom', text: "Crée tes propres tables d'effets dans « Tables d'effets » pour aller plus loin." },
    ],
  },
  'tables-effets': {
    id: 'tables-effets',
    titre: 'Les tables d\'effets',
    steps: [
      { title: '🎲 Tables d\'effets', text: "Crée des tables d'effets aléatoires personnalisées (Wild Magic, mutations, malédictions…)." },
      { title: '📜 Templates', text: "Pars d'un template prêt à l'emploi puis customise-le : dé, plages, descriptions." },
      { title: '🌐 Partager & rouler', text: "Choisis ton dé, lance un tirage, et partage ta table avec la communauté ou en JSON." },
    ],
  },
  'combat-rapide': {
    id: 'combat-rapide',
    titre: 'Le combat rapide',
    steps: [
      { title: '⚡ Combat rapide', text: "Un combat léger sans préparation : ajoute des combattants à la volée et tranche." },
      { title: '🎲 Initiative & PV', text: "Tire l'initiative, suis les PV et les conditions — l'essentiel, sans fioritures." },
    ],
  },
  soundbox: {
    id: 'soundbox',
    titre: 'L\'ambiance sonore',
    steps: [
      { title: '🎵 Sound Box', text: "Gère l'ambiance sonore de tes sessions : musiques d'ambiance et effets ponctuels." },
      { title: '🔊 Tes sons', text: "Ajoute tes propres sons et déclenche-les en un clic pendant le jeu." },
      { title: '📡 En session', text: "Le pétale « Sons » de la roue d'action MJ pousse une ambiance directement chez tous les joueurs." },
    ],
  },
  'dashboard-perso': {
    id: 'dashboard-perso',
    titre: 'Le dashboard personnalisable',
    steps: [
      { title: '🎨 Ton accueil', text: "Personnalise ton tableau de bord : choisis les widgets et leur disposition." },
      { title: '🧩 Widgets', text: "Active/désactive des widgets (favoris, derniers scénarios, dés…) selon tes besoins." },
      { title: '↕️ Réorganiser', text: "Glisse-dépose les widgets pour les ranger dans l'ordre qui te convient." },
    ],
  },
}

// --------------------------------------------------------------------------
// Préférence « tutoriels automatiques » (localStorage, par appareil)
// --------------------------------------------------------------------------
const AUTO_OFF_KEY = 'tutoriels_auto_off'

export function autoToursDisabled(): boolean {
  try {
    return window.localStorage.getItem(AUTO_OFF_KEY) === '1'
  } catch {
    return false
  }
}

export function setAutoToursDisabled(off: boolean): void {
  try {
    window.localStorage.setItem(AUTO_OFF_KEY, off ? '1' : '0')
  } catch {
    /* localStorage indisponible : ignoré */
  }
}

/** Déclenche manuellement un tour (depuis un bouton « 🎓 Tutoriel »). */
export function startTour(tourId: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('tour:start', { detail: { tourId } }))
}

// --------------------------------------------------------------------------
// Persistance « déjà vu » dans profiles.tutoriels_vus (jsonb { id: timestamp })
// --------------------------------------------------------------------------
export async function tourDejaVu(tourId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return true // non connecté → pas d'auto-déclenchement
  const { data } = await supabase
    .from('profiles')
    .select('tutoriels_vus')
    .eq('id', user.id)
    .maybeSingle()
  const vus = (data?.tutoriels_vus ?? {}) as Record<string, unknown>
  return Object.prototype.hasOwnProperty.call(vus, tourId)
}

export async function marquerTourVu(tourId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data } = await supabase
    .from('profiles')
    .select('tutoriels_vus')
    .eq('id', user.id)
    .maybeSingle()
  const vus = { ...((data?.tutoriels_vus as Record<string, unknown>) ?? {}) }
  if (vus[tourId]) return
  vus[tourId] = new Date().toISOString()
  await supabase.from('profiles').update({ tutoriels_vus: vus }).eq('id', user.id)
}
