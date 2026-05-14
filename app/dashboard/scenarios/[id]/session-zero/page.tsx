'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap 1.2 — Session zéro
// ----------------------------------------------------------------------------
// Document collaboratif par scénario : lignes rouges, attentes, style de jeu
// (ratios combat/RP/exploration), ton, tabous, inspirations. Le MJ et les
// joueurs inscrits peuvent contribuer (cf. RLS de la table session_zero).
// Auto-save débounce dans session_zero.contenu (jsonb).
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type StyleJeu = { combat: number; rp: number; exploration: number }
type SessionZeroContenu = {
  lignes_rouges: string
  attentes: string
  style: StyleJeu
  ton: string
  tabous: string
  inspirations: string
}

const CONTENU_VIDE: SessionZeroContenu = {
  lignes_rouges: '',
  attentes: '',
  style: { combat: 33, rp: 34, exploration: 33 },
  ton: 'serieux',
  tabous: '',
  inspirations: ''
}

const TONS = [
  { cle: 'serieux', label: 'Sérieux' },
  { cle: 'humoristique', label: 'Humoristique' },
  { cle: 'sombre', label: 'Sombre' },
  { cle: 'leger', label: 'Léger' }
]

const AUTO_SAVE_MS = 1500

// Fusionne le contenu brut chargé avec la forme attendue (tolérant aux champs
// manquants d'une ancienne sauvegarde).
function normaliserContenu(raw: unknown): SessionZeroContenu {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const s = (o.style && typeof o.style === 'object' ? o.style : {}) as Record<
    string,
    unknown
  >
  return {
    lignes_rouges: typeof o.lignes_rouges === 'string' ? o.lignes_rouges : '',
    attentes: typeof o.attentes === 'string' ? o.attentes : '',
    style: {
      combat: typeof s.combat === 'number' ? s.combat : 33,
      rp: typeof s.rp === 'number' ? s.rp : 34,
      exploration: typeof s.exploration === 'number' ? s.exploration : 33
    },
    ton: typeof o.ton === 'string' ? o.ton : 'serieux',
    tabous: typeof o.tabous === 'string' ? o.tabous : '',
    inspirations: typeof o.inspirations === 'string' ? o.inspirations : ''
  }
}

