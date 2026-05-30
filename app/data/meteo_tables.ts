// ============================================================================
// Roadmap Affinement 2.4 — Tables de météo aléatoires (D&D 5e XGtE inspirées)
// ----------------------------------------------------------------------------
// Génération météo selon saison + biome. Renvoie un objet structurant
// température, précipitations, vent, visibilité et effets gameplay.
// ============================================================================

export type Saison = 'printemps' | 'été' | 'automne' | 'hiver'
export type Biome =
  | 'plaine'
  | 'foret'
  | 'montagne'
  | 'desert'
  | 'marais'
  | 'cotier'
  | 'arctique'
  | 'jungle'
  | 'urbain'
  | 'souterrain'

export type MeteoResult = {
  saison: Saison
  biome: Biome
  temperature: string
  precipitations: string
  vent: string
  visibilite: string
  description: string
  effets: string[]
}

// --- Helpers tirages pondérés ---
function tirer<T>(table: Array<{ poids: number; valeur: T }>): T {
  const total = table.reduce((s, t) => s + t.poids, 0)
  let r = Math.random() * total
  for (const t of table) {
    r -= t.poids
    if (r <= 0) return t.valeur
  }
  return table[table.length - 1].valeur
}

// --- Températures (modifiées par saison + biome) ---
function tempBase(saison: Saison, biome: Biome): { label: string; modPasses: string[] } {
  // Tableaux simplifiés
  if (biome === 'desert') {
    if (saison === 'été') return { label: 'Brûlant (38-45 °C)', modPasses: ['désavantage à la CON après 1h sans eau', 'jets de SUR forcés'] }
    if (saison === 'hiver') return { label: 'Doux le jour, glacial la nuit', modPasses: ['feu de camp recommandé la nuit'] }
    return { label: 'Chaud sec (28-35 °C)', modPasses: [] }
  }
  if (biome === 'arctique') {
    if (saison === 'été') return { label: 'Frais (5-12 °C)', modPasses: [] }
    return { label: 'Glacial (-15 à -30 °C)', modPasses: ['dégâts froid sans vêtements adaptés', 'CON DC 10 toutes les heures'] }
  }
  if (biome === 'jungle') {
    return { label: 'Étouffant (30-38 °C, humide)', modPasses: ['désavantage à la CON pour les efforts soutenus'] }
  }
  if (biome === 'montagne') {
    if (saison === 'hiver') return { label: 'Très froid (-10 à -5 °C)', modPasses: ['altitude : désavantage à la CON'] }
    if (saison === 'été') return { label: 'Frais en altitude (8-15 °C)', modPasses: [] }
    return { label: 'Froid (0-8 °C)', modPasses: [] }
  }
  if (biome === 'souterrain') {
    return { label: 'Constant (10-14 °C)', modPasses: ['pas d’effet météo direct'] }
  }
  // Default: plaine/foret/cotier/marais/urbain
  if (saison === 'hiver') return { label: 'Froid (-2 à 5 °C)', modPasses: [] }
  if (saison === 'été') return { label: 'Chaud (22-28 °C)', modPasses: [] }
  if (saison === 'automne') return { label: 'Frais (8-15 °C)', modPasses: [] }
  return { label: 'Doux (12-18 °C)', modPasses: [] }
}

