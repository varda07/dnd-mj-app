'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// ROADMAP V1 — Phase 3.2 : Annonces globales
// ----------------------------------------------------------------------------
// L'admin pousse une annonce lue par tous les utilisateurs (cloche 🔔 via la
// table annonces_globales, fusionnée dans NotificationCenter). Historique +
// activation/désactivation.
// ============================================================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminGuard from '@/app/components/AdminGuard'
import { toast } from '@/app/components/ui/Toast'

type TypeAnnonce = 'info' | 'maintenance' | 'nouveaute'
type Annonce = {
  id: string
  titre: string
  message: string
  type: TypeAnnonce
  lien: string | null
  active: boolean
  created_at: string
}

const TYPE_LABEL: Record<TypeAnnonce, string> = {
  info: 'ℹ️ Info',
  maintenance: '🔧 Maintenance',
  nouveaute: '🎉 Nouveauté'
}

export default function AdminAnnoncesPage() {
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [loading, setLoading] = useState(true)
  const [titre, setTitre] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<TypeAnnonce>('info')
  const [lien, setLien] = useState('')

  const charger = async () => {
    const { data } = await supabase
      .from('annonces_globales')
      .select('*')
      .order('created_at', { ascending: false })
    setAnnonces((data ?? []) as Annonce[])
    setLoading(false)
  }

  useEffect(() => { void charger() }, [])

  const publier = async () => {
    if (!titre.trim()) return toast.error('Donne un titre à l\'annonce.')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('annonces_globales').insert({
      auteur_id: user?.id ?? null,
      titre: titre.trim(),
      message: message.trim(),
      type,
      lien: lien.trim() || null,
      active: true
    })
    if (error) return toast.error(error.message)
    toast.success('Annonce publiée pour tous les utilisateurs.')
    setTitre(''); setMessage(''); setLien(''); setType('info')
    void charger()
  }

  const basculerActive = async (a: Annonce) => {
    setAnnonces((as) => as.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x)))
    const { error } = await supabase.from('annonces_globales').update({ active: !a.active }).eq('id', a.id)
    if (error) toast.error(error.message)
  }

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return
    setAnnonces((as) => as.filter((x) => x.id !== id))
    await supabase.from('annonces_globales').delete().eq('id', id)
  }

  return (
    <AdminGuard titre="📣 Annonces">
      <div className="grim-card p-4 space-y-2 mb-5">
        <h2 className="text-[#C9A84C] font-bold text-sm">Nouvelle annonce</h2>
        <input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre"
          className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-[#C9A84C] text-sm"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message (facultatif)"
          rows={3}
          className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-[#C9A84C] text-sm"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TypeAnnonce)}
            className="p-2 rounded bg-gray-800 text-white border border-gray-700 text-sm"
          >
            {(Object.keys(TYPE_LABEL) as TypeAnnonce[]).map((k) => (
              <option key={k} value={k}>{TYPE_LABEL[k]}</option>
            ))}
          </select>
          <input
            value={lien}
            onChange={(e) => setLien(e.target.value)}
            placeholder="Lien (facultatif) ex. /dashboard/nouveautes"
            className="p-2 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-[#C9A84C] text-sm"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={publier}
            className="px-4 py-2 bg-[#C9A84C] text-[#0a0b0d] font-bold rounded hover:bg-[#d4b558] text-sm uppercase tracking-wider"
          >
            📣 Publier
          </button>
        </div>
      </div>

      <h2 className="text-sm uppercase tracking-wider text-[#6a6a72] mb-2">Historique</h2>
      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : annonces.length === 0 ? (
        <p className="text-gray-500 text-sm italic">Aucune annonce envoyée.</p>
      ) : (
        <div className="space-y-2">
          {annonces.map((a) => (
            <div key={a.id} className={`grim-card p-3 ${a.active ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="text-white font-bold text-sm">{TYPE_LABEL[a.type]} · {a.titre}</div>
                  {a.message && <div className="text-gray-300 text-xs mt-0.5 whitespace-pre-wrap">{a.message}</div>}
                  <div className="text-[10px] text-gray-500 mt-1">
                    {new Date(a.created_at).toLocaleString('fr-FR')}
                    {a.lien ? ` · 🔗 ${a.lien}` : ''}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => basculerActive(a)}
                    className={`text-xs px-2 py-1 rounded ${a.active ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
                  >
                    {a.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => supprimer(a.id)}
                    className="text-xs px-2 py-1 rounded bg-red-900 hover:bg-red-800 text-white"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminGuard>
  )
}
