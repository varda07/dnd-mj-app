'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// ROADMAP V1 — Phase 3.7 : Feature flags (admin)
// ----------------------------------------------------------------------------
// Liste les flags (feature_flags) avec toggle on/off. Permet de créer un flag
// et de désactiver une feature buguée sans redéployer (lecture via
// useFeatureFlag côté client).
// ============================================================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminGuard from '@/app/components/AdminGuard'
import { toast } from '@/app/components/ui/Toast'

type Flag = { id: string; nom: string; actif: boolean; description: string; updated_at: string }

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')

  const charger = async () => {
    const { data } = await supabase
      .from('feature_flags')
      .select('*')
      .order('nom', { ascending: true })
    setFlags((data ?? []) as Flag[])
    setLoading(false)
  }

  useEffect(() => { void charger() }, [])

  const creer = async () => {
    const clean = nom.trim().toLowerCase().replace(/\s+/g, '_')
    if (!clean) return toast.error('Donne un nom au flag.')
    const { error } = await supabase.from('feature_flags').insert({
      nom: clean, description: description.trim(), actif: true
    })
    if (error) return toast.error(error.message)
    setNom(''); setDescription('')
    void charger()
  }

  const basculer = async (f: Flag) => {
    setFlags((fs) => fs.map((x) => (x.id === f.id ? { ...x, actif: !x.actif } : x)))
    const { error } = await supabase
      .from('feature_flags')
      .update({ actif: !f.actif, updated_at: new Date().toISOString() })
      .eq('id', f.id)
    if (error) toast.error(error.message)
  }

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer ce flag ?')) return
    setFlags((fs) => fs.filter((x) => x.id !== id))
    await supabase.from('feature_flags').delete().eq('id', id)
  }

  return (
    <AdminGuard titre="🎚️ Feature flags">
      <div className="grim-card p-4 space-y-2 mb-5">
        <h2 className="text-[#C9A84C] font-bold text-sm">Nouveau flag</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="nom_du_flag (ex. tables_effets)"
            className="p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-[#C9A84C] text-sm"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-[#C9A84C] text-sm"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={creer}
            className="px-4 py-2 bg-[#C9A84C] text-[#0a0b0d] font-bold rounded hover:bg-[#d4b558] text-sm uppercase tracking-wider"
          >
            + Créer
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : flags.length === 0 ? (
        <p className="text-gray-500 text-sm italic">Aucun flag. Crée-en un pour pouvoir activer/désactiver une feature à distance.</p>
      ) : (
        <div className="space-y-2">
          {flags.map((f) => (
            <div key={f.id} className="grim-card p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white font-bold text-sm font-mono">{f.nom}</div>
                {f.description && <div className="text-gray-400 text-xs mt-0.5">{f.description}</div>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => basculer(f)}
                  className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${f.actif ? 'bg-emerald-500' : 'bg-gray-600'}`}
                  aria-pressed={f.actif}
                  title={f.actif ? 'Actif' : 'Désactivé'}
                >
                  <span className={`inline-block w-4 h-4 rounded-full bg-white transition-transform ${f.actif ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => supprimer(f.id)}
                  className="text-xs px-2 py-1 rounded bg-red-900 hover:bg-red-800 text-white"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminGuard>
  )
}
