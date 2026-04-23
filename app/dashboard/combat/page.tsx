'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import {
  CONDITIONS,
  CONDITIONS_MAP,
  isConditionKey,
  type ConditionKey
} from '@/app/data/conditions'

type Scenario = { id: string; nom: string; bg_image_url: string | null }

type BaseParticipant = {
  id: string
  nom: string
  hp_max: number
  hp_actuel: number
  dexterite: number
  image_url?: string | null
  conditions: ConditionKey[]
}

type Participant = BaseParticipant & { kind: 'perso' | 'ennemi' }

type Item = {
  id: string
  nom: string
  description: string
  type: string
  rarete: string
  scenario_id: string | null
  personnage_id: string | null
}

const GRID_COLS = 20
const GRID_ROWS = 12
const CELL_SIZE = 32

// useSearchParams exige un <Suspense> parent pour que la page compile au
// build (même en force-dynamic). On garde Combat comme default export pour
// ne pas casser `import Combat from './combat/page'` côté dashboard.
export default function Combat() {
  return (
    <Suspense fallback={null}>
      <CombatInner />
    </Suspense>
  )
}

function CombatInner() {
  const searchParams = useSearchParams()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [scenarioId, setScenarioId] = useState('')
  const [personnages, setPersonnages] = useState<BaseParticipant[]>([])
  const [ennemis, setEnnemis] = useState<BaseParticipant[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [combatDemarre, setCombatDemarre] = useState(false)
  const [initiatives, setInitiatives] = useState<Record<string, number>>({})
  const [turnIndex, setTurnIndex] = useState(0)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null)
  const [bgImageUrl, setBgImageUrl] = useState('')
  const [uploadingBg, setUploadingBg] = useState(false)
  const [showVictory, setShowVictory] = useState(false)
  const [attributionTarget, setAttributionTarget] = useState<Record<string, string>>({})
  const [menuConditionsPour, setMenuConditionsPour] = useState<string | null>(null)
  const tCombat = useTranslations('combat')
  const tc = useTranslations('common')
  const tCond = useTranslations('conditions')

  useEffect(() => {
    fetchScenarios()
  }, [])

  useEffect(() => {
    const sid = searchParams.get('scenario_id')
    if (sid && scenarios.some((s) => s.id === sid)) {
      setScenarioId(sid)
    }
  }, [scenarios, searchParams])

  useEffect(() => {
    if (scenarioId) fetchCombatData()
  }, [scenarioId])

  const fetchScenarios = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('scenarios')
      .select('*')
      .eq('mj_id', user.id)
    console.log('[combat] scenarios fetched:', data)
    if (error) console.error('[combat] erreur Supabase scenarios:', error)
    if (data) {
      setScenarios(data)
    }
  }

  const fetchCombatData = async () => {
    const scenario = scenarios.find((s) => s.id === scenarioId)
    setBgImageUrl(scenario?.bg_image_url ?? '')

    const [{ data: p }, { data: e }, { data: it }] = await Promise.all([
      supabase
        .from('personnages')
        .select('id, nom, hp_max, hp_actuel, dexterite, image_url, conditions')
        .eq('scenario_id', scenarioId),
      supabase
        .from('ennemis')
        .select('id, nom, hp_max, hp_actuel, dexterite, image_url, conditions')
        .eq('scenario_id', scenarioId),
      supabase.from('items').select('*').eq('scenario_id', scenarioId)
    ])
    const normaliseConditions = (raw: unknown): ConditionKey[] =>
      Array.isArray(raw) ? raw.filter(isConditionKey) : []
    const persos = (p ?? []).map((x) => ({
      ...x,
      conditions: normaliseConditions((x as { conditions?: unknown }).conditions)
    }))
    const enns = (e ?? []).map((x) => ({
      ...x,
      conditions: normaliseConditions((x as { conditions?: unknown }).conditions)
    }))
    setPersonnages(persos)
    setEnnemis(enns)
    setItems(it ?? [])

    const allIds = new Set<string>()
    persos.forEach((pe) => allIds.add(`perso-${pe.id}`))
    enns.forEach((en) => allIds.add(`ennemi-${en.id}`))
    setSelectedIds(allIds)

    setCombatDemarre(false)
    setPositions({})
    setInitiatives({})
    setTurnIndex(0)
    setSelectedPieceId(null)
  }

  const toggleParticipant = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = (kind: 'perso' | 'ennemi', check: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const liste = kind === 'perso' ? personnages : ennemis
      liste.forEach((x) => {
        const id = `${kind}-${x.id}`
        if (check) next.add(id)
        else next.delete(id)
      })
      return next
    })
  }

  const participants: Participant[] = [
    ...personnages.map((p) => ({ kind: 'perso' as const, ...p })),
    ...ennemis.map((e) => ({ kind: 'ennemi' as const, ...e }))
  ]

  const pieceIdOf = (p: Participant) => `${p.kind}-${p.id}`

  const participantsEnCombat = participants.filter((p) => selectedIds.has(pieceIdOf(p)))

  const demarrerCombat = () => {
    if (selectedIds.size === 0) return
    const pos: Record<string, { x: number; y: number }> = {}
    const persosSel = personnages.filter((p) => selectedIds.has(`perso-${p.id}`))
    const ennemisSel = ennemis.filter((e) => selectedIds.has(`ennemi-${e.id}`))
    persosSel.forEach((pe, i) => {
      pos[`perso-${pe.id}`] = { x: 2, y: 1 + (i % (GRID_ROWS - 2)) }
    })
    ennemisSel.forEach((en, i) => {
      pos[`ennemi-${en.id}`] = { x: GRID_COLS - 3, y: 1 + (i % (GRID_ROWS - 2)) }
    })
    setPositions(pos)
    setInitiatives({})
    setTurnIndex(0)
    setSelectedPieceId(null)
    setCombatDemarre(true)
  }

  const lancerInitiative = () => {
    const rolls: Record<string, number> = {}
    participantsEnCombat.forEach((p) => {
      const d20 = Math.floor(Math.random() * 20) + 1
      const mod = Math.floor((p.dexterite - 10) / 2)
      rolls[pieceIdOf(p)] = d20 + mod
    })
    setInitiatives(rolls)
    setTurnIndex(0)
  }

  const ordre = participantsEnCombat
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
    return participantsEnCombat.find((p) => pieceIdOf(p) === found[0])
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

  const basculerCondition = async (p: Participant, cle: ConditionKey) => {
    const present = p.conditions.includes(cle)
    const nouvelles = present
      ? p.conditions.filter((c) => c !== cle)
      : [...p.conditions, cle]
    const table = p.kind === 'perso' ? 'personnages' : 'ennemis'
    const { error } = await supabase
      .from(table)
      .update({ conditions: nouvelles })
      .eq('id', p.id)
    if (error) {
      console.error('[combat] maj conditions :', error)
      return
    }
    if (p.kind === 'perso') {
      setPersonnages((ps) =>
        ps.map((pp) => (pp.id === p.id ? { ...pp, conditions: nouvelles } : pp))
      )
    } else {
      setEnnemis((es) =>
        es.map((ee) => (ee.id === p.id ? { ...ee, conditions: nouvelles } : ee))
      )
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

  const resetInterface = () => {
    setShowVictory(false)
    setCombatDemarre(false)
    setScenarioId('')
    setPersonnages([])
    setEnnemis([])
    setItems([])
    setPositions({})
    setSelectedIds(new Set())
    setInitiatives({})
    setTurnIndex(0)
    setSelectedPieceId(null)
    setBgImageUrl('')
  }

  const terminerCombat = async () => {
    const persosEnCombat = personnages.filter((p) => selectedIds.has(`perso-${p.id}`))
    const ennemisEnCombat = ennemis.filter((e) => selectedIds.has(`ennemi-${e.id}`))

    await Promise.all([
      ...persosEnCombat.map((p) =>
        supabase.from('personnages').update({ hp_actuel: p.hp_max }).eq('id', p.id)
      ),
      ...ennemisEnCombat.map((e) =>
        supabase.from('ennemis').update({ hp_actuel: e.hp_max }).eq('id', e.id)
      )
    ])

    setPersonnages((ps) => ps.map((p) => ({ ...p, hp_actuel: p.hp_max })))
    setEnnemis((es) => es.map((e) => ({ ...e, hp_actuel: e.hp_max })))

    setShowVictory(true)
    setTimeout(() => {
      resetInterface()
    }, 3000)
  }

  const attribuerItem = async (itemId: string, personnageId: string) => {
    if (!personnageId) return
    const { error } = await supabase
      .from('items')
      .update({ personnage_id: personnageId })
      .eq('id', itemId)
    if (error) {
      console.error('[combat] attribution item:', error)
      return
    }
    setItems((arr) =>
      arr.map((i) => (i.id === itemId ? { ...i, personnage_id: personnageId } : i))
    )
    setAttributionTarget((t) => ({ ...t, [itemId]: '' }))
  }

  const retirerAttribution = async (itemId: string) => {
    await supabase.from('items').update({ personnage_id: null }).eq('id', itemId)
    setItems((arr) =>
      arr.map((i) => (i.id === itemId ? { ...i, personnage_id: null } : i))
    )
  }

  const uploaderBg = async (file: File) => {
    setUploadingBg(true)
    const { data: { user } } = await supabase.auth.getUser()
    const ext = file.name.split('.').pop()
    const path = `${user?.id}/${scenarioId}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('battle map').upload(path, file)
    if (uploadError) {
      console.error('[combat] upload bg:', uploadError)
      alert(`Erreur upload : ${uploadError.message}`)
      setUploadingBg(false)
      return
    }
    const { data: urlData } = supabase.storage.from('battle map').getPublicUrl(path)
    const url = urlData.publicUrl
    const { error: updError } = await supabase
      .from('scenarios')
      .update({ bg_image_url: url })
      .eq('id', scenarioId)
    if (updError) console.error('[combat] save bg url:', updError)
    setBgImageUrl(url)
    setScenarios((ss) =>
      ss.map((s) => (s.id === scenarioId ? { ...s, bg_image_url: url } : s))
    )
    setUploadingBg(false)
  }

  const retirerBg = async () => {
    await supabase.from('scenarios').update({ bg_image_url: null }).eq('id', scenarioId)
    setBgImageUrl('')
    setScenarios((ss) =>
      ss.map((s) => (s.id === scenarioId ? { ...s, bg_image_url: null } : s))
    )
  }

  const tourActuelId = ordre[turnIndex]?.p ? pieceIdOf(ordre[turnIndex].p) : null

  const itemsDisponibles = items.filter((i) => !i.personnage_id)
  const itemsAttribues = items.filter((i) => i.personnage_id)
  const nomPerso = (id: string) => personnages.find((p) => p.id === id)?.nom ?? '?'

  const nbPersosSel = personnages.filter((p) => selectedIds.has(`perso-${p.id}`)).length
  const nbEnnemisSel = ennemis.filter((e) => selectedIds.has(`ennemi-${e.id}`)).length

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => (window.location.href = '/dashboard')}
            className="text-gray-400 hover:text-white"
          >
            {tc('back')}
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">{tCombat('title')}</h1>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg mb-4">
          <label className="text-gray-400 text-sm">{tCombat('scenario_active')}</label>
          {scenarios.length === 0 ? (
            <div className="mt-2 p-3 rounded border border-red-500 bg-red-900/30 text-red-200 text-sm">
              {tCombat('no_scenario_warning')}
            </div>
          ) : (
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              disabled={combatDemarre}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none mt-1 disabled:opacity-60"
            >
              <option value="">{tCombat('choose_scenario')}</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          )}
        </div>

        {scenarioId && !combatDemarre && (
          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <h2 className="text-lg font-bold text-yellow-500 mb-3">{tCombat('selection_title')}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-blue-400 font-bold">
                    {tCombat('characters')} ({nbPersosSel}/{personnages.length})
                  </h3>
                  {personnages.length > 0 && (
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleAll('perso', true)}
                        className="text-gray-400 hover:text-white"
                      >
                        {tCombat('all')}
                      </button>
                      <span className="text-gray-600">|</span>
                      <button
                        type="button"
                        onClick={() => toggleAll('perso', false)}
                        className="text-gray-400 hover:text-white"
                      >
                        {tCombat('none')}
                      </button>
                    </div>
                  )}
                </div>
                {personnages.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">
                    {tCombat('no_linked_characters')}
                  </p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {personnages.map((p) => {
                      const id = `perso-${p.id}`
                      const checked = selectedIds.has(id)
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                            checked ? 'bg-blue-900/30' : 'bg-gray-900/30 hover:bg-gray-700/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParticipant(id)}
                            className="w-4 h-4 accent-blue-500"
                          />
                          <span className="text-white">{p.nom}</span>
                          <span className="text-gray-400 text-xs ml-auto">
                            ❤️ {p.hp_actuel}/{p.hp_max}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-red-400 font-bold">
                    {tCombat('enemies')} ({nbEnnemisSel}/{ennemis.length})
                  </h3>
                  {ennemis.length > 0 && (
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleAll('ennemi', true)}
                        className="text-gray-400 hover:text-white"
                      >
                        {tCombat('all')}
                      </button>
                      <span className="text-gray-600">|</span>
                      <button
                        type="button"
                        onClick={() => toggleAll('ennemi', false)}
                        className="text-gray-400 hover:text-white"
                      >
                        {tCombat('none')}
                      </button>
                    </div>
                  )}
                </div>
                {ennemis.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">
                    {tCombat('no_linked_enemies')}
                  </p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {ennemis.map((e) => {
                      const id = `ennemi-${e.id}`
                      const checked = selectedIds.has(id)
                      return (
                        <label
                          key={e.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                            checked ? 'bg-red-900/30' : 'bg-gray-900/30 hover:bg-gray-700/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParticipant(id)}
                            className="w-4 h-4 accent-red-500"
                          />
                          <span className="text-white">{e.nom}</span>
                          <span className="text-gray-400 text-xs ml-auto">
                            ❤️ {e.hp_actuel}/{e.hp_max}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={demarrerCombat}
              disabled={selectedIds.size === 0}
              className="w-full px-4 py-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 disabled:opacity-50"
            >
              {tCombat('start')} ({tCombat('participants_count', { n: selectedIds.size })})
            </button>
          </div>
        )}

        {combatDemarre && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-lg font-bold text-yellow-500 mb-3">{tCombat('initiative')}</h2>
                <div className="flex gap-2 mb-3 flex-wrap">
                  <button
                    type="button"
                    onClick={lancerInitiative}
                    disabled={participantsEnCombat.length === 0}
                    className="px-4 py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {tCombat('roll_initiative')}
                  </button>
                  <button
                    type="button"
                    onClick={tourSuivant}
                    disabled={ordre.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 disabled:opacity-50"
                  >
                    {tCombat('next_turn')}
                  </button>
                  <button
                    type="button"
                    onClick={terminerCombat}
                    disabled={showVictory}
                    className="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-500 disabled:opacity-50"
                  >
                    {tCombat('end_combat')}
                  </button>
                </div>
                {ordre.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    {tCombat('no_initiative_yet')}
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
                  <h2 className="text-lg font-bold text-yellow-500">{tCombat('grid_title')}</h2>
                  <span className="text-gray-400 text-xs">{tCombat('grid_legend')}</span>
                </div>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <label className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm cursor-pointer text-white">
                    {uploadingBg ? tCombat('uploading_bg') : tCombat('choose_bg')}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingBg || !scenarioId}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) uploaderBg(f)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {bgImageUrl && (
                    <button
                      type="button"
                      onClick={retirerBg}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-red-900/50 rounded text-sm text-gray-300"
                    >
                      {tCombat('remove_bg')}
                    </button>
                  )}
                </div>

                {selectedPieceId && (
                  <p className="text-yellow-400 text-sm mb-2">
                    {tCombat('move_hint')}
                  </p>
                )}
                <div className="overflow-auto">
                  <div
                    className="inline-grid border border-gray-700 rounded"
                    style={{
                      gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
                      gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_SIZE}px)`,
                      backgroundColor: bgImageUrl ? undefined : '#111827',
                      backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
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
                          className={`flex items-center justify-center transition ${
                            bgImageUrl
                              ? 'border border-white/20 hover:border-white/40'
                              : 'border border-gray-700/60'
                          } ${canDrop ? 'hover:bg-yellow-500/20' : ''}`}
                          style={{ width: CELL_SIZE, height: CELL_SIZE }}
                        >
                          {p && (
                            p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.nom}
                                title={`${p.nom} (${p.hp_actuel}/${p.hp_max})`}
                                className={`w-7 h-7 ${
                                  p.kind === 'perso' ? 'rounded-full' : 'rounded'
                                } object-cover shadow-md ring-2 ${
                                  p.kind === 'perso' ? 'ring-blue-400' : 'ring-red-400'
                                } ${selected ? '!ring-yellow-300 scale-110' : ''} ${
                                  isTurn ? '!ring-yellow-400 animate-pulse' : ''
                                }`}
                              />
                            ) : (
                              <div
                                className={`w-7 h-7 flex items-center justify-center font-bold text-xs text-white shadow-md ${
                                  p.kind === 'perso'
                                    ? 'rounded-full bg-blue-500'
                                    : 'rounded bg-red-500'
                                } ${selected ? 'ring-2 ring-yellow-300 scale-110' : ''} ${
                                  isTurn ? 'ring-2 ring-yellow-400 animate-pulse' : ''
                                }`}
                                title={`${p.nom} (${p.hp_actuel}/${p.hp_max})`}
                              >
                                {p.nom.slice(0, 2).toUpperCase() || '?'}
                              </div>
                            )
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-gray-400 mt-3">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500" /> {tCombat('characters')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> {tCombat('enemies')}
                  </span>
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-lg font-bold text-yellow-500 mb-3">{tCombat('rewards')}</h2>
                {items.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    {tCombat('no_items_linked')}
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-300 text-sm font-bold mb-2">{tCombat('available_items')} ({itemsDisponibles.length})</p>
                      {itemsDisponibles.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">{tCombat('all_attributed')}</p>
                      ) : (
                        <div className="space-y-2">
                          {itemsDisponibles.map((i) => (
                            <div key={i.id} className="bg-gray-900/50 border border-gray-700 rounded p-3">
                              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                <div>
                                  <span className="text-white font-bold">{i.nom}</span>
                                  <span className="text-gray-400 text-xs ml-2">
                                    {i.type} · {i.rarete}
                                  </span>
                                </div>
                              </div>
                              {i.description && (
                                <p className="text-gray-500 text-xs italic mb-2">{i.description}</p>
                              )}
                              <div className="flex gap-2 items-center flex-wrap">
                                <select
                                  value={attributionTarget[i.id] ?? ''}
                                  onChange={(ev) =>
                                    setAttributionTarget((t) => ({ ...t, [i.id]: ev.target.value }))
                                  }
                                  className="flex-1 p-2 rounded bg-gray-700 text-white border border-gray-600 text-sm outline-none"
                                  disabled={personnages.length === 0}
                                >
                                  <option value="">
                                    {personnages.length === 0
                                      ? tCombat('no_character_in_scenario')
                                      : tCombat('choose_character')}
                                  </option>
                                  {personnages.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.nom}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => attribuerItem(i.id, attributionTarget[i.id] ?? '')}
                                  disabled={!attributionTarget[i.id]}
                                  className="px-3 py-2 bg-yellow-500 text-gray-900 font-bold rounded text-sm hover:bg-yellow-400 disabled:opacity-50"
                                >
                                  {tCombat('attribute')}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {itemsAttribues.length > 0 && (
                      <div>
                        <p className="text-gray-300 text-sm font-bold mb-2">
                          {tCombat('attributed_items')} ({itemsAttribues.length})
                        </p>
                        <div className="space-y-2">
                          {itemsAttribues.map((i) => (
                            <div
                              key={i.id}
                              className="bg-blue-900/20 border border-blue-700/50 rounded p-3 flex items-center justify-between gap-2 flex-wrap"
                            >
                              <div>
                                <span className="text-white font-bold">{i.nom}</span>
                                <span className="text-gray-400 text-xs ml-2">
                                  → {nomPerso(i.personnage_id!)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => retirerAttribution(i.id)}
                                className="text-red-400 hover:text-red-300 text-xs"
                              >
                                {tCombat('remove_attrib')}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg lg:sticky lg:top-4 lg:self-start max-h-[85vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-yellow-500 mb-3">{tCombat('hp_title')}</h2>
              {participantsEnCombat.length === 0 ? (
                <p className="text-gray-400 text-sm">{tCombat('no_participants')}</p>
              ) : (
                <div className="space-y-2">
                  {participantsEnCombat.map((p) => {
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

                        <div className="mt-2 pt-2 border-t border-gray-700/60">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">
                              {tCombat('conditions_count', { n: p.conditions.length })}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setMenuConditionsPour((prev) =>
                                  prev === pieceIdOf(p) ? null : pieceIdOf(p)
                                )
                              }
                              className="px-2 py-0.5 rounded bg-purple-700 hover:bg-purple-600 text-white text-[11px] font-bold"
                              title={tCombat('add_condition_tooltip')}
                            >
                              {tCombat('add_condition')}
                            </button>
                          </div>

                          {p.conditions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {p.conditions.map((cle) => {
                                const c = CONDITIONS_MAP[cle]
                                if (!c) return null
                                const nomTr = tCond(cle)
                                return (
                                  <button
                                    key={cle}
                                    type="button"
                                    onClick={() => basculerCondition(p, cle)}
                                    className="group relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/60 hover:bg-red-900/60 hover:border-red-500/60 text-purple-100 text-[11px] transition"
                                    title={`${nomTr} — ${c.description} (${tCombat('click_to_remove')})`}
                                  >
                                    <span>{c.icone}</span>
                                    <span>{nomTr}</span>
                                    <span className="opacity-0 group-hover:opacity-100 transition text-red-200 ml-0.5">
                                      ✕
                                    </span>
                                    <span
                                      className="pointer-events-none absolute left-0 top-full mt-1 z-20 hidden group-hover:block w-64 p-2 rounded bg-gray-900 border border-purple-600/60 text-[11px] text-gray-200 shadow-xl"
                                      style={{ letterSpacing: 'normal', textTransform: 'none', fontWeight: 400 }}
                                    >
                                      <span className="block font-bold text-purple-200 mb-1">
                                        {c.icone} {nomTr}
                                      </span>
                                      <span className="block text-gray-300 mb-1">{c.description}</span>
                                      {c.effets.length > 0 && (
                                        <span className="block text-gray-400 text-[10px]">
                                          {c.effets.map((eff, i) => (
                                            <span key={i} className="block">• {eff}</span>
                                          ))}
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {menuConditionsPour === pieceIdOf(p) && (
                            <div className="mt-1 p-2 rounded bg-gray-900/90 border border-purple-600/40 max-h-56 overflow-y-auto">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] uppercase tracking-[0.15em] text-purple-300">
                                  {tCombat('choose_condition')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setMenuConditionsPour(null)}
                                  className="text-gray-400 hover:text-white text-xs"
                                  aria-label="Fermer"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="grid grid-cols-1 gap-0.5">
                                {CONDITIONS.map((c) => {
                                  const active = p.conditions.includes(c.key)
                                  return (
                                    <button
                                      key={c.key}
                                      type="button"
                                      onClick={() => basculerCondition(p, c.key)}
                                      title={c.description}
                                      className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] text-left transition ${
                                        active
                                          ? 'bg-purple-700/60 text-white'
                                          : 'hover:bg-gray-800 text-gray-300'
                                      }`}
                                    >
                                      <span className="text-base leading-none">{c.icone}</span>
                                      <span className="flex-1">{tCond(c.key)}</span>
                                      {active && <span className="text-green-300">✓</span>}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showVictory && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700 p-8 rounded-xl border-4 border-yellow-300 shadow-2xl max-w-lg w-full text-center animate-pulse">
            <h2 className="text-5xl font-bold text-gray-900 mb-3">{tCombat('victory')}</h2>
            <p className="text-gray-900 font-bold mb-4 text-lg">
              {tCombat('victory_msg')}
            </p>
            {itemsDisponibles.length > 0 ? (
              <div>
                <p className="text-gray-900 font-bold mb-2">{tCombat('loot')}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {itemsDisponibles.map((i) => (
                    <span
                      key={i.id}
                      className="px-3 py-1 rounded-full bg-gray-900 text-yellow-300 text-sm border border-yellow-400"
                    >
                      ✨ {i.nom} <span className="text-gray-400">({i.rarete})</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-800 italic text-sm">{tCombat('no_loot')}</p>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
