'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
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
import {
  ITEMS_DND5E,
  TYPES_ITEM,
  RARETES_ITEM,
  compareRarete,
  itemMagiqueVersItem,
  itemDescription,
  genererItemMagique,
  type ItemMagique,
  type RareteItem,
  type TypeItem
} from '@/app/data/items_dnd5e'

// Roadmap 4.3 — recette de craft (JSONB libre sur la table items).
type RecetteCraft = { materiaux: string; temps: string; competence: string }

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
  // Roadmap 4.2 — identification d'objet.
  identifie: boolean
  niveau_identification: number
  // Roadmap 4.3 — recette de craft.
  recette_craft: RecetteCraft | null
}

type ScenarioOption = { id: string; nom: string }

const TYPES = ['Arme', 'Armure', 'Potion', 'Parchemin', 'Objet merveilleux', 'Autre']
const RARETES = ['Commun', 'Peu commun', 'Rare', 'Très rare', 'Légendaire', 'Artéfact']

// Roadmap 4.2 — ce que voient les joueurs selon le niveau d'identification :
// 0 « Objet inconnu » · 1 nom · 2 +type/rareté · 3 +description complète.
// Un objet `identifie` (ou pré-migration, champ absent) est entièrement visible.
function vueJoueurItem(item: Item): { nom: string; type: string; rarete: string; description: string } {
  if (item.identifie !== false) {
    return { nom: item.nom, type: item.type, rarete: item.rarete, description: item.description }
  }
  const n = item.niveau_identification ?? 0
  return {
    nom: n >= 1 ? item.nom : 'Objet inconnu',
    type: n >= 2 ? item.type : '???',
    rarete: n >= 2 ? item.rarete : '???',
    description: n >= 3 ? item.description : ''
  }
}

