'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// ROADMAP V1 — Phase 3.6 : Gestion du contenu officiel
// ----------------------------------------------------------------------------
// L'admin marque des contenus comme « officiels / vérifiés » (colonne officiel,
// lisible par tous via RLS). Le contenu officiel apparaît ensuite pour tous les
// utilisateurs (bibliothèque). La RLS n'autorisant l'admin qu'à lire son propre
// contenu (+ l'officiel), on travaille sur le contenu créé par le compte admin.
// ============================================================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminGuard from '@/app/components/AdminGuard'
import { toast } from '@/app/components/ui/Toast'

type TypeContenu = 'scenarios' | 'ennemis' | 'sorts' | 'items' | 'pnj'
type Item = { id: string; nom: string; officiel: boolean }

const TABS: { k: TypeContenu; label: string; icon: string }[] = [
  { k: 'scenarios', label: 'Scénarios', icon: '📖' },
  { k: 'ennemis', label: 'Ennemis', icon: '👹' },
  { k: 'sorts', label: 'Sorts', icon: '✨' },
  { k: 'items', label: 'Items', icon: '🎒' },
  { k: 'pnj', label: 'PNJ', icon: '🧑' }
]

export default function AdminContenuPage() {
  const [tab, setTab] = useState<TypeContenu>('scenarios')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setErreur(null)
    void (async () => {
      const { data, error } = await supabase
        .from(tab)
        .select('id, nom, officiel')
        .order('nom', { ascending: true })
        .limit(200)
      if (error) setErreur(error.message)
      else setItems((data ?? []) as Item[])
      setLoading(false)
    })()
  }, [tab])

  const basculer = async (it: Item) => {
    setItems((is) => is.map((x) => (x.id === it.id ? { ...x, officiel: !x.officiel } : x)))
    const { error } = await supabase.from(tab).update({ officiel: !it.officiel }).eq('id', it.id)
    if (error) toast.error(error.message)
  }

  return (
    <AdminGuard titre="⭐ Contenu officiel">
      <p className="text-xs text-gray-500 mb-3">
        Marque ton contenu comme « officiel » : il devient visible et importable par tous les
        utilisateurs dans la bibliothèque.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {TABS.map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k)}
            className={`px-3 py-1.5 rounded text-sm ${tab === t.k ? 'bg-[#C9A84C] text-[#0a0b0d] font-bold' : 'bg-gray-800 text-gray-300'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : erreur ? (
        <p className="text-red-300 text-sm">Erreur : {erreur}<br /><span className="text-gray-500 text-xs">(La migration admin_v1 est-elle appliquée ?)</span></p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm italic">Aucun contenu de ce type accessible.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 rounded p-2.5 border border-[rgba(201,168,76,0.15)] bg-[rgba(0,0,0,0.25)]">
              <span className="text-sm text-gray-200 truncate flex items-center gap-1.5">
                {it.officiel && <span title="Officiel">⭐</span>}
                {it.nom}
              </span>
              <button
                type="button"
                onClick={() => basculer(it)}
                className={`text-xs px-2.5 py-1 rounded flex-shrink-0 ${it.officiel ? 'bg-[#C9A84C] text-[#0a0b0d] font-bold' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
              >
                {it.officiel ? '⭐ Officiel' : 'Marquer officiel'}
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminGuard>
  )
}
