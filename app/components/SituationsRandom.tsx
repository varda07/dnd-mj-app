'use client'

// ============================================================================
// SituationsRandom — Roadmap Phase 4
// ============================================================================
// Modal accessible depuis le combat ou en standalone qui propose 12 templates
// de situations. Une fois choisie, l'app :
//   - calcule le niveau moyen des PJ du scénario actif
//   - pioche des ennemis adaptés (cf. pickEnnemisPourSituation)
//   - permet au MJ de valider, puis crée les ennemis dans la base et les
//     ajoute au combat en cours du scénario (scenario_id préselectionné).
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  SITUATIONS,
  pickEnnemisPourSituation,
  type Situation
} from '@/app/data/situations_random'
import { monstreVersEnnemi, type Monstre } from '@/app/data/bestiaire_dnd5e'

type Props = {
  scenarioId: string | null
  ouvert: boolean
  onClose: () => void
  // Si fourni, callback après création (ex. recharger la liste d'ennemis).
  onCreated?: (idsCrees: string[]) => void
}

export default function SituationsRandom({ scenarioId, ouvert, onClose, onCreated }: Props) {
  const router = useRouter()
  const [niveauMoyen, setNiveauMoyen] = useState(3)
  const [selected, setSelected] = useState<Situation | null>(null)
  const [preview, setPreview] = useState<Monstre[]>([])
  const [enCreation, setEnCreation] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // Charge le niveau moyen des PJ du scénario quand on ouvre la modal.
  useEffect(() => {
    if (!ouvert || !scenarioId) return
    const load = async () => {
      const { data } = await supabase
        .from('personnages')
        .select('niveau')
        .eq('scenario_id', scenarioId)
      const niveaux = (data ?? []).map((p: { niveau: number | null }) => p.niveau ?? 1)
      if (niveaux.length === 0) {
        setNiveauMoyen(3)
        return
      }
      const moy = Math.max(1, Math.round(niveaux.reduce((a, b) => a + b, 0) / niveaux.length))
      setNiveauMoyen(moy)
    }
    void load()
  }, [ouvert, scenarioId])

  const choisirSituation = (s: Situation) => {
    setSelected(s)
    setPreview(pickEnnemisPourSituation(s, niveauMoyen))
    setErreur(null)
  }

  const reroll = () => {
    if (!selected) return
    setPreview(pickEnnemisPourSituation(selected, niveauMoyen))
  }

  const lancerCombat = async () => {
    if (!selected || preview.length === 0 || !scenarioId) return
    setErreur(null)
    setEnCreation(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErreur('Non connecté.')
      setEnCreation(false)
      return
    }
    // Crée les ennemis liés au scénario
    const rows = preview.map((m: Monstre) => ({
      ...monstreVersEnnemi(m, user.id),
      scenario_id: scenarioId
    }))
    const { data, error } = await supabase.from('ennemis').insert(rows).select('id')
    setEnCreation(false)
    if (error) {
      setErreur(error.message)
      return
    }
    onCreated?.(((data ?? []) as { id: string }[]).map((r) => r.id))
    onClose()
    // Redirige vers le combat avec ce scénario actif.
    router.push(`/dashboard/combat?scenario_id=${scenarioId}`)
  }

  // Réinitialise quand on ferme.
  useEffect(() => {
    if (!ouvert) {
      setSelected(null)
      setPreview([])
      setErreur(null)
    }
  }, [ouvert])

  const liste = useMemo(() => SITUATIONS, [])

  if (!ouvert) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div
        className="relative z-[1] w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg p-5 border border-[rgba(201,168,76,0.30)]"
        style={{
          background: 'radial-gradient(ellipse at top, #1a1429 0%, #0f0a18 80%)',
          boxShadow: '0 0 30px rgba(168,85,247,0.20)',
          fontFamily: 'Georgia, serif'
        }}
      >
        <header className="flex items-center justify-between mb-3 pb-2 border-b border-[rgba(201,168,76,0.20)]">
          <h2 className="text-xl font-bold text-[#C9A84C]">🎲 Situation random</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-[#a8a8b0] hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </header>

        <p className="text-xs text-[#a8a8b0] mb-3">
          Niveau moyen des PJ : <span className="text-[#C9A84C] font-bold">{niveauMoyen}</span>
          {' '}— les ennemis sont calibrés en fonction.
        </p>

        {!selected ? (
          <div className="overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 pr-1">
            {liste.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => choisirSituation(s)}
                className="text-left rounded p-3 border border-[rgba(201,168,76,0.15)] bg-[rgba(0,0,0,0.30)] hover:border-[#C9A84C] hover:bg-[rgba(201,168,76,0.05)] transition-all"
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xl">{s.icone}</span>
                  <span className="text-[#C9A84C] font-bold text-sm">{s.titre}</span>
                </div>
                <p className="text-[11px] text-[#a8a8b0] leading-relaxed">{s.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-3">
            <div className="rounded p-3 border border-[rgba(201,168,76,0.20)] bg-[rgba(0,0,0,0.20)]">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xl">{selected.icone}</span>
                <span className="text-[#C9A84C] font-bold">{selected.titre}</span>
              </div>
              <p className="text-xs text-[#a8a8b0]">{selected.description}</p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#6a6a72] mb-1.5">
                Ennemis pré-sélectionnés ({preview.length})
              </p>
              {preview.length === 0 ? (
                <p className="text-xs text-red-300 italic">
                  Pas de candidat trouvé pour ce niveau. Essaye une autre situation.
                </p>
              ) : (
                <ul className="space-y-1">
                  {preview.map((m, i) => (
                    <li
                      key={`${m.nom}-${i}`}
                      className="flex items-center gap-2 text-sm rounded px-2 py-1 bg-[rgba(0,0,0,0.30)] border border-[rgba(201,168,76,0.10)]"
                    >
                      <span className="text-[#C9A84C]">⚔</span>
                      <span className="flex-1">{m.nom}</span>
                      <span className="text-[10px] text-[#6a6a72]">CR {m.cd}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {erreur && <p className="text-red-300 text-xs">{erreur}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-3 py-2 text-xs uppercase tracking-wider font-bold rounded border border-[rgba(201,168,76,0.30)] text-[#a8a8b0] hover:text-white hover:bg-[rgba(201,168,76,0.05)]"
              >
                ← Retour
              </button>
              <button
                type="button"
                onClick={reroll}
                className="px-3 py-2 text-xs uppercase tracking-wider font-bold rounded border border-[rgba(201,168,76,0.30)] text-[#C9A84C] hover:bg-[rgba(201,168,76,0.05)]"
              >
                🎲 Re-roll
              </button>
              <button
                type="button"
                onClick={lancerCombat}
                disabled={enCreation || preview.length === 0 || !scenarioId}
                className="flex-1 px-4 py-2 text-xs uppercase tracking-wider font-bold rounded bg-[#C9A84C] text-[#0a0b0d] hover:bg-[#d4b558] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enCreation ? 'Création…' : '⚔ Lancer le combat'}
              </button>
            </div>
            {!scenarioId && (
              <p className="text-[10px] text-yellow-300 italic">
                Sélectionne d'abord un scénario actif dans le combat.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
