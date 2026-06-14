'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// ROADMAP V1 — Phase 3.4 : Modération communauté
// ----------------------------------------------------------------------------
// Liste les signalements (table signalements, RLS admin). Filtres par type et
// statut, changement de statut (traité / rejeté), note interne, compteur en
// attente.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminGuard from '@/app/components/AdminGuard'
import { toast } from '@/app/components/ui/Toast'

type Statut = 'nouveau' | 'traite' | 'rejete'
type Raison = 'inapproprie' | 'spam' | 'plagiat' | 'autre'
type Signalement = {
  id: string
  user_id: string
  contenu_type: string
  contenu_id: string
  raison: Raison
  description: string
  statut: Statut
  note_admin: string | null
  created_at: string
}

const RAISON_LABEL: Record<Raison, string> = {
  inapproprie: 'Inapproprié', spam: 'Spam', plagiat: 'Plagiat', autre: 'Autre'
}
const STATUT_LABEL: Record<Statut, string> = {
  nouveau: '🆕 Nouveau', traite: '✅ Traité', rejete: '🚫 Rejeté'
}

export default function AdminModerationPage() {
  const [rows, setRows] = useState<Signalement[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreStatut, setFiltreStatut] = useState<'all' | Statut>('nouveau')
  const [filtreType, setFiltreType] = useState<'all' | string>('all')

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('signalements')
        .select('*')
        .order('created_at', { ascending: false })
      setRows((data ?? []) as Signalement[])
      setLoading(false)
    })()
  }, [])

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.contenu_type))), [rows])
  const nbAttente = rows.filter((r) => r.statut === 'nouveau').length

  const filtres = rows.filter(
    (r) => (filtreStatut === 'all' || r.statut === filtreStatut) && (filtreType === 'all' || r.contenu_type === filtreType)
  )

  const changerStatut = async (id: string, statut: Statut) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, statut } : r)))
    const { error } = await supabase.from('signalements').update({ statut }).eq('id', id)
    if (error) toast.error(error.message)
  }

  const enregistrerNote = async (id: string, note_admin: string) => {
    const { error } = await supabase.from('signalements').update({ note_admin }).eq('id', id)
    if (error) toast.error(error.message)
    else toast.success('Note enregistrée')
  }

  return (
    <AdminGuard titre="🚩 Modération">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`text-xs font-bold px-2 py-1 rounded ${nbAttente > 0 ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
          {nbAttente > 0 ? `${nbAttente} en attente` : '✅ Rien à traiter'}
        </span>
        <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value as 'all' | Statut)}
          className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm">
          <option value="all">Tous statuts</option>
          {(Object.keys(STATUT_LABEL) as Statut[]).map((s) => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
        </select>
        <select value={filtreType} onChange={(e) => setFiltreType(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm">
          <option value="all">Tous types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : filtres.length === 0 ? (
        <p className="text-gray-500 text-sm italic">Aucun signalement pour ces filtres.</p>
      ) : (
        <div className="space-y-3">
          {filtres.map((s) => (
            <ModCard key={s.id} s={s} onStatut={changerStatut} onNote={enregistrerNote} />
          ))}
        </div>
      )}
    </AdminGuard>
  )
}

function ModCard({
  s, onStatut, onNote
}: {
  s: Signalement
  onStatut: (id: string, statut: Statut) => void
  onNote: (id: string, note: string) => void
}) {
  const [note, setNote] = useState(s.note_admin ?? '')
  return (
    <div className="grim-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">
            🚩 {RAISON_LABEL[s.raison]} · <span className="text-[#C9A84C]">{s.contenu_type}</span>
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5 break-all">
            id: {s.contenu_id} · {new Date(s.created_at).toLocaleString('fr-FR')}
          </p>
        </div>
        <select
          value={s.statut}
          onChange={(e) => onStatut(s.id, e.target.value as Statut)}
          className="p-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs"
        >
          {(Object.keys(STATUT_LABEL) as Statut[]).map((st) => <option key={st} value={st}>{STATUT_LABEL[st]}</option>)}
        </select>
      </div>
      {s.description && <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">{s.description}</p>}
      <div className="border-t border-gray-700/40 pt-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note interne de modération…"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white text-xs h-14"
        />
        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={() => onNote(s.id, note.trim())}
            className="text-xs px-3 py-1.5 rounded bg-yellow-500 text-gray-900 font-bold hover:bg-yellow-400"
          >
            Enregistrer la note
          </button>
        </div>
      </div>
    </div>
  )
}
