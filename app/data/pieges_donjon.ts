// ============================================================================
// Roadmap Modes 3.4 — Pièges classiques avec stats D&D 5e
// ----------------------------------------------------------------------------
// Catalogue de pièges réutilisables sur les maps. Chaque piège a :
//   - dd_detection : DC Perception/Investigation pour le repérer
//   - dd_desamorcage : DC Outils de voleur / Dextérité
//   - degats : expression (ex "2d10")
//   - type_degats : feu, perforant, etc.
//   - effet : description narrative
// ============================================================================

export type Piege = {
  id: string
  nom: string
  icon: string
  dd_detection: number
  dd_desamorcage: number
  degats: string
  type_degats: string
  jet_sauvegarde?: { carac: 'FOR' | 'DEX' | 'CON' | 'INT' | 'SAG' | 'CHA'; dc: number; effet: 'half' | 'cancel' }
  effet: string
}

export const PIEGES_DONJON: Piege[] = [
  {
    id: 'fleches',
    nom: 'Volée de flèches', icon: '🏹',
    dd_detection: 13, dd_desamorcage: 13,
    degats: '2d8', type_degats: 'perforant',
    jet_sauvegarde: { carac: 'DEX', dc: 13, effet: 'half' },
    effet: 'Des flèches jaillissent des murs.',
  },
  {
    id: 'fosse',
    nom: 'Fosse cachée', icon: '🕳',
    dd_detection: 15, dd_desamorcage: 15,
    degats: '2d6', type_degats: 'contondant',
    jet_sauvegarde: { carac: 'DEX', dc: 15, effet: 'cancel' },
    effet: 'Le sol s\'effondre, révélant une fosse de 6 mètres.',
  },
  {
    id: 'fosse_piques',
    nom: 'Fosse à piques', icon: '🗡',
    dd_detection: 15, dd_desamorcage: 16,
    degats: '2d6 + 3d6', type_degats: 'contondant + perforant',
    jet_sauvegarde: { carac: 'DEX', dc: 15, effet: 'cancel' },
    effet: 'Une fosse de 6 mètres garnie de piques rouillées.',
  },
  {
    id: 'gaz',
    nom: 'Nuage de gaz toxique', icon: '☣',
    dd_detection: 14, dd_desamorcage: 14,
    degats: '4d6', type_degats: 'poison',
    jet_sauvegarde: { carac: 'CON', dc: 13, effet: 'half' },
    effet: 'Un nuage verdâtre se libère et empoisonne la zone.',
  },
  {
    id: 'flammes',
    nom: 'Jet de flammes', icon: '🔥',
    dd_detection: 14, dd_desamorcage: 15,
    degats: '4d10', type_degats: 'feu',
    jet_sauvegarde: { carac: 'DEX', dc: 13, effet: 'half' },
    effet: 'Une gueule de pierre crache une langue de feu.',
  },
  {
    id: 'rune_eclair',
    nom: 'Rune d\'éclair', icon: '⚡',
    dd_detection: 16, dd_desamorcage: 17,
    degats: '4d10', type_degats: 'foudre',
    jet_sauvegarde: { carac: 'DEX', dc: 15, effet: 'half' },
    effet: 'Une rune au sol explose en arc électrique.',
  },
  {
    id: 'lame',
    nom: 'Lame de pendule', icon: '⚔️',
    dd_detection: 13, dd_desamorcage: 13,
    degats: '3d10', type_degats: 'tranchant',
    jet_sauvegarde: { carac: 'DEX', dc: 14, effet: 'half' },
    effet: 'Une grande lame oscille au plafond, fauchant la zone.',
  },
  {
    id: 'plafond',
    nom: 'Plafond qui descend', icon: '🟫',
    dd_detection: 17, dd_desamorcage: 18,
    degats: '6d10', type_degats: 'contondant',
    jet_sauvegarde: { carac: 'DEX', dc: 17, effet: 'cancel' },
    effet: 'Les murs se referment. Tout le monde dans la zone subit l\'écrasement.',
  },
]
