'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Préparateur de combat — Phases 1 & 2 & 3
// ----------------------------------------------------------------------------
// Le MJ prépare des combats EN AMONT (nom, scénario, ennemis, PJ, notes, carte
// optionnelle + placement de jetons, conditions de départ), les sauvegarde
// (combats_prepares) et les lance le jour J en combat rapide ou en diffusion.
// La page combat live complète (/dashboard/combat) reste disponible séparément.
// ============================================================================

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  loadCombatsPrepares,
  saveCombatPrepare,
  deleteCombatPrepare,
  duplicateCombatPrepare,
  lancerCombatPrepare,
  type CombatPrepare,
  type PrepParticipant
} from '@/app/lib/combats-prepares'
import CombatCarte, { type Jeton } from '@/app/components/presentation/CombatCarte'
import GuidedTour from '@/app/components/GuidedTour'

type ScenarioLite = { id: string; nom: string }
type EnnemiLite = { id: string; nom: string; image_url: string | null }
type PersoLite = { id: string; nom: string; image_url: string | null }
type MapLite = { id: string; nom: string; image_url: string | null }

const BLANK = (scenarioId: string | null): CombatPrepare => ({
  id: '',
  scenario_id: scenarioId,
  mj_id: '',
  nom: '',
  notes: '',
  participants: [],
  pj_ids: [],
  carte_id: null,
  avec_carte: false,
  positions: {},
  conditions_depart: {},
  initiative_preset: null,
  est_template: false
})

export default function CombatPreparePage() {
  return (
    <Suspense fallback={null}>
      <CombatPrepareInner />
    </Suspense>
  )
}

