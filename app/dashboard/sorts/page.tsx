'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Personnage = {
  id: string
  nom: string
}

type Sort = {
  id: string
  personnage_id: string
  nom: string
  niveau: number
  ecole: string
  temps_incantation: string | null
  portee: string | null
  duree: string | null
  description: string
  disponible: boolean
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
  disponible: boolean
  personnageNom?: string
}

function SpellCard({
  nom,
  niveau,
  ecole,
  temps_incantation,
  portee,
  duree,
  description,
  disponible,
  personnageNom
}: SpellCardProps) {
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

      {/* Badge disponible/utilisé */}
      <div
        className="px-4 py-2 flex items-center justify-between text-[11px] tracking-wider uppercase border-t"
        style={{
          borderColor: 'rgba(201,168,76,0.2)',
          background: 'rgba(0,0,0,0.25)'
        }}
      >
        <span style={{ color: '#6a6a72' }}>{personnageNom ?? ''}</span>
        <span
          className="font-semibold"
          style={{ color: disponible ? '#10b981' : '#dc2626' }}
        >
          {disponible ? '● Disponible' : '○ Utilisé'}
        </span>
      </div>
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
  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const [sorts, setSorts] = useState<Sort[]>([])
  const [personnageId, setPersonnageId] = useState('')
  const [filtrePersonnageId, setFiltrePersonnageId] = useState('')
  const [nom, setNom] = useState('')
  const [niveau, setNiveau] = useState('0')
  const [ecole, setEcole] = useState(ECOLES[0])
  const [tempsIncantation, setTempsIncantation] = useState('')
  const [portee, setPortee] = useState('')
  const [duree, setDuree] = useState('')
  const [description, setDescription] = useState('')
  const [disponible, setDisponible] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPersonnages()
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
    setDisponible(true)
    setEditingId(null)
  }

  const commencerEdition = (sort: Sort) => {
    setEditingId(sort.id)
    setPersonnageId(sort.personnage_id)
    setNom(sort.nom)
    setNiveau(String(sort.niveau))
    setEcole(sort.ecole || ECOLES[0])
    setTempsIncantation(sort.temps_incantation ?? '')
    setPortee(sort.portee ?? '')
    setDuree(sort.duree ?? '')
    setDescription(sort.description ?? '')
    setDisponible(sort.disponible)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchPersonnages = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('personnages')
      .select('id, nom')
      .eq('joueur_id', user.id)
      .order('nom')
    if (data) {
      setPersonnages(data)
      if (data.length > 0 && !personnageId) setPersonnageId(data[0].id)
    }
  }

  const fetchSorts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: mesPersos } = await supabase
      .from('personnages')
      .select('id')
      .eq('joueur_id', user.id)
    const ids = (mesPersos ?? []).map((p) => p.id)
    if (ids.length === 0) {
      setSorts([])
      return
    }
    const { data } = await supabase
      .from('sorts')
      .select('*')
      .in('personnage_id', ids)
      .order('niveau')
      .order('nom')
    if (data) setSorts(data)
  }

  const sauvegarderSort = async () => {
    if (!personnageId) return setMessage('Sélectionne un personnage !')
    if (!nom) return setMessage('Le nom du sort est obligatoire !')
    setLoading(true)
    const payload = {
      personnage_id: personnageId,
      nom,
      niveau: parseInt(niveau),
      ecole,
      temps_incantation: tempsIncantation || null,
      portee: portee || null,
      duree: duree || null,
      description,
      disponible
    }
    if (editingId) {
      const { error } = await supabase.from('sorts').update(payload).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage('Sort modifié !')
        resetForm()
        fetchSorts()
      }
    } else {
      const { error } = await supabase.from('sorts').insert(payload)
      if (error) setMessage(error.message)
      else {
        setMessage('Sort ajouté !')
        resetForm()
        fetchSorts()
      }
    }
    setLoading(false)
  }

  const toggleDisponible = async (sort: Sort) => {
    await supabase.from('sorts').update({ disponible: !sort.disponible }).eq('id', sort.id)
    fetchSorts()
  }

  const supprimerSort = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.')) return
    await supabase.from('sorts').delete().eq('id', id)
    fetchSorts()
  }

  const nomPersonnage = (id: string) => personnages.find((p) => p.id === id)?.nom ?? 'Inconnu'

  const sortsAffiches = filtrePersonnageId
    ? sorts.filter((s) => s.personnage_id === filtrePersonnageId)
    : sorts

  const previewPersoNom =
    personnages.find((p) => p.id === personnageId)?.nom ?? '—'

  const inputCls =
    'w-full p-2.5 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm focus:border-yellow-600'
  const labelCls = 'text-[11px] uppercase tracking-[0.18em] text-gray-400 mb-1 block'

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => window.location.href = '/dashboard'} className="text-gray-400 hover:text-white text-sm">
            ← Retour
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-yellow-500 tracking-wider">✨ Sorts</h1>
        </div>

        {/* Bloc création/édition : aperçu live + formulaire */}
        <div className="bg-gray-800 rounded-lg mb-8 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-[13px] tracking-[0.18em] uppercase text-yellow-500">
              {editingId ? 'Modifier le sort' : 'Nouveau sort'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-gray-400 hover:text-white"
              >
                Annuler l&apos;édition
              </button>
            )}
          </div>

          {personnages.length === 0 ? (
            <p className="p-5 text-gray-400 text-sm">Crée d&apos;abord un personnage pour lui ajouter des sorts.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5 p-5">
              {/* Formulaire */}
              <div className="order-2 md:order-1 space-y-3">
                <div>
                  <label className={labelCls}>Personnage</label>
                  <select value={personnageId} onChange={(e) => setPersonnageId(e.target.value)} className={inputCls}>
                    {personnages.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Nom du sort *</label>
                  <input type="text" placeholder="Boule de feu" value={nom} onChange={(e) => setNom(e.target.value)} className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Niveau</label>
                    <select value={niveau} onChange={(e) => setNiveau(e.target.value)} className={inputCls}>
                      {NIVEAUX.map((n) => <option key={n} value={n}>{n === 0 ? 'Tour (0)' : `Niveau ${n}`}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>École</label>
                    <select value={ecole} onChange={(e) => setEcole(e.target.value)} className={inputCls}>
                      {ECOLES.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Incantation</label>
                    <input type="text" placeholder="1 action" value={tempsIncantation} onChange={(e) => setTempsIncantation(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Portée</label>
                    <input type="text" placeholder="45 m" value={portee} onChange={(e) => setPortee(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Durée</label>
                    <input type="text" placeholder="Instantané" value={duree} onChange={(e) => setDuree(e.target.value)} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Description</label>
                  <textarea placeholder="Effet du sort, dégâts, sauvegardes…" value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} h-28 resize-none`} />
                </div>

                <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
                  <input type="checkbox" checked={disponible} onChange={(e) => setDisponible(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
                  <span>Sort disponible</span>
                </label>

                {message && <p className="text-yellow-400 text-sm">{message}</p>}

                <button
                  type="button"
                  onClick={sauvegarderSort}
                  disabled={loading}
                  className="w-full p-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 disabled:opacity-60 text-sm tracking-wider"
                >
                  {loading ? 'Chargement…' : editingId ? 'Enregistrer les modifications' : 'Créer le sort'}
                </button>
              </div>

              {/* Aperçu live — sur mobile : au-dessus, sur desktop : à droite */}
              <div className="order-1 md:order-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 mb-2 text-center md:text-left">
                  Aperçu live
                </div>
                <SpellCard
                  nom={nom}
                  niveau={parseInt(niveau) || 0}
                  ecole={ecole}
                  temps_incantation={tempsIncantation || null}
                  portee={portee || null}
                  duree={duree || null}
                  description={description}
                  disponible={disponible}
                  personnageNom={previewPersoNom}
                />
              </div>
            </div>
          )}
        </div>

        {/* Liste des sorts en grille */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] tracking-[0.18em] uppercase text-yellow-500">
              Grimoire ({sortsAffiches.length})
            </h2>
            {personnages.length > 0 && (
              <select value={filtrePersonnageId} onChange={(e) => setFiltrePersonnageId(e.target.value)} className="p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-xs">
                <option value="">Tous les personnages</option>
                {personnages.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            )}
          </div>

          {sortsAffiches.length === 0 && (
            <p className="text-gray-400 text-sm italic">Aucun sort pour l&apos;instant.</p>
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
                  disponible={sort.disponible}
                  personnageNom={nomPersonnage(sort.personnage_id)}
                />
                <div className="flex gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => toggleDisponible(sort)}
                    className="flex-1 px-2 py-1.5 rounded text-[11px] tracking-wider uppercase border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300"
                  >
                    {sort.disponible ? 'Marquer utilisé' : 'Restaurer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => commencerEdition(sort)}
                    className="px-2 py-1.5 rounded text-[11px] tracking-wider uppercase border border-blue-900 bg-blue-950/40 text-blue-300 hover:bg-blue-900/40"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => supprimerSort(sort.id)}
                    className="px-2 py-1.5 rounded text-[11px] tracking-wider uppercase border border-red-900 bg-red-950/40 text-red-300 hover:bg-red-900/40"
                  >
                    Suppr
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
