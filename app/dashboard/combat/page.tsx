'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import {
  CONDITIONS,
  CONDITIONS_MAP,
  isConditionKey,
  type ConditionKey
} from '@/app/data/conditions'
import {
  xpPourCD,
  xpRequisProchainNiveau,
  labelCD
} from '@/app/data/dnd5e'
import NumberInput from '@/app/components/NumberInput'

type Scenario = { id: string; nom: string; bg_image_url: string | null; mj_id: string }

type Arme = { nom: string; bonus?: string; degats?: string }

type BaseParticipant = {
  id: string
  nom: string
  hp_max: number
  hp_actuel: number
  dexterite: number
  image_url?: string | null
  conditions: ConditionKey[]
  // Champs étendus pour la fiche dépliable. Optionnels pour rester compatibles
  // avec d'anciennes lignes / les ennemis qui n'ont pas toutes les colonnes.
  classe?: string | null
  niveau?: number | null
  ca?: number | null
  armure?: number | null
  vitesse?: number | null
  force?: number | null
  constitution?: number | null
  armes?: Arme[]
  xp?: number | null         // perso uniquement
  cd?: number | null         // ennemi uniquement (challenge rating)
  pieces_or?: number | null  // perso uniquement (fortune)
}

type Participant = BaseParticipant & { kind: 'perso' | 'ennemi' }

type SortDispo = {
  id: string // personnage_sorts.id
  personnage_id: string
  sort_id: string
  disponible: boolean
  nom: string
  niveau: number
  ecole?: string | null
}

