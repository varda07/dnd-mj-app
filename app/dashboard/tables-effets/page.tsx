'use client'

// ============================================================================
// ROADMAP V1 — Phase 2 : Tables d'effets personnalisées enrichies
// ----------------------------------------------------------------------------
// Gestion des tables d'effets aléatoires personnalisées :
//   2.1 Templates prêts à l'emploi (data/templates_tables_effets.ts)
//   2.2 Roll configurable (choix du dé d4..d100 + tirage)
//   2.3 Pondération par plages de valeurs (+ affichage visuel de la rareté)
//   2.4 Liaison à un déclencheur (sort / item / lieu)
//   2.5 Partage communauté (colonne public + import) + likes
//   2.6 Import / Export JSON
// ============================================================================

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  TEMPLATES_TABLES_EFFETS,
  type DeType
} from '@/app/data/templates_tables_effets'
import LikeButton from '@/app/components/LikeButton'
import SignalerButton from '@/app/components/SignalerButton'
import { logUsage } from '@/app/lib/analytics'
import GuidedTour from '@/app/components/GuidedTour'

type Effet = { min: number; max: number; titre: string; description: string }
type DeclencheurType = 'sort' | 'item' | 'lieu' | ''
type TableCustom = {
  id: string
  nom: string
  description: string | null
  effets: Effet[]
  de: DeType
  public: boolean
  declencheur_type: DeclencheurType
  declencheur_ref: string | null
  user_id?: string
  auteur?: string | null
}

const DES: DeType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']
const DE_MAX: Record<DeType, number> = {
  d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100
}

// Rareté visuelle d'un effet selon la part de la plage couverte sur le dé.
function rarete(effet: Effet, de: DeType): { label: string; couleur: string; pct: number } {
  const span = Math.max(0, effet.max - effet.min + 1)
  const pct = Math.round((span / DE_MAX[de]) * 100)
  if (pct <= 5) return { label: 'Très rare', couleur: '#c084fc', pct }
  if (pct <= 12) return { label: 'Rare', couleur: '#60a5fa', pct }
  if (pct <= 25) return { label: 'Peu commun', couleur: '#34d399', pct }
  return { label: 'Commun', couleur: '#9ca3af', pct }
}

function normaliseEffets(raw: unknown): Effet[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e) => e && typeof e === 'object')
    .map((e) => {
      const o = e as Record<string, unknown>
      return {
        min: Number(o.min) || 1,
        max: Number(o.max) || 1,
        titre: String(o.titre ?? ''),
        description: String(o.description ?? '')
      }
    })
}

function rowToTable(t: Record<string, unknown>): TableCustom {
  return {
    id: String(t.id),
    nom: String(t.nom),
    description: (t.description as string | null) ?? null,
    effets: normaliseEffets(t.effets),
    de: (DES.includes(t.de as DeType) ? (t.de as DeType) : 'd100'),
    public: !!t.public,
    declencheur_type: ((t.declencheur_type as DeclencheurType) ?? '') || '',
    declencheur_ref: (t.declencheur_ref as string | null) ?? null,
    user_id: (t.user_id as string | undefined) ?? undefined,
    auteur: (t.auteur as string | null) ?? null
  }
}

const SELECT_COLS =
  'id, nom, description, effets, de, public, declencheur_type, declencheur_ref, user_id'

