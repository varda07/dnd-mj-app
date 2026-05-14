// Tables de butin inspirées de D&D 5e (roadmap 2.3).
// Approche simplifiée des « Treasure Hoard » par paliers de CR : on génère des
// pièces, éventuellement des gemmes / objets d'art, et un éventuel objet
// magique. C'est une aide de jeu, pas une reproduction exacte du DMG.

export type PalierCR = 'cr_0_4' | 'cr_5_10' | 'cr_11_16' | 'cr_17_plus'

export type LootGenere = {
  palier: PalierCR
  pieces: { cuivre: number; argent: number; or: number; platine: number }
  gemmes: string[]
  objetsArt: string[]
  itemsMagiques: string[]
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const dN = (n: number) => Math.floor(Math.random() * n) + 1
const roll = (nb: number, faces: number) => {
  let t = 0
  for (let i = 0; i < nb; i++) t += dN(faces)
  return t
}

// Palier de butin déduit du CR de l'ennemi.
export function palierPourCR(cr: number): PalierCR {
  if (cr <= 4) return 'cr_0_4'
  if (cr <= 10) return 'cr_5_10'
  if (cr <= 16) return 'cr_11_16'
  return 'cr_17_plus'
}

const GEMMES = [
  'Quartz fumé (10 po)',
  'Œil-de-tigre (10 po)',
  'Cornaline (50 po)',
  'Jade (50 po)',
  'Perle (100 po)',
  'Topaze (500 po)',
  'Émeraude (1000 po)',
  'Diamant (5000 po)'
]

const OBJETS_ART = [
  'Statuette d’argent ouvragée (25 po)',
  'Bracelet d’or serti (250 po)',
  'Calice doré incrusté de gemmes (750 po)',
  'Tapisserie ancienne brodée de fil d’or (2500 po)',
  'Couronne sertie de joyaux (7500 po)'
]

const ITEMS_MINEURS = [
  'Potion de soins',
  'Parchemin de sort (niveau 1)',
  'Munition +1 (10 unités)',
  'Sac sans fond (mineur)',
  'Fiole d’eau bénite',
  'Potion d’escalade'
]
const ITEMS_MAJEURS = [
  'Arme +1',
  'Armure +1',
  'Anneau de protection',
  'Bottes elfiques',
  'Cape de déplacement',
  'Bâton de la sève',
  'Potion de soins supérieurs',
  'Parchemin de sort (niveau 3-5)'
]
const ITEMS_LEGENDAIRES = [
  'Arme +2 ou +3',
  'Armure +2',
  'Anneau de régénération',
  'Manteau de l’archimage',
  'Épée vorpale (rare butin)',
  'Potion de soins suprêmes'
]

// Génère un butin pour un palier de CR. `genereraitItemMagique` peut être
// forcé ; sinon la chance dépend du palier.
export function genererLoot(palier: PalierCR): LootGenere {
  const out: LootGenere = {
    palier,
    pieces: { cuivre: 0, argent: 0, or: 0, platine: 0 },
    gemmes: [],
    objetsArt: [],
    itemsMagiques: []
  }

  if (palier === 'cr_0_4') {
    out.pieces.cuivre = roll(6, 6) * 100
    out.pieces.argent = roll(3, 6) * 100
    out.pieces.or = roll(2, 6) * 10
    if (Math.random() < 0.4) out.gemmes.push(pick(GEMMES.slice(0, 4)))
    if (Math.random() < 0.25) out.itemsMagiques.push(pick(ITEMS_MINEURS))
  } else if (palier === 'cr_5_10') {
    out.pieces.argent = roll(2, 6) * 100
    out.pieces.or = roll(6, 6) * 100
    out.pieces.platine = roll(3, 6) * 10
    if (Math.random() < 0.6) out.gemmes.push(pick(GEMMES.slice(2, 6)))
    if (Math.random() < 0.4) out.objetsArt.push(pick(OBJETS_ART.slice(0, 3)))
    if (Math.random() < 0.5) out.itemsMagiques.push(pick(ITEMS_MAJEURS))
  } else if (palier === 'cr_11_16') {
    out.pieces.or = roll(4, 6) * 1000
    out.pieces.platine = roll(5, 6) * 100
    out.gemmes.push(pick(GEMMES.slice(4, 8)))
    if (Math.random() < 0.7) out.objetsArt.push(pick(OBJETS_ART.slice(2)))
    out.itemsMagiques.push(pick(ITEMS_MAJEURS))
    if (Math.random() < 0.4) out.itemsMagiques.push(pick(ITEMS_LEGENDAIRES))
  } else {
    out.pieces.or = roll(12, 6) * 1000
    out.pieces.platine = roll(8, 6) * 100
    out.gemmes.push(pick(GEMMES.slice(5)), pick(GEMMES.slice(5)))
    out.objetsArt.push(pick(OBJETS_ART.slice(3)))
    out.itemsMagiques.push(pick(ITEMS_LEGENDAIRES))
    if (Math.random() < 0.6) out.itemsMagiques.push(pick(ITEMS_LEGENDAIRES))
  }
  return out
}

// Met le butin en forme texte lisible (pour pré-remplir des notes / loot).
export function formaterLoot(loot: LootGenere): string {
  const p = loot.pieces
  const lignesPieces = [
    p.platine > 0 ? `${p.platine} pp` : '',
    p.or > 0 ? `${p.or} po` : '',
    p.argent > 0 ? `${p.argent} pa` : '',
    p.cuivre > 0 ? `${p.cuivre} pc` : ''
  ].filter(Boolean)
  const lignes: string[] = []
  if (lignesPieces.length) lignes.push(`Pièces : ${lignesPieces.join(', ')}`)
  if (loot.gemmes.length) lignes.push(`Gemmes : ${loot.gemmes.join(', ')}`)
  if (loot.objetsArt.length) lignes.push(`Objets d'art : ${loot.objetsArt.join(', ')}`)
  if (loot.itemsMagiques.length)
    lignes.push(`Objets magiques : ${loot.itemsMagiques.join(', ')}`)
  return lignes.join('\n') || 'Aucun butin notable.'
}
