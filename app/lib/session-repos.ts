// ============================================================================
// Repos court / Repos long en séance (Delta C.2)
// ----------------------------------------------------------------------------
// Le MJ applique un repos à TOUTE la table. Tout passe par character_live_state
// (donc les ronds d'usage des joueurs se recolorent en direct via le Realtime
// déjà en place) et chaque personnage affecté produit un session_event.
//
// Règles D&D 5e respectées :
//   - Repos court : seules les ressources marquées `recharge: 'court'`
//     reviennent. Les capacités `1/repos long` et `1/jour` ne bougent pas.
//     Emplacements de sorts : l'occultiste (pacte) récupère TOUS ses
//     emplacements ; les autres classes non (le magicien dispose de
//     « Restauration arcanique », qui est un choix du joueur, pas un automatisme).
//   - Repos long : toutes les ressources, tous les emplacements de sorts, PV au
//     maximum, PV temporaires et jets de mort remis à zéro.
// ============================================================================

import { supabase } from '@/lib/supabase'
import { fetchParticipants } from '@/app/lib/session'
import {
  fetchAllLiveStates,
  logSessionEvent,
  patchLiveState,
  type CharacterLiveState,
  type ClassResource
} from '@/app/lib/session-live'

export type TypeRepos = 'court' | 'long'

type PersoRepos = {
  id: string
  nom: string
  classe: string | null
  hp_max: number
}

/** L'occultiste récupère ses emplacements de pacte à chaque repos court. */
function recupereSlotsAuReposCourt(classe: string | null): boolean {
  const c = (classe ?? '').toLowerCase()
  return c.includes('occultiste') || c.includes('warlock')
}

/** Réinitialise les ressources concernées par le type de repos. */
function ressourcesApresRepos(
  res: Record<string, ClassResource>,
  type: TypeRepos
): Record<string, ClassResource> {
  const out: Record<string, ClassResource> = {}
  for (const [key, r] of Object.entries(res ?? {})) {
    const reset = type === 'long' || r.recharge === 'court'
    out[key] = reset ? { ...r, used: 0 } : r
  }
  return out
}

export type ResultatRepos = {
  type: TypeRepos
  personnages: string[] // noms des personnages affectés
}

/**
 * Applique un repos à tous les PJ de la session. Renvoie les noms touchés
 * (liste vide si la table n'a aucun personnage).
 */
export async function appliquerRepos(
  sessionId: string,
  type: TypeRepos,
  mjUserId: string | null
): Promise<ResultatRepos> {
  const parts = (await fetchParticipants(sessionId)).filter(
    (p) => p.role === 'joueur' && p.character_id
  )
  const ids = parts.map((p) => p.character_id as string)
  if (ids.length === 0) return { type, personnages: [] }

  const { data } = await supabase
    .from('personnages')
    .select('id, nom, classe, hp_max')
    .in('id', ids)
  const persos = ((data ?? []) as PersoRepos[])
  const lives = await fetchAllLiveStates(sessionId)
  const parPerso = new Map<string, CharacterLiveState>(lives.map((l) => [l.character_id, l]))

  const touches: string[] = []
  for (const p of persos) {
    const live = parParDefaut(parPerso.get(p.id))
    const patch: Partial<CharacterLiveState> = {
      class_resources_used: ressourcesApresRepos(live.class_resources_used, type)
    }

    if (type === 'long') {
      patch.spell_slots_used = {}
      patch.current_hp = p.hp_max
      patch.temp_hp = 0
      patch.death_saves = { success: 0, fail: 0 }
    } else if (recupereSlotsAuReposCourt(p.classe)) {
      patch.spell_slots_used = {}
    }

    await patchLiveState(sessionId, p.id, patch, mjUserId)
    await logSessionEvent(
      sessionId,
      'resource_used',
      {
        repos: type,
        cible: p.nom,
        slots_restaures: patch.spell_slots_used !== undefined,
        pv_restaures: type === 'long'
      },
      p.id
    )
    touches.push(p.nom)
  }
  return { type, personnages: touches }
}

/** État vivant par défaut si le personnage n'a pas encore de ligne. */
function parParDefaut(l: CharacterLiveState | undefined): CharacterLiveState {
  return (
    l ?? {
      session_id: '',
      character_id: '',
      current_hp: null,
      temp_hp: 0,
      max_hp_override: null,
      spell_slots_used: {},
      class_resources_used: {},
      conditions: [],
      concentration_spell: null,
      death_saves: { success: 0, fail: 0 },
      updated_at: '',
      updated_by: null
    }
  )
}
