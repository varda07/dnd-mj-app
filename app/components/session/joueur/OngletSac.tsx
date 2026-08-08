'use client'

// Onglet « Sac » (Phase 3.6) — inventaire structuré + monnaie. Réutilise le
// composant InventaireSection (Phase 2.5) et les colonnes monnaie pc/pa/pe/po/pp.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import InventaireSection from '@/app/components/personnages/InventaireSection'
import { MONNAIES, type Monnaie } from '@/app/lib/inventaire'
import type { CharacterSheet } from '@/app/lib/session-live'

export default function OngletSac({
  sheet,
  isOwner
}: {
  sheet: CharacterSheet
  isOwner: boolean
}) {
  const [monnaie, setMonnaie] = useState<Monnaie>({
    pc: sheet.pc, pa: sheet.pa, pe: sheet.pe, po: sheet.po, pp: sheet.pp
  })

  useEffect(() => {
    setMonnaie({ pc: sheet.pc, pa: sheet.pa, pe: sheet.pe, po: sheet.po, pp: sheet.pp })
  }, [sheet.pc, sheet.pa, sheet.pe, sheet.po, sheet.pp])

  const setPiece = async (key: keyof Monnaie, val: number) => {
    const v = Math.max(0, val)
    setMonnaie((m) => ({ ...m, [key]: v }))
    await supabase.from('personnages').update({ [key]: v }).eq('id', sheet.id)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Bourse</p>
        <div className="grid grid-cols-5 gap-1.5">
          {MONNAIES.map((m) => (
            <div key={m.key} className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-yellow-600" title={m.long}>{m.label}</p>
              <input
                value={monnaie[m.key]}
                onChange={(e) => setPiece(m.key, parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0)}
                disabled={!isOwner}
                inputMode="numeric"
                className="w-full mt-0.5 bg-stone-900/60 border border-yellow-800/30 rounded px-1 py-1 text-sm text-center text-yellow-100 outline-none disabled:opacity-70"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Inventaire</p>
        <InventaireSection personnageId={sheet.id} isOwner={isOwner} />
      </div>
    </div>
  )
}
