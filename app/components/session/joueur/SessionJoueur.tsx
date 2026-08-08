'use client'

// ============================================================================
// SessionJoueur — poste de travail joueur en partie (Phase 3)
// ----------------------------------------------------------------------------
// Mobile-first : en-tête permanent (nom, PV, CA, états, concentration) + dock
// bas 5 onglets (Fiche · Actions · Scène · Dés · Sac). Desktop : mise en page
// élargie via les breakpoints (dock devient barre haute). Une seule interface.
// ============================================================================

import { useState } from 'react'
import { CONDITIONS_MAP } from '@/app/data/conditions'
import { extraireDes } from '@/app/data/sorts_dnd5e'
import { formatMod, rollD20, rollDice } from '@/app/lib/dnd-calc'
import { logSessionEvent } from '@/app/lib/session-live'
import { useSessionJoueur } from './useSessionJoueur'
import OngletFiche from './OngletFiche'
import OngletActions from './OngletActions'
import OngletScene from './OngletScene'
import OngletDes from './OngletDes'
import OngletSac from './OngletSac'

type OngletKey = 'fiche' | 'actions' | 'scene' | 'des' | 'sac'
const ONGLETS: { key: OngletKey; label: string; icon: string }[] = [
  { key: 'fiche', label: 'Fiche', icon: '📋' },
  { key: 'actions', label: 'Actions', icon: '⚔️' },
  { key: 'scene', label: 'Scène', icon: '🎬' },
  { key: 'des', label: 'Dés', icon: '🎲' },
  { key: 'sac', label: 'Sac', icon: '🎒' }
]

function flatBonus(expr: string): number {
  const sansDes = expr.replace(/\d+d(?:4|6|8|10|12|20|100)/gi, ' ')
  let total = 0
  const m = sansDes.match(/[+-]?\s*\d+/g)
  if (m) for (const t of m) total += parseInt(t.replace(/\s+/g, ''), 10) || 0
  return total
}

