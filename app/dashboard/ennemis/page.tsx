'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import ImageCropper from '@/app/components/ImageCropper'
import NumberInput from '@/app/components/NumberInput'
import StarFavori from '@/app/components/StarFavori'
import TemplatesPicker, { sauvegarderCommeTemplate } from '@/app/components/TemplatesPicker'
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
import { genererLoot, formaterLoot, type PalierCR } from '@/app/data/loot_tables'

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
  // Roadmap 2.5 — id du monstre d'origine si cet ennemi est une variante.
  variant_de?: string | null
  // Roadmap 6.3 — comportement tactique.
  comportement_tactique?: string
  // Roadmap 6.4 — combat de masse.
  est_groupe?: boolean
  taille_groupe?: number
  // Refonte combat diffusion — mitigation des dégâts.
  resistances?: string[]
  immunites?: string[]
  vulnerabilites?: string[]
}

// Parse "feu, froid" → ["feu","froid"] (et l'inverse pour l'affichage).
const parseTypes = (s: string): string[] =>
  s
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
const joinTypes = (a?: string[] | null): string => (Array.isArray(a) ? a.join(', ') : '')

type ScenarioOption = { id: string; nom: string }

// Roadmap 6.3 — suggestion de comportement tactique selon l'INT du monstre.
function suggestionTactique(int: number): string {
  if (int < 6)
    return 'Attaque la cible la plus proche. Fuit en désordre si grièvement blessé (≤ 25 % PV).'
  if (int <= 12)
    return 'Cible la proie la plus faible ou isolée. Se replie de façon coordonnée sous 25 % PV.'
  return 'Stratégie complexe : vise en priorité les lanceurs de sorts et les soigneurs, exploite le terrain et les couverts, garde une porte de sortie.'
}

// Roadmap 2.5 — archétypes de variante : modifient les stats du monstre source.
type VariantArchetype = {
  cle: string
  label: string
  desc: string
  appliquer: (e: Ennemi) => {
    hp: number
    armure: number
    force: number
    dexterite: number
    constitution: number
    intelligence: number
    sagesse: number
    charisme: number
    note: string
  }
}

