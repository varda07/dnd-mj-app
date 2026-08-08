'use client'

// ============================================================================
// SessionMJ — cockpit MJ en partie (Delta C)
// ----------------------------------------------------------------------------
// Trois colonnes sur UN seul écran, sans défilement de la structure générale :
//   · gauche  (~200 px) — Ma préparation : liste compacte, compteurs, recherche ;
//   · centre  (flexible) — zone de travail pilotée par la sélection de gauche,
//                          + bandeau journal de séance en bas ;
//   · droite  (~200 px) — Ma table : TOUJOURS visible, jamais masquée.
//
// La roue d'action MJ est montée ici (donc disponible quelle que soit la vue) et
// ses six pétales sont réellement câblés (Delta C.1). Le comportement du bouton
// MS lui-même n'est pas touché : replié sur le logo, déplaçable, position
// mémorisée — il fonctionne, on n'y touche pas.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { setSessionStatus, SETUP_LABEL, type GameSession } from '@/app/lib/session'
import { fetchSessionState, patchSessionState, type SessionState } from '@/app/lib/session-live'
import { ouvrirCanal } from '@/app/lib/session-realtime'
import { useCombatEngine, resolveEntiteId } from '@/app/lib/combat-engine'
import { useRelaisFinDeTour } from '@/app/lib/session-tour'
import { appliquerRepos, type TypeRepos } from '@/app/lib/session-repos'
import { lancerCombatPrepare, type CombatPrepare } from '@/app/lib/combats-prepares'
import ActionWheelMJ, { type ActionWheelKey } from '@/app/components/presentation/ActionWheelMJ'
import WildMagicRoller from '@/app/components/WildMagicRoller'
import LanceurDesSession, { ouvrirLanceurDes } from '@/app/components/session/LanceurDesSession'
import JournalTable from '@/app/components/session/joueur/JournalTable'
import PanneauPreparation from './PanneauPreparation'
import PanneauTable from './PanneauTable'
import ZoneTravailMJ from './ZoneTravailMJ'
import ModaleDiffusion, { type CibleDiffusion } from './ModaleDiffusion'
import { LABEL_VUE, type VueMJ } from './vues'

