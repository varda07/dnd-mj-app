'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
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
  SORTS_DND5E,
  type ClasseSort,
  type ActionType
} from '@/app/data/sorts_dnd5e'
import StarFavori from '@/app/components/StarFavori'
import { useFavoris } from '@/app/lib/favoris'

type Sort = {
  id: string
  user_id: string | null
  personnage_id: string | null
  nom: string
  niveau: number
  ecole: string
  temps_incantation: string | null
  portee: string | null
  duree: string | null
  description: string
  composantes_verbal?: boolean | null
  composantes_somatique?: boolean | null
  composantes_materiel?: string | null
  concentration?: boolean | null
  rituel?: boolean | null
  classes_compatibles?: string[] | null
  action_type?: string | null
  public: boolean
  nb_copies: number
  auteur_username: string | null
}

const CLASSES_DISPO: ClasseSort[] = [
  'Magicien',
  'Ensorceleur',
  'Sorcier',
  'Clerc',
  'Druide',
  'Barde',
  'Paladin',
  'Rôdeur',
  'Artificier'
]

const ACTION_TYPES: { key: ActionType; label: string }[] = [
  { key: 'action', label: '1 action' },
  { key: 'bonus', label: '1 action bonus' },
  { key: 'reaction', label: '1 réaction' },
  { key: 'minute', label: '1 minute / +' },
  { key: 'rituel', label: 'Rituel' }
]

const ECOLES = [
  'Abjuration',
  'Invocation',
  'Divination',
  'Enchantement',
  'Évocation',
  'Illusion',
  'Nécromancie',
  'Transmutation'
]

const NIVEAUX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

type SpellCardProps = {
  nom: string
  niveau: number
  ecole: string
  temps_incantation: string | null
  portee: string | null
  duree: string | null
  description: string
  composantes_verbal?: boolean | null
  composantes_somatique?: boolean | null
  composantes_materiel?: string | null
  concentration?: boolean | null
  rituel?: boolean | null
  disponible?: boolean
  personnageNom?: string
  badge?: string
  prepare?: boolean
  cantrip?: boolean
}

