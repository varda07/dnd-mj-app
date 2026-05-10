'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { CONDITIONS_MAP, isConditionKey, type ConditionKey } from '@/app/data/conditions'
import {
  slotsRecommandes,
  usesShortRest,
  extraireDes,
  type DiceExpr
} from '@/app/data/sorts_dnd5e'

type StatKey = 'force' | 'dexterite' | 'constitution' | 'intelligence' | 'sagesse' | 'charisme'

type Arme = { nom: string; bonus: string; degats: string }

type Personnage = {
  id: string
  nom: string
  race: string | null
  classe: string | null
  niveau: number
  hp_max: number
  hp_actuel: number
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
  de_vie: string | null
  image_url: string | null
  sous_classe: string
  historique: string
  xp: number
  ca: number
  vitesse: number
  temp_hp: number
  death_success: number
  death_fail: number
  de_vie_utilises: number
  inspiration: boolean
  saves_maitrises: Record<string, boolean>
  comp_maitrises: Record<string, boolean>
  comp_expertise: Record<string, boolean>
  armes: Arme[]
  equipement: string
  traits_espece: string
  traits_classe: string
  exploits: string
  langues: string
  autres_maitrises: string
  conditions: ConditionKey[]
  sorts_slots_max: Record<string, number>
  sorts_slots_used: Record<string, number>
}

type Sort = {
  id: string                  // sorts.id
  junction_id: string         // personnage_sorts.id — pour update/delete
  nom: string
  niveau: number
  ecole: string | null
  description: string | null
  temps_incantation: string | null
  portee: string | null
  duree: string | null
  composantes_verbal: boolean
  composantes_somatique: boolean
  composantes_materiel: string | null
  concentration: boolean
  rituel: boolean
  disponible: boolean
  prepare: boolean
}

type SortTemplate = {
  id: string
  nom: string
  niveau: number
  ecole: string | null
  description: string | null
}

type SaveState = 'saved' | 'pending' | 'saving' | 'error'

const STATS: { key: StatKey; label: string; abbr: string; icon: string }[] = [
  { key: 'force', label: 'Force', abbr: 'FOR', icon: '💪' },
  { key: 'dexterite', label: 'Dextérité', abbr: 'DEX', icon: '🏃' },
  { key: 'constitution', label: 'Constitution', abbr: 'CON', icon: '🫀' },
  { key: 'intelligence', label: 'Intelligence', abbr: 'INT', icon: '🧠' },
  { key: 'sagesse', label: 'Sagesse', abbr: 'SAG', icon: '🙏' },
  { key: 'charisme', label: 'Charisme', abbr: 'CHA', icon: '✨' }
]

const COMPETENCES: { nom: string; stat: StatKey }[] = [
  { nom: 'Acrobaties', stat: 'dexterite' },
  { nom: 'Arcanes', stat: 'intelligence' },
  { nom: 'Athlétisme', stat: 'force' },
  { nom: 'Discrétion', stat: 'dexterite' },
  { nom: 'Dressage', stat: 'sagesse' },
  { nom: 'Escamotage', stat: 'dexterite' },
  { nom: 'Histoire', stat: 'intelligence' },
  { nom: 'Intimidation', stat: 'charisme' },
  { nom: 'Investigation', stat: 'intelligence' },
  { nom: 'Médecine', stat: 'sagesse' },
  { nom: 'Nature', stat: 'intelligence' },
  { nom: 'Perception', stat: 'sagesse' },
  { nom: 'Perspicacité', stat: 'sagesse' },
  { nom: 'Persuasion', stat: 'charisme' },
  { nom: 'Religion', stat: 'intelligence' },
  { nom: 'Représentation', stat: 'charisme' },
  { nom: 'Survie', stat: 'sagesse' },
  { nom: 'Tromperie', stat: 'charisme' }
]

const FICHE_COLUMNS = [
  'hp_actuel',
  'sous_classe',
  'historique',
  'xp',
  'ca',
  'vitesse',
  'temp_hp',
  'death_success',
  'death_fail',
  'de_vie_utilises',
  'inspiration',
  'saves_maitrises',
  'comp_maitrises',
  'comp_expertise',
  'armes',
  'equipement',
  'traits_espece',
  'traits_classe',
  'exploits',
  'langues',
  'autres_maitrises',
  'sorts_slots_max',
  'sorts_slots_used'
] as const

const modifier = (v: number) => Math.floor((v - 10) / 2)
const formatMod = (m: number) => (m >= 0 ? `+${m}` : `${m}`)
const bonusMaitrise = (niv: number) => 2 + Math.floor((Math.max(1, niv) - 1) / 4)

const normalize = (row: Record<string, unknown>): Personnage => ({
  ...(row as Personnage),
  sous_classe: (row.sous_classe as string) ?? '',
  historique: (row.historique as string) ?? '',
  xp: (row.xp as number) ?? 0,
  ca: (row.ca as number) ?? 10,
  vitesse: (row.vitesse as number) ?? 9,
  temp_hp: (row.temp_hp as number) ?? 0,
  death_success: (row.death_success as number) ?? 0,
  death_fail: (row.death_fail as number) ?? 0,
  de_vie_utilises: (row.de_vie_utilises as number) ?? 0,
  inspiration: (row.inspiration as boolean) ?? false,
  saves_maitrises: (row.saves_maitrises as Record<string, boolean>) ?? {},
  comp_maitrises: (row.comp_maitrises as Record<string, boolean>) ?? {},
  comp_expertise: (row.comp_expertise as Record<string, boolean>) ?? {},
  armes: (row.armes as Arme[]) ?? [],
  equipement: (row.equipement as string) ?? '',
  traits_espece: (row.traits_espece as string) ?? '',
  traits_classe: (row.traits_classe as string) ?? '',
  exploits: (row.exploits as string) ?? '',
  langues: (row.langues as string) ?? '',
  autres_maitrises: (row.autres_maitrises as string) ?? '',
  conditions: Array.isArray(row.conditions)
    ? (row.conditions as unknown[]).filter(isConditionKey)
    : [],
  sorts_slots_max:
    (row.sorts_slots_max as Record<string, number>) ?? {},
  sorts_slots_used:
    (row.sorts_slots_used as Record<string, number>) ?? {}
})