const VARIANT_ARCHETYPES: VariantArchetype[] = [
  {
    cle: 'chef',
    label: '👑 Chef',
    desc: '+25 % HP · attaque supplémentaire',
    appliquer: (e) => ({
      hp: Math.round(e.hp_max * 1.25),
      armure: e.armure,
      force: e.force,
      dexterite: e.dexterite,
      constitution: e.constitution,
      intelligence: e.intelligence,
      sagesse: e.sagesse,
      charisme: e.charisme,
      note: '— Variante Chef — Attaque supplémentaire (Multiattaque), commande les sbires.'
    })
  },
  {
    cle: 'elite',
    label: '⭐ Élite',
    desc: '+25 % HP · +2 armure · +2 à toutes les stats',
    appliquer: (e) => ({
      hp: Math.round(e.hp_max * 1.25),
      armure: e.armure + 2,
      force: e.force + 2,
      dexterite: e.dexterite + 2,
      constitution: e.constitution + 2,
      intelligence: e.intelligence + 2,
      sagesse: e.sagesse + 2,
      charisme: e.charisme + 2,
      note: '— Variante Élite — Combattant aguerri, toutes les stats renforcées.'
    })
  },
  {
    cle: 'mage',
    label: '🔮 Mage',
    desc: '+3 INT · sorts de niveau 1 à 3',
    appliquer: (e) => ({
      hp: e.hp_max,
      armure: e.armure,
      force: e.force,
      dexterite: e.dexterite,
      constitution: e.constitution,
      intelligence: e.intelligence + 3,
      sagesse: e.sagesse,
      charisme: e.charisme,
      note: '— Variante Mage — Connaît des sorts de niveau 1 à 3 (à détailler).'
    })
  },
  {
    cle: 'ancien',
    label: '🐉 Ancien',
    desc: '+50 % HP · +2 armure · +3 à toutes les stats · sorts puissants',
    appliquer: (e) => ({
      hp: Math.round(e.hp_max * 1.5),
      armure: e.armure + 2,
      force: e.force + 3,
      dexterite: e.dexterite + 3,
      constitution: e.constitution + 3,
      intelligence: e.intelligence + 3,
      sagesse: e.sagesse + 3,
      charisme: e.charisme + 3,
      note: '— Variante Ancien — Créature légendaire, sorts de haut niveau.'
    })
  }
]

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
  // Roadmap 6.3 — comportement tactique (texte libre + suggestion selon INT).
  const [comportementTactique, setComportementTactique] = useState('')
  // Refonte combat diffusion — résistances / immunités / vulnérabilités
  // (saisies en texte séparé par des virgules, stockées en array jsonb).
  const [resistances, setResistances] = useState('')
  const [immunites, setImmunites] = useState('')
  const [vulnerabilites, setVulnerabilites] = useState('')
  // Roadmap 6.4 — combat de masse : ennemi représentant un groupe d'unités.
  const [estGroupe, setEstGroupe] = useState(false)
  const [tailleGroupe, setTailleGroupe] = useState('1')
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
  // Roadmap 2.3 — palier de CR choisi pour le générateur de loot.
  const [lootPalier, setLootPalier] = useState<PalierCR>('cr_0_4')
  // Roadmap 2.4 — vue compacte / détaillée des fiches ennemi (localStorage).
  const [vueCompacte, setVueCompacte] = useState(false)
  // Roadmap 2.5 — id du monstre source quand on crée une variante.
  const [variantDe, setVariantDe] = useState<string | null>(null)
  const [variantSource, setVariantSource] = useState<Ennemi | null>(null)
  const [mesTemplatesOuvert, setMesTemplatesOuvert] = useState(false)

  // Restaure la préférence de vue compacte/détaillée.
  useEffect(() => {
    try {
      setVueCompacte(window.localStorage.getItem('ennemis_vue_compacte') === '1')
    } catch {
      /* localStorage indisponible : on garde la vue détaillée par défaut */
    }
  }, [])

  const togglerVue = () => {
    setVueCompacte((v) => {
      const next = !v
      try {
        window.localStorage.setItem('ennemis_vue_compacte', next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  // Pré-remplit le formulaire avec une variante du monstre source.
  const creerVariante = (ennemi: Ennemi, archetype: VariantArchetype) => {
    const m = archetype.appliquer(ennemi)
    setEditingId(null)
    setVariantDe(ennemi.id)
    setNom(`${ennemi.nom} (${archetype.label.replace(/^\S+\s/, '')})`)
    setHp(String(m.hp))
    setArmure(String(m.armure))
    setForce(String(m.force))
    setDexterite(String(m.dexterite))
    setConstitution(String(m.constitution))
    setIntelligence(String(m.intelligence))
    setSagesse(String(m.sagesse))
    setCharisme(String(m.charisme))
    setNotes(
      ennemi.notes ? `${ennemi.notes.trimEnd()}\n\n${m.note}` : m.note
    )
    setScenarioId(ennemi.scenario_id ?? '')
    setFile(null)
    setImageActuelle(ennemi.image_url ?? '')
    setCropperKey((k) => k + 1)
    setVariantSource(null)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
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
    setComportementTactique('')
    setResistances('')
    setImmunites('')
    setVulnerabilites('')
    setEstGroupe(false)
    setTailleGroupe('1')
    setEditingId(null)
    setScenarioId('')
    setFile(null)
    setImageActuelle('')
    setCropperKey((k) => k + 1)
    setVariantDe(null)
  }

  const commencerEdition = (ennemi: Ennemi) => {
    setEditingId(ennemi.id)
    setVariantDe(null)
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
    setComportementTactique(ennemi.comportement_tactique ?? '')
    setResistances(joinTypes(ennemi.resistances))
    setImmunites(joinTypes(ennemi.immunites))
    setVulnerabilites(joinTypes(ennemi.vulnerabilites))
    setEstGroupe(!!ennemi.est_groupe)
    setTailleGroupe(String(ennemi.taille_groupe ?? 1))
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
      comportement_tactique: comportementTactique,
      resistances: parseTypes(resistances),
      immunites: parseTypes(immunites),
      vulnerabilites: parseTypes(vulnerabilites),
      est_groupe: estGroupe,
      taille_groupe: estGroupe ? Math.max(1, parseInt(tailleGroupe) || 1) : 1,
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
        mj_id: user?.id,
        variant_de: variantDe
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
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white">
            {tc('back')}
          </button>
          <h1 className="text-2xl grim-title">{t('title')}</h1>
        </div>
        <div className="grim-card p-4 md:p-6 mb-6">
          <h2 className="text-lg grim-h2 mb-4">{editingId ? t('edit_title') : t('create_title')}</h2>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            {/* Roadmap 2.3 — générateur de loot par palier de CR (résultat
                ajouté aux notes de l'ennemi). */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={lootPalier}
                onChange={(e) => setLootPalier(e.target.value as PalierCR)}
                className="flex-1 min-w-[140px] p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                aria-label="Palier de CR pour le loot"
              >
                <option value="cr_0_4">CR 0–4</option>
                <option value="cr_5_10">CR 5–10</option>
                <option value="cr_11_16">CR 11–16</option>
                <option value="cr_17_plus">CR 17+</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  const loot = formaterLoot(genererLoot(lootPalier))
                  setNotes((n) =>
                    n.trim()
                      ? `${n.trimEnd()}\n\n— Butin généré —\n${loot}`
                      : `— Butin généré —\n${loot}`
                  )
                }}
                className="px-3 py-2 rounded bg-gray-800 border border-yellow-600/50 text-yellow-300 hover:bg-gray-700 text-sm font-bold whitespace-nowrap"
                title="Générer un butin et l'ajouter aux notes"
              >
                🎲 Générer le loot
              </button>
            </div>
            {/* Roadmap 6.3 — comportement tactique + suggestion selon l'INT. */}
            <div className="rounded border border-gray-700 bg-gray-900/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-bold text-yellow-300">
                  🧠 Comportement tactique
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setComportementTactique(
                      suggestionTactique(parseInt(intelligence) || 10)
                    )
                  }
                  className="px-2 py-1 rounded bg-gray-800 border border-yellow-600/50 text-yellow-300 hover:bg-gray-700 text-xs font-bold"
                  title="Suggérer un comportement selon l'Intelligence du monstre"
                >
                  💡 Suggérer (INT {intelligence})
                </button>
              </div>
              <textarea
                value={comportementTactique}
                onChange={(e) => setComportementTactique(e.target.value)}
                placeholder="Comment ce monstre se bat, ses priorités de cible, sa condition de fuite…"
                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm h-20"
              />
            </div>

            {/* Refonte combat diffusion — résistances / immunités / vulnérabilités.
                Affichées côté cockpit MJ pendant le combat. Séparer par des virgules. */}
            <div className="rounded border border-gray-700 bg-gray-900/40 p-3 space-y-2">
              <label className="text-sm font-bold text-yellow-300">
                🛡 Mitigation des dégâts
              </label>
              <p className="text-[11px] text-gray-400 -mt-1">
                Types de dégâts séparés par des virgules (ex : feu, froid, contondant).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-blue-300 block mb-0.5">Résistances</label>
                  <input
                    type="text"
                    value={resistances}
                    onChange={(e) => setResistances(e.target.value)}
                    placeholder="feu, froid"
                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-300 block mb-0.5">Immunités</label>
                  <input
                    type="text"
                    value={immunites}
                    onChange={(e) => setImmunites(e.target.value)}
                    placeholder="poison"
                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-red-300 block mb-0.5">Vulnérabilités</label>
                  <input
                    type="text"
                    value={vulnerabilites}
                    onChange={(e) => setVulnerabilites(e.target.value)}
                    placeholder="radiant"
                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Roadmap 6.4 — combat de masse. */}
            <div className="rounded border border-gray-700 bg-gray-900/40 p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-yellow-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={estGroupe}
                  onChange={(e) => setEstGroupe(e.target.checked)}
                  className="accent-yellow-500"
                />
                👥 Combat de masse (groupe d&apos;unités identiques)
              </label>
              {estGroupe && (
                <div className="flex items-center gap-2">
                  <label className="text-gray-400 text-xs">Nombre d&apos;unités</label>
                  <input
                    type="number"
                    min={1}
                    value={tailleGroupe}
                    onChange={(e) => setTailleGroupe(e.target.value)}
                    className="w-24 p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                  />
                  <span className="text-[11px] text-gray-500">
                    PV agrégés : {(parseInt(hp) || 0) * (parseInt(tailleGroupe) || 1)} ·
                    initiative et fiche uniques pour tout le groupe
                  </span>
                </div>
              )}
            </div>

            <ImageCropper
              key={cropperKey}
              inputId="ennemi-file"
              currentImageUrl={imageActuelle}
              onChange={setFile}
              aspect={1}
              label={editingId ? "Nouvelle image (laisser vide pour garder l'actuelle)" : "Image de l'ennemi"}
            />
            {message && <p className="text-yellow-400 text-sm">{message}</p>}
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={sauvegarderEnnemi} disabled={loading} className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded codex-btn-press">
                {loading ? tc('loading') : editingId ? tc('modify') : tc('create')}
              </button>
              {/* Roadmap Affinement 2.2 — save / load personal templates */}
              <button
                type="button"
                onClick={() => sauvegarderCommeTemplate('ennemis', {
                  nom,
                  hp_max: parseInt(hp) || 10, armure: parseInt(armure) || 10,
                  force: parseInt(force) || 10, dexterite: parseInt(dexterite) || 10,
                  constitution: parseInt(constitution) || 10, intelligence: parseInt(intelligence) || 10,
                  sagesse: parseInt(sagesse) || 10, charisme: parseInt(charisme) || 10,
                  notes, image_url: imageActuelle || null,
                  comportement_tactique: comportementTactique,
                  est_groupe: estGroupe, taille_groupe: parseInt(tailleGroupe) || 1,
                }, nom || 'Ennemi sans nom')}
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
                title="Charger un de mes templates ennemis"
              >
                📂 Mes templates
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="px-4 p-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600 codex-btn-press">
                  {tc('cancel')}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg grim-h2">{t('my_enemies')}</h2>
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={favorisOnly}
                onChange={(e) => setFavorisOnly(e.target.checked)}
                className="accent-yellow-500"
              />
              ⭐ Afficher uniquement les favoris
            </label>
            {/* Roadmap 2.4 — bascule vue compacte / détaillée */}
            <button
              type="button"
              onClick={togglerVue}
              className="px-3 py-1 rounded border border-gray-700 text-gray-300 hover:border-yellow-600 hover:text-yellow-300 text-xs font-bold transition"
              title="Basculer entre vue compacte (combat) et détaillée"
            >
              {vueCompacte ? '🔎 Vue détaillée' : '📋 Vue compacte'}
            </button>
          </div>
          {ennemis
            .filter((e) => !favorisOnly || estFavori('ennemis', e.id))
            .map((ennemi) => (
            <div key={ennemi.id} className="grim-card grim-card-hover p-4">
              <div className="flex gap-4">
                {ennemi.image_url && (
                  <img
                    src={ennemi.image_url}
                    alt={ennemi.nom}
                    loading="lazy"
                    className="w-24 h-24 object-cover rounded bg-gray-900 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
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
                      {/* Roadmap 2.5 — créer une variante de ce monstre */}
                      <button
                        type="button"
                        onClick={() => setVariantSource(ennemi)}
                        className="text-purple-300 hover:text-purple-200 text-sm"
                        title="Créer une variante (Chef, Élite, Mage, Ancien)"
                      >
                        ⎘ Variante
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
                  {/* Roadmap 2.5 — badge si cet ennemi est une variante */}
                  {ennemi.variant_de && (
                    <p className="text-[11px] text-purple-300/80 italic mb-1">
                      ↳ variante de{' '}
                      {ennemis.find((e) => e.id === ennemi.variant_de)?.nom ??
                        'un monstre supprimé'}
                    </p>
                  )}
                  {/* Roadmap 2.4 — vue compacte (combat) vs détaillée */}
                  {vueCompacte ? (
                    <div className="flex gap-4 text-sm text-gray-300">
                      <span>❤️ HP: {ennemi.hp_actuel}/{ennemi.hp_max}</span>
                      <span>🛡️ Armure: {ennemi.armure}</span>
                      <span className="text-gray-600 italic">
                        … détails masqués
                      </span>
                    </div>
                  ) : (
                    <>
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
                      {ennemi.est_groupe && (ennemi.taille_groupe ?? 1) > 1 && (
                        <p className="text-sm mt-2">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{
                              background: 'rgba(248,113,113,0.15)',
                              color: '#f87171',
                              border: '1px solid rgba(248,113,113,0.3)'
                            }}
                          >
                            👥 Groupe — {ennemi.taille_groupe} unités · PV agrégés{' '}
                            {ennemi.hp_actuel * (ennemi.taille_groupe ?? 1)}/
                            {ennemi.hp_max * (ennemi.taille_groupe ?? 1)}
                          </span>
                        </p>
                      )}
                      {ennemi.comportement_tactique && (
                        <p className="text-sm mt-2 text-yellow-200/80 whitespace-pre-wrap">
                          🧠 <span className="text-gray-400">Tactique :</span>{' '}
                          {ennemi.comportement_tactique}
                        </p>
                      )}
                      {ennemi.notes && (
                        <p className="text-gray-500 text-sm mt-2 italic whitespace-pre-wrap">
                          {ennemi.notes}
                        </p>
                      )}
                    </>
                  )}
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

      {/* Roadmap 2.5 — choix de l'archétype de variante */}
      {variantSource && (
        <div
          className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setVariantSource(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Créer une variante"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-800 border-2 border-yellow-600 rounded-lg shadow-2xl w-full max-w-md p-4 space-y-3"
          >
            <h3 className="text-yellow-500 font-bold">
              ⎘ Variante de « {variantSource.nom} »
            </h3>
            <p className="text-gray-400 text-xs">
              Choisis un archétype : le formulaire sera pré-rempli avec les stats
              du monstre, modifiées en conséquence. Tu pourras tout ajuster avant
              d&apos;enregistrer.
            </p>
            <div className="space-y-2">
              {VARIANT_ARCHETYPES.map((a) => (
                <button
                  key={a.cle}
                  type="button"
                  onClick={() => creerVariante(variantSource, a)}
                  className="w-full text-left p-3 rounded border border-gray-700 hover:border-yellow-500 hover:bg-yellow-500/[0.06] transition"
                >
                  <p className="text-sm font-bold text-gray-100">{a.label}</p>
                  <p className="text-[11px] text-gray-400">{a.desc}</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setVariantSource(null)}
              className="w-full p-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      {/* Roadmap Affinement 2.2 — Mes templates ennemis persos */}
      <TemplatesPicker
        open={mesTemplatesOuvert}
        onClose={() => setMesTemplatesOuvert(false)}
        kind="ennemis"
        onApply={(c) => {
          const get = (k: string, d: string) => (typeof c[k] === 'string' || typeof c[k] === 'number') ? String(c[k]) : d
          setNom(get('nom', ''))
          setHp(get('hp_max', '10'))
          setArmure(get('armure', '10'))
          setForce(get('force', '10'))
          setDexterite(get('dexterite', '10'))
          setConstitution(get('constitution', '10'))
          setIntelligence(get('intelligence', '10'))
          setSagesse(get('sagesse', '10'))
          setCharisme(get('charisme', '10'))
          setNotes(get('notes', ''))
          setComportementTactique(get('comportement_tactique', ''))
          setEstGroupe(c.est_groupe === true)
          setTailleGroupe(get('taille_groupe', '1'))
          if (typeof c.image_url === 'string') setImageActuelle(c.image_url)
        }}
      />
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