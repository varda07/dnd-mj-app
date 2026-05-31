'use client'

// ============================================================================
// Roadmap Modes 2.4 — Calculateur de dégâts en temps réel
// ----------------------------------------------------------------------------
// Le MJ saisit base (XdY) + modificateurs (bonus FOR/DEX, critique).
// L'app calcule et affiche le détail : "12 base + 4 FOR + 8 critique = 24".
// ============================================================================

import { useMemo, useState } from 'react'
import Modal from '@/app/components/ui/Modal'

function parseDes(expr: string): { n: number; faces: number; bonus: number } {
  const m = expr.replace(/\s/g, '').match(/^(\d+)d(\d+)([+\-]\d+)?$/i)
  if (!m) return { n: 0, faces: 0, bonus: 0 }
  return { n: parseInt(m[1]), faces: parseInt(m[2]), bonus: m[3] ? parseInt(m[3]) : 0 }
}

function lancer(expr: string, critique = false): { total: number; des: number[] } {
  const { n, faces, bonus } = parseDes(expr)
  const total_n = critique ? n * 2 : n
  const des: number[] = []
  for (let i = 0; i < total_n; i++) des.push(Math.floor(Math.random() * faces) + 1)
  return { total: des.reduce((s, x) => s + x, 0) + bonus, des }
}

export default function DegatsCalculator({
  open, onClose, acteurNom, cibleNom, onApply,
}: {
  open: boolean
  onClose: () => void
  acteurNom?: string
  cibleNom?: string
  onApply?: (degats: number, detail: string) => void
}) {
  const [base, setBase] = useState('1d8')
  const [bonus, setBonus] = useState(3)
  const [critique, setCritique] = useState(false)
  const [resultat, setResultat] = useState<{ total: number; detail: string } | null>(null)

  const calculer = () => {
    const { total, des } = lancer(base, critique)
    const grandTotal = total + bonus
    const detail = `${des.reduce((s, x) => s + x, 0)} base (${des.join('+')})${
      parseDes(base).bonus !== 0 ? ` + ${parseDes(base).bonus} (expr)` : ''
    }${bonus !== 0 ? ` + ${bonus} (bonus)` : ''}${critique ? ` ✦ critique (×2 dés)` : ''} = ${grandTotal}`
    setResultat({ total: grandTotal, detail })
  }

  const appliquer = () => {
    if (!resultat) return
    onApply?.(resultat.total, resultat.detail)
    onClose()
  }

  const apercu = useMemo(() => {
    const { n, faces, bonus: b } = parseDes(base)
    const min = critique ? n * 2 + b + bonus : n + b + bonus
    const max = critique ? n * 2 * faces + b + bonus : n * faces + b + bonus
    return `Min ${min} · Max ${max}`
  }, [base, bonus, critique])

  return (
    <Modal open={open} onClose={onClose} title={`🎯 Calculateur de dégâts${acteurNom ? ' — ' + acteurNom : ''}`} size="sm"
      footer={
        <>
          <button type="button" onClick={calculer}
            className="px-3 py-2 rounded bg-gray-800 border border-yellow-500/40 text-yellow-300 text-sm">
            🎲 Lancer
          </button>
          <button type="button" onClick={appliquer} disabled={!resultat}
            className="px-4 py-2 rounded bg-red-500/20 border border-red-400/50 text-red-200 font-bold text-sm disabled:opacity-40">
            💥 Appliquer
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        {cibleNom && (
          <div className="text-xs text-gray-400">
            Cible : <strong className="text-red-300">{cibleNom}</strong>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-400">Dés (ex: 2d8+2)
            <input value={base} onChange={(e) => setBase(e.target.value)}
              className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white font-mono" />
          </label>
          <label className="text-xs text-gray-400">Bonus supplémentaire (FOR, DEX…)
            <input type="number" value={bonus} onChange={(e) => setBonus(parseInt(e.target.value) || 0)}
              className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs text-yellow-300">
          <input type="checkbox" checked={critique} onChange={(e) => setCritique(e.target.checked)} className="accent-yellow-500" />
          Coup critique (double les dés)
        </label>
        <div className="text-[10px] text-gray-500">{apercu}</div>
        {resultat && (
          <div className="codex-card p-3 mt-1">
            <div className="text-3xl text-red-300 font-bold text-center">{resultat.total}</div>
            <div className="text-[11px] text-gray-400 mt-1 text-center">{resultat.detail}</div>
          </div>
        )}
      </div>
    </Modal>
  )
}
