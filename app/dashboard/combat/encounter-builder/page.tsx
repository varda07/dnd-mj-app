'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap 2.6 — Encounter builder
// ----------------------------------------------------------------------------
// Calcule le budget d'XP d'un groupe (DMG p.82), laisse le MJ composer une
// rencontre depuis son bestiaire et affiche en direct la difficulté. Un bouton
// « Suggérer » propose une combinaison pour une difficulté cible.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { xpPourCD, labelCD } from '@/app/data/dnd5e'
import {
  calculerBudget,
  xpAjuste,
  multiplicateurRencontre,
  evaluerDifficulte,
  DIFFICULTE_LABEL,
  DIFFICULTE_COULEUR,
  type Difficulte
} from '@/app/data/encounter'

type EnnemiLite = { id: string; nom: string; cd: number | null }

export default function EncounterBuilderPage() {
  const router = useRouter()
  const [nbPj, setNbPj] = useState(4)
  const [niveau, setNiveau] = useState(3)
  const [ennemis, setEnnemis] = useState<EnnemiLite[]>([])
  const [quantites, setQuantites] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    const charger = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data } = await supabase
        .from('ennemis')
        .select('id, nom, cd')
        .eq('mj_id', user.id)
        .order('cd', { ascending: true })
      if (cancel) return
      setEnnemis(
        ((data ?? []) as Array<{ id: string; nom: string; cd: number | null }>).map(
          (e) => ({ id: e.id, nom: e.nom, cd: e.cd })
        )
      )
      setLoading(false)
    }
    charger()
    return () => {
      cancel = true
    }
  }, [router])

  const budget = useMemo(() => calculerBudget(nbPj, niveau), [nbPj, niveau])

  // Synthèse de la rencontre composée.
  const synthese = useMemo(() => {
    let nbMonstres = 0
    let xpBrut = 0
    for (const e of ennemis) {
      const q = quantites[e.id] ?? 0
      if (q <= 0) continue
      nbMonstres += q
      xpBrut += xpPourCD(e.cd) * q
    }
    const ajuste = xpAjuste(xpBrut, nbMonstres)
    const difficulte = evaluerDifficulte(ajuste, budget)
    return { nbMonstres, xpBrut, ajuste, difficulte }
  }, [ennemis, quantites, budget])

  const setQ = (id: string, delta: number) =>
    setQuantites((q) => {
      const next = Math.max(0, (q[id] ?? 0) + delta)
      return { ...q, [id]: next }
    })

  const reset = () => setQuantites({})

  // Suggère une combinaison mono-monstre approchant au mieux la difficulté
  // cible (on teste 1..15 exemplaires de chaque ennemi du bestiaire).
  const suggerer = (cible: Difficulte) => {
    const cibleXp = budget[cible]
    let meilleur: { id: string; n: number; ecart: number } | null = null
    for (const e of ennemis) {
      const xpUnitaire = xpPourCD(e.cd)
      if (xpUnitaire <= 0) continue
      for (let n = 1; n <= 15; n++) {
        const aj = xpAjuste(xpUnitaire * n, n)
        const ecart = Math.abs(aj - cibleXp)
        if (!meilleur || ecart < meilleur.ecart) {
          meilleur = { id: e.id, n, ecart }
        }
      }
    }
    if (meilleur) setQuantites({ [meilleur.id]: meilleur.n })
  }

  const couleurDiff = synthese.difficulte
    ? DIFFICULTE_COULEUR[synthese.difficulte]
    : '#6a6a72'

  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/dashboard/combat')}
            className="px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[#C9A84C] border border-[rgba(201,168,76,0.30)] hover:bg-[rgba(201,168,76,0.08)] hover:border-[#C9A84C] rounded transition"
          >
            ← Combat
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
          Calculateur de rencontre
        </h1>
        <p className="text-gray-500 text-xs italic mb-6">
          Budget d'XP du groupe et difficulté en temps réel (règles DMG p.82).
        </p>

        {/* Paramètres du groupe */}
        <section
          className="rounded-lg p-4 mb-4"
          style={{
            background:
              'linear-gradient(135deg, rgba(20,15,8,0.6) 0%, rgba(10,8,4,0.4) 100%)',
            border: '1px solid rgba(201,168,76,0.12)',
            borderLeft: '2px solid rgba(201,168,76,0.45)'
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                Nombre de PJ
              </span>
              <input
                type="number"
                min={1}
                max={12}
                value={nbPj}
                onChange={(e) =>
                  setNbPj(Math.max(1, Math.min(12, Number(e.target.value) || 1)))
                }
                className="w-full mt-1 p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none focus:border-yellow-500"
              />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                Niveau moyen
              </span>
              <input
                type="number"
                min={1}
                max={20}
                value={niveau}
                onChange={(e) =>
                  setNiveau(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
                }
                className="w-full mt-1 p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none focus:border-yellow-500"
              />
            </label>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {(
              [
                ['facile', 'Facile'],
                ['moyen', 'Moyen'],
                ['difficile', 'Difficile'],
                ['mortel', 'Mortel']
              ] as const
            ).map(([cle, label]) => (
              <div
                key={cle}
                className="text-center rounded p-2"
                style={{ background: 'rgba(0,0,0,0.3)' }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: DIFFICULTE_COULEUR[cle] }}
                >
                  {label}
                </p>
                <p
                  className="font-bold"
                  style={{ fontFamily: 'Georgia, serif', fontSize: 16 }}
                >
                  {budget[cle].toLocaleString('fr-FR')}
                </p>
                <p className="text-[9px] text-gray-500">XP</p>
              </div>
            ))}
          </div>
        </section>

        {/* Synthèse de la rencontre composée */}
        <section
          className="rounded-lg p-4 mb-4 text-center"
          style={{
            background: `radial-gradient(ellipse at 50% 130%, ${couleurDiff}22 0%, transparent 70%), rgba(0,0,0,0.3)`,
            border: `1px solid ${couleurDiff}55`
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-1">
            Difficulté de la rencontre
          </p>
          <p
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 32,
              fontWeight: 400,
              color: couleurDiff
            }}
          >
            {synthese.difficulte
              ? DIFFICULTE_LABEL[synthese.difficulte].toUpperCase()
              : synthese.nbMonstres > 0
              ? 'TRIVIALE'
              : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {synthese.nbMonstres} monstre{synthese.nbMonstres > 1 ? 's' : ''} ·{' '}
            {synthese.xpBrut.toLocaleString('fr-FR')} XP bruts · ×
            {multiplicateurRencontre(synthese.nbMonstres)} ={' '}
            <span className="text-yellow-300">
              {synthese.ajuste.toLocaleString('fr-FR')} XP ajustés
            </span>
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            <button
              type="button"
              onClick={() => suggerer('moyen')}
              className="px-3 py-1.5 text-xs font-bold rounded border border-yellow-600/50 text-yellow-300 hover:bg-yellow-500/10"
            >
              🎲 Suggérer (Moyen)
            </button>
            <button
              type="button"
              onClick={() => suggerer('difficile')}
              className="px-3 py-1.5 text-xs font-bold rounded border border-orange-600/50 text-orange-300 hover:bg-orange-500/10"
            >
              🎲 Suggérer (Difficile)
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1.5 text-xs font-bold rounded border border-gray-700 text-gray-400 hover:bg-gray-800"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/combat')}
              disabled={synthese.nbMonstres === 0}
              className="px-3 py-1.5 text-xs font-bold rounded bg-yellow-500 text-gray-900 hover:bg-yellow-400 disabled:opacity-40"
              title="Ouvrir la page de combat pour mettre en place la rencontre"
            >
              ⚔ Lancer ce combat
            </button>
          </div>
        </section>

        {/* Bestiaire du MJ */}
        <h2 className="text-sm font-bold text-gray-300 mb-2">
          Ton bestiaire ({ennemis.length})
        </h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Chargement…</p>
        ) : ennemis.length === 0 ? (
          <p className="text-gray-500 text-sm italic">
            Aucun ennemi dans ta bibliothèque — crée-en dans la section Ennemis.
          </p>
        ) : (
          <div className="space-y-1.5">
            {ennemis.map((e) => {
              const q = quantites[e.id] ?? 0
              const xpU = xpPourCD(e.cd)
              return (
                <div
                  key={e.id}
                  className={`flex items-center gap-3 p-2 rounded border transition ${
                    q > 0
                      ? 'border-yellow-600/50 bg-yellow-500/[0.06]'
                      : 'border-gray-800 bg-gray-900/40'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{e.nom}</p>
                    <p className="text-[11px] text-gray-500">
                      CD {labelCD(e.cd)} · {xpU.toLocaleString('fr-FR')} XP
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setQ(e.id, -1)}
                      className="w-9 h-9 md:w-7 md:h-7 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 font-bold"
                      aria-label={`Retirer ${e.nom}`}
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm text-yellow-200 font-bold">
                      {q}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQ(e.id, 1)}
                      className="w-9 h-9 md:w-7 md:h-7 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 font-bold"
                      aria-label={`Ajouter ${e.nom}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
