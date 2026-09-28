'use client'

// ============================================================================
// SessionJoueur — poste de travail joueur en partie (Delta A)
// ----------------------------------------------------------------------------
// Le dock d'onglets et l'en-tête PV permanent ont DISPARU : la navigation passe
// entièrement par la roue du personnage, et les PV ne sont affichés qu'une fois,
// par l'arc de cette roue.
//
// Une seule arborescence de composants sert les deux dispositions, uniquement
// via les points de rupture Tailwind :
//   · mobile  — diffusion en haut, menu du pétale actif puis roue en bas ;
//   · PC (lg) — trois colonnes : menu + roue à gauche (~300 px), diffusion au
//     centre, ordre des tours / journal / dés à droite (~200 px).
//
// Aucun `transform`, `filter`, `backdrop-filter` ni `contain` sur les conteneurs
// de cette page : toutes les surfaces modales sont portées vers document.body,
// et un ancêtre porteur de ces propriétés casserait leur ancrage au viewport.
// ============================================================================

import { useState } from 'react'
import { CONDITIONS_MAP } from '@/app/data/conditions'
import { extraireDes } from '@/app/data/sorts_dnd5e'
import { formatMod, rollD20, rollDice } from '@/app/lib/dnd-calc'
import { useCombatEngine } from '@/app/lib/combat-engine'
import { logSessionEvent } from '@/app/lib/session-live'
import LanceurDesSession, { BoutonDes } from '@/app/components/session/LanceurDesSession'
import GuidedTour from '@/app/components/GuidedTour'
import Spinner from '@/app/components/Spinner'
import EmptyState from '@/app/components/ui/EmptyState'
import { useSessionJoueur } from './useSessionJoueur'
import RoueJoueur, { PETALES, type PetaleKey } from './RoueJoueur'
import OngletFiche from './OngletFiche'
import OngletSorts from './OngletSorts'
import OngletNotes from './OngletNotes'
import OngletActions from './OngletActions'
import OngletSac from './OngletSac'
import PanneauPointsDeVie from './PanneauPointsDeVie'
import ZoneDiffusion from './ZoneDiffusion'
import TimelineInitiative from './TimelineInitiative'
import JournalTable from './JournalTable'

