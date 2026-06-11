'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap Finalisation Phase 5.4 — Console admin des retours
// ----------------------------------------------------------------------------
// Réservée aux comptes profiles.is_admin = true. Liste TOUS les retours, avec
// filtres (catégorie/statut), changement de statut, et réponse/note interne.
// La RLS (feedback_select_own_or_admin / feedback_update_admin) garantit que
// seuls les admins voient et modifient les retours des autres utilisateurs.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'

type Categorie = 'probleme' | 'suggestion'
type Statut = 'nouveau' | 'en_cours' | 'resolu'

type FeedbackRow = {
  id: string
  user_id: string
  categorie: Categorie
  titre: string
  description: string
  statut: Statut
  metadonnees: Record<string, unknown> | null
  reponse_admin: string | null
  created_at: string
  updated_at: string
}

const STATUTS: Statut[] = ['nouveau', 'en_cours', 'resolu']
const STATUT_LABEL: Record<Statut, string> = {
  nouveau: '🆕 Nouveau',
  en_cours: '🔄 En cours',
  resolu: '✅ Résolu',
}

export default function AdminFeedbackPage() {
  const router = useRouter()
  const [autorise, setAutorise] = useState<boolean | null>(null) // null = en cours de vérif
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [filtreCat, setFiltreCat] = useState<'all' | Categorie>('all')
  const [filtreStatut, setFiltreStatut] = useState<'all' | Statut>('all')
  const [loading, setLoading] = useState(true)
  // Section « Traités » repliée par défaut.
  const [traitesOuverts, setTraitesOuverts] = useState(false)

  const charger = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.is_admin) {
      setAutorise(false)
      setLoading(false)
      return
    }
    setAutorise(true)
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    setRows((data ?? []) as FeedbackRow[])
    setLoading(false)
  }, [router])

  useEffect(() => { void charger() }, [charger])

  const changerStatut = async (id: string, statut: Statut) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, statut } : r)))
    const { error } = await supabase.from('feedback').update({ statut }).eq('id', id)
    if (error) toast.error(error.message)
  }

  const enregistrerReponse = async (id: string, reponse_admin: string) => {
    const { error } = await supabase.from('feedback').update({ reponse_admin }).eq('id', id)
    if (error) toast.error(error.message)
    else toast.success('Réponse enregistrée')
  }

  if (autorise === false) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">⛔ Accès réservé aux administrateurs.</p>
        <button type="button" onClick={() => router.push('/dashboard')} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm">
          Retour au dashboard
        </button>
      </main>
    )
  }

  const filtres = rows.filter(
    (r) => (filtreCat === 'all' || r.categorie === filtreCat) && (filtreStatut === 'all' || r.statut === filtreStatut)
  )
  // Non traités = nouveau OU en cours (restent en haut, pleine taille).
  const nonTraites = filtres.filter((r) => r.statut !== 'resolu')
  // Traités = résolu (descendent dans la section repliable du bas).
  const traites = filtres.filter((r) => r.statut === 'resolu')
  // Compteur global des retours encore à traiter (indépendant des filtres).
  const nbNonTraites = rows.filter((r) => r.statut !== 'resolu').length

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button type="button" onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white text-sm">
            ← Dashboard
          </button>
          <h1 className="text-2xl grim-title">🛡 Retours (admin)</h1>
          <span
            className={`text-xs font-bold px-2 py-1 rounded ${
              nbNonTraites > 0 ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {nbNonTraites > 0 ? `${nbNonTraites} à traiter` : '✅ Tout est traité'}
          </span>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select value={filtreCat} onChange={(e) => setFiltreCat(e.target.value as 'all' | Categorie)}
            className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm">
            <option value="all">Toutes catégories</option>
            <option value="probleme">🐛 Problèmes</option>
            <option value="suggestion">💡 Suggestions</option>
          </select>
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value as 'all' | Statut)}
            className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm">
            <option value="all">Tous statuts</option>
            {STATUTS.map((s) => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
          </select>
          <span className="text-xs text-gray-500 self-center">{filtres.length} affiché(s)</span>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Chargement…</p>
        ) : filtres.length === 0 ? (
          <p className="text-gray-500 text-sm italic">Aucun retour pour ces filtres.</p>
        ) : (
          <>
            {/* À traiter — en haut, pleine taille */}
            {nonTraites.length === 0 ? (
              <p className="text-gray-500 text-sm italic mb-4">Aucun retour à traiter pour ces filtres. 🎉</p>
            ) : (
              <div className="space-y-3">
                {nonTraites.map((f) => (
                  <AdminCard key={f.id} f={f} onStatut={changerStatut} onReponse={enregistrerReponse} />
                ))}
              </div>
            )}

            {/* Traités — section repliable en bas */}
            {traites.length > 0 && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setTraitesOuverts((o) => !o)}
                  aria-expanded={traitesOuverts}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded bg-gray-800/60 border border-gray-700 hover:border-emerald-600/40 text-left transition"
                >
                  <span className="text-sm font-bold text-emerald-300">✅ Traités ({traites.length})</span>
                  <span className="ml-auto text-xs text-gray-500">{traitesOuverts ? '▾ Masquer' : '▸ Afficher'}</span>
                </button>
                {traitesOuverts && (
                  <div className="space-y-3 mt-3 opacity-80">
                    {traites.map((f) => (
                      <AdminCard key={f.id} f={f} onStatut={changerStatut} onReponse={enregistrerReponse} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function AdminCard({
  f,
  onStatut,
  onReponse,
}: {
  f: FeedbackRow
  onStatut: (id: string, statut: Statut) => void
  onReponse: (id: string, reponse: string) => void
}) {
  const [reponse, setReponse] = useState(f.reponse_admin ?? '')
  const [detailsOuverts, setDetailsOuverts] = useState(false)

  return (
    <div className="grim-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">
            {f.categorie === 'probleme' ? '🐛' : '💡'} {f.titre}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {new Date(f.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        </div>
        <select
          value={f.statut}
          onChange={(e) => onStatut(f.id, e.target.value as Statut)}
          className="p-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs"
        >
          {STATUTS.map((s) => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
        </select>
      </div>

      {f.description && <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">{f.description}</p>}

      {/* Métadonnées techniques */}
      <button
        type="button"
        onClick={() => setDetailsOuverts((o) => !o)}
        className="text-[11px] text-gray-500 hover:text-gray-300"
      >
        {detailsOuverts ? '▾' : '▸'} Détails techniques
      </button>
      {detailsOuverts && f.metadonnees && (
        <ul className="mt-1 text-[11px] text-gray-500 space-y-0.5">
          {Object.entries(f.metadonnees).map(([k, v]) => (
            <li key={k} className="break-words"><span className="text-gray-400">{k} :</span> {String(v)}</li>
          ))}
        </ul>
      )}

      {/* Réponse / note interne */}
      <div className="mt-3 border-t border-gray-700/40 pt-2">
        <textarea
          value={reponse}
          onChange={(e) => setReponse(e.target.value)}
          placeholder="Réponse / note interne (visible par l'utilisateur)…"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white text-xs h-16"
        />
        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={() => onReponse(f.id, reponse.trim())}
            className="text-xs px-3 py-1.5 rounded bg-yellow-500 text-gray-900 font-bold hover:bg-yellow-400"
          >
            Enregistrer la réponse
          </button>
        </div>
      </div>
    </div>
  )
}
