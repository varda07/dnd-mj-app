'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap 8.2 — XP tracker visuel avec milestones
// ----------------------------------------------------------------------------
// Page par scénario : barre de progression de chaque PJ vers le niveau
// suivant, distribution rapide d'XP au groupe, jalons (milestones) et
// historique des distributions. Les XP sont écrits dans `personnages.xp` ;
// milestones + historique sont conservés en localStorage (pas de table
// dédiée — purement outil de suivi côté MJ).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { xpRequisProchainNiveau, niveauPourXp } from '@/app/data/dnd5e'

type Perso = { id: string; nom: string; niveau: number; xp: number }
type Distribution = { date: string; montant: number; cible: string }
type Milestone = { id: string; label: string; xp: number }

export default function XpTrackerPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const scenarioId = params?.id

  const [scenarioNom, setScenarioNom] = useState('')
  const [persos, setPersos] = useState<Perso[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [montant, setMontant] = useState('')
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [historique, setHistorique] = useState<Distribution[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [msLabel, setMsLabel] = useState('')
  const [msXp, setMsXp] = useState('')
  const [message, setMessage] = useState('')

  const lsHistKey = `xp_hist_${scenarioId}`
  const lsMsKey = `xp_milestones_${scenarioId}`

  // --------------------------------------------------------------------------
  // Chargement
  // --------------------------------------------------------------------------
  const charger = useCallback(async () => {
    if (!scenarioId) return
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }
    const { data: scn } = await supabase
      .from('scenarios')
      .select('id, nom')
      .eq('id', scenarioId)
      .maybeSingle()
    if (!scn) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setScenarioNom(scn.nom as string)
    const { data: ps } = await supabase
      .from('personnages')
      .select('id, nom, niveau, xp')
      .eq('scenario_id', scenarioId)
      .order('nom')
    const liste = (ps ?? []).map((p) => ({
      id: p.id as string,
      nom: p.nom as string,
      niveau: (p.niveau as number) ?? 1,
      xp: (p.xp as number) ?? 0
    }))
    setPersos(liste)
    setSelection(new Set(liste.map((p) => p.id)))
    setLoading(false)
  }, [scenarioId, router])

  useEffect(() => {
    charger()
  }, [charger])

  useEffect(() => {
    if (!scenarioId) return
    try {
      const h = localStorage.getItem(lsHistKey)
      if (h) setHistorique(JSON.parse(h))
      const m = localStorage.getItem(lsMsKey)
      if (m) setMilestones(JSON.parse(m))
    } catch {
      /* localStorage indisponible — non bloquant */
    }
  }, [scenarioId, lsHistKey, lsMsKey])

  const persistHist = (h: Distribution[]) => {
    setHistorique(h)
    try {
      localStorage.setItem(lsHistKey, JSON.stringify(h))
    } catch {
      /* ignore */
    }
  }
  const persistMs = (m: Milestone[]) => {
    setMilestones(m)
    try {
      localStorage.setItem(lsMsKey, JSON.stringify(m))
    } catch {
      /* ignore */
    }
  }

  // --------------------------------------------------------------------------
  // Distribution d'XP
  // --------------------------------------------------------------------------
  const distribuer = async () => {
    const gain = parseInt(montant)
    if (!gain || gain === 0) {
      setMessage('Saisis un montant d’XP.')
      return
    }
    const cibles = persos.filter((p) => selection.has(p.id))
    if (cibles.length === 0) {
      setMessage('Sélectionne au moins un personnage.')
      return
    }
    setMessage('Distribution…')
    let echec = false
    for (const p of cibles) {
      const nouvelXp = Math.max(0, p.xp + gain)
      const { error } = await supabase
        .from('personnages')
        .update({ xp: nouvelXp })
        .eq('id', p.id)
      if (error) {
        console.error('[xp] update :', error)
        echec = true
      }
    }
    if (echec) {
      setMessage('Erreur sur une ou plusieurs mises à jour.')
      return
    }
    persistHist([
      {
        date: new Date().toISOString(),
        montant: gain,
        cible:
          cibles.length === persos.length
            ? 'Tout le groupe'
            : cibles.map((c) => c.nom).join(', ')
      },
      ...historique
    ].slice(0, 50))
    setMontant('')
    setMessage(`✓ ${gain > 0 ? '+' : ''}${gain} XP distribués à ${cibles.length} PJ.`)
    charger()
  }

  const toggleSel = (id: string) =>
    setSelection((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const ajouterMilestone = () => {
    const xp = parseInt(msXp)
    if (!msLabel.trim() || !xp) return
    persistMs(
      [...milestones, { id: crypto.randomUUID(), label: msLabel.trim(), xp }].sort(
        (a, b) => a.xp - b.xp
      )
    )
    setMsLabel('')
    setMsXp('')
  }

  if (loading) {
    return (
      <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400">Chargement…</p>
      </main>
    )
  }
  if (notFound) {
    return (
      <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400">Scénario introuvable.</p>
      </main>
    )
  }

  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/scenarios/${scenarioId}/edit`)}
            className="px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[#C9A84C] border border-[rgba(201,168,76,0.30)] hover:bg-[rgba(201,168,76,0.08)] hover:border-[#C9A84C] rounded transition"
          >
            ← Scénario
          </button>
        </div>

        <h1
          className="text-[#C9A84C]"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 30,
            fontWeight: 300,
            letterSpacing: '0.06em'
          }}
        >
          Suivi d&apos;expérience
        </h1>
        <p className="text-gray-400 text-sm mb-6">{scenarioNom}</p>

        {/* Distribution rapide */}
        <section className="rounded-lg p-4 mb-5 bg-gray-800/60 border border-[rgba(201,168,76,0.15)]">
          <h2 className="text-[#C9A84C] font-bold mb-3 text-sm uppercase tracking-widest">
            Distribuer de l&apos;XP
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="Montant (ex : 450)"
              className="flex-1 min-w-[140px] p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
            />
            <button
              type="button"
              onClick={distribuer}
              className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold text-sm"
            >
              Distribuer aux sélectionnés
            </button>
          </div>
          {message && <p className="text-yellow-400 text-xs mt-2">{message}</p>}
          <p className="text-[11px] text-gray-500 mt-2">
            Décoche un personnage ci-dessous pour l&apos;exclure de la
            distribution. Un montant négatif retire de l&apos;XP.
          </p>
        </section>

        {/* Personnages */}
        <section className="space-y-3 mb-6">
          {persos.length === 0 && (
            <p className="text-gray-500 text-sm italic">
              Aucun personnage rattaché à ce scénario.
            </p>
          )}
          {persos.map((p) => {
            const niveauReel = p.niveau
            const seuilActuel =
              niveauReel > 1 ? xpRequisProchainNiveau(niveauReel - 1) ?? 0 : 0
            const seuilProchain = xpRequisProchainNiveau(niveauReel)
            const pct =
              seuilProchain && seuilProchain > seuilActuel
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      ((p.xp - seuilActuel) / (seuilProchain - seuilActuel)) * 100
                    )
                  )
                : 100
            const niveauTheorique = niveauPourXp(p.xp)
            const peutMonter = niveauTheorique > niveauReel
            return (
              <div
                key={p.id}
                className="rounded-lg p-3 bg-gray-800 border border-gray-700"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selection.has(p.id)}
                      onChange={() => toggleSel(p.id)}
                      className="accent-yellow-500"
                    />
                    <span className="font-bold text-white">{p.nom}</span>
                  </label>
                  <span className="text-xs text-gray-400">Niveau {p.niveau}</span>
                  {peutMonter && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      ⬆ Peut monter au niveau {niveauTheorique}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-gray-500">
                    {p.xp.toLocaleString('fr-FR')} XP
                    {seuilProchain
                      ? ` / ${seuilProchain.toLocaleString('fr-FR')}`
                      : ' (niveau max)'}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-gray-900 overflow-hidden border border-gray-700">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${pct}%`,
                      background:
                        'linear-gradient(90deg, #C9A84C 0%, #e6c878 100%)'
                    }}
                  />
                </div>
              </div>
            )
          })}
        </section>

        {/* Milestones */}
        <section className="rounded-lg p-4 mb-5 bg-gray-800/60 border border-[rgba(201,168,76,0.15)]">
          <h2 className="text-[#C9A84C] font-bold mb-3 text-sm uppercase tracking-widest">
            Jalons (milestones)
          </h2>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input
              type="text"
              value={msLabel}
              onChange={(e) => setMsLabel(e.target.value)}
              placeholder="Nom du jalon (ex : Fin de l'acte 1)"
              className="flex-1 min-w-[160px] p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
            />
            <input
              type="number"
              value={msXp}
              onChange={(e) => setMsXp(e.target.value)}
              placeholder="XP cible"
              className="w-28 p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
            />
            <button
              type="button"
              onClick={ajouterMilestone}
              className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-bold"
            >
              + Ajouter
            </button>
          </div>
          {milestones.length === 0 ? (
            <p className="text-gray-500 text-xs italic">
              Aucun jalon défini. Les jalons servent de repères d&apos;XP pour le
              passage de niveau du groupe.
            </p>
          ) : (
            <ul className="space-y-1">
              {milestones.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 text-sm rounded border border-gray-700 bg-black/30 px-2 py-1.5"
                >
                  <span className="text-gray-200">
                    🚩 {m.label}{' '}
                    <span className="text-gray-500 text-xs">
                      — {m.xp.toLocaleString('fr-FR')} XP
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      persistMs(milestones.filter((x) => x.id !== m.id))
                    }
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Historique */}
        <section className="rounded-lg p-4 bg-gray-800/60 border border-[rgba(201,168,76,0.15)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#C9A84C] font-bold text-sm uppercase tracking-widest">
              Historique des distributions
            </h2>
            {historique.length > 0 && (
              <button
                type="button"
                onClick={() => persistHist([])}
                className="text-[10px] text-gray-500 hover:text-red-300"
              >
                Vider
              </button>
            )}
          </div>
          {historique.length === 0 ? (
            <p className="text-gray-500 text-xs italic">Aucune distribution.</p>
          ) : (
            <ul className="space-y-1">
              {historique.map((h, i) => (
                <li key={i} className="text-xs text-gray-400">
                  <span className="text-yellow-300 font-bold">
                    {h.montant > 0 ? '+' : ''}
                    {h.montant.toLocaleString('fr-FR')} XP
                  </span>{' '}
                  → {h.cible}{' '}
                  <span className="text-gray-600">
                    ({new Date(h.date).toLocaleString('fr-FR')})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
