'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState, useEffect } from 'react'
import GuidedTour from '@/app/components/GuidedTour'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import ImageCropper from '@/app/components/ImageCropper'
import ActionMenu from '@/app/components/ui/ActionMenu'
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
  PNJ_TEMPLATES,
  CATEGORIES_PNJ,
  templateVersPnj,
  type CategoriePnj,
  type PnjTemplate
} from '@/app/data/pnj_templates'
import { CULTURES_NOMS, genererNomPnj, type GenrePnj } from '@/app/data/noms_pnj'
import {
  genererPersonnalitePnj,
  formaterPersonnalitePnj,
  SECRETS as SECRETS_PNJ
} from '@/app/data/personnalites_pnj'
import { GenerateButton } from '@/app/components/ui/FormKit'
import StarFavori from '@/app/components/StarFavori'
import TemplatesPicker, { sauvegarderCommeTemplate } from '@/app/components/TemplatesPicker'
import { useFavoris } from '@/app/lib/favoris'

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
  armure: number
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

// Roadmap Créations Phase 3 — générateurs légers pour les champs PNJ qui n'ont
// pas encore de générateur dédié (rôle/métier + apparence).
const ROLES_PNJ = [
  'Aubergiste', 'Marchand ambulant', 'Garde de la cité', 'Prêtre', 'Forgeron',
  'Érudit', 'Noble déchu', 'Mendiant', 'Capitaine de navire', 'Guérisseuse',
  'Voleur repenti', 'Chasseur de primes', 'Ménestrel', 'Alchimiste', 'Fermier',
  'Contrebandier', 'Bibliothécaire', 'Sage ermite', 'Tavernier', 'Cartographe'
]
const APP_ALLURE = ['élancé', 'trapu', 'voûté', 'athlétique', 'frêle', 'imposant']
const APP_TRAIT = [
  'une cicatrice barrant la joue', 'des yeux d’un vert perçant', 'une chevelure grisonnante',
  'des mains calleuses', 'un sourire en coin', 'un regard fuyant', 'une voix rauque',
  'des vêtements élimés mais soignés', 'un tatouage ancien au poignet', 'une démarche claudicante'
]
const APP_DETAIL = [
  'sent la fumée de bois', 'porte toujours un pendentif terni', 'parle avec un léger accent',
  'garde une main près de sa bourse', 'observe tout sans en avoir l’air', 'rit trop fort'
]
const pickR = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const genererApparence = () =>
  `Physique ${pickR(APP_ALLURE)}, ${pickR(APP_TRAIT)}. ${pickR(APP_DETAIL)}.`