function CombatPrepareInner() {
  const router = useRouter()
  const params = useSearchParams()
  const scenarioParam = params?.get('scenario') ?? null

  const [scenarios, setScenarios] = useState<ScenarioLite[]>([])
  const [bestiaire, setBestiaire] = useState<EnnemiLite[]>([])
  const [maps, setMaps] = useState<MapLite[]>([])
  const [liste, setListe] = useState<CombatPrepare[]>([])
  const [filtreScenario, setFiltreScenario] = useState<string>(scenarioParam ?? '')
  const [recherche, setRecherche] = useState('')
  const [draft, setDraft] = useState<CombatPrepare | null>(null)
  const [scenarioPersos, setScenarioPersos] = useState<PersoLite[]>([])
  const [msg, setMsg] = useState('')
  const [lancerCible, setLancerCible] = useState<CombatPrepare | null>(null)
  const [loading, setLoading] = useState(true)

  // Chargement initial : scénarios + bestiaire + maps + liste des combats.
  useEffect(() => {
    let cancel = false
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const [scn, best, mp, combs] = await Promise.all([
        supabase.from('scenarios').select('id, nom').eq('mj_id', user.id).order('nom'),
        supabase.from('ennemis').select('id, nom, image_url').eq('mj_id', user.id).order('nom'),
        supabase.from('maps').select('id, nom, image_url').eq('mj_id', user.id).order('nom'),
        loadCombatsPrepares()
      ])
      if (cancel) return
      setScenarios((scn.data ?? []) as ScenarioLite[])
      setBestiaire((best.data ?? []) as EnnemiLite[])
      setMaps((mp.data ?? []) as MapLite[])
      setListe(combs)
      setLoading(false)
    }
    init()
    return () => {
      cancel = true
    }
  }, [router])

  // Charge les PJ du scénario du draft (pour la sélection "PJ impliqués").
  const draftScenario = draft?.scenario_id ?? null
  useEffect(() => {
    if (!draftScenario) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScenarioPersos([])
      return
    }
    let cancel = false
    supabase
      .from('personnages')
      .select('id, nom, image_url')
      .eq('scenario_id', draftScenario)
      .order('nom')
      .then(({ data }) => {
        if (!cancel) setScenarioPersos((data ?? []) as PersoLite[])
      })
    return () => {
      cancel = true
    }
  }, [draftScenario])

  const recharger = useCallback(async () => {
    setListe(await loadCombatsPrepares())
  }, [])

  const listeFiltree = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return liste.filter(
      (c) =>
        (!filtreScenario || c.scenario_id === filtreScenario) &&
        (!q || c.nom.toLowerCase().includes(q))
    )
  }, [liste, filtreScenario, recherche])

  // --- Édition du draft ---
  const patchDraft = (p: Partial<CombatPrepare>) => setDraft((d) => (d ? { ...d, ...p } : d))

  const toggleEnnemi = (e: EnnemiLite) => {
    if (!draft) return
    const exists = draft.participants.some((p) => p.ref_id === e.id && p.kind === 'ennemi')
    const participants: PrepParticipant[] = exists
      ? draft.participants.filter((p) => !(p.ref_id === e.id && p.kind === 'ennemi'))
      : [...draft.participants, { kind: 'ennemi', ref_id: e.id, nom: e.nom, image_url: e.image_url }]
    patchDraft({ participants })
  }
  const togglePj = (id: string) => {
    if (!draft) return
    const pj_ids = draft.pj_ids.includes(id)
      ? draft.pj_ids.filter((x) => x !== id)
      : [...draft.pj_ids, id]
    patchDraft({ pj_ids })
  }

  // Jetons pour le placement sur la carte (ennemis sélectionnés + PJ impliqués).
  const jetons: Jeton[] = useMemo(() => {
    if (!draft) return []
    const ens = draft.participants
      .filter((p) => p.kind === 'ennemi')
      .map((p) => ({ pieceId: `ennemi-${p.ref_id}`, id: p.ref_id, nom: p.nom, kind: 'ennemi' as const, image_url: p.image_url }))
    const pjs = draft.pj_ids
      .map((id) => scenarioPersos.find((p) => p.id === id))
      .filter((p): p is PersoLite => !!p)
      .map((p) => ({ pieceId: `perso-${p.id}`, id: p.id, nom: p.nom, kind: 'perso' as const, image_url: p.image_url }))
    return [...pjs, ...ens]
  }, [draft, scenarioPersos])

  const sauver = useCallback(async () => {
    if (!draft || !draft.nom.trim()) {
      setMsg('Donne un nom au combat.')
      setTimeout(() => setMsg(''), 2000)
      return
    }
    if (!draft.scenario_id) {
      setMsg('Choisis un scénario.')
      setTimeout(() => setMsg(''), 2000)
      return
    }
    const id = await saveCombatPrepare(draft)
    if (!id) {
      setMsg('Erreur — applique la migration combats_prepares.')
      return
    }
    setMsg('✓ Combat préparé sauvegardé')
    setTimeout(() => setMsg(''), 1800)
    await recharger()
    setDraft((d) => (d ? { ...d, id } : d))
  }, [draft, recharger])

  const carteMap = draft?.carte_id ? maps.find((m) => m.id === draft.carte_id) : null

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400">Chargement du préparateur…</p>
      </main>
    )
  }

  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-3 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <GuidedTour tourId="combat-prepare" />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 md:gap-3 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[#C9A84C] border border-[rgba(201,168,76,0.30)] hover:bg-[rgba(201,168,76,0.08)] hover:border-[#C9A84C] rounded transition"
          >
            ← Retour
          </button>
          <h1 className="text-lg md:text-2xl font-bold text-yellow-500">🛠 Préparateur de combat</h1>
          <button
            type="button"
            data-tour="prepare-creer"
            onClick={() => setDraft(BLANK(filtreScenario || null))}
            className="ml-auto text-xs px-3 py-1.5 rounded bg-yellow-500 text-gray-900 font-bold hover:bg-yellow-400"
          >
            ✚ Nouveau combat
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ===== Bibliothèque (Phase 2.3) ===== */}
          <section className="cockpit-panel">
            <h3 className="cockpit-panel-title">📚 Combats préparés</h3>
            <div className="flex gap-2 mb-3 flex-wrap">
              <select
                value={filtreScenario}
                onChange={(e) => setFiltreScenario(e.target.value)}
                className="flex-1 min-w-[140px] p-2 rounded bg-gray-900 text-white border border-gray-700 text-xs outline-none focus:border-yellow-500"
              >
                <option value="">Tous les scénarios</option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher…"
                className="flex-1 min-w-[120px] p-2 rounded bg-gray-900 text-white border border-gray-700 text-xs outline-none focus:border-yellow-500"
              />
            </div>
            {listeFiltree.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                Aucun combat préparé. Clique « ✚ Nouveau combat » pour en créer un.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {listeFiltree.map((c) => {
                  const scn = scenarios.find((s) => s.id === c.scenario_id)
                  const nbEn = c.participants.filter((p) => p.kind === 'ennemi').length
                  return (
                    <li key={c.id} className="p-2 rounded border border-gray-700 bg-gray-900/40">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex-1 min-w-0 text-sm text-gray-100 truncate">
                          {c.nom}
                          <span className="text-gray-500 text-[10px] ml-1">
                            · {scn?.nom ?? 'sans scénario'} · {nbEn} ennemis · {c.pj_ids.length} PJ
                            {c.avec_carte ? ' · 🗺' : ''}
                          </span>
                        </span>
                        <button type="button" onClick={() => setDraft(c)} className="text-[10px] px-2 py-1 rounded border border-gray-600 text-gray-300 hover:border-yellow-600 hover:text-yellow-300">
                          ✎ Éditer
                        </button>
                        <button type="button" onClick={() => setLancerCible(c)} className="text-[10px] px-2 py-1 rounded border border-[rgba(201,168,76,0.4)] text-[#ffe6a8] hover:bg-[rgba(201,168,76,0.15)]">
                          ▶ Lancer
                        </button>
                        <button type="button" onClick={async () => { await duplicateCombatPrepare(c); recharger() }} className="text-[10px] px-1.5 py-1 rounded border border-gray-600 text-gray-400 hover:text-gray-200" title="Dupliquer">
                          ⧉
                        </button>
                        <button type="button" onClick={async () => { if (confirm(`Supprimer « ${c.nom} » ?`)) { await deleteCombatPrepare(c.id); recharger() } }} className="text-[10px] px-1.5 py-1 rounded border border-red-700/50 text-red-300 hover:bg-red-900/20" title="Supprimer">
                          🗑
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* ===== Éditeur (Phase 1) ===== */}
          <section className="cockpit-panel">
            {!draft ? (
              <p className="text-xs text-gray-500 italic">
                Sélectionne un combat à éditer ou crée-en un nouveau.
              </p>
            ) : (
              <div className="space-y-3">
                <h3 className="cockpit-panel-title">{draft.id ? '✎ Éditer le combat' : '✚ Nouveau combat'}</h3>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Nom du combat</label>
                  <input
                    type="text"
                    value={draft.nom}
                    onChange={(e) => patchDraft({ nom: e.target.value })}
                    placeholder="Embuscade gobeline, Boss dragon du chapitre 3…"
                    className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 text-sm outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Scénario lié</label>
                  <select
                    value={draft.scenario_id ?? ''}
                    onChange={(e) => patchDraft({ scenario_id: e.target.value || null })}
                    className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 text-sm outline-none focus:border-yellow-500"
                  >
                    <option value="">— Choisir —</option>
                    {scenarios.map((s) => (
                      <option key={s.id} value={s.id}>{s.nom}</option>
                    ))}
                  </select>
                </div>

                {/* Ennemis depuis le bestiaire */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">
                    Ennemis ({draft.participants.filter((p) => p.kind === 'ennemi').length})
                  </label>
                  {bestiaire.length === 0 ? (
                    <p className="text-[10px] text-gray-500 italic">Aucun ennemi dans ton bestiaire (Forge → Ennemis).</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto pr-1">
                      {bestiaire.map((e) => {
                        const on = draft.participants.some((p) => p.ref_id === e.id && p.kind === 'ennemi')
                        return (
                          <label key={e.id} className={`flex items-center gap-1.5 p-1.5 rounded cursor-pointer text-xs ${on ? 'bg-yellow-500/10 border border-yellow-500/40' : 'border border-transparent hover:bg-gray-800/60'}`}>
                            <input type="checkbox" checked={on} onChange={() => toggleEnnemi(e)} className="accent-yellow-500" />
                            <span className="truncate text-gray-200">{e.nom}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* PJ impliqués */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">
                    PJ impliqués ({draft.pj_ids.length})
                  </label>
                  {!draft.scenario_id ? (
                    <p className="text-[10px] text-gray-500 italic">Choisis un scénario pour lister ses PJ.</p>
                  ) : scenarioPersos.length === 0 ? (
                    <p className="text-[10px] text-gray-500 italic">Aucun PJ lié à ce scénario.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {scenarioPersos.map((p) => {
                        const on = draft.pj_ids.includes(p.id)
                        return (
                          <label key={p.id} className={`flex items-center gap-1.5 p-1.5 rounded cursor-pointer text-xs ${on ? 'bg-yellow-500/10 border border-yellow-500/40' : 'border border-transparent hover:bg-gray-800/60'}`}>
                            <input type="checkbox" checked={on} onChange={() => togglePj(p.id)} className="accent-yellow-500" />
                            <span className="truncate text-gray-200">{p.nom}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Conditions de départ (surprise) */}
                <div>
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.conditions_depart?.surprise}
                      onChange={(e) => patchDraft({ conditions_depart: { ...draft.conditions_depart, surprise: e.target.checked } })}
                      className="accent-yellow-500"
                    />
                    🌫 Round de surprise (ennemis cachés au départ en diffusion)
                  </label>
                </div>

                {/* Battle map FACULTATIVE + placement de jetons */}
                <div className="border-t border-gray-700 pt-3">
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.avec_carte}
                      onChange={(e) => patchDraft({ avec_carte: e.target.checked })}
                      className="accent-yellow-500"
                    />
                    🗺 Utiliser une battle map (sinon : combat sans carte)
                  </label>
                  {draft.avec_carte && (
                    <div className="mt-2 space-y-2">
                      <select
                        value={draft.carte_id ?? ''}
                        onChange={(e) => patchDraft({ carte_id: e.target.value || null })}
                        className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 text-xs outline-none focus:border-yellow-500"
                      >
                        <option value="">— Carte (optionnel) —</option>
                        {maps.map((m) => (
                          <option key={m.id} value={m.id}>{m.nom}</option>
                        ))}
                      </select>
                      {jetons.length > 0 ? (
                        <>
                          <CombatCarte
                            jetons={jetons}
                            positions={draft.positions}
                            backgroundUrl={carteMap?.image_url ?? null}
                            editable
                            onMove={(pieceId, x, y) => patchDraft({ positions: { ...draft.positions, [pieceId]: { x, y } } })}
                          />
                          <p className="text-[10px] text-gray-500 italic">Glisse les jetons pour pré-placer les participants.</p>
                        </>
                      ) : (
                        <p className="text-[10px] text-gray-500 italic">Ajoute des ennemis / PJ pour les placer.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Notes de combat</label>
                  <textarea
                    value={draft.notes ?? ''}
                    onChange={(e) => patchDraft({ notes: e.target.value })}
                    placeholder="Tactiques prévues, dialogue de boss, conditions spéciales…"
                    className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 text-sm outline-none focus:border-yellow-500 min-h-[70px]"
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <button type="button" onClick={sauver} className="flex-1 px-3 py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 text-xs uppercase tracking-wider">
                    💾 Sauvegarder
                  </button>
                  {draft.id && (
                    <button type="button" onClick={() => setLancerCible(draft)} className="px-3 py-2 border border-[rgba(201,168,76,0.4)] text-[#ffe6a8] rounded hover:bg-[rgba(201,168,76,0.15)] text-xs uppercase tracking-wider">
                      ▶ Lancer
                    </button>
                  )}
                  <button type="button" onClick={() => setDraft(null)} className="px-3 py-2 border border-gray-700 text-gray-400 rounded hover:text-gray-200 text-xs">
                    Fermer
                  </button>
                </div>
                {msg && <p className="text-[10px] text-yellow-300 italic">{msg}</p>}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Choix du mode au lancement (Phase 3.1) */}
      {lancerCible && (
        <LancerModal
          combat={lancerCible}
          onClose={() => setLancerCible(null)}
          onLancer={async (mode) => {
            const scnId = await lancerCombatPrepare(lancerCible, mode)
            setLancerCible(null)
            if (!scnId) {
              setMsg('Échec du lancement (scénario lié manquant ?).')
              setTimeout(() => setMsg(''), 2500)
              return
            }
            if (mode === 'rapide') router.push(`/dashboard/combat-rapide?scenario=${scnId}`)
            else router.push(`/dashboard/presentation?scenario=${scnId}&diffuser=1`)
          }}
        />
      )}
    </main>
  )
}

function LancerModal({
  combat,
  onClose,
  onLancer
}: {
  combat: CombatPrepare
  onClose: () => void
  onLancer: (mode: 'rapide' | 'diffusion') => void
}) {
  return (
    <div className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-3" onClick={onClose} role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()} className="grimoire-modal w-full max-w-sm">
        <div className="grimoire-modal-header">
          <h3 className="grimoire-modal-title">▶ Lancer « {combat.nom} »</h3>
          <button type="button" onClick={onClose} className="grimoire-modal-close" aria-label="Fermer">×</button>
        </div>
        <div className="grimoire-modal-body space-y-2">
          <p className="text-xs text-gray-400 mb-1">Choisis le mode de lancement :</p>
          <button type="button" onClick={() => onLancer('rapide')} className="w-full px-4 py-3 rounded border border-gray-600 text-left hover:border-yellow-600 hover:bg-yellow-500/5 transition">
            <span className="text-sm font-bold text-gray-100">⚡ Combat rapide</span>
            <span className="block text-[11px] text-gray-400">MJ seul, un écran, sans diffusion</span>
          </button>
          <button type="button" onClick={() => onLancer('diffusion')} className="w-full px-4 py-3 rounded border border-[rgba(201,168,76,0.4)] text-left hover:bg-[rgba(201,168,76,0.12)] transition">
            <span className="text-sm font-bold text-[#ffe6a8]">📡 Mode diffusion</span>
            <span className="block text-[11px] text-gray-400">Vue joueurs synchronisée (TV / téléphones)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
