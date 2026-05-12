// ============================================================================
// Widgets disponibles pour la personnalisation du dashboard
// ============================================================================
// Chaque widget définit :
//   - type     : identifiant stable (clé de la map)
//   - label    : nom affiché dans le palette
//   - icone    : emoji décoratif
//   - w, h     : taille par défaut sur la grille 4 colonnes × 6 lignes
//   - description : phrase courte pour le palette
// ============================================================================

export type WidgetType =
  | 'carte_mentale'
  | 'combat'
  | 'derniers_jets'
  | 'stats_persos'
  | 'notes_rapides'
  | 'inventaire'
  | 'sound_box'
  | 'mini_carte'
  | 'quetes_actives'
  | 'liste_persos'
  | 'liste_ennemis'
  | 'timer_session'
  | 'journal_campagne'
  | 'favoris'

export type WidgetDef = {
  type: WidgetType
  label: string
  icone: string
  w: number
  h: number
  description: string
}

export const WIDGETS: WidgetDef[] = [
  { type: 'carte_mentale',   label: 'Carte mentale',     icone: '📖', w: 2, h: 2, description: 'Mind map du scénario actif' },
  { type: 'combat',          label: 'Combat',            icone: '⚔️', w: 2, h: 1, description: 'Round, tour, prochaine action' },
  { type: 'derniers_jets',   label: 'Derniers jets',     icone: '🎲', w: 1, h: 1, description: 'Les 5 derniers jets de dés' },
  { type: 'stats_persos',    label: 'Stats persos',      icone: '📊', w: 2, h: 1, description: 'HP, niveau, classe en un coup d’œil' },
  { type: 'notes_rapides',   label: 'Notes rapides',     icone: '📜', w: 2, h: 2, description: 'Mémo libre, sauvegardé localement' },
  { type: 'inventaire',      label: 'Inventaire',        icone: '🎒', w: 1, h: 2, description: 'Objets épinglés du scénario' },
  { type: 'sound_box',       label: 'Sound Box',         icone: '🎵', w: 1, h: 1, description: 'Ambiance audio en un clic' },
  { type: 'mini_carte',      label: 'Mini carte',        icone: '🗺️', w: 2, h: 2, description: 'Carte du lieu actif' },
  { type: 'quetes_actives',  label: 'Quêtes actives',    icone: '📅', w: 1, h: 2, description: 'Liste des quêtes en cours' },
  { type: 'liste_persos',    label: 'Liste persos',      icone: '🧙', w: 1, h: 2, description: 'PJ avec barre HP' },
  { type: 'liste_ennemis',   label: 'Liste ennemis',     icone: '👹', w: 1, h: 2, description: 'Adversaires en cours' },
  { type: 'timer_session',   label: 'Timer session',     icone: '⏱', w: 1, h: 1, description: 'Chronomètre de partie' },
  { type: 'journal_campagne',label: 'Journal',           icone: '📝', w: 2, h: 2, description: 'Dernières entrées du journal' },
  { type: 'favoris',         label: 'Favoris',           icone: '🌟', w: 1, h: 2, description: 'Éléments épinglés' }
]

export const WIDGETS_BY_TYPE: Record<WidgetType, WidgetDef> = WIDGETS.reduce(
  (acc, w) => {
    acc[w.type] = w
    return acc
  },
  {} as Record<WidgetType, WidgetDef>
)

// ----------------------------------------------------------------------------
// Instance d'un widget dans une config
// ----------------------------------------------------------------------------
export type WidgetInstance = {
  type: WidgetType
  x: number // colonne 0..3
  y: number // ligne 0..5
  w: number
  h: number
}

export type DashboardConfig = {
  id: string
  nom: string
  widgets: WidgetInstance[]
}

export type DashboardPrefs = {
  active: string | null
  configs: DashboardConfig[]
}

export const GRID_COLS = 4
export const GRID_ROWS = 6

// ----------------------------------------------------------------------------
// Helpers placement
// ----------------------------------------------------------------------------

// Trouve le premier emplacement libre (w×h) dans la grille, ou null si plein.
export function premierEmplacementLibre(
  widgets: WidgetInstance[],
  w: number,
  h: number
): { x: number; y: number } | null {
  for (let y = 0; y <= GRID_ROWS - h; y++) {
    for (let x = 0; x <= GRID_COLS - w; x++) {
      if (!chevauche(widgets, { x, y, w, h })) return { x, y }
    }
  }
  return null
}

export function chevauche(
  widgets: WidgetInstance[],
  test: { x: number; y: number; w: number; h: number },
  ignoreIndex?: number
): boolean {
  for (let i = 0; i < widgets.length; i++) {
    if (i === ignoreIndex) continue
    const w = widgets[i]
    const overlapX = test.x < w.x + w.w && test.x + test.w > w.x
    const overlapY = test.y < w.y + w.h && test.y + test.h > w.y
    if (overlapX && overlapY) return true
  }
  return false
}

export function nouveauId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