export default function PnjPage() {
  const router = useRouter()
  const [pnjs, setPnjs] = useState<Pnj[]>([])
  const [nom, setNom] = useState('')
  const [race, setRace] = useState('')
  const [role, setRole] = useState('')
  const [descriptionTxt, setDescriptionTxt] = useState('')
  const [personnalite, setPersonnalite] = useState('')
  const [secrets, setSecrets] = useState('')
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
  const [file, setFile] = useState<File | null>(null)
  const [imageActuelle, setImageActuelle] = useState('')
  const [cropperKey, setCropperKey] = useState(0)
  const [importerOuvert, setImporterOuvert] = useState(false)
  const [favorisOnly, setFavorisOnly] = useState(false)
  // V1 5.2 — recherche dans la liste des PNJ.
  const [rechercheListe, setRechercheListe] = useState('')
  const [mesTemplatesOuvert, setMesTemplatesOuvert] = useState(false)
  // Roadmap 2.1 — générateur de noms : culture + genre sélectionnés.
  const [cultureNom, setCultureNom] = useState('humain')
  const [genreNom, setGenreNom] = useState<GenrePnj>('n')
  const { est: estFavori } = useFavoris()
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
    setArmure('10')
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

  // Phase 3 — « 🎲 Surprends-moi / Tout relancer » : remplit tous les champs
  // narratifs générables d'un coup (réutilise les générateurs existants).
  const toutRelancer = () => {
    setNom(genererNomPnj(cultureNom, genreNom))
    setRole(pickR(ROLES_PNJ))
    setDescriptionTxt(genererApparence())
    setPersonnalite(formaterPersonnalitePnj(genererPersonnalitePnj()))
    setSecrets(pickR(SECRETS_PNJ))
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
    setArmure(String(p.armure ?? 10))
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
      armure: parseInt(armure) || 10,
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
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <GuidedTour tourId="pnj" />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white">
            {tc('back')}
          </button>
          <h1 className="text-2xl grim-title">{t('title')}</h1>
        </div>

        <div className="grim-card p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <h2 className="text-lg grim-h2">
              {editingId ? t('edit_title') : t('create_title')}
            </h2>
            {/* Phase 3 — point de départ rapide (pas de wizard). */}
            {!editingId && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={toutRelancer}
                  className="min-h-[40px] px-3 rounded-lg font-bold text-sm border transition inline-flex items-center gap-1.5"
                  style={{ background: 'rgba(201,168,76,0.12)', borderColor: 'rgba(201,168,76,0.5)', color: '#C9A84C' }}
                  title="Générer nom, rôle, apparence, personnalité et secret"
                >
                  🎲 Surprends-moi
                </button>
                <button
                  type="button"
                  onClick={() => setMesTemplatesOuvert(true)}
                  className="min-h-[40px] px-3 rounded-lg text-sm border border-gray-600 text-gray-300 hover:text-white transition"
                  title="Partir d'un modèle de PNJ existant"
                >
                  📋 Une variante
                </button>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder={t('name_ph')}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
            />
            {/* Roadmap 2.1 — générateur de noms PNJ par culture */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={cultureNom}
                onChange={(e) => setCultureNom(e.target.value)}
                className="flex-1 min-w-[120px] p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                aria-label="Culture du nom"
              >
                {CULTURES_NOMS.map((c) => (
                  <option key={c.cle} value={c.cle}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={genreNom}
                onChange={(e) => setGenreNom(e.target.value as GenrePnj)}
                className="p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                aria-label="Genre du nom"
              >
                <option value="n">Neutre</option>
                <option value="h">Masculin</option>
                <option value="f">Féminin</option>
              </select>
              <button
                type="button"
                onClick={() => setNom(genererNomPnj(cultureNom, genreNom))}
                className="px-3 py-2 rounded bg-gray-800 border border-yellow-600/50 text-yellow-300 hover:bg-gray-700 text-sm font-bold whitespace-nowrap"
                title="Générer un nom selon la culture"
              >
                🎲 Générer un nom
              </button>
            </div>
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
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('role_ph')}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="flex-1 min-w-0 p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
                  />
                  <GenerateButton onClick={() => setRole(pickR(ROLES_PNJ))} title="Générer un rôle / métier" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-gray-400 text-sm">🧍 {t('description')}</label>
                <GenerateButton
                  onClick={() => setDescriptionTxt(genererApparence())}
                  title="Générer une apparence"
                  label="Apparence"
                  className="!min-h-[32px] !min-w-0"
                />
              </div>
              <textarea
                value={descriptionTxt}
                onChange={(e) => setDescriptionTxt(e.target.value)}
                className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-gray-400 text-sm">{t('personnalite')}</label>
                {/* Roadmap 2.2 — générateur de personnalité aléatoire */}
                <button
                  type="button"
                  onClick={() =>
                    setPersonnalite(
                      formaterPersonnalitePnj(genererPersonnalitePnj())
                    )
                  }
                  className="px-2 py-1 rounded bg-gray-800 border border-yellow-600/50 text-yellow-300 hover:bg-gray-700 text-xs font-bold"
                  title="Générer trait / idéal / lien / défaut / manie / motivation / peur"
                >
                  🎲 Générer une personnalité
                </button>
              </div>
              <textarea
                placeholder={t('personnalite_ph')}
                value={personnalite}
                onChange={(e) => setPersonnalite(e.target.value)}
                className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-gray-400 text-sm flex items-center gap-1">
                  🔒 {t('secrets')}
                </label>
                <GenerateButton
                  onClick={() => setSecrets(pickR(SECRETS_PNJ))}
                  title="Générer un secret"
                  label="Secret"
                  className="!min-h-[32px] !min-w-0"
                />
              </div>
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
              <div>
                <label className="text-gray-400 text-sm">🛡️ Classe d&apos;armure</label>
                <input
                  type="number"
                  value={armure}
                  onChange={(e) => setArmure(e.target.value)}
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

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={sauvegarder}
                disabled={loading}
                className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded codex-btn-press"
              >
                {loading ? tc('loading') : editingId ? tc('modify') : tc('create')}
              </button>
              {/* Roadmap Affinement 2.2 — save current form values as personal template */}
              <button
                type="button"
                onClick={() => sauvegarderCommeTemplate('pnj', {
                  nom, race, role, description: descriptionTxt, personnalite, secrets,
                  hp_max: parseInt(hp) || 10, armure: parseInt(armure) || 10,
                  force: parseInt(force) || 10, dexterite: parseInt(dexterite) || 10,
                  constitution: parseInt(constitution) || 10, intelligence: parseInt(intelligence) || 10,
                  sagesse: parseInt(sagesse) || 10, charisme: parseInt(charisme) || 10,
                  notes, image_url: imageActuelle || null,
                }, nom || 'PNJ sans nom')}
                disabled={!nom}
                className="px-3 p-3 rounded bg-gray-800 border border-yellow-600/40 text-yellow-300 hover:bg-gray-700 text-sm font-bold codex-btn-press disabled:opacity-40"
                title="Sauvegarder comme template réutilisable"
              >
                💾 Sauver template
              </button>
              <button
                type="button"
                onClick={() => setMesTemplatesOuvert(true)}
                className="px-3 p-3 rounded bg-gray-800 border border-yellow-600/40 text-yellow-300 hover:bg-gray-700 text-sm font-bold codex-btn-press"
                title="Charger un de mes templates PNJ"
              >
                📂 Mes templates
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 p-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600 codex-btn-press"
                >
                  {tc('cancel')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg grim-h2">{t('my_pnj')}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setImporterOuvert(true)}
                className="px-3 py-1.5 rounded bg-yellow-600 hover:bg-yellow-500 text-gray-900 text-xs font-bold"
              >
                {t('import_templates')}
              </button>
              <button
                type="button"
                onClick={importerPnj}
                className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"
              >
                {tc('import_json')}
              </button>
            </div>
          </div>
          {pnjs.length === 0 && <p className="text-gray-400">{t('empty')}</p>}
          {/* V1 5.2 — recherche PNJ par nom / race / rôle */}
          <input
            type="search"
            value={rechercheListe}
            onChange={(e) => setRechercheListe(e.target.value)}
            placeholder="🔍 Rechercher un PNJ…"
            className="w-full px-3 py-2 rounded bg-gray-800 border border-yellow-500/30 text-white text-sm outline-none focus:border-yellow-500 placeholder-gray-500"
          />
          <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={favorisOnly}
              onChange={(e) => setFavorisOnly(e.target.checked)}
              className="accent-yellow-500"
            />
            ⭐ Afficher uniquement les favoris
          </label>
          {pnjs
            .filter((p) => !favorisOnly || estFavori('pnj', p.id))
            .filter((p) => {
              const q = rechercheListe.trim().toLowerCase()
              if (!q) return true
              return [p.nom, p.race, p.role]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
            })
            .map((p) => (
            <div key={p.id} className="grim-card grim-card-hover p-4">
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
                      <div className="flex items-center gap-2">
                        <StarFavori type="pnj" id={p.id} />
                        <h3 className="text-lg font-bold text-white truncate">{p.nom}</h3>
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {[p.race, p.role].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    {/* Refonte listes — Fiche visible, reste en ⋮. */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/pnj/${p.id}`)}
                        className="text-yellow-400 text-sm font-bold px-2 py-1.5 rounded hover:bg-[rgba(201,168,76,0.1)] transition"
                        title="Ouvrir la fiche (relations, détails)"
                      >
                        🤝 Fiche
                      </button>
                      <ActionMenu
                        actions={[
                          {
                            label: p.public ? `${tc('public')} (${p.nb_copies})` : tc('private'),
                            icon: p.public ? '🌍' : '🔒',
                            onClick: () => togglerPublic(p)
                          },
                          {
                            label: tc('modify'),
                            icon: '✏️',
                            onClick: () => commencerEdition(p)
                          },
                          {
                            label: tc('export_item_title'),
                            icon: '📥',
                            onClick: () => exporterPnj(p)
                          },
                          {
                            label: tc('delete'),
                            icon: '🗑️',
                            variant: 'danger',
                            separatorBefore: true,
                            onClick: () => supprimer(p.id)
                          }
                        ]}
                      />
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
                    <span>🛡️ CA {p.armure ?? 10}</span>
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
      {importerOuvert && (
        <PnjTemplateImporter
          onClose={() => setImporterOuvert(false)}
          existingNames={new Set(pnjs.map((p) => p.nom))}
          onImported={(n) => {
            setMessage(t('imported_count', { n }))
            fetchPnjs()
          }}
        />
      )}
      {/* Roadmap Affinement 2.2 — Mes templates PNJ persos */}
      <TemplatesPicker
        open={mesTemplatesOuvert}
        onClose={() => setMesTemplatesOuvert(false)}
        kind="pnj"
        onApply={(c) => {
          const get = (k: string, d: string) => (typeof c[k] === 'string' || typeof c[k] === 'number') ? String(c[k]) : d
          setNom(get('nom', ''))
          setRace(get('race', ''))
          setRole(get('role', ''))
          setDescriptionTxt(get('description', ''))
          setPersonnalite(get('personnalite', ''))
          setSecrets(get('secrets', ''))
          setHp(get('hp_max', '10'))
          setArmure(get('armure', '10'))
          setForce(get('force', '10'))
          setDexterite(get('dexterite', '10'))
          setConstitution(get('constitution', '10'))
          setIntelligence(get('intelligence', '10'))
          setSagesse(get('sagesse', '10'))
          setCharisme(get('charisme', '10'))
          setNotes(get('notes', ''))
          if (typeof c.image_url === 'string') setImageActuelle(c.image_url)
        }}
      />
    </main>
  )
}

// ----------------------------------------------------------------------------
// PnjTemplateImporter : modale qui liste les templates de PNJ par catégorie
// et insère des copies dans la table pnj.
// ----------------------------------------------------------------------------
function PnjTemplateImporter({
  onClose,
  existingNames,
  onImported
}: {
  onClose: () => void
  existingNames: Set<string>
  onImported: (n: number) => void
}) {
  const t = useTranslations('pnj')
  const tc = useTranslations('common')
  const [filtreCat, setFiltreCat] = useState<CategoriePnj | 'all'>('all')
  const [recherche, setRecherche] = useState('')
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [enImport, setEnImport] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return PNJ_TEMPLATES.filter((tp) => {
      if (filtreCat !== 'all' && tp.categorie !== filtreCat) return false
      if (q && !`${tp.nom} ${tp.nomEn} ${tp.description}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [filtreCat, recherche])

  const togglerSel = (nom: string) => {
    setSelection((prev) => {
      const next = new Set(prev)
      if (next.has(nom)) next.delete(nom)
      else next.add(nom)
      return next
    })
  }

  const toutSelectionner = () => {
    setSelection(new Set(filtres.map((tp) => tp.nom)))
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
    const choisis = PNJ_TEMPLATES.filter((tp) => selection.has(tp.nom))
    const rows = choisis.map((tp: PnjTemplate) => templateVersPnj(tp, user.id))
    const { error } = await supabase.from('pnj').insert(rows)
    setEnImport(false)
    if (error) {
      console.error('[pnj] import templates :', error)
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
            📚 {t('import_templates')}
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
          className="px-4 py-3 grid grid-cols-2 md:grid-cols-2 gap-2 border-b"
          style={{ borderColor: 'rgba(201,168,76,0.15)' }}
        >
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={tc('loading')}
            className="px-2.5 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none focus:border-[#C9A84C]"
          />
          <select
            value={filtreCat}
            onChange={(e) => setFiltreCat(e.target.value as CategoriePnj | 'all')}
            className="px-2.5 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none"
          >
            <option value="all">{t('all_categories')}</option>
            {CATEGORIES_PNJ.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
          {filtres.length === 0 ? (
            <p className="text-gray-400 text-sm italic text-center py-8">
              {t('no_results')}
            </p>
          ) : (
            <ul className="space-y-1">
              {filtres.map((tp, idx) => {
                const selected = selection.has(tp.nom)
                const dejaPossede = existingNames.has(tp.nom)
                return (
                  <li key={`${tp.nom}-${idx}`}>
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
                        onChange={() => togglerSel(tp.nom)}
                        className="mt-1 accent-yellow-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-yellow-200 font-bold">{tp.nom}</span>
                          <span className="text-[10px] text-gray-500 italic">{tp.nomEn}</span>
                          <span className="text-[10px] uppercase tracking-wider text-[#C9A84C]/80">
                            {tp.categorie}
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
                          {tp.description}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          PV {tp.hp_max} · CA {tp.ca} · For {tp.force} Dex {tp.dexterite} Cha {tp.charisme}
                        </p>
                        <p className="text-[10px] text-gray-500 italic mt-0.5 line-clamp-1">
                          ◆ {tp.personnalite}
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
