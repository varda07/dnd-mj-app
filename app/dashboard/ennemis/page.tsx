'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import ImageCropper from '@/app/components/ImageCropper'
import NumberInput from '@/app/components/NumberInput'
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
import {
  BESTIAIRE_DND5E,
  TYPES_MONSTRE,
  TAILLES_MONSTRE,
  formatCD,
  monstreVersEnnemi,
  type Monstre,
  type TypeMonstre,
  type TailleMonstre
} from '@/app/data/bestiaire_dnd5e'

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
  const router = useRouter()
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
  const [bestiaireOuvert, setBestiaireOuvert] = useState(false)
  const [favorisOnly, setFavorisOnly] = useState(false)
  const { est: estFavori } = useFavoris()
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
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white">
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
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setBestiaireOuvert(true)}
                className="px-3 py-1.5 rounded bg-yellow-600 hover:bg-yellow-500 text-gray-900 text-xs font-bold"
              >
                {t('import_bestiary')}
              </button>
              <button
                type="button"
                onClick={importerEnnemi}
                className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"
              >
                {tc('import_json')}
              </button>
            </div>
          </div>
          {ennemis.length === 0 && <p className="text-gray-400">{t('empty')}</p>}
          <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={favorisOnly}
              onChange={(e) => setFavorisOnly(e.target.checked)}
              className="accent-yellow-500"
            />
            ⭐ Afficher uniquement les favoris
          </label>
          {ennemis
            .filter((e) => !favorisOnly || estFavori('ennemis', e.id))
            .map((ennemi) => (
            <div key={ennemi.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex gap-4">
                {ennemi.image_url && (
                  <img
                    src={ennemi.image_url}
                    alt={ennemi.nom}
                    loading="lazy"
                    className="w-24 h-24 object-cover rounded bg-gray-900 flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <StarFavori type="ennemis" id={ennemi.id} />
                      <h3 className="text-lg font-bold text-white">{ennemi.nom}</h3>
                    </div>
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
      {bestiaireOuvert && (
        <BestiaireImporter
          onClose={() => setBestiaireOuvert(false)}
          existingNames={new Set(ennemis.map((e) => e.nom))}
          onImported={(n) => {
            setMessage(t('imported_count', { n }))
            fetchEnnemis()
          }}
        />
      )}
    </main>
  )
}

// ----------------------------------------------------------------------------
// BestiaireImporter : modale qui liste les monstres du SRD avec filtres
// (CD, type, taille) et insère des copies dans la table ennemis pour le user.
// ----------------------------------------------------------------------------
function BestiaireImporter({
  onClose,
  existingNames,
  onImported
}: {
  onClose: () => void
  existingNames: Set<string>
  onImported: (n: number) => void
}) {
  const t = useTranslations('enemies')
  const tc = useTranslations('common')
  const [filtreType, setFiltreType] = useState<TypeMonstre | 'all'>('all')
  const [filtreTaille, setFiltreTaille] = useState<TailleMonstre | 'all'>('all')
  const [filtreCdMin, setFiltreCdMin] = useState<number>(0)
  const [filtreCdMax, setFiltreCdMax] = useState<number>(30)
  const [recherche, setRecherche] = useState('')
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [enImport, setEnImport] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return BESTIAIRE_DND5E.filter((m) => {
      if (filtreType !== 'all' && m.type !== filtreType) return false
      if (filtreTaille !== 'all' && m.taille !== filtreTaille) return false
      if (m.cd < filtreCdMin || m.cd > filtreCdMax) return false
      if (q && !`${m.nom} ${m.nomEn}`.toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => a.cd - b.cd || a.nom.localeCompare(b.nom))
  }, [filtreType, filtreTaille, filtreCdMin, filtreCdMax, recherche])

  const togglerSel = (nom: string) => {
    setSelection((prev) => {
      const next = new Set(prev)
      if (next.has(nom)) next.delete(nom)
      else next.add(nom)
      return next
    })
  }

  const toutSelectionner = () => {
    setSelection(new Set(filtres.map((m) => m.nom)))
  }

  const importer = async () => {
    setErreur(null)
    if (selection.size === 0) return
    setEnImport(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErreur('Non connecté.')
      setEnImport(false)
      return
    }
    const choisis = BESTIAIRE_DND5E.filter((m) => selection.has(m.nom))
    const rows = choisis.map((m: Monstre) => monstreVersEnnemi(m, user.id))
    const { error } = await supabase.from('ennemis').insert(rows)
    setEnImport(false)
    if (error) {
      console.error('[ennemis] import bestiaire :', error)
      setErreur(error.message)
      return
    }
    onImported(rows.length)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/75 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl shadow-2xl"
        style={{
          background: '#12141a',
          border: '1px solid rgba(201,168,76,0.4)'
        }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between border-b"
          style={{ borderColor: 'rgba(201,168,76,0.2)' }}
        >
          <h3 className="text-[13px] tracking-[0.18em] uppercase text-[#C9A84C] font-bold">
            📚 {t('import_bestiary')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none w-7 h-7"
            aria-label={tc('close')}
          >
            ×
          </button>
        </div>

        <div
          className="px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-2 border-b"
          style={{ borderColor: 'rgba(201,168,76,0.15)' }}
        >
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={tc('loading')}
            className="col-span-2 px-2.5 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none focus:border-[#C9A84C]"
          />
          <select
            value={filtreType}
            onChange={(e) => setFiltreType(e.target.value as TypeMonstre | 'all')}
            className="px-2.5 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none"
          >
            <option value="all">{t('all_types')}</option>
            {TYPES_MONSTRE.map((tp) => (
              <option key={tp} value={tp}>{tp}</option>
            ))}
          </select>
          <select
            value={filtreTaille}
            onChange={(e) => setFiltreTaille(e.target.value as TailleMonstre | 'all')}
            className="px-2.5 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none"
          >
            <option value="all">{t('all_sizes')}</option>
            {TAILLES_MONSTRE.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <NumberInput
              allowFloat
              fallback={0}
              step="0.25"
              value={filtreCdMin}
              onChange={setFiltreCdMin}
              placeholder="CD min"
              className="w-full px-2 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none"
            />
            <span className="text-gray-500 text-xs">-</span>
            <NumberInput
              allowFloat
              fallback={30}
              step="0.25"
              value={filtreCdMax}
              onChange={setFiltreCdMax}
              placeholder="CD max"
              className="w-full px-2 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
          {filtres.length === 0 ? (
            <p className="text-gray-400 text-sm italic text-center py-8">
              {t('no_results')}
            </p>
          ) : (
            <ul className="space-y-1">
              {filtres.map((m, idx) => {
                const selected = selection.has(m.nom)
                const dejaPossede = existingNames.has(m.nom)
                return (
                  <li key={`${m.nom}-${idx}`}>
                    <label
                      className={`flex items-start gap-3 p-2 rounded cursor-pointer border transition ${
                        selected
                          ? 'bg-[rgba(201,168,76,0.12)] border-[#C9A84C]'
                          : 'bg-black/30 border-[rgba(201,168,76,0.15)] hover:bg-[rgba(201,168,76,0.06)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => togglerSel(m.nom)}
                        className="mt-1 accent-yellow-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-yellow-200 font-bold">{m.nom}</span>
                          <span className="text-[10px] text-gray-500 italic">{m.nomEn}</span>
                          <span className="text-[10px] text-gray-400">
                            CD {formatCD(m.cd)} · {m.taille} {m.type}
                          </span>
                          {dejaPossede && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{
                                background: 'rgba(16,185,129,0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16,185,129,0.3)'
                              }}
                              title={t('already_owned')}
                            >
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs italic mt-1 line-clamp-2">
                          {m.description}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          PV {m.hp_max} · CA {m.ca} · For {m.force} Dex {m.dexterite} Con {m.constitution}
                        </p>
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {erreur && (
          <p className="px-4 py-2 text-red-300 text-xs border-t border-red-900/40">
            {erreur}
          </p>
        )}
        <div
          className="px-4 py-3 flex items-center justify-between gap-2 border-t flex-wrap"
          style={{ borderColor: 'rgba(201,168,76,0.2)' }}
        >
          <span className="text-xs text-gray-400">
            {selection.size} / {filtres.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toutSelectionner}
              className="px-3 py-1.5 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-200"
            >
              {t('select_all')}
            </button>
            <button
              type="button"
              onClick={importer}
              disabled={selection.size === 0 || enImport}
              className="px-3 py-1.5 rounded text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-gray-900 disabled:opacity-50"
            >
              {enImport
                ? tc('loading')
                : t('import_button', { n: selection.size })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}