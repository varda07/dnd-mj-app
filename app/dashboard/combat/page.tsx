'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Scenario = { id: string; nom: string }

type BaseParticipant = {
  id: string
  nom: string
  hp_max: number
  hp_actuel: number
  dexterite: number
}

type Participant = BaseParticipant & { kind: 'perso' | 'ennemi' }

const GRID_COLS = 20
const GRID_ROWS = 12
const CELL_SIZE = 32

export default function Combat() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [scenarioId, setScenarioId] = useState('')
  const [personnages, setPersonnages] = useState<BaseParticipant[]>([])
  const [ennemis, setEnnemis] = useState<BaseParticipant[]>([])
  const [initiatives, setInitiatives] = useState<Record<string, number>>({})
  const [turnIndex, setTurnIndex] = useState(0)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null)

  useEffect(() => {
    fetchScenarios()
  }, [])

  useEffect(() => {
    if (scenarioId) fetchParticipants()
  }, [scenarioId])

  const fetchScenarios = async () => {
    const { data } = await supabase.from('scenarios').select('id, nom').order('nom')
    if (data) {
      setScenarios(data)
      if (data.length > 0) setScenarioId((current) => current || data[0].id)
    }
  }

  const fetchParticipants = async () => {
    const [{ data: p }, { data: e }] = await Promise.all([
      supabase
        .from('personnages')
        .select('id, nom, hp_max, hp_actuel, dexterite')
        .eq('scenario_id', scenarioId),
      supabase
        .from('ennemis')
        .select('id, nom, hp_max, hp_actuel, dexterite')
        .eq('scenario_id', scenarioId)
    ])
    const persos = p ?? []
    const enns = e ?? []
    setPersonnages(persos)
    setEnnemis(enns)

    const pos: Record<string, { x: number; y: number }> = {}
    persos.forEach((pe, i) => {
      pos[`perso-${pe.id}`] = { x: 2, y: 1 + (i % (GRID_ROWS - 2)) }
    })
    enns.forEach((en, i) => {
      pos[`ennemi-${en.id}`] = { x: GRID_COLS - 3, y: 1 + (i % (GRID_ROWS - 2)) }
    })
    setPositions(pos)
    setInitiatives({})
    setTurnIndex(0)
    setSelectedPieceId(null)
  }

  const participants: Participant[] = [
    ...personnages.map((p) => ({ kind: 'perso' as const, ...p })),
    ...ennemis.map((e) => ({ kind: 'ennemi' as const, ...e }))
  ]

  const pieceIdOf = (p: Participant) => `${p.kind}-${p.id}`

  const lancerInitiative = () => {
    const rolls: Record<string, number> = {}
    participants.forEach((p) => {
      const d20 = Math.floor(Math.random() * 20) + 1
      const mod = Math.floor((p.dexterite - 10) / 2)
      rolls[pieceIdOf(p)] = d20 + mod
    })
    setInitiatives(rolls)
    setTurnIndex(0)
  }

  const ordre = participants
    .map((p) => ({ p, init: initiatives[pieceIdOf(p)] }))
    .filter((x) => x.init !== undefined)
    .sort((a, b) => (b.init ?? 0) - (a.init ?? 0))

  const tourSuivant = () => {
    if (ordre.length === 0) return
    setTurnIndex((i) => (i + 1) % ordre.length)
  }

  const pieceAt = (x: number, y: number): Participant | undefined => {
    const found = Object.entries(positions).find(([, pos]) => pos.x === x && pos.y === y)
    if (!found) return undefined
    return participants.find((p) => pieceIdOf(p) === found[0])
  }

  const onCellClick = (x: number, y: number) => {
    const p = pieceAt(x, y)
    if (p) {
      const pid = pieceIdOf(p)
      setSelectedPieceId((prev) => (prev === pid ? null : pid))
      return
    }
    if (selectedPieceId) {
      setPositions((prev) => ({ ...prev, [selectedPieceId]: { x, y } }))
      setSelectedPieceId(null)
    }
  }

  const modifierHp = async (p: Participant, delta: number) => {
    const nouveauHp = Math.max(0, Math.min(p.hp_max, p.hp_actuel + delta))
    if (nouveauHp === p.hp_actuel) return
    const table = p.kind === 'perso' ? 'personnages' : 'ennemis'
    await supabase.from(table).update({ hp_actuel: nouveauHp }).eq('id', p.id)
    if (p.kind === 'perso') {
      setPersonnages((ps) =>
        ps.map((pp) => (pp.id === p.id ? { ...pp, hp_actuel: nouveauHp } : pp))
      )
    } else {
      setEnnemis((es) =>
        es.map((ee) => (ee.id === p.id ? { ...ee, hp_actuel: nouveauHp } : ee))
      )
    }
  }

  const tourActuelId = ordre[turnIndex]?.p ? pieceIdOf(ordre[turnIndex].p) : null

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => (window.location.href = '/dashboard')}
            className="text-gray-400 hover:text-white"
          >
            Retour
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">⚔️ Combat</h1>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg mb-4">
          <label className="text-gray-400 text-sm">Scénario actif</label>
          {scenarios.length === 0 ? (
            <p className="text-gray-400 mt-1">Aucun scénario disponible. Crées-en un d&apos;abord.</p>
          ) : (
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none mt-1"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-lg font-bold text-yellow-500 mb-3">Initiative</h2>
              <div className="flex gap-2 mb-3 flex-wrap">
                <button
                  type="button"
                  onClick={lancerInitiative}
                  disabled={participants.length === 0}
                  className="px-4 py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 disabled:opacity-50"
                >
                  🎲 Lancer l&apos;initiative
                </button>
                <button
                  type="button"
                  onClick={tourSuivant}
                  disabled={ordre.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 disabled:opacity-50"
                >
                  ⏭ Tour suivant
                </button>
              </div>
              {ordre.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  Lance l&apos;initiative pour déterminer l&apos;ordre du tour (d20 + modificateur de Dextérité).
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ordre.map(({ p, init }, i) => (
                    <span
                      key={pieceIdOf(p)}
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${
                        i === turnIndex
                          ? 'bg-yellow-500 text-gray-900 border-yellow-300 shadow-md'
                          : p.kind === 'perso'
                          ? 'bg-blue-900/40 text-blue-200 border-blue-700'
                          : 'bg-red-900/40 text-red-200 border-red-700'
                      }`}
                    >
                      {i + 1}. {p.nom} ({init})
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-lg font-bold text-yellow-500">Grille de combat</h2>
                <span className="text-gray-400 text-xs">1 case = 1,5 m</span>
              </div>
              {selectedPieceId && (
                <p className="text-yellow-400 text-sm mb-2">
                  ➜ Clique sur une case vide pour déplacer la pièce, ou re-clique dessus pour désélectionner.
                </p>
              )}
              <div className="overflow-auto">
                <div
                  className="inline-grid bg-gray-900 border border-gray-700 rounded"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
                    gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_SIZE}px)`
                  }}
                >
                  {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, i) => {
                    const x = i % GRID_COLS
                    const y = Math.floor(i / GRID_COLS)
                    const p = pieceAt(x, y)
                    const selected = p && selectedPieceId === pieceIdOf(p)
                    const isTurn = p && tourActuelId === pieceIdOf(p)
                    const canDrop = selectedPieceId && !p
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onCellClick(x, y)}
                        className={`border border-gray-700/60 flex items-center justify-center transition ${
                          canDrop ? 'hover:bg-yellow-500/20' : ''
                        }`}
                        style={{ width: CELL_SIZE, height: CELL_SIZE }}
                      >
                        {p && (
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-md ${
                              p.kind === 'perso' ? 'bg-blue-500' : 'bg-red-500'
                            } ${selected ? 'ring-2 ring-yellow-300 scale-110' : ''} ${
                              isTurn ? 'ring-2 ring-yellow-400 animate-pulse' : ''
                            }`}
                            title={`${p.nom} (${p.hp_actuel}/${p.hp_max})`}
                          >
                            {p.nom[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-400 mt-3">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-blue-500" /> Personnages
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> Ennemis
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg lg:sticky lg:top-4 lg:self-start max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-yellow-500 mb-3">Points de vie</h2>
            {participants.length === 0 ? (
              <p className="text-gray-400 text-sm">
                Aucun participant pour ce scénario.
              </p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => {
                  const pct = p.hp_max > 0 ? (p.hp_actuel / p.hp_max) * 100 : 0
                  const barColor =
                    pct <= 25 ? 'bg-red-500' : pct <= 50 ? 'bg-orange-500' : 'bg-green-500'
                  const isTurn = tourActuelId === pieceIdOf(p)
                  return (
                    <div
                      key={pieceIdOf(p)}
                      className={`p-3 rounded border ${
                        isTurn ? 'border-yellow-400 bg-gray-700/50' : 'border-gray-700 bg-gray-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            p.kind === 'perso' ? 'bg-blue-500' : 'bg-red-500'
                          }`}
                        />
                        <span className="text-white font-bold truncate">{p.nom}</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded overflow-hidden mb-2">
                        <div
                          className={`h-full transition-all ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-300 text-sm">
                          ❤️ {p.hp_actuel}/{p.hp_max}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => modifierHp(p, -5)}
                            className="w-7 h-7 bg-red-700 rounded text-white text-xs font-bold hover:bg-red-600"
                            title="-5 PV"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() => modifierHp(p, -1)}
                            className="w-7 h-7 bg-red-600 rounded text-white font-bold hover:bg-red-500"
                            title="-1 PV"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => modifierHp(p, 1)}
                            className="w-7 h-7 bg-green-600 rounded text-white font-bold hover:bg-green-500"
                            title="+1 PV"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => modifierHp(p, 5)}
                            className="w-7 h-7 bg-green-700 rounded text-white text-xs font-bold hover:bg-green-600"
                            title="+5 PV"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
