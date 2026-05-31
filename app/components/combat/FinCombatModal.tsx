'use client'

// ============================================================================
// Roadmap Modes 2.8 — Modal fin de combat (récap + XP + loot)
// ----------------------------------------------------------------------------
// Récap stats, calcul XP automatique selon CR ennemis vaincus, distribution
// XP entre PJ survivants, génération loot via tables existantes.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/app/components/ui/Modal'
import { toast } from '@/app/components/ui/Toast'

type PJSurvivant = { id: string; nom: string; niveau: number; hp_actuel: number }
type EnnemiVaincu = { id: string; nom: string; cr?: number; xp?: number }

// Barème XP officiel D&D 5e (par ennemi selon CR)
const XP_PAR_CR: Record<string, number> = {
  '0': 10, '0.125': 25, '0.25': 50, '0.5': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
  '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
}

export default function FinCombatModal({
  open,
  onClose,
  pjSurvivants,
  ennemisVaincus,
  dureeMinutes,
  totalDegats,
  onDistribuer,
}: {
  open: boolean
  onClose: () => void
  pjSurvivants: PJSurvivant[]
  ennemisVaincus: EnnemiVaincu[]
  dureeMinutes?: number
  totalDegats?: number
  onDistribuer: (data: {
    xpParPj: Record<string, number>
    loot: { orParPj?: Record<string, number>; items: string[] }
  }) => Promise<void> | void
}) {
  const xpTotal = useMemo(() => {
    return ennemisVaincus.reduce((sum, e) => {
      if (e.xp) return sum + e.xp
      const cr = e.cr !== undefined ? String(e.cr) : '0'
      return sum + (XP_PAR_CR[cr] ?? 50)
    }, 0)
  }, [ennemisVaincus])

  const [xpAjuste, setXpAjuste] = useState(xpTotal)
  useEffect(() => { setXpAjuste(xpTotal) }, [xpTotal])

  const xpParPj = useMemo(() => {
    if (pjSurvivants.length === 0) return {}
    const part = Math.floor(xpAjuste / pjSurvivants.length)
    return Object.fromEntries(pjSurvivants.map((pj) => [pj.id, part])) as Record<string, number>
  }, [xpAjuste, pjSurvivants])

  // Loot : génération simple "x or" basée sur somme des CR
  const [orTotal, setOrTotal] = useState(0)
  useEffect(() => {
    const cr_sum = ennemisVaincus.reduce((s, e) => s + (e.cr ?? 0), 0)
    setOrTotal(Math.round(cr_sum * 15 + ennemisVaincus.length * 5))
  }, [ennemisVaincus])

  const [itemsManuel, setItemsManuel] = useState('')

  const distribuer = async () => {
    const orParPj: Record<string, number> = {}
    if (orTotal > 0 && pjSurvivants.length > 0) {
      const part = Math.floor(orTotal / pjSurvivants.length)
      for (const pj of pjSurvivants) orParPj[pj.id] = part
    }
    await onDistribuer({
      xpParPj,
      loot: {
        orParPj,
        items: itemsManuel.split(',').map((s) => s.trim()).filter(Boolean),
      },
    })
    toast.success('XP et loot distribués')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="🏆 Combat terminé" size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-300 text-sm">Fermer sans distribuer</button>
          <button type="button" onClick={distribuer}
            disabled={pjSurvivants.length === 0}
            className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold text-sm disabled:opacity-40 codex-btn-press">
            💰 Distribuer
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="codex-card p-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Durée</div>
            <div className="text-yellow-300 font-bold">{dureeMinutes ?? '?'} min</div>
          </div>
          <div className="codex-card p-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Ennemis vaincus</div>
            <div className="text-yellow-300 font-bold">{ennemisVaincus.length}</div>
          </div>
          <div className="codex-card p-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Dégâts totaux</div>
            <div className="text-yellow-300 font-bold">{totalDegats ?? '?'}</div>
          </div>
        </div>

        <div className="codex-card p-3">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">XP à distribuer</div>
          <div className="flex items-center gap-2">
            <input type="number" value={xpAjuste} onChange={(e) => setXpAjuste(parseInt(e.target.value) || 0)}
              className="w-24 p-1.5 rounded bg-gray-800 border border-gray-700 text-white" />
            <span className="text-xs text-gray-400">XP total → {pjSurvivants.length} PJ survivants</span>
          </div>
          <ul className="mt-2 space-y-1 text-xs">
            {pjSurvivants.map((pj) => (
              <li key={pj.id} className="flex justify-between text-gray-300">
                <span>🛡 {pj.nom} (niv. {pj.niveau})</span>
                <span className="text-yellow-300 font-bold">+{xpParPj[pj.id] ?? 0} XP</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="codex-card p-3">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Loot</div>
          <label className="text-xs text-gray-400">Or total (sera divisé)
            <input type="number" value={orTotal} onChange={(e) => setOrTotal(parseInt(e.target.value) || 0)}
              className="mt-1 w-full p-1.5 rounded bg-gray-800 border border-gray-700 text-white" />
          </label>
          <label className="text-xs text-gray-400 block mt-2">Items (séparés par virgules)
            <input value={itemsManuel} onChange={(e) => setItemsManuel(e.target.value)}
              placeholder="Épée +1, Potion de soin, ..."
              className="mt-1 w-full p-1.5 rounded bg-gray-800 border border-gray-700 text-white" />
          </label>
        </div>
      </div>
    </Modal>
  )
}