export default function SessionJoueur({
  sessionId,
  scenarioId,
  characterId
}: {
  sessionId: string
  scenarioId: string
  characterId: string | null
}) {
  const api = useSessionJoueur(sessionId, characterId)
  const [onglet, setOnglet] = useState<OngletKey>('fiche')
  const [jet, setJet] = useState<{ detail: string; total: number } | null>(null)

  const nom = api.sheet?.nom ?? 'Personnage'

  // Jet d20 + bonus (carac/save/compétence/attaque).
  const roll = (label: string, bonus: number) => {
    const { rolls, kept } = rollD20('normal')
    const total = kept + bonus
    setJet({ detail: `${label} : d20(${rolls.join('/')})${bonus ? formatMod(bonus) : ''}`, total })
    void logSessionEvent(sessionId, 'dice_roll',
      { label, nom, dice: 'd20', rolls, bonus, total, prive: false }, characterId)
  }

  // Jet d'expression de dés (dégâts/sort).
  const rollExpr = (label: string, expr: string) => {
    const dice = extraireDes(expr)
    const rolls = dice.flatMap((d) => rollDice(d.faces, d.n))
    const flat = flatBonus(expr)
    const total = rolls.reduce((a, b) => a + b, 0) + flat
    setJet({ detail: `${label} : ${rolls.join('+')}${flat ? formatMod(flat) : ''}`, total })
    void logSessionEvent(sessionId, 'dice_roll',
      { label, nom, expr, rolls, flat, total, prive: false }, characterId)
  }

  if (api.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0e0b06' }}>
        <p className="text-stone-400 text-sm italic">Chargement de ta fiche…</p>
      </div>
    )
  }

  const hp = api.currentHp
  const hpMax = api.effectiveMaxHp
  const pct = hpMax > 0 ? Math.max(0, Math.min(100, (hp / hpMax) * 100)) : 0

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0e0b06' }}>
      {/* En-tête permanent */}
      <header className="sticky top-0 z-30 px-3 py-2 border-b backdrop-blur"
        style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(14,11,6,0.9)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-yellow-100 font-bold truncate" style={{ fontFamily: 'Georgia, serif' }}>{nom}</span>
              <ConnDot conn={api.conn} />
            </div>
            <div className="h-2 rounded-full bg-stone-800 overflow-hidden mt-1">
              <div className="h-full" style={{ width: `${pct}%`, background: pct <= 25 ? '#ef4444' : '#4ade80' }} />
            </div>
          </div>
          <div className="text-center flex-shrink-0">
            <p className="text-[10px] uppercase text-yellow-600 leading-none">PV</p>
            <p className="text-yellow-100 font-bold leading-tight">{hp}/{hpMax}{api.tempHp > 0 && <span className="text-cyan-300 text-xs"> +{api.tempHp}</span>}</p>
          </div>
          <div className="text-center flex-shrink-0">
            <p className="text-[10px] uppercase text-yellow-600 leading-none">CA</p>
            <p className="text-yellow-100 font-bold leading-tight">{api.sheet?.ca ?? '—'}</p>
          </div>
        </div>
        {(api.conditions.length > 0 || api.concentration) && (
          <div className="max-w-3xl mx-auto flex flex-wrap gap-1 mt-1.5">
            {api.concentration && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-cyan-900/40 border border-cyan-700/50 text-cyan-200">🌀 {api.concentration}</span>
            )}
            {api.conditions.map((c) => (
              <span key={c} className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-900/30 border border-red-800/40 text-red-200">
                {CONDITIONS_MAP[c as keyof typeof CONDITIONS_MAP]?.nom ?? c}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Barre d'onglets (haut sur desktop) */}
      <nav className="hidden md:flex max-w-3xl mx-auto w-full gap-1 px-3 pt-3">
        {ONGLETS.map((o) => (
          <button key={o.key} type="button" onClick={() => setOnglet(o.key)}
            className={`flex-1 py-2 rounded-t-lg text-sm font-bold ${
              onglet === o.key ? 'bg-stone-900/60 text-yellow-100 border-b-2 border-amber-400' : 'text-stone-400 hover:text-yellow-200'
            }`}>
            {o.icon} {o.label}
          </button>
        ))}
      </nav>

      {/* Toast dernier jet */}
      {jet && (
        <button type="button" onClick={() => setJet(null)}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 rounded-full px-4 py-1.5 shadow-lg border text-sm"
          style={{ background: '#15110a', borderColor: 'rgba(201,168,76,0.5)' }}>
          <span className="text-stone-300">{jet.detail} = </span>
          <span className="text-yellow-100 font-bold text-base">{jet.total}</span>
        </button>
      )}

      {/* Contenu */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-3 py-4 pb-24 md:pb-6">
        {onglet === 'fiche' && api.sheet && <OngletFiche sheet={api.sheet} api={api} roll={roll} />}
        {onglet === 'actions' && api.sheet && (
          <OngletActions sheet={api.sheet} spells={api.spells} api={api} roll={roll} rollExpr={rollExpr} />
        )}
        {onglet === 'scene' && (
          <OngletScene sessionId={sessionId} scenarioId={scenarioId} characterId={characterId}
            characterNom={nom} sessionState={api.sessionState} />
        )}
        {onglet === 'des' && (
          <OngletDes sessionId={sessionId} characterId={characterId} characterNom={nom} userId={api.userId} />
        )}
        {onglet === 'sac' && api.sheet && <OngletSac sheet={api.sheet} isOwner={api.sheet.id != null} />}
        {!api.sheet && onglet !== 'scene' && onglet !== 'des' && (
          <p className="text-stone-500 text-sm italic text-center py-8">
            Aucun personnage sélectionné pour cette session.
          </p>
        )}
      </main>

      {/* Dock bas (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex border-t backdrop-blur"
        style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(14,11,6,0.95)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {ONGLETS.map((o) => (
          <button key={o.key} type="button" onClick={() => setOnglet(o.key)}
            className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 ${onglet === o.key ? 'text-yellow-200' : 'text-stone-500'}`}>
            <span className="text-lg leading-none">{o.icon}</span>
            <span className="text-[10px]">{o.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function ConnDot({ conn }: { conn: 'connecte' | 'reconnexion' | 'hors-ligne' }) {
  const map = {
    connecte: { c: '#22c55e', t: 'Connecté' },
    reconnexion: { c: '#facc15', t: 'Reconnexion…' },
    'hors-ligne': { c: '#ef4444', t: 'Hors ligne' }
  } as const
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: map[conn].c }} title={map[conn].t} />
}
