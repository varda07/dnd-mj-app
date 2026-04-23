'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import ImageCropper from '@/app/components/ImageCropper'
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
  const [maps, setMaps] = useState<Map[]>([])
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageActuelle, setImageActuelle] = useState('')
  const [cropperKey, setCropperKey] = useState(0)
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
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => window.location.href = '/dashboard'} className="text-gray-400 hover:text-white">
            {tc('back')}
          </button>
          <h1 className="text-2xl font-bold text-yellow-500">{t('title')}</h1>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-yellow-500 mb-4">{editingId ? t('edit_title') : t('create_title')}</h2>
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
            <div className="flex gap-2">
              <button type="button" onClick={sauvegarderMap} disabled={loading} className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded">
                {loading ? tc('loading') : editingId ? tc('modify') : tc('create')}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="px-4 p-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600">
                  {tc('cancel')}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-yellow-500">{t('my_maps')}</h2>
            <button
              type="button"
              onClick={importerMap}
              className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"
            >
              {tc('import_json')}
            </button>
          </div>
          {maps.length === 0 && <p className="text-gray-400">{t('empty')}</p>}
          {maps.map((map) => (
            <div key={map.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h3 className="text-lg font-bold text-white">{map.nom}</h3>
                <div className="flex gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => togglerPublic(map)}
                    className={`text-sm ${map.public ? 'text-green-400' : 'text-gray-400'}`}
                    title={map.public ? `Partagé — ${map.nb_copies} copie(s)` : 'Partager à la communauté'}
                  >
                    {map.public ? `🌍 Public (${map.nb_copies})` : '🔒 Privé'}
                  </button>
                  <button type="button" onClick={() => commencerEdition(map)} className="text-blue-400 text-sm">
                    {tc('modify')}
                  </button>
                  <button
                    type="button"
                    onClick={() => exporterMap(map)}
                    className="text-gray-400 hover:text-white text-sm"
                    title={tc('export_item_title')}
                  >
                    📥
                  </button>
                  <button type="button" onClick={() => supprimerMap(map.id)} className="text-red-400 text-sm">
                    {tc('delete')}
                  </button>
                </div>
              </div>
              {map.image_url && (
                <img src={map.image_url} alt={map.nom} className="w-full max-h-96 object-contain rounded mb-2 bg-gray-900" />
              )}
              {map.description && <p className="text-gray-500 text-sm italic">{map.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