export default function SessionMJ({
  sessionId,
  scenarioId,
  session,
  scenarioNom
}: {
  sessionId: string
  scenarioId: string
  session: GameSession
  scenarioNom: string
}) {
  const router = useRouter()
  const [etat, setEtat] = useState<SessionState | null>(null)
  const [statut, setStatut] = useState<GameSession['status']>(session.status)
  const [busy, setBusy] = useState(false)
  const [vue, setVue] = useState<VueMJ>('chapitre')
  const [chapitreSel, setChapitreSel] = useState<string | null>(null)
  const [diffusion, setDiffusion] = useState<CibleDiffusion | null>(null)
  const [magieOuverte, setMagieOuverte] = useState(false)
  const [journalOuvert, setJournalOuvert] = useState(true)
  const [mjId, setMjId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const combatApi = useCombatEngine(scenarioId, { isMj: true })
  const { combat } = combatApi

  const rechargerEtat = useCallback(async () => {
    setEtat(await fetchSessionState(sessionId))
  }, [sessionId])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMjId(data.user?.id ?? null))
    void rechargerEtat()
    return ouvrirCanal(`session-mj-state:${sessionId}`, (c) =>
      c
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'session_state', filter: `session_id=eq.${sessionId}` },
          () => void rechargerEtat()
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
          (payload) => setStatut((payload.new as GameSession).status)
        )
    )
  }, [sessionId, rechargerEtat])

  const patchState = useCallback(
    async (patch: Partial<SessionState>) => {
      setEtat((e) => (e ? { ...e, ...patch } : e))
      await patchSessionState(sessionId, patch)
    },
    [sessionId]
  )

  // Référence le combat actif dans l'état de session (pour les joueurs).
  const dernierCombatId = useRef<string | null>(null)
  useEffect(() => {
    if (combat?.actif && combat.id && etat && etat.active_combat_id !== combat.id && dernierCombatId.current !== combat.id) {
      dernierCombatId.current = combat.id
      void patchState({ active_combat_id: combat.id })
    }
  }, [combat?.actif, combat?.id, etat, patchState])

  // Delta D — « Fin de mon tour » côté joueur fait réellement avancer l'ordre.
  useRelaisFinDeTour(sessionId, (characterId) => {
    const c = combatApi.combat
    if (!c?.actif || !c.ordre_initiative?.length) return
    const courant = resolveEntiteId(c.ordre_initiative[c.tour_actuel] ?? null)
    // On n'avance que si c'est bien le tour du demandeur (évite les doublons).
    if (characterId && courant && characterId !== courant) return
    combatApi.tourSuivant()
  })

  const changerStatut = async (s: GameSession['status']) => {
    setBusy(true)
    setStatut(s)
    await setSessionStatus(sessionId, s)
    setBusy(false)
    if (s === 'ended') router.replace('/dashboard/scenarios')
  }

  const lancerRencontre = useCallback(
    async (cp: CombatPrepare) => {
      setMsg('')
      const ok = await lancerCombatPrepare(cp, 'rapide')
      if (!ok) {
        setMsg('Impossible de lancer cette rencontre.')
        return
      }
      const { data } = await supabase.from('combats').select('id').eq('scenario_id', scenarioId).maybeSingle()
      if (data?.id) void patchState({ active_combat_id: data.id as string })
      setVue('combat')
      setMsg(`⚔️ Rencontre « ${cp.nom} » lancée.`)
    },
    [scenarioId, patchState]
  )

  // Delta C.1 — les six pétales sont câblés.
  const surPetale = (key: ActionWheelKey) => {
    switch (key) {
      case 'image':
      case 'narration':
      case 'sons':
        setDiffusion(key)
        break
      case 'des':
        ouvrirLanceurDes()
        break
      case 'rencontre':
        setVue('combat')
        void combatApi.lancer()
        break
      case 'magie':
        setMagieOuverte(true)
        break
    }
  }

  const repos = async (type: TypeRepos) => {
    const texte =
      type === 'court'
        ? 'Appliquer un REPOS COURT à toute la table ? Les ressources « repos court » reviennent (et les emplacements de pacte de l’occultiste).'
        : 'Appliquer un REPOS LONG à toute la table ? Toutes les ressources, tous les emplacements de sorts et les PV sont remis au maximum.'
    if (!confirm(texte)) return
    setBusy(true)
    const res = await appliquerRepos(sessionId, type, mjId)
    setBusy(false)
    setMsg(
      res.personnages.length === 0
        ? 'Aucun personnage à la table.'
        : `🛏 Repos ${type} appliqué à ${res.personnages.length} personnage(s).`
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ background: '#0e0b06' }}>
      {/* Barre de session */}
      <header className="flex-shrink-0 px-3 py-1.5 border-b flex items-center gap-2 flex-wrap"
        style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(14,11,6,0.95)' }}>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-600 leading-none">
            {statut === 'paused' ? 'En pause' : 'En session'} · MJ
            {session.setup_mode ? ` · ${SETUP_LABEL[session.setup_mode]}` : ''}
          </p>
          <h1 className="text-base font-bold truncate" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>
            {session.title || scenarioNom}
          </h1>
        </div>

        {/* Repos court / long (Delta C.2) */}
        <button type="button" disabled={busy} onClick={() => repos('court')}
          className="px-2.5 py-1.5 rounded-lg border border-yellow-800/40 text-yellow-200 text-xs font-bold disabled:opacity-50">
          🌤 Repos court
        </button>
        <button type="button" disabled={busy} onClick={() => repos('long')}
          className="px-2.5 py-1.5 rounded-lg border border-yellow-800/40 text-yellow-200 text-xs font-bold disabled:opacity-50">
          🌙 Repos long
        </button>

        {session.setup_mode === 'pc-tv' && (
          <a href={`/session/${sessionId}/ecran`} target="_blank" rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-lg border border-yellow-800/40 text-yellow-200 text-xs font-bold">
            📺 Écran TV
          </a>
        )}
        {statut === 'active' ? (
          <button type="button" disabled={busy} onClick={() => changerStatut('paused')}
            className="px-2.5 py-1.5 rounded-lg border border-yellow-700/50 text-yellow-200 text-xs font-bold disabled:opacity-50">
            ⏸ Pause
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => changerStatut('active')}
            className="px-2.5 py-1.5 rounded-lg text-gray-900 bg-[#C9A84C] text-xs font-bold disabled:opacity-50">
            ▶ Reprendre
          </button>
        )}
        <button type="button" disabled={busy}
          onClick={() => { if (confirm('Terminer la session pour tout le monde ?')) void changerStatut('ended') }}
          className="px-2.5 py-1.5 rounded-lg border border-red-800/60 text-red-300 text-xs font-bold disabled:opacity-50">
          ■ Terminer
        </button>
      </header>

      {msg && (
        <p className="flex-shrink-0 px-3 py-1 text-xs text-yellow-300 border-b" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
          {msg}
        </p>
      )}

      {/* Trois colonnes */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Gauche — Ma préparation */}
        <aside className="order-2 lg:order-1 lg:w-[200px] lg:flex-shrink-0 border-t lg:border-t-0 lg:border-r px-2 py-2 min-h-0 max-h-[35vh] lg:max-h-none overflow-hidden flex flex-col"
          style={{ borderColor: 'rgba(201,168,76,0.18)' }}>
          <h2 className="text-[10px] uppercase tracking-widest text-yellow-600 mb-1.5 flex-shrink-0">Ma préparation</h2>
          <PanneauPreparation
            scenarioId={scenarioId}
            etat={etat}
            vue={vue}
            chapitreSel={chapitreSel}
            combatActif={!!combat?.actif}
            onSelectVue={setVue}
            onSelectChapitre={(id) => { setChapitreSel(id); setVue('chapitre') }}
            onMarquerChapitre={(id) => patchState({ current_chapter_id: id })}
            onLancerRencontre={lancerRencontre}
          />
        </aside>

        {/* Centre — zone de travail + journal */}
        <main className="order-1 lg:order-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-3 pt-2">
            <h2 className="text-[10px] uppercase tracking-widest text-yellow-600">{LABEL_VUE[vue]}</h2>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
            <ZoneTravailMJ
              scenarioId={scenarioId}
              vue={vue}
              chapitreSel={chapitreSel}
              etat={etat}
              onPatchState={patchState}
              combatApi={combatApi}
              onLancerRencontre={lancerRencontre}
            />
          </div>
          <div className="flex-shrink-0 border-t px-3 py-1.5" style={{ borderColor: 'rgba(201,168,76,0.18)' }}>
            <button type="button" onClick={() => setJournalOuvert((o) => !o)}
              className="text-[10px] uppercase tracking-widest text-yellow-600 hover:text-yellow-400">
              Journal de séance {journalOuvert ? '▾' : '▸'}
            </button>
            {journalOuvert && (
              <div style={{ height: 96 }} className="mt-1">
                <JournalTable sessionId={sessionId} userId={mjId} titre={null} limite={40} />
              </div>
            )}
          </div>
        </main>

        {/* Droite — Ma table, toujours visible */}
        <aside className="order-3 lg:w-[200px] lg:flex-shrink-0 border-t lg:border-t-0 lg:border-l px-2 py-2 min-h-0 max-h-[35vh] lg:max-h-none overflow-hidden flex flex-col"
          style={{ borderColor: 'rgba(201,168,76,0.18)' }}>
          <h2 className="text-[10px] uppercase tracking-widest text-yellow-600 mb-1.5 flex-shrink-0">Ma table</h2>
          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
            <PanneauTable sessionId={sessionId} />
          </div>
        </aside>
      </div>

      {/* Roue d'action MJ — bouton MS inchangé, pétales désormais câblés */}
      <ActionWheelMJ onSelect={surPetale} />

      {/* Surfaces modales — toutes portées vers document.body */}
      <ModaleDiffusion cible={diffusion} etat={etat} onFermer={() => setDiffusion(null)} onPatchState={patchState} />
      <WildMagicRoller scenarioId={scenarioId} flottant={false} ouvert={magieOuverte} onClose={() => setMagieOuverte(false)} />
      <LanceurDesSession session={{ sessionId, characterNom: 'MJ' }} />
    </div>
  )
}
