'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
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
  public: boolean
  nb_copies: number
  auteur_username: string | null
}

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
  disponible?: boolean
  personnageNom?: string
  badge?: string
}

export function SpellCard({
  nom,
  niveau,
  ecole,
  temps_incantation,
  portee,
  duree,
  description,
  disponible,
  personnageNom,
  badge
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
      {(personnageNom || typeof disponible === 'boolean' || badge) && (
        <div
          className="px-4 py-2 flex items-center justify-between text-[11px] tracking-wider uppercase border-t"
          style={{
            borderColor: 'rgba(201,168,76,0.2)',
            background: 'rgba(0,0,0,0.25)'
          }}
        >
          <span style={{ color: '#6a6a72' }}>{personnageNom ?? badge ?? ''}</span>
          {typeof disponible === 'boolean' && (
            <span
              className="font-semibold"
              style={{ color: disponible ? '#10b981' : '#dc2626' }}
            >
              {disponible ? ts('available_short') : ts('used_short')}
            </span>
          )}
        </div>
      )}
    </div>
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
  const [sorts, setSorts] = useState<Sort[]>([])
  const [nom, setNom] = useState('')
  const [niveau, setNiveau] = useState('0')
  const [ecole, setEcole] = useState(ECOLES[0])
  const [tempsIncantation, setTempsIncantation] = useState('')
  const [portee, setPortee] = useState('')
  const [duree, setDuree] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
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
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      description
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

  const sortsAffiches = sorts

  const inputCls =
    'w-full p-2.5 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm focus:border-yellow-600'
  const labelCls = 'text-[11px] uppercase tracking-[0.18em] text-gray-400 mb-1 block'

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => window.location.href = '/dashboard'} className="text-gray-400 hover:text-white text-sm">
            ← {tc('back')}
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-yellow-500 tracking-wider">{ts('title')}</h1>
        </div>

        {/* Bloc création/édition : aperçu live + formulaire */}
        <div className="bg-gray-800 rounded-lg mb-8 overflow-hidden">
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
                onClick={importerSort}
                className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"
              >
                {tc('import_json')}
              </button>
            </div>
          </div>

          {sortsAffiches.length === 0 && (
            <p className="text-gray-400 text-sm italic">{ts('empty')}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortsAffiches.map((sort) => (
              <div key={sort.id} className="flex flex-col gap-2">
                <SpellCard
                  nom={sort.nom}
                  niveau={sort.niveau}
                  ecole={sort.ecole}
                  temps_incantation={sort.temps_incantation}
                  portee={sort.portee}
                  duree={sort.duree}
                  description={sort.description}
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
    </main>
  )
}