type LayoutMode = 'horizontal' | 'vertical'
const LAYOUT_STORAGE_KEY = 'combat-layout-mode'

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
  status?: StatutKO
  death_success?: number
  death_failure?: number
  reaction_used?: boolean
  bonus_used?: boolean
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
  const router = useRouter()
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
  // XP distribué et toasts de level-up disponibles après distribution
  const [xpDistributed, setXpDistributed] = useState(false)
  const [levelUpToasts, setLevelUpToasts] = useState<
    { id: string; nom: string; nouveauNiveauPossible: number }[]
  >([])
  const [attributionTarget, setAttributionTarget] = useState<Record<string, string>>({})
  const [menuConditionsPour, setMenuConditionsPour] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [round, setRound] = useState(1)
  const [combatId, setCombatId] = useState<string | null>(null)
  const [ordreSauvegarde, setOrdreSauvegarde] = useState<InitiativeEntry[]>([])
  const [showRoundAnnouncement, setShowRoundAnnouncement] = useState(false)
  const [combatToast, setCombatToast] = useState<string | null>(null)

  // Modale Dégâts de zone (AOE)
  type AoeSaveType = 'dex' | 'con' | 'none'
  type AoeSaveMode = 'half' | 'cancel'
  type AoeRow = { pieceId: string; nom: string; jet: number; total: number; success: boolean; degats: number }
  const [aoeOpen, setAoeOpen] = useState(false)
  const [aoeTargets, setAoeTargets] = useState<Set<string>>(new Set())
  const [aoeDamageExpr, setAoeDamageExpr] = useState('8d6')
  const [aoeSaveType, setAoeSaveType] = useState<AoeSaveType>('dex')
  const [aoeSaveMode, setAoeSaveMode] = useState<AoeSaveMode>('half')
  const [aoeDD, setAoeDD] = useState(15)
  const [aoeResults, setAoeResults] = useState<AoeRow[] | null>(null)
  const [aoeApplying, setAoeApplying] = useState(false)

  // Modale Loot (après distribution XP)
  type LootRecap = { nom: string; items: string[]; or: number }
  const [lootOpen, setLootOpen] = useState(false)
  const [lootItemsSelected, setLootItemsSelected] = useState<Set<string>>(new Set())
  const [lootGold, setLootGold] = useState(0)
  const [lootDistMode, setLootDistMode] = useState<'single' | 'split'>('split')
  const [lootTargetId, setLootTargetId] = useState<string>('')
  const [lootApplying, setLootApplying] = useState(false)
  const [lootRecap, setLootRecap] = useState<LootRecap[] | null>(null)
  const [timerDuration, setTimerDuration] = useState<number>(0)
  const [timerSec, setTimerSec] = useState<number>(0)
  const [timerExpired, setTimerExpired] = useState(false)
  const [etatsCombat, setEtatsCombat] = useState<Record<string, EtatCombat>>({})
  const [koAnimating, setKoAnimating] = useState<Set<string>>(new Set())
  const [koFlash, setKoFlash] = useState<'perso' | 'ennemi' | null>(null)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('horizontal')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [persoSorts, setPersoSorts] = useState<Record<string, SortDispo[]>>({})
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

  // Layout mode : hydratation depuis localStorage au montage uniquement.
  // On ne lit pas la valeur sync à l'init du useState pour éviter un mismatch
  // SSR/CSR (force-dynamic empêche le SSR mais on reste prudents).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (stored === 'horizontal' || stored === 'vertical') {
      setLayoutMode(stored)
    }
  }, [])

  const changerLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutMode(mode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, mode)
    }
  }, [])

  const toggleExpand = useCallback((pieceId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(pieceId)) next.delete(pieceId)
      else next.add(pieceId)
      return next
    })
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
      koTimers.forEach((t) => clearTimeout(t))
      koTimers.clear()
    }
  }, [])

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
    // Si un `map_url` est passé via l'URL (ex. depuis le mode Exploration),
    // il prend la priorité sur le bg_image_url stocké sur le scénario.
    const mapUrlOverride = searchParams.get('map_url')
    setBgImageUrl(mapUrlOverride || scenario?.bg_image_url || '')

    const [{ data: p }, { data: e }, { data: it }, { data: cb }] = await Promise.all([
      supabase
        .from('personnages')
        .select('id, nom, hp_max, hp_actuel, dexterite, image_url, conditions, classe, niveau, ca, vitesse, force, constitution, armes, xp, pieces_or')
        .eq('scenario_id', scenarioId),
      supabase
        .from('ennemis')
        .select('id, nom, hp_max, hp_actuel, dexterite, image_url, conditions, force, constitution, cd')
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

    // Sorts attribués aux PJ du scénario : on charge en batch puis on indexe
    // par personnage_id pour affichage dans la carte dépliée.
    const persoIds = persos.map((pe) => pe.id)
    if (persoIds.length > 0) {
      const { data: ps } = await supabase
        .from('personnage_sorts')
        .select('id, personnage_id, sort_id, disponible, sorts!inner(id, nom, niveau, ecole)')
        .in('personnage_id', persoIds)
      type SortRow = {
        id: string
        personnage_id: string
        sort_id: string
        disponible: boolean
        sorts: { id: string; nom: string; niveau: number; ecole: string | null } | null
      }
      const map: Record<string, SortDispo[]> = {}
      ;((ps as unknown as SortRow[]) ?? []).forEach((row) => {
        if (!row.sorts) return
        const list = map[row.personnage_id] ?? (map[row.personnage_id] = [])
        list.push({
          id: row.id,
          personnage_id: row.personnage_id,
          sort_id: row.sort_id,
          disponible: row.disponible,
          nom: row.sorts.nom,
          niveau: row.sorts.niveau,
          ecole: row.sorts.ecole
        })
      })
      Object.values(map).forEach((arr) =>
        arr.sort((a, b) => a.niveau - b.niveau || a.nom.localeCompare(b.nom))
      )
      setPersoSorts(map)
    } else {
      setPersoSorts({})
    }

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

  // Drag & drop d'une miniature sur la grille (PC + mobile via pointer events).
  // L'ancien flow "click puis click sur cellule cible" est supprimé.
  // Note : on conserve la pièce montée dans le DOM pendant le drag (juste
  // opacité réduite) sinon le démontage casse setPointerCapture et les
  // pointermove/up suivants ne sont jamais reçus.
  const gridRef = useRef<HTMLDivElement>(null)
  type PieceDragState = {
    pieceId: string
    clientX: number
    clientY: number
    dropX: number | null
    dropY: number | null
  }
  const [pieceDrag, setPieceDrag] = useState<PieceDragState | null>(null)
  const pieceDragRef = useRef<PieceDragState | null>(null)
  pieceDragRef.current = pieceDrag

  const computeDropCell = (clientX: number, clientY: number) => {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return { dropX: null as number | null, dropY: null as number | null }
    const px = clientX - rect.left
    const py = clientY - rect.top
    const cx = Math.floor(px / CELL_SIZE)
    const cy = Math.floor(py / CELL_SIZE)
    const inside = cx >= 0 && cx < GRID_COLS && cy >= 0 && cy < GRID_ROWS
    return { dropX: inside ? cx : null, dropY: inside ? cy : null }
  }

  const onPiecePointerDown = (pieceId: string) =>
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button === 2) return
      e.stopPropagation()
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      const { dropX, dropY } = computeDropCell(e.clientX, e.clientY)
      const next: PieceDragState = {
        pieceId,
        clientX: e.clientX,
        clientY: e.clientY,
        dropX,
        dropY
      }
      pieceDragRef.current = next
      setPieceDrag(next)
      setSelectedPieceId(pieceId)
    }

  const onPiecePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const cur = pieceDragRef.current
    if (!cur) return
    e.stopPropagation()
    const { dropX, dropY } = computeDropCell(e.clientX, e.clientY)
    const next: PieceDragState = {
      pieceId: cur.pieceId,
      clientX: e.clientX,
      clientY: e.clientY,
      dropX,
      dropY
    }
    pieceDragRef.current = next
    setPieceDrag(next)
  }

  const onPiecePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const cur = pieceDragRef.current
    if (!cur) return
    e.stopPropagation()
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    const { pieceId, dropX, dropY } = cur
    pieceDragRef.current = null
    setPieceDrag(null)
    setSelectedPieceId(null)
    if (dropX == null || dropY == null) return
    const occupant = pieceAt(dropX, dropY)
    if (occupant && pieceIdOf(occupant) !== pieceId) return
    setPositions((prev) => ({ ...prev, [pieceId]: { x: dropX, y: dropY } }))
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
    const status: StatutKO = isPerso ? 'inconscient' : 'vaincu'
    setEtatsCombat((prev) => {
      const cur = prev[pid] ?? {}
      const next = {
        ...prev,
        [pid]: {
          ...cur,
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
      return next
    })
    // Si un timer existe déjà pour ce pid (re-trigger rapide), on l'annule.
    const existing = koTimerRef.current.get(pid)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      koTimerRef.current.delete(pid)
      setKoAnimating((s) => {
        if (!s.has(pid)) return s
        const next = new Set(s)
        next.delete(pid)
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
    const { error: hpErr } = await supabase
      .from(table)
      .update({ hp_actuel: nouveauHp })
      .eq('id', p.id)
    if (hpErr) {
      console.error('[combat] HP update échec — état local désynchronisé :', hpErr)
      return
    }
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

  const toggleSortDispo = async (entry: SortDispo) => {
    const next = !entry.disponible
    const { error } = await supabase
      .from('personnage_sorts')
      .update({ disponible: next })
      .eq('id', entry.id)
    if (error) {
      console.error('[combat] toggle sort dispo :', error)
      return
    }
    setPersoSorts((prev) => {
      const list = prev[entry.personnage_id] ?? []
      return {
        ...prev,
        [entry.personnage_id]: list.map((s) =>
          s.id === entry.id ? { ...s, disponible: next } : s
        )
      }
    })
  }

  const ajouterDeathSave = useCallback((pieceId: string, type: 'success' | 'failure') => {
    if (!isMJRef.current) return
    setEtatsCombat((prev) => {
      const cur = prev[pieceId]
      if (!cur || cur.status === 'mort' || cur.status === 'stabilise') return prev
      const success = (cur.death_success ?? 0) + (type === 'success' ? 1 : 0)
      const failure = (cur.death_failure ?? 0) + (type === 'failure' ? 1 : 0)
      let nextStatus: StatutKO = cur.status ?? 'inconscient'
      if (success >= 3) nextStatus = 'stabilise'
      else if (failure >= 3) nextStatus = 'mort'
      const nextEtat: EtatCombat = {
        ...cur,
        status: nextStatus,
        death_success: Math.min(3, success),
        death_failure: Math.min(3, failure)
      }
      const next = { ...prev, [pieceId]: nextEtat }
      void saveCombatState({ etats_combat: next })
      return next
    })
  }, [saveCombatState])

  // ============== Réaction & Action bonus ==============
  // Toggle l'état "utilisé" pour la réaction du pieceId courant. Persiste
  // dans etats_combat. On retire l'entrée si elle ne porte plus rien
  // (status absent + tous les flags à false) pour garder la map propre.
  const toggleReaction = useCallback((pieceId: string) => {
    if (!isMJRef.current) return
    setEtatsCombat((prev) => {
      const cur = prev[pieceId] ?? {}
      const nextUsed = !cur.reaction_used
      const nextEtat: EtatCombat = { ...cur, reaction_used: nextUsed }
      // Si l'entrée devient totalement vide on la nettoie pour éviter
      // de polluer la BDD avec des objets {} inutiles.
      const next = { ...prev }
      if (
        !nextEtat.status &&
        !nextEtat.reaction_used &&
        !nextEtat.bonus_used &&
        !nextEtat.death_success &&
        !nextEtat.death_failure
      ) {
        delete next[pieceId]
      } else {
        next[pieceId] = nextEtat
      }
      void saveCombatState({ etats_combat: next })
      return next
    })
  }, [saveCombatState])

  const toggleBonusAction = useCallback((pieceId: string) => {
    if (!isMJRef.current) return
    setEtatsCombat((prev) => {
      const cur = prev[pieceId] ?? {}
      const nextUsed = !cur.bonus_used
      const nextEtat: EtatCombat = { ...cur, bonus_used: nextUsed }
      const next = { ...prev }
      if (
        !nextEtat.status &&
        !nextEtat.reaction_used &&
        !nextEtat.bonus_used &&
        !nextEtat.death_success &&
        !nextEtat.death_failure
      ) {
        delete next[pieceId]
      } else {
        next[pieceId] = nextEtat
      }
      void saveCombatState({ etats_combat: next })
      return next
    })
  }, [saveCombatState])

  // Reset des flags réaction/bonus pour le participant dont c'est le tour.
  // Appelé à chaque changement de turnIndex (cf. useEffect plus bas).
  const rechargerActions = useCallback((pieceId: string) => {
    if (!isMJRef.current) return
    setEtatsCombat((prev) => {
      const cur = prev[pieceId]
      if (!cur) return prev
      if (!cur.reaction_used && !cur.bonus_used) return prev
      const nextEtat: EtatCombat = { ...cur, reaction_used: false, bonus_used: false }
      const next = { ...prev }
      if (
        !nextEtat.status &&
        !nextEtat.reaction_used &&
        !nextEtat.bonus_used &&
        !nextEtat.death_success &&
        !nextEtat.death_failure
      ) {
        delete next[pieceId]
      } else {
        next[pieceId] = nextEtat
      }
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

  // Parse une expression de type "XdY", "XdY+Z" ou "XdY-Z" et renvoie une
  // valeur tirée aléatoirement. Si l'expression est invalide, renvoie 0.
  const lancerExpressionDes = (expr: string): number => {
    const m = expr
      .trim()
      .toLowerCase()
      .match(/^(\d+)d(\d+)\s*([+-]\s*\d+)?$/)
    if (!m) return 0
    const n = parseInt(m[1], 10)
    const faces = parseInt(m[2], 10)
    if (n < 1 || faces < 2 || n > 100 || faces > 1000) return 0
    let total = 0
    for (let i = 0; i < n; i++) {
      total += Math.floor(Math.random() * faces) + 1
    }
    if (m[3]) {
      total += parseInt(m[3].replace(/\s+/g, ''), 10)
    }
    return Math.max(0, total)
  }

  const modStatParticipant = (p: BaseParticipant, key: 'dexterite' | 'constitution'): number => {
    const v = p[key] ?? 10
    return Math.floor(((v ?? 10) - 10) / 2)
  }

  // Identifie les cibles AOE possibles : tous les participants vivants.
  const aoeCibles = ordreSauvegarde.map((entry) => {
    const fresh = entry.kind === 'perso'
      ? personnages.find((p) => p.id === entry.ref_id)
      : ennemis.find((e) => e.id === entry.ref_id)
    return fresh ? { entry, p: { ...fresh, kind: entry.kind } as Participant } : null
  }).filter((x): x is { entry: InitiativeEntry; p: Participant } => x !== null)

  const ouvrirAoe = () => {
    // Par défaut : toutes les cibles pré-cochées (le MJ décoche)
    const all = new Set(aoeCibles.map((c) => c.entry.piece_id))
    setAoeTargets(all)
    setAoeResults(null)
    setAoeOpen(true)
  }

  const toggleAoeTarget = (pieceId: string) => {
    setAoeTargets((prev) => {
      const next = new Set(prev)
      if (next.has(pieceId)) next.delete(pieceId)
      else next.add(pieceId)
      return next
    })
  }

  const resoudreAoe = async () => {
    if (aoeTargets.size === 0) return
    setAoeApplying(true)
    const total = lancerExpressionDes(aoeDamageExpr)
    if (total === 0) {
      setCombatToast(`⚠ Expression de dégâts invalide : "${aoeDamageExpr}"`)
      setTimeout(() => setCombatToast(null), 3000)
      setAoeApplying(false)
      return
    }
    const rows: AoeRow[] = []
    for (const c of aoeCibles) {
      if (!aoeTargets.has(c.entry.piece_id)) continue
      let jet = 0
      let saveTotal = 0
      let success = false
      if (aoeSaveType !== 'none') {
        jet = Math.floor(Math.random() * 20) + 1
        const stat = aoeSaveType === 'dex' ? 'dexterite' : 'constitution'
        saveTotal = jet + modStatParticipant(c.p, stat)
        success = saveTotal >= aoeDD
      }
      let degats: number
      if (aoeSaveType === 'none') {
        degats = total
      } else if (success && aoeSaveMode === 'half') {
        degats = Math.floor(total / 2)
      } else if (success && aoeSaveMode === 'cancel') {
        degats = 0
      } else {
        degats = total
      }
      // Applique via modifierHp pour conserver la logique KO existante.
      if (degats > 0) {
        await modifierHp(c.p, -degats)
      }
      rows.push({
        pieceId: c.entry.piece_id,
        nom: c.entry.nom,
        jet,
        total: saveTotal,
        success,
        degats
      })
    }
    setAoeResults(rows)
    setAoeApplying(false)
  }

  const fermerAoe = () => {
    setAoeOpen(false)
    setAoeResults(null)
  }

  // ============== Loot ==============
  const ouvrirLoot = () => {
    setLootItemsSelected(new Set())
    setLootGold(0)
    setLootDistMode(persosParticipants.length > 1 ? 'split' : 'single')
    setLootTargetId(persosParticipants[0]?.id ?? '')
    setLootRecap(null)
    setLootOpen(true)
  }

  const toggleLootItem = (id: string) => {
    setLootItemsSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const distribuerLoot = async () => {
    if (persosParticipants.length === 0) return
    setLootApplying(true)
    const itemsArr = items.filter((i) => lootItemsSelected.has(i.id))
    const recapMap: Record<string, LootRecap> = {}
    persosParticipants.forEach((p) => {
      recapMap[p.id] = { nom: p.nom, items: [], or: 0 }
    })

    if (lootDistMode === 'single') {
      const targetId = lootTargetId || persosParticipants[0]?.id
      if (!targetId) {
        setLootApplying(false)
        return
      }
      // Items → un seul PJ
      if (itemsArr.length > 0) {
        await supabase
          .from('items')
          .update({ personnage_id: targetId })
          .in('id', itemsArr.map((i) => i.id))
        setItems((arr) =>
          arr.map((i) =>
            lootItemsSelected.has(i.id) ? { ...i, personnage_id: targetId } : i
          )
        )
        if (recapMap[targetId]) {
          recapMap[targetId].items = itemsArr.map((i) => i.nom)
        }
      }
      // Or → un seul PJ
      if (lootGold > 0) {
        const target = persosParticipants.find((p) => p.id === targetId)
        if (target) {
          const nouvOr = (target.pieces_or ?? 0) + lootGold
          await supabase.from('personnages').update({ pieces_or: nouvOr }).eq('id', targetId)
          setPersonnages((arr) =>
            arr.map((p) => (p.id === targetId ? { ...p, pieces_or: nouvOr } : p))
          )
          if (recapMap[targetId]) recapMap[targetId].or = lootGold
        }
      }
    } else {
      // Partage équitable
      // Items distribués round-robin
      const n = persosParticipants.length
      const updates: { itemId: string; persoId: string }[] = []
      itemsArr.forEach((item, i) => {
        const persoId = persosParticipants[i % n].id
        updates.push({ itemId: item.id, persoId })
        recapMap[persoId]?.items.push(item.nom)
      })
      // Batch updates : grouper par persoId
      const byPerso: Record<string, string[]> = {}
      updates.forEach(({ itemId, persoId }) => {
        ;(byPerso[persoId] = byPerso[persoId] ?? []).push(itemId)
      })
      for (const persoId of Object.keys(byPerso)) {
        const ids = byPerso[persoId]
        await supabase.from('items').update({ personnage_id: persoId }).in('id', ids)
      }
      setItems((arr) =>
        arr.map((i) => {
          const u = updates.find((x) => x.itemId === i.id)
          return u ? { ...i, personnage_id: u.persoId } : i
        })
      )
      // Or split au floor
      if (lootGold > 0) {
        const part = Math.floor(lootGold / n)
        if (part > 0) {
          for (const p of persosParticipants) {
            const nouvOr = (p.pieces_or ?? 0) + part
            await supabase.from('personnages').update({ pieces_or: nouvOr }).eq('id', p.id)
            recapMap[p.id].or = part
          }
          setPersonnages((arr) =>
            arr.map((p) =>
              persosParticipants.find((pp) => pp.id === p.id)
                ? { ...p, pieces_or: (p.pieces_or ?? 0) + part }
                : p
            )
          )
        }
      }
    }
    setLootRecap(Object.values(recapMap).filter((r) => r.items.length > 0 || r.or > 0))
    setLootApplying(false)
  }

  const fermerLootEtTerminer = () => {
    setLootOpen(false)
    setLootRecap(null)
    setShowVictory(false)
    resetInterface()
  }

  // Listener pour l'événement combat:toast (dispatché depuis lancerJetMortCombat)
  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<{ msg?: string }>).detail
      if (detail?.msg) {
        setCombatToast(detail.msg)
        setTimeout(() => setCombatToast(null), 3500)
      }
    }
    window.addEventListener('combat:toast', onToast)
    return () => window.removeEventListener('combat:toast', onToast)
  }, [])

  // Jet de mort automatique : 1 = 2 échecs, 2..9 = 1 échec, 10..19 = 1 succès,
  // 20 = stabilisé + 1 PV. Pour combat, on garde le tracking dans etatsCombat.
  const lancerJetMortCombat = useCallback(
    (pieceId: string, refId: string) => {
      if (!isMJRef.current) return
      const d20 = Math.floor(Math.random() * 20) + 1
      setEtatsCombat((prev) => {
        const cur = prev[pieceId]
        if (!cur || cur.status === 'mort' || cur.status === 'stabilise') return prev
        let success = cur.death_success ?? 0
        let failure = cur.death_failure ?? 0
        let toastMsg = ''
        if (d20 === 20) {
          // Réveil — le PJ remonte à 1 PV
          success = 0
          failure = 0
          // Met à jour le HP du perso aussi (en BDD + local). On log mais on
          // ne bloque pas l'UI — l'update local optimiste reste valide visible.
          supabase
            .from('personnages')
            .update({ hp_actuel: 1 })
            .eq('id', refId)
            .then(({ error }) => {
              if (error) {
                console.error('[combat] réveil HP=1 update échec :', error)
              }
            })
          setPersonnages((arr) =>
            arr.map((p) => (p.id === refId ? { ...p, hp_actuel: 1 } : p))
          )
          toastMsg = `🎲 20 — Réveil ! +1 PV.`
          // Retirer le KO state (status non-applicable)
          const next = { ...prev }
          delete next[pieceId]
          void saveCombatState({ etats_combat: next })
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('combat:toast', { detail: { msg: toastMsg } })
            )
          }
          return next
        } else if (d20 === 1) {
          failure = Math.min(3, failure + 2)
          toastMsg = `🎲 1 — Échec critique (${failure}/3)`
        } else if (d20 >= 10) {
          success = Math.min(3, success + 1)
          toastMsg = `🎲 ${d20} — Succès (${success}/3)`
        } else {
          failure = Math.min(3, failure + 1)
          toastMsg = `🎲 ${d20} — Échec (${failure}/3)`
        }
        let nextStatus: StatutKO = cur.status ?? 'inconscient'
        if (success >= 3) {
          nextStatus = 'stabilise'
          toastMsg += ' — ✨ Stabilisé !'
        } else if (failure >= 3) {
          nextStatus = 'mort'
          toastMsg += ' — ✝ MORT'
        }
        const nextEtat: EtatCombat = {
          ...cur,
          status: nextStatus,
          death_success: success,
          death_failure: failure
        }
        const next = { ...prev, [pieceId]: nextEtat }
        void saveCombatState({ etats_combat: next })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('combat:toast', { detail: { msg: toastMsg } })
          )
        }
        return next
      })
    },
    [saveCombatState]
  )

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
    setXpDistributed(false)
    setShowVictory(true)
  }

  const fermerVictoire = () => {
    setShowVictory(false)
    resetInterface()
  }

  // Calcule la liste des persos participants au combat (filtrés via selectedIds)
  // avec leurs infos XP/niveau pour la distribution.
  const persosParticipants = personnages.filter((p) =>
    selectedIds.has(`perso-${p.id}`)
  )

  // Total XP du combat = somme des CD des ennemis du scénario sélectionnés.
  const ennemisParticipants = ennemis.filter((e) =>
    selectedIds.has(`ennemi-${e.id}`)
  )
  const xpTotalCombat = ennemisParticipants.reduce(
    (sum, e) => sum + xpPourCD(e.cd ?? 0),
    0
  )
  const xpParPerso =
    persosParticipants.length > 0
      ? Math.floor(xpTotalCombat / persosParticipants.length)
      : 0

  const distribuerXP = async () => {
    if (xpDistributed) return
    if (persosParticipants.length === 0 || xpParPerso === 0) {
      setXpDistributed(true)
      return
    }
    const toasts: { id: string; nom: string; nouveauNiveauPossible: number }[] = []
    const updates = await Promise.all(
      persosParticipants.map(async (p) => {
        const ancienXp = p.xp ?? 0
        const ancienNiv = p.niveau ?? 1
        const nouveauXp = ancienXp + xpParPerso
        const seuil = xpRequisProchainNiveau(ancienNiv)
        const peutMonter = seuil !== null && ancienXp < seuil && nouveauXp >= seuil
        const { error } = await supabase
          .from('personnages')
          .update({ xp: nouveauXp })
          .eq('id', p.id)
        if (error) {
          console.error('[combat] distribuer XP :', error)
          return null
        }
        if (peutMonter) {
          toasts.push({ id: p.id, nom: p.nom, nouveauNiveauPossible: ancienNiv + 1 })
        }
        return { id: p.id, xp: nouveauXp }
      })
    )
    // Patch local des persos pour rafraîchir l'affichage sans re-fetch
    setPersonnages((arr) =>
      arr.map((p) => {
        const u = updates.find((x) => x && x.id === p.id)
        return u ? { ...p, xp: u.xp } : p
      })
    )
    setXpDistributed(true)
    setLevelUpToasts(toasts)
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

  // Recharge la réaction et l'action bonus du participant dont c'est le tour.
  // Se déclenche à chaque bascule de tour ; pas d'effet si rien n'était utilisé.
  useEffect(() => {
    if (!combatDemarre || !tourActuelId) return
    rechargerActions(tourActuelId)
  }, [tourActuelId, combatDemarre, rechargerActions])

  const itemsDisponibles = items.filter((i) => !i.personnage_id)
  const itemsAttribues = items.filter((i) => i.personnage_id)
  const nomPerso = (id: string) => personnages.find((p) => p.id === id)?.nom ?? '?'

  const nbPersosSel = personnages.filter((p) => selectedIds.has(`perso-${p.id}`)).length
  const nbEnnemisSel = ennemis.filter((e) => selectedIds.has(`ennemi-${e.id}`)).length

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            {tc('back')}
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">{tCombat('title')}</h1>
          {/* Roadmap 2.6 — accès au calculateur de rencontre */}
          <button
            type="button"
            onClick={() => router.push('/dashboard/combat/encounter-builder')}
            className="ml-auto px-3 py-1.5 text-xs uppercase tracking-[0.16em] font-bold rounded border border-yellow-600/50 text-yellow-300 hover:bg-yellow-500/10 transition"
          >
            🧮 Calculateur de rencontre
          </button>
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
                    onClick={ouvrirAoe}
                    disabled={!isMJ || aoeCibles.length === 0}
                    title="Appliquer des dégâts de zone à plusieurs cibles avec jet de sauvegarde."
                    className="px-3 py-2 md:px-4 md:py-2.5 bg-orange-700 text-white font-bold rounded hover:bg-orange-600 disabled:opacity-50 text-sm md:text-base"
                  >
                    💥 Dégâts de zone
                  </button>
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
                      const koActif = !!etat?.status && etat.status !== 'stabilise'
                      const koInfo = etat?.status
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
                                : etat?.status ? 'text-gray-400'
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
                          {hp_max > 0 && !etat?.status && (
                            <>
                              <div className="h-1 bg-gray-700 rounded overflow-hidden mt-1">
                                <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-[10px] text-gray-300 mt-0.5">❤️ {hp_actuel}/{hp_max}</p>
                            </>
                          )}
                          {/* Réaction + Action bonus (cachées si le participant est KO/mort) */}
                          {!etat?.status && (
                            <div className="mt-1 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleReaction(entry.piece_id)}
                                disabled={!isMJ}
                                title={
                                  etat?.reaction_used
                                    ? 'Réaction utilisée — clic pour annuler'
                                    : 'Réaction disponible — clic = consommer'
                                }
                                className={`flex-1 px-1 py-0.5 rounded text-[10px] font-bold border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  etat?.reaction_used
                                    ? 'bg-stone-900/70 border-stone-700 text-stone-500'
                                    : 'border-emerald-500/60 text-emerald-300 bg-emerald-700/15 hover:bg-emerald-700/30 shadow-[0_0_6px_rgba(74,222,128,0.4)]'
                                }`}
                              >
                                🛡 RÉAC
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleBonusAction(entry.piece_id)}
                                disabled={!isMJ}
                                title={
                                  etat?.bonus_used
                                    ? 'Action bonus utilisée — clic pour annuler'
                                    : 'Action bonus disponible — clic = consommer'
                                }
                                className={`flex-1 px-1 py-0.5 rounded text-[10px] font-bold border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  etat?.bonus_used
                                    ? 'bg-stone-900/70 border-stone-700 text-stone-500'
                                    : 'border-amber-500/60 text-amber-200 bg-amber-700/15 hover:bg-amber-700/30 shadow-[0_0_6px_rgba(251,191,36,0.45)]'
                                }`}
                              >
                                ⚡ BONUS
                              </button>
                            </div>
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
                              {isMJ && (
                                <button
                                  type="button"
                                  onClick={() => lancerJetMortCombat(entry.piece_id, entry.ref_id)}
                                  className="w-full px-2 py-1 rounded text-[10px] uppercase tracking-widest font-bold border transition"
                                  style={{
                                    background:
                                      'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(180,120,60,0.15))',
                                    borderColor: 'rgba(201,168,76,0.55)',
                                    color: '#fef08a'
                                  }}
                                  title="Lancer un d20 pour le jet contre la mort"
                                >
                                  🎲 Jet de mort
                                </button>
                              )}
                            </div>
                          )}
                          {isPerso && etat?.status === 'stabilise' && (
                            <div className="mt-1 px-1.5 py-1 rounded bg-emerald-700/30 border border-emerald-500/50 text-[10px] text-emerald-200 text-center font-bold">
                              ✨ Stabilisé
                            </div>
                          )}
                          {isPerso && etat?.status === 'mort' && (
                            <div className="mt-1 px-1.5 py-1 rounded bg-red-950/60 border border-red-700/70 text-[10px] text-red-200 text-center font-bold tracking-widest">
                              ✝ MORT
                            </div>
                          )}
                          {conditions.length > 0 && !etat?.status && (
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

              {/* Panneau Participants — switch H/V + cartes dépliables */}
              <ParticipantsPanel
                participants={participantsEnCombat}
                tourActuelId={tourActuelId}
                etatsCombat={etatsCombat}
                koAnimating={koAnimating}
                expandedIds={expandedIds}
                onToggleExpand={toggleExpand}
                modifierHp={modifierHp}
                basculerCondition={basculerCondition}
                menuConditionsPour={menuConditionsPour}
                setMenuConditionsPour={setMenuConditionsPour}
                tCond={tCond}
                tCombat={tCombat}
                layoutMode={layoutMode}
                changerLayoutMode={changerLayoutMode}
                persoSorts={persoSorts}
                onToggleSortDispo={toggleSortDispo}
              />

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

                {pieceDrag && (
                  <p className="text-yellow-400 text-sm mb-2">
                    Relâche sur une case libre pour placer la miniature.
                  </p>
                )}
                <div className="overflow-auto">
                  <div
                    ref={gridRef}
                    className="inline-grid border border-gray-700 rounded relative"
                    style={{
                      gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
                      gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_SIZE}px)`,
                      backgroundColor: bgImageUrl ? undefined : '#111827',
                      backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      touchAction: 'none'
                    }}
                  >
                    {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, i) => {
                      const x = i % GRID_COLS
                      const y = Math.floor(i / GRID_COLS)
                      const p = pieceAt(x, y)
                      const pid = p ? pieceIdOf(p) : null
                      const isDragged = pid != null && pieceDrag?.pieceId === pid
                      const isTurn = p && tourActuelId === pid
                      const isDropTarget =
                        pieceDrag &&
                        pieceDrag.dropX === x &&
                        pieceDrag.dropY === y &&
                        (!p || pid === pieceDrag.pieceId)
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-center transition ${
                            bgImageUrl
                              ? 'border border-white/20'
                              : 'border border-gray-700/60'
                          } ${isDropTarget ? 'bg-yellow-500/30 ring-2 ring-yellow-400' : ''}`}
                          style={{ width: CELL_SIZE, height: CELL_SIZE }}
                        >
                          {p && (
                            p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.nom}
                                title={`${p.nom} (${p.hp_actuel}/${p.hp_max})`}
                                draggable={false}
                                loading="lazy"
                                onPointerDown={onPiecePointerDown(pid!)}
                                onPointerMove={onPiecePointerMove}
                                onPointerUp={onPiecePointerUp}
                                onPointerCancel={onPiecePointerUp}
                                className={`w-7 h-7 ${
                                  p.kind === 'perso' ? 'rounded-full' : 'rounded'
                                } object-cover shadow-md ring-2 cursor-grab active:cursor-grabbing select-none ${
                                  p.kind === 'perso' ? 'ring-blue-400' : 'ring-red-400'
                                } ${
                                  isTurn ? '!ring-yellow-400 animate-pulse' : ''
                                }`}
                                style={{ touchAction: 'none', opacity: isDragged ? 0.25 : 1 }}
                              />
                            ) : (
                              <div
                                onPointerDown={onPiecePointerDown(pid!)}
                                onPointerMove={onPiecePointerMove}
                                onPointerUp={onPiecePointerUp}
                                onPointerCancel={onPiecePointerUp}
                                className={`w-7 h-7 flex items-center justify-center font-bold text-xs text-white shadow-md cursor-grab active:cursor-grabbing select-none ${
                                  p.kind === 'perso'
                                    ? 'rounded-full bg-blue-500'
                                    : 'rounded bg-red-500'
                                } ${
                                  isTurn ? 'ring-2 ring-yellow-400 animate-pulse' : ''
                                }`}
                                title={`${p.nom} (${p.hp_actuel}/${p.hp_max})`}
                                style={{ touchAction: 'none', opacity: isDragged ? 0.25 : 1 }}
                              >
                                {p.nom.slice(0, 2).toUpperCase() || '?'}
                              </div>
                            )
                          )}
                        </div>
                      )
                    })}

                    {/* Ghost flottant à la position du pointeur pendant le drag */}
                    {pieceDrag && (() => {
                      const dragged = participantsEnCombat.find(
                        (pp) => pieceIdOf(pp) === pieceDrag.pieceId
                      )
                      if (!dragged) return null
                      const rect = gridRef.current?.getBoundingClientRect()
                      const ghostLeft = rect ? pieceDrag.clientX - rect.left - 14 : 0
                      const ghostTop = rect ? pieceDrag.clientY - rect.top - 14 : 0
                      return (
                        <div
                          className="pointer-events-none absolute z-30"
                          style={{
                            left: ghostLeft,
                            top: ghostTop,
                            opacity: 0.85
                          }}
                        >
                          {dragged.image_url ? (
                            <img
                              src={dragged.image_url}
                              alt=""
                              draggable={false}
                              className={`w-7 h-7 ${
                                dragged.kind === 'perso' ? 'rounded-full' : 'rounded'
                              } object-cover shadow-2xl ring-2 ${
                                dragged.kind === 'perso'
                                  ? 'ring-blue-300'
                                  : 'ring-red-300'
                              }`}
                            />
                          ) : (
                            <div
                              className={`w-7 h-7 flex items-center justify-center font-bold text-xs text-white shadow-2xl ring-2 ring-yellow-300 ${
                                dragged.kind === 'perso'
                                  ? 'rounded-full bg-blue-500'
                                  : 'rounded bg-red-500'
                              }`}
                            >
                              {dragged.nom.slice(0, 2).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                      )
                    })()}
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

        )}
      </div>

      {koFlash && (
        <div
          className="fixed inset-0 z-30 pointer-events-none animate-ko-flash"
          style={{
            boxShadow:
              koFlash === 'perso'
                ? 'inset 0 0 120px 30px rgba(220,38,38,0.45)'
                : 'inset 0 0 80px 20px rgba(220,38,38,0.25)',
            background: 'transparent'
          }}
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border max-h-[90vh] flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #1a1410 0%, #14110d 100%)',
              borderColor: 'rgba(201,168,76,0.5)',
              boxShadow:
                '0 30px 60px rgba(0,0,0,0.6), 0 0 80px rgba(201,168,76,0.2)'
            }}
          >
            <div
              className="px-6 py-4 border-b text-center"
              style={{
                background:
                  'linear-gradient(90deg, rgba(201,168,76,0.25), rgba(180,120,60,0.18), rgba(201,168,76,0.25))',
                borderColor: 'rgba(201,168,76,0.4)'
              }}
            >
              <h2 className="text-3xl font-serif font-bold text-amber-100">
                🏆 {tCombat('victory')}
              </h2>
              <p className="text-amber-300/80 text-sm">{tCombat('victory_msg')}</p>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto">
              <div
                className="rounded-lg p-4 border text-center"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(180,120,60,0.08))',
                  borderColor: 'rgba(201,168,76,0.4)'
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/80">
                  XP totale gagnée
                </p>
                <p className="text-amber-100 font-serif text-4xl font-bold">
                  {xpTotalCombat.toLocaleString('fr-FR')} XP
                </p>
                {ennemisParticipants.length > 0 && (
                  <p className="text-stone-400 text-xs mt-1">
                    {ennemisParticipants.length} ennemi{ennemisParticipants.length > 1 ? 's' : ''}
                    {' · '}
                    {ennemisParticipants
                      .map((e) => `CD ${labelCD(e.cd ?? 0)}`)
                      .join(', ')}
                  </p>
                )}
              </div>

              {persosParticipants.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">
                    Part par PJ : <span className="text-amber-200 font-bold">{xpParPerso.toLocaleString('fr-FR')} XP</span>
                    {' '}({persosParticipants.length} personnage{persosParticipants.length > 1 ? 's' : ''})
                  </p>
                  <div className="space-y-2">
                    {persosParticipants.map((p) => {
                      const ancienXp = p.xp ?? 0
                      const ancienNiv = p.niveau ?? 1
                      const nouveauXp = xpDistributed ? ancienXp : ancienXp + xpParPerso
                      const xpAffiche = xpDistributed ? ancienXp : nouveauXp
                      const seuil = xpRequisProchainNiveau(ancienNiv)
                      const peutMonter = seuil !== null && xpAffiche >= seuil
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            router.push(`/dashboard/personnages/${p.id}`)
                          }
                          className="w-full text-left rounded-lg p-3 border bg-stone-900/40 hover:bg-stone-800/60 transition-all flex items-center gap-3"
                          style={{ borderColor: 'rgba(201,168,76,0.25)' }}
                        >
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.nom}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-700/60 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-stone-800 ring-2 ring-amber-700/60 flex items-center justify-center text-amber-300 text-sm font-bold flex-shrink-0">
                              {p.nom.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-amber-100 font-bold truncate">
                              {p.nom}{' '}
                              <span className="text-stone-400 text-xs font-normal">
                                · Niv. {ancienNiv}
                              </span>
                            </p>
                            <p className="text-xs text-stone-400 font-mono">
                              {ancienXp.toLocaleString('fr-FR')}{' '}
                              {!xpDistributed && (
                                <>
                                  <span className="text-amber-400">+{xpParPerso.toLocaleString('fr-FR')}</span>
                                  {' = '}
                                  <span className="text-amber-200 font-bold">
                                    {nouveauXp.toLocaleString('fr-FR')}
                                  </span>
                                </>
                              )}
                              {' '}XP
                            </p>
                          </div>
                          {peutMonter && (
                            <span
                              className="px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold flex-shrink-0"
                              style={{
                                background:
                                  'linear-gradient(135deg, #C9A84C 0%, #8B5A2B 100%)',
                                color: '#1a1410'
                              }}
                            >
                              ⬆ Niv. {ancienNiv + 1} possible
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {itemsDisponibles.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-2">
                    {tCombat('loot')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {itemsDisponibles.map((i) => (
                      <span
                        key={i.id}
                        className="px-3 py-1 rounded-full bg-stone-900 text-amber-300 text-xs border border-amber-700/60"
                      >
                        ✨ {i.nom}{' '}
                        <span className="text-stone-500">({i.rarete})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="px-6 py-4 border-t flex items-center justify-between gap-3"
              style={{ borderColor: 'rgba(201,168,76,0.2)' }}
            >
              <button
                type="button"
                onClick={fermerVictoire}
                className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200"
              >
                Fermer sans distribuer
              </button>
              {!xpDistributed ? (
                <button
                  type="button"
                  disabled={!isMJ || persosParticipants.length === 0 || xpTotalCombat === 0}
                  onClick={distribuerXP}
                  className="px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background:
                      'linear-gradient(135deg, #C9A84C 0%, #8B5A2B 100%)',
                    color: '#1a1410',
                    boxShadow: '0 4px 14px rgba(201,168,76,0.4)'
                  }}
                >
                  ⚡ Distribuer l'XP
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowVictory(false)
                    ouvrirLoot()
                  }}
                  className="px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider"
                  style={{
                    background:
                      'linear-gradient(135deg, #C9A84C 0%, #8B5A2B 100%)',
                    color: '#1a1410',
                    boxShadow: '0 4px 14px rgba(201,168,76,0.4)'
                  }}
                >
                  🎁 Distribuer le butin
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale Dégâts de zone */}
      {aoeOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border max-h-[90vh] flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #1a1410 0%, #14110d 100%)',
              borderColor: 'rgba(255,120,40,0.45)'
            }}
          >
            <div
              className="px-5 py-3 border-b text-center"
              style={{
                background:
                  'linear-gradient(90deg, rgba(255,120,40,0.25), rgba(180,60,30,0.15), rgba(255,120,40,0.25))',
                borderColor: 'rgba(255,120,40,0.4)'
              }}
            >
              <h2 className="text-xl font-serif font-bold text-orange-100">
                💥 Dégâts de zone
              </h2>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {!aoeResults ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-widest text-orange-300/80">
                        Dégâts (XdY ou XdY+Z)
                      </span>
                      <input
                        type="text"
                        value={aoeDamageExpr}
                        onChange={(e) => setAoeDamageExpr(e.target.value)}
                        placeholder="ex. 8d6"
                        className="w-full bg-stone-900 border border-orange-800/40 rounded px-3 py-2 text-orange-100 outline-none focus:border-orange-600 mt-1"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-widest text-orange-300/80">
                        DD du jet
                      </span>
                      <NumberInput
                        min={1}
                        max={30}
                        fallback={10}
                        value={aoeDD}
                        onChange={setAoeDD}
                        className="w-full bg-stone-900 border border-orange-800/40 rounded px-3 py-2 text-orange-100 outline-none focus:border-orange-600 mt-1"
                      />
                    </label>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-orange-300/80 mb-1">
                      Jet de sauvegarde
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAoeSaveType('dex')}
                        className={`py-1.5 px-2 rounded border text-xs font-bold ${
                          aoeSaveType === 'dex'
                            ? 'bg-orange-700/30 border-orange-500 text-orange-100'
                            : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-orange-700'
                        }`}
                      >
                        🏃 Dextérité
                      </button>
                      <button
                        type="button"
                        onClick={() => setAoeSaveType('con')}
                        className={`py-1.5 px-2 rounded border text-xs font-bold ${
                          aoeSaveType === 'con'
                            ? 'bg-orange-700/30 border-orange-500 text-orange-100'
                            : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-orange-700'
                        }`}
                      >
                        🫀 Constitution
                      </button>
                      <button
                        type="button"
                        onClick={() => setAoeSaveType('none')}
                        className={`py-1.5 px-2 rounded border text-xs font-bold ${
                          aoeSaveType === 'none'
                            ? 'bg-orange-700/30 border-orange-500 text-orange-100'
                            : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-orange-700'
                        }`}
                      >
                        ⛔ Pas de jet
                      </button>
                    </div>
                  </div>

                  {aoeSaveType !== 'none' && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-orange-300/80 mb-1">
                        Effet sur succès
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAoeSaveMode('half')}
                          className={`py-1.5 px-2 rounded border text-xs font-bold ${
                            aoeSaveMode === 'half'
                              ? 'bg-orange-700/30 border-orange-500 text-orange-100'
                              : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-orange-700'
                          }`}
                        >
                          ½ Moitié des dégâts
                        </button>
                        <button
                          type="button"
                          onClick={() => setAoeSaveMode('cancel')}
                          className={`py-1.5 px-2 rounded border text-xs font-bold ${
                            aoeSaveMode === 'cancel'
                              ? 'bg-orange-700/30 border-orange-500 text-orange-100'
                              : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-orange-700'
                          }`}
                        >
                          ✓ Aucun dégât
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-orange-300/80 mb-1">
                      Cibles ({aoeTargets.size}/{aoeCibles.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-56 overflow-y-auto">
                      {aoeCibles.map(({ entry, p }) => {
                        const isChecked = aoeTargets.has(entry.piece_id)
                        return (
                          <label
                            key={entry.piece_id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer text-xs ${
                              isChecked
                                ? 'bg-orange-700/15 border-orange-600/50 text-orange-100'
                                : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-orange-700/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleAoeTarget(entry.piece_id)}
                              className="accent-orange-500"
                            />
                            <span className={p.kind === 'perso' ? '' : 'text-red-300'}>
                              {p.kind === 'perso' ? '🛡' : '👹'} {entry.nom}
                            </span>
                            <span className="ml-auto text-[10px] text-stone-400">
                              {p.hp_actuel}/{p.hp_max}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-orange-300/80">
                    Récapitulatif — {aoeDamageExpr}
                    {aoeSaveType !== 'none' && (
                      <> · jet de {aoeSaveType === 'dex' ? 'Dex' : 'Con'} vs DD {aoeDD}{aoeSaveMode === 'half' ? ' (moitié)' : ' (annulation)'}</>
                    )}
                  </p>
                  {aoeResults.map((r) => (
                    <div
                      key={r.pieceId}
                      className="rounded border p-2 text-sm flex items-center gap-2 flex-wrap"
                      style={{
                        background:
                          r.degats === 0
                            ? 'rgba(74,222,128,0.08)'
                            : 'rgba(220,38,38,0.08)',
                        borderColor:
                          r.degats === 0
                            ? 'rgba(74,222,128,0.4)'
                            : 'rgba(220,38,38,0.4)'
                      }}
                    >
                      <span className="text-amber-100 font-bold flex-1 min-w-[8rem]">
                        {r.nom}
                      </span>
                      {aoeSaveType !== 'none' && (
                        <span className="text-xs text-stone-400 font-mono">
                          🎲 {r.jet} → {r.total} {r.success ? '✓' : '✗'}
                        </span>
                      )}
                      <span
                        className={`font-bold text-sm ${
                          r.degats === 0 ? 'text-emerald-300' : 'text-red-300'
                        }`}
                      >
                        {r.degats === 0 ? 'Aucun dégât' : `-${r.degats} PV`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="px-5 py-3 border-t flex items-center justify-between gap-3"
              style={{ borderColor: 'rgba(255,120,40,0.2)' }}
            >
              <button
                type="button"
                onClick={fermerAoe}
                className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200"
              >
                {aoeResults ? 'Fermer' : 'Annuler'}
              </button>
              {!aoeResults && (
                <button
                  type="button"
                  onClick={resoudreAoe}
                  disabled={aoeApplying || aoeTargets.size === 0}
                  className="px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background:
                      'linear-gradient(135deg, #ea580c 0%, #7c2d12 100%)',
                    color: '#fff',
                    boxShadow: '0 4px 14px rgba(234,88,12,0.45)'
                  }}
                >
                  {aoeApplying ? 'Application…' : '💥 Lancer'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale Loot — après distribution XP */}
      {lootOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border max-h-[90vh] flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #1a1410 0%, #14110d 100%)',
              borderColor: 'rgba(201,168,76,0.5)'
            }}
          >
            <div
              className="px-6 py-4 border-b text-center"
              style={{
                background:
                  'linear-gradient(90deg, rgba(201,168,76,0.25), rgba(180,120,60,0.18), rgba(201,168,76,0.25))',
                borderColor: 'rgba(201,168,76,0.4)'
              }}
            >
              <h2 className="text-3xl font-serif font-bold text-amber-100">🎁 Butin</h2>
              <p className="text-amber-300/80 text-sm">
                Distribution des récompenses du combat
              </p>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto">
              {!lootRecap ? (
                <>
                  {/* Items à donner */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-amber-400/80 mb-2">
                      Items disponibles ({itemsDisponibles.length})
                    </p>
                    {itemsDisponibles.length === 0 ? (
                      <p className="text-stone-500 text-xs italic">
                        Aucun item disponible dans la bibliothèque du scénario.
                        Crée-en depuis l'onglet Items.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-44 overflow-y-auto">
                        {itemsDisponibles.map((i) => {
                          const sel = lootItemsSelected.has(i.id)
                          return (
                            <label
                              key={i.id}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer text-xs ${
                                sel
                                  ? 'bg-amber-700/15 border-amber-600/50 text-amber-100'
                                  : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-amber-700/60'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={sel}
                                onChange={() => toggleLootItem(i.id)}
                                className="accent-amber-500"
                              />
                              <span className="truncate">
                                ✨ {i.nom}{' '}
                                <span className="text-stone-500">({i.rarete})</span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Or */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-amber-400/80 mb-2">
                      Pièces d'or
                    </p>
                    <div className="flex items-center gap-2">
                      <NumberInput
                        min={0}
                        value={lootGold}
                        onChange={setLootGold}
                        className="flex-1 bg-stone-900 border border-amber-800/40 rounded px-3 py-2 text-amber-100 outline-none focus:border-amber-600"
                      />
                      <span className="text-amber-300 font-bold">PO</span>
                    </div>
                  </div>

                  {/* Mode de distribution */}
                  {persosParticipants.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-amber-400/80 mb-2">
                        Distribution
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setLootDistMode('split')}
                          disabled={persosParticipants.length <= 1}
                          className={`py-2 px-3 rounded border text-xs font-bold disabled:opacity-40 ${
                            lootDistMode === 'split'
                              ? 'bg-amber-700/30 border-amber-500 text-amber-100'
                              : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-amber-700/60'
                          }`}
                        >
                          🤝 Partager équitablement
                        </button>
                        <button
                          type="button"
                          onClick={() => setLootDistMode('single')}
                          className={`py-2 px-3 rounded border text-xs font-bold ${
                            lootDistMode === 'single'
                              ? 'bg-amber-700/30 border-amber-500 text-amber-100'
                              : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-amber-700/60'
                          }`}
                        >
                          🎯 Donner à un PJ
                        </button>
                      </div>
                      {lootDistMode === 'single' && (
                        <select
                          value={lootTargetId}
                          onChange={(e) => setLootTargetId(e.target.value)}
                          className="mt-2 w-full bg-stone-900 border border-amber-800/40 rounded px-3 py-2 text-amber-100"
                        >
                          {persosParticipants.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nom} — Niv. {p.niveau ?? 1} ({(p.pieces_or ?? 0)} PO)
                            </option>
                          ))}
                        </select>
                      )}
                      {lootDistMode === 'split' && lootGold > 0 && (
                        <p className="text-[10px] text-amber-300/70 mt-1">
                          Chaque PJ : +{Math.floor(lootGold / persosParticipants.length)} PO (reste {lootGold % persosParticipants.length})
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-amber-400/80">
                    Récapitulatif
                  </p>
                  {lootRecap.length === 0 ? (
                    <p className="text-stone-500 italic text-sm">Aucun butin distribué.</p>
                  ) : (
                    lootRecap.map((r, i) => (
                      <div
                        key={i}
                        className="rounded p-3 border bg-stone-900/40"
                        style={{ borderColor: 'rgba(201,168,76,0.3)' }}
                      >
                        <p className="text-amber-100 font-bold">{r.nom}</p>
                        {r.or > 0 && (
                          <p className="text-amber-300 text-xs">+{r.or} PO</p>
                        )}
                        {r.items.length > 0 && (
                          <p className="text-emerald-300 text-xs">
                            {r.items.map((n) => `✨ ${n}`).join(' · ')}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div
              className="px-6 py-4 border-t flex items-center justify-between gap-3"
              style={{ borderColor: 'rgba(201,168,76,0.2)' }}
            >
              {!lootRecap ? (
                <>
                  <button
                    type="button"
                    onClick={fermerLootEtTerminer}
                    className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200"
                  >
                    Aucun butin
                  </button>
                  <button
                    type="button"
                    onClick={distribuerLoot}
                    disabled={
                      lootApplying ||
                      persosParticipants.length === 0 ||
                      (lootItemsSelected.size === 0 && lootGold === 0)
                    }
                    className="px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background:
                        'linear-gradient(135deg, #C9A84C 0%, #8B5A2B 100%)',
                      color: '#1a1410',
                      boxShadow: '0 4px 14px rgba(201,168,76,0.4)'
                    }}
                  >
                    {lootApplying ? 'Distribution…' : 'Distribuer'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={fermerLootEtTerminer}
                  className="ml-auto px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider"
                  style={{
                    background:
                      'linear-gradient(135deg, #C9A84C 0%, #8B5A2B 100%)',
                    color: '#1a1410',
                    boxShadow: '0 4px 14px rgba(201,168,76,0.4)'
                  }}
                >
                  ✓ Terminé
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast combat (jets de mort, etc.) */}
      {combatToast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[105] px-4 py-2 rounded-lg shadow-2xl border"
          style={{
            background:
              'linear-gradient(135deg, rgba(28,20,15,0.95), rgba(14,11,8,0.95))',
            borderColor: 'rgba(201,168,76,0.5)',
            color: '#fef08a'
          }}
        >
          <p className="text-sm font-bold">{combatToast}</p>
        </div>
      )}

      {/* Toasts de level-up disponibles (cliquables → fiche du perso) */}
      {levelUpToasts.length > 0 && (
        <div className="fixed top-6 right-6 z-[100] space-y-2 max-w-xs">
          {levelUpToasts.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                router.push(`/dashboard/personnages/${t.id}`)
                setLevelUpToasts((arr) => arr.filter((x) => x.id !== t.id))
              }}
              className="w-full text-left rounded-lg p-3 shadow-2xl border block transition-transform hover:scale-[1.02]"
              style={{
                background:
                  'linear-gradient(135deg, rgba(201,168,76,0.95), rgba(180,120,60,0.95))',
                borderColor: 'rgba(255,220,140,0.6)',
                color: '#1a1410'
              }}
            >
              <p className="font-bold text-sm">⬆ {t.nom} peut monter de niveau !</p>
              <p className="text-xs opacity-80">
                Cliquer pour ouvrir sa fiche (Niv. {t.nouveauNiveauPossible})
              </p>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}

// ============================================================================
// ParticipantsPanel — switch H/V + cartes dépliables (Minimal Eclipsed Forge)
// ============================================================================

type ParticipantsPanelProps = {
  participants: Participant[]
  tourActuelId: string | null
  etatsCombat: Record<string, EtatCombat>
  koAnimating: Set<string>
  expandedIds: Set<string>
  onToggleExpand: (pieceId: string) => void
  modifierHp: (p: Participant, delta: number) => Promise<void>
  basculerCondition: (p: Participant, c: ConditionKey) => Promise<void>
  menuConditionsPour: string | null
  setMenuConditionsPour: React.Dispatch<React.SetStateAction<string | null>>
  tCond: (key: string) => string
  tCombat: (key: string, params?: Record<string, number | string>) => string
  layoutMode: LayoutMode
  changerLayoutMode: (mode: LayoutMode) => void
  persoSorts: Record<string, SortDispo[]>
  onToggleSortDispo: (entry: SortDispo) => Promise<void>
}

function ParticipantsPanel(props: ParticipantsPanelProps) {
  const {
    participants,
    tourActuelId,
    etatsCombat,
    koAnimating,
    expandedIds,
    onToggleExpand,
    modifierHp,
    basculerCondition,
    menuConditionsPour,
    setMenuConditionsPour,
    tCond,
    tCombat,
    layoutMode,
    changerLayoutMode,
    persoSorts,
    onToggleSortDispo
  } = props

  const compagnons = participants.filter((p) => p.kind === 'perso')
  const ennemis = participants.filter((p) => p.kind === 'ennemi')

  const renderCards = (list: Participant[], emptyMsg: string) => {
    if (list.length === 0) {
      return (
        <p className="text-gray-600 text-xs italic px-3 py-3">{emptyMsg}</p>
      )
    }
    return list.map((p) => {
      const pid = `${p.kind}-${p.id}`
      return (
        <ParticipantCard
          key={pid}
          p={p}
          pieceId={pid}
          isTurn={tourActuelId === pid}
          isAnimatingKO={koAnimating.has(pid)}
          expanded={expandedIds.has(pid)}
          etat={etatsCombat[pid]}
          onToggle={() => onToggleExpand(pid)}
          modifierHp={modifierHp}
          basculerCondition={basculerCondition}
          menuConditionsPour={menuConditionsPour}
          setMenuConditionsPour={setMenuConditionsPour}
          tCond={tCond}
          tCombat={tCombat}
          layoutMode={layoutMode}
          sorts={persoSorts[p.id] ?? []}
          onToggleSortDispo={onToggleSortDispo}
        />
      )
    })
  }

  return (
    <div className="bg-[#0d0e12] rounded-lg p-4 border border-[rgba(201,168,76,0.18)]">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-[11px] uppercase tracking-[0.32em] text-[#c9a84c] font-bold">
          ⚔ Participants
        </h2>
        <LayoutSwitch mode={layoutMode} onChange={changerLayoutMode} />
      </div>

      {layoutMode === 'horizontal' ? (
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-blue-400/70 mb-2">
              Compagnons ({compagnons.length})
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 items-start">
              {renderCards(compagnons, 'Aucun compagnon')}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-red-400/70 mb-2">
              Ennemis ({ennemis.length})
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 items-start">
              {renderCards(ennemis, 'Aucun ennemi')}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-blue-400/70 mb-2">
              Compagnons ({compagnons.length})
            </p>
            <div className="space-y-3">{renderCards(compagnons, 'Aucun compagnon')}</div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-red-400/70 mb-2">
              Ennemis ({ennemis.length})
            </p>
            <div className="space-y-3">{renderCards(ennemis, 'Aucun ennemi')}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function LayoutSwitch({
  mode,
  onChange
}: {
  mode: LayoutMode
  onChange: (m: LayoutMode) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-[rgba(201,168,76,0.25)] bg-[#12141a] p-0.5 text-[11px] uppercase tracking-[0.18em]">
      {(['horizontal', 'vertical'] as LayoutMode[]).map((m) => {
        const actif = mode === m
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`px-3 py-1 rounded transition ${
              actif
                ? 'bg-[#c9a84c]/15 text-[#e6c878]'
                : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            {m === 'horizontal' ? '▭ Horizontal' : '▯ Vertical'}
          </button>
        )
      })}
    </div>
  )
}

type ParticipantCardProps = {
  p: Participant
  pieceId: string
  isTurn: boolean
  isAnimatingKO: boolean
  expanded: boolean
  etat: EtatCombat | undefined
  onToggle: () => void
  modifierHp: (p: Participant, delta: number) => Promise<void>
  basculerCondition: (p: Participant, c: ConditionKey) => Promise<void>
  menuConditionsPour: string | null
  setMenuConditionsPour: React.Dispatch<React.SetStateAction<string | null>>
  tCond: (key: string) => string
  tCombat: (key: string, params?: Record<string, number | string>) => string
  layoutMode: LayoutMode
  sorts: SortDispo[]
  onToggleSortDispo: (entry: SortDispo) => Promise<void>
}

function ParticipantCard(props: ParticipantCardProps) {
  const {
    p,
    pieceId,
    isTurn,
    isAnimatingKO,
    expanded,
    etat,
    onToggle,
    modifierHp,
    basculerCondition,
    menuConditionsPour,
    setMenuConditionsPour,
    tCond,
    layoutMode,
    sorts,
    onToggleSortDispo
  } = props

  const isPerso = p.kind === 'perso'
  const pct = p.hp_max > 0 ? (p.hp_actuel / p.hp_max) * 100 : 0
  const barColor =
    pct <= 25 ? 'bg-red-500' : pct <= 50 ? 'bg-orange-500' : 'bg-green-500'
  const ca = isPerso ? p.ca ?? null : p.armure ?? null
  const conditionMenuOuvert = menuConditionsPour === pieceId

  // Tokens de bordure Minimal Eclipsed Forge
  const baseBorder = isPerso
    ? 'border-[rgba(201,168,76,0.2)]'
    : 'border-[rgba(220,38,38,0.25)]'
  const hoverBorder = isPerso
    ? 'hover:border-[rgba(201,168,76,0.45)]'
    : 'hover:border-[rgba(220,38,38,0.5)]'
  const expandedBorder = 'border-[rgba(201,168,76,0.6)]'

  const widthClass =
    layoutMode === 'horizontal' ? 'w-[260px] flex-shrink-0' : 'w-full'

  const initMod =
    p.dexterite != null ? Math.floor((p.dexterite - 10) / 2) : null
  const initStr =
    initMod == null ? '—' : initMod >= 0 ? `+${initMod}` : `${initMod}`

  // Classes d'animation KO appliquées sur la carte / le portrait. Les
  // keyframes sont définies dans globals.css.
  const cardKoClass = [
    isAnimatingKO && isPerso ? 'ko-card-shake' : '',
    isPerso && etat?.status === 'inconscient' ? 'ko-aura-perso' : ''
  ]
    .filter(Boolean)
    .join(' ')

  let imageEffectClass = ''
  if (isAnimatingKO) {
    imageEffectClass = isPerso ? 'ko-vacille-perso' : 'ko-fall-ennemi'
  } else if (etat?.status === 'inconscient') {
    imageEffectClass = 'ko-rest-perso'
  } else if (etat?.status === 'mort') {
    imageEffectClass = 'ko-rest-perso brightness-[0.4] saturate-50'
  } else if (etat?.status === 'vaincu') {
    imageEffectClass = 'ko-rest-ennemi'
  } else if (etat?.status === 'stabilise') {
    imageEffectClass = 'brightness-75'
  }

  return (
    <div
      data-piece-id={pieceId}
      data-ko-status={etat?.status ?? 'none'}
      data-ko-animating={isAnimatingKO ? 'true' : 'false'}
      className={`relative rounded-lg bg-[#12141a] border transition-colors duration-200 ${widthClass} ${cardKoClass} ${
        isTurn
          ? 'mef-turn-active border-[rgba(201,168,76,0.85)]'
          : expanded
          ? expandedBorder
          : `${baseBorder} ${hoverBorder}`
      }`}
    >
      {/* En-tête compact — toujours visible, cliquable */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-3 flex gap-3 items-center"
        aria-expanded={expanded}
      >
        <div className="relative flex-shrink-0">
          {p.image_url ? (
            <img
              src={p.image_url}
              alt={p.nom}
              loading="lazy"
              className={`w-12 h-12 object-cover ${
                isPerso ? 'rounded-full' : 'rounded'
              } ring-1 ${
                isPerso
                  ? 'ring-[rgba(201,168,76,0.3)]'
                  : 'ring-[rgba(220,38,38,0.4)]'
              } ${imageEffectClass}`}
              style={{ transformOrigin: 'center bottom' }}
            />
          ) : (
            <div
              className={`w-12 h-12 flex items-center justify-center font-bold text-white text-sm ${
                isPerso
                  ? 'rounded-full bg-[#1f2533]'
                  : 'rounded bg-[#2a1717]'
              } ${imageEffectClass}`}
              style={{ transformOrigin: 'center bottom' }}
            >
              {p.nom.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-100 truncate">{p.nom}</p>
            {etat && (
              <span className="text-[9px] tracking-widest text-red-300 font-bold uppercase">
                {etat.status}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 truncate">
            {isPerso
              ? `${p.classe ?? '—'}${p.niveau ? ` · Niv ${p.niveau}` : ''} · CA ${ca ?? '—'}`
              : `Ennemi · CA ${ca ?? '—'}`}
          </p>
          <div className="mt-1.5 h-1.5 rounded-full bg-black/40 overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">
            ❤ {p.hp_actuel}/{p.hp_max}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {isTurn && (
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#e6c878] font-bold whitespace-nowrap">
              ← TOUR
            </span>
          )}
          <span
            className={`text-[#c9a84c]/70 text-sm transition-transform duration-300 ${
              expanded ? 'rotate-180' : 'rotate-0'
            }`}
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
      </button>

      {/* Panneau déplié — animation grid-template-rows pour transition smooth */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-3 space-y-3 border-t border-[rgba(201,168,76,0.12)]">
            {/* Stats grid 3x2 */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'CA', value: ca },
                { label: 'VIT', value: isPerso ? p.vitesse ?? null : null },
                { label: 'INIT', value: initStr },
                { label: 'FOR', value: p.force ?? null },
                { label: 'DEX', value: p.dexterite ?? null },
                { label: 'CON', value: p.constitution ?? null }
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded border border-[rgba(201,168,76,0.18)] bg-black/30 px-2 py-1.5 text-center"
                >
                  <p className="text-[9px] tracking-[0.2em] text-[#c9a84c]/70 uppercase">
                    {s.label}
                  </p>
                  <p className="text-sm font-bold text-gray-100">
                    {s.value == null ? '—' : s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Armes — PJ uniquement */}
            {isPerso && (
              <CardSection title="⚔ ARMES">
                {p.armes && p.armes.length > 0 ? (
                  <ul className="space-y-1">
                    {p.armes.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-gray-200 truncate">{a.nom}</span>
                        <span className="text-[#c9a84c] font-mono text-[11px]">
                          {a.degats || '—'}
                          {a.bonus ? ` · ${a.bonus}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-gray-600 italic">Aucune arme.</p>
                )}
              </CardSection>
            )}

            {/* Sorts — PJ uniquement */}
            {isPerso && (
              <CardSection title="✦ SORTS">
                {sorts.length === 0 ? (
                  <p className="text-[11px] text-gray-600 italic">
                    Aucun sort attribué.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {sorts.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-black/50 border border-[rgba(201,168,76,0.3)] flex items-center justify-center text-[10px] font-bold text-[#c9a84c] flex-shrink-0">
                          {s.niveau === 0 ? 'C' : s.niveau}
                        </span>
                        <span className="flex-1 truncate text-gray-200">
                          {s.nom}
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleSortDispo(s)}
                          className={`text-[9px] tracking-[0.2em] font-bold px-2 py-0.5 rounded border transition ${
                            s.disponible
                              ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                              : 'border-gray-700 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {s.disponible ? 'DISPO' : 'UTILISÉ'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardSection>
            )}

            {/* Conditions — libellé utilisateur "États" */}
            <CardSection title="⚠ ÉTATS">
              {p.conditions.length === 0 ? (
                <p className="text-[11px] text-gray-600 italic">Aucune.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {p.conditions.map((cle) => {
                    const c = CONDITIONS_MAP[cle]
                    if (!c) return null
                    const nomTr = tCond(cle)
                    return (
                      <button
                        key={cle}
                        type="button"
                        onClick={() => basculerCondition(p, cle)}
                        title={`${nomTr} — ${c.description}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-purple-500/40 bg-purple-900/30 text-purple-100 text-[11px] hover:bg-red-900/40 hover:border-red-500/60 transition"
                      >
                        <span>{c.icone}</span>
                        <span>{nomTr}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {conditionMenuOuvert && (
                <div className="mt-2 p-2 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] max-h-56 overflow-y-auto">
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
                              ? 'bg-purple-700/40 text-white'
                              : 'hover:bg-white/[0.05] text-gray-300'
                          }`}
                        >
                          <span className="text-base leading-none">{c.icone}</span>
                          <span className="flex-1">{tCond(c.key)}</span>
                          {active && <span className="text-emerald-300">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardSection>

            {/* Boutons d'action */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              <CardActionButton
                label="−1 HP"
                tone="damage"
                onClick={() => modifierHp(p, -1)}
              />
              <CardActionButton
                label="+1 HP"
                tone="heal"
                onClick={() => modifierHp(p, 1)}
              />
              <CardActionButton
                label="+ ÉTAT"
                tone="neutral"
                onClick={() =>
                  setMenuConditionsPour((prev) =>
                    prev === pieceId ? null : pieceId
                  )
                }
              />
              {isPerso ? (
                <CardActionButton
                  label="FICHE"
                  tone="neutral"
                  onClick={() =>
                    (window.location.href = `/dashboard/personnages/${p.id}`)
                  }
                />
              ) : (
                <span aria-hidden="true" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardSection({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] text-[#c9a84c]/80 font-bold mb-1.5">
        {title}
      </p>
      {children}
    </div>
  )
}

function CardActionButton({
  label,
  onClick,
  tone
}: {
  label: string
  onClick: () => void
  tone: 'damage' | 'heal' | 'neutral'
}) {
  const colorClass =
    tone === 'damage'
      ? 'border-red-700/50 text-red-300 hover:bg-red-700/30 hover:border-red-500'
      : tone === 'heal'
      ? 'border-emerald-700/50 text-emerald-300 hover:bg-emerald-700/30 hover:border-emerald-500'
      : 'border-[rgba(201,168,76,0.35)] text-[#e6c878] hover:bg-[rgba(201,168,76,0.15)] hover:border-[rgba(201,168,76,0.7)]'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1.5 rounded border bg-transparent text-[10px] tracking-[0.18em] font-bold uppercase transition ${colorClass}`}
    >
      {label}
    </button>
  )
}
