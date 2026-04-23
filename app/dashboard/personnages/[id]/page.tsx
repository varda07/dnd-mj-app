'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { CONDITIONS_MAP, isConditionKey, type ConditionKey } from '@/app/data/conditions'

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
}

type Sort = {
  id: string
  nom: string
  niveau: number
  ecole: string | null
  description: string | null
  disponible: boolean
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
  'autres_maitrises'
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
    : []
})

export default function FichePersonnage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [perso, setPerso] = useState<Personnage | null>(null)
  const [sorts, setSorts] = useState<Sort[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
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
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase
          .from('personnages')
          .select('*')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('sorts')
          .select('id, nom, niveau, ecole, description, disponible')
          .eq('personnage_id', id)
          .order('niveau')
          .order('nom')
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
      setSorts(s ?? [])
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
            onClick={() => router.push('/dashboard')}
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
  const sortsAttaque = sorts.filter((s) => s.niveau === 0)
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
            onClick={() => router.push('/dashboard')}
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

            {sortsConnus.length > 0 && (
              <Panel title="Sorts connus">
                <div className="space-y-2">
                  {sortsConnus.map((s) => (
                    <div
                      key={s.id}
                      className={`bg-stone-900/60 border border-yellow-800/30 rounded p-2 ${
                        !s.disponible ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-100 font-bold">{s.nom}</span>
                        <span className="text-xs text-gray-500">
                          Niv. {s.niveau}
                          {s.ecole ? ` · ${s.ecole}` : ''}
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-gray-400 text-xs italic mt-1">{s.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            )}

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

      {rollMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-800 border-2 border-yellow-600 rounded-lg p-4 shadow-2xl animate-pulse">
          <p className="text-yellow-100 font-bold">{rollMessage}</p>
        </div>
      )}
    </main>
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
