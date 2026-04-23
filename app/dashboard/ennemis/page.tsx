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

type Ennemi = {
  id: string
  nom: string
  hp_max: number
  hp_actuel: number
  armure: number
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
  notes: string
  scenario_id: string | null
  image_url: string | null
  public: boolean
  nb_copies: number
  auteur_username: string | null
}

type ScenarioOption = { id: string; nom: string }

export default function Ennemis() {
  const [ennemis, setEnnemis] = useState<Ennemi[]>([])
  const [nom, setNom] = useState('')
  const [hp, setHp] = useState('10')
  const [armure, setArmure] = useState('10')
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
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([])
  const [scenarioId, setScenarioId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [imageActuelle, setImageActuelle] = useState('')
  const [cropperKey, setCropperKey] = useState(0)
  const t = useTranslations('enemies')
  const tc = useTranslations('common')
  const ti = useTranslations('items')

  useEffect(() => {
    fetchEnnemis()
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
    setHp('10')
    setArmure('10')
    setForce('10')
    setDexterite('10')
    setConstitution('10')
    setIntelligence('10')
    setSagesse('10')
    setCharisme('10')
    setNotes('')
    setEditingId(null)
    setScenarioId('')
    setFile(null)
    setImageActuelle('')
    setCropperKey((k) => k + 1)
  }

  const commencerEdition = (ennemi: Ennemi) => {
    setEditingId(ennemi.id)
    setNom(ennemi.nom)
    setHp(String(ennemi.hp_max))
    setArmure(String(ennemi.armure))
    setForce(String(ennemi.force))
    setDexterite(String(ennemi.dexterite))
    setConstitution(String(ennemi.constitution))
    setIntelligence(String(ennemi.intelligence))
    setSagesse(String(ennemi.sagesse))
    setCharisme(String(ennemi.charisme))
    setNotes(ennemi.notes ?? '')
    setScenarioId(ennemi.scenario_id ?? '')
    setFile(null)
    setImageActuelle(ennemi.image_url ?? '')
    setCropperKey((k) => k + 1)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchEnnemis = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('ennemis')
      .select('*')
      .eq('mj_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setEnnemis(data)
  }

  const sauvegarderEnnemi = async () => {
    if (!nom) return setMessage(tc('required'))
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let imageUrl = imageActuelle
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user?.id}/${Date.now()}.${ext}`
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
      hp_max: parseInt(hp),
      armure: parseInt(armure),
      force: parseInt(force),
      dexterite: parseInt(dexterite),
      constitution: parseInt(constitution),
      intelligence: parseInt(intelligence),
      sagesse: parseInt(sagesse),
      charisme: parseInt(charisme),
      notes,
      scenario_id: scenarioId || null,
      image_url: imageUrl
    }

    if (editingId) {
      const { error } = await supabase.from('ennemis').update(payload).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage(t('modified'))
        resetForm()
        fetchEnnemis()
      }
    } else {
      const { error } = await supabase.from('ennemis').insert({
        ...payload,
        hp_actuel: parseInt(hp),
        mj_id: user?.id
      })
      if (error) setMessage(error.message)
      else {
        setMessage(t('created'))
        resetForm()
        fetchEnnemis()
      }
    }
    setLoading(false)
  }

  const supprimerEnnemi = async (id: string) => {
    if (!window.confirm(tc('confirm_delete'))) return
    await supabase.from('ennemis').delete().eq('id', id)
    fetchEnnemis()
  }

  const exporterEnnemi = (e: Ennemi) => {
    const env = construireEnveloppe('ennemi', nettoyer(e as unknown as Record<string, unknown>))
    telechargerJSON(`ennemi-${slugFichier(e.nom)}.json`, env)
  }

  const importerEnnemi = () => {
    ouvrirSelecteurFichier(async (f) => {
      try {
        const raw = await lireFichierJSON(f)
        const env = validerEnveloppe<Record<string, unknown>>(raw, ['ennemi'])
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const clean = nettoyer(env.data)
        const nom = typeof clean.nom === 'string' && clean.nom.trim() !== '' ? clean.nom : 'Ennemi importé'
        const hp_max = typeof clean.hp_max === 'number' ? clean.hp_max : 10
        const { error } = await supabase
          .from('ennemis')
          .insert({ ...clean, nom, hp_actuel: hp_max, mj_id: user.id })
        if (error) throw error
        setMessage(tc('import_ok'))
        fetchEnnemis()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setMessage(tc('import_error', { message: msg }))
      }
    })
  }

  const togglerPublic = async (ennemi: Ennemi) => {
    const rendrePublic = !ennemi.public
    let auteurUsername = ennemi.auteur_username ?? null
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
      .from('ennemis')
      .update({ public: rendrePublic, auteur_username: auteurUsername })
      .eq('id', ennemi.id)
    if (error) setMessage(error.message)
    else fetchEnnemis()
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
            <div>
              <label className="text-gray-400 text-sm">{ti('scenario')}</label>
              <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none">
                <option value="">{ti('no_scenario')}</option>
                {scenarios.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm">{t('hp')}</label>
                <input type="number" value={hp} onChange={(e) => setHp(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">{t('armor')}</label>
                <input type="number" value={armure} onChange={(e) => setArmure(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
            </div>
            <p className="text-gray-400 text-sm font-bold">{t('stats')}</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-gray-400 text-sm">Force</label>
                <input type="number" value={force} onChange={(e) => setForce(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Dextérité</label>
                <input type="number" value={dexterite} onChange={(e) => setDexterite(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Constitution</label>
                <input type="number" value={constitution} onChange={(e) => setConstitution(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Intelligence</label>
                <input type="number" value={intelligence} onChange={(e) => setIntelligence(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Sagesse</label>
                <input type="number" value={sagesse} onChange={(e) => setSagesse(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Charisme</label>
                <input type="number" value={charisme} onChange={(e) => setCharisme(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
              </div>
            </div>
            <textarea placeholder={t('notes_ph')} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
            <ImageCropper
              key={cropperKey}
              inputId="ennemi-file"
              currentImageUrl={imageActuelle}
              onChange={setFile}
              aspect={1}
              label={editingId ? "Nouvelle image (laisser vide pour garder l'actuelle)" : "Image de l'ennemi"}
            />
            {message && <p className="text-yellow-400 text-sm">{message}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={sauvegarderEnnemi} disabled={loading} className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded">
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
            <h2 className="text-lg font-bold text-yellow-500">{t('my_enemies')}</h2>
            <button
              type="button"
              onClick={importerEnnemi}
              className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"
            >
              {tc('import_json')}
            </button>
          </div>
          {ennemis.length === 0 && <p className="text-gray-400">{t('empty')}</p>}
          {ennemis.map((ennemi) => (
            <div key={ennemi.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex gap-4">
                {ennemi.image_url && (
                  <img
                    src={ennemi.image_url}
                    alt={ennemi.nom}
                    className="w-24 h-24 object-cover rounded bg-gray-900 flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h3 className="text-lg font-bold text-white">{ennemi.nom}</h3>
                    <div className="flex gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => togglerPublic(ennemi)}
                        className={`text-sm ${ennemi.public ? 'text-green-400' : 'text-gray-400'}`}
                        title={ennemi.public ? `Partagé — ${ennemi.nb_copies} copie(s)` : 'Partager à la communauté'}
                      >
                        {ennemi.public ? `🌍 Public (${ennemi.nb_copies})` : '🔒 Privé'}
                      </button>
                      <button type="button" onClick={() => commencerEdition(ennemi)} className="text-blue-400 text-sm">
                        {tc('modify')}
                      </button>
                      <button
                        type="button"
                        onClick={() => exporterEnnemi(ennemi)}
                        className="text-gray-400 hover:text-white text-sm"
                        title={tc('export_item_title')}
                      >
                        📥
                      </button>
                      <button type="button" onClick={() => supprimerEnnemi(ennemi.id)} className="text-red-400 text-sm">
                        {tc('delete')}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm text-gray-400">
                    <span>❤️ HP: {ennemi.hp_actuel}/{ennemi.hp_max}</span>
                    <span>🛡️ Armure: {ennemi.armure}</span>
                    <span>💪 Force: {ennemi.force}</span>
                    <span>🏃 Dex: {ennemi.dexterite}</span>
                    <span>🫀 Con: {ennemi.constitution}</span>
                    <span>🧠 Int: {ennemi.intelligence}</span>
                    <span>🙏 Sag: {ennemi.sagesse}</span>
                    <span>✨ Cha: {ennemi.charisme}</span>
                  </div>
                  {ennemi.notes && <p className="text-gray-500 text-sm mt-2 italic">{ennemi.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}