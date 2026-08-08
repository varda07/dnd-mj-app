// Vues du cockpit MJ (Delta C.3) — l'entrée sélectionnée à gauche pilote
// le contenu de la zone de travail centrale.
export type VueMJ = 'chapitre' | 'lieux' | 'pnj' | 'rencontres' | 'combat' | 'notes'

export const LABEL_VUE: Record<VueMJ, string> = {
  chapitre: 'Chapitre en cours',
  lieux: 'Lieux',
  pnj: 'PNJ',
  rencontres: 'Rencontres',
  combat: 'Combat en cours',
  notes: 'Notes'
}
