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
import ActionMenu from '@/app/components/ui/ActionMenu'
import TemplatesScenariosGallery from '@/app/components/TemplatesScenariosGallery'
import AssistantScenario from '@/app/components/scenarios/AssistantScenario'
import LancerSessionButton from '@/app/components/session/LancerSessionButton'
import { ChoiceCard, ChoiceGrid, FormActions } from '@/app/components/ui/FormKit'
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
  const [codeJoueur, setCodeJoueur] = useState('')
  const [scenarioCibleId, setScenarioCibleId] = useState('')
  const [messageJoueur, setMessageJoueur] = useState('')
  const [vue, setVue] = useState<'liste' | 'carte'>('liste')
  const [favorisOnly, setFavorisOnly] = useState(false)
  const [templatesOuvert, setTemplatesOuvert] = useState(false)
  // Phase 1 — assistant guidé de création de scénario.
  const [assistantOuvert, setAssistantOuvert] = useState(false)
  // 1.1 — modale « Inviter des joueurs » (code + lien + QR + inscrits).
  const [inviteScenario, setInviteScenario] = useState<Scenario | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteJoueurs, setInviteJoueurs] = useState<
    { joueur_id: string; username: string; personnages: { id: string; nom: string; classe: string | null; niveau: number | null }[] }[]
  >([])
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteCopie, setInviteCopie] = useState<'' | 'code' | 'lien'>('')
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

    // La liaison passe par une RPC SECURITY DEFINER : la RLS empêche le MJ
    // de modifier directement le personnage d'un joueur qui n'a pas encore
    // rejoint le scénario (œuf / poule). La fonction lie le perso, inscrit le
    // joueur dans scenarios_joueurs et consomme le code, atomiquement.
    const { data: res, error } = await supabase.rpc('lier_personnage_via_code', {
      p_code: code,
      p_scenario_id: scenarioCibleId
    })
    if (error) return setMessageJoueur(td('cannot_link', { message: error.message }))

    const result = res as { ok: boolean; error?: string } | null
    if (!result?.ok) {
      const map: Record<string, string> = {
        scenario_not_found: td('choose_scenario'),
        not_mj: td('cannot_link', { message: td('code_not_player') }),
        code_not_found: td('code_not_found'),
        code_already_used: td('code_already_used'),
        code_not_player: td('code_not_player'),
        personnage_not_found: td('code_not_found')
      }
      return setMessageJoueur(map[result?.error ?? ''] ?? td('code_not_found'))
    }

    setMessageJoueur(td('character_added_ok'))
    setCodeJoueur('')
    fetchScenarios()
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

  // Récupère (ou crée) un code d'invitation RÉUTILISABLE pour un scénario.
  const obtenirCodeInvitation = async (scenarioId: string): Promise<string | null> => {
    const { data: existing } = await supabase
      .from('codes_invitation')
      .select('code')
      .eq('scenario_id', scenarioId)
      .eq('utilise', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing?.code) return existing.code

    for (let i = 0; i < 5; i++) {
      const code = genererCode()
      const { error } = await supabase
        .from('codes_invitation')
        .insert({ code, scenario_id: scenarioId })
      if (!error) return code
    }
    return null
  }

  // 1.1 — Ouvre la modale d'invitation : code + lien + QR + joueurs inscrits.
  const ouvrirInvitation = async (scenario: Scenario) => {
    setInviteScenario(scenario)
    setInviteCode('')
    setInviteJoueurs([])
    setInviteCopie('')
    setInviteLoading(true)
    const code = await obtenirCodeInvitation(scenario.id)
    if (code) setInviteCode(code)
    else setMessage(t('cannot_generate_code'))
    const { data } = await supabase.rpc('joueurs_du_scenario', {
      p_scenario_id: scenario.id
    })
    const res = data as { ok: boolean; joueurs?: typeof inviteJoueurs } | null
    if (res?.ok && res.joueurs) setInviteJoueurs(res.joueurs)
    setInviteLoading(false)
  }

  const lienInvitation = (code: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/rejoindre/${code}` : ''

  const copierInvite = async (quoi: 'code' | 'lien', valeur: string) => {
    try {
      await navigator.clipboard?.writeText(valeur)
      setInviteCopie(quoi)
      setTimeout(() => setInviteCopie(''), 1800)
    } catch {}
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

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      {/* V1 5.2 — lanceur du tutoriel Mindmap, monté seulement en vue carte
          (évite le doublon avec d'autres 🎓 et n'apparaît pas en vue liste). */}
      {vue === 'carte' && <GuidedTour tourId="mindmap" />}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          {/* V1 3.6 — retour déterministe vers le dashboard (router.back()
              bouclait depuis la carte mentale, dont les liens entités empilent
              de l'historique). */}
          <button type="button" onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white">
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
        {/* Phase 1 — point de départ : Guidé / Modèle / Page blanche. */}
        {!editingId && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Nouvelle aventure — par où commencer ?</p>
            <ChoiceGrid cols={3}>
              <ChoiceCard
                icon="🪄"
                title="Guidé"
                subtitle="L'app te pose des questions et prépare le squelette"
                recommended
                onClick={() => setAssistantOuvert(true)}
              />
              <ChoiceCard
                icon="📐"
                title="Un modèle"
                subtitle="Partir d'un des scénarios pré-faits"
                onClick={() => setTemplatesOuvert(true)}
              />
              <ChoiceCard
                icon="📄"
                title="Page blanche"
                subtitle="Le formulaire classique, ci-dessous"
                onClick={() => {
                  const el = document.getElementById('form-scenario-blank')
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
              />
            </ChoiceGrid>
          </div>
        )}
        <div id="form-scenario-blank" className="grim-card p-6 mb-6">
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
            <FormActions onCancel={editingId ? resetForm : undefined} cancelLabel={tc('cancel')}>
              <button
                type="button"
                onClick={sauvegarderScenario}
                disabled={loading}
                className="min-h-[44px] px-5 rounded-lg font-bold text-gray-900 disabled:opacity-60"
                style={{ background: '#C9A84C' }}
              >
                {loading ? tc('loading') : editingId ? tc('modify') : tc('create')}
              </button>
            </FormActions>
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
            <div
              key={scenario.id}
              className={`grim-card grim-card-hover p-4 ${
                scenario.actif ? 'ring-1 ring-[rgba(201,168,76,0.55)]' : ''
              }`}
            >
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
                {/* Refonte listes — action principale (★ activer) visible,
                    le reste dans le menu ⋮. */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => definirActif(scenario)}
                    className={`text-sm font-bold px-2 py-1.5 rounded transition ${scenario.actif ? 'text-yellow-300' : 'text-gray-400 hover:text-yellow-400'}`}
                    title={scenario.actif ? t('unset_active_tooltip') : t('set_active_tooltip')}
                  >
                    {scenario.actif ? `★ ${t('active_badge')}` : `☆ ${t('set_active')}`}
                  </button>
                  {/* 1.1 — bouton évident pour inviter des joueurs. */}
                  <button
                    type="button"
                    onClick={() => ouvrirInvitation(scenario)}
                    className="text-sm font-bold px-2 py-1.5 rounded transition text-gray-300 hover:text-yellow-300 border border-yellow-700/40 hover:border-yellow-500/70"
                    title="Inviter des joueurs"
                  >
                    👥 Inviter
                  </button>
                  {/* Mode Session — lance une vraie session de jeu (remplace Diffuser). */}
                  <LancerSessionButton
                    scenarioId={scenario.id}
                    scenarioNom={scenario.nom}
                    compact
                  />
                  <ActionMenu
                    actions={[
                      {
                        label: 'Éditer',
                        icon: '📖',
                        onClick: () => router.push(`/dashboard/scenarios/${scenario.id}/edit`)
                      },
                      {
                        label: t('invite_player'),
                        icon: '✉️',
                        onClick: () => ouvrirInvitation(scenario)
                      },
                      {
                        label: 'Quêtes',
                        icon: '🎯',
                        onClick: () => router.push(`/dashboard/scenarios/${scenario.id}/quetes`)
                      },
                      {
                        label: t('notes'),
                        icon: '📝',
                        onClick: () => router.push(`/dashboard/scenarios/${scenario.id}/notes`)
                      },
                      {
                        label: scenario.public
                          ? t('public_on', { n: scenario.nb_copies })
                          : t('public_off'),
                        icon: scenario.public ? '🌍' : '🔒',
                        onClick: () => togglerPublic(scenario)
                      },
                      {
                        label: tc('modify'),
                        icon: '✏️',
                        onClick: () => commencerEdition(scenario)
                      },
                      {
                        label: tc('export_item_title'),
                        icon: '📥',
                        onClick: () => exporterScenario(scenario)
                      },
                      {
                        label: tc('delete'),
                        icon: '🗑️',
                        variant: 'danger',
                        separatorBefore: true,
                        onClick: () => supprimerScenario(scenario.id)
                      }
                    ]}
                  />
                </div>
              </div>
              {scenario.description && <p className="text-gray-400 text-sm mt-2">{scenario.description}</p>}
            </div>
          ))}
        </div>
        </>
        )}
      </div>

      {/* 1.1 — Modale « Inviter des joueurs » : code + lien + QR + inscrits. */}
      {inviteScenario && (
        <div
          className="fixed inset-0 z-[95] bg-black/75 flex items-center justify-center p-4"
          onClick={() => setInviteScenario(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 shadow-2xl flex flex-col max-h-[88vh]"
            style={{ background: '#15110a', borderColor: 'rgba(201,168,76,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
              <h3 className="font-bold text-lg" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>
                👥 Inviter des joueurs
              </h3>
              <button
                type="button"
                onClick={() => setInviteScenario(null)}
                className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-stone-300 text-sm">
                Partage ce lien ou ce code. Le joueur arrive directement sur «&nbsp;Rejoindre{' '}
                <span className="text-yellow-200 font-bold">{inviteScenario.nom}</span>&nbsp;»,
                choisit son personnage, et c'est fait.
              </p>

              {inviteLoading && !inviteCode ? (
                <p className="text-stone-400 text-sm italic">Génération du code…</p>
              ) : inviteCode ? (
                <>
                  {/* Code en gros */}
                  <div className="rounded-xl bg-black/50 border border-yellow-800/50 p-3 text-center">
                    <p className="text-stone-500 text-[11px] uppercase tracking-widest mb-1">Code d'invitation</p>
                    <code className="text-yellow-300 font-mono font-bold text-2xl tracking-wider break-all">
                      {inviteCode}
                    </code>
                    <div className="mt-2 flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={() => copierInvite('code', inviteCode)}
                        className="text-xs px-3 py-1.5 rounded border border-yellow-700/50 text-yellow-200 hover:bg-yellow-500/10"
                      >
                        {inviteCopie === 'code' ? '✓ Copié' : '📋 Copier le code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => copierInvite('lien', lienInvitation(inviteCode))}
                        className="text-xs px-3 py-1.5 rounded font-bold text-gray-900"
                        style={{ background: '#C9A84C' }}
                      >
                        {inviteCopie === 'lien' ? '✓ Lien copié' : '🔗 Copier le lien'}
                      </button>
                    </div>
                  </div>

                  {/* QR code */}
                  <div className="flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=21-17-10&color=201-168-76&data=${encodeURIComponent(
                        lienInvitation(inviteCode)
                      )}`}
                      alt="QR code d'invitation"
                      width={180}
                      height={180}
                      className="rounded-lg border border-yellow-800/40 bg-black/30 p-1"
                    />
                    <p className="text-stone-500 text-[11px]">Scanne pour rejoindre</p>
                  </div>
                </>
              ) : (
                <p className="text-red-300 text-sm">Impossible de générer le code.</p>
              )}

              {/* Joueurs déjà inscrits */}
              <div>
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-2">
                  Joueurs inscrits ({inviteJoueurs.length})
                </p>
                {inviteLoading ? (
                  <p className="text-stone-500 text-sm italic">Chargement…</p>
                ) : inviteJoueurs.length === 0 ? (
                  <p className="text-stone-500 text-sm italic">
                    Personne n'a encore rejoint. Partage le lien&nbsp;!
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {inviteJoueurs.map((j) => (
                      <li
                        key={j.joueur_id}
                        className="rounded-lg border border-stone-700 bg-stone-900/40 px-3 py-2"
                      >
                        <p className="text-yellow-100 font-bold text-sm">🧑 {j.username}</p>
                        {j.personnages.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {j.personnages.map((p) => (
                              <span
                                key={p.id}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-700/40 text-yellow-200"
                              >
                                {p.nom}
                                {p.classe ? ` · ${p.classe}` : ''}
                                {p.niveau ? ` (Niv. ${p.niveau})` : ''}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-stone-500 text-[11px] mt-0.5 italic">
                            Pas encore de personnage lié
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <TemplatesScenariosGallery
        open={templatesOuvert}
        onClose={() => setTemplatesOuvert(false)}
        onCreated={() => fetchScenarios()}
      />

      {assistantOuvert && (
        <AssistantScenario
          onClose={() => setAssistantOuvert(false)}
          onCreated={(id) => {
            setAssistantOuvert(false)
            router.push(`/dashboard/scenarios/${id}/edit`)
          }}
        />
      )}
    </main>
  )
}