export function SpellCard({
  nom,
  niveau,
  ecole,
  temps_incantation,
  portee,
  duree,
  description,
  composantes_verbal,
  composantes_somatique,
  composantes_materiel,
  concentration,
  rituel,
  disponible,
  personnageNom,
  badge,
  prepare,
  cantrip
}: SpellCardProps) {
  const ts = useTranslations('spells')
  return (
    <div
      className="relative rounded-xl overflow-hidden flex flex-col theme-no-deco"
      style={{
        background: 'linear-gradient(160deg, #1a1c24 0%, #14161c 55%, #0f1117 100%)',
        border: '1px solid rgba(201,168,76,0.35)',
        boxShadow: '0 0 0 1px rgba(201,168,76,0.06), 0 6px 20px rgba(0,0,0,0.45)',
        opacity: disponible ? 1 : 0.55
      }}
    >
      {/* Ornements aux coins */}
      <SpellOrnament position="tl" />
      <SpellOrnament position="tr" />
      <SpellOrnament position="bl" />
      <SpellOrnament position="br" />

      {/* En-tête : nom + cercle niveau */}
      <div className="relative px-4 pt-4 pb-2 pr-14">
        <h3
          className="text-[15px] font-medium tracking-wider truncate"
          style={{ color: '#C9A84C' }}
          title={nom || 'Sans nom'}
        >
          {nom || 'Sans nom'}
        </h3>
        <p className="text-[11px] italic mt-0.5" style={{ color: '#8a8a92' }}>
          {ecole || '—'}
        </p>
        <div
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #2a2c34, #0f1117)',
            border: '1px solid rgba(201,168,76,0.55)',
            color: '#C9A84C',
            boxShadow: 'inset 0 0 8px rgba(201,168,76,0.15)'
          }}
          title={niveau === 0 ? 'Tour de magie' : `Niveau ${niveau}`}
        >
          {niveau}
        </div>
      </div>

      {/* Séparateur or */}
      <div
        className="mx-4 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(201,168,76,0.45), transparent)'
        }}
      />

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center">
        <SpellStat label="Incantation" value={temps_incantation} />
        <SpellStat label="Portée" value={portee} />
        <SpellStat label="Durée" value={duree} />
      </div>

      {/* Chips composantes / concentration / rituel */}
      {(composantes_verbal ||
        composantes_somatique ||
        (composantes_materiel && composantes_materiel.length > 0) ||
        concentration ||
        rituel) && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {composantes_verbal && (
            <SpellChip label="V" tooltip="Composante verbale" />
          )}
          {composantes_somatique && (
            <SpellChip label="S" tooltip="Composante somatique" />
          )}
          {composantes_materiel && composantes_materiel.length > 0 && (
            <SpellChip
              label="M"
              tooltip={`Composante matérielle : ${composantes_materiel}`}
            />
          )}
          {concentration && (
            <SpellChip
              label="◉ Concentration"
              tooltip="Le sort nécessite la concentration."
              accent
            />
          )}
          {rituel && (
            <SpellChip
              label="✦ Rituel"
              tooltip="Peut être lancé en rituel (+10 min, sans emplacement)."
              accent
            />
          )}
        </div>
      )}

      {/* Séparateur or */}
      <div
        className="mx-4 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(201,168,76,0.25), transparent)'
        }}
      />

      {/* Description */}
      <div className="px-4 py-3 flex-1 min-h-[60px]">
        <p
          className="text-[12px] leading-relaxed whitespace-pre-wrap"
          style={{ color: '#cfcfd6' }}
        >
          {description || (
            <span style={{ color: '#5a5a62', fontStyle: 'italic' }}>
              Aucune description.
            </span>
          )}
        </p>
      </div>

      {/* Pied de carte : contexte (perso) + statut. Les deux sont optionnels —
          pour un modèle pur on n'affiche que le badge optionnel. */}
      {(personnageNom ||
        typeof disponible === 'boolean' ||
        badge ||
        cantrip ||
        typeof prepare === 'boolean') && (
        <div
          className="px-4 py-2 flex items-center justify-between gap-2 text-[11px] tracking-wider uppercase border-t flex-wrap"
          style={{
            borderColor: 'rgba(201,168,76,0.2)',
            background: 'rgba(0,0,0,0.25)'
          }}
        >
          <span style={{ color: '#6a6a72' }} className="truncate">
            {personnageNom ?? badge ?? ''}
          </span>
          <span className="flex items-center gap-2">
            {cantrip && (
              <span
                className="font-semibold"
                style={{ color: '#C9A84C' }}
                title="Tour de magie : toujours disponible, ne consomme pas d'emplacement."
              >
                ∞ Toujours dispo
              </span>
            )}
            {!cantrip && typeof prepare === 'boolean' && (
              <span
                className="font-semibold"
                style={{ color: prepare ? '#C9A84C' : '#5a5a62' }}
                title={prepare ? 'Sort préparé' : 'Sort non préparé'}
              >
                {prepare ? '◆ Préparé' : '◇ Non préparé'}
              </span>
            )}
            {typeof disponible === 'boolean' && (
              <span
                className="font-semibold"
                style={{ color: disponible ? '#10b981' : '#dc2626' }}
              >
                {disponible ? ts('available_short') : ts('used_short')}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

function SpellChip({
  label,
  tooltip,
  accent
}: {
  label: string
  tooltip?: string
  accent?: boolean
}) {
  return (
    <span
      title={tooltip}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.18em]"
      style={{
        background: accent ? 'rgba(201,168,76,0.12)' : 'rgba(0,0,0,0.4)',
        border: accent
          ? '1px solid rgba(201,168,76,0.45)'
          : '1px solid rgba(201,168,76,0.2)',
        color: accent ? '#C9A84C' : '#a8a8b0'
      }}
    >
      {label}
    </span>
  )
}

function SpellStat({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div
        className="text-[9px] uppercase tracking-[0.18em]"
        style={{ color: '#6a6a72' }}
      >
        {label}
      </div>
      <div
        className="text-[12px] mt-0.5 truncate"
        style={{ color: value ? '#e8e8ec' : '#4a4a52' }}
        title={value ?? '—'}
      >
        {value || '—'}
      </div>
    </div>
  )
}

function SpellOrnament({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const placement: Record<string, string> = {
    tl: 'top-1.5 left-1.5',
    tr: 'top-1.5 right-1.5 rotate-90',
    bl: 'bottom-1.5 left-1.5 -rotate-90',
    br: 'bottom-1.5 right-1.5 rotate-180'
  }
  return (
    <span
      className={`absolute ${placement[position]} w-4 h-4 pointer-events-none`}
      style={{
        background:
          'linear-gradient(#C9A84C,#C9A84C) 0 0 / 12px 1px no-repeat,' +
          'linear-gradient(#C9A84C,#C9A84C) 0 0 / 1px 12px no-repeat',
        opacity: 0.55
      }}
    />
  )
}

export default function Sorts() {
  const router = useRouter()
  const [sorts, setSorts] = useState<Sort[]>([])
  const [nom, setNom] = useState('')
  const [niveau, setNiveau] = useState('0')
  const [ecole, setEcole] = useState(ECOLES[0])
  const [tempsIncantation, setTempsIncantation] = useState('')
  const [portee, setPortee] = useState('')
  const [duree, setDuree] = useState('')
  const [description, setDescription] = useState('')
  const [actionType, setActionType] = useState<ActionType>('action')
  const [compVerbal, setCompVerbal] = useState(false)
  const [compSomatique, setCompSomatique] = useState(false)
  const [compMateriel, setCompMateriel] = useState('')
  const [concentration, setConcentration] = useState(false)
  const [rituel, setRituel] = useState(false)
  const [classesCompatibles, setClassesCompatibles] = useState<ClasseSort[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [importerOuvert, setImporterOuvert] = useState(false)
  const [favorisOnly, setFavorisOnly] = useState(false)
  const { est: estFavori } = useFavoris()
  const ts = useTranslations('spells')
  const tc = useTranslations('common')

  useEffect(() => {
    fetchSorts()
  }, [])

  const resetForm = () => {
    setNom('')
    setNiveau('0')
    setEcole(ECOLES[0])
    setTempsIncantation('')
    setPortee('')
    setDuree('')
    setDescription('')
    setActionType('action')
    setCompVerbal(false)
    setCompSomatique(false)
    setCompMateriel('')
    setConcentration(false)
    setRituel(false)
    setClassesCompatibles([])
    setEditingId(null)
  }

  const commencerEdition = (sort: Sort) => {
    setEditingId(sort.id)
    setNom(sort.nom)
    setNiveau(String(sort.niveau))
    setEcole(sort.ecole || ECOLES[0])
    setTempsIncantation(sort.temps_incantation ?? '')
    setPortee(sort.portee ?? '')
    setDuree(sort.duree ?? '')
    setDescription(sort.description ?? '')
    setActionType((sort.action_type as ActionType) || 'action')
    setCompVerbal(!!sort.composantes_verbal)
    setCompSomatique(!!sort.composantes_somatique)
    setCompMateriel(sort.composantes_materiel ?? '')
    setConcentration(!!sort.concentration)
    setRituel(!!sort.rituel)
    setClassesCompatibles(
      Array.isArray(sort.classes_compatibles)
        ? (sort.classes_compatibles as ClasseSort[])
        : []
    )
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const togglerClasseCompatible = (c: ClasseSort) => {
    setClassesCompatibles((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }

  // Les sorts sont désormais des modèles user-owned (user_id). On inclut aussi
  // les lignes héritées (personnage_id lié à un de nos persos, user_id=null)
  // pour ne pas masquer du contenu qui n'aurait pas encore été migré.
  const fetchSorts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: mesPersos } = await supabase
      .from('personnages')
      .select('id')
      .eq('joueur_id', user.id)
    const persoIds = (mesPersos ?? []).map((p) => p.id)
    const orFilters = [`user_id.eq.${user.id}`]
    if (persoIds.length > 0) {
      orFilters.push(`personnage_id.in.(${persoIds.join(',')})`)
    }
    const { data } = await supabase
      .from('sorts')
      .select('*')
      .or(orFilters.join(','))
      .order('niveau')
      .order('nom')
    if (data) {
      // Déduplication défensive (un sort peut matcher les deux filtres pendant
      // la période de transition).
      const uniq = new Map<string, Sort>()
      for (const s of data as Sort[]) uniq.set(s.id, s)
      setSorts(Array.from(uniq.values()))
    }
  }

  const sauvegarderSort = async () => {
    if (!nom) return setMessage(tc('required'))
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const payload = {
      nom,
      niveau: parseInt(niveau),
      ecole,
      temps_incantation: tempsIncantation || null,
      portee: portee || null,
      duree: duree || null,
      description,
      action_type: actionType,
      composantes_verbal: compVerbal,
      composantes_somatique: compSomatique,
      composantes_materiel: compMateriel,
      concentration,
      rituel,
      classes_compatibles: classesCompatibles
    }
    if (editingId) {
      const { error } = await supabase.from('sorts').update(payload).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage(ts('modified'))
        resetForm()
        fetchSorts()
      }
    } else {
      const { error } = await supabase
        .from('sorts')
        .insert({ ...payload, user_id: user.id, personnage_id: null })
      if (error) setMessage(error.message)
      else {
        setMessage(ts('created'))
        resetForm()
        fetchSorts()
      }
    }
    setLoading(false)
  }

  const supprimerSort = async (id: string) => {
    if (!window.confirm(tc('confirm_delete'))) return
    await supabase.from('sorts').delete().eq('id', id)
    fetchSorts()
  }

  const exporterSort = (s: Sort) => {
    const env = construireEnveloppe('sort', nettoyer(s as unknown as Record<string, unknown>))
    telechargerJSON(`sort-${slugFichier(s.nom)}.json`, env)
  }

  const importerSort = () => {
    ouvrirSelecteurFichier(async (f) => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const raw = await lireFichierJSON(f)
        const env = validerEnveloppe<Record<string, unknown>>(raw, ['sort'])
        const clean = nettoyer(env.data)
        const nomImport = typeof clean.nom === 'string' && clean.nom.trim() !== '' ? clean.nom : 'Sort importé'
        const { error } = await supabase
          .from('sorts')
          .insert({ ...clean, nom: nomImport, user_id: user.id, personnage_id: null })
        if (error) throw error
        setMessage(tc('import_ok'))
        fetchSorts()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setMessage(tc('import_error', { message: msg }))
      }
    })
  }

  const togglerPublic = async (sort: Sort) => {
    const rendrePublic = !sort.public
    let auteurUsername = sort.auteur_username ?? null
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
      .from('sorts')
      .update({ public: rendrePublic, auteur_username: auteurUsername })
      .eq('id', sort.id)
    if (error) setMessage(error.message)
    else fetchSorts()
  }

  const sortsAffiches = favorisOnly
    ? sorts.filter((s) => estFavori('sorts', s.id))
    : sorts

  const inputCls =
    'w-full p-2.5 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm focus:border-yellow-600'
  const labelCls = 'text-[11px] uppercase tracking-[0.18em] text-gray-400 mb-1 block'

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">
            ← {tc('back')}
          </button>
          <h1 className="text-xl md:text-2xl grim-title">{ts('title')}</h1>
        </div>

        {/* Bloc création/édition : aperçu live + formulaire */}
        <div className="grim-card mb-8 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-[13px] tracking-[0.18em] uppercase text-yellow-500">
              {editingId ? ts('edit_title') : ts('create_title')}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-gray-400 hover:text-white"
              >
                {ts('cancel_edit')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5 p-5">
              {/* Formulaire */}
              <div className="order-2 md:order-1 space-y-3">
                <div>
                  <label className={labelCls}>{ts('name_label')}</label>
                  <input type="text" placeholder={ts('name_ph')} value={nom} onChange={(e) => setNom(e.target.value)} className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{ts('level')}</label>
                    <select value={niveau} onChange={(e) => setNiveau(e.target.value)} className={inputCls}>
                      {NIVEAUX.map((n) => <option key={n} value={n}>{n === 0 ? ts('level_0_short', { n }) : ts('level_n', { n })}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{ts('school')}</label>
                    <select value={ecole} onChange={(e) => setEcole(e.target.value)} className={inputCls}>
                      {ECOLES.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>{ts('casting_time')}</label>
                    <input type="text" placeholder="1 action" value={tempsIncantation} onChange={(e) => setTempsIncantation(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{ts('range')}</label>
                    <input type="text" placeholder="45 m" value={portee} onChange={(e) => setPortee(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{ts('duration')}</label>
                    <input type="text" value={duree} onChange={(e) => setDuree(e.target.value)} className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{ts('action_type')}</label>
                    <select
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value as ActionType)}
                      className={inputCls}
                    >
                      {ACTION_TYPES.map((a) => (
                        <option key={a.key} value={a.key}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{ts('components')}</label>
                    <div className="flex flex-wrap gap-3 items-center bg-gray-700 border border-gray-600 rounded p-2.5">
                      <label className="inline-flex items-center gap-1.5 text-xs text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compVerbal}
                          onChange={(e) => setCompVerbal(e.target.checked)}
                          className="accent-yellow-500"
                        />
                        V
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compSomatique}
                          onChange={(e) => setCompSomatique(e.target.checked)}
                          className="accent-yellow-500"
                        />
                        S
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!compMateriel}
                          onChange={(e) =>
                            setCompMateriel(e.target.checked ? 'matériel' : '')
                          }
                          className="accent-yellow-500"
                        />
                        M
                      </label>
                      {compMateriel && (
                        <input
                          type="text"
                          placeholder={ts('material_ph')}
                          value={compMateriel}
                          onChange={(e) => setCompMateriel(e.target.value)}
                          className="flex-1 min-w-[8rem] bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-xs outline-none"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={concentration}
                      onChange={(e) => setConcentration(e.target.checked)}
                      className="accent-yellow-500"
                    />
                    {ts('concentration')}
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rituel}
                      onChange={(e) => setRituel(e.target.checked)}
                      className="accent-yellow-500"
                    />
                    {ts('ritual')}
                  </label>
                </div>

                <div>
                  <label className={labelCls}>{ts('classes_compatible')}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CLASSES_DISPO.map((c) => {
                      const checked = classesCompatibles.includes(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => togglerClasseCompatible(c)}
                          className={`px-2 py-1 rounded-full text-[11px] tracking-wide border transition ${
                            checked
                              ? 'border-yellow-500 bg-yellow-500/15 text-yellow-200'
                              : 'border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{ts('description')}</label>
                  <textarea placeholder={ts('description_ph')} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} h-28 resize-none`} />
                </div>

                {message && <p className="text-yellow-400 text-sm">{message}</p>}

                <button
                  type="button"
                  onClick={sauvegarderSort}
                  disabled={loading}
                  className="w-full p-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 disabled:opacity-60 text-sm tracking-wider"
                >
                  {loading ? tc('loading') : editingId ? ts('save_edit_button') : ts('save_button')}
                </button>
              </div>

              {/* Aperçu live — sur mobile : au-dessus, sur desktop : à droite */}
              <div className="order-1 md:order-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 mb-2 text-center md:text-left">
                  {ts('live_preview')}
                </div>
                <SpellCard
                  nom={nom}
                  niveau={parseInt(niveau) || 0}
                  ecole={ecole}
                  temps_incantation={tempsIncantation || null}
                  portee={portee || null}
                  duree={duree || null}
                  description={description}
                  composantes_verbal={compVerbal}
                  composantes_somatique={compSomatique}
                  composantes_materiel={compMateriel}
                  concentration={concentration}
                  rituel={rituel}
                />
              </div>
            </div>
        </div>

        {/* Liste des sorts en grille */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[13px] tracking-[0.18em] uppercase text-yellow-500">
              {ts('grimoire')} ({sortsAffiches.length})
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setImporterOuvert(true)}
                className="px-3 py-1.5 rounded bg-yellow-600 hover:bg-yellow-500 text-gray-900 text-xs font-bold"
              >
                {ts('import_library')}
              </button>
              <button
                type="button"
                onClick={importerSort}
                className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"
              >
                {tc('import_json')}
              </button>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none mb-2">
            <input
              type="checkbox"
              checked={favorisOnly}
              onChange={(e) => setFavorisOnly(e.target.checked)}
              className="accent-yellow-500"
            />
            ⭐ Afficher uniquement les favoris
          </label>
          {sortsAffiches.length === 0 && (
            <p className="text-gray-400 text-sm italic">{ts('empty')}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortsAffiches.map((sort) => (
              <div key={sort.id} className="flex flex-col gap-2 relative">
                <div className="absolute top-1 left-1 z-10 bg-gray-900/80 rounded-full p-0.5">
                  <StarFavori type="sorts" id={sort.id} />
                </div>
                <SpellCard
                  nom={sort.nom}
                  niveau={sort.niveau}
                  ecole={sort.ecole}
                  temps_incantation={sort.temps_incantation}
                  portee={sort.portee}
                  duree={sort.duree}
                  description={sort.description}
                  composantes_verbal={sort.composantes_verbal}
                  composantes_somatique={sort.composantes_somatique}
                  composantes_materiel={sort.composantes_materiel}
                  concentration={sort.concentration}
                  rituel={sort.rituel}
                />
                <div className="flex flex-wrap gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => togglerPublic(sort)}
                    className={`px-2 py-1.5 rounded text-[11px] tracking-wider uppercase border ${
                      sort.public
                        ? 'border-green-900 bg-green-950/40 text-green-300 hover:bg-green-900/40'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {sort.public ? `🌍 (${sort.nb_copies})` : '🔒'}
                  </button>
                  <button
                    type="button"
                    onClick={() => commencerEdition(sort)}
                    className="px-2 py-1.5 rounded text-[11px] tracking-wider uppercase border border-blue-900 bg-blue-950/40 text-blue-300 hover:bg-blue-900/40"
                  >
                    {tc('modify')}
                  </button>
                  <button
                    type="button"
                    onClick={() => exporterSort(sort)}
                    className="px-2 py-1.5 rounded text-[11px] tracking-wider uppercase border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                    title={tc('export_item_title')}
                  >
                    📥
                  </button>
                  <button
                    type="button"
                    onClick={() => supprimerSort(sort.id)}
                    className="px-2 py-1.5 rounded text-[11px] tracking-wider uppercase border border-red-900 bg-red-950/40 text-red-300 hover:bg-red-900/40"
                  >
                    {tc('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {importerOuvert && (
        <SpellLibraryImporter
          onClose={() => setImporterOuvert(false)}
          existingNames={new Set(sorts.map((s) => s.nom))}
          onImported={(n) => {
            setMessage(ts('imported_count', { n }))
            fetchSorts()
          }}
        />
      )}
    </main>
  )
}

// ----------------------------------------------------------------------------
// SpellLibraryImporter : modale qui liste SORTS_DND5E et insère des copies
// dans la table sorts pour le user courant.
// ----------------------------------------------------------------------------

function SpellLibraryImporter({
  onClose,
  existingNames,
  onImported
}: {
  onClose: () => void
  existingNames: Set<string>
  onImported: (n: number) => void
}) {
  const ts = useTranslations('spells')
  const tc = useTranslations('common')
  const [filtreNiveau, setFiltreNiveau] = useState<number | 'all'>('all')
  const [filtreEcole, setFiltreEcole] = useState<string | 'all'>('all')
  const [filtreClasse, setFiltreClasse] = useState<ClasseSort | 'all'>('all')
  const [recherche, setRecherche] = useState('')
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [enImport, setEnImport] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const sortsFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return SORTS_DND5E.filter((s) => {
      if (filtreNiveau !== 'all' && s.niveau !== filtreNiveau) return false
      if (filtreEcole !== 'all' && s.ecole !== filtreEcole) return false
      if (filtreClasse !== 'all' && !s.classes_compatibles.includes(filtreClasse))
        return false
      if (q && !`${s.nom} ${s.nomEn}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [filtreNiveau, filtreEcole, filtreClasse, recherche])

  const togglerSel = (nom: string) => {
    setSelection((prev) => {
      const next = new Set(prev)
      if (next.has(nom)) next.delete(nom)
      else next.add(nom)
      return next
    })
  }

  const toutSelectionner = () => {
    setSelection(new Set(sortsFiltres.map((s) => s.nom)))
  }

  const importerSelection = async () => {
    setErreur(null)
    if (selection.size === 0) return
    setEnImport(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErreur('Non connecté.')
      setEnImport(false)
      return
    }
    const choisis = SORTS_DND5E.filter((s) => selection.has(s.nom))
    const rows = choisis.map((s) => ({
      user_id: user.id,
      personnage_id: null,
      nom: s.nom,
      niveau: s.niveau,
      ecole: s.ecole,
      temps_incantation: s.temps_incantation,
      portee: s.portee,
      duree: s.duree,
      description: s.description,
      action_type: s.action_type,
      composantes_verbal: s.composantes_verbal,
      composantes_somatique: s.composantes_somatique,
      composantes_materiel: s.composantes_materiel,
      concentration: s.concentration,
      rituel: s.rituel,
      classes_compatibles: s.classes_compatibles
    }))
    const { error } = await supabase.from('sorts').insert(rows)
    setEnImport(false)
    if (error) {
      console.error('[sorts] import bibliothèque :', error)
      setErreur(error.message)
      return
    }
    onImported(rows.length)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/75 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl shadow-2xl"
        style={{
          background: '#12141a',
          border: '1px solid rgba(201,168,76,0.4)'
        }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between border-b"
          style={{ borderColor: 'rgba(201,168,76,0.2)' }}
        >
          <h3 className="text-[13px] tracking-[0.18em] uppercase text-[#C9A84C] font-bold">
            📚 {ts('import_library')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none w-7 h-7"
            aria-label={tc('close')}
          >
            ×
          </button>
        </div>

        <div
          className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-2 border-b"
          style={{ borderColor: 'rgba(201,168,76,0.15)' }}
        >
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={ts('search_ph')}
            className="col-span-2 md:col-span-1 px-2.5 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none focus:border-[#C9A84C]"
          />
          <select
            value={String(filtreNiveau)}
            onChange={(e) =>
              setFiltreNiveau(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
            }
            className="px-2.5 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none"
          >
            <option value="all">{ts('all_levels')}</option>
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>
                {n === 0 ? ts('level_0_short', { n }) : ts('level_n', { n })}
              </option>
            ))}
          </select>
          <select
            value={filtreEcole}
            onChange={(e) => setFiltreEcole(e.target.value)}
            className="px-2.5 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none"
          >
            <option value="all">{ts('all_schools')}</option>
            {ECOLES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <select
            value={filtreClasse}
            onChange={(e) => setFiltreClasse(e.target.value as ClasseSort | 'all')}
            className="px-2.5 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none"
          >
            <option value="all">{ts('all_classes')}</option>
            {CLASSES_DISPO.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
          {sortsFiltres.length === 0 ? (
            <p className="text-gray-400 text-sm italic text-center py-8">
              {ts('no_results')}
            </p>
          ) : (
            <ul className="space-y-1">
              {sortsFiltres.map((s, idx) => {
                const selected = selection.has(s.nom)
                const dejaPossede = existingNames.has(s.nom)
                return (
                  <li key={`${s.nom}-${idx}`}>
                    <label
                      className={`flex items-start gap-3 p-2 rounded cursor-pointer border transition ${
                        selected
                          ? 'bg-[rgba(201,168,76,0.12)] border-[#C9A84C]'
                          : 'bg-black/30 border-[rgba(201,168,76,0.15)] hover:bg-[rgba(201,168,76,0.06)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => togglerSel(s.nom)}
                        className="mt-1 accent-yellow-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-yellow-200 font-bold">{s.nom}</span>
                          <span className="text-[10px] text-gray-500 italic">{s.nomEn}</span>
                          <span className="text-[10px] text-gray-500">
                            {s.niveau === 0 ? 'Tour' : `Niv. ${s.niveau}`} · {s.ecole}
                          </span>
                          {dejaPossede && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{
                                background: 'rgba(16,185,129,0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16,185,129,0.3)'
                              }}
                              title={ts('already_owned')}
                            >
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs italic mt-1 line-clamp-2">
                          {s.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {s.classes_compatibles.map((c) => (
                            <span
                              key={c}
                              className="text-[9px] uppercase tracking-wider text-gray-500"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {erreur && (
          <p className="px-4 py-2 text-red-300 text-xs border-t border-red-900/40">
            {erreur}
          </p>
        )}
        <div
          className="px-4 py-3 flex items-center justify-between gap-2 border-t flex-wrap"
          style={{ borderColor: 'rgba(201,168,76,0.2)' }}
        >
          <span className="text-xs text-gray-400">
            {selection.size} / {sortsFiltres.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toutSelectionner}
              className="px-3 py-1.5 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-200"
            >
              {ts('select_all')}
            </button>
            <button
              type="button"
              onClick={importerSelection}
              disabled={selection.size === 0 || enImport}
              className="px-3 py-1.5 rounded text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-gray-900 disabled:opacity-50"
            >
              {enImport
                ? tc('loading')
                : ts('import_button', { n: selection.size })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
