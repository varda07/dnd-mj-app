'use client'

// ============================================================================
// Combats préparés / templates — Phase 2.3 + 4.1
// ----------------------------------------------------------------------------
// Permet de SAUVEGARDER le combat courant (ses ennemis) comme combat préparé,
// puis de le RELANCER en un clic plus tard. Stocké dans combats_prepares.
// Le lancement résout les participants contre le roster courant et délègue au
// moteur (onLancer) pour tirer l'initiative.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Persona, Ennemi } from '@/app/dashboard/presentation/page'

type Participant = { kind: 'perso' | 'ennemi'; ref_id: string; nom: string; image_url: string | null }
type CombatPrepare = {
  id: string
  nom: string
  notes: string | null
  participants: Participant[]
}

export default function CombatsPreparesPanel({
  scenarioId,
  personnages,
  ennemis,
  onLancer
}: {
  scenarioId: string
  personnages: Persona[]
  ennemis: Ennemi[]
  onLancer: (participants: { personnages: Persona[]; ennemis: Ennemi[] }) => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [liste, setListe] = useState<CombatPrepare[]>([])
  const [nom, setNom] = useState('')
  const [msg, setMsg] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from('combats_prepares')
      .select('id, nom, notes, participants')
      .eq('scenario_id', scenarioId)
      .order('created_at', { ascending: false })
    setListe((data ?? []) as CombatPrepare[])
  }, [scenarioId])

  useEffect(() => {
    // charger() est async : setListe s'exécute après l'await (pas synchrone).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ouvert) charger()
  }, [ouvert, charger])

  const sauvegarder = useCallback(async () => {
    const titre = nom.trim()
    if (!titre) return
    if (ennemis.length === 0) {
      setMsg('Ajoute des ennemis avant de sauvegarder.')
      setTimeout(() => setMsg(''), 2500)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const participants: Participant[] = ennemis.map((e) => ({
      kind: 'ennemi',
      ref_id: e.id,
      nom: e.nom,
      image_url: e.image_url
    }))
    const { error } = await supabase.from('combats_prepares').insert({
      scenario_id: scenarioId,
      mj_id: user.id,
      nom: titre,
      participants
    })
    if (error) {
      console.error('[combats_prepares] save :', error.message)
      setMsg('Erreur — exécute la migration combats_prepares.')
      return
    }
    setNom('')
    setMsg('✓ Combat sauvegardé')
    setTimeout(() => setMsg(''), 1800)
    charger()
  }, [nom, ennemis, scenarioId, charger])

  const lancer = useCallback(
    (cp: CombatPrepare) => {
      // Résout les participants ennemis contre le roster courant (ceux qui
      // existent encore). Les PJ du scénario sont toujours inclus.
      const ids = new Set(cp.participants.filter((p) => p.kind === 'ennemi').map((p) => p.ref_id))
      const ennemisSel = ennemis.filter((e) => ids.has(e.id))
      onLancer({ personnages, ennemis: ennemisSel.length > 0 ? ennemisSel : ennemis })
    },
    [ennemis, personnages, onLancer]
  )

  const supprimer = useCallback(
    async (id: string) => {
      await supabase.from('combats_prepares').delete().eq('id', id)
      charger()
    },
    [charger]
  )

  return (
    <div className="combatmj-carte-section">
      <button
        type="button"
        className="combatmj-carte-toggle"
        onClick={() => setOuvert((o) => !o)}
      >
        {ouvert ? '▾' : '▸'} 📚 Combats préparés
      </button>
      {ouvert && (
        <div className="space-y-2 mt-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom du combat (ex : Embuscade gobeline)"
              className="flex-1 min-w-0 p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none focus:border-yellow-500 text-xs"
            />
            <button
              type="button"
              onClick={sauvegarder}
              disabled={!nom.trim()}
              className="presentation-action-btn flex-shrink-0 disabled:opacity-40"
            >
              💾 Sauvegarder
            </button>
          </div>
          {msg && <p className="text-[10px] text-yellow-300 italic">{msg}</p>}
          {liste.length === 0 ? (
            <p className="text-[10px] text-gray-500 italic">
              Aucun combat préparé. Configure les ennemis puis sauvegarde-les ici pour les relancer en un clic.
            </p>
          ) : (
            <ul className="space-y-1">
              {liste.map((cp) => (
                <li
                  key={cp.id}
                  className="flex items-center gap-2 p-2 rounded border border-gray-700 bg-gray-900/40"
                >
                  <span className="flex-1 min-w-0 text-xs text-gray-200 truncate">
                    {cp.nom}
                    <span className="text-gray-500 ml-1">
                      ({cp.participants.filter((p) => p.kind === 'ennemi').length} ennemis)
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => lancer(cp)}
                    className="text-[10px] px-2 py-1 rounded border border-[rgba(201,168,76,0.4)] text-[#ffe6a8] hover:bg-[rgba(201,168,76,0.15)]"
                  >
                    ▶ Lancer
                  </button>
                  <button
                    type="button"
                    onClick={() => supprimer(cp.id)}
                    className="text-[10px] px-1.5 py-1 rounded border border-red-700/50 text-red-300 hover:bg-red-900/20"
                    aria-label="Supprimer"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
