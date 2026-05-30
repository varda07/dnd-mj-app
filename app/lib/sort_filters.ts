// ============================================================================
// Roadmap Affinement 2.8 — Détection de catégorie / effets sur les sorts
// ----------------------------------------------------------------------------
// Heuristiques par mots-clés sur la description. Pas parfait mais utile :
// permet de filtrer un sort "offensif / soin / contrôle / défensif / utilitaire"
// sans avoir à modéliser explicitement chaque sort.
// ============================================================================

export type SortCategorie = 'offensif' | 'soin' | 'controle' | 'defensif' | 'utilitaire'

export type TypeDegats = 'feu' | 'glace' | 'froid' | 'foudre' | 'acide' | 'nécrotique' | 'radiant' | 'psychique' | 'tonnerre' | 'force' | 'tranchant' | 'perforant' | 'contondant' | 'poison'

export type Sauvegarde = 'FOR' | 'DEX' | 'CON' | 'INT' | 'SAG' | 'CHA'

const KW_OFFENSIF = ['dégâts', 'damage', 'attaque', 'inflige', 'projet', 'éclair', 'explosion', 'rayon', 'boule de feu', 'fireball', 'magic missile', 'projectile']
const KW_SOIN = ['soigne', 'soin', 'restaure', 'récupère', 'point de vie', 'pv perdu', 'guérit', 'régénère', 'cure', 'heal']
const KW_CONTROLE = ['paralysé', 'étourdi', 'charmé', 'apeuré', 'endormi', 'aveuglé', 'sourd', 'entravé', 'à terre', 'incapacité', 'silence', 'sommeil', 'hypnose', 'hold', 'stun']
const KW_DEFENSIF = ['bouclier', 'protection', 'résistance', 'immunité', 'absorbe', 'sanctuary', 'shield', 'armure', 'CA bonus']
const KW_UTILITAIRE = ['invisib', 'téléport', 'déplace', 'communiqu', 'lévit', 'détect', 'vol ', 'pas brumeux', 'misty step', 'message', 'mémorise', 'identifie', 'invisibility']

const DEGATS_REGEX: Array<{ type: TypeDegats; re: RegExp }> = [
  { type: 'feu',         re: /\bfeu|flamme|brûl|fire\b/i },
  { type: 'glace',       re: /\bglace|gèle|ice\b/i },
  { type: 'froid',       re: /\bfroid|cold|frigorif/i },
  { type: 'foudre',      re: /\bfoudre|éclair|lightning\b/i },
  { type: 'acide',       re: /\bacid/i },
  { type: 'nécrotique',  re: /\bnécro|necr/i },
  { type: 'radiant',     re: /\bradiant|sacré|holy/i },
  { type: 'psychique',   re: /\bpsychi|psy/i },
  { type: 'tonnerre',    re: /\btonnerre|thunder/i },
  { type: 'force',       re: /\bforce\b|\bbforce/i },
  { type: 'poison',      re: /\bpoison|toxique|venin/i },
  { type: 'tranchant',   re: /\btranchant|slashing/i },
  { type: 'perforant',   re: /\bperforant|piercing/i },
  { type: 'contondant',  re: /\bcontondant|bludgeon/i },
]

const SAUVEGARDE_REGEX: Array<{ s: Sauvegarde; re: RegExp }> = [
  { s: 'FOR', re: /\bsauveg.+force|jet.+force|saving throw.+strength/i },
  { s: 'DEX', re: /\bsauveg.+dex|jet.+dex|saving throw.+dex/i },
  { s: 'CON', re: /\bsauveg.+constitution|jet.+constitution|saving throw.+constitution/i },
  { s: 'INT', re: /\bsauveg.+intelligence|jet.+intelligence|saving throw.+intelligence/i },
  { s: 'SAG', re: /\bsauveg.+sagesse|jet.+sagesse|saving throw.+wisdom/i },
  { s: 'CHA', re: /\bsauveg.+charisme|jet.+charisme|saving throw.+charisma/i },
]

function compteKw(text: string, kws: string[]): number {
  const lo = text.toLowerCase()
  return kws.reduce((n, k) => (lo.includes(k) ? n + 1 : n), 0)
}

export function categoriesSort(description: string, nom?: string): SortCategorie[] {
  const t = `${nom ?? ''} ${description}`
  const cats: SortCategorie[] = []
  if (compteKw(t, KW_OFFENSIF) > 0) cats.push('offensif')
  if (compteKw(t, KW_SOIN) > 0) cats.push('soin')
  if (compteKw(t, KW_CONTROLE) > 0) cats.push('controle')
  if (compteKw(t, KW_DEFENSIF) > 0) cats.push('defensif')
  if (compteKw(t, KW_UTILITAIRE) > 0) cats.push('utilitaire')
  if (cats.length === 0) cats.push('utilitaire')
  return cats
}

export function typesDegatsSort(description: string): TypeDegats[] {
  const out: TypeDegats[] = []
  for (const { type, re } of DEGATS_REGEX) {
    if (re.test(description)) out.push(type)
  }
  return out
}

export function sauvegardesSort(description: string): Sauvegarde[] {
  const out: Sauvegarde[] = []
  for (const { s, re } of SAUVEGARDE_REGEX) {
    if (re.test(description)) out.push(s)
  }
  return out
}

export const CATEGORIES_META: Record<SortCategorie, { label: string; icon: string; color: string }> = {
  offensif:   { label: 'Offensif',   icon: '🔥', color: '#f87171' },
  soin:       { label: 'Soin',       icon: '💚', color: '#4ade80' },
  controle:   { label: 'Contrôle',   icon: '🌀', color: '#a78bfa' },
  defensif:   { label: 'Défensif',   icon: '🛡',  color: '#60a5fa' },
  utilitaire: { label: 'Utilitaire', icon: '🌟', color: '#fbbf24' },
}

export const TYPES_DEGATS_META: Record<TypeDegats, { label: string; icon: string }> = {
  feu:        { label: 'Feu',        icon: '🔥' },
  glace:      { label: 'Glace',      icon: '🧊' },
  froid:      { label: 'Froid',      icon: '❄️' },
  foudre:     { label: 'Foudre',     icon: '⚡' },
  acide:      { label: 'Acide',      icon: '🧪' },
  nécrotique: { label: 'Nécrotique', icon: '💀' },
  radiant:    { label: 'Radiant',    icon: '✨' },
  psychique:  { label: 'Psychique',  icon: '🧠' },
  tonnerre:   { label: 'Tonnerre',   icon: '💥' },
  force:      { label: 'Force',      icon: '💫' },
  tranchant:  { label: 'Tranchant',  icon: '⚔️' },
  perforant:  { label: 'Perforant',  icon: '🗡' },
  contondant: { label: 'Contondant', icon: '🔨' },
  poison:     { label: 'Poison',     icon: '☠️' },
}

export const SAUVEGARDES_META: Record<Sauvegarde, { label: string; full: string }> = {
  FOR: { label: 'FOR', full: 'Force' },
  DEX: { label: 'DEX', full: 'Dextérité' },
  CON: { label: 'CON', full: 'Constitution' },
  INT: { label: 'INT', full: 'Intelligence' },
  SAG: { label: 'SAG', full: 'Sagesse' },
  CHA: { label: 'CHA', full: 'Charisme' },
}
