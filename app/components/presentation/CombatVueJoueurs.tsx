'use client'

// ============================================================================
// Refonte combat diffusion — PHASE 2 : Vue Joueurs (épurée & COMPACTE)
// ----------------------------------------------------------------------------
// Affichée sur la TV / les téléphones quand un combat est actif. Format dense
// et élégant : barre de tour compacte, mini-timeline d'initiative, deux
// colonnes Compagnons | Ennemis en lignes fines. Ne SPOILE jamais les stats
// des ennemis (état qualitatif + conditions physiquement visibles).
// ============================================================================

import { CONDITIONS_MAP, isConditionKey } from '@/app/data/conditions'
import CombatCarte, { type Jeton } from '@/app/components/presentation/CombatCarte'
import type { CombatLite, Persona, Ennemi, InitiativeEntry } from '@/app/dashboard/presentation/page'

function entiteId(e: InitiativeEntry | null | undefined): string | null {
  if (!e) return null
  return e.ref_id ?? e.id ?? (e.piece_id ? e.piece_id.replace(/^(perso|ennemi)-/, '') : null)
}

// État qualitatif d'un ennemi (jamais de PV exacts côté joueurs).
type EtatQualitatif = { label: string; couleur: string }
export function etatQualitatif(hp: number, hpMax: number): EtatQualitatif {
  if (hpMax <= 0 || hp <= 0) return { label: 'Hors de combat', couleur: '#6b7280' }
  const ratio = hp / hpMax
  if (ratio >= 0.75) return { label: 'En forme', couleur: '#4ade80' }
  if (ratio >= 0.5) return { label: 'Blessé', couleur: '#facc15' }
  if (ratio >= 0.25) return { label: 'Mal en point', couleur: '#fb923c' }
  return { label: 'Mourant', couleur: '#f87171' }
}

// Conditions physiquement observables sur un ennemi (les autres restent
// secrètes pour ne pas spoiler les effets mentaux/sensoriels).
const CONDITIONS_VISIBLES_ENNEMI = new Set([
  'a_terre',
  'etourdi',
  'paralyse',
  'petrifie',
  'inconscient',
  'entrave',
  'saisi',
  'ralenti'
])

function PastillesConditions({
  conditions,
  filtreVisible,
  cachees
}: {
  conditions: string[]
  filtreVisible: boolean
  cachees?: string[]
}) {
  const liste = conditions
    .filter((c) => !cachees?.includes(c))
    .filter((c) => (filtreVisible ? CONDITIONS_VISIBLES_ENNEMI.has(c) : true))
  if (liste.length === 0) return null
  return (
    <span className="combatj-conditions">
      {liste.map((c) => {
        const cond = isConditionKey(c) ? CONDITIONS_MAP[c] : null
        return (
          <span key={c} className="combatj-condition" title={cond?.nom ?? c}>
            {cond?.icone ?? '•'}
          </span>
        )
      })}
    </span>
  )
}

