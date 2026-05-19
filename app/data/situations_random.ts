// ============================================================================
// Roadmap Phase 4 — Templates de situations random
// ============================================================================
// Une "situation" = un préset de rencontre que le MJ peut déclencher rapidement.
// Le sélecteur d'ennemis est juste un filtre `pickFromBestiaire` qui pioche
// dans BESTIAIRE_DND5E selon des tags (type de monstre + plage de CR) en
// fonction du niveau moyen des PJ.
// ============================================================================

import { BESTIAIRE_DND5E, type Monstre } from './bestiaire_dnd5e'

export type SituationFilter = {
  // Tag(s) à matcher dans le nom du monstre (insensible à la casse).
  motsCles?: string[]
  // Type officiel ('Bête', 'Humanoïde', 'Mort-vivant', etc.) — peut être multiple.
  types?: string[]
  // Quantité d'ennemis à piocher (peut dépendre du niveau moyen).
  quantite: (niveauMoyen: number) => number
  // Plage de CR autorisée (min, max). Si absent, on autorise tout.
  crMin?: number
  crMax?: number
}

export type Situation = {
  id: string
  titre: string
  description: string
  icone: string
  filters: SituationFilter[]
}

export const SITUATIONS: Situation[] = [
  {
    id: 'bagarre-taverne',
    titre: 'Bagarre dans une taverne',
    description: 'Une dispute dégénère. Des bandits ou ivrognes en viennent aux mains.',
    icone: '🍺',
    filters: [
      {
        motsCles: ['bandit', 'voleur', 'humain'],
        types: ['Humanoïde'],
        quantite: (n) => Math.min(3, Math.max(1, Math.floor(n / 2))),
        crMin: 0.125,
        crMax: 1
      }
    ]
  },
  {
    id: 'embuscade-foret',
    titre: 'Embuscade en forêt',
    description: 'Loups, gobelins ou bandits embusquent les voyageurs.',
    icone: '🌲',
    filters: [
      {
        motsCles: ['loup', 'gobelin', 'bandit'],
        quantite: (n) => 2 + Math.floor(n / 3),
        crMin: 0.125,
        crMax: 1
      }
    ]
  },
  {
    id: 'attaque-betes',
    titre: 'Attaque de bêtes sauvages',
    description: 'Une meute affamée attaque le groupe.',
    icone: '🐺',
    filters: [
      {
        motsCles: ['loup', 'ours', 'sanglier', 'aigle'],
        types: ['Bête'],
        quantite: (n) => Math.min(4, 1 + Math.floor(n / 3)),
        crMin: 0.25,
        crMax: 3
      }
    ]
  },
  {
    id: 'voleurs-ruelle',
    titre: 'Voleurs dans une ruelle',
    description: 'Deux voleurs sortent l\'arme à la main.',
    icone: '🗡️',
    filters: [
      {
        motsCles: ['bandit', 'voleur'],
        types: ['Humanoïde'],
        quantite: () => 2,
        crMin: 0.125,
        crMax: 0.5
      }
    ]
  },
  {
    id: 'patrouille-hostile',
    titre: 'Patrouille hostile',
    description: 'Gardes ou soldats reconnaissent le groupe et chargent.',
    icone: '🛡️',
    filters: [
      {
        motsCles: ['orc', 'hobgobelin', 'soldat'],
        types: ['Humanoïde'],
        quantite: (n) => 2 + Math.floor(n / 4),
        crMin: 0.25,
        crMax: 2
      }
    ]
  },
  {
    id: 'crypte-mortvivants',
    titre: 'Créatures dans une crypte',
    description: 'Squelettes et zombies se réveillent.',
    icone: '⚰️',
    filters: [
      {
        motsCles: ['squelette', 'zombie', 'goule'],
        types: ['Mort-vivant'],
        quantite: (n) => 2 + Math.floor(n / 2),
        crMin: 0.125,
        crMax: 2
      }
    ]
  },
  {
    id: 'bandits-grand-chemin',
    titre: 'Bandits de grand chemin',
    description: '3 à 5 bandits surgissent et exigent un péage.',
    icone: '🏹',
    filters: [
      {
        motsCles: ['bandit'],
        types: ['Humanoïde'],
        quantite: () => 4,
        crMin: 0.125,
        crMax: 1
      }
    ]
  },
  {
    id: 'cultistes-rituel',
    titre: 'Cultistes en rituel',
    description: 'Un rituel sombre est en cours. L\'invocation s\'éveille.',
    icone: '🕯️',
    filters: [
      {
        motsCles: ['cultiste', 'fanatique', 'sorcier'],
        types: ['Humanoïde'],
        quantite: (n) => 2 + Math.floor(n / 3),
        crMin: 0.125,
        crMax: 1
      },
      {
        motsCles: ['démon', 'diablotin', 'fiélon'],
        types: ['Fiélon'],
        quantite: () => 1,
        crMin: 1,
        crMax: 5
      }
    ]
  },
  {
    id: 'mercenaires',
    titre: 'Mercenaires',
    description: 'Des mercenaires bien équipés attaquent.',
    icone: '⚔️',
    filters: [
      {
        motsCles: ['orc', 'humain', 'hobgobelin'],
        types: ['Humanoïde'],
        quantite: (n) => 2 + Math.floor(n / 3),
        crMin: 0.5,
        crMax: 3
      }
    ]
  },
  {
    id: 'aquatiques',
    titre: 'Créatures aquatiques',
    description: 'Sahuagins ou autres horreurs sortent de l\'eau.',
    icone: '🌊',
    filters: [
      {
        motsCles: ['sahuagin', 'kuo-toa', 'crocodile', 'serpent'],
        quantite: (n) => 2 + Math.floor(n / 4),
        crMin: 0.25,
        crMax: 3
      }
    ]
  },
  {
    id: 'donjon',
    titre: 'Monstres de donjon',
    description: 'Des créatures variées rôdent dans les couloirs.',
    icone: '🗝️',
    filters: [
      {
        quantite: (n) => 2 + Math.floor(n / 3),
        crMin: Math.max(0.125, 0.25),
        crMax: 5
      }
    ]
  },
  {
    id: 'politique',
    titre: 'Encounter politique',
    description: 'Des PNJ hostiles bloquent le passage — pas forcément combat.',
    icone: '🎭',
    filters: [
      {
        motsCles: ['noble', 'humain', 'garde'],
        types: ['Humanoïde'],
        quantite: () => 2,
        crMin: 0.125,
        crMax: 1
      }
    ]
  }
]

