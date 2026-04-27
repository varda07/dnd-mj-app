'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import ImageCropper from '@/app/components/ImageCropper'
import {
  construireEnveloppe,
  lireFichierJSON,
  nettoyer,
  ouvrirSelecteurFichier,
  slugFichier,
  telechargerJSON,
  validerEnveloppe
} from '@/app/lib/import-export'
import {
  RACES,
  CLASSES,
  HISTORIQUES,
  COMPETENCES,
  ALIGNEMENTS,
  NOMS_PAR_RACE,
  STAT_KEYS,
  STAT_LABELS,
  STAT_COURT,
  type StatKey,
  modificateur,
  bonusMaitrise,
  findRace,
  findClasse,
  findHistorique,
  pickRandom,
  distribuerStandardArray,
  appliquerBonusRace
} from '@/app/data/dnd5e'

type Personnage = {
  id: string
  nom: string
  race: string
  classe: string
  niveau: number
  hp_max: number
  hp_actuel: number
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
  de_vie: string
  image_url: string
  scenario_id: string | null
  public: boolean
  nb_copies: number
  auteur_username: string | null
}

type ScenarioOption = { id: string; nom: string }

// Un jet de 4d6 : les 4 dés triés décroissants, le total des 3 plus grands,
// et l'éventuelle caractéristique à laquelle il est assigné.
type Roll4d6 = { detail: number[]; total: number; assigned: StatKey | null }

const rollerUn4d6 = (): Roll4d6 => {
  const dices = [0, 0, 0, 0].map(() => Math.floor(Math.random() * 6) + 1)
  const sortedDesc = [...dices].sort((a, b) => b - a)
  const total = sortedDesc[0] + sortedDesc[1] + sortedDesc[2]
  return { detail: sortedDesc, total, assigned: null }
}

const RACE_NOMS = RACES.map((r) => r.nom)
const CLASSE_NOMS = CLASSES.map((c) => c.nom)
const HISTORIQUE_NOMS = HISTORIQUES.map((h) => h.nom)

// Petit bouton "?" + tooltip. Cliquable pour afficher/masquer l'aide.
function Help({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex align-middle ml-1">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          setOpen((v) => !v)
        }}
        className="w-4 h-4 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-yellow-500 text-[10px] font-bold inline-flex items-center justify-center leading-none"
        aria-label="Aide"
        title={text}
      >
        ?
      </button>
      {open && (
        <span
          className="absolute z-30 top-5 left-1/2 -translate-x-1/2 w-56 p-2 rounded bg-gray-900 border border-yellow-600/50 text-[11px] text-gray-200 shadow-xl"
          style={{ letterSpacing: 'normal', textTransform: 'none', fontWeight: 400 }}
          onClick={(e) => e.stopPropagation()}
        >
          {text}
        </span>
      )}
    </span>
  )
}

