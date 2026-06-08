'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Combat rapide — point d'entrée MJ seul (Phase 2.1 + mode 3.1)
// ----------------------------------------------------------------------------
// Interface allégée mono-écran : le MJ gère initiative + PV + conditions via le
// MOTEUR unifié (useCombatEngine) et le composant CombatCockpitMJ (réutilisé du
// mode diffusion). Pas de vue joueurs ici — mais bascule « 📡 Diffuser » d'un
// clic (l'état du combat est préservé car partagé par scénario, Phase 3.3).
// Récap de stats en fin de combat (Phase 4.2). Enemis ajoutables via les
// situations aléatoires (Phase 2.4).
// ============================================================================

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCombatEngine, computeCombatStats, type CombatStats } from '@/app/lib/combat-engine'
import CombatCockpitMJ from '@/app/components/presentation/CombatCockpitMJ'
import CombatsPreparesPanel from '@/app/components/combat/CombatsPreparesPanel'
import SituationsRandom from '@/app/components/SituationsRandom'

export default function CombatRapide() {
  return (
    <Suspense fallback={null}>
      <CombatRapideInner />
    </Suspense>
  )
}

function CombatRapideInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [scenarioId, setScenarioId] = useState<string | null>(params?.get('scenario') ?? null)
  const [scenarioNom, setScenarioNom] = useState('')
  const [resolvingScenario, setResolvingScenario] = useState(true)
  const [rencontreOpen, setRencontreOpen] = useState(false)
  const [stats, setStats] = useState<CombatStats | null>(null)
  const wasActive = useRef(false)

  // Résout le scénario actif du MJ si non fourni en query.
  useEffect(() => {
    let cancel = false
    const resolve = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      let id = params?.get('scenario') ?? null
      if (!id) {
        const { data } = await supabase
          .from('scenarios')
          .select('id, nom, actif')
          .eq('mj_id', user.id)
          .order('actif', { ascending: false })
          .order('nom')
          .limit(1)
          .maybeSingle()
        if (data) {
          id = data.id as string
          if (!cancel) setScenarioNom(data.nom as string)
        }
      } else {
        const { data } = await supabase.from('scenarios').select('nom').eq('id', id).maybeSingle()
        if (data && !cancel) setScenarioNom(data.nom as string)
      }
      if (cancel) return
      setScenarioId(id)
      setResolvingScenario(false)
    }
    resolve()
    return () => {
      cancel = true
    }
  }, [router, params])

  const engine = useCombatEngine(scenarioId, { isMj: true })
  const { combat } = engine

  // Détecte la fin de combat → calcule et affiche le récap de stats.
  useEffect(() => {
    if (combat?.actif) {
      wasActive.current = true
      return
    }
    if (wasActive.current && combat && !combat.actif && combat.id) {
      wasActive.current = false
      computeCombatStats(combat.id, combat.round, combat.demarre_a ?? null).then((s) => setStats(s))
    }
  }, [combat?.actif, combat])

  const diffuser = useCallback(() => {
    if (scenarioId) router.push(`/dashboard/presentation?scenario=${scenarioId}`)
  }, [router, scenarioId])

  if (resolvingScenario || engine.loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400">Chargement du combat…</p>
      </main>
    )
  }

  if (!scenarioId) {
    return (
      <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[#C9A84C] border border-[rgba(201,168,76,0.30)] hover:bg-[rgba(201,168,76,0.08)] rounded transition mb-4"
          >
            ← Retour
          </button>
          <p className="text-gray-300">
            Aucun scénario trouvé. Crée ou active un scénario pour lancer un combat rapide.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-3 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 md:gap-3 mb-3 flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[#C9A84C] border border-[rgba(201,168,76,0.30)] hover:bg-[rgba(201,168,76,0.08)] hover:border-[#C9A84C] rounded transition"
          >
            ← Retour
          </button>
          <h1 className="text-lg md:text-2xl font-bold text-yellow-500">⚔️ Combat rapide</h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRencontreOpen(true)}
              className="text-[11px] px-2.5 py-1.5 rounded border border-gray-700 text-gray-300 hover:border-yellow-600 hover:text-yellow-300 transition"
            >
              ⚡ Rencontre aléatoire
            </button>
            <button
              type="button"
              onClick={diffuser}
              className="text-[11px] px-2.5 py-1.5 rounded border border-[rgba(201,168,76,0.4)] text-[#ffe6a8] bg-[rgba(201,168,76,0.1)] hover:bg-[rgba(201,168,76,0.2)] transition"
              title="Passer ce combat en mode diffusé (vue joueurs synchronisée)"
            >
              📡 Diffuser ce combat
            </button>
          </div>
        </div>
        {scenarioNom && <h2 className="text-sm font-bold text-gray-300 mb-3">📖 {scenarioNom}</h2>}

        <div className="cockpit-panel">
          <CombatCockpitMJ
            combat={combat}
            personnages={engine.personnages}
            ennemis={engine.ennemis}
            onModifierHp={engine.modifierHp}
            onToggleCondition={engine.toggleCondition}
            onClearConditions={engine.clearConditions}
            onTourSuivant={engine.tourSuivant}
            onTourPrecedent={engine.tourPrecedent}
            onTerminer={engine.terminer}
            onLancer={() => engine.lancer()}
            onMoveJeton={engine.deplacerJeton}
            onToggleCarteVisible={engine.toggleCarteVisible}
            carteBackground={null}
            onTogglePause={engine.togglePause}
            enPause={!!combat?.en_pause}
          />

          {/* Combats préparés / templates (Phase 2.3 + 4.1) */}
          <CombatsPreparesPanel
            scenarioId={scenarioId}
            personnages={engine.personnages}
            ennemis={engine.ennemis}
            onLancer={(participants) => engine.lancer(participants)}
          />
        </div>
      </div>

      {/* Rencontre aléatoire → crée des ennemis adaptés et recharge le roster. */}
      <SituationsRandom
        scenarioId={scenarioId}
        ouvert={rencontreOpen}
        onClose={() => setRencontreOpen(false)}
        onCreated={() => {
          setRencontreOpen(false)
          engine.rechargerRoster()
        }}
      />

      {/* Récap de stats de fin de combat (Phase 4.2). */}
      {stats && (
        <CombatStatsModal stats={stats} onClose={() => setStats(null)} />
      )}
    </main>
  )
}

// ----------------------------------------------------------------------------
// Récap de stats de fin de combat.
// ----------------------------------------------------------------------------
function CombatStatsModal({ stats, onClose }: { stats: CombatStats; onClose: () => void }) {
  const top = Object.entries(stats.degatsInfliges).sort((a, b) => b[1] - a[1])
  const fmtDuree = (s: number | null) => {
    if (s == null) return '—'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m} min ${sec}s` : `${sec}s`
  }
  return (
    <div
      className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Récapitulatif du combat"
    >
      <div onClick={(e) => e.stopPropagation()} className="grimoire-modal w-full max-w-md">
        <div className="grimoire-modal-header">
          <h3 className="grimoire-modal-title">🏁 Combat terminé</h3>
          <button type="button" onClick={onClose} className="grimoire-modal-close" aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="grimoire-modal-body space-y-3">
          <div className="flex gap-4 text-sm">
            <span className="text-gray-300">
              ⏱️ Durée : <strong className="text-yellow-300">{fmtDuree(stats.dureeSecondes)}</strong>
            </span>
            <span className="text-gray-300">
              🔄 Rounds : <strong className="text-yellow-300">{stats.rounds}</strong>
            </span>
          </div>
          {stats.mvp && (
            <p className="text-sm text-gray-200">
              🏆 MVP : <strong className="text-yellow-400">{stats.mvp.nom}</strong> ({stats.mvp.degats} dégâts)
            </p>
          )}
          {top.length > 0 ? (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">Dégâts infligés</p>
              <ul className="space-y-1">
                {top.map(([nom, deg]) => (
                  <li key={nom} className="flex justify-between text-sm">
                    <span className="text-gray-200">{nom}</span>
                    <span className="text-yellow-300 font-bold tabular-nums">{deg}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">
              Aucun dégât enregistré (les stats se basent sur les PV modifiés pendant le combat).
            </p>
          )}
        </div>
        <div className="grimoire-modal-footer">
          <button type="button" onClick={onClose} className="grimoire-modal-btn grimoire-modal-btn-primary">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
