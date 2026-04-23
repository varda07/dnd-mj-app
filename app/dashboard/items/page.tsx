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

type Item = {
  id: string
  nom: string
  description: string
  type: string
  rarete: string
  scenario_id: string | null
  image_url: string | null
  public: boolean
  nb_copies: number
  auteur_username: string | null
}

type ScenarioOption = { id: string; nom: string }

const TYPES = ['Arme', 'Armure', 'Potion', 'Parchemin', 'Objet merveilleux', 'Autre']
const RARETES = ['Commun', 'Peu commun', 'Rare', 'Très rare', 'Légendaire', 'Artéfact']

export default function Items() {
  const [items, setItems] = useState<Item[]>([])
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState(TYPES[0])
  const [rarete, setRarete] = useState(RARETES[0])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([])
  const [scenarioId, setScenarioId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [imageActuelle, setImageActuelle] = useState('')
  const [cropperKey, setCropperKey] = useState(0)
  const t = useTranslations('items')
  const tc = useTranslations('common')

  useEffect(() => {
    fetchItems()
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('scenarios')
      .select('id, nom')
      .eq('mj_id', user.id)
      .order('nom')
    if (data) setScenarios(data)
  }

  const resetForm = () => {
    setNom('')
    setDescription('')
    setType(TYPES[0])
    setRarete(RARETES[0])
    setEditingId(null)
    setScenarioId('')
    setFile(null)
    setImageActuelle('')
    setCropperKey((k) => k + 1)
  }

  const commencerEdition = (item: Item) => {
    setEditingId(item.id)
    setNom(item.nom)
    setDescription(item.description ?? '')
    setType(item.type || TYPES[0])
    setRarete(item.rarete || RARETES[0])
    setScenarioId(item.scenario_id ?? '')
    setFile(null)
    setImageActuelle(item.image_url ?? '')
    setCropperKey((k) => k + 1)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchItems = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('mj_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  const sauvegarderItem = async () => {
    if (!nom) return setMessage(tc('required'))
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let imageUrl = imageActuelle
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user?.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('Items').upload(path, file)
      if (uploadError) {
        setMessage(uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('Items').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }

    const payload = {
      nom,
      description,
      type,
      rarete,
      scenario_id: scenarioId || null,
      image_url: imageUrl
    }

    if (editingId) {
      const { error } = await supabase.from('items').update(payload).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage(t('modified'))
        resetForm()
        fetchItems()
      }
    } else {
      const { error } = await supabase.from('items').insert({ ...payload, mj_id: user?.id })
      if (error) setMessage(error.message)
      else {
        setMessage(t('created'))
        resetForm()
        fetchItems()
      }
    }
    setLoading(false)
  }

  const supprimerItem = async (id: string) => {
    if (!window.confirm(tc('confirm_delete'))) return
    await supabase.from('items').delete().eq('id', id)
    fetchItems()
  }

  const exporterItem = (i: Item) => {
    const env = construireEnveloppe('item', nettoyer(i as unknown as Record<string, unknown>))
    telechargerJSON(`item-${slugFichier(i.nom)}.json`, env)
  }

  const importerItem = () => {
    ouvrirSelecteurFichier(async (f) => {
      try {
        const raw = await lireFichierJSON(f)
        const env = validerEnveloppe<Record<string, unknown>>(raw, ['item'])
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const clean = nettoyer(env.data)
        const nom = typeof clean.nom === 'string' && clean.nom.trim() !== '' ? clean.nom : 'Item importé'
        const { error } = await supabase.from('items').insert({ ...clean, nom, mj_id: user.id })
        if (error) throw error
        setMessage(tc('import_ok'))
        fetchItems()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setMessage(tc('import_error', { message: msg }))
      }
    })
  }

  const togglerPublic = async (item: Item) => {
    const rendrePublic = !item.public
    let auteurUsername = item.auteur_username ?? null
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
      .from('items')
      .update({ public: rendrePublic, auteur_username: auteurUsername })
      .eq('id', item.id)
    if (error) setMessage(error.message)
    else fetchItems()
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm">{t('type')}</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                  {TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm">{t('rarity')}</label>
                <select value={rarete} onChange={(e) => setRarete(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                  {RARETES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm">{t('scenario')}</label>
              <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                <option value="">{t('no_scenario')}</option>
                {scenarios.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
            <textarea placeholder={tc('description')} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
            <ImageCropper
              key={cropperKey}
              inputId="item-file"
              currentImageUrl={imageActuelle}
              onChange={setFile}
              aspect={1}
              label={editingId ? "Nouvelle image (laisser vide pour garder l'actuelle)" : "Image de l'item"}
            />
            {message && <p className="text-yellow-400 text-sm">{message}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={sauvegarderItem} disabled={loading} className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded">
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
            <h2 className="text-lg font-bold text-yellow-500">{t('my_items')}</h2>
            <button
              type="button"
              onClick={importerItem}
              className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"
            >
              {tc('import_json')}
            </button>
          </div>
          {items.length === 0 && <p className="text-gray-400">{t('empty')}</p>}
          {items.map((item) => (
            <div key={item.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex gap-4">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.nom}
                    className="w-16 h-16 object-cover rounded bg-gray-900 flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h3 className="text-lg font-bold text-white">{item.nom}</h3>
                    <div className="flex gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => togglerPublic(item)}
                        className={`text-sm ${item.public ? 'text-green-400' : 'text-gray-400'}`}
                        title={item.public ? `Partagé — ${item.nb_copies} copie(s)` : 'Partager à la communauté'}
                      >
                        {item.public ? `🌍 Public (${item.nb_copies})` : '🔒 Privé'}
                      </button>
                      <button type="button" onClick={() => commencerEdition(item)} className="text-blue-400 text-sm">
                        {tc('modify')}
                      </button>
                      <button
                        type="button"
                        onClick={() => exporterItem(item)}
                        className="text-gray-400 hover:text-white text-sm"
                        title={tc('export_item_title')}
                      >
                        📥
                      </button>
                      <button type="button" onClick={() => supprimerItem(item.id)} className="text-red-400 text-sm">
                        {tc('delete')}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 text-sm text-gray-400 mb-2">
                    <span>📦 {item.type}</span>
                    <span>✨ {item.rarete}</span>
                  </div>
                  {item.description && <p className="text-gray-500 text-sm italic">{item.description}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
