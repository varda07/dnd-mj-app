'use client'

// ============================================================================
// Roadmap Modes 2.5 — Jets groupés (multi-cibles)
// ----------------------------------------------------------------------------
// Le MJ choisit un type de jet (Sauv / Compé / Carac), une caractéristique,
// un DC, et coche les participants. Tous les jets sont lancés en un clic.
// ============================================================================

import { useState } from 'react'
import Modal from '@/app/components/ui/Modal'

type Carac = 'FOR' | 'DEX' | 'CON' | 'INT' | 'SAG' | 'CHA'

type Combatant = {
  id: string
  nom: string
  kind: 'perso' | 'ennemi'
  // Modificateurs par caractéristique (déjà calculés depuis (caract - 10) / 2)
  mods?: Partial<Record<Carac, number>>
  // V1 1.1 — bonus de maîtrise et caractéristiques de sauvegarde maîtrisées,
  // pour appliquer la maîtrise sur un jet de sauvegarde.
  pb?: number
  saves?: Partial<Record<Carac, boolean>>
}

type Resultat = {
  combatantId: string
  nom: string
  jet: number
  mod: number
  pb: number
  total: number
  reussi: boolean
}

const CARAC_LABELS: Array<{ k: 'FOR' | 'DEX' | 'CON' | 'INT' | 'SAG' | 'CHA'; label: string }> = [
  { k: 'FOR', label: 'Force' }, { k: 'DEX', label: 'Dextérité' },
  { k: 'CON', label: 'Constitution' }, { k: 'INT', label: 'Intelligence' },
  { k: 'SAG', label: 'Sagesse' }, { k: 'CHA', label: 'Charisme' },
]

export default function JetGroupeModal({
  open,
  onClose,
  combatants,
}: {
  open: boolean
  onClose: () => void
  combatants: Combatant[]
}) {
  const [carac, setCarac] = useState<Carac>('DEX')
  const [dc, setDc] = useState(15)
  const [avecMaitrise, setAvecMaitrise] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [resultats, setResultats] = useState<Resultat[] | null>(null)

  const toggle = (id: string) => {
    setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const toggleAll = (kind?: 'perso' | 'ennemi') => {
    const ids = combatants.filter((c) => !kind || c.kind === kind).map((c) => c.id)
    const allChecked = ids.every((id) => selectedIds.has(id))
    setSelectedIds((s) => {
      const n = new Set(s)
      ids.forEach((id) => allChecked ? n.delete(id) : n.add(id))
      return n
    })
  }

  const lancer = () => {
    const out: Resultat[] = []
    for (const c of combatants) {
      if (!selectedIds.has(c.id)) continue
      const jet = Math.floor(Math.random() * 20) + 1
      const mod = c.mods?.[carac] ?? 0
      // Bonus de maîtrise appliqué uniquement si l'option est active ET que le
      // combattant maîtrise cette sauvegarde.
      const pb = avecMaitrise && c.saves?.[carac] ? c.pb ?? 0 : 0
      const total = jet + mod + pb
      out.push({ combatantId: c.id, nom: c.nom, jet, mod, pb, total, reussi: total >= dc })
    }
    setResultats(out)
  }

  return (
    <Modal open={open} onClose={onClose} title="🎲 Jet groupé" size="md"
      footer={
        <>
          <button type="button" onClick={() => { setResultats(null); setSelectedIds(new Set()) }}
            className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-300 text-sm">Réinitialiser</button>
          <button type="button" onClick={lancer}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold text-sm disabled:opacity-40 codex-btn-press">
            🎲 Lancer ({selectedIds.size})
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-400">Caractéristique
            <select value={carac} onChange={(e) => setCarac(e.target.value as 'FOR' | 'DEX' | 'CON' | 'INT' | 'SAG' | 'CHA')}
              className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white">
              {CARAC_LABELS.map((c) => <option key={c.k} value={c.k}>{c.label} ({c.k})</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-400">Difficulté (DC)
            <input type="number" min={1} value={dc} onChange={(e) => setDc(parseInt(e.target.value) || 10)}
              className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
          <input type="checkbox" checked={avecMaitrise} onChange={(e) => setAvecMaitrise(e.target.checked)} />
          <span>Jet de sauvegarde — ajouter le bonus de maîtrise aux personnages qui maîtrisent cette sauvegarde</span>
        </label>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Cibles ({selectedIds.size})</span>
            <div className="flex gap-1 text-xs">
              <button type="button" onClick={() => toggleAll('perso')} className="text-blue-300 px-1">Tous PJ</button>
              <button type="button" onClick={() => toggleAll('ennemi')} className="text-red-300 px-1">Tous ennemis</button>
              <button type="button" onClick={() => toggleAll()} className="text-yellow-300 px-1">Tous</button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto codex-scroll flex flex-col gap-1">
            {combatants.map((c) => (
              <label key={c.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                selectedIds.has(c.id)
                  ? c.kind === 'perso' ? 'bg-blue-500/10 border border-blue-400/40' : 'bg-red-500/10 border border-red-400/40'
                  : 'bg-gray-800 border border-gray-700'
              }`}>
                <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggle(c.id)} />
                <span className="flex-1 text-gray-200">{c.kind === 'perso' ? '🛡' : '👹'} {c.nom}</span>
                <span className="text-xs text-gray-500">{(c.mods?.[carac] ?? 0) >= 0 ? '+' : ''}{c.mods?.[carac] ?? 0}</span>
              </label>
            ))}
          </div>
        </div>

        {resultats && (
          <div className="border-t border-gray-700/40 pt-3">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Résultats (DC {dc})</div>
            <ul className="space-y-1">
              {resultats.map((r) => (
                <li key={r.combatantId} className={`flex items-center justify-between gap-2 p-1.5 rounded text-sm ${
                  r.reussi ? 'bg-green-500/10 border border-green-400/30' : 'bg-red-500/10 border border-red-400/30'
                }`}>
                  <span className={r.reussi ? 'text-green-200' : 'text-red-200'}>
                    {r.reussi ? '✅' : '❌'} {r.nom}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    🎲 {r.jet} {r.mod >= 0 ? '+' : ''}{r.mod}
                    {r.pb > 0 ? ` +${r.pb}🎓` : ''} = <strong>{r.total}</strong>
                  </span>
                </li>
              ))}
            </ul>
            <div className="text-[10px] text-gray-500 mt-1 text-center">
              {resultats.filter((r) => r.reussi).length} réussites / {resultats.filter((r) => !r.reussi).length} échecs
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
