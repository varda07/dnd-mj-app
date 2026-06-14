'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import nextDynamic from 'next/dynamic'
// V1 6.2 — code splitting : la carte mentale (lourde) n'est chargée qu'à
// l'ouverture de la vue carte. `dynamic` est déjà pris par `export const
// dynamic`, d'où l'alias nextDynamic.
const MindMap = nextDynamic(() => import('./MindMap'), {
  ssr: false,
  loading: () => <p className="text-gray-400 italic p-6">Chargement de la carte…</p>
})
import GuidedTour from '@/app/components/GuidedTour'
import StarFavori from '@/app/components/StarFavori'
import TemplatesScenariosGallery from '@/app/components/TemplatesScenariosGallery'
import { useFavoris } from '@/app/lib/favoris'
import { unlockAchievement } from '@/app/lib/achievements'
import {
  construireEnveloppe,
  lireFichierJSON,
  nettoyer,
  ouvrirSelecteurFichier,
  slugFichier,
  telechargerJSON,
  validerEnveloppe
} from '@/app/lib/import-export'

type Scenario = {
  id: string
  nom: string
  description: string
  notes: string
  public: boolean
  nb_copies: number
  auteur_username: string | null
  actif: boolean
  nb_chapitres?: number
  nb_quetes_actives?: number
  nb_quetes_terminees?: number
}