export default function CombatVueJoueurs({
  combat,
  personnages,
  ennemis,
  ennemisReveles = false,
  carteBackground
}: {
  combat: CombatLite
  personnages: Persona[]
  ennemis: Ennemi[]
  ennemisReveles?: boolean
  carteBackground?: string | null
}) {
  const ordre = combat.ordre_initiative ?? []
  const tour = ordre[combat.tour_actuel] ?? null
  const tourId = entiteId(tour)
  const etats = combat.etats_combat ?? {}

  // Carte tactique (lecture seule) — uniquement si le MJ l'a autorisée.
  const carteVisible = !!combat.carte_visible_joueurs
  const jetons: Jeton[] = carteVisible
    ? [
        ...personnages.map((p) => ({
          pieceId: `perso-${p.id}`,
          id: p.id,
          nom: p.nom,
          kind: 'perso' as const,
          image_url: p.image_url
        })),
        ...ennemis.map((e) => ({
          pieceId: `ennemi-${e.id}`,
          id: e.id,
          nom: ennemisReveles ? e.nom : '???',
          kind: 'ennemi' as const,
          image_url: ennemisReveles ? e.image_url : null
        }))
      ]
    : []

  return (
    <div className="combatj-root">
      {/* Barre de tour compacte + mini-timeline d'initiative */}
      <div className="combatj-bar" key={`${combat.round}-${combat.tour_actuel}`}>
        <span className="combatj-bar-round">⚔ R{combat.round}</span>
        {tour && (
          <span className="combatj-bar-tour">
            Au tour de <b>{tour.nom}</b>
          </span>
        )}
        {ordre.length > 0 && (
          <div className="combatj-initline">
            {ordre.map((e, i) => {
              const masque = e.kind === 'ennemi' && !ennemisReveles
              return (
                <span
                  key={e.piece_id ?? `${e.nom}-${i}`}
                  className={`combatj-init-chip${i === combat.tour_actuel ? ' is-current' : ''}${
                    e.kind === 'ennemi' ? ' is-enemy' : ''
                  }${i < combat.tour_actuel ? ' is-done' : ''}`}
                  title={masque ? '???' : e.nom}
                >
                  {masque ? '👹' : e.nom}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Carte tactique côté joueurs (si autorisée par le MJ) */}
      {carteVisible && jetons.length > 0 && (
        <div className="combatj-carte">
          <CombatCarte
            jetons={jetons}
            positions={combat.positions ?? {}}
            backgroundUrl={carteBackground ?? null}
            compact
          />
        </div>
      )}

      <div className="combatj-grid">
        {/* Compagnons (PV exacts, conditions) */}
        <section className="combatj-panel combatj-panel-pj">
          <h3 className="combatj-panel-title">🛡 Compagnons</h3>
          {personnages.length === 0 ? (
            <p className="combatj-empty">Aucun compagnon.</p>
          ) : (
            personnages.map((p) => {
              const pct =
                p.hp_max > 0
                  ? Math.max(0, Math.min(100, Math.round((p.hp_actuel / p.hp_max) * 100)))
                  : 0
              const actif = !!tourId && tourId === p.id
              const ko = p.hp_actuel <= 0
              return (
                <div
                  key={p.id}
                  className={`combatj-row${actif ? ' is-turn' : ''}${ko ? ' is-ko' : ''}`}
                >
                  <span className="combatj-row-nom">{p.nom}</span>
                  <span className="combatj-row-bar">
                    <span
                      className={`combatj-row-fill${pct <= 25 ? ' is-low' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="combatj-row-hp">
                    {p.hp_actuel}/{p.hp_max}
                  </span>
                  <PastillesConditions
                    conditions={Array.isArray(p.conditions) ? p.conditions : []}
                    filtreVisible={false}
                  />
                </div>
              )
            })
          )}
        </section>

        {/* Ennemis (état qualitatif, une ligne) */}
        <section className="combatj-panel combatj-panel-ennemi">
          <h3 className="combatj-panel-title">👹 Adversaires</h3>
          {ennemis.length === 0 ? (
            <p className="combatj-empty">Aucun adversaire.</p>
          ) : (
            ennemis.map((e) => {
              const actif = !!tourId && tourId === e.id
              const ko = e.hp_actuel <= 0
              const etat = etatQualitatif(e.hp_actuel, e.hp_max)
              const cachees = etats[`ennemi-${e.id}`]?.conditions_cachees ?? []
              return (
                <div
                  key={e.id}
                  className={`combatj-row${actif ? ' is-turn' : ''}${ko ? ' is-ko' : ''}`}
                >
                  <span
                    className="combatj-dot"
                    style={{ background: etat.couleur }}
                    aria-hidden
                  />
                  <span className="combatj-row-nom">
                    {ennemisReveles ? e.nom : 'Créature obscure'}
                  </span>
                  <span className="combatj-row-etat" style={{ color: etat.couleur }}>
                    {ennemisReveles ? `${e.hp_actuel}/${e.hp_max}` : etat.label}
                  </span>
                  <PastillesConditions
                    conditions={Array.isArray(e.conditions) ? e.conditions : []}
                    filtreVisible
                    cachees={cachees}
                  />
                </div>
              )
            })
          )}
        </section>
      </div>
    </div>
  )
}
