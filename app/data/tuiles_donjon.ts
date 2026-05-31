// ============================================================================
// Roadmap Modes 3.1 — Bibliothèque de tuiles pré-fabriquées
// ----------------------------------------------------------------------------
// Catalogue de tuiles utilisables dans l'éditeur de donjon. Chaque tuile est
// définie par son SVG inline (rendu compact) + métadonnées (taille, ancrage,
// rotation possible).
// ============================================================================

export type TuileCategorie = 'piece' | 'couloir' | 'escalier' | 'porte' | 'decor' | 'mobilier'

export type TuileDef = {
  id: string
  categorie: TuileCategorie
  label: string
  /** Taille en cases (grille du donjon) — w × h */
  w: number
  h: number
  /** SVG inline (à inclure dans <svg viewBox=…>) */
  svg: string
  /** Peut être pivoté à 90/180/270 ? */
  rotable?: boolean
}

const COULEUR_MUR = '#3a3530'
const COULEUR_SOL = '#1a1612'
const COULEUR_DETAIL = '#a37a35'

export const TUILES_DONJON: TuileDef[] = [
  // ---------- PIÈCES ----------
  {
    id: 'piece_carre_3',
    categorie: 'piece', label: 'Petite pièce 3×3', w: 3, h: 3, rotable: false,
    svg: `<rect x="2" y="2" width="56" height="56" fill="${COULEUR_SOL}" stroke="${COULEUR_MUR}" stroke-width="4"/>`,
  },
  {
    id: 'piece_carre_5',
    categorie: 'piece', label: 'Pièce 5×5', w: 5, h: 5, rotable: false,
    svg: `<rect x="2" y="2" width="96" height="96" fill="${COULEUR_SOL}" stroke="${COULEUR_MUR}" stroke-width="4"/>`,
  },
  {
    id: 'piece_rect_4x6',
    categorie: 'piece', label: 'Salle 4×6', w: 6, h: 4, rotable: true,
    svg: `<rect x="2" y="2" width="116" height="76" fill="${COULEUR_SOL}" stroke="${COULEUR_MUR}" stroke-width="4"/>`,
  },
  {
    id: 'piece_ronde_5',
    categorie: 'piece', label: 'Salle ronde', w: 5, h: 5, rotable: false,
    svg: `<circle cx="50" cy="50" r="46" fill="${COULEUR_SOL}" stroke="${COULEUR_MUR}" stroke-width="4"/>`,
  },

  // ---------- COULOIRS ----------
  {
    id: 'couloir_droit',
    categorie: 'couloir', label: 'Couloir droit', w: 3, h: 1, rotable: true,
    svg: `<rect x="0" y="6" width="60" height="8" fill="${COULEUR_SOL}" stroke="${COULEUR_MUR}" stroke-width="2"/>`,
  },
  {
    id: 'couloir_coude',
    categorie: 'couloir', label: 'Coude L', w: 2, h: 2, rotable: true,
    svg: `<path d="M 0 12 L 40 12 L 40 40 Z M 12 0 L 28 0 L 28 28 L 12 28 Z" fill="${COULEUR_SOL}" stroke="${COULEUR_MUR}" stroke-width="2"/>`,
  },
  {
    id: 'couloir_t',
    categorie: 'couloir', label: 'Intersection T', w: 3, h: 2, rotable: true,
    svg: `<rect x="0" y="10" width="60" height="12" fill="${COULEUR_SOL}" stroke="${COULEUR_MUR}" stroke-width="2"/><rect x="22" y="22" width="16" height="20" fill="${COULEUR_SOL}" stroke="${COULEUR_MUR}" stroke-width="2"/>`,
  },
  {
    id: 'couloir_croix',
    categorie: 'couloir', label: 'Intersection croix', w: 3, h: 3, rotable: false,
    svg: `<rect x="0" y="22" width="60" height="16" fill="${COULEUR_SOL}" stroke="${COULEUR_MUR}" stroke-width="2"/><rect x="22" y="0" width="16" height="60" fill="${COULEUR_SOL}" stroke="${COULEUR_MUR}" stroke-width="2"/>`,
  },

  // ---------- ESCALIERS ----------
  {
    id: 'escalier_monte',
    categorie: 'escalier', label: 'Escalier ↑', w: 2, h: 1, rotable: true,
    svg: `<rect x="0" y="0" width="40" height="20" fill="${COULEUR_SOL}" stroke="${COULEUR_MUR}" stroke-width="1"/>
          <line x1="5" y1="4" x2="35" y2="4" stroke="${COULEUR_DETAIL}" stroke-width="1.5"/>
          <line x1="5" y1="10" x2="35" y2="10" stroke="${COULEUR_DETAIL}" stroke-width="1.5"/>
          <line x1="5" y1="16" x2="35" y2="16" stroke="${COULEUR_DETAIL}" stroke-width="1.5"/>
          <text x="20" y="14" text-anchor="middle" fill="${COULEUR_DETAIL}" font-size="8" font-weight="bold">↑</text>`,
  },
  {
    id: 'escalier_descend',
    categorie: 'escalier', label: 'Escalier ↓', w: 2, h: 1, rotable: true,
    svg: `<rect x="0" y="0" width="40" height="20" fill="${COULEUR_SOL}" stroke="${COULEUR_MUR}" stroke-width="1"/>
          <line x1="5" y1="4" x2="35" y2="4" stroke="${COULEUR_DETAIL}" stroke-width="1.5"/>
          <line x1="5" y1="10" x2="35" y2="10" stroke="${COULEUR_DETAIL}" stroke-width="1.5"/>
          <line x1="5" y1="16" x2="35" y2="16" stroke="${COULEUR_DETAIL}" stroke-width="1.5"/>
          <text x="20" y="14" text-anchor="middle" fill="${COULEUR_DETAIL}" font-size="8" font-weight="bold">↓</text>`,
  },

  // ---------- PORTES ----------
  {
    id: 'porte_simple',
    categorie: 'porte', label: 'Porte simple', w: 1, h: 1, rotable: true,
    svg: `<rect x="4" y="2" width="12" height="16" fill="#6b4423" stroke="${COULEUR_MUR}" stroke-width="1"/><circle cx="13" cy="10" r="1" fill="${COULEUR_DETAIL}"/>`,
  },
  {
    id: 'porte_double',
    categorie: 'porte', label: 'Double porte', w: 2, h: 1, rotable: true,
    svg: `<rect x="2" y="2" width="16" height="16" fill="#6b4423" stroke="${COULEUR_MUR}" stroke-width="1"/><rect x="22" y="2" width="16" height="16" fill="#6b4423" stroke="${COULEUR_MUR}" stroke-width="1"/><line x1="20" y1="2" x2="20" y2="18" stroke="${COULEUR_MUR}" stroke-width="1"/>`,
  },
  {
    id: 'porte_secrete',
    categorie: 'porte', label: 'Porte secrète', w: 1, h: 1, rotable: true,
    svg: `<rect x="2" y="2" width="16" height="16" fill="${COULEUR_MUR}" stroke="${COULEUR_DETAIL}" stroke-width="0.5" stroke-dasharray="2 2"/><text x="10" y="13" text-anchor="middle" font-size="8" fill="${COULEUR_DETAIL}">?</text>`,
  },

  // ---------- DÉCOR ----------
  { id: 'decor_torche',   categorie: 'decor', label: 'Torche',    w: 1, h: 1, svg: `<circle cx="10" cy="14" r="3" fill="#7a5230"/><path d="M 10 4 Q 7 8 10 12 Q 13 8 10 4 Z" fill="#f59e0b"/>` },
  { id: 'decor_statue',   categorie: 'decor', label: 'Statue',    w: 1, h: 1, svg: `<rect x="6" y="12" width="8" height="6" fill="#6b6760"/><circle cx="10" cy="8" r="4" fill="#9ca3af"/>` },
  { id: 'decor_autel',    categorie: 'decor', label: 'Autel',     w: 2, h: 1, svg: `<rect x="2" y="6" width="36" height="10" fill="#6b4423" stroke="${COULEUR_DETAIL}" stroke-width="1"/><circle cx="20" cy="11" r="2" fill="#dc2626"/>` },
  { id: 'decor_fontaine', categorie: 'decor', label: 'Fontaine',  w: 2, h: 2, svg: `<circle cx="20" cy="20" r="16" fill="#1e3a8a" stroke="${COULEUR_MUR}" stroke-width="2"/><circle cx="20" cy="20" r="6" fill="#3b82f6"/>` },

  // ---------- MOBILIER ----------
  { id: 'mob_table',    categorie: 'mobilier', label: 'Table',    w: 2, h: 1, svg: `<rect x="2" y="4" width="36" height="12" fill="#7a5230" stroke="${COULEUR_MUR}" stroke-width="1"/>` },
  { id: 'mob_coffre',   categorie: 'mobilier', label: 'Coffre',   w: 1, h: 1, svg: `<rect x="3" y="6" width="14" height="10" fill="#7a5230" stroke="${COULEUR_DETAIL}" stroke-width="1"/><line x1="3" y1="10" x2="17" y2="10" stroke="${COULEUR_DETAIL}" stroke-width="1"/>` },
  { id: 'mob_lit',      categorie: 'mobilier', label: 'Lit',      w: 2, h: 1, svg: `<rect x="2" y="4" width="36" height="12" fill="#475569" stroke="${COULEUR_MUR}" stroke-width="1"/><rect x="4" y="6" width="10" height="8" fill="#94a3b8"/>` },
  { id: 'mob_etagere',  categorie: 'mobilier', label: 'Étagère',  w: 2, h: 1, svg: `<rect x="2" y="2" width="36" height="16" fill="#7a5230" stroke="${COULEUR_MUR}" stroke-width="1"/><line x1="2" y1="8" x2="38" y2="8" stroke="${COULEUR_MUR}" stroke-width="1"/><line x1="2" y1="14" x2="38" y2="14" stroke="${COULEUR_MUR}" stroke-width="1"/>` },
]

export function tuilesParCategorie(): Record<TuileCategorie, TuileDef[]> {
  const out = { piece: [], couloir: [], escalier: [], porte: [], decor: [], mobilier: [] } as Record<TuileCategorie, TuileDef[]>
  for (const t of TUILES_DONJON) out[t.categorie].push(t)
  return out
}

export const CATEGORIES_LABELS: Record<TuileCategorie, string> = {
  piece: '🏛 Pièces',
  couloir: '↔ Couloirs',
  escalier: '⤴ Escaliers',
  porte: '🚪 Portes',
  decor: '🕯 Décor',
  mobilier: '🪑 Mobilier',
}
