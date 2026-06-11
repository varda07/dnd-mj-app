'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap Modes 3.8 + 3.9 — Templates de donjons (perso + communauté)
// ----------------------------------------------------------------------------
// Page de gestion de la bibliothèque perso de templates de donjons + browse
// de templates publics partagés.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import EmptyState from '@/app/components/ui/EmptyState'
import { SkeletonList } from '@/app/components/ui/Skeleton'
import { toast } from '@/app/components/ui/Toast'
import { confirmDialog } from '@/app/components/ui/ConfirmDialog'

type TemplateDonjon = {
  id: string
  user_id: string
  nom: string
  description: string
  contenu: Record<string, unknown>
  public: boolean
  nb_copies: number
  auteur_username: string | null
  created_at: string
}

export default function TemplatesDonjonsPage() {
  const router = useRouter()
  const [vue, setVue] = useState<'mine' | 'communaute'>('mine')
  const [mine, setMine] = useState<TemplateDonjon[]>([])
  const [communaute, setCommunaute] = useState<TemplateDonjon[]>([])
  const [loading, setLoading] = useState(true)

  const charger = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from('templates_donjons').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('templates_donjons').select('*').eq('public', true).order('nb_copies', { ascending: false }).limit(40),
    ])
    setMine((m ?? []) as TemplateDonjon[])
    setCommunaute((c ?? []) as TemplateDonjon[])
    setLoading(false)
  }, [router])

  useEffect(() => { void charger() }, [charger])

  const togglerPublic = async (t: TemplateDonjon) => {
    let auteur = t.auteur_username
    if (!t.public && !auteur) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
        auteur = (profile?.username as string | undefined) ?? user.email ?? 'Anonyme'
      }
    }
    await supabase.from('templates_donjons').update({ public: !t.public, auteur_username: auteur }).eq('id', t.id)
    toast.success(!t.public ? 'Template partagé à la communauté' : 'Template repassé en privé')
    void charger()
  }

  const importer = async (t: TemplateDonjon) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('templates_donjons').insert({
      user_id: user.id,
      nom: `${t.nom} (importé)`,
      description: t.description,
      contenu: t.contenu,
    })
    if (error) toast.error(error.message)
    else {
      toast.success('Template ajouté à ta bibliothèque')
      await supabase.from('templates_donjons').update({ nb_copies: t.nb_copies + 1 }).eq('id', t.id)
      void charger()
    }
  }

  const supprimer = async (t: TemplateDonjon) => {
    const ok = await confirmDialog({ title: 'Supprimer ce template ?', message: t.nom, destructive: true })
    if (!ok) return
    await supabase.from('templates_donjons').delete().eq('id', t.id)
    void charger()
  }

  const liste = vue === 'mine' ? mine : communaute

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white">← Retour</button>
          <h1 className="text-2xl grim-title">🏰 Templates de donjons</h1>
        </div>

        <div className="flex bg-gray-800 rounded-lg p-1 mb-6 w-fit">
          <button type="button" onClick={() => setVue('mine')}
            className={`px-4 py-2 rounded-md text-sm font-bold ${vue === 'mine' ? 'bg-yellow-500 text-gray-900' : 'text-gray-400'}`}>
            💾 Mes templates ({mine.length})
          </button>
          <button type="button" onClick={() => setVue('communaute')}
            className={`px-4 py-2 rounded-md text-sm font-bold ${vue === 'communaute' ? 'bg-yellow-500 text-gray-900' : 'text-gray-400'}`}>
            🌍 Communauté ({communaute.length})
          </button>
        </div>

        {loading ? <SkeletonList count={4} /> : liste.length === 0 ? (
          <EmptyState
            icon="🏰"
            title={vue === 'mine' ? 'Aucun template' : 'Aucun template partagé'}
            message={vue === 'mine'
              ? 'Crée un donjon dans l\'éditeur puis « Sauvegarder comme template ».'
              : 'Aucun MJ n\'a encore partagé de donjon. Sois le premier !'}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liste.map((t) => (
              <div key={t.id} className="codex-card codex-card-hover p-4">
                <div className="text-yellow-300 font-serif text-lg mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                  🏰 {t.nom}
                </div>
                {t.description && <p className="text-xs text-gray-400 mb-2 line-clamp-3">{t.description}</p>}
                <div className="text-[10px] text-gray-500 mb-2">
                  {vue === 'communaute' && t.auteur_username && <>par {t.auteur_username} · </>}
                  {t.nb_copies} import{t.nb_copies > 1 ? 's' : ''}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {vue === 'mine' ? (
                    <>
                      <button type="button" onClick={() => togglerPublic(t)}
                        className={`text-[11px] px-2 py-1 rounded border ${t.public ? 'bg-green-500/10 border-green-400/40 text-green-200' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
                        {t.public ? '🌍 Public' : '🔒 Privé'}
                      </button>
                      <button type="button" onClick={() => supprimer(t)} className="text-[11px] px-2 py-1 rounded text-red-400 hover:bg-red-500/10">
                        🗑 Supprimer
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => importer(t)}
                      className="text-[11px] px-2 py-1 rounded bg-yellow-500/15 border border-yellow-500/40 text-yellow-200">
                      ⬇ Importer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
