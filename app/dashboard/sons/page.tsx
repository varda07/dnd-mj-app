'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap Modes 1.6 — Sound Library : page de gestion des sons
// ----------------------------------------------------------------------------
// CRUD des sons par catégorie. URL externe ou upload Storage (bucket 'sons').
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import EmptyState from '@/app/components/ui/EmptyState'
import { SkeletonList } from '@/app/components/ui/Skeleton'
import { toast } from '@/app/components/ui/Toast'
import { confirmDialog } from '@/app/components/ui/ConfirmDialog'

const CATEGORIES = [
  { key: 'combat',      label: '⚔️ Combat' },
  { key: 'exploration', label: '🗺 Exploration' },
  { key: 'dialogue',    label: '💬 Dialogue' },
  { key: 'suspense',    label: '🎭 Suspense' },
  { key: 'repos',       label: '🛏 Repos' },
  { key: 'boss',        label: '🐉 Boss' },
  { key: 'city',        label: '🏛 Ville' },
  { key: 'nature',      label: '🌿 Nature' },
  { key: 'dungeon',     label: '🕳 Donjon' },
  { key: 'horror',      label: '🕯 Horreur' },
] as const

type Categorie = typeof CATEGORIES[number]['key']

type Son = {
  id: string
  user_id: string
  categorie: Categorie
  nom: string
  url: string
  tags: string[]
  volume: number
  created_at: string
}

export default function SonsPage() {
  const router = useRouter()
  const [sons, setSons] = useState<Son[]>([])
  const [loading, setLoading] = useState(true)
  const [categorieActive, setCategorieActive] = useState<Categorie | 'all'>('all')

  const [nom, setNom] = useState('')
  const [url, setUrl] = useState('')
  const [categorie, setCategorie] = useState<Categorie>('combat')
  const [tags, setTags] = useState('')
  const [uploading, setUploading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data, error } = await supabase
      .from('sons_user')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setSons((data ?? []) as Son[])
    setLoading(false)
  }, [router])

  useEffect(() => { void charger() }, [charger])

  const ajouter = async () => {
    if (!nom.trim() || !url.trim()) { toast.error('Nom et URL requis.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('sons_user').insert({
      user_id: user.id,
      categorie,
      nom: nom.trim(),
      url: url.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    if (error) toast.error(error.message)
    else {
      toast.success('Son ajouté à la bibliothèque')
      setNom(''); setUrl(''); setTags('')
      void charger()
    }
  }

  const uploaderFichier = async (file: File) => {
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ext = file.name.split('.').pop() || 'mp3'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('sons').upload(path, file)
      if (error) {
        toast.error(`Upload : ${error.message}. Crée le bucket 'sons' dans Supabase Storage (public read).`)
        return
      }
      const { data: pub } = supabase.storage.from('sons').getPublicUrl(path)
      setUrl(pub.publicUrl)
      if (!nom) setNom(file.name.replace(/\.[^.]+$/, ''))
      toast.success('Fichier uploadé — clique sur Ajouter')
    } finally { setUploading(false) }
  }

  const supprimer = async (s: Son) => {
    const ok = await confirmDialog({
      title: 'Supprimer ce son ?',
      message: `« ${s.nom} » sera retiré de ta bibliothèque.`,
      destructive: true,
    })
    if (!ok) return
    await supabase.from('sons_user').delete().eq('id', s.id)
    toast.success('Supprimé')
    void charger()
  }

  const visibles = categorieActive === 'all'
    ? sons
    : sons.filter((s) => s.categorie === categorieActive)

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white">← Retour</button>
          <h1 className="text-2xl grim-title">🎵 Bibliothèque sonore</h1>
        </div>

        {/* Ajout */}
        <div className="grim-card p-4 mb-6">
          <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-3">Ajouter un son</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du son"
              className="p-2 rounded bg-gray-800 border border-gray-700 text-white" />
            <select value={categorie} onChange={(e) => setCategorie(e.target.value as Categorie)}
              className="p-2 rounded bg-gray-800 border border-gray-700 text-white">
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL .mp3 / .ogg / .wav"
              className="md:col-span-2 p-2 rounded bg-gray-800 border border-gray-700 text-white text-xs font-mono" />
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (séparés par virgules)"
              className="md:col-span-2 p-2 rounded bg-gray-800 border border-gray-700 text-white text-xs" />
            <label className="md:col-span-2 flex items-center gap-2 text-xs text-yellow-300 cursor-pointer">
              {uploading ? '⏳ Upload…' : '📁 Uploader un fichier (Storage bucket "sons")'}
              <input type="file" accept="audio/*" onChange={(e) => { if (e.target.files?.[0]) void uploaderFichier(e.target.files[0]) }}
                className="hidden" />
            </label>
            <button type="button" onClick={ajouter} className="md:col-span-2 px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold codex-btn-press">
              + Ajouter à la bibliothèque
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-1 mb-4">
          <button type="button" onClick={() => setCategorieActive('all')}
            className={`text-xs px-2 py-1 rounded border ${categorieActive === 'all' ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-200' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
          >Toutes ({sons.length})</button>
          {CATEGORIES.map((c) => {
            const n = sons.filter((s) => s.categorie === c.key).length
            return (
              <button key={c.key} type="button" onClick={() => setCategorieActive(c.key)}
                className={`text-xs px-2 py-1 rounded border ${categorieActive === c.key ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-200' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
              >{c.label} {n > 0 ? `(${n})` : ''}</button>
            )
          })}
        </div>

        {/* Liste */}
        {loading ? <SkeletonList count={4} /> : visibles.length === 0 ? (
          <EmptyState icon="🎵" title="Aucun son" message="Ajoute des URLs externes ou upload des fichiers pour construire ta sound library." />
        ) : (
          <div className="flex flex-col gap-2">
            {visibles.map((s) => (
              <div key={s.id} className="codex-card codex-card-hover p-3 flex items-center gap-3">
                <button type="button" onClick={() => setPlayingId(playingId === s.id ? null : s.id)}
                  className="w-9 h-9 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-200 codex-btn-press"
                  title="Preview"
                >
                  {playingId === s.id ? '⏸' : '▶'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-yellow-300 truncate">{s.nom}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {CATEGORIES.find((c) => c.key === s.categorie)?.label} {s.tags.length > 0 ? '· ' + s.tags.join(', ') : ''}
                  </div>
                </div>
                <button type="button" onClick={() => supprimer(s)} className="text-red-400 text-sm hover:bg-red-500/10 rounded p-1">🗑</button>
                {playingId === s.id && (
                  <audio src={s.url} autoPlay loop onError={() => toast.error('Lecture impossible — vérifie l\'URL')} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