// ============================================================================
// Sélection d'ennemis pour une situation, selon le niveau moyen des PJ
// ============================================================================

// Mapping niveau PJ → plage CR cible. Très conservateur.
function fenetreCrPourNiveau(n: number): { min: number; max: number } {
  if (n <= 1) return { min: 0, max: 0.25 }
  if (n <= 3) return { min: 0.125, max: 1 }
  if (n <= 5) return { min: 0.25, max: 3 }
  if (n <= 8) return { min: 0.5, max: 5 }
  if (n <= 12) return { min: 1, max: 8 }
  return { min: 2, max: 15 }
}

export function pickEnnemisPourSituation(
  situation: Situation,
  niveauMoyen: number
): Monstre[] {
  const fenetreCr = fenetreCrPourNiveau(niveauMoyen)
  const out: Monstre[] = []

  for (const filtre of situation.filters) {
    const crMin = Math.max(filtre.crMin ?? 0, fenetreCr.min)
    const crMax = Math.min(filtre.crMax ?? 30, fenetreCr.max)

    const candidats = BESTIAIRE_DND5E.filter((m) => {
      if (m.cd < crMin || m.cd > crMax) return false
      if (filtre.types && filtre.types.length > 0 && !filtre.types.includes(m.type)) return false
      if (filtre.motsCles && filtre.motsCles.length > 0) {
        const n = m.nom.toLowerCase()
        const hit = filtre.motsCles.some((kw) => n.includes(kw.toLowerCase()))
        if (!hit) return false
      }
      return true
    })

    if (candidats.length === 0) {
      // Si aucun candidat ne matche les mots-clés, on relâche la contrainte
      // sur les mots-clés et on garde juste le filtre CR/type.
      const fallback = BESTIAIRE_DND5E.filter(
        (m) => m.cd >= crMin && m.cd <= crMax && (!filtre.types || filtre.types.includes(m.type))
      )
      if (fallback.length === 0) continue
      const qty = filtre.quantite(niveauMoyen)
      for (let i = 0; i < qty; i++) {
        out.push(fallback[Math.floor(Math.random() * fallback.length)])
      }
      continue
    }

    const qty = filtre.quantite(niveauMoyen)
    for (let i = 0; i < qty; i++) {
      out.push(candidats[Math.floor(Math.random() * candidats.length)])
    }
  }

  return out
}