export default function Items() {
  const router = useRouter()
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
  const [importerOuvert, setImporterOuvert] = useState(false)
  const [favorisOnly, setFavorisOnly] = useState(false)
  // Roadmap 4.1 — filtre de rareté pour le générateur d'item magique ('' = au hasard).
  const [genRarete, setGenRarete] = useState<RareteItem | ''>('')
  // Roadmap 3.3 — composeur de propriétés d'item custom (inséré dans la
  // description, pas de colonne SQL dédiée).
  const [craftOuvert, setCraftOuvert] = useState(false)
  const [craftDegats, setCraftDegats] = useState('')
  const [craftCa, setCraftCa] = useState('')
  const [craftPoids, setCraftPoids] = useState('')
  const [craftValeur, setCraftValeur] = useState('')
  const [craftProprietes, setCraftProprietes] = useState('')
  // Roadmap 4.2 — identification (objet mystérieux + révélation progressive).
  const [identifie, setIdentifie] = useState(true)
  const [niveauIdent, setNiveauIdent] = useState(3)
  // Roadmap 4.3 — recette de craft.
  const [recetteOuvert, setRecetteOuvert] = useState(false)
  const [recetteMateriaux, setRecetteMateriaux] = useState('')
  const [recetteTemps, setRecetteTemps] = useState('')
  const [recetteCompetence, setRecetteCompetence] = useState('')

  // Compose les propriétés renseignées en bloc texte et l'insère dans la
  // description, puis vide les champs.
  const insererProprietes = () => {
    const lignes: string[] = []
    if (craftDegats.trim()) lignes.push(`Dégâts : ${craftDegats.trim()}`)
    if (craftCa.trim()) lignes.push(`CA / armure : ${craftCa.trim()}`)
    if (craftPoids.trim()) lignes.push(`Poids : ${craftPoids.trim()}`)
    if (craftValeur.trim()) lignes.push(`Valeur : ${craftValeur.trim()}`)
    if (craftProprietes.trim())
      lignes.push(`Propriétés magiques : ${craftProprietes.trim()}`)
    if (lignes.length === 0) return
    const bloc = `— Propriétés —\n${lignes.join('\n')}`
    setDescription((d) => (d.trim() ? `${d.trimEnd()}\n\n${bloc}` : bloc))
    setCraftDegats('')
    setCraftCa('')
    setCraftPoids('')
    setCraftValeur('')
    setCraftProprietes('')
    setCraftOuvert(false)
  }
  const { est: estFavori } = useFavoris()
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
    setIdentifie(true)
    setNiveauIdent(3)
    setRecetteOuvert(false)
    setRecetteMateriaux('')
    setRecetteTemps('')
    setRecetteCompetence('')
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
    setIdentifie(item.identifie ?? true)
    setNiveauIdent(item.niveau_identification ?? 3)
    const rc = item.recette_craft
    setRecetteMateriaux(rc?.materiaux ?? '')
    setRecetteTemps(rc?.temps ?? '')
    setRecetteCompetence(rc?.competence ?? '')
    setRecetteOuvert(!!(rc && (rc.materiaux || rc.temps || rc.competence)))
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

    const recetteRenseignee =
      recetteMateriaux.trim() || recetteTemps.trim() || recetteCompetence.trim()
    const payload = {
      nom,
      description,
      type,
      rarete,
      scenario_id: scenarioId || null,
      image_url: imageUrl,
      // Roadmap 4.2 — un objet identifié est toujours au niveau 3 (tout visible).
      identifie,
      niveau_identification: identifie ? 3 : niveauIdent,
      // Roadmap 4.3 — null si aucun champ de recette renseigné.
      recette_craft: recetteRenseignee
        ? {
            materiaux: recetteMateriaux.trim(),
            temps: recetteTemps.trim(),
            competence: recetteCompetence.trim()
          }
        : null
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

            {/* Roadmap 3.3 — composeur de propriétés d'item custom (arme /
                armure / objet magique). Les champs remplis sont formatés et
                insérés dans la description ci-dessus. */}
            <div className="rounded border border-gray-700 bg-gray-900/40">
              <button
                type="button"
                onClick={() => setCraftOuvert((v) => !v)}
                aria-expanded={craftOuvert}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm font-bold text-yellow-300"
              >
                <span>🔨 Propriétés (arme / armure / objet magique)</span>
                <span className="text-[10px] text-gray-500">
                  {craftOuvert ? '▾' : '▸'}
                </span>
              </button>
              {craftOuvert && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={craftDegats}
                      onChange={(e) => setCraftDegats(e.target.value)}
                      placeholder="Dégâts (1d8 tranchant)"
                      className="p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                    />
                    <input
                      type="text"
                      value={craftCa}
                      onChange={(e) => setCraftCa(e.target.value)}
                      placeholder="CA / armure (+1, 14+Dex…)"
                      className="p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                    />
                    <input
                      type="text"
                      value={craftPoids}
                      onChange={(e) => setCraftPoids(e.target.value)}
                      placeholder="Poids (1,5 kg)"
                      className="p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                    />
                    <input
                      type="text"
                      value={craftValeur}
                      onChange={(e) => setCraftValeur(e.target.value)}
                      placeholder="Valeur (50 po)"
                      className="p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                    />
                  </div>
                  <textarea
                    value={craftProprietes}
                    onChange={(e) => setCraftProprietes(e.target.value)}
                    placeholder="Propriétés magiques (bonus, sorts, malédictions…)"
                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm h-16"
                  />
                  <button
                    type="button"
                    onClick={insererProprietes}
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-yellow-600/50 text-yellow-300 hover:bg-gray-700 text-xs font-bold"
                  >
                    🔨 Insérer dans la description
                  </button>
                </div>
              )}
            </div>

            {/* Roadmap 4.2 — identification d'objet : objet mystérieux + révélation progressive. */}
            <div className="rounded border border-gray-700 bg-gray-900/40 p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-yellow-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!identifie}
                  onChange={(e) => setIdentifie(!e.target.checked)}
                  className="accent-yellow-500"
                />
                🔮 Objet mystérieux (non identifié)
              </label>
              {!identifie && (
                <div>
                  <label className="text-gray-400 text-xs">
                    Niveau de révélation : {niveauIdent}/3
                  </label>
                  <div className="flex gap-1 mt-1">
                    {[0, 1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNiveauIdent(n)}
                        className={`flex-1 py-1.5 rounded text-xs font-bold border ${
                          niveauIdent === n
                            ? 'bg-yellow-600 text-gray-900 border-yellow-500'
                            : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                        }`}
                      >
                        {['Rien', 'Nom', 'Type', 'Tout'][n]}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    0 « Objet inconnu » · 1 nom révélé · 2 +type/rareté · 3 +description complète
                  </p>
                </div>
              )}
            </div>

            {/* Roadmap 4.3 — recette de craft (matériaux / temps / compétence). */}
            <div className="rounded border border-gray-700 bg-gray-900/40">
              <button
                type="button"
                onClick={() => setRecetteOuvert((v) => !v)}
                aria-expanded={recetteOuvert}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm font-bold text-yellow-300"
              >
                <span>⚒️ Recette de craft</span>
                <span className="text-[10px] text-gray-500">{recetteOuvert ? '▾' : '▸'}</span>
              </button>
              {recetteOuvert && (
                <div className="px-3 pb-3 space-y-2">
                  <textarea
                    value={recetteMateriaux}
                    onChange={(e) => setRecetteMateriaux(e.target.value)}
                    placeholder="Matériaux requis (2 lingots de mithril, 1 cœur d'élémentaire…)"
                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm h-16"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={recetteTemps}
                      onChange={(e) => setRecetteTemps(e.target.value)}
                      placeholder="Temps de craft (3 jours)"
                      className="p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                    />
                    <input
                      type="text"
                      value={recetteCompetence}
                      onChange={(e) => setRecetteCompetence(e.target.value)}
                      placeholder="Compétence requise (Forge, DD 15)"
                      className="p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Roadmap 4.1 — générateur d'item magique (SRD), pré-remplit le formulaire */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={genRarete}
                onChange={(e) => setGenRarete(e.target.value as RareteItem | '')}
                className="flex-1 min-w-[140px] p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                aria-label="Rareté de l'item magique généré"
              >
                <option value="">Rareté : au hasard</option>
                {RARETES_ITEM.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const item = genererItemMagique(
                    genRarete ? { rarete: genRarete } : {}
                  )
                  if (!item) {
                    setMessage('Aucun item magique pour ce filtre.')
                    return
                  }
                  setNom(item.nom)
                  setRarete(item.rarete)
                  setType(TYPES.includes(item.type) ? item.type : 'Autre')
                  setDescription(itemDescription(item))
                }}
                className="px-3 py-2 rounded bg-gray-800 border border-yellow-600/50 text-yellow-300 hover:bg-gray-700 text-sm font-bold whitespace-nowrap"
                title="Générer un objet magique du SRD et pré-remplir le formulaire"
              >
                🎲 Générer un item magique
              </button>
            </div>
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
            <h2 className="text-lg grim-h2">{t('my_items')}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setImporterOuvert(true)}
                className="px-3 py-1.5 rounded bg-yellow-600 hover:bg-yellow-500 text-gray-900 text-xs font-bold"
              >
                {t('import_magic_items')}
              </button>
              <button
                type="button"
                onClick={importerItem}
                className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"
              >
                {tc('import_json')}
              </button>
            </div>
          </div>
          {items.length === 0 && <p className="text-gray-400">{t('empty')}</p>}
          <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={favorisOnly}
              onChange={(e) => setFavorisOnly(e.target.checked)}
              className="accent-yellow-500"
            />
            ⭐ Afficher uniquement les favoris
          </label>
          {items
            .filter((it) => !favorisOnly || estFavori('items', it.id))
            .map((item) => (
            <div key={item.id} className="grim-card grim-card-hover p-4">
              <div className="flex gap-4">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.nom}
                    loading="lazy"
                    className="w-16 h-16 object-cover rounded bg-gray-900 flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <StarFavori type="items" id={item.id} />
                      <h3 className="text-lg font-bold text-white">{item.nom}</h3>
                    </div>
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
                  <div className="flex gap-3 text-sm text-gray-400 mb-2 flex-wrap items-center">
                    <span>📦 {item.type}</span>
                    <span>✨ {item.rarete}</span>
                    {item.identifie === false && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(167,139,250,0.15)',
                          color: '#a78bfa',
                          border: '1px solid rgba(167,139,250,0.3)'
                        }}
                        title="Objet mystérieux — révélation progressive"
                      >
                        🔮 Mystérieux — révélation {item.niveau_identification ?? 0}/3
                      </span>
                    )}
                    {item.recette_craft && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(201,168,76,0.12)',
                          color: '#C9A84C',
                          border: '1px solid rgba(201,168,76,0.3)'
                        }}
                        title="Recette de craft renseignée"
                      >
                        ⚒️ Recette
                      </span>
                    )}
                  </div>
                  {item.description && <p className="text-gray-500 text-sm italic">{item.description}</p>}
                  {item.identifie === false && (
                    <p className="text-[11px] text-purple-300/70 mt-1">
                      👁 Vue joueur : <span className="italic">{vueJoueurItem(item).nom}</span>
                      {vueJoueurItem(item).type !== '???' &&
                        ` · ${vueJoueurItem(item).type} · ${vueJoueurItem(item).rarete}`}
                    </p>
                  )}
                  {item.recette_craft && (
                    <div className="mt-2 text-xs text-gray-400 rounded border border-yellow-700/30 bg-yellow-900/10 p-2 space-y-0.5">
                      {item.recette_craft.materiaux && (
                        <p>⚒️ <span className="text-gray-300">Matériaux :</span> {item.recette_craft.materiaux}</p>
                      )}
                      {item.recette_craft.temps && (
                        <p>⏳ <span className="text-gray-300">Temps :</span> {item.recette_craft.temps}</p>
                      )}
                      {item.recette_craft.competence && (
                        <p>🛠 <span className="text-gray-300">Compétence :</span> {item.recette_craft.competence}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {importerOuvert && (
        <ItemsMagiquesImporter
          onClose={() => setImporterOuvert(false)}
          existingNames={new Set(items.map((i) => i.nom))}
          onImported={(n) => {
            setMessage(t('imported_count', { n }))
            fetchItems()
          }}
        />
      )}
    </main>
  )
}

// ----------------------------------------------------------------------------
// ItemsMagiquesImporter : modale qui liste les items magiques du SRD avec
// filtres rareté/type et insère des copies dans la table items.
// ----------------------------------------------------------------------------
function ItemsMagiquesImporter({
  onClose,
  existingNames,
  onImported
}: {
  onClose: () => void
  existingNames: Set<string>
  onImported: (n: number) => void
}) {
  const t = useTranslations('items')
  const tc = useTranslations('common')
  const [filtreType, setFiltreType] = useState<TypeItem | 'all'>('all')
  const [filtreRarete, setFiltreRarete] = useState<RareteItem | 'all'>('all')
  const [recherche, setRecherche] = useState('')
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [enImport, setEnImport] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return ITEMS_DND5E.filter((it) => {
      if (filtreType !== 'all' && it.type !== filtreType) return false
      if (filtreRarete !== 'all' && it.rarete !== filtreRarete) return false
      if (q && !`${it.nom} ${it.nomEn}`.toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => compareRarete(a.rarete, b.rarete) || a.nom.localeCompare(b.nom))
  }, [filtreType, filtreRarete, recherche])

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
    const choisis = ITEMS_DND5E.filter((it) => selection.has(it.nom))
    const rows = choisis.map((it: ItemMagique) => itemMagiqueVersItem(it, user.id))
    const { error } = await supabase.from('items').insert(rows)
    setEnImport(false)
    if (error) {
      console.error('[items] import magiques :', error)
      setErreur(error.message)
      return
    }
    onImported(rows.length)
    onClose()
  }

  const couleurRarete = (r: RareteItem): string => {
    switch (r) {
      case 'Commun': return '#a8a8b0'
      case 'Peu commun': return '#34d399'
      case 'Rare': return '#60a5fa'
      case 'Très rare': return '#a78bfa'
      case 'Légendaire': return '#fb923c'
      case 'Artéfact': return '#f87171'
    }
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
            📚 {t('import_magic_items')}
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
          className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-2 border-b"
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
            value={filtreType}
            onChange={(e) => setFiltreType(e.target.value as TypeItem | 'all')}
            className="px-2.5 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none"
          >
            <option value="all">{t('all_types')}</option>
            {TYPES_ITEM.map((tp) => (
              <option key={tp} value={tp}>{tp}</option>
            ))}
          </select>
          <select
            value={filtreRarete}
            onChange={(e) => setFiltreRarete(e.target.value as RareteItem | 'all')}
            className="px-2.5 py-1.5 rounded bg-black/40 border border-[rgba(201,168,76,0.2)] text-white text-xs outline-none"
          >
            <option value="all">{t('all_rarities')}</option>
            {RARETES_ITEM.map((r) => (
              <option key={r} value={r}>{r}</option>
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
              {filtres.map((it, idx) => {
                const selected = selection.has(it.nom)
                const dejaPossede = existingNames.has(it.nom)
                return (
                  <li key={`${it.nom}-${idx}`}>
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
                        onChange={() => togglerSel(it.nom)}
                        className="mt-1 accent-yellow-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-yellow-200 font-bold">{it.nom}</span>
                          <span className="text-[10px] text-gray-500 italic">{it.nomEn}</span>
                          <span className="text-[10px] text-gray-400">{it.type}</span>
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: couleurRarete(it.rarete) }}
                          >
                            {it.rarete}
                          </span>
                          {it.syntonisation && (
                            <span className="text-[10px] text-gray-500" title="Syntonisation requise">
                              ⚙
                            </span>
                          )}
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
                          {it.description}
                        </p>
                        {it.effets.length > 0 && (
                          <ul className="mt-1 text-[10px] text-gray-500 space-y-0.5 line-clamp-2">
                            {it.effets.slice(0, 2).map((e, i) => (
                              <li key={i}>• {e}</li>
                            ))}
                          </ul>
                        )}
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
