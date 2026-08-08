// ============================================================================
// Inventaire des personnages — hooks CRUD (Phase 2.5)
// ----------------------------------------------------------------------------
// Couche au-dessus de Supabase pour la table `personnage_inventaire`. Utilisée
// par la fiche de personnage et, plus tard, par l'onglet « Sac » de l'interface
// PJ. RLS : joueur propriétaire OU MJ de la session — géré côté base.
// ============================================================================

import { supabase } from '@/lib/supabase'

export type TypeObjet = 'arme' | 'armure' | 'consommable' | 'outil' | 'objet'

export type ObjetInventaire = {
  id: string
  personnage_id: string
  nom: string
  type: TypeObjet
  quantite: number
  usages_max: number | null
  usages_utilises: number
  description: string
  equipe: boolean
  ordre: number
  created_at: string
  updated_at: string
}

const SELECT =
  'id, personnage_id, nom, type, quantite, usages_max, usages_utilises, description, equipe, ordre, created_at, updated_at'

// ----------------------------------------------------------------------------
// Lecture
// ----------------------------------------------------------------------------
export async function fetchInventaire(personnageId: string): Promise<ObjetInventaire[]> {
  const { data, error } = await supabase
    .from('personnage_inventaire')
    .select(SELECT)
    .eq('personnage_id', personnageId)
    .order('ordre', { ascending: true })
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data as ObjetInventaire[]
}

// ----------------------------------------------------------------------------
// Ajouter un objet
// ----------------------------------------------------------------------------
export async function ajouterObjet(
  personnageId: string,
  objet: Partial<Omit<ObjetInventaire, 'id' | 'personnage_id' | 'created_at' | 'updated_at'>> & {
    nom: string
  }
): Promise<ObjetInventaire | null> {
  const { data, error } = await supabase
    .from('personnage_inventaire')
    .insert({
      personnage_id: personnageId,
      nom: objet.nom,
      type: objet.type ?? 'objet',
      quantite: objet.quantite ?? 1,
      usages_max: objet.usages_max ?? null,
      usages_utilises: objet.usages_utilises ?? 0,
      description: objet.description ?? '',
      equipe: objet.equipe ?? false,
      ordre: objet.ordre ?? 0
    })
    .select(SELECT)
    .single()
  if (error || !data) return null
  return data as ObjetInventaire
}

// ----------------------------------------------------------------------------
// Modifier un objet (patch partiel)
// ----------------------------------------------------------------------------
export async function modifierObjet(
  id: string,
  patch: Partial<Omit<ObjetInventaire, 'id' | 'personnage_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  const { error } = await supabase.from('personnage_inventaire').update(patch).eq('id', id)
  return !error
}

// ----------------------------------------------------------------------------
// Supprimer un objet
// ----------------------------------------------------------------------------
export async function supprimerObjet(id: string): Promise<boolean> {
  const { error } = await supabase.from('personnage_inventaire').delete().eq('id', id)
  return !error
}

// ----------------------------------------------------------------------------
// Changer la quantité (delta ; supprime si la quantité tombe à 0 ou moins)
// ----------------------------------------------------------------------------
export async function changerQuantite(
  objet: ObjetInventaire,
  delta: number
): Promise<{ supprime: boolean; quantite: number }> {
  const nouvelle = objet.quantite + delta
  if (nouvelle <= 0) {
    await supprimerObjet(objet.id)
    return { supprime: true, quantite: 0 }
  }
  await modifierObjet(objet.id, { quantite: nouvelle })
  return { supprime: false, quantite: nouvelle }
}

// ----------------------------------------------------------------------------
// Consommer / restituer un usage (borné à [0, usages_max])
// ----------------------------------------------------------------------------
export async function consommerUsage(objet: ObjetInventaire): Promise<number> {
  const max = objet.usages_max ?? Infinity
  const prochain = Math.min(max, objet.usages_utilises + 1)
  await modifierObjet(objet.id, { usages_utilises: prochain })
  return prochain
}

export async function restituerUsage(objet: ObjetInventaire): Promise<number> {
  const prochain = Math.max(0, objet.usages_utilises - 1)
  await modifierObjet(objet.id, { usages_utilises: prochain })
  return prochain
}

// ----------------------------------------------------------------------------
// Monnaie (colonnes sur `personnages`)
// ----------------------------------------------------------------------------
export type Monnaie = { pc: number; pa: number; pe: number; po: number; pp: number }
export const MONNAIES: Array<{ key: keyof Monnaie; label: string; long: string }> = [
  { key: 'pc', label: 'PC', long: 'Cuivre' },
  { key: 'pa', label: 'PA', long: 'Argent' },
  { key: 'pe', label: 'PE', long: 'Électrum' },
  { key: 'po', label: 'PO', long: 'Or' },
  { key: 'pp', label: 'PP', long: 'Platine' }
]
