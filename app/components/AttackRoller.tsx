'use client'

// ============================================================================
// Roadmap Affinement 2.5 — Auto-roll d'attaques d'ennemis (modale standalone)
// ----------------------------------------------------------------------------
// Le MJ saisit (ou charge depuis le bestiaire) une attaque (nom, bonus, dégâts,
// type, multiattack). Sélectionne les cibles (PJ avec leur CA). Le composant
// lance d20+bonus, compare au CA, lance les dégâts (avec critique x2), affiche
// le résultat avec bouton « Appliquer les dégâts » qui appelle un callback.
//
// Indépendant du combat page principal — peut être appelé depuis n'importe
// quelle fiche ennemi ou la palette de commandes.
// ============================================================================

import { useState } from 'react'
import Modal from '@/app/components/ui/Modal'
import { toast } from '@/app/components/ui/Toast'
import { haptic } from '@/app/lib/haptic'

export type AttaqueData = {
  nom: string
  bonus_attaque: number
  degats: string            // ex "1d6+2"
  type_degats?: string
  portee?: string
  nb?: number               // nombre d'attaques (multiattack)
}

export type CibleData = {
  id: string
  nom: string
  ca: number
  hp_actuel?: number
}

type Resultat = {
  cibleId: string
  cibleNom: string
  jet: number
  total: number
  ca: number
  touche: boolean
  critique: boolean
  fumble: boolean
  degats: number
  detailDes: number[]
}

// Parse "1d6+2" → { n: 1, faces: 6, bonus: 2 }
function parseDegats(expr: string): { n: number; faces: number; bonus: number } {
  const m = expr.replace(/\s/g, '').match(/^(\d+)d(\d+)([+\-]\d+)?$/i)
  if (!m) return { n: 1, faces: 6, bonus: 0 }
  return { n: parseInt(m[1]), faces: parseInt(m[2]), bonus: m[3] ? parseInt(m[3]) : 0 }
}

function lancerDegats(expr: string, critique: boolean): { total: number; des: number[] } {
  const { n, faces, bonus } = parseDegats(expr)
  // Crit = double les dés (RAW 5e)
  const total_n = critique ? n * 2 : n
  const des: number[] = []
  for (let i = 0; i < total_n; i++) des.push(Math.floor(Math.random() * faces) + 1)
  return { total: des.reduce((s, x) => s + x, 0) + bonus, des }
}

