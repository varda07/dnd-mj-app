// ============================================================================
// Types partagés du combat (Phase 5)
// ----------------------------------------------------------------------------
// Ces types vivaient dans `app/dashboard/presentation/page.tsx` — une PAGE — et
// étaient importés par le moteur de combat, les cockpits et tout le mode
// session. La suppression de l'ancien mode présentation les sort donc de la
// couche « page » pour les poser ici, à leur place : un module de la couche lib,
// sans dépendance à une route.
//
// Aucun changement de forme : les définitions sont reprises telles quelles.
// ============================================================================

import type { FogState } from '@/app/components/presentation/CombatCarte'
import type { AttaqueData } from '@/app/components/AttackRoller'

// Entrée d'initiative — tolère le schéma riche écrit par la page combat
// (piece_id / ref_id / init / image_url) ET l'ancien schéma simplifié
// ({ id }). On résout l'id d'entité via resolveEntiteId().
export type InitiativeEntry = {
  kind: 'perso' | 'ennemi'
  nom: string
  piece_id?: string
  ref_id?: string
  id?: string
  init?: number
  image_url?: string | null
}

// Résout l'UUID de l'entité (perso/ennemi) quel que soit le schéma.
export function resolveEntiteId(e: InitiativeEntry | null | undefined): string | null {
  if (!e) return null
  return e.ref_id ?? e.id ?? (e.piece_id ? e.piece_id.replace(/^(perso|ennemi)-/, '') : null)
}

export type EtatCombat = {
  status?: 'inconscient' | 'stabilise' | 'mort' | 'vaincu'
  death_success?: number
  death_failure?: number
  conditions_cachees?: string[]
}

export type CombatLite = {
  id?: string
  scenario_id: string
  round: number
  tour_actuel: number
  ordre_initiative: InitiativeEntry[]
  actif: boolean
  en_pause?: boolean
  etats_combat?: Record<string, EtatCombat>
  carte_id?: string | null
  carte_visible_joueurs?: boolean
  positions?: Record<string, { x: number; y: number }>
  // Brouillard de guerre de la carte tactique.
  fog?: FogState | null
}

export type Persona = {
  id: string
  nom: string
  classe: string | null
  niveau: number
  hp_actuel: number
  hp_max: number
  image_url: string | null
  conditions: string[]
  // CA pour la vue MJ.
  ca?: number | null
  // Caractéristiques pour le jet groupé (modificateurs auto).
  force?: number | null
  dexterite?: number | null
  constitution?: number | null
  intelligence?: number | null
  sagesse?: number | null
  charisme?: number | null
  // Maîtrises de sauvegarde (clé = nom long de la carac) pour le bonus de maîtrise.
  saves_maitrises?: Record<string, boolean> | null
}

export type Ennemi = {
  id: string
  nom: string
  hp_actuel: number
  hp_max: number
  image_url: string | null
  conditions: string[]
  // Stats MJ — jamais montrées telles quelles aux joueurs : la vue joueurs
  // n'affiche qu'un état qualitatif.
  // NB : la CA ennemie est la colonne `armure` ; la tactique est
  // `comportement_tactique` (colonnes déjà existantes).
  armure?: number | null
  attaques?: AttaqueData[]
  resistances?: string[]
  immunites?: string[]
  vulnerabilites?: string[]
  comportement_tactique?: string | null
  force?: number | null
  dexterite?: number | null
  constitution?: number | null
  intelligence?: number | null
  sagesse?: number | null
  charisme?: number | null
}