export default function TablesEffetsPage() {
  const router = useRouter()
  const [vue, setVue] = useState<'liste' | 'edit' | 'communaute'>('liste')
  const [tables, setTables] = useState<TableCustom[]>([])
  const [communaute, setCommunaute] = useState<TableCustom[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Champs d'édition
  const [editId, setEditId] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [desc, setDesc] = useState('')
  const [effets, setEffets] = useState<Effet[]>([])
  const [de, setDe] = useState<DeType>('d100')
  const [isPublic, setIsPublic] = useState(false)
  const [declType, setDeclType] = useState<DeclencheurType>('')
  const [declRef, setDeclRef] = useState('')

  // Roll
  const [rollResult, setRollResult] = useState<{ valeur: number; effet: Effet | null } | null>(null)
  const [tablePicker, setTablePicker] = useState(false)

  const chargerMes = async (uid: string) => {
    const res = await supabase
      .from('tables_effets_custom')
      .select(SELECT_COLS)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    let rows: unknown[] | null = res.data
    // Repli si la migration V1 (colonnes de/public/declencheur_*) n'est pas
    // encore appliquée : on relit avec les colonnes de base.
    if (res.error) {
      const fallback = await supabase
        .from('tables_effets_custom')
        .select('id, nom, description, effets, user_id')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
      rows = fallback.data
    }
    setTables((rows ?? []).map((t) => rowToTable(t as Record<string, unknown>)))
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUserId(user.id)
      await chargerMes(user.id)
      setLoading(false)
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const chargerCommunaute = async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('tables_effets_custom')
      .select(SELECT_COLS)
      .eq('public', true)
      .neq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)
    setCommunaute((data ?? []).map((t) => rowToTable(t as Record<string, unknown>)))
    setLoading(false)
  }

  // --- Édition -------------------------------------------------------------
  const nouvelleTable = () => {
    setEditId('new')
    setNom('')
    setDesc('')
    setEffets([{ min: 1, max: 1, titre: '', description: '' }])
    setDe('d100')
    setIsPublic(false)
    setDeclType('')
    setDeclRef('')
    setRollResult(null)
    setVue('edit')
  }

  const ouvrirTable = (t: TableCustom) => {
    setEditId(t.id)
    setNom(t.nom)
    setDesc(t.description ?? '')
    setEffets(t.effets.length > 0 ? t.effets : [{ min: 1, max: 1, titre: '', description: '' }])
    setDe(t.de)
    setIsPublic(t.public)
    setDeclType(t.declencheur_type)
    setDeclRef(t.declencheur_ref ?? '')
    setRollResult(null)
    setVue('edit')
  }

  const importerTemplate = (templateId: string) => {
    const tpl = TEMPLATES_TABLES_EFFETS.find((t) => t.id === templateId)
    if (!tpl) return
    setEditId('new')
    setNom(tpl.nom)
    setDesc(tpl.description)
    setEffets(tpl.effets.map((e) => ({ ...e })))
    setDe(tpl.de)
    setIsPublic(false)
    setDeclType('')
    setDeclRef('')
    setRollResult(null)
    setTablePicker(false)
    setVue('edit')
  }

  const ajouterEffet = () => {
    const dernier = effets[effets.length - 1]
    const nextMin = dernier ? dernier.max + 1 : 1
    setEffets([...effets, { min: nextMin, max: nextMin, titre: '', description: '' }])
  }
  const updateEffet = (i: number, patch: Partial<Effet>) =>
    setEffets(effets.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))
  const supprimerEffet = (i: number) => setEffets(effets.filter((_, idx) => idx !== i))

  const sauver = async () => {
    if (!nom.trim()) return alert('Donne un nom à la table.')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      nom: nom.trim(),
      description: desc.trim() || null,
      effets,
      de,
      public: isPublic,
      declencheur_type: declType || null,
      declencheur_ref: declRef.trim() || null
    }
    if (editId === 'new') {
      const { error } = await supabase
        .from('tables_effets_custom')
        .insert({ user_id: user.id, ...payload })
      if (error) return alert(error.message)
    } else if (editId) {
      const { error } = await supabase
        .from('tables_effets_custom')
        .update(payload)
        .eq('id', editId)
      if (error) return alert(error.message)
    }
    await chargerMes(user.id)
    setVue('liste')
    setEditId(null)
  }

  const supprimerTable = async () => {
    if (!editId || editId === 'new') return setVue('liste')
    if (!confirm('Supprimer cette table d\'effets ?')) return
    await supabase.from('tables_effets_custom').delete().eq('id', editId)
    setTables(tables.filter((t) => t.id !== editId))
    setVue('liste')
    setEditId(null)
  }

  // --- Roll ----------------------------------------------------------------
  const lancer = (tableEffets: Effet[], tableDe: DeType) => {
    const valeur = Math.floor(Math.random() * DE_MAX[tableDe]) + 1
    const effet = tableEffets.find((e) => valeur >= e.min && valeur <= e.max) ?? null
    setRollResult({ valeur, effet })
    void logUsage('feature:table_effet_roll', { de: tableDe })
  }

  // --- Import / Export (2.6) ----------------------------------------------
  const exporterTable = (t: TableCustom) => {
    const data = {
      _type: 'master-screen.table-effets',
      _version: 1,
      nom: t.nom,
      description: t.description,
      de: t.de,
      effets: t.effets
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `table-effets-${t.nom.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importerFichier = async (file: File) => {
    try {
      const txt = await file.text()
      const data = JSON.parse(txt) as Record<string, unknown>
      const effetsImp = normaliseEffets(data.effets)
      if (effetsImp.length === 0) {
        alert('Format invalide : aucun effet trouvé dans le fichier.')
        return
      }
      const deImp = DES.includes(data.de as DeType) ? (data.de as DeType) : 'd100'
      setEditId('new')
      setNom(String(data.nom ?? 'Table importée'))
      setDesc(String(data.description ?? ''))
      setEffets(effetsImp)
      setDe(deImp)
      setIsPublic(false)
      setDeclType('')
      setDeclRef('')
      setRollResult(null)
      setVue('edit')
    } catch {
      alert('Fichier illisible : JSON invalide.')
    }
  }

  // --- Import communauté ---------------------------------------------------
  const copierCommunaute = async (t: TableCustom) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('tables_effets_custom').insert({
      user_id: user.id,
      nom: `${t.nom} (copie)`,
      description: t.description,
      effets: t.effets,
      de: t.de,
      public: false
    })
    if (error) return alert(error.message)
    alert('Table importée dans tes tables.')
    await chargerMes(user.id)
  }

  // -------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <GuidedTour tourId="tables-effets" />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Retour
          </button>
          <h1 className="text-2xl grim-title">✨ Tables d&apos;effets personnalisées</h1>
        </div>

        {/* Onglets */}
        {vue !== 'edit' && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setVue('liste')}
              className={`px-3 py-1.5 rounded text-sm ${vue === 'liste' ? 'bg-[#C9A84C] text-[#0a0b0d] font-bold' : 'bg-gray-800 text-gray-300'}`}
            >
              Mes tables
            </button>
            <button
              type="button"
              onClick={() => { setVue('communaute'); void chargerCommunaute() }}
              className={`px-3 py-1.5 rounded text-sm ${vue === 'communaute' ? 'bg-[#C9A84C] text-[#0a0b0d] font-bold' : 'bg-gray-800 text-gray-300'}`}
            >
              🌐 Communauté
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* LISTE */}
        {/* ---------------------------------------------------------------- */}
        {vue === 'liste' && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={nouvelleTable}
                className="px-4 py-2 bg-[#C9A84C] text-[#0a0b0d] font-bold rounded hover:bg-[#d4b558] text-sm uppercase tracking-wider"
              >
                + Créer une table
              </button>
              <button
                type="button"
                onClick={() => setTablePicker((v) => !v)}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded text-sm uppercase tracking-wider"
              >
                📜 Partir d&apos;un template
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm uppercase tracking-wider"
              >
                📥 Importer JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void importerFichier(f)
                  e.target.value = ''
                }}
              />
            </div>

            {/* Galerie de templates */}
            {tablePicker && (
              <div className="grim-card p-3 mb-4">
                <h3 className="text-[#C9A84C] font-bold text-sm mb-2">Templates prêts à l&apos;emploi</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEMPLATES_TABLES_EFFETS.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => importerTemplate(tpl.id)}
                      className="text-left rounded p-2.5 border border-[rgba(201,168,76,0.20)] bg-[rgba(0,0,0,0.30)] hover:border-[#C9A84C] hover:bg-[rgba(201,168,76,0.05)] transition-all"
                    >
                      <div className="text-[#C9A84C] font-bold text-sm flex items-center gap-1.5">
                        <span>{tpl.icone}</span> {tpl.nom}
                      </div>
                      <div className="text-[11px] text-[#a8a8b0] line-clamp-2 mt-0.5">{tpl.description}</div>
                      <div className="text-[10px] text-[#6a6a72] mt-1">{tpl.de} · {tpl.effets.length} effets</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-gray-400 italic">Chargement…</p>
            ) : tables.length === 0 ? (
              <p className="text-gray-500 italic">
                Aucune table custom. Crée la première ou pars d&apos;un template (mutations, folie, chaos, météo, malédictions…).
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="rounded p-3 border border-[rgba(201,168,76,0.20)] bg-[rgba(0,0,0,0.30)] hover:border-[#C9A84C] transition-all"
                  >
                    <button type="button" onClick={() => ouvrirTable(t)} className="text-left w-full">
                      <div className="text-[#C9A84C] font-bold mb-1 flex items-center gap-1.5 flex-wrap">
                        {t.nom}
                        {t.public && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300">PUBLIC</span>}
                        {t.declencheur_type && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200">🔗 {t.declencheur_type}</span>}
                      </div>
                      <div className="text-[11px] text-[#a8a8b0] line-clamp-2">{t.description ?? '—'}</div>
                      <div className="text-[10px] text-[#6a6a72] mt-1.5">
                        {t.de} · {t.effets.length} effet{t.effets.length > 1 ? 's' : ''}
                      </div>
                    </button>
                    <div className="flex gap-1.5 mt-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => lancer(t.effets, t.de)}
                        className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-bold rounded"
                      >
                        🎲 Roll
                      </button>
                      <button
                        type="button"
                        onClick={() => exporterTable(t)}
                        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        📤 Export
                      </button>
                      <button
                        type="button"
                        onClick={() => ouvrirTable(t)}
                        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded ml-auto"
                      >
                        ✏️ Éditer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* COMMUNAUTÉ */}
        {/* ---------------------------------------------------------------- */}
        {vue === 'communaute' && (
          <>
            {loading ? (
              <p className="text-gray-400 italic">Chargement…</p>
            ) : communaute.length === 0 ? (
              <p className="text-gray-500 italic">
                Aucune table partagée pour le moment. Marque l&apos;une de tes tables comme « publique » pour la partager !
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {communaute.map((t) => (
                  <div
                    key={t.id}
                    className="rounded p-3 border border-[rgba(201,168,76,0.20)] bg-[rgba(0,0,0,0.30)]"
                  >
                    <div className="text-[#C9A84C] font-bold mb-1">{t.nom}</div>
                    <div className="text-[11px] text-[#a8a8b0] line-clamp-3">{t.description ?? '—'}</div>
                    <div className="text-[10px] text-[#6a6a72] mt-1.5">
                      {t.de} · {t.effets.length} effet{t.effets.length > 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                      <LikeButton entiteType="table_effet" entiteId={t.id} />
                      <SignalerButton contenuType="table_effet" contenuId={t.id} compact />
                      <button
                        type="button"
                        onClick={() => lancer(t.effets, t.de)}
                        className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-bold rounded"
                      >
                        🎲 Roll
                      </button>
                      <button
                        type="button"
                        onClick={() => copierCommunaute(t)}
                        className="px-2 py-1 text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded ml-auto"
                      >
                        📥 Importer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* ÉDITION */}
        {/* ---------------------------------------------------------------- */}
        {vue === 'edit' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => { setVue('liste'); setEditId(null) }}
              className="text-gray-400 hover:text-white text-sm"
            >
              ← Mes tables
            </button>

            <div className="grim-card p-4 space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-[#6a6a72]">Nom</label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-[#C9A84C]"
                placeholder="Ex. Items magiques chaotiques"
              />
              <label className="text-[10px] uppercase tracking-wider text-[#6a6a72]">Description (facultative)</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-[#C9A84C] text-sm"
                rows={2}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#6a6a72] block mb-1">Type de dé</label>
                  <select
                    value={de}
                    onChange={(e) => setDe(e.target.value as DeType)}
                    className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-[#C9A84C] text-sm"
                  >
                    {DES.map((d) => <option key={d} value={d}>{d} (1–{DE_MAX[d]})</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-300 sm:mt-5 cursor-pointer">
                  <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                  <span>🌐 Partager dans la communauté</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#6a6a72] block mb-1">Déclencheur (facultatif)</label>
                  <select
                    value={declType}
                    onChange={(e) => setDeclType(e.target.value as DeclencheurType)}
                    className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-[#C9A84C] text-sm"
                  >
                    <option value="">Aucun</option>
                    <option value="sort">Sort</option>
                    <option value="item">Item</option>
                    <option value="lieu">Lieu</option>
                  </select>
                </div>
                {declType && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[#6a6a72] block mb-1">Nom du {declType}</label>
                    <input
                      value={declRef}
                      onChange={(e) => setDeclRef(e.target.value)}
                      className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-[#C9A84C] text-sm"
                      placeholder={`Ex. ${declType === 'sort' ? 'Métamorphose' : declType === 'item' ? 'Bâton fêlé' : 'Forêt maudite'}`}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grim-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[#C9A84C] font-bold text-sm">Effets (plages = pondération)</h3>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => lancer(effets, de)}
                    className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-bold rounded"
                  >
                    🎲 Tester ({de})
                  </button>
                  <button
                    type="button"
                    onClick={ajouterEffet}
                    className="px-2 py-1 text-xs bg-emerald-700 hover:bg-emerald-600 rounded text-white"
                  >
                    + Ajouter
                  </button>
                </div>
              </div>

              {effets.map((e, i) => {
                const r = rarete(e, de)
                return (
                  <div key={i} className="rounded border border-gray-700 bg-gray-800/50 p-2 space-y-1">
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        type="number"
                        value={e.min}
                        onChange={(ev) => updateEffet(i, { min: parseInt(ev.target.value) || 1 })}
                        className="w-16 p-1 text-sm bg-gray-900 border border-gray-700 rounded"
                        placeholder="Min"
                      />
                      <span className="text-[#6a6a72]">→</span>
                      <input
                        type="number"
                        value={e.max}
                        onChange={(ev) => updateEffet(i, { max: parseInt(ev.target.value) || 1 })}
                        className="w-16 p-1 text-sm bg-gray-900 border border-gray-700 rounded"
                        placeholder="Max"
                      />
                      <input
                        value={e.titre}
                        onChange={(ev) => updateEffet(i, { titre: ev.target.value })}
                        className="flex-1 min-w-[120px] p-1 text-sm bg-gray-900 border border-gray-700 rounded"
                        placeholder="Titre de l'effet"
                      />
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap"
                        style={{ color: r.couleur, border: `1px solid ${r.couleur}55` }}
                        title={`Couvre ${r.pct}% du dé`}
                      >
                        {r.label} · {r.pct}%
                      </span>
                      <button
                        type="button"
                        onClick={() => supprimerEffet(i)}
                        className="text-red-400 hover:text-red-300 px-1.5 py-0.5 text-xs"
                        title="Supprimer cet effet"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      value={e.description}
                      onChange={(ev) => updateEffet(i, { description: ev.target.value })}
                      className="w-full p-1.5 text-xs bg-gray-900 border border-gray-700 rounded"
                      placeholder="Description"
                      rows={2}
                    />
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setVue('liste'); setEditId(null) }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm uppercase tracking-wider"
              >
                Annuler
              </button>
              {editId !== 'new' && (
                <button
                  type="button"
                  onClick={supprimerTable}
                  className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded text-sm uppercase tracking-wider"
                >
                  🗑️ Supprimer
                </button>
              )}
              <button
                type="button"
                onClick={sauver}
                className="ml-auto px-4 py-2 bg-[#C9A84C] text-[#0a0b0d] font-bold rounded hover:bg-[#d4b558] text-sm uppercase tracking-wider"
              >
                💾 Sauver
              </button>
            </div>
          </div>
        )}

        {/* Résultat du roll (overlay flottant) */}
        {rollResult && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setRollResult(null)}
          >
            <div
              className="grim-card p-6 max-w-md w-full text-center"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="text-5xl font-bold text-[#C9A84C] mb-2">{rollResult.valeur}</div>
              {rollResult.effet ? (
                <>
                  <div className="text-xl font-bold text-white mb-1">{rollResult.effet.titre || '—'}</div>
                  <div className="text-sm text-[#a8a8b0]">{rollResult.effet.description}</div>
                </>
              ) : (
                <div className="text-sm text-gray-400 italic">Aucun effet ne couvre cette valeur.</div>
              )}
              <button
                type="button"
                onClick={() => setRollResult(null)}
                className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