export default function Scenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [codesVisibles, setCodesVisibles] = useState<Record<string, string>>({})
  const [codeJoueur, setCodeJoueur] = useState('')
  const [scenarioCibleId, setScenarioCibleId] = useState('')
  const [messageJoueur, setMessageJoueur] = useState('')
  const [vue, setVue] = useState<'liste' | 'carte'>('liste')
  const [favorisOnly, setFavorisOnly] = useState(false)
  const [templatesOuvert, setTemplatesOuvert] = useState(false)
  const { est: estFavori } = useFavoris()
  const router = useRouter()
  const t = useTranslations('scenarios')
  const tc = useTranslations('common')
  const td = useTranslations('dashboard')

  const ajouterJoueur = async () => {
    setMessageJoueur('')
    const code = codeJoueur.trim().toUpperCase()
    if (!code) return setMessageJoueur(td('enter_code'))
    if (!scenarioCibleId) return setMessageJoueur(td('choose_scenario'))

    const { data: invit, error: err1 } = await supabase
      .from('codes_invitation')
      .select('id, personnage_id, utilise')
      .eq('code', code)
      .maybeSingle()
    if (err1 || !invit) return setMessageJoueur(td('code_not_found'))
    if (invit.utilise) return setMessageJoueur(td('code_already_used'))
    if (!invit.personnage_id) return setMessageJoueur(td('code_not_player'))

    const { error: err2 } = await supabase
      .from('personnages')
      .update({ scenario_id: scenarioCibleId })
      .eq('id', invit.personnage_id)
    if (err2) return setMessageJoueur(td('cannot_link', { message: err2.message }))

    await supabase.from('codes_invitation').update({ utilise: true }).eq('id', invit.id)

    setMessageJoueur(td('character_added_ok'))
    setCodeJoueur('')
  }

  const resetForm = () => {
    setNom('')
    setDescription('')
    setNotes('')
    setEditingId(null)
  }

  const commencerEdition = (scenario: Scenario) => {
    setEditingId(scenario.id)
    setNom(scenario.nom)
    setDescription(scenario.description ?? '')
    setNotes(scenario.notes ?? '')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('scenarios')
      .select('*')
      .eq('mj_id', user.id)
      .order('created_at', { ascending: false })
    if (!data) return

    // Compte des chapitres + quêtes (actives/terminées) par scénario.
    const ids = data.map((s: { id: string }) => s.id)
    const chapMap = new Map<string, number>()
    const queteActiveMap = new Map<string, number>()
    const queteTermineeMap = new Map<string, number>()
    if (ids.length > 0) {
      const [{ data: chaps }, { data: qts }] = await Promise.all([
        supabase.from('chapitres').select('scenario_id').in('scenario_id', ids),
        supabase
          .from('quetes')
          .select('scenario_id, status')
          .in('scenario_id', ids)
      ])
      ;(chaps ?? []).forEach((c: { scenario_id: string }) => {
        chapMap.set(c.scenario_id, (chapMap.get(c.scenario_id) ?? 0) + 1)
      })
      ;(qts ?? []).forEach((q: { scenario_id: string; status: string }) => {
        if (q.status === 'active') {
          queteActiveMap.set(q.scenario_id, (queteActiveMap.get(q.scenario_id) ?? 0) + 1)
        } else if (q.status === 'terminee') {
          queteTermineeMap.set(q.scenario_id, (queteTermineeMap.get(q.scenario_id) ?? 0) + 1)
        }
      })
    }
    setScenarios(
      data.map((s) => ({
        ...s,
        nb_chapitres: chapMap.get(s.id) ?? 0,
        nb_quetes_actives: queteActiveMap.get(s.id) ?? 0,
        nb_quetes_terminees: queteTermineeMap.get(s.id) ?? 0
      })) as Scenario[]
    )
  }

  const sauvegarderScenario = async () => {
    if (!nom) return setMessage(t('name_required'))
    setLoading(true)
    if (editingId) {
      const { error } = await supabase.from('scenarios').update({ nom, description, notes }).eq('id', editingId)
      if (error) setMessage(error.message)
      else {
        setMessage(t('modified'))
        resetForm()
        fetchScenarios()
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('scenarios').insert({ nom, description, notes, mj_id: user?.id })
      if (error) setMessage(error.message)
      else {
        setMessage(t('created'))
        // Roadmap Affinement 2.10 — achievement premier scénario
        void unlockAchievement('premier_scenario')
        resetForm()
        fetchScenarios()
      }
    }
    setLoading(false)
  }

  const supprimerScenario = async (id: string) => {
    if (!window.confirm(tc('confirm_delete'))) return
    await supabase.from('scenarios').delete().eq('id', id)
    fetchScenarios()
  }

  const definirActif = async (scenario: Scenario) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (scenario.actif) {
      // Désactivation manuelle.
      const { error } = await supabase
        .from('scenarios')
        .update({ actif: false })
        .eq('id', scenario.id)
      if (error) {
        setMessage(error.message)
        return
      }
      fetchScenarios()
      return
    }
    // Active ce scénario, et désactive tous les autres du MJ — un seul actif.
    const { error: errClear } = await supabase
      .from('scenarios')
      .update({ actif: false })
      .eq('mj_id', user.id)
      .eq('actif', true)
    if (errClear) {
      setMessage(errClear.message)
      return
    }
    const { error } = await supabase
      .from('scenarios')
      .update({ actif: true })
      .eq('id', scenario.id)
    if (error) {
      setMessage(error.message)
      return
    }
    fetchScenarios()
  }

  const togglerPublic = async (scenario: Scenario) => {
    const rendrePublic = !scenario.public
    let auteurUsername = scenario.auteur_username ?? null
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
      .from('scenarios')
      .update({ public: rendrePublic, auteur_username: auteurUsername })
      .eq('id', scenario.id)
    if (error) setMessage(error.message)
    else fetchScenarios()
  }

  const genererCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let suffix = ''
    for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
    return `DND-${suffix}`
  }

  const inviterJoueur = async (scenarioId: string) => {
    const { data: existing } = await supabase
      .from('codes_invitation')
      .select('code')
      .eq('scenario_id', scenarioId)
      .eq('utilise', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.code) {
      setCodesVisibles((prev) => ({ ...prev, [scenarioId]: existing.code }))
      return
    }

    for (let i = 0; i < 5; i++) {
      const code = genererCode()
      const { error } = await supabase
        .from('codes_invitation')
        .insert({ code, scenario_id: scenarioId })
      if (!error) {
        setCodesVisibles((prev) => ({ ...prev, [scenarioId]: code }))
        return
      }
    }
    setMessage(t('cannot_generate_code'))
  }

  const exporterScenario = (s: Scenario) => {
    const env = construireEnveloppe('scenario', nettoyer(s as unknown as Record<string, unknown>))
    telechargerJSON(`scenario-${slugFichier(s.nom)}.json`, env)
  }

  const importerScenario = () => {
    ouvrirSelecteurFichier(async (f) => {
      try {
        const raw = await lireFichierJSON(f)
        const env = validerEnveloppe<Record<string, unknown>>(raw, ['scenario'])
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const clean = nettoyer(env.data)
        const nom = typeof clean.nom === 'string' && clean.nom.trim() !== '' ? clean.nom : 'Scénario importé'
        const { error } = await supabase.from('scenarios').insert({ ...clean, nom, mj_id: user.id })
        if (error) throw error
        setMessage(tc('import_ok'))
        fetchScenarios()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setMessage(tc('import_error', { message: msg }))
      }
    })
  }

  const cacherCode = (scenarioId: string) => {
    setCodesVisibles((prev) => {
      const next = { ...prev }
      delete next[scenarioId]
      return next
    })
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      {/* V1 5.2 — lanceur du tutoriel Mindmap, monté seulement en vue carte
          (évite le doublon avec d'autres 🎓 et n'apparaît pas en vue liste). */}
      {vue === 'carte' && <GuidedTour tourId="mindmap" />}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white">
            {tc('back')}
          </button>
          <h1 className="text-2xl grim-title">{t('title')}</h1>
        </div>
        <div className="flex bg-gray-800 rounded-lg p-1 mb-6 w-fit">
          <button
            type="button"
            onClick={() => setVue('liste')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition ${
              vue === 'liste' ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('view_list')}
          </button>
          <button
            type="button"
            onClick={() => setVue('carte')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition ${
              vue === 'carte' ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('view_map')}
          </button>
        </div>
        {vue === 'carte' ? (
          <MindMap scenarios={scenarios.map((s) => ({ id: s.id, nom: s.nom }))} />
        ) : (
        <>
        <div className="grim-card p-6 mb-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-lg grim-h2">{editingId ? t('edit_title') : t('create_title')}</h2>
            {!editingId && (
              <button
                type="button"
                onClick={() => setTemplatesOuvert(true)}
                className="codex-btn-press px-3 py-1.5 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30"
                title="Créer depuis un template pré-fait"
              >
                📚 Depuis un template…
              </button>
            )}
          </div>
          <div className="space-y-3">
            <input type="text" placeholder={t('scenario_name_ph')} value={nom} onChange={(e) => setNom(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none" />
            <textarea placeholder={tc('description')} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
            <textarea placeholder={tc('notes')} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none h-24" />
            {message && <p className="text-yellow-400 text-sm">{message}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={sauvegarderScenario} disabled={loading} className="flex-1 p-3 bg-yellow-500 text-gray-900 font-bold rounded">
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

        <div className="grim-card p-4 mb-6">
          <h2 className="text-lg grim-h2 mb-2">{t('add_player_title')}</h2>
          <p className="text-gray-400 text-sm mb-3">
            {t('add_player_desc')}
          </p>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={codeJoueur}
              onChange={(e) => setCodeJoueur(e.target.value)}
              placeholder={td('menu_join_code_ph')}
              className="flex-1 min-w-0 p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none font-mono uppercase"
            />
            <select
              value={scenarioCibleId}
              onChange={(e) => setScenarioCibleId(e.target.value)}
              className="flex-1 p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
            >
              <option value="">{t('choose_scenario_ph')}</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={ajouterJoueur}
              className="px-4 py-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400"
            >
              {td('add_player_button')}
            </button>
          </div>
          {messageJoueur && <p className="text-yellow-400 text-sm mt-2">{messageJoueur}</p>}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg grim-h2">{t('my_scenarios')}</h2>
            <button
              type="button"
              onClick={importerScenario}
              className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"
            >
              {tc('import_json')}
            </button>
          </div>
          {scenarios.length === 0 && <p className="text-gray-400">{t('empty')}</p>}
          <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={favorisOnly}
              onChange={(e) => setFavorisOnly(e.target.checked)}
              className="accent-yellow-500"
            />
            ⭐ Afficher uniquement les favoris
          </label>
          {scenarios
            .filter((s) => !favorisOnly || estFavori('scenarios', s.id))
            .map((scenario) => (
            <div key={scenario.id} className="grim-card grim-card-hover p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <StarFavori type="scenarios" id={scenario.id} />
                  <h3 className="text-lg font-bold text-white truncate">{scenario.nom}</h3>
                  {scenario.actif && (
                    <span
                      className="text-[10px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(201,168,76,0.15)',
                        border: '1px solid rgba(201,168,76,0.4)',
                        color: '#C9A84C'
                      }}
                    >
                      ★ {t('active_badge')}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 bg-gray-900/50 border border-gray-700 rounded-full px-2 py-0.5">
                    📖 {scenario.nb_chapitres ?? 0} chapitre{(scenario.nb_chapitres ?? 0) > 1 ? 's' : ''}
                  </span>
                  {((scenario.nb_quetes_actives ?? 0) > 0 ||
                    (scenario.nb_quetes_terminees ?? 0) > 0) && (
                    <span className="text-xs text-gray-400 bg-gray-900/50 border border-gray-700 rounded-full px-2 py-0.5">
                      🎯 {scenario.nb_quetes_actives ?? 0} active{(scenario.nb_quetes_actives ?? 0) > 1 ? 's' : ''} ·{' '}
                      {scenario.nb_quetes_terminees ?? 0} terminée{(scenario.nb_quetes_terminees ?? 0) > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => definirActif(scenario)}
                    className={`text-sm font-bold ${scenario.actif ? 'text-yellow-300' : 'text-gray-400 hover:text-yellow-400'}`}
                    title={scenario.actif ? t('unset_active_tooltip') : t('set_active_tooltip')}
                  >
                    {scenario.actif ? `★ ${t('active_badge')}` : `☆ ${t('set_active')}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/scenarios/${scenario.id}/edit`)}
                    className="text-yellow-400 text-sm font-bold"
                    title="Éditer (chapitres, éléments liés)"
                  >
                    📖 Éditer
                  </button>
                  <button type="button" onClick={() => inviterJoueur(scenario.id)} className="text-green-400 text-sm">
                    {t('invite_player')}
                  </button>
                  <button type="button" onClick={() => router.push(`/dashboard/scenarios/${scenario.id}/quetes`)} className="text-yellow-400 text-sm" title="Quêtes du scénario">
                    🎯 Quêtes
                  </button>
                  <button type="button" onClick={() => router.push(`/dashboard/scenarios/${scenario.id}/notes`)} className="text-yellow-400 text-sm">
                    {t('notes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglerPublic(scenario)}
                    className={`text-sm ${scenario.public ? 'text-green-400' : 'text-gray-400'}`}
                    title={scenario.public ? t('shared_tooltip', { n: scenario.nb_copies }) : t('share_tooltip')}
                  >
                    {scenario.public ? t('public_on', { n: scenario.nb_copies }) : t('public_off')}
                  </button>
                  <button type="button" onClick={() => commencerEdition(scenario)} className="text-blue-400 text-sm">
                    {tc('modify')}
                  </button>
                  <button
                    type="button"
                    onClick={() => exporterScenario(scenario)}
                    className="text-gray-400 hover:text-white text-sm"
                    title={tc('export_item_title')}
                  >
                    📥
                  </button>
                  <button type="button" onClick={() => supprimerScenario(scenario.id)} className="text-red-400 text-sm">
                    {tc('delete')}
                  </button>
                </div>
              </div>
              {codesVisibles[scenario.id] && (
                <div className="mt-2 p-2 rounded bg-gray-900 border border-green-600/50 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-gray-400 text-xs">{t('invite_code_label')}</p>
                    <code className="text-green-300 font-mono font-bold text-lg break-all">{codesVisibles[scenario.id]}</code>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(codesVisibles[scenario.id])}
                      className="text-gray-400 hover:text-white text-xs"
                      title={tc('copy')}
                    >
                      📋 {tc('copy')}
                    </button>
                    <button
                      type="button"
                      onClick={() => cacherCode(scenario.id)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
              {scenario.description && <p className="text-gray-400 text-sm mt-2">{scenario.description}</p>}
            </div>
          ))}
        </div>
        </>
        )}
      </div>
      <TemplatesScenariosGallery
        open={templatesOuvert}
        onClose={() => setTemplatesOuvert(false)}
        onCreated={() => fetchScenarios()}
      />
    </main>
  )
}