// --- Précipitations ---
function tirerPrecip(saison: Saison, biome: Biome): { label: string; effets: string[] } {
  if (biome === 'desert') {
    return tirer([
      { poids: 90, valeur: { label: 'Aucune précipitation', effets: [] } },
      { poids: 8,  valeur: { label: 'Vent de sable', effets: ['visibilité réduite à 18 m', 'désavantage aux attaques à distance'] } },
      { poids: 2,  valeur: { label: 'Pluie torrentielle (rare)', effets: ['ruisseaux soudains, risque de crue éclair'] } },
    ])
  }
  if (biome === 'arctique') {
    return tirer([
      { poids: 50, valeur: { label: 'Aucune précipitation', effets: [] } },
      { poids: 30, valeur: { label: 'Neige légère', effets: ['visibilité légèrement réduite'] } },
      { poids: 15, valeur: { label: 'Tempête de neige', effets: ['désavantage à la PER vue/ouïe', 'difficile de progresser : mouvement /2'] } },
      { poids: 5,  valeur: { label: 'Blizzard', effets: ['désavantage à toutes les attaques', 'CON DC 15/heure ou 1d4 froid'] } },
    ])
  }
  if (biome === 'jungle' || biome === 'marais') {
    return tirer([
      { poids: 30, valeur: { label: 'Aucune précipitation', effets: [] } },
      { poids: 40, valeur: { label: 'Pluie modérée', effets: ['désavantage à la PER vue/ouïe'] } },
      { poids: 25, valeur: { label: 'Pluie torrentielle', effets: ['désavantage à la PER', 'attaques à distance désavantage', 'feu éteint'] } },
      { poids: 5,  valeur: { label: 'Orage tropical', effets: ['risques d’éclairs : 1 % de toucher une cible métallique', 'PER désavantage'] } },
    ])
  }
  // Defaults par saison
  if (saison === 'hiver') {
    return tirer([
      { poids: 50, valeur: { label: 'Aucune précipitation', effets: [] } },
      { poids: 25, valeur: { label: 'Neige légère', effets: ['terrain difficile par endroits'] } },
      { poids: 15, valeur: { label: 'Pluie froide', effets: ['désavantage à la PER vue'] } },
      { poids: 10, valeur: { label: 'Tempête de neige', effets: ['visibilité < 30 m', 'mouvement /2'] } },
    ])
  }
  if (saison === 'printemps' || saison === 'automne') {
    return tirer([
      { poids: 40, valeur: { label: 'Aucune précipitation', effets: [] } },
      { poids: 35, valeur: { label: 'Pluie légère', effets: [] } },
      { poids: 15, valeur: { label: 'Pluie modérée', effets: ['désavantage à la PER vue/ouïe'] } },
      { poids: 8,  valeur: { label: 'Pluie torrentielle', effets: ['désavantage attaques à distance', 'feu éteint'] } },
      { poids: 2,  valeur: { label: 'Orage', effets: ['éclairs sporadiques', 'PER désavantage'] } },
    ])
  }
  return tirer([
    { poids: 65, valeur: { label: 'Aucune précipitation', effets: [] } },
    { poids: 20, valeur: { label: 'Averse passagère', effets: [] } },
    { poids: 10, valeur: { label: 'Orage', effets: ['éclairs', 'PER désavantage'] } },
    { poids: 5,  valeur: { label: 'Canicule sèche', effets: ['désavantage à la CON après 4h sans eau'] } },
  ])
}

// --- Vent ---
function tirerVent(): { label: string; effets: string[] } {
  return tirer([
    { poids: 50, valeur: { label: 'Calme', effets: [] } },
    { poids: 30, valeur: { label: 'Léger', effets: [] } },
    { poids: 15, valeur: { label: 'Fort', effets: ['désavantage aux attaques à distance à plus de 30 m'] } },
    { poids: 5,  valeur: { label: 'Tempétueux', effets: ['désavantage à toutes les attaques à distance', 'extinction des feux non protégés'] } },
  ])
}

// --- Visibilité ---
function tirerVisibilite(precipLabel: string, biome: Biome): { label: string; effets: string[] } {
  if (precipLabel.includes('Blizzard') || precipLabel.includes('Tempête')) return { label: '< 30 m', effets: ['traque/embuscade favorisées'] }
  if (biome === 'souterrain') return { label: 'Dépendante des sources de lumière', effets: [] }
  if (biome === 'marais') return tirer([
    { poids: 50, valeur: { label: 'Brouillard léger', effets: ['désavantage PER vue à 30+ m'] } },
    { poids: 30, valeur: { label: 'Brouillard épais', effets: ['portée vue réduite à 18 m'] } },
    { poids: 20, valeur: { label: 'Dégagé', effets: [] } },
  ])
  return tirer([
    { poids: 65, valeur: { label: 'Excellente', effets: [] } },
    { poids: 25, valeur: { label: 'Modérée (brume)', effets: ['PER vue désavantage à 60+ m'] } },
    { poids: 10, valeur: { label: 'Faible (brouillard)', effets: ['portée vue 18-30 m', 'désavantage PER vue'] } },
  ])
}

export function genererMeteo(saison: Saison, biome: Biome): MeteoResult {
  const temp = tempBase(saison, biome)
  const precip = tirerPrecip(saison, biome)
  const vent = tirerVent()
  const vis = tirerVisibilite(precip.label, biome)

  const effets = [...temp.modPasses, ...precip.effets, ...vent.effets, ...vis.effets].filter((e, i, a) => a.indexOf(e) === i)

  // Description littéraire courte
  const desc = `${precip.label === 'Aucune précipitation' ? 'Le ciel est dégagé' : precip.label}. Le vent souffle de façon ${vent.label.toLowerCase()}. Visibilité : ${vis.label.toLowerCase()}.`

  return {
    saison,
    biome,
    temperature: temp.label,
    precipitations: precip.label,
    vent: vent.label,
    visibilite: vis.label,
    description: desc,
    effets,
  }
}

export const SAISONS_LABELS: Record<Saison, string> = {
  printemps: '🌱 Printemps',
  'été': '☀️ Été',
  automne: '🍂 Automne',
  hiver: '❄️ Hiver',
}

export const BIOMES_LABELS: Record<Biome, string> = {
  plaine: '🌾 Plaine',
  foret: '🌲 Forêt',
  montagne: '⛰ Montagne',
  desert: '🏜 Désert',
  marais: '🪷 Marais',
  cotier: '🌊 Côtier',
  arctique: '🧊 Arctique',
  jungle: '🌴 Jungle',
  urbain: '🏛 Urbain',
  souterrain: '🕳 Souterrain',
}
