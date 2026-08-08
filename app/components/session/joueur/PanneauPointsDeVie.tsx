'use client'

// ============================================================================
// Panneau « Points de vie » — ouvert par un appui sur le centre de la roue
// (Delta A.1). Reprend telle quelle la logique PV de l'ancien onglet Fiche :
// dégâts / soins, PV temporaires, jets de sauvegarde contre la mort, états.
// La jauge chiffrée n'est PAS répétée ici en grand : l'arc de la roue reste la
// représentation de référence, on n'affiche que les valeurs manipulables.
// ============================================================================

import { useState } from 'react'
import { CONDITIONS_MAP } from '@/app/data/conditions'
import type { SessionJoueurApi } from './useSessionJoueur'
import { couleurPv } from './RoueJoueur'

export default function PanneauPointsDeVie({
  api,
  roll
}: {
  api: SessionJoueurApi
  roll: (label: string, bonus: number) => void
}) {
  const [montant, setMontant] = useState('')
  const hp = api.currentHp
  const hpMax = api.effectiveMaxHp
  const couleur = couleurPv(hp, hpMax)

  const appliquer = (signe: 1 | -1) => {
    const n = parseInt(montant.replace(/[^0-9]/g, ''), 10)
    if (!n) return
    void api.modifierHp(signe * n)
    setMontant('')
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-yellow-600">Points de vie</p>
        <p className="font-bold text-3xl leading-tight" style={{ color: couleur }}>
          {hp}
          <span className="text-stone-500 text-lg"> / {hpMax}</span>
          {api.tempHp > 0 && <span className="text-cyan-300 text-lg"> +{api.tempHp}</span>}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
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

      <div className="flex items-center gap-2">
        <input
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          inputMode="numeric"
          placeholder="Montant"
          className="flex-1 min-w-0 bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1.5 text-sm text-gray-200 outline-none"
        />
        <button type="button" onClick={() => appliquer(-1)} className="px-3 py-1.5 rounded bg-red-900/40 border border-red-800/50 text-red-200 text-sm font-bold">
          Dégâts
        </button>
        <button type="button" onClick={() => appliquer(1)} className="px-3 py-1.5 rounded bg-green-900/40 border border-green-800/50 text-green-200 text-sm font-bold">
          Soin
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-500 flex-1">PV temporaires</span>
        <button type="button" onClick={() => api.setTempHp(Math.max(0, api.tempHp - 1))} className="w-7 h-7 rounded bg-stone-800 text-stone-300">−</button>
        <span className="text-cyan-300 font-bold w-6 text-center">{api.tempHp}</span>
        <button type="button" onClick={() => api.setTempHp(api.tempHp + 1)} className="w-7 h-7 rounded bg-stone-800 text-stone-300">+</button>
      </div>

      {/* Jets de mort — uniquement à 0 PV */}
      {hp <= 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }}>
          <p className="text-xs uppercase tracking-widest text-red-300 mb-2">Sauvegardes contre la mort</p>
          <div className="flex items-center justify-between">
            <DeathRow label="Succès" color="#4ade80" value={api.deathSaves.success}
              onSet={(n) => api.setDeathSaves({ ...api.deathSaves, success: n })} />
            <DeathRow label="Échecs" color="#f87171" value={api.deathSaves.fail}
              onSet={(n) => api.setDeathSaves({ ...api.deathSaves, fail: n })} />
          </div>
          <button type="button" onClick={() => roll('Jet de mort', 0)} className="mt-2 w-full py-1.5 rounded bg-stone-800 border border-red-800/40 text-red-200 text-sm font-bold">
            🎲 Lancer 1d20
          </button>
        </div>
      )}

      {/* Concentration & états */}
      <div>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">États</p>
        {api.concentration && (
          <div className="flex items-center justify-between rounded-lg border px-2.5 py-1.5 mb-1.5"
            style={{ borderColor: 'rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.08)' }}>
            <span className="text-cyan-200 text-sm">🌀 Concentration : <b>{api.concentration}</b></span>
            <button type="button" onClick={() => api.setConcentration(null)} className="text-cyan-300 text-xs underline">
              Arrêter
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {Object.entries(CONDITIONS_MAP).map(([key, cond]) => {
            const actif = api.conditions.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => api.toggleCondition(key)}
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  actif
                    ? 'bg-red-900/40 border-red-700/60 text-red-200'
                    : 'bg-stone-900/40 border-stone-700 text-stone-500 hover:text-stone-300'
                }`}
              >
                {cond.nom}
              </button>
            )
          })}
        </div>
      </div>
    </div>
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
