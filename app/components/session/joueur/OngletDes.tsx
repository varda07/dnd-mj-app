'use client'

// Onglet « Dés » (Phase 3.5) — lanceur complet (d4→d100, quantité, modificateur,
// avantage/désavantage). Chaque jet est écrit dans session_events (visible du MJ
// et des autres joueurs), avec option « jet privé » (MJ uniquement). Historique.

import { useCallback, useEffect, useState } from 'react'
import { ouvrirCanal } from '@/app/lib/session-realtime'
import { DICE_FACES, formatMod, rollD20, rollDice, type RollMode } from '@/app/lib/dnd-calc'
import { fetchSessionEvents, logSessionEvent, type SessionEvent } from '@/app/lib/session-live'

export default function OngletDes({
  sessionId,
  characterId,
  characterNom,
  userId
}: {
  sessionId: string
  characterId: string | null
  characterNom: string
  userId: string | null
}) {
  const [faces, setFaces] = useState(20)
  const [nombre, setNombre] = useState(1)
  const [mod, setMod] = useState(0)
  const [mode, setMode] = useState<RollMode>('normal')
  const [prive, setPrive] = useState(false)
  const [dernier, setDernier] = useState<{ detail: string; total: number } | null>(null)
  const [historique, setHistorique] = useState<SessionEvent[]>([])

  const charger = useCallback(async () => {
    const evts = await fetchSessionEvents(sessionId, 40)
    setHistorique(evts.filter((e) => e.type === 'dice_roll'))
  }, [sessionId])

  useEffect(() => {
    void charger()
    return ouvrirCanal(`session-des:${sessionId}`, (c) =>
      c.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'session_events', filter: `session_id=eq.${sessionId}` },
        () => void charger()
      )
    )
  }, [sessionId, charger])

  const lancer = async () => {
    let rolls: number[]
    let total: number
    let detail: string
    if (faces === 20 && mode !== 'normal') {
      const r = rollD20(mode)
      rolls = r.rolls
      total = r.kept + mod
      detail = `d20 (${r.rolls.join(' / ')}) → ${r.kept}${mod ? formatMod(mod) : ''} = ${total}`
    } else {
      rolls = rollDice(faces, nombre)
      const somme = rolls.reduce((a, b) => a + b, 0)
      total = somme + mod
      detail = `${nombre}d${faces} (${rolls.join(', ')})${mod ? formatMod(mod) : ''} = ${total}`
    }
    setDernier({ detail, total })
    await logSessionEvent(
      sessionId,
      'dice_roll',
      {
        label: `${nombre}d${faces}`,
        nom: characterNom,
        dice: `d${faces}`,
        nombre,
        mode,
        mod,
        rolls,
        total,
        prive
      },
      characterId
    )
  }

  return (
    <div className="space-y-4">
      {/* Sélecteur de dé */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
        {DICE_FACES.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFaces(f)}
            className={`py-2 rounded-lg border font-bold text-sm ${
              faces === f
                ? 'border-amber-400 bg-amber-900/30 text-yellow-100'
                : 'border-yellow-800/30 bg-stone-900/40 text-stone-400 hover:border-yellow-700'
            }`}
          >
            d{f}
          </button>
        ))}
      </div>

      {/* Quantité + modificateur */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-stone-400 flex items-center gap-1">
          Nombre
          <button type="button" onClick={() => setNombre((n) => Math.max(1, n - 1))} className="w-6 h-6 rounded bg-stone-800 text-stone-300">−</button>
          <span className="w-6 text-center text-yellow-100 font-bold">{nombre}</span>
          <button type="button" onClick={() => setNombre((n) => Math.min(20, n + 1))} className="w-6 h-6 rounded bg-stone-800 text-stone-300">+</button>
        </label>
        <label className="text-xs text-stone-400 flex items-center gap-1">
          Mod.
          <button type="button" onClick={() => setMod((m) => m - 1)} className="w-6 h-6 rounded bg-stone-800 text-stone-300">−</button>
          <span className="w-8 text-center text-yellow-100 font-bold">{formatMod(mod)}</span>
          <button type="button" onClick={() => setMod((m) => m + 1)} className="w-6 h-6 rounded bg-stone-800 text-stone-300">+</button>
        </label>
      </div>

      {/* Avantage / désavantage (d20) */}
      {faces === 20 && (
        <div className="grid grid-cols-3 gap-1.5">
          {(['desavantage', 'normal', 'avantage'] as RollMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`py-1.5 rounded-lg border text-xs font-bold ${
                mode === m ? 'border-amber-400 bg-amber-900/30 text-yellow-100' : 'border-yellow-800/30 bg-stone-900/40 text-stone-400'
              }`}
            >
              {m === 'desavantage' ? 'Désavantage' : m === 'normal' ? 'Normal' : 'Avantage'}
            </button>
          ))}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input type="checkbox" checked={prive} onChange={(e) => setPrive(e.target.checked)} />
        Jet privé (visible du MJ uniquement)
      </label>

      <button type="button" onClick={lancer} className="w-full py-3 rounded-lg font-bold text-gray-900 bg-[#C9A84C] hover:brightness-110">
        🎲 Lancer
      </button>

      {dernier && (
        <div className="rounded-xl border p-3 text-center" style={{ borderColor: 'rgba(201,168,76,0.4)', background: 'rgba(0,0,0,0.35)' }}>
          <p className="text-3xl font-bold text-yellow-100">{dernier.total}</p>
          <p className="text-stone-400 text-xs mt-1">{dernier.detail}</p>
        </div>
      )}

      {/* Historique */}
      <div>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Historique de la session</p>
        <ul className="space-y-1 max-h-56 overflow-y-auto">
          {historique
            .filter((e) => !(e.payload?.prive === true && e.actor_user_id !== userId))
            .map((e) => {
              const p = e.payload as Record<string, unknown>
              return (
                <li key={e.id} className="flex items-center justify-between text-sm rounded border border-yellow-800/15 bg-stone-900/30 px-2.5 py-1.5">
                  <span className="text-stone-400 truncate">
                    {p.prive === true ? '🔒 ' : ''}
                    <b className="text-stone-200">{String(p.nom ?? '?')}</b> · {String(p.label ?? 'jet')}
                  </span>
                  <span className="text-yellow-100 font-bold">{String(p.total ?? '')}</span>
                </li>
              )
            })}
          {historique.length === 0 && <li className="text-stone-500 text-sm italic">Aucun jet pour l'instant.</li>}
        </ul>
      </div>
    </div>
  )
}
