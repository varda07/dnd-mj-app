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
      { title: '⚡ Lancer plus tard', text: "Tes combats préparés sont accessibles depuis le cockpit de diffusion et le dashboard — prêts à lancer ou à diffuser instantanément." },
    ],
  },
  diffusion: {
    id: 'diffusion',
    titre: 'Le mode diffusion',
    steps: [
      { title: '📺 Mode diffusion', text: "Diffuse une vue joueurs (TV / second écran) pendant que tu gardes le contrôle MJ. Voici les outils principaux." },
      { selector: '[data-tour="diffusion-tabs"]', title: 'Les onglets', text: "Bascule entre Narration, Combat, Carte, Sons… chaque onglet pilote ce que voient les joueurs." },
      { selector: '[data-tour="diffusion-lancer"]', title: 'Lancer la diffusion', text: "Génère un lien public + QR code que tes joueurs ouvrent sans compte pour voir l'écran partagé." },
      { title: '🎡 Roue d\'action', text: "La roue flottante (déplaçable) pousse rapidement une narration, une image, un son ou gère le combat en direct." },
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