export default function SessionZeroPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const scenarioId = params?.id

  const [scenarioNom, setScenarioNom] = useState('')
  const [contenu, setContenu] = useState<SessionZeroContenu>(CONTENU_VIDE)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'saving'>('saved')

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreNextSave = useRef(true)

  // --------------------------------------------------------------------------
  // Chargement : scénario + ligne session_zero (créée si absente)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!scenarioId) return
    let cancel = false
    const charger = async () => {
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
      if (cancel) return
      if (!scn) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setScenarioNom(scn.nom as string)

      const { data: sz } = await supabase
        .from('session_zero')
        .select('contenu')
        .eq('scenario_id', scenarioId)
        .maybeSingle()
      if (cancel) return
      if (sz) {
        setContenu(normaliserContenu(sz.contenu))
      } else {
        // Crée la ligne vide (idempotent côté contrainte unique scenario_id).
        await supabase
          .from('session_zero')
          .insert({ scenario_id: scenarioId, contenu: CONTENU_VIDE })
      }
      setLoading(false)
    }
    charger()
    return () => {
      cancel = true
    }
  }, [scenarioId, router])

  // --------------------------------------------------------------------------
  // Auto-save débounce
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (ignoreNextSave.current) {
      ignoreNextSave.current = false
      return
    }
    if (!scenarioId) return
    setSaveState('pending')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveState('saving')
      const { error } = await supabase
        .from('session_zero')
        .update({ contenu })
        .eq('scenario_id', scenarioId)
      if (error) {
        console.error('[session-zero] save :', {
          message: error.message,
          code: error.code,
          hint: error.hint
        })
        setSaveState('pending')
        return
      }
      setSaveState('saved')
    }, AUTO_SAVE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [contenu, scenarioId])

  const patch = (p: Partial<SessionZeroContenu>) =>
    setContenu((c) => ({ ...c, ...p }))

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

  const totalStyle =
    contenu.style.combat + contenu.style.rp + contenu.style.exploration

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
          <span className="text-[11px] text-gray-500 italic">
            {saveState === 'saving'
              ? 'Sauvegarde…'
              : saveState === 'pending'
              ? 'Modifié'
              : '✓ Sauvegardé'}
          </span>
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
          Session zéro
        </h1>
        <p className="text-gray-400 text-sm mb-1">{scenarioNom}</p>
        <p className="text-gray-500 text-xs italic mb-6">
          Document collaboratif — le MJ et les joueurs inscrits peuvent le
          remplir ensemble.
        </p>

        <div className="space-y-5">
          {/* Lignes rouges */}
          <Section titre="🛑 Lignes rouges" sous="Ce qu'on évite absolument à la table.">
            <textarea
              value={contenu.lignes_rouges}
              onChange={(e) => patch({ lignes_rouges: e.target.value })}
              placeholder="Violence sur les enfants, torture explicite, etc."
              className="sz-textarea"
            />
          </Section>

          {/* Attentes joueurs */}
          <Section titre="🎯 Attentes des joueurs" sous="Ce que chacun espère vivre dans cette campagne.">
            <textarea
              value={contenu.attentes}
              onChange={(e) => patch({ attentes: e.target.value })}
              placeholder="Beaucoup de roleplay, des énigmes, un grand méchant marquant…"
              className="sz-textarea"
            />
          </Section>

          {/* Style de jeu */}
          <Section
            titre="⚖️ Style de jeu"
            sous={`Ratio approximatif combat / RP / exploration — total : ${totalStyle} %`}
          >
            <div className="space-y-3">
              {(
                [
                  ['combat', '⚔ Combat'],
                  ['rp', '🎭 Roleplay'],
                  ['exploration', '🧭 Exploration']
                ] as const
              ).map(([cle, label]) => (
                <div key={cle} className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 w-32 flex-shrink-0">
                    {label}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={contenu.style[cle]}
                    onChange={(e) =>
                      patch({
                        style: {
                          ...contenu.style,
                          [cle]: Number(e.target.value)
                        }
                      })
                    }
                    className="flex-1 accent-yellow-500"
                  />
                  <span className="text-sm text-yellow-300 w-12 text-right">
                    {contenu.style[cle]} %
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Ton */}
          <Section titre="🎨 Ton" sous="L'ambiance générale recherchée.">
            <div className="flex flex-wrap gap-2">
              {TONS.map((t) => (
                <button
                  key={t.cle}
                  type="button"
                  onClick={() => patch({ ton: t.cle })}
                  className={`px-3 py-1.5 rounded text-sm font-bold border transition ${
                    contenu.ton === t.cle
                      ? 'border-yellow-500 bg-yellow-500/15 text-yellow-200'
                      : 'border-gray-700 text-gray-300 hover:border-yellow-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Tabous et limites */}
          <Section titre="⚠️ Tabous et limites" sous="Sujets à manier avec précaution ou à éviter.">
            <textarea
              value={contenu.tabous}
              onChange={(e) => patch({ tabous: e.target.value })}
              placeholder="Phobies, sujets sensibles, limites personnelles…"
              className="sz-textarea"
            />
          </Section>

          {/* Inspirations */}
          <Section titre="✨ Inspirations" sous="Films, livres, séries, jeux qui donnent le ton.">
            <textarea
              value={contenu.inspirations}
              onChange={(e) => patch({ inspirations: e.target.value })}
              placeholder="Le Seigneur des Anneaux, Witcher, Critical Role…"
              className="sz-textarea"
            />
          </Section>
        </div>
      </div>

      <style>{`
        .sz-textarea {
          width: 100%;
          min-height: 90px;
          padding: 10px 12px;
          border-radius: 6px;
          background: linear-gradient(180deg, rgba(20,15,8,0.5) 0%, rgba(10,8,4,0.35) 100%);
          border: 1px solid rgba(201,168,76,0.22);
          color: #e8e0c8;
          font-size: 14px;
          line-height: 1.6;
          outline: none;
          resize: vertical;
        }
        .sz-textarea::placeholder { color: #6a6a72; font-style: italic; }
        .sz-textarea:focus { border-color: rgba(201,168,76,0.6); }
      `}</style>
    </main>
  )
}

// Bloc de section au style grimoire (titre serif or + bordure gauche).
function Section({
  titre,
  sous,
  children
}: {
  titre: string
  sous: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-lg p-4"
      style={{
        background:
          'linear-gradient(135deg, rgba(20,15,8,0.6) 0%, rgba(10,8,4,0.4) 100%)',
        borderLeft: '2px solid rgba(201,168,76,0.45)',
        border: '1px solid rgba(201,168,76,0.12)',
        borderLeftWidth: 2
      }}
    >
      <h2
        style={{
          fontFamily: 'Georgia, serif',
          color: '#C9A84C',
          fontSize: 17,
          margin: 0
        }}
      >
        {titre}
      </h2>
      <p className="text-gray-500 text-xs italic mb-3">{sous}</p>
      {children}
    </section>
  )
}
