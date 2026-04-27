'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import {
  CONDITIONS,
  CONDITIONS_MAP,
  isConditionKey,
  type ConditionKey
} from '@/app/data/conditions'

type Scenario = { id: string; nom: string; bg_image_url: string | null; mj_id: string }

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

type InitiativeEntry = {
  piece_id: string
  init: number
  nom: string
  kind: 'perso' | 'ennemi'
  ref_id: string
  image_url: string | null
}

type StatutKO = 'inconscient' | 'stabilise' | 'mort' | 'vaincu'

type EtatCombat = {
  status: StatutKO
  death_success?: number
  death_failure?: number
}

type CombatRow = {
  id: string
  scenario_id: string
  round: number
  tour_actuel: number
  ordre_initiative: InitiativeEntry[]
  actif: boolean
  etats_combat?: Record<string, EtatCombat>
}

const GRID_COLS = 20
const GRID_ROWS = 12
const CELL_SIZE = 32

const TIMER_PRESETS = [
  { value: 0, label: 'Illimité' },
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' }
]

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
  const [userId, setUserId] = useState<string>('')
  const [round, setRound] = useState(1)
  const [combatId, setCombatId] = useState<string | null>(null)
  const [ordreSauvegarde, setOrdreSauvegarde] = useState<InitiativeEntry[]>([])
  const [showRoundAnnouncement, setShowRoundAnnouncement] = useState(false)
  const [timerDuration, setTimerDuration] = useState<number>(0)
  const [timerSec, setTimerSec] = useState<number>(0)
  const [timerExpired, setTimerExpired] = useState(false)
  const [etatsCombat, setEtatsCombat] = useState<Record<string, EtatCombat>>({})
  const [koAnimating, setKoAnimating] = useState<Set<string>>(new Set())
  const [koFlash, setKoFlash] = useState<'perso' | 'ennemi' | null>(null)
  const prevHpRef = useRef<Record<string, number>>({})
  const koTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const tCombat = useTranslations('combat')
  const tc = useTranslations('common')
  const tCond = useTranslations('conditions')

  const scenario = scenarios.find((s) => s.id === scenarioId)
  const isMJ = !!scenario && scenario.mj_id === userId
  const isMJRef = useRef(isMJ)
  isMJRef.current = isMJ

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const roundAnnouncementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Realtime : les joueurs reçoivent l'état du combat ; le MJ ignore les
  // échos de ses propres écritures pour éviter les race conditions sur des
  // clics rapides (tour suivant cliqué 2× avant que le 1er save ne revienne).
  useEffect(() => {
    if (!scenarioId) return
    const channel = supabase
      .channel(`combat:${scenarioId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'combats',
          filter: `scenario_id=eq.${scenarioId}`
        },
        (payload) => {
          if (isMJRef.current) return
          const row = payload.new as CombatRow | undefined
          if (!row) return
          if (Array.isArray(row.ordre_initiative)) {
            setOrdreSauvegarde(row.ordre_initiative)
            const initRec: Record<string, number> = {}
            row.ordre_initiative.forEach((entry) => { initRec[entry.piece_id] = entry.init })
            setInitiatives(initRec)
          }
          setRound(row.round ?? 1)
          setTurnIndex((prev) => {
            if (prev !== (row.tour_actuel ?? 0)) setTimerExpired(false)
            return row.tour_actuel ?? 0
          })
          if (row.etats_combat && typeof row.etats_combat === 'object') {
            setEtatsCombat(row.etats_combat as Record<string, EtatCombat>)
          }
          setCombatId(row.id)
          setCombatDemarre(row.actif !== false && Array.isArray(row.ordre_initiative) && row.ordre_initiative.length > 0)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [scenarioId])

  // Timer : redémarre à chaque changement de tour quand une durée est configurée.
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (!combatDemarre || timerDuration <= 0 || ordreSauvegarde.length === 0) {
      setTimerSec(0)
      return
    }
    setTimerSec(timerDuration)
    setTimerExpired(false)
    timerIntervalRef.current = setInterval(() => {
      setTimerSec((s) => {
        if (s <= 1) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current)
            timerIntervalRef.current = null
          }
          setTimerExpired(true)
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([60, 30, 60])
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [turnIndex, round, timerDuration, combatDemarre, ordreSauvegarde.length])

  useEffect(() => {
    const koTimers = koTimerRef.current
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (roundAnnouncementTimeoutRef.current) clearTimeout(roundAnnouncementTimeoutRef.current)
      console.log('[KO]', performance.now().toFixed(0), 'UNMOUNT — clear', koTimers.size, 'timer(s) actif(s) :', Array.from(koTimers.keys()))
      koTimers.forEach((t) => clearTimeout(t))
      koTimers.clear()
    }
  }, [])

  useEffect(() => {
    console.log('[KO]', performance.now().toFixed(0), 'koAnimating Set:', Array.from(koAnimating), 'size:', koAnimating.size)
  }, [koAnimating])

  useEffect(() => {
    console.log('[KO]', performance.now().toFixed(0), 'etatsCombat:', etatsCombat)
  }, [etatsCombat])

  const fetchScenarios = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data, error } = await supabase
      .from('scenarios')
      .select('*')
      .eq('mj_id', user.id)
    if (error) console.error('[combat] erreur Supabase scenarios:', error)
    if (data) {
      setScenarios(data)
    }
  }

  const fetchCombatData = async () => {
    const scenario = scenarios.find((s) => s.id === scenarioId)
    setBgImageUrl(scenario?.bg_image_url ?? '')

    const [{ data: p }, { data: e }, { data: it }, { data: cb }] = await Promise.all([
      supabase
        .from('personnages')
        .select('id, nom, hp_max, hp_actuel, dexterite, image_url, conditions')
        .eq('scenario_id', scenarioId),
      supabase
        .from('ennemis')
        .select('id, nom, hp_max, hp_actuel, dexterite, image_url, conditions')
        .eq('scenario_id', scenarioId),
      supabase.from('items').select('*').eq('scenario_id', scenarioId),
      supabase.from('combats').select('*').eq('scenario_id', scenarioId).maybeSingle()
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

    setPositions({})
    setSelectedPieceId(null)

    if (cb && cb.actif && Array.isArray(cb.ordre_initiative) && cb.ordre_initiative.length > 0) {
      const ordre = cb.ordre_initiative as InitiativeEntry[]
      setCombatId(cb.id)
      setRound(cb.round ?? 1)
      setTurnIndex(cb.tour_actuel ?? 0)
      setOrdreSauvegarde(ordre)
      const initRecord: Record<string, number> = {}
      ordre.forEach((entry) => { initRecord[entry.piece_id] = entry.init })
      setInitiatives(initRecord)
      setEtatsCombat((cb.etats_combat as Record<string, EtatCombat>) ?? {})
      setCombatDemarre(true)
    } else {
      setCombatId(cb?.id ?? null)
      setRound(1)
      setTurnIndex(0)
      setOrdreSauvegarde([])
      setInitiatives({})
      setEtatsCombat({})
      setCombatDemarre(false)
    }

    // Initialise les HP précédents pour la détection de KO (évite de
    // déclencher l'animation sur un participant déjà à 0 au chargement).
    const hpInit: Record<string, number> = {}
    persos.forEach((pe) => { hpInit[`perso-${pe.id}`] = pe.hp_actuel })
    enns.forEach((en) => { hpInit[`ennemi-${en.id}`] = en.hp_actuel })
    prevHpRef.current = hpInit
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
    setOrdreSauvegarde([])
    setTurnIndex(0)
    setRound(1)
    setSelectedPieceId(null)
    setCombatDemarre(true)
    setTimerExpired(false)
  }

  const saveCombatState = useCallback(async (
    patch: { round?: number; tour_actuel?: number; ordre_initiative?: InitiativeEntry[]; actif?: boolean; etats_combat?: Record<string, EtatCombat> }
  ) => {
    if (!isMJRef.current || !scenarioId) return
    const payload = {
      scenario_id: scenarioId,
      ...patch
    }
    const { data, error } = await supabase
      .from('combats')
      .upsert(payload, { onConflict: 'scenario_id' })
      .select()
      .single()
    if (error) {
      // Diagnostic détaillé : code Postgres + message + details + hint.
      // 42P01 = relation inexistante (table absente) ; 42703 = colonne inexistante ;
      // 23503 = FK invalide (scenario_id introuvable) ; 42501 = RLS refuse l'écriture.
      const diag = {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      }
      console.error('[combat] upsert combats échec :', diag, '\nPayload envoyé :', payload)
      let humanMsg = `Sauvegarde combat impossible.\n\nCode : ${error.code || '(vide)'}\nMessage : ${error.message || '(vide)'}\nDétails : ${error.details || '(vide)'}\nHint : ${error.hint || '(vide)'}`
      if (error.code === '42P01') {
        humanMsg += '\n\n→ La table "combats" n\'existe pas. Exécute supabase/combats_state.sql dans le SQL Editor.'
      } else if (error.code === '42703') {
        humanMsg += '\n\n→ Une colonne manque sur la table combats. Re-exécute supabase/combats_state.sql (l\'ALTER TABLE ajoute etats_combat si besoin).'
      } else if (error.code === '42501') {
        humanMsg += '\n\n→ RLS refuse l\'écriture. Vérifie que le scénario t\'appartient (mj_id = ton user.id) et que les policies de combats_state.sql ont bien été créées.'
      }
      alert(humanMsg)
      return
    }
    if (data?.id) setCombatId(data.id)
  }, [scenarioId])

  const lancerInitiative = () => {
    const rolls: Record<string, number> = {}
    const snapshot: InitiativeEntry[] = participantsEnCombat.map((p) => {
      const d20 = Math.floor(Math.random() * 20) + 1
      const mod = Math.floor((p.dexterite - 10) / 2)
      const init = d20 + mod
      const pieceId = pieceIdOf(p)
      rolls[pieceId] = init
      return {
        piece_id: pieceId,
        init,
        nom: p.nom,
        kind: p.kind,
        ref_id: p.id,
        image_url: p.image_url ?? null
      }
    })
    snapshot.sort((a, b) => b.init - a.init)
    setInitiatives(rolls)
    setOrdreSauvegarde(snapshot)
    setTurnIndex(0)
    setRound(1)
    setTimerExpired(false)
    saveCombatState({ round: 1, tour_actuel: 0, ordre_initiative: snapshot, actif: true })
  }

  const triggerRoundAnnouncement = useCallback(() => {
    setShowRoundAnnouncement(true)
    if (roundAnnouncementTimeoutRef.current) clearTimeout(roundAnnouncementTimeoutRef.current)
    roundAnnouncementTimeoutRef.current = setTimeout(() => {
      setShowRoundAnnouncement(false)
      roundAnnouncementTimeoutRef.current = null
    }, 1800)
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([20, 40, 20])
  }, [])

  const tourSuivant = () => {
    if (ordreSauvegarde.length === 0) return
    setTimerExpired(false)
    if (turnIndex >= ordreSauvegarde.length - 1) {
      const nextRound = round + 1
      setRound(nextRound)
      setTurnIndex(0)
      triggerRoundAnnouncement()
      saveCombatState({ round: nextRound, tour_actuel: 0 })
    } else {
      const next = turnIndex + 1
      setTurnIndex(next)
      saveCombatState({ tour_actuel: next })
    }
  }

  const tourPrecedent = () => {
    if (ordreSauvegarde.length === 0) return
    setTimerExpired(false)
    if (turnIndex <= 0) {
      if (round <= 1) return
      const prevRound = round - 1
      const lastIdx = ordreSauvegarde.length - 1
      setRound(prevRound)
      setTurnIndex(lastIdx)
      saveCombatState({ round: prevRound, tour_actuel: lastIdx })
    } else {
      const prev = turnIndex - 1
      setTurnIndex(prev)
      saveCombatState({ tour_actuel: prev })
    }
  }

  const participantsLookup: Record<string, Participant> = {}
  participantsEnCombat.forEach((p) => { participantsLookup[pieceIdOf(p)] = p })

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

  const triggerKO = useCallback((p: Participant) => {
    const pid = pieceIdOf(p)
    const isPerso = p.kind === 'perso'
    const t0 = performance.now().toFixed(0)
    console.log('[KO]', t0, 'triggerKO appelé pour', p.nom, 'isPerso:', isPerso, 'piece_id:', pid)
    const status: StatutKO = isPerso ? 'inconscient' : 'vaincu'
    setEtatsCombat((prev) => {
      const next = {
        ...prev,
        [pid]: {
          status,
          ...(p.kind === 'perso' ? { death_success: 0, death_failure: 0 } : {})
        } as EtatCombat
      }
      void saveCombatState({ etats_combat: next })
      return next
    })
    setKoAnimating((s) => {
      const next = new Set(s)
      next.add(pid)
      console.log('[KO]', performance.now().toFixed(0), 'ADD pid au Set →', Array.from(next))
      return next
    })
    // Si un timer existe déjà pour ce pid (re-trigger rapide), on l'annule.
    const existing = koTimerRef.current.get(pid)
    if (existing) {
      console.log('[KO]', t0, 'annule timer précédent pour', pid)
      clearTimeout(existing)
    }
    const timer = setTimeout(() => {
      console.log('[KO]', performance.now().toFixed(0), 'setTimeout 3000ms FIRE pour', pid, '— retire du Set')
      koTimerRef.current.delete(pid)
      setKoAnimating((s) => {
        if (!s.has(pid)) return s
        const next = new Set(s)
        next.delete(pid)
        console.log('[KO]', performance.now().toFixed(0), 'REMOVE pid du Set →', Array.from(next))
        return next
      })
    }, 3000)
    koTimerRef.current.set(pid, timer)
    setKoFlash(p.kind)
    setTimeout(() => setKoFlash((cur) => (cur === p.kind ? null : cur)), 600)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(p.kind === 'perso' ? [80, 40, 80, 40, 200] : [40, 30, 40])
    }
  }, [saveCombatState])

  const clearKO = useCallback((p: Participant) => {
    const pid = pieceIdOf(p)
    setEtatsCombat((prev) => {
      if (!prev[pid]) return prev
      const next = { ...prev }
      delete next[pid]
      void saveCombatState({ etats_combat: next })
      return next
    })
  }, [saveCombatState])

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
    const pid = pieceIdOf(p)
    const wasAlive = p.hp_actuel > 0
    const nowDown = nouveauHp === 0
    prevHpRef.current[pid] = nouveauHp
    if (wasAlive && nowDown) {
      triggerKO(p)
      if (p.kind === 'perso' && !p.conditions.includes('inconscient')) {
        await basculerCondition(p, 'inconscient')
      }
    } else if (!wasAlive && nouveauHp > 0) {
      // Réveil par soin : on retire l'état KO et la condition inconscient.
      clearKO(p)
      if (p.kind === 'perso' && p.conditions.includes('inconscient')) {
        await basculerCondition(p, 'inconscient')
      }
    }
  }

  const ajouterDeathSave = useCallback((pieceId: string, type: 'success' | 'failure') => {
    if (!isMJRef.current) return
    setEtatsCombat((prev) => {
      const cur = prev[pieceId]
      if (!cur || cur.status === 'mort' || cur.status === 'stabilise') return prev
      const success = (cur.death_success ?? 0) + (type === 'success' ? 1 : 0)
      const failure = (cur.death_failure ?? 0) + (type === 'failure' ? 1 : 0)
      let nextStatus: StatutKO = cur.status
      if (success >= 3) nextStatus = 'stabilise'
      else if (failure >= 3) nextStatus = 'mort'
      const nextEtat: EtatCombat = {
        status: nextStatus,
        death_success: Math.min(3, success),
        death_failure: Math.min(3, failure)
      }
      const next = { ...prev, [pieceId]: nextEtat }
      void saveCombatState({ etats_combat: next })
      return next
    })
  }, [saveCombatState])

  const reinitialiserDeathSaves = useCallback((pieceId: string) => {
    if (!isMJRef.current) return
    setEtatsCombat((prev) => {
      const cur = prev[pieceId]
      if (!cur) return prev
      const next = {
        ...prev,
        [pieceId]: { ...cur, status: 'inconscient' as StatutKO, death_success: 0, death_failure: 0 }
      }
      void saveCombatState({ etats_combat: next })
      return next
    })
  }, [saveCombatState])

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
    setRound(1)
    setOrdreSauvegarde([])
    setCombatId(null)
    setTimerSec(0)
    setTimerExpired(false)
    setEtatsCombat({})
    setKoAnimating(new Set())
    setKoFlash(null)
    prevHpRef.current = {}
  }

  const terminerCombat = async () => {
    await saveCombatState({ actif: false, ordre_initiative: [], round: 1, tour_actuel: 0, etats_combat: {} })

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

  const tourActuelId = ordreSauvegarde[turnIndex]?.piece_id ?? null

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
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-bold text-yellow-500">{tCombat('initiative')}</h2>
                    {ordreSauvegarde.length > 0 && (
                      <>
                        <span className="text-2xl font-black text-yellow-400 leading-none">
                          ⚔️ Round {round}
                        </span>
                        <span className="text-gray-400 text-sm">
                          Tour {turnIndex + 1}/{ordreSauvegarde.length}
                        </span>
                      </>
                    )}
                  </div>
                  {ordreSauvegarde.length > 0 && timerDuration > 0 && (
                    <div
                      className={`px-3 py-1.5 rounded-full font-mono font-bold text-sm border-2 ${
                        timerExpired
                          ? 'bg-red-900/50 border-red-500 text-red-200 animate-pulse'
                          : timerSec <= 10
                          ? 'bg-orange-900/50 border-orange-500 text-orange-200'
                          : 'bg-gray-900/50 border-gray-600 text-gray-200'
                      }`}
                    >
                      ⏱ {timerExpired ? 'TEMPS ÉCOULÉ' : `${Math.floor(timerSec / 60)}:${String(timerSec % 60).padStart(2, '0')}`}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mb-3 flex-wrap">
                  <button
                    type="button"
                    onClick={lancerInitiative}
                    disabled={!isMJ || participantsEnCombat.length === 0}
                    className="px-3 py-2 md:px-4 md:py-2.5 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 disabled:opacity-50 text-sm md:text-base"
                  >
                    🎲 {tCombat('roll_initiative')}
                  </button>
                  {ordreSauvegarde.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={tourPrecedent}
                        disabled={!isMJ || (turnIndex === 0 && round === 1)}
                        className="px-3 py-2 md:px-4 md:py-2.5 bg-gray-700 text-white font-bold rounded hover:bg-gray-600 disabled:opacity-50 text-sm md:text-base"
                      >
                        ⏮ Précédent
                      </button>
                      <button
                        type="button"
                        onClick={tourSuivant}
                        disabled={!isMJ}
                        className="px-3 py-2 md:px-4 md:py-2.5 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 disabled:opacity-50 text-sm md:text-base"
                      >
                        Tour suivant ⏭
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={terminerCombat}
                    disabled={!isMJ || showVictory}
                    className="px-3 py-2 md:px-4 md:py-2.5 bg-green-600 text-white font-bold rounded hover:bg-green-500 disabled:opacity-50 text-sm md:text-base"
                  >
                    {tCombat('end_combat')}
                  </button>
                  <select
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(parseInt(e.target.value))}
                    disabled={!isMJ}
                    className="px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded text-sm disabled:opacity-50"
                    title="Chronomètre du tour"
                  >
                    {TIMER_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        ⏱ {preset.label}
                      </option>
                    ))}
                  </select>
                </div>

                {ordreSauvegarde.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    {tCombat('no_initiative_yet')}
                  </p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                    {ordreSauvegarde.map((entry, i) => {
                      const isCurrent = i === turnIndex
                      const fresh = participantsLookup[entry.piece_id]
                      const hp_actuel = fresh?.hp_actuel ?? 0
                      const hp_max = fresh?.hp_max ?? 0
                      const conditions = fresh?.conditions ?? []
                      const pct = hp_max > 0 ? (hp_actuel / hp_max) * 100 : 0
                      const barColor = pct <= 25 ? 'bg-red-500' : pct <= 50 ? 'bg-orange-500' : 'bg-green-500'
                      const etat = etatsCombat[entry.piece_id]
                      const isAnimating = koAnimating.has(entry.piece_id)
                      const isPerso = entry.kind === 'perso'
                      const koActif = !!etat && etat.status !== 'stabilise'
                      const koInfo = etat
                        ? etat.status === 'mort'
                          ? { emoji: '🪦', label: 'MORT', badgeClass: 'bg-black text-red-200 border-red-700' }
                          : etat.status === 'stabilise'
                          ? { emoji: '🛡️', label: 'STABILISÉ', badgeClass: 'bg-green-900 text-green-100 border-green-500' }
                          : etat.status === 'inconscient'
                          ? { emoji: '💔', label: 'INCONSCIENT', badgeClass: 'bg-red-900 text-red-100 border-red-600' }
                          : { emoji: '💀', label: 'VAINCU', badgeClass: 'bg-gray-900 text-gray-200 border-gray-600' }
                        : null
                      // Animation OU posture statique sur l'image, mutuellement exclusives.
                      const imageEffectClass = isAnimating
                        ? isPerso ? 'ko-vacille-perso' : 'ko-fall-ennemi'
                        : etat?.status === 'inconscient' ? 'ko-rest-perso'
                        : etat?.status === 'mort' ? 'ko-rest-perso brightness-[0.4] saturate-50'
                        : etat?.status === 'vaincu' ? 'ko-rest-ennemi'
                        : etat?.status === 'stabilise' ? 'brightness-75'
                        : isPerso ? '' : 'grayscale-[20%]'
                      // Animations niveau carte (shake + aura + fissures sur bordure).
                      const cardKoClass = [
                        isAnimating && isPerso ? 'ko-card-shake' : '',
                        etat?.status === 'inconscient' ? 'ko-aura-perso ko-crack-perso' : ''
                      ].filter(Boolean).join(' ')
                      const showCracksSVG = isPerso && (isAnimating || etat?.status === 'inconscient' || etat?.status === 'mort')
                      if (etat || isAnimating) {
                        console.log('[KO] rendu carte', entry.nom,
                          'isAnimating:', isAnimating,
                          'imageEffectClass appliquée:', `"${imageEffectClass}"`,
                          'cardKoClass:', `"${cardKoClass}"`,
                          'data-piece-id:', entry.piece_id)
                      }
                      return (
                        <div
                          key={entry.piece_id}
                          data-piece-id={entry.piece_id}
                          data-ko-status={etat?.status ?? 'none'}
                          data-ko-animating={isAnimating ? 'true' : 'false'}
                          className={`relative flex-shrink-0 w-28 md:w-32 rounded-lg p-2 snap-start transition-all duration-300 ${cardKoClass} ${
                            isCurrent
                              ? 'bg-gray-700 border-2 border-yellow-400 ring-2 ring-yellow-500/40 shadow-lg shadow-yellow-500/30'
                              : koActif
                              ? 'bg-gray-900/80 border border-red-900/60'
                              : 'bg-gray-900/60 border border-gray-700 opacity-70'
                          }`}
                          style={{
                            ...(isCurrent && !koActif ? { transform: 'scale(1.08)' } : {}),
                            // DEBUG : test ultime — bordure rose flash inline pendant l'animation.
                            // Si tu ne la vois PAS apparaître, c'est que la carte n'est jamais rendue
                            // avec isAnimating=true au moment du KO (problème de state ou de mount).
                            // Si tu la vois MAIS pas les ko-* animations, c'est purement CSS
                            // (purge, spécificité, override) — les keyframes ne sont pas appliquées.
                            ...(isAnimating ? {
                              outline: '5px solid #ec4899',
                              outlineOffset: '4px',
                              boxShadow: '0 0 30px 8px #ec4899'
                            } : {})
                          }}
                        >
                          <div className="relative aspect-square rounded-md overflow-hidden mb-1.5 bg-gray-900">
                            {entry.image_url ? (
                              <img
                                src={entry.image_url}
                                alt={entry.nom}
                                loading="lazy"
                                className={`w-full h-full object-cover transition-all duration-500 ${imageEffectClass}`}
                              />
                            ) : (
                              <div
                                className={`w-full h-full flex items-center justify-center text-2xl font-bold text-white transition-all duration-500 ${
                                  isPerso ? 'bg-blue-700' : 'bg-red-700'
                                } ${imageEffectClass}`}
                              >
                                {entry.nom.slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            {/* Flash blanc bref au moment du KO ennemi */}
                            {isAnimating && !isPerso && <div className="ko-flash-white" />}

                            {/* Particules de fumée grise (ennemi en cours de KO) */}
                            {isAnimating && !isPerso && (
                              <>
                                {[
                                  { left: '18%', dx: '-6px', delay: '0s' },
                                  { left: '38%', dx: '4px', delay: '0.12s' },
                                  { left: '56%', dx: '-3px', delay: '0.26s' },
                                  { left: '74%', dx: '7px', delay: '0.4s' }
                                ].map((s, idx) => (
                                  <div
                                    key={idx}
                                    className="ko-smoke"
                                    style={{
                                      left: s.left,
                                      animationDelay: s.delay,
                                      ['--smoke-dx' as string]: s.dx
                                    } as React.CSSProperties}
                                  />
                                ))}
                              </>
                            )}

                            {/* Particules rouges éparpillées (PJ en cours de KO) */}
                            {isAnimating && isPerso && (
                              <>
                                {Array.from({ length: 10 }).map((_, idx) => {
                                  const angle = (idx / 10) * Math.PI * 2
                                  const dist = 38 + (idx % 3) * 10
                                  const dx = `${Math.round(Math.cos(angle) * dist)}px`
                                  const dy = `${Math.round(Math.sin(angle) * dist)}px`
                                  return (
                                    <div
                                      key={idx}
                                      className="ko-red-particle"
                                      style={{
                                        animationDelay: `${(idx * 0.04).toFixed(2)}s`,
                                        ['--p-dx' as string]: dx,
                                        ['--p-dy' as string]: dy
                                      } as React.CSSProperties}
                                    />
                                  )
                                })}
                              </>
                            )}

                            {/* Fissures SVG zigzag sur l'image (PJ inconscient/mort) */}
                            {showCracksSVG && (
                              <svg
                                key={`crack-${etat?.status ?? 'anim'}`}
                                className="ko-crack-svg absolute inset-0 w-full h-full pointer-events-none"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                                aria-hidden
                              >
                                <path d="M 8 28 L 24 38 L 17 52 L 38 58 L 31 76 L 52 84" />
                                <path d="M 92 18 L 76 30 L 86 46 L 64 56 L 78 72" />
                              </svg>
                            )}

                            <span className="absolute top-1 right-1 text-[10px] font-mono font-bold bg-yellow-500 text-gray-900 px-1.5 rounded shadow z-10">
                              {entry.init}
                            </span>
                            {isCurrent && !koActif && (
                              <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-yellow-400 text-gray-900 px-1.5 rounded shadow z-10">
                                ▶
                              </span>
                            )}
                          </div>

                          <p
                            className={`text-xs font-bold truncate ${
                              etat?.status === 'mort' ? 'text-gray-500 line-through'
                                : etat ? 'text-gray-400'
                                : isPerso ? 'text-blue-200' : 'text-red-200'
                            }`}
                            title={entry.nom}
                          >
                            {entry.nom}
                          </p>

                          {koInfo && (
                            <div
                              className={`mt-1 px-1 py-1 rounded-md border-2 text-center ${koInfo.badgeClass} ${
                                isAnimating
                                  ? isPerso ? 'ko-badge-pop-perso' : 'ko-badge-bounce'
                                  : etat?.status === 'inconscient' ? 'ko-badge-pulse' : ''
                              }`}
                            >
                              <span className="block text-lg leading-none">{koInfo.emoji}</span>
                              <span className="block text-[9px] font-black tracking-widest mt-0.5">{koInfo.label}</span>
                            </div>
                          )}
                          {hp_max > 0 && !etat && (
                            <>
                              <div className="h-1 bg-gray-700 rounded overflow-hidden mt-1">
                                <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-[10px] text-gray-300 mt-0.5">❤️ {hp_actuel}/{hp_max}</p>
                            </>
                          )}
                          {/* Death Saves uniquement pour les PJ inconscients */}
                          {isPerso && etat?.status === 'inconscient' && (
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center gap-0.5">
                                <span className="text-[9px] text-green-300 font-bold w-8">SUC</span>
                                {[0, 1, 2].map((idx) => {
                                  const filled = (etat.death_success ?? 0) > idx
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => filled
                                        ? reinitialiserDeathSaves(entry.piece_id)
                                        : ajouterDeathSave(entry.piece_id, 'success')}
                                      disabled={!isMJ}
                                      title={filled ? 'Réinitialiser les jets' : 'Marquer un succès (touche le PJ)'}
                                      className={`w-3.5 h-3.5 rounded-full border transition ${
                                        filled
                                          ? 'bg-green-500 border-green-300 shadow shadow-green-500/40'
                                          : 'bg-gray-800 border-gray-600 hover:border-green-500'
                                      } disabled:cursor-not-allowed`}
                                    />
                                  )
                                })}
                              </div>
                              <div className="flex items-center gap-0.5">
                                <span className="text-[9px] text-red-300 font-bold w-8">ECH</span>
                                {[0, 1, 2].map((idx) => {
                                  const filled = (etat.death_failure ?? 0) > idx
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => filled
                                        ? reinitialiserDeathSaves(entry.piece_id)
                                        : ajouterDeathSave(entry.piece_id, 'failure')}
                                      disabled={!isMJ}
                                      title={filled ? 'Réinitialiser les jets' : 'Marquer un échec'}
                                      className={`w-3.5 h-3.5 rounded-sm border transition ${
                                        filled
                                          ? 'bg-red-600 border-red-300 shadow shadow-red-600/40'
                                          : 'bg-gray-800 border-gray-600 hover:border-red-500'
                                      } disabled:cursor-not-allowed`}
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          {conditions.length > 0 && !etat && (
                            <div className="flex flex-wrap gap-0.5 mt-1">
                              {conditions.slice(0, 5).map((cle) => {
                                const c = CONDITIONS_MAP[cle]
                                if (!c) return null
                                return (
                                  <span
                                    key={cle}
                                    title={tCond(cle)}
                                    className="text-xs leading-none"
                                  >
                                    {c.icone}
                                  </span>
                                )
                              })}
                              {conditions.length > 5 && (
                                <span className="text-[9px] text-gray-400">+{conditions.length - 5}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
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
                                loading="lazy"
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

      {koFlash && (
        <div
          className={`fixed inset-0 z-30 pointer-events-none animate-ko-flash ${
            koFlash === 'perso' ? 'bg-red-600/40' : 'bg-red-500/30'
          }`}
        />
      )}

      {showRoundAnnouncement && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none px-4 animate-round-flash">
          <div className="bg-gradient-to-br from-yellow-500 via-yellow-400 to-orange-500 px-8 py-6 rounded-2xl border-4 border-yellow-200 shadow-2xl shadow-yellow-500/50">
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 drop-shadow-lg whitespace-nowrap">
              🆕 Round {round}
            </h2>
          </div>
        </div>
      )}

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