export default function Personnages() {
  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const [nom, setNom] = useState('')
  const [race, setRace] = useState(RACE_NOMS[0])
  const [classe, setClasse] = useState(CLASSE_NOMS[0])
  const [historique, setHistorique] = useState(HISTORIQUE_NOMS[0])
  const [alignement, setAlignement] = useState(ALIGNEMENTS[4]) // Neutre
  const [niveau, setNiveau] = useState('1')
  const [hpMax, setHpMax] = useState('10')
  const [hpActuel, setHpActuel] = useState('10')
  const [force, setForce] = useState('8')
  const [dexterite, setDexterite] = useState('8')
  const [constitution, setConstitution] = useState('8')
  const [intelligence, setIntelligence] = useState('8')
  const [sagesse, setSagesse] = useState('8')
  const [charisme, setCharisme] = useState('8')
  const [savesCochees, setSavesCochees] = useState<Set<StatKey>>(new Set())
  const [competencesCochees, setCompetencesCochees] = useState<Set<string>>(new Set())
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageActuelle, setImageActuelle] = useState('')
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([])
  const [scenarioId, setScenarioId] = useState('')
  const [cropperKey, setCropperKey] = useState(0)
  const [codesVisibles, setCodesVisibles] = useState<Record<string, string>>({})
  const [aideOuverte, setAideOuverte] = useState(false)
  const [fichePanelOuvert, setFichePanelOuvert] = useState(true)
  const [methodeStats, setMethodeStats] = useState<'27pts' | '4d6'>('4d6')
  const [rolled4d6, setRolled4d6] = useState<Roll4d6[]>([])
  const [selectedRollIdx, setSelectedRollIdx] = useState<number | null>(null)
  const [dragInfo, setDragInfo] = useState<{
    rollIdx: number
    x: number
    y: number
    overStat: StatKey | null
  } | null>(null)
  const dragStartRef = useRef<{ pointerId: number; el: HTMLElement } | null>(null)
  const [sortsTemplates, setSortsTemplates] = useState<
    { id: string; nom: string; niveau: number; ecole: string | null }[]
  >([])
  const [sortsInitiauxIds, setSortsInitiauxIds] = useState<Set<string>>(new Set())
  const [sortsPanelOuvert, setSortsPanelOuvert] = useState(false)
  const t = useTranslations('characters')
  const tc = useTranslations('common')

  const classeObj = findClasse(classe)
  const raceObj = findRace(race)
  const histObj = findHistorique(historique)
  const deVie = classeObj?.deVie ?? 'd8'
  const niveauNum = parseInt(niveau) || 1
  const conNum = parseInt(constitution) || 10
  const bonusMaitriseNum = bonusMaitrise(niveauNum)

  useEffect(() => {
    fetchPersonnages()
    fetchScenarios()
    fetchSortsTemplates()
  }, [])

  const fetchSortsTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('sorts')
      .select('id, nom, niveau, ecole')
      .eq('user_id', user.id)
      .order('niveau')
      .order('nom')
    if (data) setSortsTemplates(data)
  }

  const toggleSortInitial = (id: string) => {
    setSortsInitiauxIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const fetchScenarios = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('scenarios')
      .select('id, nom')
      .eq('mj_id', user.id)
      .order('nom')
    if (data) setScenarios(data)
  }

  const genererCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let suffix = ''
    for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
    return `DND-${suffix}`
  }

  const partagerPersonnage = async (personnageId: string) => {
    const { data: existing } = await supabase
      .from('codes_invitation')
      .select('code')
      .eq('personnage_id', personnageId)
      .eq('utilise', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.code) {
      setCodesVisibles((prev) => ({ ...prev, [personnageId]: existing.code }))
      return
    }

    for (let i = 0; i < 5; i++) {
      const code = genererCode()
      const { error } = await supabase
        .from('codes_invitation')
        .insert({ code, personnage_id: personnageId })
      if (!error) {
        setCodesVisibles((prev) => ({ ...prev, [personnageId]: code }))
        return
      }
    }
    setMessage("Impossible de générer un code unique, réessaie.")
  }

  const cacherCode = (personnageId: string) => {
    setCodesVisibles((prev) => {
      const next = { ...prev }
      delete next[personnageId]
      return next
    })
  }

  const resetForm = () => {
    setNom('')
    setRace(RACE_NOMS[0])
    setClasse(CLASSE_NOMS[0])
    setHistorique(HISTORIQUE_NOMS[0])
    setAlignement(ALIGNEMENTS[4])
    setNiveau('1')
    setHpMax('10')
    setHpActuel('10')
    setForce('8')
    setDexterite('8')
    setConstitution('8')
    setIntelligence('8')
    setSagesse('8')
    setCharisme('8')
    setSavesCochees(new Set())
    setCompetencesCochees(new Set())
    setRolled4d6([])
    setSelectedRollIdx(null)
    setFile(null)
    setEditingId(null)
    setImageActuelle('')
    setScenarioId('')
    setCropperKey((k) => k + 1)
    setSortsInitiauxIds(new Set())
    setSortsPanelOuvert(false)
  }

  const commencerEdition = (perso: Personnage) => {
    setEditingId(perso.id)
    setNom(perso.nom)
    setRace(RACE_NOMS.includes(perso.race) ? perso.race : RACE_NOMS[0])
    setClasse(CLASSE_NOMS.includes(perso.classe) ? perso.classe : CLASSE_NOMS[0])
    // Historique / alignement / saves / compétences ne sont pas persistés :
    // on laisse les valeurs courantes du formulaire (le joueur peut les
    // ré-ajuster s'il le souhaite).
    setNiveau(String(perso.niveau))
    setHpMax(String(perso.hp_max))
    setHpActuel(String(perso.hp_actuel))
    setForce(String(perso.force))
    setDexterite(String(perso.dexterite))
    setConstitution(String(perso.constitution))
    setIntelligence(String(perso.intelligence))
    setSagesse(String(perso.sagesse))
    setCharisme(String(perso.charisme))
    setFile(null)
    setImageActuelle(perso.image_url ?? '')
    setScenarioId(perso.scenario_id ?? '')
    setCropperKey((k) => k + 1)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchPersonnages = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('personnages')
      .select('*')
      .eq('joueur_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setPersonnages(data)
  }

  const changerRace = (nouvelle: string) => {
    setRace(nouvelle)
    if (methodeStats === '4d6') {
      // En 4d6, les bonus raciaux NE S'APPLIQUENT PAS aux stats : les jets restent bruts.
      return
    }
    const r = findRace(nouvelle)
    if (!r) return
    // Méthode 27 points : stats de base = 8 + bonus racial
    setForce(String(8 + (r.bonusStats.for ?? 0)))
    setDexterite(String(8 + (r.bonusStats.dex ?? 0)))
    setConstitution(String(8 + (r.bonusStats.con ?? 0)))
    setIntelligence(String(8 + (r.bonusStats.int ?? 0)))
    setSagesse(String(8 + (r.bonusStats.sag ?? 0)))
    setCharisme(String(8 + (r.bonusStats.cha ?? 0)))
  }

  const changerClasse = (nouvelle: string) => {
    setClasse(nouvelle)
    const c = findClasse(nouvelle)
    if (!c) return
    const conMod = modificateur(parseInt(constitution) || 10)
    const hp = c.hpNiveau1Base + conMod
    setHpMax(String(hp))
    setHpActuel(String(hp))
    setSavesCochees(new Set(c.jetsSauvegarde))
  }

  const changerHistorique = (nouveau: string) => {
    setHistorique(nouveau)
    const h = findHistorique(nouveau)
    if (!h) return
    setCompetencesCochees(new Set(h.competences))
  }

  const toggleSave = (k: StatKey) => {
    setSavesCochees((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const toggleCompetence = (nom: string) => {
    setCompetencesCochees((prev) => {
      const next = new Set(prev)
      if (next.has(nom)) next.delete(nom)
      else next.add(nom)
      return next
    })
  }

  const changerMethodeStats = (nouvelle: '27pts' | '4d6') => {
    if (nouvelle === methodeStats) return
    setMethodeStats(nouvelle)
    setRolled4d6([])
    setSelectedRollIdx(null)
    if (nouvelle === '27pts') {
      // Méthode 27 points : stats = 8 + bonus racial
      const r = findRace(race)
      const bonus = (k: StatKey) => 8 + (r?.bonusStats[k] ?? 0)
      setForce(String(bonus('for')))
      setDexterite(String(bonus('dex')))
      setConstitution(String(bonus('con')))
      setIntelligence(String(bonus('int')))
      setSagesse(String(bonus('sag')))
      setCharisme(String(bonus('cha')))
    } else {
      // Méthode 4d6 : stats brutes = 8 (en attente des jets)
      setForce('8')
      setDexterite('8')
      setConstitution('8')
      setIntelligence('8')
      setSagesse('8')
      setCharisme('8')
    }
  }

  const lancerLes6Dices = () => {
    setRolled4d6(Array.from({ length: 6 }, rollerUn4d6))
    setSelectedRollIdx(null)
    // Reset toutes les stats à 8 (valeurs brutes, sans bonus racial en mode 4d6)
    setForce('8')
    setDexterite('8')
    setConstitution('8')
    setIntelligence('8')
    setSagesse('8')
    setCharisme('8')
  }

  const assignerRollA = (stat: StatKey) => {
    if (selectedRollIdx === null) return
    const roll = rolled4d6[selectedRollIdx]
    if (!roll) return

    // Si une autre stat avait déjà ce roll, la désassigne.
    // Si la stat cible avait déjà un roll, celui-ci redevient libre.
    const next = rolled4d6.map((x, i) => {
      if (i === selectedRollIdx) return { ...x, assigned: stat }
      if (x.assigned === stat) {
        // Ce roll se libère → la stat précédemment assignée retombe à 8
        return { ...x, assigned: null }
      }
      return x
    })
    setRolled4d6(next)
    // Applique la valeur BRUTE du jet à la stat cible (pas de bonus racial)
    statSetter[stat](String(roll.total))
    // La stat source (celle qui avait ce roll avant) redevient 8
    const ancienneAssignation = rolled4d6[selectedRollIdx].assigned
    if (ancienneAssignation && ancienneAssignation !== stat) {
      statSetter[ancienneAssignation]('8')
    }
    setSelectedRollIdx(null)
  }

  // Assignation directe d'un jet à une stat (utilisée par le drag & drop).
  // Contrairement à assignerRollA, ne dépend pas de selectedRollIdx.
  const assignerRollDirect = (rollIdx: number, stat: StatKey) => {
    const roll = rolled4d6[rollIdx]
    if (!roll) return
    const ancienneAssignation = roll.assigned
    const next = rolled4d6.map((x, i) => {
      if (i === rollIdx) return { ...x, assigned: stat }
      if (x.assigned === stat) return { ...x, assigned: null }
      return x
    })
    setRolled4d6(next)
    statSetter[stat](String(roll.total))
    if (ancienneAssignation && ancienneAssignation !== stat) {
      statSetter[ancienneAssignation]('8')
    }
    setSelectedRollIdx(null)
  }

  // Libère la stat : le jet qui y était assigné retourne dans le pool, la stat revient à 8.
  const libererStat = (stat: StatKey) => {
    setRolled4d6((prev) => prev.map((r) => (r.assigned === stat ? { ...r, assigned: null } : r)))
    statSetter[stat]('8')
  }

  const reinitialiserAssignations = () => {
    setRolled4d6((prev) => prev.map((r) => ({ ...r, assigned: null })))
    setSelectedRollIdx(null)
    setForce('8'); setDexterite('8'); setConstitution('8')
    setIntelligence('8'); setSagesse('8'); setCharisme('8')
  }

  // --- Drag & drop via pointer events (PC + mobile) ---
  const onRollPointerDown = (rollIdx: number) => (e: ReactPointerEvent<HTMLElement>) => {
    if (rolled4d6[rollIdx]?.assigned) return
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    dragStartRef.current = { pointerId: e.pointerId, el }
    setSelectedRollIdx(rollIdx)
    setDragInfo({ rollIdx, x: e.clientX, y: e.clientY, overStat: null })
  }

  const onRollPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (!dragInfo) return
    // Masque temporairement le ghost pour que elementFromPoint trouve la slot sous le doigt
    const target = document.elementFromPoint(e.clientX, e.clientY)
    const slotEl = (target as HTMLElement | null)?.closest('[data-stat-slot]') as HTMLElement | null
    const stat = (slotEl?.getAttribute('data-stat-slot') as StatKey | null) ?? null
    setDragInfo({ ...dragInfo, x: e.clientX, y: e.clientY, overStat: stat })
  }

  const onRollPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    if (!dragInfo) {
      dragStartRef.current = null
      return
    }
    const info = dragInfo
    setDragInfo(null)
    try {
      dragStartRef.current?.el.releasePointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
    dragStartRef.current = null
    if (info.overStat) {
      assignerRollDirect(info.rollIdx, info.overStat)
    }
  }

  const genererAleatoire = () => {
    const r = pickRandom(RACES)
    const c = pickRandom(CLASSES)
    const h = pickRandom(HISTORIQUES)
    const align = pickRandom(ALIGNEMENTS)
    const noms = NOMS_PAR_RACE[r.nom] ?? NOMS_PAR_RACE.Humain
    const prenom = pickRandom(noms)

    let base: Record<StatKey, number>
    let nouveauxRolls: Roll4d6[] = []

    if (methodeStats === '4d6') {
      // 6 jets, assignés aléatoirement aux 6 stats
      const rolls = Array.from({ length: 6 }, rollerUn4d6)
      const cles: StatKey[] = [...STAT_KEYS]
      for (let i = cles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[cles[i], cles[j]] = [cles[j], cles[i]]
      }
      rolls.forEach((roll, i) => {
        roll.assigned = cles[i]
      })
      nouveauxRolls = rolls
      base = {
        for: rolls.find((x) => x.assigned === 'for')!.total,
        dex: rolls.find((x) => x.assigned === 'dex')!.total,
        con: rolls.find((x) => x.assigned === 'con')!.total,
        int: rolls.find((x) => x.assigned === 'int')!.total,
        sag: rolls.find((x) => x.assigned === 'sag')!.total,
        cha: rolls.find((x) => x.assigned === 'cha')!.total
      }
    } else {
      base = distribuerStandardArray()
    }

    // Bonus racial appliqué UNIQUEMENT en mode 27 points ; en mode 4d6 les stats restent brutes.
    const stats = methodeStats === '4d6' ? base : appliquerBonusRace(base, r)
    const conMod = modificateur(stats.con)
    const hp = c.hpNiveau1Base + conMod

    setNom(prenom)
    setRace(r.nom)
    setClasse(c.nom)
    setHistorique(h.nom)
    setAlignement(align)
    setNiveau('1')
    setHpMax(String(hp))
    setHpActuel(String(hp))
    setForce(String(stats.for))
    setDexterite(String(stats.dex))
    setConstitution(String(stats.con))
    setIntelligence(String(stats.int))
    setSagesse(String(stats.sag))
    setCharisme(String(stats.cha))
    setSavesCochees(new Set(c.jetsSauvegarde))
    setCompetencesCochees(new Set(h.competences))
    setRolled4d6(nouveauxRolls)
    setSelectedRollIdx(null)
    setMessage('🎲 Personnage aléatoire généré !')
  }

  const sauvegarderPersonnage = async () => {
    if (!nom) return setMessage(t('name_required'))
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let imageUrl = imageActuelle
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user?.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('personnage').upload(path, file)
      if (uploadError) {
        setMessage(uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('personnage').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }

    const payload = {
      nom,
      race,
      classe,
      scenario_id: scenarioId || null,
      niveau: parseInt(niveau),
      hp_max: parseInt(hpMax),
      hp_actuel: parseInt(hpActuel),
      force: parseInt(force),
      dexterite: parseInt(dexterite),
      constitution: parseInt(constitution),
      intelligence: parseInt(intelligence),
      sagesse: parseInt(sagesse),
      charisme: parseInt(charisme),
      de_vie: deVie,
      image_url: imageUrl
    }

    if (editingId) {
      const { error } = await supabase.from('personnages').update(payload).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage(t('modified'))
        resetForm()
        fetchPersonnages()
      }
    } else {
      const { data: nouveau, error } = await supabase
        .from('personnages')
        .insert({ ...payload, joueur_id: user?.id })
        .select('id')
        .single()
      if (error) {
        setMessage(error.message)
      } else {
        // Attribution des sorts sélectionnés dans le formulaire (optionnel).
        if (nouveau && sortsInitiauxIds.size > 0) {
          const rows = Array.from(sortsInitiauxIds).map((sid) => ({
            personnage_id: nouveau.id,
            sort_id: sid,
            disponible: true
          }))
          const { error: errJunction } = await supabase
            .from('personnage_sorts')
            .insert(rows)
          if (errJunction) {
            console.error('[perso create] attribuer sorts :', errJunction)
          }
        }
        setMessage(t('created'))
        resetForm()
        fetchPersonnages()
      }
    }
    setLoading(false)
  }

  const supprimerPersonnage = async (id: string) => {
    if (!window.confirm(tc('confirm_delete'))) return
    await supabase.from('personnages').delete().eq('id', id)
    fetchPersonnages()
  }

  const exporterPersonnage = (p: Personnage) => {
    const env = construireEnveloppe('personnage', nettoyer(p as unknown as Record<string, unknown>))
    telechargerJSON(`personnage-${slugFichier(p.nom)}.json`, env)
  }

  const importerPersonnage = () => {
    ouvrirSelecteurFichier(async (f) => {
      try {
        const raw = await lireFichierJSON(f)
        const env = validerEnveloppe<Record<string, unknown>>(raw, ['personnage'])
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const clean = nettoyer(env.data)
        const nom = typeof clean.nom === 'string' && clean.nom.trim() !== '' ? clean.nom : 'Personnage importé'
        const { error } = await supabase.from('personnages').insert({ ...clean, nom, joueur_id: user.id })
        if (error) throw error
        setMessage(tc('import_ok'))
        fetchPersonnages()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setMessage(tc('import_error', { message: msg }))
      }
    })
  }

  const togglerPublic = async (perso: Personnage) => {
    const rendrePublic = !perso.public
    let auteurUsername = perso.auteur_username ?? null
    if (rendrePublic && !auteurUsername) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle()
        auteurUsername = profile?.username ?? user.email ?? 'Anonyme'
      }
    }
    const { error } = await supabase
      .from('personnages')
      .update({ public: rendrePublic, auteur_username: auteurUsername })
      .eq('id', perso.id)
    if (error) setMessage(error.message)
    else fetchPersonnages()
  }

  // Lecture des stats courantes pour afficher les modificateurs
  const statsCourantes: Record<StatKey, number> = {
    for: parseInt(force) || 0,
    dex: parseInt(dexterite) || 0,
    con: parseInt(constitution) || 0,
    int: parseInt(intelligence) || 0,
    sag: parseInt(sagesse) || 0,
    cha: parseInt(charisme) || 0
  }

  const statSetter: Record<StatKey, (v: string) => void> = {
    for: setForce,
    dex: setDexterite,
    con: setConstitution,
    int: setIntelligence,
    sag: setSagesse,
    cha: setCharisme
  }

  const statValue: Record<StatKey, string> = {
    for: force,
    dex: dexterite,
    con: constitution,
    int: intelligence,
    sag: sagesse,
    cha: charisme
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      {/* Ghost flottant affiché pendant le drag d'un jet */}
      {dragInfo && rolled4d6[dragInfo.rollIdx] && (
        <div
          className="fixed pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragInfo.x, top: dragInfo.y }}
        >
          <div className="px-3 py-2 rounded bg-yellow-500 text-gray-900 font-bold shadow-2xl border-2 border-yellow-300 text-xl min-w-[60px] text-center">
            {rolled4d6[dragInfo.rollIdx].total}
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button type="button" onClick={() => window.location.href = '/dashboard'} className="text-gray-400 hover:text-white">
            {tc('back')}
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">{t('title')}</h1>
          <button
            type="button"
            onClick={() => setAideOuverte(true)}
            title="Aide : créer un personnage D&D 5e"
            className="ml-auto w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-yellow-500 border border-gray-700 font-bold text-sm flex items-center justify-center transition"
          >
            ?
          </button>
        </div>

        <div className="bg-gray-800 p-5 md:p-6 rounded-lg mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h2 className="text-lg font-bold text-yellow-500">
              {editingId ? t('edit_title') : t('create_title')}
            </h2>
            {!editingId && (
              <button
                type="button"
                onClick={genererAleatoire}
                className="px-3 py-2 text-xs font-bold rounded border border-yellow-600 text-yellow-500 bg-gray-900/50 hover:bg-gray-700 tracking-wider uppercase"
              >
                {t('random_gen')}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {/* Sélecteur discret de la méthode de génération des stats */}
            <div className="flex items-center gap-2 text-[11px] flex-wrap">
              <span className="uppercase tracking-[0.18em] text-gray-500">Méthode stats :</span>
              <div className="inline-flex bg-gray-900/60 rounded border border-gray-700 p-0.5">
                <button
                  type="button"
                  onClick={() => changerMethodeStats('27pts')}
                  className={`px-2.5 py-0.5 rounded text-[11px] transition ${
                    methodeStats === '27pts'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  27 points
                </button>
                <button
                  type="button"
                  onClick={() => changerMethodeStats('4d6')}
                  className={`px-2.5 py-0.5 rounded text-[11px] transition ${
                    methodeStats === '4d6'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  4d6 drop lowest
                </button>
              </div>
              <Help text="27 points : stats commencent à 8, tu dépenses 27 points pour les monter. 4d6 : tu lances 4d6 six fois en retirant le plus petit dé, puis assignes les résultats aux caractéristiques." />
            </div>

            <div>
              <label className="text-gray-400 text-sm flex items-center">
                Nom du personnage *
              </label>
              <input type="text" placeholder="Ex : Alwin" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm flex items-center">
                  Race
                  <Help text={methodeStats === '4d6' ? "Sélectionne une race. En méthode 4d6, les bonus raciaux ne sont pas appliqués aux stats — les jets restent bruts." : "Sélectionne une race : les bonus de caractéristiques s'appliqueront automatiquement (base 8 + bonus)."} />
                </label>
                <select value={race} onChange={(e) => changerRace(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                  {RACES.map((r) => (
                    <option key={r.nom} value={r.nom}>
                      {methodeStats === '4d6'
                        ? r.nom
                        : `${r.nom} — ${Object.entries(r.bonusStats).map(([k, v]) => `+${v} ${STAT_COURT[k as StatKey]}`).join(', ')}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm flex items-center">
                  Classe
                  <span className="text-yellow-500 font-bold ml-2">🎲 {deVie}</span>
                  <Help text={`Classe ${classeObj?.nom ?? ''} : HP niveau 1 = ${classeObj?.hpNiveau1Base ?? '?'} + mod Con. Les jets de sauvegarde maîtrisés sont pré-cochés ci-dessous.`} />
                </label>
                <select value={classe} onChange={(e) => changerClasse(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                  {CLASSES.map((c) => (
                    <option key={c.nom} value={c.nom}>
                      {c.nom} ({c.deVie}) — {c.caracteristiquesPrincipales.map((s) => STAT_COURT[s]).join('/')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm flex items-center">
                  Historique
                  <Help text="L'historique accorde 2 maîtrises de compétences (pré-cochées ci-dessous)." />
                </label>
                <select value={historique} onChange={(e) => changerHistorique(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                  {HISTORIQUES.map((h) => (
                    <option key={h.nom} value={h.nom}>
                      {h.nom} — {h.competences.join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Alignement</label>
                <select value={alignement} onChange={(e) => setAlignement(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                  {ALIGNEMENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm">Scénario</label>
              <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                <option value="">Aucun scénario</option>
                {scenarios.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-gray-400 text-sm flex items-center">
                  Niveau
                  <Help text={`Bonus de maîtrise au niveau ${niveauNum} : +${bonusMaitriseNum}. Ce bonus s'ajoute aux jets et compétences maîtrisés.`} />
                </label>
                <input type="number" min="1" max="20" value={niveau} onChange={(e) => setNiveau(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm flex items-center">
                  PV max
                  <Help text="PV niveau 1 = valeur max du dé de vie + mod Constitution. Ex : Guerrier (d10) + Con 14 (+2) = 12 PV." />
                </label>
                <input type="number" value={hpMax} onChange={(e) => setHpMax(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">PV actuels</label>
                <input type="number" value={hpActuel} onChange={(e) => setHpActuel(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-gray-400 text-sm font-bold flex items-center">
                Caractéristiques
                <Help text="Modificateur = (stat − 10) ÷ 2 arrondi vers le bas. Ex : stat 14 → +2, stat 8 → −1." />
              </p>
              <span className="text-[11px] text-gray-500">
                Maîtrise niv. {niveauNum} : <span className="text-yellow-500 font-bold">+{bonusMaitriseNum}</span>
              </span>
            </div>

            {methodeStats === '4d6' ? (
              <div className="space-y-3">
                {/* Pool de jets disponibles */}
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                      Jets disponibles ({rolled4d6.filter((r) => !r.assigned).length}/6)
                    </span>
                    <div className="flex gap-2">
                      {rolled4d6.some((r) => r.assigned) && (
                        <button
                          type="button"
                          onClick={reinitialiserAssignations}
                          className="px-3 py-1.5 text-[11px] font-bold rounded border border-gray-600 text-gray-300 hover:bg-gray-700 tracking-wider uppercase"
                        >
                          ↺ Réinitialiser
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={lancerLes6Dices}
                        className="px-3 py-1.5 text-[11px] font-bold rounded bg-yellow-500 text-gray-900 hover:bg-yellow-400 tracking-wider uppercase"
                      >
                        🎲 {rolled4d6.length === 0 ? 'Lancer les dés' : 'Relancer'}
                      </button>
                    </div>
                  </div>

                  {rolled4d6.length === 0 ? (
                    <p className="text-[11px] text-gray-500 italic">
                      Clique sur « Lancer les dés » pour obtenir 6 valeurs. Glisse-les ensuite sur les caractéristiques, ou sélectionne-les d&apos;un clic puis clique sur une caractéristique.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 min-h-[60px] items-center">
                      {rolled4d6.every((r) => r.assigned) && (
                        <p className="text-[11px] text-green-400 italic">
                          ✓ Toutes les valeurs sont assignées.
                        </p>
                      )}
                      {rolled4d6.map((roll, i) => {
                        if (roll.assigned) return null
                        const selected = selectedRollIdx === i
                        const retire = roll.detail[3]
                        const isDragging = dragInfo?.rollIdx === i
                        return (
                          <button
                            key={i}
                            type="button"
                            onPointerDown={onRollPointerDown(i)}
                            onPointerMove={onRollPointerMove}
                            onPointerUp={onRollPointerUp}
                            onPointerCancel={onRollPointerUp}
                            onClick={() => setSelectedRollIdx(selected ? null : i)}
                            title={`4d6 = ${roll.detail.join(', ')} → total ${roll.total} (retiré : ${retire})`}
                            className={`min-w-[64px] p-2 rounded border text-center font-bold transition select-none ${
                              isDragging
                                ? 'opacity-30 border-yellow-500'
                                : selected
                                ? 'bg-yellow-500 text-gray-900 border-yellow-500 scale-[1.03] shadow-lg shadow-yellow-500/30'
                                : 'bg-gray-800 text-yellow-400 border-yellow-600/40 hover:bg-gray-700 cursor-grab active:cursor-grabbing'
                            }`}
                            style={{ touchAction: 'none' }}
                          >
                            <div className="text-xl leading-none">{roll.total}</div>
                            <div className="text-[9px] mt-1 uppercase tracking-wider text-gray-400">
                              {roll.detail.slice(0, 3).join('+')}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Slots d'assignation des caractéristiques */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STAT_KEYS.map((k) => {
                    const v = statsCourantes[k]
                    const mod = modificateur(v)
                    const assignedRoll = rolled4d6.find((r) => r.assigned === k)
                    const rempli = !!assignedRoll
                    const survole = dragInfo?.overStat === k
                    const assignable = selectedRollIdx !== null && !rempli
                    const handleClick = () => {
                      if (rempli) {
                        libererStat(k)
                      } else if (selectedRollIdx !== null) {
                        assignerRollA(k)
                      }
                    }
                    return (
                      <button
                        key={k}
                        type="button"
                        data-stat-slot={k}
                        onClick={handleClick}
                        className={`relative rounded border-2 p-2 text-left transition ${
                          survole
                            ? 'border-yellow-400 bg-yellow-500/20'
                            : rempli
                            ? 'border-yellow-600/60 bg-gray-800'
                            : assignable
                            ? 'border-yellow-500/50 bg-gray-900 animate-pulse cursor-pointer'
                            : 'border-dashed border-gray-600 bg-gray-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-[0.15em] text-gray-400">
                            {STAT_COURT[k]}
                          </span>
                          {rempli && (
                            <span
                              className={`text-[11px] font-bold px-1.5 rounded ${
                                mod >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}
                            >
                              {mod >= 0 ? `+${mod}` : mod}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span
                            className={`text-2xl font-bold ${
                              rempli ? 'text-yellow-400' : 'text-gray-600'
                            }`}
                          >
                            {rempli ? v : '—'}
                          </span>
                          {rempli && (
                            <span className="text-[10px] text-gray-500 group-hover:text-red-400">
                              ✕
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                          {STAT_LABELS[k]}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STAT_KEYS.map((k) => {
                  const v = statsCourantes[k]
                  const mod = modificateur(v)
                  return (
                    <div key={k}>
                      <label className="text-gray-400 text-sm flex items-center justify-between">
                        <span>{STAT_LABELS[k]}</span>
                        <span
                          className={`text-[11px] font-bold px-1.5 rounded ${
                            mod >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {mod >= 0 ? `+${mod}` : mod}
                        </span>
                      </label>
                      <input
                        type="number"
                        value={statValue[k]}
                        onChange={(e) => statSetter[k](e.target.value)}
                        className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Panneau "Fiche auto" — informationnel, récapitulatif */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setFichePanelOuvert((v) => !v)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800/60 transition text-left"
              >
                <span className="text-sm font-bold text-yellow-500">
                  📋 Fiche auto-remplie
                </span>
                <span className="text-yellow-500 text-sm">
                  {fichePanelOuvert ? '▾' : '▸'}
                </span>
              </button>

              {fichePanelOuvert && (
                <div className="border-t border-gray-700 p-4 space-y-4">
                  {/* Race */}
                  {raceObj && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 mb-1">
                        Traits raciaux — {raceObj.nom}
                      </p>
                      <div className="text-xs text-gray-300 space-y-1">
                        <p>
                          <span className="text-gray-500">Vitesse :</span> {raceObj.vitesse} m &nbsp;·&nbsp;
                          <span className="text-gray-500">Langues :</span> {raceObj.langues.join(', ')}
                        </p>
                        {raceObj.sousRaces && raceObj.sousRaces.length > 0 && (
                          <p>
                            <span className="text-gray-500">Sous-races :</span>{' '}
                            {raceObj.sousRaces.join(' · ')}
                          </p>
                        )}
                        <ul className="list-disc list-inside text-gray-400 mt-1 space-y-0.5">
                          {raceObj.traits.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Sauvegardes maîtrisées */}
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 mb-2">
                      Jets de sauvegarde maîtrisés
                      <Help text="Deux stats maîtrisées pour les sauvegardes, déterminées par la classe. Les cases pré-cochées viennent de ta classe." />
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {STAT_KEYS.map((k) => {
                        const coche = savesCochees.has(k)
                        const mod = modificateur(statsCourantes[k])
                        const total = coche ? mod + bonusMaitriseNum : mod
                        return (
                          <label
                            key={k}
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-xs ${
                              coche
                                ? 'bg-yellow-500/10 border-yellow-600/60 text-yellow-200'
                                : 'bg-gray-800 border-gray-700 text-gray-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={coche}
                              onChange={() => toggleSave(k)}
                              className="w-3.5 h-3.5 accent-yellow-500"
                            />
                            <span className="flex-1">{STAT_COURT[k]}</span>
                            <span className="font-mono">
                              {total >= 0 ? `+${total}` : total}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Compétences maîtrisées */}
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 mb-2">
                      Compétences maîtrisées
                      <Help text={`Les 2 compétences d'historique (${histObj?.competences.join(', ') ?? '—'}) sont pré-cochées. Ta classe peut en ajouter d'autres.`} />
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                      {COMPETENCES.map((comp) => {
                        const coche = competencesCochees.has(comp.nom)
                        const mod = modificateur(statsCourantes[comp.stat])
                        const total = coche ? mod + bonusMaitriseNum : mod
                        return (
                          <label
                            key={comp.nom}
                            className={`flex items-center gap-2 px-2 py-1 rounded border cursor-pointer text-[11px] ${
                              coche
                                ? 'bg-yellow-500/10 border-yellow-600/60 text-yellow-200'
                                : 'bg-gray-800 border-gray-700 text-gray-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={coche}
                              onChange={() => toggleCompetence(comp.nom)}
                              className="w-3 h-3 accent-yellow-500"
                            />
                            <span className="flex-1 truncate">{comp.nom}</span>
                            <span className="text-gray-500 font-mono uppercase">
                              {STAT_COURT[comp.stat]}
                            </span>
                            <span className="font-mono w-8 text-right">
                              {total >= 0 ? `+${total}` : total}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 italic">
                      Les compétences et jets de sauvegarde sont informatifs (non persistés).
                    </p>
                  </div>
                </div>
              )}
            </div>

            <ImageCropper
              key={cropperKey}
              inputId="perso-file"
              currentImageUrl={imageActuelle}
              onChange={setFile}
              aspect={1}
              label={editingId ? "Nouvelle image (laisser vide pour garder l'actuelle)" : 'Image du personnage'}
            />

            {/* Attribution optionnelle de sorts à la création — caché en édition
                (passer par la fiche pour gérer les sorts d'un perso existant). */}
            {!editingId && sortsTemplates.length > 0 && (
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSortsPanelOuvert((v) => !v)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-800/60 transition text-left"
                  aria-expanded={sortsPanelOuvert}
                >
                  <span className="text-sm font-bold text-yellow-500">
                    ✨ Sorts à attribuer ({sortsInitiauxIds.size}/{sortsTemplates.length})
                  </span>
                  <span className="text-yellow-500 text-sm">
                    {sortsPanelOuvert ? '▾' : '▸'}
                  </span>
                </button>
                {sortsPanelOuvert && (
                  <div className="border-t border-gray-700 p-3 space-y-1 max-h-60 overflow-y-auto">
                    <p className="text-[11px] text-gray-500 italic mb-2">
                      Optionnel — tu pourras toujours en ajouter depuis la fiche du personnage.
                    </p>
                    {sortsTemplates.map((tpl) => {
                      const checked = sortsInitiauxIds.has(tpl.id)
                      return (
                        <label
                          key={tpl.id}
                          className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs ${
                            checked
                              ? 'bg-yellow-500/10 border border-yellow-600/50'
                              : 'bg-gray-800 border border-gray-700 hover:bg-gray-700/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSortInitial(tpl.id)}
                            className="w-3.5 h-3.5 accent-yellow-500"
                          />
                          <span className="flex-1 truncate text-gray-200">{tpl.nom}</span>
                          <span className="text-[10px] text-gray-500">
                            {tpl.niveau === 0 ? 'Tour' : `Niv. ${tpl.niveau}`}
                            {tpl.ecole ? ` · ${tpl.ecole}` : ''}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {message && <p className="text-yellow-400 text-sm">{message}</p>}

            {methodeStats === '4d6' && !editingId && (rolled4d6.length === 0 || rolled4d6.some((r) => !r.assigned)) && (
              <p className="text-[11px] text-gray-400 italic text-center">
                {rolled4d6.length === 0
                  ? 'Lance les dés pour démarrer.'
                  : 'Assigne toutes tes caractéristiques pour continuer.'}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={sauvegarderPersonnage}
                disabled={
                  loading ||
                  (methodeStats === '4d6' &&
                    !editingId &&
                    (rolled4d6.length === 0 || rolled4d6.some((r) => !r.assigned)))
                }
                className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Chargement...' : editingId ? 'Modifier' : 'Créer'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="px-4 p-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600">
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-yellow-500">{t('my_characters')}</h2>
            <button
              type="button"
              onClick={importerPersonnage}
              className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"
            >
              {tc('import_json')}
            </button>
          </div>
          {personnages.length === 0 && <p className="text-gray-400">{t('empty')}</p>}
          {personnages.map((perso) => (
            <div key={perso.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex gap-3">
                {perso.image_url && (
                  <img
                    src={perso.image_url}
                    alt={perso.nom}
                    loading="lazy"
                    className="w-12 h-12 object-cover rounded-full bg-gray-900 flex-shrink-0 ring-2 ring-yellow-500"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white break-words">{perso.nom}</h3>
                  <p className="text-gray-400 text-xs break-words">
                    {perso.race} · {perso.classe} · Niv. {perso.niveau} · 🎲 {perso.de_vie}
                  </p>
                </div>
              </div>

              {codesVisibles[perso.id] && (
                <div className="mt-3 p-2 rounded bg-gray-900 border border-green-600/50 flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-gray-400 text-xs">{t('share_code_label')}</p>
                    <code className="text-green-300 font-mono font-bold text-lg break-all">{codesVisibles[perso.id]}</code>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(codesVisibles[perso.id])}
                      className="text-gray-400 hover:text-white text-xs"
                      title="Copier"
                    >
                      📋 Copier
                    </button>
                    <button
                      type="button"
                      onClick={() => cacherCode(perso.id)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm text-gray-400 mt-3">
                <span>❤️ PV: {perso.hp_actuel}/{perso.hp_max}</span>
                <span>💪 For: {perso.force}</span>
                <span>🏃 Dex: {perso.dexterite}</span>
                <span>🫀 Con: {perso.constitution}</span>
                <span>🧠 Int: {perso.intelligence}</span>
                <span>🙏 Sag: {perso.sagesse}</span>
                <span>✨ Cha: {perso.charisme}</span>
              </div>

              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-700 text-xs">
                <button type="button" onClick={() => window.location.href = `/dashboard/personnages/${perso.id}`} className="text-yellow-400">
                  {t('sheet')}
                </button>
                <button type="button" onClick={() => partagerPersonnage(perso.id)} className="text-green-400">
                  {t('share_player')}
                </button>
                <button
                  type="button"
                  onClick={() => togglerPublic(perso)}
                  className={perso.public ? 'text-green-400' : 'text-gray-400'}
                >
                  {perso.public ? `🌍 ${tc('public')} (${perso.nb_copies})` : `🔒 ${tc('private')}`}
                </button>
                <button type="button" onClick={() => commencerEdition(perso)} className="text-blue-400">
                  {tc('modify')}
                </button>
                <button
                  type="button"
                  onClick={() => exporterPersonnage(perso)}
                  className="text-gray-400 hover:text-white"
                  title={tc('export_item_title')}
                >
                  📥
                </button>
                <button type="button" onClick={() => supprimerPersonnage(perso.id)} className="text-red-400">
                  {tc('delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {aideOuverte && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setAideOuverte(false)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-yellow-500">
                📘 Créer un personnage D&amp;D 5e
              </h2>
              <button
                type="button"
                onClick={() => setAideOuverte(false)}
                className="w-8 h-8 rounded text-gray-400 hover:text-white hover:bg-gray-700 font-bold"
                title="Fermer"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-5 text-sm text-gray-300">
              <section>
                <h3 className="text-yellow-500 font-bold mb-2">1. Choisir une race</h3>
                <p>
                  La race donne le ton physique et culturel du personnage, ainsi que
                  des bonus aux caractéristiques. Quelques repères :
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                  <li><span className="text-white">Humain</span> — polyvalent, +1 à toutes les stats.</li>
                  <li><span className="text-white">Elfe</span> — agile et perceptif, +2 Dex.</li>
                  <li><span className="text-white">Nain</span> — résistant, +2 Con.</li>
                  <li><span className="text-white">Halfelin</span> — petit et chanceux, +2 Dex.</li>
                  <li><span className="text-white">Demi-elfe</span> — charismatique, +2 Cha.</li>
                  <li><span className="text-white">Demi-orc</span> — puissant, +2 For.</li>
                  <li><span className="text-white">Drakéide</span> — souffle élémentaire, +2 For / +1 Cha.</li>
                  <li><span className="text-white">Gnome</span> — malin, +2 Int.</li>
                  <li><span className="text-white">Tieffelin</span> — infernal, +2 Cha / +1 Int.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-yellow-500 font-bold mb-2">2. Choisir une classe</h3>
                <p>
                  La classe détermine ton rôle en combat, ton dé de vie (PV par niveau) et
                  les caractéristiques prioritaires.
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                  <li><span className="text-white">Barbare (d12)</span> — bourrin, For &amp; Con.</li>
                  <li><span className="text-white">Guerrier / Paladin / Rôdeur (d10)</span> — combat polyvalent, For ou Dex.</li>
                  <li><span className="text-white">Barde / Clerc / Druide / Moine / Roublard / Ensorceleur (d8)</span> — équilibré.</li>
                  <li><span className="text-white">Magicien / Sorcier (d6)</span> — fragile mais puissant, Int ou Cha.</li>
                </ul>
                <p className="mt-2 text-gray-400">
                  💡 Vérifie que la stat principale de ta classe correspond aux bonus
                  raciaux pour un personnage efficace.
                </p>
              </section>

              <section>
                <h3 className="text-yellow-500 font-bold mb-2">3. Répartir les caractéristiques</h3>
                <p className="mb-2">Deux méthodes standard :</p>

                <div className="bg-gray-900/50 border border-gray-700 rounded p-3 mb-3">
                  <p className="text-white font-bold mb-1">🎲 Jet de dés (4d6, on retire le plus bas)</p>
                  <p className="text-gray-400">
                    Lance 4d6, ignore le plus petit résultat, additionne les 3 restants.
                    Fais ça 6 fois puis attribue chaque total à une caractéristique. Plus
                    aléatoire et souvent plus généreux.
                  </p>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded p-3">
                  <p className="text-white font-bold mb-1">⚖️ Méthode des points (27 points)</p>
                  <p className="text-gray-400 mb-2">
                    Toutes les stats commencent à 8. Tu dépenses 27 points pour les
                    augmenter (max 15 avant bonus racial). Coûts :
                  </p>
                  <ul className="text-gray-400 text-xs grid grid-cols-2 gap-x-4">
                    <li>9 = 1 pt</li>
                    <li>10 = 2 pts</li>
                    <li>11 = 3 pts</li>
                    <li>12 = 4 pts</li>
                    <li>13 = 5 pts</li>
                    <li>14 = 7 pts</li>
                    <li>15 = 9 pts</li>
                  </ul>
                </div>

                <p className="mt-3 text-gray-400">
                  💡 Ou utilise le bouton « 🎲 Générateur aléatoire » qui distribue
                  l&apos;array standard 15/14/13/12/10/8 puis applique les bonus raciaux.
                  Le modificateur utilisé en jeu est
                  <span className="text-white"> (stat − 10) ÷ 2</span> arrondi vers le bas.
                </p>
              </section>

              <section>
                <h3 className="text-yellow-500 font-bold mb-2">4. Ce que représente chaque stat</h3>
                <ul className="space-y-2">
                  <li>
                    <span className="text-white font-bold">💪 Force</span> —
                    <span className="text-gray-400"> puissance physique brute. Attaques au corps à corps, soulever, pousser.</span>
                  </li>
                  <li>
                    <span className="text-white font-bold">🏃 Dextérité</span> —
                    <span className="text-gray-400"> agilité, réflexes, équilibre. CA, initiative, armes à distance et finesse.</span>
                  </li>
                  <li>
                    <span className="text-white font-bold">🫀 Constitution</span> —
                    <span className="text-gray-400"> endurance et santé. Ajoute des PV à chaque niveau, résistance aux poisons.</span>
                  </li>
                  <li>
                    <span className="text-white font-bold">🧠 Intelligence</span> —
                    <span className="text-gray-400"> savoir, logique, mémoire. Stat principale du magicien.</span>
                  </li>
                  <li>
                    <span className="text-white font-bold">🙏 Sagesse</span> —
                    <span className="text-gray-400"> perception et intuition. Stat principale du clerc, druide, rôdeur.</span>
                  </li>
                  <li>
                    <span className="text-white font-bold">✨ Charisme</span> —
                    <span className="text-gray-400"> force de personnalité et persuasion. Stat principale du barde, paladin, ensorceleur, sorcier.</span>
                  </li>
                </ul>
              </section>

              <section className="border-t border-gray-700 pt-4">
                <p className="text-gray-400 italic">
                  🎯 Points de vie de départ = max du dé de vie + modificateur de
                  Constitution. Exemple : un Guerrier (d10) avec Con 14 (+2) commence à
                  12 PV.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
