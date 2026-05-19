'use client'

// ============================================================================
// Roadmap Phase 5.4 — Tables d'effets custom
// ============================================================================
// Page minimale de gestion des tables d'effets personnalisées (alternatives
// à la table Wild Magic officielle). Chaque table est une liste d'effets
// {min, max, titre, description}.
// ============================================================================

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Effet = { min: number; max: number; titre: string; description: string }
type TableCustom = {
  id: string
  nom: string
  description: string | null
  effets: Effet[]
}

export default function TablesEffetsPage() {
  const router = useRouter()
  const [tables, setTables] = useState<TableCustom[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [desc, setDesc] = useState('')
  const [effets, setEffets] = useState<Effet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data } = await supabase
        .from('tables_effets_custom')
        .select('id, nom, description, effets')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setTables(
        (data ?? []).map((t: { id: string; nom: string; description: string | null; effets: unknown }) => ({
          id: t.id,
          nom: t.nom,
          description: t.description,
          effets: Array.isArray(t.effets) ? (t.effets as Effet[]) : []
        }))
      )
      setLoading(false)
    }
    void load()
  }, [router])

  const nouvelleTable = () => {
    setEditId('new')
    setNom('')
    setDesc('')
    setEffets([{ min: 1, max: 1, titre: '', description: '' }])
  }

  const ouvrirTable = (t: TableCustom) => {
    setEditId(t.id)
    setNom(t.nom)
    setDesc(t.description ?? '')
    setEffets(t.effets.length > 0 ? t.effets : [{ min: 1, max: 1, titre: '', description: '' }])
  }

  const ajouterEffet = () => {
    const dernier = effets[effets.length - 1]
    const nextMin = dernier ? dernier.max + 1 : 1
    setEffets([...effets, { min: nextMin, max: nextMin, titre: '', description: '' }])
  }

  const updateEffet = (i: number, patch: Partial<Effet>) => {
    setEffets(effets.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))
  }

  const supprimerEffet = (i: number) => {
    setEffets(effets.filter((_, idx) => idx !== i))
  }

  const sauver = async () => {
    if (!nom.trim()) return alert('Donne un nom à la table.')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (editId === 'new') {
      const { error } = await supabase.from('tables_effets_custom').insert({
        user_id: user.id,
        nom: nom.trim(),
        description: desc.trim() || null,
        effets
      })
      if (error) return alert(error.message)
    } else if (editId) {
      const { error } = await supabase
        .from('tables_effets_custom')
        .update({ nom: nom.trim(), description: desc.trim() || null, effets })
        .eq('id', editId)
      if (error) return alert(error.message)
    }
    setEditId(null)
    setLoading(true)
    // reload
    const { data } = await supabase
      .from('tables_effets_custom')
      .select('id, nom, description, effets')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setTables(
      (data ?? []).map((t: { id: string; nom: string; description: string | null; effets: unknown }) => ({
        id: t.id,
        nom: t.nom,
        description: t.description,
        effets: Array.isArray(t.effets) ? (t.effets as Effet[]) : []
      }))
    )
    setLoading(false)
  }

  const supprimerTable = async () => {
    if (!editId || editId === 'new') return setEditId(null)
    if (!confirm('Supprimer cette table d\'effets ?')) return
    await supabase.from('tables_effets_custom').delete().eq('id', editId)
    setEditId(null)
    setTables(tables.filter((t) => t.id !== editId))
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Retour
          </button>
          <h1 className="text-2xl grim-title">✨ Tables d'effets personnalisées</h1>
        </div>

        {editId === null ? (
          <>
            <button
              type="button"
              onClick={nouvelleTable}
              className="px-4 py-2 bg-[#C9A84C] text-[#0a0b0d] font-bold rounded hover:bg-[#d4b558] mb-4 text-sm uppercase tracking-wider"
            >
              + Créer une table
            </button>
            {loading ? (
              <p className="text-gray-400 italic">Chargement…</p>
            ) : tables.length === 0 ? (
              <p className="text-gray-500 italic">
                Aucune table custom. Crée la première pour avoir tes propres effets aléatoires (Wild Magic alternatif, items magiques, etc.).
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => ouvrirTable(t)}
                    className="text-left rounded p-3 border border-[rgba(201,168,76,0.20)] bg-[rgba(0,0,0,0.30)] hover:border-[#C9A84C] hover:bg-[rgba(201,168,76,0.05)] transition-all"
                  >
                    <div className="text-[#C9A84C] font-bold mb-1">{t.nom}</div>
                    <div className="text-[11px] text-[#a8a8b0] line-clamp-2">{t.description ?? '—'}</div>
                    <div className="text-[10px] text-[#6a6a72] mt-1.5">
                      {t.effets.length} effet{t.effets.length > 1 ? 's' : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
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
            </div>

            <div className="grim-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[#C9A84C] font-bold text-sm">Effets</h3>
                <button
                  type="button"
                  onClick={ajouterEffet}
                  className="px-2 py-1 text-xs bg-emerald-700 hover:bg-emerald-600 rounded text-white"
                >
                  + Ajouter
                </button>
              </div>
              {effets.map((e, i) => (
                <div key={i} className="rounded border border-gray-700 bg-gray-800/50 p-2 space-y-1">
                  <div className="flex gap-2 items-center">
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
                      className="flex-1 p-1 text-sm bg-gray-900 border border-gray-700 rounded"
                      placeholder="Titre de l'effet"
                    />
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
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditId(null)}
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
      </div>
    </main>
  )
}
