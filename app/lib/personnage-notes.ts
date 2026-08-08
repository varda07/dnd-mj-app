// ============================================================================
// Notes personnelles du joueur — accès base (table personnage_notes)
// ----------------------------------------------------------------------------
// Notes PRIVÉES attachées au personnage, pas à la séance : elles survivent d'une
// session à l'autre et suivent le joueur d'un appareil à l'autre. La RLS ne
// laisse passer que leur auteur — le MJ n'y a aucun accès.
// ============================================================================

import { supabase } from '@/lib/supabase'

export type NotesPersonnage = {
  contenu: string
  updated_at: string | null
}

export async function fetchNotesPersonnage(
  personnageId: string,
  userId: string
): Promise<NotesPersonnage | null> {
  const { data } = await supabase
    .from('personnage_notes')
    .select('contenu, updated_at')
    .eq('personnage_id', personnageId)
    .eq('user_id', userId)
    .maybeSingle()
  return data ? (data as NotesPersonnage) : null
}

export async function saveNotesPersonnage(
  personnageId: string,
  userId: string,
  contenu: string
): Promise<boolean> {
  const { error } = await supabase.from('personnage_notes').upsert(
    { personnage_id: personnageId, user_id: userId, contenu },
    { onConflict: 'personnage_id,user_id' }
  )
  if (error) console.error('[notes] enregistrement :', error.message)
  return !error
}

// ---------------------------------------------------------------------------
// Reprise des notes historiques laissées en localStorage
// ---------------------------------------------------------------------------
// L'ancien stockage était indexé par séance (`session_notes:<session>:<perso>`).
// Les notes appartiennent désormais au personnage : on fusionne donc toutes les
// entrées locales du même personnage, dans l'ordre des clés, en dédoublonnant.
const PREFIXE_LOCAL = 'session_notes:'

export function clesLocales(personnageId: string): string[] {
  const out: string[] = []
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(PREFIXE_LOCAL) && k.endsWith(`:${personnageId}`)) out.push(k)
    }
  } catch {
    /* stockage indisponible */
  }
  return out.sort()
}

/** Contenu fusionné des notes locales de ce personnage ('' si aucune). */
export function lireNotesLocales(personnageId: string): string {
  const morceaux: string[] = []
  for (const k of clesLocales(personnageId)) {
    try {
      const v = (window.localStorage.getItem(k) ?? '').trim()
      if (v && !morceaux.includes(v)) morceaux.push(v)
    } catch {
      /* stockage indisponible */
    }
  }
  return morceaux.join('\n\n')
}

/** Supprime les entrées locales une fois la reprise faite. */
export function purgerNotesLocales(personnageId: string): void {
  for (const k of clesLocales(personnageId)) {
    try {
      window.localStorage.removeItem(k)
    } catch {
      /* stockage indisponible */
    }
  }
}
