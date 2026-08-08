'use client'

// Onglet « Fiche » (Phase 3.2) — PV manipulables, carac/saves/compétences
// cliquables pour lancer, CA/init/vitesse/PB/dés de vie, jets de mort.

import { useState } from 'react'
import {
  bonusMaitrise,
  formatMod,
  modifier,
  COMPETENCES,
  STATS,
  type StatKey
} from '@/app/lib/dnd-calc'
import type { CharacterSheet } from '@/app/lib/session-live'
import type { SessionJoueurApi } from './useSessionJoueur'

export default function OngletFiche({
  sheet,
  api,
  roll
}: {
  sheet: CharacterSheet
  api: SessionJoueurApi
  roll: (label: string, bonus: number) => void
}) {
  const [degats, setDegats] = useState('')
  const bm = bonusMaitrise(sheet.niveau)
  const initiative = modifier(sheet.dexterite)
  const hp = api.currentHp
  const hpMax = api.effectiveMaxHp
  const pct = hpMax > 0 ? Math.max(0, Math.min(100, (hp / hpMax) * 100)) : 0
  const bas = pct <= 25

  const appliquer = (signe: 1 | -1) => {
    const n = parseInt(degats.replace(/[^0-9]/g, ''), 10)
    if (!n) return
    void api.modifierHp(signe * n)
    setDegats('')
  }

  return (
    <div className="space-y-4">
      {/* Bloc PV */}
      <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(201,168,76,0.3)', background: 'rgba(0,0,0,0.3)' }}>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs uppercase tracking-widest text-yellow-600">Points de vie</span>
          <span className={`font-bold text-lg ${bas ? 'text-red-400' : 'text-yellow-100'}`}>
            {hp} <span className="text-stone-500 text-sm">/ {hpMax}</span>
            {api.tempHp > 0 && <span className="text-cyan-300 text-sm"> +{api.tempHp}</span>}
          </span>
        </div>
        <div className="h-3 rounded-full bg-stone-800 overflow-hidden">
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, background: bas ? '#ef4444' : '#4ade80' }}
          />
        </div>
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {[
            { l: '−5', d: -5 },
            { l: '−1', d: -1 },
            { l: '+1', d: 1 },
            { l: '+5', d: 5 }
          ].map((b) => (
            <button
              key={b.l}
              type="button"
              onClick={() => api.modifierHp(b.d)}
              className="py-2 rounded bg-stone-800 border border-yellow-800/30 text-yellow-100 font-bold hover:border-yellow-600 active:scale-95 transition"
            >
              {b.l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            value={degats}
            onChange={(e) => setDegats(e.target.value)}
            inputMode="numeric"
            placeholder="Montant"
            className="flex-1 bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1.5 text-sm text-gray-200 outline-none"
          />
          <button type="button" onClick={() => appliquer(-1)} className="px-3 py-1.5 rounded bg-red-900/40 border border-red-800/50 text-red-200 text-sm font-bold">
            Dégâts
          </button>
          <button type="button" onClick={() => appliquer(1)} className="px-3 py-1.5 rounded bg-green-900/40 border border-green-800/50 text-green-200 text-sm font-bold">
            Soin
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-stone-500">PV temporaires</span>
          <button type="button" onClick={() => api.setTempHp(Math.max(0, api.tempHp - 1))} className="w-6 h-6 rounded bg-stone-800 text-stone-300">−</button>
          <span className="text-cyan-300 font-bold w-6 text-center">{api.tempHp}</span>
          <button type="button" onClick={() => api.setTempHp(api.tempHp + 1)} className="w-6 h-6 rounded bg-stone-800 text-stone-300">+</button>
        </div>
      </div>

      {/* Jets de mort si à 0 PV */}
      {hp <= 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }}>
          <p className="text-xs uppercase tracking-widest text-red-300 mb-2">Jets de sauvegarde contre la mort</p>
          <div className="flex items-center justify-between">
            <DeathRow label="Succès" color="#4ade80" value={api.deathSaves.success}
              onSet={(n) => api.setDeathSaves({ ...api.deathSaves, success: n })} />
            <DeathRow label="Échecs" color="#f87171" value={api.deathSaves.fail}
              onSet={(n) => api.setDeathSaves({ ...api.deathSaves, fail: n })} />
          </div>
          <button type="button" onClick={() => roll('Jet de mort', 0)} className="mt-2 w-full py-1.5 rounded bg-stone-800 border border-red-800/40 text-red-200 text-sm font-bold">
            🎲 Lancer un jet de mort
          </button>
        </div>
      )}

      {/* Défenses */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <MiniStat label="CA" value={sheet.ca} />
        <MiniStat label="Init." value={formatMod(initiative)} onClick={() => roll('Initiative', initiative)} />
        <MiniStat label="Vitesse" value={`${sheet.vitesse}`} />
        <MiniStat label="Maîtrise" value={formatMod(bm)} />
      </div>
      <div className="text-center text-xs text-stone-500">
        Dés de vie : {sheet.de_vie ?? '—'} ({Math.max(0, sheet.niveau - sheet.de_vie_utilises)}/{sheet.niveau} dispo)
      </div>

      {/* Caractéristiques cliquables */}
      <div>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Caractéristiques — clic pour lancer</p>
        <div className="grid grid-cols-3 gap-2">
          {STATS.map((s) => {
            const val = sheet[s.key as StatKey] as number
            const mod = modifier(val)
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => roll(`Test de ${s.abbr}`, mod)}
                className="rounded-lg border border-yellow-800/30 bg-stone-900/40 py-2 hover:border-yellow-600 active:scale-95 transition"
              >
                <span className="block text-[10px] uppercase text-yellow-600">{s.abbr}</span>
                <span className="block text-yellow-100 font-bold text-lg leading-none">{formatMod(mod)}</span>
                <span className="block text-stone-500 text-[10px]">{val}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Jets de sauvegarde */}
      <div>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Jets de sauvegarde</p>
        <div className="grid grid-cols-2 gap-1.5">
          {STATS.map((s) => {
            const mod = modifier(sheet[s.key as StatKey] as number)
            const maitrise = !!sheet.saves_maitrises?.[s.key]
            const bonus = mod + (maitrise ? bm : 0)
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => roll(`Sauvegarde de ${s.abbr}`, bonus)}
                className="flex items-center justify-between rounded border border-yellow-800/20 bg-stone-900/40 px-2.5 py-1.5 hover:border-yellow-600 transition"
              >
                <span className="text-sm text-stone-300">
                  {maitrise ? '●' : '○'} {s.label}
                </span>
                <span className="text-yellow-100 font-bold text-sm">{formatMod(bonus)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Compétences */}
      <div>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Compétences</p>
        <div className="space-y-1">
          {COMPETENCES.map((c) => {
            const mod = modifier(sheet[c.stat] as number)
            const maitrise = !!sheet.comp_maitrises?.[c.nom]
            const expertise = !!sheet.comp_expertise?.[c.nom]
            const rang = expertise ? 2 : maitrise ? 1 : 0
            const bonus = mod + bm * rang
            return (
              <button
                key={c.nom}
                type="button"
                onClick={() => roll(c.nom, bonus)}
                className="w-full flex items-center justify-between rounded border border-yellow-800/15 bg-stone-900/30 px-2.5 py-1.5 hover:border-yellow-600 transition"
              >
                <span className="text-sm text-stone-300">
                  {expertise ? '◆' : maitrise ? '●' : '○'} {c.nom}
                </span>
                <span className="text-yellow-100 font-bold text-sm">{formatMod(bonus)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, onClick }: { label: string; value: string | number; onClick?: () => void }) {
  const inner = (
    <>
      <span className="block text-[10px] uppercase text-yellow-600">{label}</span>
      <span className="block text-yellow-100 font-bold">{value}</span>
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-lg border border-yellow-800/30 bg-stone-900/40 py-1.5 hover:border-yellow-600 transition">
      {inner}
    </button>
  ) : (
    <div className="rounded-lg border border-yellow-800/20 bg-stone-900/40 py-1.5">{inner}</div>
  )
}

function DeathRow({ label, color, value, onSet }: { label: string; color: string; value: number; onSet: (n: number) => void }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-stone-400 mb-1">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSet(value >= i ? i - 1 : i)}
            className="w-5 h-5 rounded-full border"
            style={{ background: value >= i ? color : 'transparent', borderColor: color }}
          />
        ))}
      </div>
    </div>
  )
}