export default function FichePersonnage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [perso, setPerso] = useState<Personnage | null>(null)
  const [sorts, setSorts] = useState<Sort[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [sortsModalOpen, setSortsModalOpen] = useState(false)
  const [sortsTemplates, setSortsTemplates] = useState<SortTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set())
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [colonnesManquantes, setColonnesManquantes] = useState<string[]>([])
  const [rollMessage, setRollMessage] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  const [nouvArmeNom, setNouvArmeNom] = useState('')
  const [nouvArmeBonus, setNouvArmeBonus] = useState('')
  const [nouvArmeDegats, setNouvArmeDegats] = useState('')

  const loadedRef = useRef(false)
  const colonnesDispoRef = useRef<Set<string>>(new Set())
  const tCond = useTranslations('conditions')

  useEffect(() => {
    if (!id) return
    loadedRef.current = false
    const fetchAll = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const [{ data: p }, { data: ps }] = await Promise.all([
        supabase
          .from('personnages')
          .select('*')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('personnage_sorts')
          .select(
            'id, disponible, prepare, sorts(id, nom, niveau, ecole, description, temps_incantation, portee, duree, composantes_verbal, composantes_somatique, composantes_materiel, concentration, rituel)'
          )
          .eq('personnage_id', id)
      ])
      if (!p) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setIsOwner((p as { joueur_id?: string }).joueur_id === user.id)
      const colonnes = new Set(Object.keys(p))
      colonnesDispoRef.current = colonnes
      const manquantes = FICHE_COLUMNS.filter((c) => !colonnes.has(c))
      setColonnesManquantes(manquantes)
      if (manquantes.length > 0) {
        console.warn(
          '[fiche] colonnes absentes dans la table personnages (migration non appliquée ?) :',
          manquantes
        )
      }
      setPerso(normalize(p as Record<string, unknown>))
      type FetchedSort = {
        id: string
        nom: string
        niveau: number
        ecole: string | null
        description: string | null
        temps_incantation: string | null
        portee: string | null
        duree: string | null
        composantes_verbal: boolean | null
        composantes_somatique: boolean | null
        composantes_materiel: string | null
        concentration: boolean | null
        rituel: boolean | null
      }
      const assignedRows = (ps ?? []) as Array<{
        id: string
        disponible: boolean
        prepare: boolean | null
        sorts: FetchedSort | FetchedSort[] | null
      }>
      const sortsAssigned: Sort[] = assignedRows
        .map((row) => {
          const s = Array.isArray(row.sorts) ? row.sorts[0] : row.sorts
          if (!s) return null
          return {
            id: s.id,
            junction_id: row.id,
            nom: s.nom,
            niveau: s.niveau,
            ecole: s.ecole,
            description: s.description,
            temps_incantation: s.temps_incantation,
            portee: s.portee,
            duree: s.duree,
            composantes_verbal: !!s.composantes_verbal,
            composantes_somatique: !!s.composantes_somatique,
            composantes_materiel: s.composantes_materiel,
            concentration: !!s.concentration,
            rituel: !!s.rituel,
            disponible: row.disponible,
            prepare: row.prepare ?? true
          }
        })
        .filter((x): x is Sort => x !== null)
        .sort(
          (a, b) =>
            // Préparés en premier, puis par niveau, puis par nom
            (a.prepare === b.prepare ? 0 : a.prepare ? -1 : 1) ||
            a.niveau - b.niveau ||
            a.nom.localeCompare(b.nom)
        )
      setSorts(sortsAssigned)
      setSaveState('saved')
      setSaveError(null)
      setLoading(false)
      queueMicrotask(() => {
        loadedRef.current = true
      })
    }
    fetchAll()
  }, [id])

  useEffect(() => {
    if (!perso || !loadedRef.current || !isOwner) return
    setSaveState('pending')
    const timer = setTimeout(async () => {
      setSaveState('saving')
      const payload: Record<string, unknown> = {}
      for (const col of FICHE_COLUMNS) {
        if (colonnesDispoRef.current.has(col)) {
          payload[col] = perso[col as keyof Personnage]
        }
      }
      if (Object.keys(payload).length === 0) {
        setSaveState('error')
        setSaveError('Aucune colonne de fiche n\'existe dans la table personnages.')
        return
      }
      const { data, error, status, statusText } = await supabase
        .from('personnages')
        .update(payload)
        .eq('id', perso.id)
        .select('id')
      if (error) {
        console.error('[fiche] erreur sauvegarde Supabase :', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status,
          statusText,
          payload
        })
        setSaveState('error')
        setSaveError(error.message || 'Erreur inconnue')
        return
      }
      if (!data || data.length === 0) {
        console.warn(
          '[fiche] update sans erreur mais 0 ligne modifiée — RLS ou id incorrect ?',
          { id: perso.id, payload }
        )
        setSaveState('error')
        setSaveError('Aucune ligne modifiée (policy RLS ou id invalide).')
        return
      }
      setSaveState('saved')
      setSaveError(null)
    }, 600)
    return () => clearTimeout(timer)
  }, [perso])

  const update = <K extends keyof Personnage>(key: K, value: Personnage[K]) => {
    setPerso((p) => (p ? { ...p, [key]: value } : p))
  }

  const niveau = perso?.niveau ?? 1
  const bm = bonusMaitrise(niveau)

  const stats = useMemo(() => {
    if (!perso) return null
    return STATS.map((s) => {
      const val = perso[s.key] ?? 10
      return { ...s, val, mod: modifier(val) }
    })
  }, [perso])

  const modStat = (key: StatKey) => (perso ? modifier(perso[key] ?? 10) : 0)

  const toast = (msg: string) => {
    setRollMessage(msg)
    setTimeout(() => setRollMessage(null), 3500)
  }

  const lancer = (label: string, bonus: number) => {
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + bonus
    toast(`🎲 ${label} : d20 (${d20}) ${formatMod(bonus)} = ${total}`)
  }

  const majHp = (delta: number) => {
    if (!perso) return
    const nouv = Math.max(0, Math.min(perso.hp_max, perso.hp_actuel + delta))
    if (nouv === perso.hp_actuel) return
    update('hp_actuel', nouv)
  }

  const majTempHp = (delta: number) => {
    if (!perso) return
    update('temp_hp', Math.max(0, perso.temp_hp + delta))
  }

  const toggleDeath = (type: 'success' | 'fail', index: number) => {
    if (!perso) return
    const key = type === 'success' ? 'death_success' : 'death_fail'
    const actuel = perso[key]
    update(key, actuel > index ? index : index + 1)
  }

  const resetDeath = () => {
    if (!perso) return
    setPerso({ ...perso, death_success: 0, death_fail: 0 })
  }

  const toggleSaveMaitrise = (key: StatKey) => {
    if (!perso) return
    update('saves_maitrises', {
      ...perso.saves_maitrises,
      [key]: !perso.saves_maitrises[key]
    })
  }

  const toggleCompMaitrise = (nom: string) => {
    if (!perso) return
    update('comp_maitrises', {
      ...perso.comp_maitrises,
      [nom]: !perso.comp_maitrises[nom]
    })
  }

  const toggleCompExpertise = (nom: string) => {
    if (!perso) return
    update('comp_expertise', {
      ...perso.comp_expertise,
      [nom]: !perso.comp_expertise[nom]
    })
  }

  const majDeVie = (delta: number) => {
    if (!perso) return
    update(
      'de_vie_utilises',
      Math.max(0, Math.min(niveau, perso.de_vie_utilises + delta))
    )
  }

  const ajouterArme = () => {
    if (!perso || !nouvArmeNom.trim()) return
    update('armes', [
      ...perso.armes,
      { nom: nouvArmeNom.trim(), bonus: nouvArmeBonus, degats: nouvArmeDegats }
    ])
    setNouvArmeNom('')
    setNouvArmeBonus('')
    setNouvArmeDegats('')
  }

  const retirerArme = (i: number) => {
    if (!perso) return
    update(
      'armes',
      perso.armes.filter((_, idx) => idx !== i)
    )
  }

  // === Attribution de sorts depuis la bibliothèque de modèles user-owned ===
  const ouvrirAttribuer = async () => {
    setSortsModalOpen(true)
    setSelectedTemplateIds(new Set())
    setTemplatesLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const assignedIds = new Set(sorts.map((s) => s.id))
    const { data } = await supabase
      .from('sorts')
      .select('id, nom, niveau, ecole, description')
      .eq('user_id', user.id)
      .order('niveau')
      .order('nom')
    const dispos = ((data ?? []) as SortTemplate[]).filter((s) => !assignedIds.has(s.id))
    setSortsTemplates(dispos)
    setTemplatesLoading(false)
  }

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const attribuerSelected = async () => {
    if (!perso || selectedTemplateIds.size === 0) {
      setSortsModalOpen(false)
      return
    }
    const rows = Array.from(selectedTemplateIds).map((sid) => ({
      personnage_id: perso.id,
      sort_id: sid,
      disponible: true
    }))
    const { data, error } = await supabase
      .from('personnage_sorts')
      .insert(rows)
      .select(
        'id, disponible, prepare, sorts(id, nom, niveau, ecole, description, temps_incantation, portee, duree, composantes_verbal, composantes_somatique, composantes_materiel, concentration, rituel)'
      )
    if (error) {
      console.error('[fiche] attribuer sorts :', error)
      return
    }
    type FetchedSort = {
      id: string
      nom: string
      niveau: number
      ecole: string | null
      description: string | null
      temps_incantation: string | null
      portee: string | null
      duree: string | null
      composantes_verbal: boolean | null
      composantes_somatique: boolean | null
      composantes_materiel: string | null
      concentration: boolean | null
      rituel: boolean | null
    }
    const ajoutes: Sort[] = ((data ?? []) as Array<{
      id: string
      disponible: boolean
      prepare: boolean | null
      sorts: FetchedSort | FetchedSort[] | null
    }>)
      .map((row) => {
        const s = Array.isArray(row.sorts) ? row.sorts[0] : row.sorts
        if (!s) return null
        return {
          id: s.id,
          junction_id: row.id,
          nom: s.nom,
          niveau: s.niveau,
          ecole: s.ecole,
          description: s.description,
          temps_incantation: s.temps_incantation,
          portee: s.portee,
          duree: s.duree,
          composantes_verbal: !!s.composantes_verbal,
          composantes_somatique: !!s.composantes_somatique,
          composantes_materiel: s.composantes_materiel,
          concentration: !!s.concentration,
          rituel: !!s.rituel,
          disponible: row.disponible,
          prepare: row.prepare ?? true
        }
      })
      .filter((x): x is Sort => x !== null)
    setSorts((prev) =>
      [...prev, ...ajoutes].sort(
        (a, b) =>
          (a.prepare === b.prepare ? 0 : a.prepare ? -1 : 1) ||
          a.niveau - b.niveau ||
          a.nom.localeCompare(b.nom)
      )
    )
    setSortsModalOpen(false)
  }

  const toggleSortDisponible = async (s: Sort) => {
    const nouvelle = !s.disponible
    const { error } = await supabase
      .from('personnage_sorts')
      .update({ disponible: nouvelle })
      .eq('id', s.junction_id)
    if (error) {
      console.error('[fiche] toggle sort :', error)
      return
    }
    setSorts((prev) =>
      prev.map((x) => (x.junction_id === s.junction_id ? { ...x, disponible: nouvelle } : x))
    )
  }

  const togglePrepare = async (s: Sort) => {
    const nouvelle = !s.prepare
    const { error } = await supabase
      .from('personnage_sorts')
      .update({ prepare: nouvelle })
      .eq('id', s.junction_id)
    if (error) {
      console.error('[fiche] toggle prepare :', error)
      return
    }
    setSorts((prev) =>
      prev
        .map((x) => (x.junction_id === s.junction_id ? { ...x, prepare: nouvelle } : x))
        .sort(
          (a, b) =>
            (a.prepare === b.prepare ? 0 : a.prepare ? -1 : 1) ||
            a.niveau - b.niveau ||
            a.nom.localeCompare(b.nom)
        )
    )
  }

  // ============== Slots de sorts ==============

  const slotMax = (lvl: number) => perso?.sorts_slots_max?.[String(lvl)] ?? 0
  const slotUsed = (lvl: number) => perso?.sorts_slots_used?.[String(lvl)] ?? 0

  const ajusterSlotMax = (lvl: number, delta: number) => {
    if (!perso) return
    const cur = slotMax(lvl)
    const next = Math.max(0, Math.min(20, cur + delta))
    if (next === cur) return
    const max = { ...perso.sorts_slots_max, [String(lvl)]: next }
    // Si on baisse le max sous le used courant, on aligne le used.
    const used = { ...perso.sorts_slots_used }
    if ((used[String(lvl)] ?? 0) > next) used[String(lvl)] = next
    setPerso({ ...perso, sorts_slots_max: max, sorts_slots_used: used })
  }

  const consommerSlot = (lvl: number) => {
    if (!perso) return false
    const max = slotMax(lvl)
    const used = slotUsed(lvl)
    if (max === 0 || used >= max) return false
    setPerso({
      ...perso,
      sorts_slots_used: {
        ...perso.sorts_slots_used,
        [String(lvl)]: used + 1
      }
    })
    return true
  }

  const restaurerSlot = (lvl: number) => {
    if (!perso) return
    const used = slotUsed(lvl)
    if (used === 0) return
    setPerso({
      ...perso,
      sorts_slots_used: {
        ...perso.sorts_slots_used,
        [String(lvl)]: Math.max(0, used - 1)
      }
    })
  }

  const reposLong = () => {
    if (!perso) return
    setPerso({ ...perso, sorts_slots_used: {} })
    // Restaurer aussi tous les sorts marqués utilisés (junction.disponible).
    void supabase
      .from('personnage_sorts')
      .update({ disponible: true })
      .eq('personnage_id', perso.id)
      .then(() => {
        setSorts((prev) => prev.map((x) => ({ ...x, disponible: true })))
      })
  }

  const reposCourt = () => {
    if (!perso) return
    // Pour Sorcier (Pacte Magique), repos court restaure les emplacements.
    if (!usesShortRest(perso.classe)) return
    setPerso({ ...perso, sorts_slots_used: {} })
  }

  const appliquerSlotsRecommandes = () => {
    if (!perso) return
    const reco = slotsRecommandes(perso.classe, perso.niveau)
    if (Object.keys(reco).length === 0) {
      toast('Pas de progression connue pour cette classe.')
      return
    }
    setPerso({
      ...perso,
      sorts_slots_max: reco,
      sorts_slots_used: {}
    })
  }

  // ============== Lancer un sort ==============

  type CastModal = { sort: Sort; minLevel: number } | null
  const [castModal, setCastModal] = useState<CastModal>(null)
  const [castingFx, setCastingFx] = useState<{ id: string; cantrip: boolean } | null>(null)
  const [diceProposal, setDiceProposal] = useState<{ sort: Sort; dice: DiceExpr[] } | null>(null)

  const declencherCast = (s: Sort) => {
    if (s.niveau === 0) {
      // Cantrip : effet visuel uniquement.
      setCastingFx({ id: s.junction_id, cantrip: true })
      setTimeout(() => setCastingFx(null), 1200)
      proposerLancerDes(s)
      return
    }
    setCastModal({ sort: s, minLevel: s.niveau })
  }

  const confirmerCast = (lvl: number) => {
    if (!castModal) return
    const ok = consommerSlot(lvl)
    if (!ok) {
      toast(`Aucun emplacement de niveau ${lvl} disponible.`)
      return
    }
    const s = castModal.sort
    setCastingFx({ id: s.junction_id, cantrip: false })
    setTimeout(() => setCastingFx(null), 1200)
    setCastModal(null)
    // Marque le sort comme utilisé sur la junction (pour les sorts à charge).
    void supabase
      .from('personnage_sorts')
      .update({ disponible: false })
      .eq('id', s.junction_id)
    setSorts((prev) =>
      prev.map((x) => (x.junction_id === s.junction_id ? { ...x, disponible: false } : x))
    )
    proposerLancerDes(s)
  }

  const proposerLancerDes = (s: Sort) => {
    const dice = extraireDes(s.description)
    if (dice.length > 0) setDiceProposal({ sort: s, dice })
  }

  const lancerDesPourSort = (d: DiceExpr) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('dice:open', { detail: { dice: `d${d.faces}` } })
    )
    setDiceProposal(null)
  }

  const retirerSort = async (s: Sort) => {
    if (!window.confirm(`Retirer « ${s.nom} » de ce personnage ?`)) return
    const { error } = await supabase
      .from('personnage_sorts')
      .delete()
      .eq('id', s.junction_id)
    if (error) {
      console.error('[fiche] retirer sort :', error)
      return
    }
    setSorts((prev) => prev.filter((x) => x.junction_id !== s.junction_id))
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400">Chargement...</p>
      </main>
    )
  }

  if (notFound || !perso || !stats) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white mb-4"
          >
            Retour
          </button>
          <p className="text-red-400">Personnage introuvable.</p>
        </div>
      </main>
    )
  }

  const percepPassive = 10 + modStat('sagesse') + (perso.comp_maitrises['Perception'] ? bm : 0)
  const initiative = modStat('dexterite')
  const deVieRestants = niveau - perso.de_vie_utilises
  const cantrips = sorts.filter((s) => s.niveau === 0)
  const sortsAttaque = cantrips
  const sortsConnus = sorts.filter((s) => s.niveau > 0)

  const saveLabel: Record<SaveState, { text: string; color: string }> = {
    saved: { text: '✓ Sauvegardé', color: 'text-green-400' },
    pending: { text: '⋯ Modifications en attente', color: 'text-yellow-400' },
    saving: { text: '💾 Sauvegarde...', color: 'text-yellow-300' },
    error: {
      text: saveError ? `⚠ Erreur : ${saveError}` : '⚠ Erreur de sauvegarde',
      color: 'text-red-400'
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-stone-900 to-gray-900 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            Retour
          </button>
          <h1 className="text-2xl font-bold text-yellow-500 tracking-wide">
            📜 Fiche de personnage
          </h1>
          <span
            className={`ml-auto text-xs ${
              isOwner ? saveLabel[saveState].color : 'text-blue-300'
            } max-w-md truncate`}
            title={isOwner ? saveLabel[saveState].text : 'Consultation MJ — lecture seule'}
          >
            {isOwner
              ? saveLabel[saveState].text
              : '👁 Lecture seule (consultation MJ)'}
          </span>
        </div>

        {!isOwner && (
          <div className="bg-blue-900/30 border border-blue-700/60 rounded-lg p-3 mb-4 text-sm text-blue-200">
            Tu consultes la fiche d'un joueur de ton scénario. Les modifications
            ne seront pas sauvegardées. Utilise la page Combat pour ajuster les PV
            pendant un combat.
          </div>
        )}

        {colonnesManquantes.length > 0 && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 mb-4 text-sm">
            <p className="text-red-300 font-bold mb-1">
              ⚠ Migration SQL non appliquée
            </p>
            <p className="text-red-200/80 text-xs mb-2">
              Ces colonnes ne seront pas sauvegardées car elles n'existent pas encore
              dans la table <code className="text-red-100">personnages</code> :
            </p>
            <code className="block text-red-100 text-xs bg-red-950/50 rounded p-2 overflow-x-auto">
              {colonnesManquantes.join(', ')}
            </code>
            <p className="text-red-200/80 text-xs mt-2">
              Exécute <code className="text-red-100">supabase/setup.sql</code> dans
              le SQL Editor de Supabase pour les créer.
            </p>
          </div>
        )}

        {perso.conditions.length > 0 && (
          <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-3 mb-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-purple-300 mb-2">
              {tCond('title')}
            </p>
            <div className="flex flex-wrap gap-2">
              {perso.conditions.map((cle) => {
                const c = CONDITIONS_MAP[cle]
                if (!c) return null
                const nomTr = tCond(cle)
                return (
                  <span
                    key={cle}
                    className="group relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-800/60 border border-purple-400/60 text-purple-50 text-sm cursor-help"
                    title={`${nomTr} — ${c.description}`}
                  >
                    <span className="text-base leading-none">{c.icone}</span>
                    <span className="font-medium">{nomTr}</span>
                    <span
                      className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 hidden group-hover:block w-64 p-2 rounded bg-gray-900 border border-purple-500/60 text-[11px] text-gray-200 shadow-xl"
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
                  </span>
                )
              })}
            </div>
          </div>
        )}

        <div className="bg-stone-800/70 border-2 border-yellow-700/60 rounded-lg shadow-2xl p-4 md:p-6 mb-4">
          <div className="flex flex-col md:flex-row gap-4">
            {perso.image_url ? (
              <img
                src={perso.image_url}
                alt={perso.nom}
                loading="lazy"
                className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover ring-4 ring-yellow-600 shadow-lg flex-shrink-0 bg-stone-900"
              />
            ) : (
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full ring-4 ring-yellow-600 bg-stone-900 flex items-center justify-center text-4xl font-bold text-yellow-500 flex-shrink-0">
                {perso.nom.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="col-span-2 md:col-span-3">
                <p className="text-xs uppercase text-yellow-600 tracking-widest">Nom</p>
                <p className="text-2xl md:text-3xl font-bold text-yellow-100 font-serif">
                  {perso.nom}
                </p>
              </div>
              <Champ label="Classe" value={perso.classe ?? '—'} />
              <Champ label="Sous-classe">
                <input
                  type="text"
                  value={perso.sous_classe}
                  onChange={(e) => update('sous_classe', e.target.value)}
                  placeholder="—"
                  className="w-full bg-transparent border-b border-yellow-700/40 text-yellow-100 outline-none text-sm"
                />
              </Champ>
              <Champ label="Espèce" value={perso.race ?? '—'} />
              <Champ label="Historique">
                <input
                  type="text"
                  value={perso.historique}
                  onChange={(e) => update('historique', e.target.value)}
                  placeholder="—"
                  className="w-full bg-transparent border-b border-yellow-700/40 text-yellow-100 outline-none text-sm"
                />
              </Champ>
              <Champ label="Niveau" value={String(perso.niveau)} />
              <Champ label="XP">
                <input
                  type="number"
                  value={perso.xp}
                  onChange={(e) => update('xp', parseInt(e.target.value) || 0)}
                  className="w-full bg-transparent border-b border-yellow-700/40 text-yellow-100 outline-none text-sm"
                />
              </Champ>
              <Champ label="Bonus maîtrise" value={formatMod(bm)} />
              <Champ label="Inspiration">
                <button
                  type="button"
                  onClick={() => update('inspiration', !perso.inspiration)}
                  className={`w-6 h-6 rounded-full border-2 ${
                    perso.inspiration
                      ? 'bg-yellow-500 border-yellow-300'
                      : 'border-yellow-700/60 hover:border-yellow-500'
                  }`}
                />
              </Champ>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <Panel title="Caractéristiques">
              <div className="grid grid-cols-2 gap-3">
                {stats.map((s) => (
                  <div
                    key={s.key}
                    className="bg-stone-900/80 border-2 border-yellow-800/50 rounded p-3 text-center"
                  >
                    <p className="text-xs uppercase text-yellow-600 tracking-widest">
                      {s.icon} {s.abbr}
                    </p>
                    <p className="text-3xl font-bold text-yellow-100 font-serif mt-1">
                      {formatMod(s.mod)}
                    </p>
                    <div className="mt-1 inline-block bg-stone-800 border border-yellow-800/60 rounded-full px-3 py-0.5">
                      <span className="text-sm text-gray-300">{s.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Jets de sauvegarde">
              <div className="space-y-1">
                {STATS.map((s) => {
                  const maitrise = !!perso.saves_maitrises[s.key]
                  const total = modifier(perso[s.key] ?? 10) + (maitrise ? bm : 0)
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => lancer(`Sauvegarde ${s.label}`, total)}
                      className="w-full flex items-center gap-2 p-2 rounded hover:bg-stone-700/40 transition text-left"
                    >
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSaveMaitrise(s.key)
                        }}
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 cursor-pointer ${
                          maitrise
                            ? 'bg-yellow-500 border-yellow-300'
                            : 'border-yellow-700/60'
                        }`}
                      />
                      <span className="text-yellow-100 font-bold w-12">
                        {formatMod(total)}
                      </span>
                      <span className="text-gray-300 text-sm">{s.label}</span>
                    </button>
                  )
                })}
              </div>
            </Panel>

            <Panel title="Compétences">
              <div className="space-y-1">
                {COMPETENCES.map((c) => {
                  const maitrise = !!perso.comp_maitrises[c.nom]
                  const expert = !!perso.comp_expertise[c.nom]
                  const mult = expert ? 2 : maitrise ? 1 : 0
                  const total = modStat(c.stat) + bm * mult
                  const stat = STATS.find((s) => s.key === c.stat)!
                  return (
                    <button
                      key={c.nom}
                      type="button"
                      onClick={() => lancer(c.nom, total)}
                      className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-stone-700/40 transition text-left"
                    >
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCompMaitrise(c.nom)
                        }}
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 cursor-pointer ${
                          maitrise
                            ? 'bg-yellow-500 border-yellow-300'
                            : 'border-yellow-700/60'
                        }`}
                        title="Maîtrise"
                      />
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCompExpertise(c.nom)
                        }}
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 cursor-pointer ${
                          expert
                            ? 'bg-yellow-300 border-yellow-200'
                            : 'border-yellow-800/50'
                        }`}
                        title="Expertise"
                      />
                      <span className="text-yellow-100 font-bold w-10">
                        {formatMod(total)}
                      </span>
                      <span className="text-gray-300 text-sm flex-1">{c.nom}</span>
                      <span className="text-gray-500 text-xs">{stat.abbr}</span>
                    </button>
                  )
                })}
              </div>
            </Panel>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Panel title="Combat">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Stat box label="CA">
                  <input
                    type="number"
                    value={perso.ca}
                    onChange={(e) => update('ca', parseInt(e.target.value) || 0)}
                    className="w-full bg-transparent text-2xl font-bold text-yellow-100 font-serif text-center outline-none"
                  />
                </Stat>
                <Stat box label="Initiative">
                  <button
                    type="button"
                    onClick={() => lancer('Initiative', initiative)}
                    className="w-full text-2xl font-bold text-yellow-100 font-serif text-center hover:text-yellow-300"
                  >
                    {formatMod(initiative)}
                  </button>
                </Stat>
                <Stat box label="Vitesse">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      value={perso.vitesse}
                      onChange={(e) => update('vitesse', parseInt(e.target.value) || 0)}
                      className="w-12 bg-transparent text-2xl font-bold text-yellow-100 font-serif text-center outline-none"
                    />
                    <span className="text-gray-400 text-xs">m</span>
                  </div>
                </Stat>
                <Stat box label="Perception passive">
                  <p className="text-2xl font-bold text-yellow-100 font-serif text-center">
                    {percepPassive}
                  </p>
                </Stat>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-stone-900/60 border border-yellow-800/40 rounded p-3">
                  <p className="text-xs uppercase text-yellow-600 tracking-widest mb-2">
                    Points de vie
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 text-sm">Actuels / Max</span>
                    <span className="text-yellow-100 font-bold text-lg">
                      {perso.hp_actuel} / {perso.hp_max}
                    </span>
                  </div>
                  <div className="flex gap-1 mb-3">
                    <button
                      type="button"
                      onClick={() => majHp(-5)}
                      className="flex-1 h-8 bg-red-800 hover:bg-red-700 rounded text-xs font-bold"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => majHp(-1)}
                      className="flex-1 h-8 bg-red-700 hover:bg-red-600 rounded font-bold"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => majHp(1)}
                      className="flex-1 h-8 bg-green-700 hover:bg-green-600 rounded font-bold"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => majHp(5)}
                      className="flex-1 h-8 bg-green-800 hover:bg-green-700 rounded text-xs font-bold"
                    >
                      +5
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">PV temporaires</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => majTempHp(-1)}
                        className="w-7 h-7 bg-stone-700 hover:bg-stone-600 rounded font-bold"
                      >
                        -
                      </button>
                      <span className="text-yellow-100 font-bold w-6 text-center">
                        {perso.temp_hp}
                      </span>
                      <button
                        type="button"
                        onClick={() => majTempHp(1)}
                        className="w-7 h-7 bg-stone-700 hover:bg-stone-600 rounded font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-stone-900/60 border border-yellow-800/40 rounded p-3">
                  <p className="text-xs uppercase text-yellow-600 tracking-widest mb-2">
                    Dés de vie ({perso.de_vie ?? '—'})
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-300 text-sm">Restants / Total</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => majDeVie(1)}
                        className="w-7 h-7 bg-stone-700 hover:bg-stone-600 rounded font-bold"
                        title="Utiliser un dé"
                      >
                        -
                      </button>
                      <span className="text-yellow-100 font-bold">
                        {deVieRestants} / {niveau}
                      </span>
                      <button
                        type="button"
                        onClick={() => majDeVie(-1)}
                        className="w-7 h-7 bg-stone-700 hover:bg-stone-600 rounded font-bold"
                        title="Récupérer un dé"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <p className="text-xs uppercase text-yellow-600 tracking-widest mb-2">
                    Jets contre la mort
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-xs w-16">Succès</span>
                      {[0, 1, 2].map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleDeath('success', i)}
                          className={`w-5 h-5 rounded-full border-2 ${
                            perso.death_success > i
                              ? 'bg-green-500 border-green-300'
                              : 'border-green-700/60 hover:border-green-500'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-xs w-16">Échecs</span>
                      {[0, 1, 2].map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleDeath('fail', i)}
                          className={`w-5 h-5 rounded-full border-2 ${
                            perso.death_fail > i
                              ? 'bg-red-500 border-red-300'
                              : 'border-red-700/60 hover:border-red-500'
                          }`}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={resetDeath}
                        className="ml-auto text-xs text-gray-500 hover:text-white"
                      >
                        Réinitialiser
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Attaques & sorts d'attaque">
              <div className="space-y-2 mb-3">
                <div className="hidden md:grid md:grid-cols-[2fr_1fr_2fr_auto] gap-2 text-xs uppercase text-yellow-600 tracking-widest px-1">
                  <span>Nom</span>
                  <span>Bonus</span>
                  <span>Dégâts / type</span>
                  <span />
                </div>
                {perso.armes.length === 0 && (
                  <p className="text-gray-500 text-sm italic px-1">Aucune arme.</p>
                )}
                {perso.armes.map((a, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap md:grid md:grid-cols-[2fr_1fr_2fr_auto] gap-2 md:items-center bg-stone-900/60 border border-yellow-800/30 rounded p-2"
                  >
                    <span className="text-yellow-100 font-bold flex-1 min-w-[8rem] break-words">{a.nom}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const b = parseInt(a.bonus) || 0
                        lancer(`Attaque ${a.nom}`, b)
                      }}
                      className="text-yellow-100 font-bold text-left hover:text-yellow-300 whitespace-nowrap"
                      title="Lancer d20 + bonus"
                    >
                      <span className="md:hidden text-xs text-yellow-600 uppercase mr-1">Bonus :</span>
                      {a.bonus || '—'}
                    </button>
                    <span className="text-gray-300 text-sm basis-full md:basis-auto break-words">
                      <span className="md:hidden text-xs text-yellow-600 uppercase mr-1">Dégâts :</span>
                      {a.degats || '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => retirerArme(i)}
                      className="text-red-400 hover:text-red-300 text-sm px-2 ml-auto md:ml-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {sortsAttaque.length > 0 && (
                  <div className="pt-2 border-t border-yellow-800/30">
                    <p className="text-xs uppercase text-yellow-600 tracking-widest mb-2">
                      Tours de magie
                    </p>
                    {sortsAttaque.map((s) => (
                      <div
                        key={s.id}
                        className="bg-stone-900/60 border border-yellow-800/30 rounded p-2 mb-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-yellow-100 font-bold">{s.nom}</span>
                          {s.ecole && (
                            <span className="text-xs text-gray-500">{s.ecole}</span>
                          )}
                        </div>
                        {s.description && (
                          <p className="text-gray-400 text-xs italic mt-1">
                            {s.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_auto] gap-2 bg-stone-900/40 p-2 rounded">
                <input
                  type="text"
                  value={nouvArmeNom}
                  onChange={(e) => setNouvArmeNom(e.target.value)}
                  placeholder="Nom de l'arme (ex. Épée longue)"
                  className="bg-stone-800 p-2 rounded text-sm outline-none border border-yellow-800/30 w-full min-w-0"
                />
                <input
                  type="text"
                  value={nouvArmeBonus}
                  onChange={(e) => setNouvArmeBonus(e.target.value)}
                  placeholder="Bonus (ex. +5)"
                  className="bg-stone-800 p-2 rounded text-sm outline-none border border-yellow-800/30 w-full min-w-0"
                />
                <input
                  type="text"
                  value={nouvArmeDegats}
                  onChange={(e) => setNouvArmeDegats(e.target.value)}
                  placeholder="Dégâts (ex. 1d8+3 tranchant)"
                  className="bg-stone-800 p-2 rounded text-sm outline-none border border-yellow-800/30 w-full min-w-0"
                />
                <button
                  type="button"
                  onClick={ajouterArme}
                  className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-gray-900 rounded text-sm font-bold"
                >
                  + Ajouter
                </button>
              </div>
            </Panel>

            <Panel title="🪄 Emplacements de sorts">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                <p className="text-xs text-gray-500">
                  Cases pleines = utilisées · cases vides = disponibles
                </p>
                {isOwner && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={appliquerSlotsRecommandes}
                      className="px-3 py-1.5 rounded text-xs font-bold bg-stone-700 hover:bg-stone-600 text-yellow-200 border border-yellow-700/50"
                      title="Applique la table PHB pour la classe + niveau de ce personnage."
                    >
                      📜 Auto (PHB)
                    </button>
                    {usesShortRest(perso.classe) && (
                      <button
                        type="button"
                        onClick={reposCourt}
                        className="px-3 py-1.5 rounded text-xs font-bold bg-amber-700/30 hover:bg-amber-700/50 text-amber-200 border border-amber-700/50"
                        title="Sorcier : repos court restaure tous les emplacements du Pacte."
                      >
                        ☕ Repos court
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={reposLong}
                      className="px-3 py-1.5 rounded text-xs font-bold bg-yellow-600 hover:bg-yellow-500 text-gray-900"
                    >
                      🌙 Repos long
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
                  const max = slotMax(lvl)
                  const used = slotUsed(lvl)
                  if (max === 0 && !isOwner) return null
                  return (
                    <div
                      key={lvl}
                      className={`flex items-center gap-2 p-2 rounded ${
                        max === 0
                          ? 'bg-stone-900/30'
                          : 'bg-stone-900/60 border border-yellow-800/30'
                      }`}
                    >
                      <span className="text-yellow-200 font-bold text-sm w-12 flex-shrink-0">
                        Niv. {lvl}
                      </span>
                      <div className="flex-1 flex items-center gap-1 flex-wrap">
                        {Array.from({ length: max }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            disabled={!isOwner}
                            onClick={() =>
                              i < used ? restaurerSlot(lvl) : consommerSlot(lvl)
                            }
                            aria-label={
                              i < used
                                ? `Emplacement ${lvl} utilisé`
                                : `Emplacement ${lvl} disponible`
                            }
                            className={`w-5 h-5 rounded-full border-2 transition ${
                              i < used
                                ? 'bg-yellow-500 border-yellow-300 shadow-[0_0_6px_rgba(201,168,76,0.5)]'
                                : 'bg-transparent border-yellow-700/60 hover:border-yellow-400'
                            }`}
                          />
                        ))}
                        {max === 0 && (
                          <span className="text-stone-500 text-xs italic">
                            (aucun emplacement)
                          </span>
                        )}
                      </div>
                      {isOwner && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => ajusterSlotMax(lvl, -1)}
                            className="w-6 h-6 rounded text-yellow-300 bg-stone-800 hover:bg-stone-700 border border-yellow-800/40 text-xs"
                            aria-label="Diminuer le maximum"
                          >
                            −
                          </button>
                          <span className="text-xs text-gray-400 w-10 text-center">
                            {max - used}/{max}
                          </span>
                          <button
                            type="button"
                            onClick={() => ajusterSlotMax(lvl, +1)}
                            className="w-6 h-6 rounded text-yellow-300 bg-stone-800 hover:bg-stone-700 border border-yellow-800/40 text-xs"
                            aria-label="Augmenter le maximum"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Panel>

            <Panel title="✨ Sorts">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                <p className="text-xs text-gray-500">
                  {sortsConnus.length + cantrips.length} sort(s) attribué(s)
                  {' · '}
                  {sortsConnus.filter((s) => s.prepare).length} préparé(s)
                </p>
                {isOwner && (
                  <button
                    type="button"
                    onClick={ouvrirAttribuer}
                    className="px-3 py-1.5 rounded text-xs font-bold bg-yellow-600 hover:bg-yellow-500 text-gray-900"
                  >
                    ➕ Attribuer des sorts
                  </button>
                )}
              </div>

              {cantrips.length === 0 && sortsConnus.length === 0 ? (
                <p className="text-gray-500 italic text-sm">
                  Aucun sort attribué à ce personnage.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Cantrips (niveau 0) — toujours disponibles, séparés visuellement */}
                  {cantrips.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-600 font-bold mb-2 flex items-center gap-2">
                        <span>∞ Tours de magie</span>
                        <span className="text-stone-500 italic normal-case tracking-normal text-[11px] font-normal">
                          Toujours disponibles
                        </span>
                      </p>
                      <div className="space-y-2">
                        {cantrips.map((s) => (
                          <SortLigne
                            key={s.junction_id}
                            sort={s}
                            isOwner={isOwner}
                            cantrip
                            casting={castingFx?.id === s.junction_id}
                            onCast={() => declencherCast(s)}
                            onRetirer={() => retirerSort(s)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sorts niveau 1+ — préparés en haut, non préparés grisés */}
                  {sortsConnus.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-600 font-bold mb-2">
                        Sorts connus
                      </p>
                      <div className="space-y-2">
                        {sortsConnus.map((s) => (
                          <SortLigne
                            key={s.junction_id}
                            sort={s}
                            isOwner={isOwner}
                            casting={castingFx?.id === s.junction_id}
                            onCast={() => declencherCast(s)}
                            onTogglePrepare={() => togglePrepare(s)}
                            onToggleDispo={() => toggleSortDisponible(s)}
                            onRetirer={() => retirerSort(s)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Panel>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Panel title="Caractéristiques de classe">
                <textarea
                  value={perso.traits_classe}
                  onChange={(e) => update('traits_classe', e.target.value)}
                  placeholder="Rage, Sens divin, Ki..."
                  className="w-full h-32 bg-stone-900/60 border border-yellow-800/30 rounded p-2 text-sm text-gray-200 outline-none resize-y"
                />
              </Panel>
              <Panel title="Traits de l'espèce">
                <textarea
                  value={perso.traits_espece}
                  onChange={(e) => update('traits_espece', e.target.value)}
                  placeholder="Vision dans le noir, résistance féerique..."
                  className="w-full h-32 bg-stone-900/60 border border-yellow-800/30 rounded p-2 text-sm text-gray-200 outline-none resize-y"
                />
              </Panel>
              <Panel title="Exploits">
                <textarea
                  value={perso.exploits}
                  onChange={(e) => update('exploits', e.target.value)}
                  placeholder="Vigilant, Attaque puissante..."
                  className="w-full h-24 bg-stone-900/60 border border-yellow-800/30 rounded p-2 text-sm text-gray-200 outline-none resize-y"
                />
              </Panel>
              <Panel title="Maîtrises & langues">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs uppercase text-yellow-600 tracking-widest mb-1">
                      Armes, armures, outils
                    </p>
                    <textarea
                      value={perso.autres_maitrises}
                      onChange={(e) => update('autres_maitrises', e.target.value)}
                      placeholder="Armes courantes, armures légères, outils de voleur..."
                      className="w-full h-16 bg-stone-900/60 border border-yellow-800/30 rounded p-2 text-sm text-gray-200 outline-none resize-y"
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-yellow-600 tracking-widest mb-1">
                      Langues
                    </p>
                    <textarea
                      value={perso.langues}
                      onChange={(e) => update('langues', e.target.value)}
                      placeholder="Commun, elfique..."
                      className="w-full h-16 bg-stone-900/60 border border-yellow-800/30 rounded p-2 text-sm text-gray-200 outline-none resize-y"
                    />
                  </div>
                </div>
              </Panel>
            </div>

            <Panel title="Équipement">
              <textarea
                value={perso.equipement}
                onChange={(e) => update('equipement', e.target.value)}
                placeholder="Sac à dos, corde (15m), torches (10), rations (5 jours), bourse avec 50 po..."
                className="w-full h-32 bg-stone-900/60 border border-yellow-800/30 rounded p-2 text-sm text-gray-200 outline-none resize-y"
              />
            </Panel>
          </div>
        </div>
      </div>

      {sortsModalOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSortsModalOpen(false)}
        >
          <div
            className="bg-stone-800 border-2 border-yellow-600 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-yellow-800/50 flex items-center justify-between">
              <h3 className="text-yellow-500 font-bold">➕ Attribuer des sorts</h3>
              <button
                type="button"
                onClick={() => setSortsModalOpen(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {templatesLoading ? (
                <p className="text-gray-400 text-sm">Chargement…</p>
              ) : sortsTemplates.length === 0 ? (
                <p className="text-gray-400 text-sm italic">
                  Aucun sort disponible. Crée des sorts dans la page Sorts pour pouvoir les attribuer.
                </p>
              ) : (
                <ul className="space-y-1">
                  {sortsTemplates.map((tpl) => {
                    const checked = selectedTemplateIds.has(tpl.id)
                    return (
                      <li key={tpl.id}>
                        <label
                          className={`flex items-start gap-3 p-2 rounded cursor-pointer border ${
                            checked
                              ? 'bg-yellow-500/10 border-yellow-600/60'
                              : 'bg-stone-900/50 border-stone-700 hover:bg-stone-700/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTemplateSelection(tpl.id)}
                            className="mt-1 w-4 h-4 accent-yellow-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-yellow-100 font-bold">{tpl.nom}</span>
                              <span className="text-[11px] text-gray-500">
                                {tpl.niveau === 0 ? 'Tour' : `Niv. ${tpl.niveau}`}
                                {tpl.ecole ? ` · ${tpl.ecole}` : ''}
                              </span>
                            </div>
                            {tpl.description && (
                              <p className="text-gray-400 text-xs italic mt-1 line-clamp-2">
                                {tpl.description}
                              </p>
                            )}
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="p-3 border-t border-yellow-800/50 flex gap-2">
              <button
                type="button"
                onClick={attribuerSelected}
                disabled={selectedTemplateIds.size === 0}
                className="flex-1 px-3 py-2 rounded bg-yellow-500 text-gray-900 font-bold hover:bg-yellow-400 disabled:opacity-50"
              >
                Attribuer ({selectedTemplateIds.size})
              </button>
              <button
                type="button"
                onClick={() => setSortsModalOpen(false)}
                className="px-3 py-2 rounded bg-stone-700 text-white hover:bg-stone-600"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {rollMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-800 border-2 border-yellow-600 rounded-lg p-4 shadow-2xl animate-pulse">
          <p className="text-yellow-100 font-bold">{rollMessage}</p>
        </div>
      )}

      {castModal && (
        <div
          className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-4"
          onClick={() => setCastModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl shadow-2xl"
            style={{
              background: '#12141a',
              border: '1px solid rgba(201,168,76,0.5)'
            }}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: 'rgba(201,168,76,0.2)' }}
            >
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#C9A84C] font-bold">
                Lancer le sort
              </p>
              <h3 className="text-yellow-100 font-bold text-lg mt-1">
                {castModal.sort.nom}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Niveau minimum : {castModal.minLevel}. Choisis l&apos;emplacement à dépenser
                (montée d&apos;emplacement possible).
              </p>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9]
                .filter((lvl) => lvl >= castModal.minLevel)
                .map((lvl) => {
                  const max = slotMax(lvl)
                  const used = slotUsed(lvl)
                  const dispo = max - used
                  const indispo = max === 0 || dispo === 0
                  return (
                    <button
                      key={lvl}
                      type="button"
                      disabled={indispo}
                      onClick={() => confirmerCast(lvl)}
                      className={`p-2 rounded text-sm font-bold transition ${
                        indispo
                          ? 'bg-stone-900/50 border border-stone-700 text-stone-600 cursor-not-allowed'
                          : 'bg-yellow-500/10 border border-yellow-600/60 text-yellow-200 hover:bg-yellow-500/25'
                      }`}
                    >
                      Niv. {lvl}
                      <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                        {dispo}/{max}
                      </span>
                    </button>
                  )
                })}
            </div>
            <div
              className="px-3 py-2 border-t flex justify-end"
              style={{ borderColor: 'rgba(201,168,76,0.15)' }}
            >
              <button
                type="button"
                onClick={() => setCastModal(null)}
                className="px-3 py-1.5 rounded text-xs bg-stone-700 hover:bg-stone-600 text-gray-200"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {diceProposal && (
        <div
          className="fixed bottom-6 right-6 z-[110] rounded-lg shadow-2xl p-3 max-w-xs"
          style={{
            background: '#12141a',
            border: '1px solid rgba(201,168,76,0.5)'
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#C9A84C] font-bold mb-1">
            Dés détectés dans {diceProposal.sort.nom}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {diceProposal.dice.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => lancerDesPourSort(d)}
                className="px-2.5 py-1 rounded bg-yellow-500/15 border border-yellow-600/60 text-yellow-200 hover:bg-yellow-500/30 text-xs font-bold"
              >
                🎲 {d.n}d{d.faces}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDiceProposal(null)}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

// ----------------------------------------------------------------------------
// SortLigne : ligne d'un sort dans la fiche perso, avec V/S/M, prepare,
// "Lancer", et effet visuel de cast.
// ----------------------------------------------------------------------------
function SortLigne({
  sort,
  isOwner,
  cantrip,
  casting,
  onCast,
  onTogglePrepare,
  onToggleDispo,
  onRetirer
}: {
  sort: Sort
  isOwner: boolean
  cantrip?: boolean
  casting: boolean
  onCast: () => void
  onTogglePrepare?: () => void
  onToggleDispo?: () => void
  onRetirer: () => void
}) {
  const grise = !cantrip && !sort.prepare
  const utilise = !sort.disponible && !cantrip
  return (
    <div
      className={`relative bg-stone-900/60 border rounded p-2 transition ${
        utilise ? 'border-stone-700 opacity-60' : 'border-yellow-800/30'
      } ${grise ? 'opacity-50' : ''}`}
    >
      {/* Effet visuel d'incantation */}
      {casting && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded animate-pulse"
          style={{
            boxShadow: cantrip
              ? '0 0 20px 4px rgba(201,168,76,0.55), inset 0 0 20px rgba(201,168,76,0.25)'
              : '0 0 26px 6px rgba(139,92,246,0.65), inset 0 0 26px rgba(139,92,246,0.35)',
            background: cantrip
              ? 'radial-gradient(circle at 50% 100%, rgba(201,168,76,0.18), transparent 70%)'
              : 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.18), transparent 70%)'
          }}
        />
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-yellow-100 font-bold truncate">{sort.nom}</span>
          {sort.composantes_verbal && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-stone-800 border border-yellow-800/40 text-gray-400">
              V
            </span>
          )}
          {sort.composantes_somatique && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-stone-800 border border-yellow-800/40 text-gray-400">
              S
            </span>
          )}
          {sort.composantes_materiel && (
            <span
              className="text-[9px] px-1 py-0.5 rounded bg-stone-800 border border-yellow-800/40 text-gray-400"
              title={`Composante matérielle : ${sort.composantes_materiel}`}
            >
              M
            </span>
          )}
          {sort.concentration && (
            <span
              className="text-[9px] px-1 py-0.5 rounded text-yellow-300 border"
              style={{
                background: 'rgba(201,168,76,0.1)',
                borderColor: 'rgba(201,168,76,0.4)'
              }}
              title="Concentration"
            >
              ◉
            </span>
          )}
          {sort.rituel && (
            <span
              className="text-[9px] px-1 py-0.5 rounded text-yellow-300 border"
              style={{
                background: 'rgba(201,168,76,0.1)',
                borderColor: 'rgba(201,168,76,0.4)'
              }}
              title="Rituel"
            >
              ✦
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 ml-auto">
          {cantrip ? 'Tour' : `Niv. ${sort.niveau}`}
          {sort.ecole ? ` · ${sort.ecole}` : ''}
        </span>
      </div>

      {sort.description && (
        <p className="text-gray-400 text-xs italic mt-1">{sort.description}</p>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <button
          type="button"
          onClick={onCast}
          disabled={utilise}
          className="px-2.5 py-1 text-[11px] uppercase tracking-wider rounded font-bold border transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(201,168,76,0.15)',
            borderColor: 'rgba(201,168,76,0.5)',
            color: '#C9A84C'
          }}
        >
          🪄 Lancer
        </button>
        {!cantrip && isOwner && onTogglePrepare && (
          <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={sort.prepare}
              onChange={onTogglePrepare}
              className="accent-yellow-500"
            />
            Préparé
          </label>
        )}
        {!cantrip && isOwner && onToggleDispo && (
          <button
            type="button"
            onClick={onToggleDispo}
            className="px-2 py-1 text-[10px] uppercase tracking-wider rounded border border-gray-700 bg-stone-800 hover:bg-stone-700 text-gray-300"
          >
            {sort.disponible ? 'Marquer utilisé' : 'Restaurer'}
          </button>
        )}
        {isOwner && (
          <button
            type="button"
            onClick={onRetirer}
            className="px-2 py-1 text-[10px] uppercase tracking-wider rounded border border-red-900 bg-red-950/40 text-red-300 hover:bg-red-900/40 ml-auto"
          >
            Retirer
          </button>
        )}
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-stone-800/70 border-2 border-yellow-700/60 rounded-lg p-4 shadow-lg">
      <h2 className="text-sm uppercase tracking-widest text-yellow-500 font-bold mb-3 border-b border-yellow-800/50 pb-1">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Champ({
  label,
  value,
  children
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs uppercase text-yellow-600 tracking-widest">{label}</p>
      {children ?? (
        <p className="text-yellow-100 font-serif text-base">{value}</p>
      )}
    </div>
  )
}

function Stat({
  label,
  children,
  box
}: {
  label: string
  children: React.ReactNode
  box?: boolean
}) {
  return (
    <div
      className={
        box
          ? 'bg-stone-900/80 border-2 border-yellow-800/50 rounded p-3'
          : 'bg-stone-900/60 border border-yellow-800/40 rounded p-3'
      }
    >
      <p className="text-xs uppercase text-yellow-600 tracking-widest text-center">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  )
}
