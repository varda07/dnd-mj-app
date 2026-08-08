'use client'

// ============================================================================
// Menu « Notes » de la roue joueur (Delta A.2)
// ----------------------------------------------------------------------------
//   · notes personnelles éditables, PRIVÉES (table personnage_notes, RLS auteur
//     seul — le MJ n'y a pas accès), persistées en base avec sauvegarde
//     différée (~1 s) et synchronisées entre les appareils du même joueur ;
//   · objectif en cours (le chapitre que le MJ a marqué comme courant) ;
//   · accès au journal de séance en direct.
//
// Les notes appartiennent au PERSONNAGE, pas à la séance : elles survivent d'une
// session à l'autre. Les anciennes notes laissées en localStorage sont reprises
// au premier chargement, puis la clé locale est purgée.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ouvrirCanal } from '@/app/lib/session-realtime'
import {
  fetchNotesPersonnage,
  lireNotesLocales,
  purgerNotesLocales,
  saveNotesPersonnage
} from '@/app/lib/personnage-notes'
import type { SessionState } from '@/app/lib/session-live'
import JournalTable from './JournalTable'

const DELAI_ENREGISTREMENT = 1000

type Statut = 'chargement' | 'enregistre' | 'enregistrement' | 'indisponible'

export default function OngletNotes({
  sessionId,
  characterId,
  userId,
  sessionState
}: {
  sessionId: string
  characterId: string | null
  userId: string | null
  sessionState: SessionState | null
}) {
  const [notes, setNotes] = useState('')
  const [statut, setStatut] = useState<Statut>('chargement')
  const [objectif, setObjectif] = useState<{ titre: string; contenu: string | null } | null>(null)

  // Écriture différée : le timer en vol fait aussi office de « saisie en cours »,
  // ce qui empêche un écho Realtime d'écraser ce que le joueur est en train de taper.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dernierEcrit = useRef<string | null>(null)
  const enAttente = useRef<string | null>(null)

  const enregistrer = useCallback(
    async (valeur: string) => {
      if (!characterId || !userId) return
      dernierEcrit.current = valeur
      const ok = await saveNotesPersonnage(characterId, userId, valeur)
      enAttente.current = null
      setStatut(ok ? 'enregistre' : 'indisponible')
    },
    [characterId, userId]
  )

  // --- Chargement + reprise des notes locales historiques ---
  useEffect(() => {
    let annule = false
    if (!characterId || !userId) {
      setStatut('indisponible')
      return
    }
    setStatut('chargement')
    const charger = async () => {
      const distant = await fetchNotesPersonnage(characterId, userId)
      if (annule) return
      const local = lireNotesLocales(characterId)
      const enBase = distant?.contenu ?? ''
      let valeur = enBase

      if (local) {
        // Reprise : on ne perd rien — si la base a déjà du contenu différent, on
        // ajoute les notes locales à la suite plutôt que d'écraser l'un ou l'autre.
        if (!enBase.trim()) valeur = local
        else if (!enBase.includes(local)) valeur = `${enBase}\n\n${local}`
        if (valeur !== enBase) await saveNotesPersonnage(characterId, userId, valeur)
        purgerNotesLocales(characterId)
      }

      if (annule) return
      dernierEcrit.current = valeur
      setNotes(valeur)
      setStatut('enregistre')
    }
    void charger()
    return () => {
      annule = true
    }
  }, [characterId, userId])

  // --- Realtime : synchro entre les appareils du même joueur ---
  useEffect(() => {
    if (!characterId || !userId) return
    return ouvrirCanal(`personnage-notes:${characterId}`, (c) =>
      c.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personnage_notes',
          filter: `personnage_id=eq.${characterId}`
        },
        (payload) => {
          const row = payload.new as { user_id?: string; contenu?: string } | null
          if (!row || row.user_id !== userId || typeof row.contenu !== 'string') return
          // Ne jamais écraser une saisie en cours, ni renvoyer notre propre écho.
          if (enAttente.current !== null) return
          if (row.contenu === dernierEcrit.current) return
          dernierEcrit.current = row.contenu
          setNotes(row.contenu)
        }
      )
    )
  }, [characterId, userId])

  // Écriture des dernières frappes si le menu se ferme avant la fin du délai.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      const reste = enAttente.current
      if (reste !== null) void enregistrer(reste)
    }
  }, [enregistrer])

  const majNotes = (v: string) => {
    setNotes(v)
    if (!characterId || !userId) return
    enAttente.current = v
    setStatut('enregistrement')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      void enregistrer(v)
    }, DELAI_ENREGISTREMENT)
  }

  // --- Objectif en cours = chapitre marqué courant par le MJ ---
  const chapitreId = sessionState?.current_chapter_id ?? null
  useEffect(() => {
    let annule = false
    if (!chapitreId) {
      setObjectif(null)
      return
    }
    supabase
      .from('chapitres')
      .select('titre, contenu')
      .eq('id', chapitreId)
      .maybeSingle()
      .then(({ data }) => {
        if (!annule) setObjectif((data as { titre: string; contenu: string | null }) ?? null)
      })
    return () => {
      annule = true
    }
  }, [chapitreId])

  const legende: Record<Statut, string> = {
    chargement: 'Chargement…',
    enregistrement: 'Enregistrement…',
    enregistre: 'Enregistrées — privées, synchronisées sur tes appareils.',
    indisponible: 'Notes indisponibles : aucun personnage sélectionné.'
  }

  return (
    <div className="space-y-4">
      {/* Objectif en cours */}
      <section>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">Objectif en cours</p>
        {objectif ? (
          <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(201,168,76,0.3)', background: 'rgba(0,0,0,0.3)' }}>
            <p className="text-yellow-100 font-bold text-sm" style={{ fontFamily: 'Georgia, serif' }}>{objectif.titre}</p>
            {objectif.contenu && (
              <p className="text-stone-400 text-xs mt-1 whitespace-pre-wrap line-clamp-6">{objectif.contenu}</p>
            )}
          </div>
        ) : (
          <p className="text-stone-500 text-sm italic">Le MJ n’a pas encore fixé de cap.</p>
        )}
      </section>

      {/* Notes personnelles */}
      <section>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">Mes notes</p>
        <textarea
          value={notes}
          onChange={(e) => majNotes(e.target.value)}
          disabled={statut === 'indisponible' || statut === 'chargement'}
          placeholder="Noms croisés, indices, promesses faites…"
          className="w-full h-40 bg-stone-900/60 border border-yellow-800/30 rounded-lg p-2.5 text-sm text-gray-200 outline-none resize-y leading-relaxed disabled:opacity-60"
        />
        <p className="text-stone-600 text-[11px] mt-1">{legende[statut]}</p>
      </section>

      {/* Journal de séance en direct */}
      <section style={{ maxHeight: '18rem' }} className="flex flex-col min-h-0">
        <JournalTable sessionId={sessionId} userId={userId} titre="Journal de séance" limite={60} />
      </section>
    </div>
  )
}