export default function AttackRoller({
  open,
  onClose,
  attaques,
  cibles,
  attaquantNom = 'Ennemi',
  onApplyDamage,
}: {
  open: boolean
  onClose: () => void
  attaques: AttaqueData[]
  cibles: CibleData[]
  attaquantNom?: string
  /** Callback appelé pour appliquer les dégâts à une cible (sera utilisé par le combat). */
  onApplyDamage?: (cibleId: string, degats: number) => Promise<void> | void
}) {
  const [attaqueIdx, setAttaqueIdx] = useState(0)
  const [ciblesSelectedIds, setCiblesSelectedIds] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<Resultat[] | null>(null)

  const att = attaques[attaqueIdx]

  const toggleCible = (id: string) => {
    setCiblesSelectedIds((curr) => {
      const next = new Set(curr)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const attaquer = () => {
    if (!att || ciblesSelectedIds.size === 0) return
    const nbAttaques = Math.max(1, att.nb ?? 1)
    const ciblesArr = [...ciblesSelectedIds]
      .map((id) => cibles.find((c) => c.id === id))
      .filter((c): c is CibleData => !!c)

    const out: Resultat[] = []
    for (let a = 0; a < nbAttaques; a++) {
      for (const cible of ciblesArr) {
        const jet = Math.floor(Math.random() * 20) + 1
        const critique = jet === 20
        const fumble = jet === 1
        const total = jet + att.bonus_attaque
        const touche = !fumble && (critique || total >= cible.ca)
        let degats = 0
        let detailDes: number[] = []
        if (touche) {
          const d = lancerDegats(att.degats, critique)
          degats = d.total
          detailDes = d.des
        }
        out.push({
          cibleId: cible.id,
          cibleNom: cible.nom,
          jet, total, ca: cible.ca, touche, critique, fumble, degats, detailDes,
        })
        if (critique) haptic.crit()
        else if (touche) haptic.tap()
      }
    }
    setResults(out)
  }

  const appliquer = async (r: Resultat) => {
    if (!onApplyDamage) {
      toast.info('Pas de combat actif — applique manuellement les dégâts.')
      return
    }
    await onApplyDamage(r.cibleId, r.degats)
    toast.success(`${r.degats} dégâts → ${r.cibleNom}`)
  }

  return (
    <Modal open={open} onClose={onClose} title={`🎯 ${attaquantNom} attaque`} size="md"
      footer={
        <>
          <button type="button" onClick={() => { setResults(null); setCiblesSelectedIds(new Set()) }}
            className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-300 text-sm">Réinitialiser</button>
          <button type="button" onClick={attaquer}
            disabled={!att || ciblesSelectedIds.size === 0}
            className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold disabled:opacity-40 codex-btn-press"
          >🎲 Attaquer</button>
        </>
      }
    >
      {attaques.length === 0 ? (
        <div className="text-sm text-gray-400 italic">Aucune attaque définie pour cet ennemi.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {attaques.length > 1 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Attaque</div>
              <div className="flex flex-wrap gap-1">
                {attaques.map((a, i) => (
                  <button key={i} type="button" onClick={() => setAttaqueIdx(i)}
                    className={`text-xs px-2 py-1.5 rounded ${attaqueIdx === i ? 'bg-yellow-500 text-gray-900 font-bold' : 'bg-gray-800 border border-gray-700 text-gray-300'}`}
                  >{a.nom}</button>
                ))}
              </div>
            </div>
          )}

          {att && (
            <div className="codex-card p-3 text-sm text-gray-300">
              <div className="font-semibold text-yellow-300">{att.nom}</div>
              <div className="text-xs text-gray-400">
                +{att.bonus_attaque} à l’attaque · {att.degats} {att.type_degats ?? ''}
                {att.portee ? ` · ${att.portee}` : ''}
                {att.nb && att.nb > 1 ? ` · ×${att.nb} (Multiattaque)` : ''}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Cibles ({ciblesSelectedIds.size})</div>
            {cibles.length === 0 ? (
              <div className="text-sm text-gray-500 italic">Aucune cible disponible.</div>
            ) : (
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto codex-scroll pr-1">
                {cibles.map((c) => (
                  <label key={c.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${ciblesSelectedIds.has(c.id) ? 'bg-yellow-500/10 border border-yellow-500/40' : 'bg-gray-800 border border-gray-700'}`}>
                    <input type="checkbox" checked={ciblesSelectedIds.has(c.id)} onChange={() => toggleCible(c.id)} />
                    <span className="flex-1 text-sm text-gray-200">{c.nom}</span>
                    <span className="text-xs text-gray-500">CA {c.ca}{c.hp_actuel !== undefined ? ` · ${c.hp_actuel} pv` : ''}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {results && (
            <div className="border-t border-gray-700/40 pt-3 flex flex-col gap-2">
              <div className="text-xs uppercase tracking-wider text-gray-500">Résultats</div>
              {results.map((r, i) => (
                <div key={i} className={`p-2 rounded border text-sm ${
                  r.critique ? 'bg-green-500/10 border-green-400/40' :
                  r.fumble ? 'bg-red-500/10 border-red-400/40' :
                  r.touche ? 'bg-yellow-500/10 border-yellow-400/40' :
                  'bg-gray-800 border-gray-700'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-gray-200">
                      <span className="font-bold">{r.cibleNom}</span> · CA {r.ca}
                    </div>
                    <div className="text-xs text-gray-400">
                      🎲 {r.jet} {r.critique ? '(CRIT!)' : r.fumble ? '(échec critique)' : ''} + {att.bonus_attaque} = <span className="font-bold text-yellow-300">{r.total}</span>
                    </div>
                  </div>
                  {r.touche ? (
                    <div className="text-xs text-gray-300 mt-1 flex items-center justify-between gap-2">
                      <span>Touche ! Dégâts : <span className="font-bold text-red-300">{r.degats}</span> ({r.detailDes.join(' + ')}) {att.type_degats ?? ''}</span>
                      {onApplyDamage ? (
                        <button type="button" onClick={() => appliquer(r)} className="text-xs px-2 py-1 rounded bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30 codex-btn-press">
                          Appliquer
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic mt-1">Manqué.</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
