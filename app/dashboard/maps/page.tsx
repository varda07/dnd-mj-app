'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import GuidedTour from '@/app/components/GuidedTour'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { useFocusHighlight } from '@/app/lib/useFocusHighlight'
import ActionMenu from '@/app/components/ui/ActionMenu'
import { FormActions } from '@/app/components/ui/FormKit'
import ImageCropper from '@/app/components/ImageCropper'
import StarFavori from '@/app/components/StarFavori'
import { useFavoris } from '@/app/lib/favoris'
import {
  construireEnveloppe,
  lireFichierJSON,
  nettoyer,
  ouvrirSelecteurFichier,
  slugFichier,
  telechargerJSON,
  validerEnveloppe
} from '@/app/lib/import-export'

type Map = {
  id: string
  nom: string
  description: string
  image_url: string
  public: boolean
  nb_copies: number
  auteur_username: string | null
}

export default function Maps() {
  const router = useRouter()
  const [maps, setMaps] = useState<Map[]>([])
  // V1 3.5 — défilement + surlignage vers la carte ciblée depuis la carte mentale.
  useFocusHighlight(maps.length > 0)
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageActuelle, setImageActuelle] = useState('')
  const [cropperKey, setCropperKey] = useState(0)
  // Chantier fusion : menu « Créer une carte » (dessiner / générer / template).
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [favorisOnly, setFavorisOnly] = useState(false)
  const { est: estFavori } = useFavoris()
  const t = useTranslations('maps')
  const tc = useTranslations('common')

  useEffect(() => {
    fetchMaps()
  }, [])

  const resetForm = () => {
    setNom('')
    setDescription('')
    setFile(null)
    setEditingId(null)
    setImageActuelle('')
    setCropperKey((k) => k + 1)
  }

  const commencerEdition = (map: Map) => {
    setEditingId(map.id)
    setNom(map.nom)
    setDescription(map.description ?? '')
    setImageActuelle(map.image_url ?? '')
    setFile(null)
    setCropperKey((k) => k + 1)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchMaps = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('maps')
      .select('*')
      .eq('mj_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setMaps(data)
  }

  const sauvegarderMap = async () => {
    if (!nom) return setMessage(tc('required'))
    if (!editingId && !file) return setMessage(t('image_required'))
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let imageUrl = imageActuelle
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user?.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('MAP').upload(path, file)
      if (uploadError) {
        setMessage(uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('MAP').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }

    if (editingId) {
      const { error } = await supabase.from('maps').update({
        nom,
        description,
        image_url: imageUrl
      }).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage(t('modified'))
        resetForm()
        fetchMaps()
      }
    } else {
      const { error } = await supabase.from('maps').insert({
        nom,
        description,
        image_url: imageUrl,
        mj_id: user?.id
      })
      if (error) setMessage(error.message)
      else {
        setMessage(t('created'))
        resetForm()
        fetchMaps()
      }
    }
    setLoading(false)
  }

  const supprimerMap = async (id: string) => {
    if (!window.confirm(tc('confirm_delete'))) return
    await supabase.from('maps').delete().eq('id', id)
    fetchMaps()
  }

  const exporterMap = (m: Map) => {
    const env = construireEnveloppe('map', nettoyer(m as unknown as Record<string, unknown>))
    telechargerJSON(`map-${slugFichier(m.nom)}.json`, env)
  }

  const importerMap = () => {
    ouvrirSelecteurFichier(async (f) => {
      try {
        const raw = await lireFichierJSON(f)
        const env = validerEnveloppe<Record<string, unknown>>(raw, ['map'])
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const clean = nettoyer(env.data)
        const nom = typeof clean.nom === 'string' && clean.nom.trim() !== '' ? clean.nom : 'Carte importée'
        const { error } = await supabase.from('maps').insert({ ...clean, nom, mj_id: user.id })
        if (error) throw error
        setMessage(tc('import_ok'))
        fetchMaps()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setMessage(tc('import_error', { message: msg }))
      }
    })
  }

  const togglerPublic = async (map: Map) => {
    const rendrePublic = !map.public
    let auteurUsername = map.auteur_username ?? null
    if (rendrePublic && !auteurUsername) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle()
        auteurUsername = profile?.username ?? user.email ?? 'Anonyme'
      }
    }
    const { error } = await supabase
      .from('maps')
      .update({ public: rendrePublic, auteur_username: auteurUsername })
      .eq('id', map.id)
    if (error) setMessage(error.message)
    else fetchMaps()
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <GuidedTour tourId="maps" />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white">
            {tc('back')}
          </button>
          <h1 className="text-2xl grim-title">{t('title')}</h1>

          {/* Sélecteur unifié « Créer une carte » : dessiner / générer /
              template → tout ouvre l'éditeur unifié (maps/editor). */}
          <div className="ml-auto relative">
            <button
              type="button"
              onClick={() => setCreateMenuOpen((v) => !v)}
              aria-expanded={createMenuOpen}
              className="px-4 py-2 rounded font-bold bg-[#C9A84C] text-gray-900 hover:bg-[#e6c878] text-sm transition"
            >
              ➕ Créer une carte ▾
            </button>
            {createMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setCreateMenuOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 mt-1 z-30 w-64 rounded-lg border border-[#C9A84C]/50 bg-[#15110a] shadow-2xl overflow-hidden">
                  {[
                    { icon: '🎨', label: 'Dessiner (tuiles)', desc: 'Éditeur manuel', href: '/dashboard/maps/editor?tab=draw' },
                    { icon: '🏰', label: 'Générer (procédural)', desc: 'Donjon aléatoire', href: '/dashboard/maps/editor?tab=generate' },
                    { icon: '📚', label: 'Partir d’un template', desc: 'Bibliothèque de donjons', href: '/dashboard/maps/templates' }
                  ].map((opt) => (
                    <button
                      key={opt.href}
                      type="button"
                      onClick={() => {
                        setCreateMenuOpen(false)
                        router.push(opt.href)
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#C9A84C]/10 border-b border-white/5 last:border-b-0"
                    >
                      <p className="text-yellow-100 font-bold text-sm">
                        {opt.icon} {opt.label}
                      </p>
                      <p className="text-gray-500 text-[11px]">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Carte du monde (ex-Hexcrawl) : concept distinct, hors éditeur. */}
          <button
            type="button"
            onClick={() => router.push('/dashboard/maps/hexcrawl')}
            className="px-4 py-2 rounded font-bold bg-[#C9A84C]/15 text-[#e6c878] border border-[#C9A84C] hover:bg-[#C9A84C]/25 text-sm transition"
            title="Explorer le monde en grille hexagonale"
          >
            🧭 Carte du monde
          </button>
        </div>
        <div className="grim-card p-4 md:p-6 mb-6">
          <h2 className="text-lg grim-h2 mb-4">{editingId ? t('edit_title') : t('create_title')}</h2>
          <div className="space-y-3">
            <input type="text" placeholder={t('name_ph')} value={nom} onChange={(e) => setNom(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
            <textarea placeholder={tc('description')} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
            <ImageCropper
              key={cropperKey}
              inputId="map-file"
              currentImageUrl={imageActuelle}
              onChange={setFile}
              label={editingId ? t('image_edit_label') : t('image_label')}
            />
            {message && <p className="text-yellow-400 text-sm">{message}</p>}
            <FormActions onCancel={editingId ? resetForm : undefined} cancelLabel={tc('cancel')}>
              <button
                type="button"
                onClick={sauvegarderMap}
                disabled={loading}
                className="min-h-[44px] px-5 rounded-lg font-bold text-gray-900 disabled:opacity-60"
                style={{ background: '#C9A84C' }}
              >
                {loading ? tc('loading') : editingId ? tc('modify') : tc('create')}
              </button>
            </FormActions>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg grim-h2">{t('my_maps')}</h2>
            <button
              type="button"
              onClick={importerMap}
              className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"
            >
              {tc('import_json')}
            </button>
          </div>
          {maps.length === 0 && <p className="text-gray-400">{t('empty')}</p>}
          <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={favorisOnly}
              onChange={(e) => setFavorisOnly(e.target.checked)}
              className="accent-yellow-500"
            />
            ⭐ Afficher uniquement les favoris
          </label>
          {maps
            .filter((m) => !favorisOnly || estFavori('maps', m.id))
            .map((map) => (
            <div key={map.id} id={`focus-${map.id}`} className="grim-card grim-card-hover p-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <StarFavori type="maps" id={map.id} />
                  <h3 className="text-lg font-bold text-white">{map.nom}</h3>
                </div>
                {/* Refonte listes — Modifier visible, reste en ⋮. */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => commencerEdition(map)}
                    className="text-blue-400 text-sm font-bold px-2 py-1.5 rounded hover:bg-[rgba(201,168,76,0.1)] transition"
                  >
                    ✏️ {tc('modify')}
                  </button>
                  <ActionMenu
                    actions={[
                      {
                        label: 'Outils MJ',
                        icon: '🏗',
                        onClick: () =>
                          router.push(`/dashboard/maps/editor?tab=gm&id=${map.id}`)
                      },
                      {
                        label: map.public ? `Public (${map.nb_copies})` : 'Privé',
                        icon: map.public ? '🌍' : '🔒',
                        onClick: () => togglerPublic(map)
                      },
                      {
                        label: tc('export_item_title'),
                        icon: '📥',
                        onClick: () => exporterMap(map)
                      },
                      {
                        label: tc('delete'),
                        icon: '🗑️',
                        variant: 'danger',
                        separatorBefore: true,
                        onClick: () => supprimerMap(map.id)
                      }
                    ]}
                  />
                </div>
              </div>
              {map.image_url && (
                <img src={map.image_url} alt={map.nom} loading="lazy" className="w-full max-h-96 object-contain rounded mb-2 bg-gray-900" />
              )}
              {map.description && <p className="text-gray-500 text-sm italic">{map.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
