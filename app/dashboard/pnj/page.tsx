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

type Pnj = {
  id: string
  nom: string
  race: string | null
  role: string | null
  description: string | null
  personnalite: string | null
  secrets: string | null
  hp_max: number
  hp_actuel: number
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
  notes: string | null
  image_url: string | null
  public: boolean
  nb_copies: number
  auteur_username: string | null
}

export default function PnjPage() {
  const [pnjs, setPnjs] = useState<Pnj[]>([])
  const [nom, setNom] = useState('')
  const [race, setRace] = useState('')
  const [role, setRole] = useState('')
  const [descriptionTxt, setDescriptionTxt] = useState('')
  const [personnalite, setPersonnalite] = useState('')
  const [secrets, setSecrets] = useState('')
  const [hp, setHp] = useState('10')
  const [force, setForce] = useState('10')
  const [dexterite, setDexterite] = useState('10')
  const [constitution, setConstitution] = useState('10')
  const [intelligence, setIntelligence] = useState('10')
  const [sagesse, setSagesse] = useState('10')
  const [charisme, setCharisme] = useState('10')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [imageActuelle, setImageActuelle] = useState('')
  const [cropperKey, setCropperKey] = useState(0)
  const t = useTranslations('pnj')
  const tc = useTranslations('common')

  useEffect(() => {
    fetchPnjs()
  }, [])

  const resetForm = () => {
    setNom('')
    setRace('')
    setRole('')
    setDescriptionTxt('')
    setPersonnalite('')
    setSecrets('')
    setHp('10')
    setForce('10')
    setDexterite('10')
    setConstitution('10')
    setIntelligence('10')
    setSagesse('10')
    setCharisme('10')
    setNotes('')
    setEditingId(null)
    setFile(null)
    setImageActuelle('')
    setCropperKey((k) => k + 1)
  }

  const commencerEdition = (p: Pnj) => {
    setEditingId(p.id)
    setNom(p.nom)
    setRace(p.race ?? '')
    setRole(p.role ?? '')
    setDescriptionTxt(p.description ?? '')
    setPersonnalite(p.personnalite ?? '')
    setSecrets(p.secrets ?? '')
    setHp(String(p.hp_max))
    setForce(String(p.force))
    setDexterite(String(p.dexterite))
    setConstitution(String(p.constitution))
    setIntelligence(String(p.intelligence))
    setSagesse(String(p.sagesse))
    setCharisme(String(p.charisme))
    setNotes(p.notes ?? '')
    setFile(null)
    setImageActuelle(p.image_url ?? '')
    setCropperKey((k) => k + 1)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchPnjs = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('pnj')
      .select('*')
      .eq('mj_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setPnjs(data as Pnj[])
  }

  const sauvegarder = async () => {
    if (!nom) return setMessage(tc('required'))
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let imageUrl = imageActuelle
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user?.id}/${Date.now()}.${ext}`
      // Bucket `ennemie` réutilisé — mêmes policies (lecture publique,
      // écriture sur son propre dossier).
      const { error: uploadError } = await supabase.storage.from('ennemie').upload(path, file)
      if (uploadError) {
        setMessage(uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('ennemie').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }

    const payload = {
      nom,
      race: race || null,
      role: role || null,
      description: descriptionTxt,
      personnalite,
      secrets,
      hp_max: parseInt(hp) || 10,
      force: parseInt(force) || 10,
      dexterite: parseInt(dexterite) || 10,
      constitution: parseInt(constitution) || 10,
      intelligence: parseInt(intelligence) || 10,
      sagesse: parseInt(sagesse) || 10,
      charisme: parseInt(charisme) || 10,
      notes,
      image_url: imageUrl || null
    }

    if (editingId) {
      const { error } = await supabase.from('pnj').update(payload).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage(t('modified'))
        resetForm()
        fetchPnjs()
      }
    } else {
      const { error } = await supabase.from('pnj').insert({
        ...payload,
        hp_actuel: parseInt(hp) || 10,
        mj_id: user?.id
      })
      if (error) setMessage(error.message)
      else {
        setMessage(t('created'))
        resetForm()
        fetchPnjs()
      }
    }
    setLoading(false)
  }

  const supprimer = async (id: string) => {
    if (!window.confirm(tc('confirm_delete'))) return
    await supabase.from('pnj').delete().eq('id', id)
    fetchPnjs()
  }

  const togglerPublic = async (p: Pnj) => {
    const rendrePublic = !p.public
    let auteurUsername = p.auteur_username ?? null
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
      .from('pnj')
      .update({ public: rendrePublic, auteur_username: auteurUsername })
      .eq('id', p.id)
    if (error) setMessage(error.message)
    else fetchPnjs()
  }

  const exporterPnj = (p: Pnj) => {
    const env = construireEnveloppe('pnj' as const, nettoyer(p as unknown as Record<string, unknown>))
    telechargerJSON(`pnj-${slugFichier(p.nom)}.json`, env)
  }

  const importerPnj = () => {
    ouvrirSelecteurFichier(async (f) => {
      try {
        const raw = await lireFichierJSON(f)
        const env = validerEnveloppe<Record<string, unknown>>(raw, ['pnj'])
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const clean = nettoyer(env.data)
        const nomImp = typeof clean.nom === 'string' && clean.nom.trim() !== '' ? clean.nom : 'PNJ importé'
        const hpMax = typeof clean.hp_max === 'number' ? clean.hp_max : 10
        const { error } = await supabase
          .from('pnj')
          .insert({ ...clean, nom: nomImp, hp_actuel: hpMax, mj_id: user.id })
        if (error) throw error
        setMessage(tc('import_ok'))
        fetchPnjs()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setMessage(tc('import_error', { message: msg }))
      }
    })
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
          <h2 className="text-lg font-bold text-yellow-500 mb-4">
            {editingId ? t('edit_title') : t('create_title')}
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder={t('name_ph')}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm">{t('race')}</label>
                <input
                  type="text"
                  value={race}
                  onChange={(e) => setRace(e.target.value)}
                  className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">{t('role')}</label>
                <input
                  type="text"
                  placeholder={t('role_ph')}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm">{t('description')}</label>
              <textarea
                value={descriptionTxt}
                onChange={(e) => setDescriptionTxt(e.target.value)}
                className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-20"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm">{t('personnalite')}</label>
              <textarea
                placeholder={t('personnalite_ph')}
                value={personnalite}
                onChange={(e) => setPersonnalite(e.target.value)}
                className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-20"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm flex items-center gap-1">
                🔒 {t('secrets')}
              </label>
              <textarea
                placeholder={t('secrets_ph')}
                value={secrets}
                onChange={(e) => setSecrets(e.target.value)}
                className="w-full p-3 rounded bg-gray-900 text-white border border-yellow-900/60 outline-none h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm">{t('hp')}</label>
                <input
                  type="number"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
                />
              </div>
            </div>

            <p className="text-gray-400 text-sm font-bold">{t('stats')}</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Force', force, setForce],
                ['Dex', dexterite, setDexterite],
                ['Con', constitution, setConstitution],
                ['Int', intelligence, setIntelligence],
                ['Sag', sagesse, setSagesse],
                ['Cha', charisme, setCharisme]
              ].map(([label, value, setter]) => (
                <div key={label as string}>
                  <label className="text-gray-400 text-sm">{label as string}</label>
                  <input
                    type="number"
                    value={value as string}
                    onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                    className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
                  />
                </div>
              ))}
            </div>

            <textarea
              placeholder={t('notes_ph')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-20"
            />

            <ImageCropper
              key={cropperKey}
              inputId="pnj-file"
              currentImageUrl={imageActuelle}
              onChange={setFile}
              aspect={1}
              label={editingId ? "Nouvelle image (laisser vide pour garder l'actuelle)" : 'Image du PNJ'}
            />

            {message && <p className="text-yellow-400 text-sm">{message}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={sauvegarder}
                disabled={loading}
                className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded"
              >
                {loading ? tc('loading') : editingId ? tc('modify') : tc('create')}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 p-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600"
                >
                  {tc('cancel')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-yellow-500">{t('my_pnj')}</h2>
            <button
              type="button"
              onClick={importerPnj}
              className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"
            >
              {tc('import_json')}
            </button>
          </div>
          {pnjs.length === 0 && <p className="text-gray-400">{t('empty')}</p>}
          {pnjs.map((p) => (
            <div key={p.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex gap-4">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.nom}
                    loading="lazy"
                    className="w-20 h-20 object-cover rounded bg-gray-900 flex-shrink-0 ring-2 ring-emerald-500/40"
                  />
                ) : (
                  <div className="w-20 h-20 rounded bg-gray-700 flex items-center justify-center text-2xl flex-shrink-0">
                    🧑
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">{p.nom}</h3>
                      <p className="text-xs text-gray-400 truncate">
                        {[p.race, p.role].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => togglerPublic(p)}
                        className={`text-sm ${p.public ? 'text-green-400' : 'text-gray-400'}`}
                      >
                        {p.public ? `🌍 ${tc('public')} (${p.nb_copies})` : `🔒 ${tc('private')}`}
                      </button>
                      <button type="button" onClick={() => commencerEdition(p)} className="text-blue-400 text-sm">
                        {tc('modify')}
                      </button>
                      <button
                        type="button"
                        onClick={() => exporterPnj(p)}
                        className="text-gray-400 hover:text-white text-sm"
                        title={tc('export_item_title')}
                      >
                        📥
                      </button>
                      <button type="button" onClick={() => supprimer(p.id)} className="text-red-400 text-sm">
                        {tc('delete')}
                      </button>
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-gray-300 text-sm">{p.description}</p>
                  )}
                  {p.personnalite && (
                    <p className="text-gray-400 text-xs italic mt-1">💬 {p.personnalite}</p>
                  )}
                  <div className="grid grid-cols-3 gap-1 text-[11px] text-gray-500 mt-2">
                    <span>❤️ {p.hp_actuel}/{p.hp_max}</span>
                    <span>💪 {p.force}</span>
                    <span>🏃 {p.dexterite}</span>
                    <span>🫀 {p.constitution}</span>
                    <span>🧠 {p.intelligence}</span>
                    <span>🙏 {p.sagesse}</span>
                  </div>
                  {p.secrets && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-yellow-600 hover:text-yellow-400">
                        🔒 {t('secrets')}
                      </summary>
                      <p className="mt-1 p-2 rounded bg-gray-900/60 border border-yellow-900/40 text-gray-300 text-xs whitespace-pre-wrap">
                        {p.secrets}
                      </p>
                    </details>
                  )}
                  {p.notes && (
                    <p className="text-gray-500 text-xs mt-2 italic">{p.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
