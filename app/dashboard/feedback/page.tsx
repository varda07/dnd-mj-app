'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap Finalisation Phase 5 — Page de feedback (problèmes & suggestions)
// ----------------------------------------------------------------------------
// 5.1 formulaire + collecte de métadonnées techniques
// 5.3 suivi côté utilisateur (« Mes retours » avec statut)
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Categorie = 'probleme' | 'suggestion'
type Statut = 'nouveau' | 'en_cours' | 'resolu'

type FeedbackRow = {
  id: string
  categorie: Categorie
  titre: string
  description: string
  statut: Statut
  reponse_admin: string | null
  created_at: string
}

const STATUT_LABEL: Record<Statut, string> = {
  nouveau: '🆕 Nouveau',
  en_cours: '🔄 En cours',
  resolu: '✅ Résolu',
}

export default function FeedbackPage() {
  const router = useRouter()
  const [categorie, setCategorie] = useState<Categorie>('probleme')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [confirme, setConfirme] = useState(false)
  const [erreur, setErreur] = useState('')
  const [mesRetours, setMesRetours] = useState<FeedbackRow[]>([])
  const [estAdmin, setEstAdmin] = useState(false)

  const chargerMesRetours = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const [{ data }, { data: profile }] = await Promise.all([
      supabase
        .from('feedback')
        .select('id, categorie, titre, description, statut, reponse_admin, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
    ])
    setMesRetours((data ?? []) as FeedbackRow[])
    setEstAdmin(!!profile?.is_admin)
  }, [router])

  useEffect(() => { void chargerMesRetours() }, [chargerMesRetours])

  const collecterMetadonnees = () => {
    if (typeof window === 'undefined') return {}
    return {
      // Page d'où vient l'utilisateur (avant d'ouvrir le formulaire).
      route: document.referrer || '(accès direct)',
      user_agent: navigator.userAgent,
      ecran: `${window.screen.width}×${window.screen.height} (vue ${window.innerWidth}×${window.innerHeight})`,
      langue: navigator.language,
    }
  }

  const soumettre = async () => {
    setErreur('')
    if (!titre.trim()) { setErreur('Donne un titre court à ton retour.'); return }
    setEnvoi(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setEnvoi(false); router.push('/'); return }
    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      categorie,
      titre: titre.trim(),
      description: description.trim(),
      metadonnees: collecterMetadonnees(),
    })
    setEnvoi(false)
    if (error) { setErreur(error.message); return }
    setConfirme(true)
    setTitre('')
    setDescription('')
    void chargerMesRetours()
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">
            ← Retour
          </button>
          <h1 className="text-2xl grim-title">💬 Retours & suggestions</h1>
          {estAdmin && (
            <button
              type="button"
              onClick={() => router.push('/dashboard/admin/feedback')}
              className="md:ml-auto px-3 py-2 rounded font-bold bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25 text-sm transition"
              title="Console d'administration des retours"
            >
              🛡 Console admin
            </button>
          )}
        </div>

        <p className="text-gray-400 text-sm mb-5 leading-relaxed">
          Un bug, une idée d&apos;amélioration ? Dis-nous tout. Quelques informations
          techniques (page, navigateur, taille d&apos;écran) sont jointes automatiquement
          pour nous aider à reproduire les problèmes.
        </p>

        {confirme ? (
          <div className="grim-card p-5 mb-6 border border-emerald-600/50">
            <p className="text-emerald-300 font-bold mb-2">✅ Merci, ton retour a bien été envoyé !</p>
            <p className="text-gray-400 text-sm mb-3">
              Tu peux suivre son statut ci-dessous. On te recontactera si besoin.
            </p>
            <button
              type="button"
              onClick={() => setConfirme(false)}
              className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold text-sm hover:bg-yellow-400"
            >
              Envoyer un autre retour
            </button>
          </div>
        ) : (
          <div className="grim-card p-5 mb-8 space-y-4">
            {/* Catégorie */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.18em] text-gray-400 block mb-2">Catégorie</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'probleme' as const, label: '🐛 Problème', desc: 'Un bug, une erreur' },
                  { key: 'suggestion' as const, label: '💡 Suggestion', desc: 'Une idée, une amélioration' },
                ]).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategorie(c.key)}
                    className={`text-left p-3 rounded-md border transition ${
                      categorie === c.key
                        ? 'bg-yellow-500/10 border-yellow-500'
                        : 'bg-gray-900/40 border-gray-700 hover:border-yellow-600/60'
                    }`}
                  >
                    <p className="text-sm font-bold text-white">{c.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Titre */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.18em] text-gray-400 block mb-1">Titre</label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                maxLength={120}
                placeholder="Ex : Le bouton « Lancer le combat » ne réagit pas"
                className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-yellow-500 text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.18em] text-gray-400 block mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
                placeholder="Décris le problème ou ton idée en détail (étapes pour reproduire, comportement attendu…)."
                className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-yellow-500 text-sm h-32"
              />
            </div>

            {erreur && <p className="text-red-400 text-sm">{erreur}</p>}

            <button
              type="button"
              onClick={soumettre}
              disabled={envoi}
              className="w-full p-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 disabled:opacity-50"
            >
              {envoi ? 'Envoi…' : 'Envoyer le retour'}
            </button>
          </div>
        )}

        {/* 5.3 — Mes retours */}
        <h2 className="text-lg grim-h2 mb-3">📋 Mes retours</h2>
        {mesRetours.length === 0 ? (
          <p className="text-gray-500 text-sm italic">Tu n&apos;as pas encore envoyé de retour.</p>
        ) : (
          <div className="space-y-3">
            {mesRetours.map((f) => (
              <div key={f.id} className="grim-card p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">
                      {f.categorie === 'probleme' ? '🐛' : '💡'} {f.titre}
                    </p>
                    {f.description && (
                      <p className="text-gray-400 text-xs mt-1 line-clamp-3">{f.description}</p>
                    )}
                    <p className="text-[10px] text-gray-500 mt-1">
                      {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-1 rounded whitespace-nowrap ${
                      f.statut === 'resolu'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : f.statut === 'en_cours'
                        ? 'bg-yellow-500/15 text-yellow-300'
                        : 'bg-gray-700/50 text-gray-300'
                    }`}
                  >
                    {STATUT_LABEL[f.statut]}
                  </span>
                </div>
                {f.reponse_admin && (
                  <div className="mt-2 border-t border-gray-700/40 pt-2 text-xs text-gray-300">
                    <span className="text-yellow-400 font-bold">Réponse :</span> {f.reponse_admin}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