/** Menu affiché : un pétale, le panneau PV (centre de la roue), ou rien. */
type MenuActif = PetaleKey | 'pv' | null

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
  const { combat, personnages, ennemis } = useCombatEngine(scenarioId, { isMj: false })
  const [menu, setMenu] = useState<MenuActif>(null)
  const [jet, setJet] = useState<{ detail: string; total: number } | null>(null)

  const nom = api.sheet?.nom ?? 'Personnage'

  // Jet d20 + bonus (carac / sauvegarde / compétence / attaque).
  const roll = (label: string, bonus: number) => {
    const { rolls, kept } = rollD20('normal')
    const total = kept + bonus
    setJet({ detail: `${label} : d20(${rolls.join('/')})${bonus ? formatMod(bonus) : ''}`, total })
    void logSessionEvent(sessionId, 'dice_roll',
      { label, nom, dice: 'd20', rolls, bonus, total, prive: false }, characterId)
  }

  // Jet d'expression de dés (dégâts / sort).
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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Spinner size="lg" label="Chargement de ta fiche…" />
      </div>
    )
  }

  const titreMenu =
    menu === 'pv' ? 'Points de vie' : PETALES.find((p) => p.key === menu)?.label ?? null

  const contenuMenu = () => {
    if (!menu) return null
    if (menu === 'pv') return <PanneauPointsDeVie api={api} roll={roll} />
    if (menu === 'notes') {
      return (
        <OngletNotes
          sessionId={sessionId}
          characterId={characterId}
          userId={api.userId}
          sessionState={api.sessionState}
        />
      )
    }
    if (!api.sheet) {
      return (
        <EmptyState
          icon="🎭"
          title="Aucun personnage"
          message="Aucun personnage n'est sélectionné pour cette session."
        />
      )
    }
    if (menu === 'competences') return <OngletFiche sheet={api.sheet} api={api} roll={roll} />
    if (menu === 'sorts') return <OngletSorts sheet={api.sheet} spells={api.spells} api={api} rollExpr={rollExpr} />
    if (menu === 'actions') return <OngletActions sheet={api.sheet} api={api} roll={roll} rollExpr={rollExpr} />
    return <OngletSac sheet={api.sheet} isOwner={api.sheet.id != null} />
  }

  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row overflow-hidden bg-gray-900">
      {/* --- Colonne gauche (PC) / bas d'écran (mobile) : menu + roue --- */}
      <aside
        className="order-2 lg:order-1 flex flex-col min-h-0 lg:w-[300px] lg:flex-shrink-0 lg:border-r border-gray-700"
      >
        {/* Bandeau d'états (les PV, eux, ne vivent que dans l'arc de la roue) */}
        <div className="flex items-center gap-1.5 px-3 py-1 flex-wrap flex-shrink-0">
          <ConnDot conn={api.conn} />
          {api.concentration && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-900/40 border border-cyan-700/50 text-cyan-200">
              🌀 {api.concentration}
            </span>
          )}
          {/* Pastilles d'état : même classe que le cockpit MJ (.combatmj-cond-pill),
              pour que MJ et joueur nomment le même état de la même façon. */}
          {api.conditions.map((c) => (
            <span key={c} className="combatmj-cond-pill">
              {CONDITIONS_MAP[c as keyof typeof CONDITIONS_MAP]?.nom ?? c}
            </span>
          ))}
        </div>

        {/* Menu du pétale actif */}
        {menu && (
          <div className="flex flex-col min-h-0 flex-1 max-h-[62vh] lg:max-h-none">
            <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0 border-y border-gray-700">
              <h2 className="grim-h2 flex-1 text-sm">
                {titreMenu}
              </h2>
              <button type="button" onClick={() => setMenu(null)} className="text-gray-500 hover:text-gray-300 text-lg leading-none" aria-label="Fermer le menu">
                ✕
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">{contenuMenu()}</div>
          </div>
        )}

        {/* Bouton dés — mobile : à droite, juste au-dessus de la roue */}
        <div className="lg:hidden flex justify-end px-4 pb-1 flex-shrink-0">
          <BoutonDes taille={48} />
        </div>

        {/* La roue, en bas de colonne */}
        <div className="flex-shrink-0 px-2 pb-[env(safe-area-inset-bottom)]" data-tour="roue-joueur">
          <RoueJoueur
            nom={nom}
            imageUrl={api.sheet?.image_url ?? null}
            hp={api.currentHp}
            hpMax={api.effectiveMaxHp}
            tempHp={api.tempHp}
            ca={api.sheet?.ca ?? '—'}
            actif={menu === 'pv' ? null : menu}
            onSelect={(k) => setMenu((m) => (m === k ? null : k))}
            onCentre={() => setMenu((m) => (m === 'pv' ? null : 'pv'))}
          />
        </div>
      </aside>

      {/* --- Centre : ce que le MJ diffuse, en grand --- */}
      <main className="order-1 lg:order-2 flex-1 min-h-0 overflow-y-auto px-3 py-3" data-tour="zone-diffusion">
        <ZoneDiffusion
          sessionId={sessionId}
          characterId={characterId}
          characterNom={nom}
          userId={api.userId}
          sessionState={api.sessionState}
          combat={combat}
          personnages={personnages}
          ennemis={ennemis}
        />
      </main>

      {/* --- Colonne droite (PC) : ordre des tours, journal, dés --- */}
      <aside
        className="hidden lg:flex order-3 w-[200px] flex-shrink-0 flex-col min-h-0 border-l px-2 py-3 gap-3 border-gray-700"
      >
        <div className="flex-shrink-0 max-h-[40%] flex flex-col min-h-0">
          <TimelineInitiative
            combat={combat}
            personnages={personnages}
            ennemis={ennemis}
            characterId={characterId}
          />
        </div>
        <div className="flex-1 min-h-0">
          <JournalTable sessionId={sessionId} userId={api.userId} />
        </div>
        <div className="flex-shrink-0 flex justify-center">
          <BoutonDes />
        </div>
      </aside>

      {/* Dernier jet local — habillé avec les classes .codex-toast de l'app.
          Le comportement est volontairement conservé : il reste affiché jusqu'au
          clic (on ne veut pas qu'un résultat de dé disparaisse tout seul en
          pleine partie), là où `toast.*` se referme après quelques secondes. */}
      {jet && (
        <div className="codex-toast-stack" role="status" aria-live="polite">
          <div className="codex-toast codex-toast-info">
            <span className="codex-toast-icon" aria-hidden>🎲</span>
            <span className="codex-toast-body">
              {jet.detail} = <b className="text-yellow-100 text-base">{jet.total}</b>
            </span>
            <button type="button" className="codex-toast-close" onClick={() => setJet(null)} aria-label="Fermer">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Tutoriel guidé du poste joueur (bouton 🎓, auto à la première partie) */}
      <GuidedTour tourId="session-joueur" />

      {/* Le lanceur de dés de l'application, porté dans document.body */}
      <LanceurDesSession session={{ sessionId, characterId, characterNom: nom }} />
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
