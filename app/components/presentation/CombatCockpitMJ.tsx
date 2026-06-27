'use client'

// ============================================================================
// Refonte combat diffusion — PHASE 1 : Cockpit de combat MJ
// ----------------------------------------------------------------------------
// Vue MJ complète intégrée dans l'onglet ⚔️ Combat du mode diffusion :
//   1.1 timeline d'initiative horizontale
//   1.2 panneau Alliés (PJ) — PV exacts, CA, conditions, édition rapide
//   1.3 panneau Ennemis — PV, CA, attaques, résistances/immunités/vulnérabilités,
//       tactique, conditions
//   1.4 gestion des conditions sur n'importe quel participant
//   1.5 boutons d'action rapide (dégâts / soin / tour suivant / terminer)
//   1.6 auto-roll des attaques d'ennemis (AttackRoller)
// Tout passe par les handlers fournis (qui persistent en base + temps réel).
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CONDITIONS,
  CONDITIONS_MAP,
  isConditionKey,
  isEpuisementKey,
  epuisementNiveau,
  EPUISEMENT_KEYS
} from '@/app/data/conditions'
import AttackRoller, { type AttaqueData, type CibleData } from '@/app/components/AttackRoller'
import CombatCarte, { type Jeton, type FogState, fogVide, FOG_COLS, FOG_ROWS } from '@/app/components/presentation/CombatCarte'
import JetGroupeModal from '@/app/components/combat/JetGroupeModal'
import HistoriqueCombat from '@/app/components/combat/HistoriqueCombat'
import type { CombatLite, Persona, Ennemi, InitiativeEntry } from '@/app/dashboard/presentation/page'

function entiteId(e: InitiativeEntry | null | undefined): string | null {
  if (!e) return null
  return e.ref_id ?? e.id ?? (e.piece_id ? e.piece_id.replace(/^(perso|ennemi)-/, '') : null)
}

type Combattant = (Persona | Ennemi) & { _kind: 'perso' | 'ennemi' }

// Petit éditeur de PV : −/+ rapides + champ custom (dégâts / soin).
function HpControls({
  hp,
  hpMax,
  onDelta
}: {
  hp: number
  hpMax: number
  onDelta: (delta: number) => void
}) {
  const [custom, setCustom] = useState('')
  const appliquer = (signe: 1 | -1) => {
    const n = parseInt(custom, 10)
    if (!Number.isFinite(n) || n <= 0) return
    onDelta(signe * n)
    setCustom('')
  }
  const pct = hpMax > 0 ? Math.max(0, Math.min(100, Math.round((hp / hpMax) * 100))) : 0
  return (
    <div className="combatmj-hp">
      <div className="combatmj-hpbar">
        <span
          className={`combatmj-hpfill${pct <= 25 ? ' is-low' : ''}`}
          style={{ width: `${pct}%` }}
        />
        <span className="combatmj-hpval">
          {hp}/{hpMax}
        </span>
      </div>
      <div className="combatmj-hp-row">
        <button type="button" className="combatmj-mini" onClick={() => onDelta(-5)}>
          −5
        </button>
        <button type="button" className="combatmj-mini" onClick={() => onDelta(-1)}>
          −1
        </button>
        <button type="button" className="combatmj-mini" onClick={() => onDelta(1)}>
          +1
        </button>
        <button type="button" className="combatmj-mini" onClick={() => onDelta(5)}>
          +5
        </button>
        {/* V1 2.6 — remettre les PV au max. */}
        <button
          type="button"
          className="combatmj-mini is-heal"
          title="Remettre les PV au max"
          disabled={hp >= hpMax}
          onClick={() => onDelta(hpMax - hp)}
        >
          MAX
        </button>
        <input
          type="number"
          min={1}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="#"
          className="combatmj-hp-input"
          aria-label="Montant personnalisé"
        />
        <button
          type="button"
          className="combatmj-mini is-dmg"
          title="Appliquer des dégâts"
          onClick={() => appliquer(-1)}
        >
          💔
        </button>
        <button
          type="button"
          className="combatmj-mini is-heal"
          title="Soigner"
          onClick={() => appliquer(1)}
        >
          💚
        </button>
      </div>
    </div>
  )
}

// Pastilles de conditions + sélecteur (ajout/retrait) + tout retirer.
function ConditionsEditor({
  conditions,
  onToggle,
  onClear
}: {
  conditions: string[]
  onToggle: (key: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  // V1 2.3 — ferme le menu de conditions au clic en dehors.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  // Niveau d'épuisement actuellement actif (0 = aucun).
  const niveauEpuisement = conditions.reduce(
    (max, c) => Math.max(max, epuisementNiveau(c)),
    0
  )
  // Sélection d'un niveau d'épuisement : retire l'éventuel niveau précédent et
  // applique le nouveau (ou retire si on reclique le niveau actif).
  const setEpuisement = (niveau: number) => {
    const cible = `epuisement_${niveau}`
    conditions.filter(isEpuisementKey).forEach((c) => {
      if (c !== cible) onToggle(c)
    })
    onToggle(cible)
  }
  return (
    <div className="combatmj-cond" ref={rootRef}>
      <div className="combatmj-cond-pills">
        {conditions.map((c) => {
          const cond = isConditionKey(c) ? CONDITIONS_MAP[c] : null
          return (
            <button
              key={c}
              type="button"
              className="combatmj-cond-pill"
              title={`Retirer : ${cond?.nom ?? c}`}
              onClick={() => onToggle(c)}
            >
              <span aria-hidden>{cond?.icone ?? '•'}</span>
              <span>{cond?.nom ?? c}</span>
              <span aria-hidden>×</span>
            </button>
          )
        })}
        <button
          type="button"
          className="combatmj-cond-add"
          onClick={() => setOpen((o) => !o)}
        >
          + Condition
        </button>
        {conditions.length > 0 && (
          <button
            type="button"
            className="combatmj-cond-clear"
            title="Retirer toutes les conditions"
            onClick={onClear}
          >
            🗑️
          </button>
        )}
      </div>
      {open && (
        <div className="combatmj-cond-menu">
          {CONDITIONS.filter((c) => !isEpuisementKey(c.key)).map((cond) => {
            const actif = conditions.includes(cond.key)
            return (
              <button
                key={cond.key}
                type="button"
                className={`combatmj-cond-opt${actif ? ' is-on' : ''}`}
                onClick={() => onToggle(cond.key)}
                title={cond.description}
              >
                <span aria-hidden>{cond.icone}</span>
                <span>{cond.nom}</span>
              </button>
            )
          })}
          {/* Épuisement : sélecteur de niveau unique (1-6). */}
          <div
            className="combatmj-cond-epuisement"
            title={CONDITIONS_MAP[EPUISEMENT_KEYS[Math.max(0, niveauEpuisement - 1)]]?.description}
          >
            <span aria-hidden>🥵</span>
            <span>Épuisement</span>
            <span className="combatmj-cond-epuisement-niv">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`combatmj-cond-niv${niveauEpuisement === n ? ' is-on' : ''}`}
                  onClick={() => setEpuisement(n)}
                  title={`Niveau ${n} : ${CONDITIONS_MAP[`epuisement_${n}` as keyof typeof CONDITIONS_MAP]?.effets.join(' · ')}`}
                >
                  {n}
                </button>
              ))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CombatCockpitMJ({
  combat,
  personnages,
  ennemis,
  onModifierHp,
  onToggleCondition,
  onClearConditions,
  onTourSuivant,
  onTourPrecedent,
  onTerminer,
  onLancer,
  onMoveJeton,
  onToggleCarteVisible,
  onFogChange,
  carteBackground,
  onTogglePause,
  enPause
}: {
  combat: CombatLite | null
  personnages: Persona[]
  ennemis: Ennemi[]
  onModifierHp: (kind: 'perso' | 'ennemi', id: string, delta: number) => void
  onToggleCondition: (kind: 'perso' | 'ennemi', id: string, key: string) => void
  onClearConditions: (kind: 'perso' | 'ennemi', id: string) => void
  onTourSuivant: () => void
  onTourPrecedent: () => void
  onTerminer: () => void
  onLancer: () => void
  onMoveJeton: (pieceId: string, x: number, y: number) => void
  onToggleCarteVisible: () => void
  // V1 1.2 — mise à jour du brouillard de guerre
  onFogChange?: (fog: FogState) => void
  carteBackground?: string | null
  // Optionnel : pause/reprise du combat (Phase 4.3).
  onTogglePause?: () => void
  enPause?: boolean
}) {
  const actif = !!combat?.actif
  const ordre = combat?.ordre_initiative ?? []
  const tourId = entiteId(ordre[combat?.tour_actuel ?? 0])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Cibles PJ pour l'auto-roll d'attaque ennemie.
  const ciblesPj: CibleData[] = useMemo(
    () =>
      personnages.map((p) => ({
        id: p.id,
        nom: p.nom,
        ca: typeof p.ca === 'number' ? p.ca : 10,
        hp_actuel: p.hp_actuel
      })),
    [personnages]
  )

  // Ennemi dont on lance les attaques (ouvre AttackRoller).
  const [attaquant, setAttaquant] = useState<{ nom: string; attaques: AttaqueData[] } | null>(null)

  // V1 1.1 — Jet groupé (multi-cibles). Les caractéristiques (FOR/DEX/CON/INT/
  // SAG/CHA) sont désormais chargées avec les participants : on calcule le
  // modificateur D&D (carac - 10) / 2 (arrondi vers le bas) pour chaque
  // combattant, appliqué automatiquement au jet selon la caractéristique choisie.
  const [jetGroupeOuvert, setJetGroupeOuvert] = useState(false)
  const combatantsJet = useMemo(() => {
    const mod = (v: number | null | undefined) =>
      typeof v === 'number' ? Math.floor((v - 10) / 2) : 0
    const mods = (c: {
      force?: number | null
      dexterite?: number | null
      constitution?: number | null
      intelligence?: number | null
      sagesse?: number | null
      charisme?: number | null
    }) => ({
      FOR: mod(c.force),
      DEX: mod(c.dexterite),
      CON: mod(c.constitution),
      INT: mod(c.intelligence),
      SAG: mod(c.sagesse),
      CHA: mod(c.charisme)
    })
    // Bonus de maîtrise D&D dérivé du niveau : 2 + (niveau - 1) / 4.
    const pbNiveau = (niv: number) => 2 + Math.floor((Math.max(1, niv) - 1) / 4)
    // Caractéristiques de sauvegarde maîtrisées (clé longue → clé courte).
    const savesCourts = (m?: Record<string, boolean> | null) => ({
      FOR: !!m?.force,
      DEX: !!m?.dexterite,
      CON: !!m?.constitution,
      INT: !!m?.intelligence,
      SAG: !!m?.sagesse,
      CHA: !!m?.charisme
    })
    return [
      ...personnages.map((p) => ({
        id: p.id,
        nom: p.nom,
        kind: 'perso' as const,
        mods: mods(p),
        pb: pbNiveau(p.niveau ?? 1),
        saves: savesCourts(p.saves_maitrises)
      })),
      ...ennemis.map((e) => ({
        id: e.id,
        nom: e.nom,
        kind: 'ennemi' as const,
        mods: mods(e)
      }))
    ]
  }, [personnages, ennemis])

  // Carte tactique : jetons PJ + ennemis. Section repliable.
  const [carteOuverte, setCarteOuverte] = useState(false)
  // V1 1.2 — Brouillard de guerre : mode pinceau, taille, et sens (masquer/révéler).
  const [fogActif, setFogActif] = useState(false)
  const [fogBrush, setFogBrush] = useState(1)
  const [fogMode, setFogMode] = useState<'hide' | 'reveal'>('hide')
  // fog peut valoir {} (défaut DB) → on retombe sur une grille vide.
  const fogCourant: FogState = combat?.fog?.cols ? (combat.fog as FogState) : fogVide()
  const jetons: Jeton[] = useMemo(
    () => [
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
        nom: e.nom,
        kind: 'ennemi' as const,
        image_url: e.image_url
      }))
    ],
    [personnages, ennemis]
  )

  // --- Combat non lancé : CTA ---
  if (!actif) {
    return (
      <div className="combatmj-root">
        <div className="combatmj-startbox">
          <p className="combatmj-start-titre">Aucun combat en cours</p>
          <p className="combatmj-start-sub">
            {personnages.length + ennemis.length} participant
            {personnages.length + ennemis.length > 1 ? 's' : ''} prêt
            {personnages.length + ennemis.length > 1 ? 's' : ''} ({personnages.length} PJ ·{' '}
            {ennemis.length} ennemis). L&apos;initiative sera tirée automatiquement.
          </p>
          <button type="button" className="combatmj-start-btn" onClick={onLancer}>
            ⚔️ Lancer un combat
          </button>
          <p className="combatmj-start-hint">
            Pour un réglage fin de l&apos;initiative, des sorts et de la grille,
            la page Combat dédiée reste disponible.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="combatmj-root">
      {/* 1.1 — Timeline d'initiative */}
      <div className="combatmj-timeline-wrap">
        <span className="combatmj-round">Round {combat?.round ?? 1}</span>
        <div className="combatmj-timeline" role="list">
          {ordre.map((e, i) => {
            const id = entiteId(e)
            const courant = i === (combat?.tour_actuel ?? 0)
            const joue = i < (combat?.tour_actuel ?? 0)
            return (
              <div className="combatmj-timeline-cell" key={e.piece_id ?? `${e.nom}-${i}`}>
                <button
                  type="button"
                  role="listitem"
                  onClick={() => setSelectedId(id)}
                  className={`combatmj-init${courant ? ' is-current' : ''}${
                    joue ? ' is-done' : ''
                  }${e.kind === 'ennemi' ? ' is-enemy' : ''}`}
                  title={`${e.nom}${typeof e.init === 'number' ? ` — init ${e.init}` : ''}`}
                >
                  {e.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.image_url} alt="" className="combatmj-init-img" loading="lazy" decoding="async" />
                  ) : (
                    <span className="combatmj-init-emoji">{e.kind === 'ennemi' ? '👹' : '🛡'}</span>
                  )}
                  <span className="combatmj-init-nom">{e.nom}</span>
                  {joue && <span className="combatmj-init-check">✓</span>}
                </button>
                {i < ordre.length - 1 && <span className="combatmj-chevron">›</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* 1.5 — Barre d'actions rapide */}
      <div className="combatmj-actions">
        <button type="button" className="presentation-action-btn" onClick={onTourPrecedent}>
          ⏮ Précédent
        </button>
        <button type="button" className="presentation-action-btn is-on" onClick={onTourSuivant}>
          ⏭️ Tour suivant
        </button>
        {onTogglePause && (
          <button
            type="button"
            className={`presentation-action-btn${enPause ? ' is-on' : ''}`}
            onClick={onTogglePause}
          >
            {enPause ? '▶ Reprendre' : '⏸ Pause'}
          </button>
        )}
        <button
          type="button"
          className="presentation-action-btn"
          onClick={() => setJetGroupeOuvert(true)}
          disabled={combatantsJet.length === 0}
          title="Lancer un jet de sauvegarde / caractéristique pour plusieurs participants"
        >
          🎲 Jet groupé
        </button>
        <button
          type="button"
          className="presentation-action-btn"
          onClick={onTerminer}
          style={{ marginLeft: 'auto' }}
        >
          🏁 Terminer le combat
        </button>
      </div>

      <div className="combatmj-cols">
        {/* 1.2 — Alliés */}
        <section className="combatmj-panel">
          <h4 className="combatmj-panel-title">🛡 Alliés</h4>
          {personnages.length === 0 && <p className="combatmj-empty">Aucun PJ.</p>}
          {personnages.map((p) => (
            <CarteCombattant
              key={p.id}
              c={{ ...p, _kind: 'perso' }}
              estTour={tourId === p.id}
              selectionne={selectedId === p.id}
              onModifierHp={(d) => onModifierHp('perso', p.id, d)}
              onToggleCondition={(k) => onToggleCondition('perso', p.id, k)}
              onClearConditions={() => onClearConditions('perso', p.id)}
            />
          ))}
        </section>

        {/* 1.3 — Ennemis */}
        <section className="combatmj-panel">
          <h4 className="combatmj-panel-title">👹 Ennemis</h4>
          {ennemis.length === 0 && <p className="combatmj-empty">Aucun ennemi.</p>}
          {ennemis.map((e) => (
            <CarteCombattant
              key={e.id}
              c={{ ...e, _kind: 'ennemi' }}
              estTour={tourId === e.id}
              selectionne={selectedId === e.id}
              onModifierHp={(d) => onModifierHp('ennemi', e.id, d)}
              onToggleCondition={(k) => onToggleCondition('ennemi', e.id, k)}
              onClearConditions={() => onClearConditions('ennemi', e.id)}
              onLancerAttaques={
                Array.isArray(e.attaques) && e.attaques.length > 0
                  ? () => setAttaquant({ nom: e.nom, attaques: e.attaques as AttaqueData[] })
                  : undefined
              }
            />
          ))}
        </section>
      </div>

      {/* Phase 3 — Carte tactique (repliable) */}
      <div className="combatmj-carte-section">
        <div className="combatmj-carte-head">
          <button
            type="button"
            className="combatmj-carte-toggle"
            onClick={() => setCarteOuverte((o) => !o)}
          >
            {carteOuverte ? '▾' : '▸'} 🗺️ Carte tactique
          </button>
          {carteOuverte && (
            <label className="combatmj-carte-switch">
              <input
                type="checkbox"
                checked={!!combat?.carte_visible_joueurs}
                onChange={onToggleCarteVisible}
              />
              Afficher aux joueurs
            </label>
          )}
        </div>
        {carteOuverte && (
          <>
            {/* V1 1.2 — Contrôles du brouillard de guerre */}
            {onFogChange && (
              <div className="combatmj-fog-controls">
                <button
                  type="button"
                  className={`combatmj-fog-btn${fogActif ? ' is-on' : ''}`}
                  onClick={() => setFogActif((v) => !v)}
                  title="Activer le pinceau de brouillard (désactive le déplacement des jetons)"
                >
                  🌫️ Brouillard
                </button>
                {fogActif && (
                  <>
                    <div className="combatmj-fog-seg">
                      <button type="button" className={`combatmj-fog-seg-btn${fogMode === 'hide' ? ' is-on' : ''}`} onClick={() => setFogMode('hide')}>Masquer</button>
                      <button type="button" className={`combatmj-fog-seg-btn${fogMode === 'reveal' ? ' is-on' : ''}`} onClick={() => setFogMode('reveal')}>Révéler</button>
                    </div>
                    <div className="combatmj-fog-seg" title="Taille du pinceau">
                      <button type="button" className={`combatmj-fog-seg-btn${fogBrush === 0 ? ' is-on' : ''}`} onClick={() => setFogBrush(0)}>S</button>
                      <button type="button" className={`combatmj-fog-seg-btn${fogBrush === 1 ? ' is-on' : ''}`} onClick={() => setFogBrush(1)}>M</button>
                      <button type="button" className={`combatmj-fog-seg-btn${fogBrush === 2 ? ' is-on' : ''}`} onClick={() => setFogBrush(2)}>L</button>
                    </div>
                    <button
                      type="button"
                      className="combatmj-fog-btn"
                      onClick={() => onFogChange({ cols: FOG_COLS, rows: FOG_ROWS, hidden: [] })}
                    >
                      Tout révéler
                    </button>
                    <button
                      type="button"
                      className="combatmj-fog-btn"
                      onClick={() =>
                        onFogChange({
                          cols: FOG_COLS,
                          rows: FOG_ROWS,
                          hidden: Array.from({ length: FOG_COLS * FOG_ROWS }, (_, i) => i)
                        })
                      }
                    >
                      Tout masquer
                    </button>
                  </>
                )}
              </div>
            )}
            <CombatCarte
              jetons={jetons}
              positions={combat?.positions ?? {}}
              backgroundUrl={carteBackground ?? null}
              editable={!fogActif}
              onMove={onMoveJeton}
              fog={fogCourant}
              fogEditable={fogActif}
              brushSize={fogBrush}
              fogMode={fogMode}
              onFogChange={onFogChange}
            />
            <p className="combatmj-carte-hint">
              {fogActif
                ? 'Mode brouillard : peins sur la carte pour masquer/révéler. Désactive « Brouillard » pour redéplacer les jetons.'
                : 'Glisse les jetons pour les positionner.'}{' '}
              {combat?.carte_visible_joueurs
                ? 'La carte est visible par les joueurs.'
                : 'La carte reste privée (MJ) tant que « Afficher aux joueurs » est décoché.'}
            </p>
          </>
        )}
      </div>

      {/* 1.6 — Auto-roll des attaques de l'ennemi sélectionné */}
      <AttackRoller
        open={!!attaquant}
        onClose={() => setAttaquant(null)}
        attaques={attaquant?.attaques ?? []}
        cibles={ciblesPj}
        attaquantNom={attaquant?.nom}
        onApplyDamage={(cibleId, degats) => onModifierHp('perso', cibleId, -degats)}
      />

      {/* 2.9 — Jet groupé multi-cibles */}
      <JetGroupeModal
        open={jetGroupeOuvert}
        onClose={() => setJetGroupeOuvert(false)}
        combatants={combatantsJet}
      />

      {/* 2.9 — Historique du combat (panneau dépliable) */}
      {combat?.id && <HistoriqueCombat combatId={combat.id} />}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Carte d'un combattant (PJ ou ennemi) avec toutes les infos MJ.
// ----------------------------------------------------------------------------
function CarteCombattant({
  c,
  estTour,
  selectionne,
  onModifierHp,
  onToggleCondition,
  onClearConditions,
  onLancerAttaques
}: {
  c: Combattant
  estTour: boolean
  selectionne: boolean
  onModifierHp: (delta: number) => void
  onToggleCondition: (key: string) => void
  onClearConditions: () => void
  onLancerAttaques?: () => void
}) {
  const ennemi = c._kind === 'ennemi'
  const e = c as Ennemi
  const conditions = Array.isArray(c.conditions) ? c.conditions : []
  // CA : `ca` pour les PJ, `armure` pour les ennemis.
  const ca = ennemi
    ? typeof e.armure === 'number'
      ? e.armure
      : null
    : typeof (c as Persona).ca === 'number'
    ? (c as Persona).ca!
    : null
  const resistances = ennemi && Array.isArray(e.resistances) ? e.resistances : []
  const immunites = ennemi && Array.isArray(e.immunites) ? e.immunites : []
  const vulnerabilites = ennemi && Array.isArray(e.vulnerabilites) ? e.vulnerabilites : []
  const attaques = ennemi && Array.isArray(e.attaques) ? e.attaques : []

  return (
    <div
      className={`combatmj-card${estTour ? ' is-turn' : ''}${selectionne ? ' is-selected' : ''}${
        c.hp_actuel <= 0 ? ' is-ko' : ''
      }`}
    >
      <div className="combatmj-card-head">
        {c.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.image_url} alt="" className="combatmj-card-img" loading="lazy" decoding="async" />
        ) : (
          <span className="combatmj-card-emoji">{ennemi ? '👹' : '🛡'}</span>
        )}
        <div className="combatmj-card-id">
          <span className="combatmj-card-nom">{c.nom}</span>
          <span className="combatmj-card-meta">
            {!ennemi && (c as Persona).classe ? `${(c as Persona).classe} · ` : ''}
            {ca !== null && <span className="combatmj-ca">🛡 CA {ca}</span>}
          </span>
        </div>
      </div>

      <HpControls hp={c.hp_actuel} hpMax={c.hp_max} onDelta={onModifierHp} />

      {/* Attaques + lance-attaque (ennemis) */}
      {ennemi && attaques.length > 0 && (
        <div className="combatmj-attaques">
          {attaques.map((a, i) => (
            <span key={i} className="combatmj-attaque" title={a.type_degats ?? undefined}>
              {a.nom} : att +{a.bonus_attaque}, {a.degats}
              {a.nb && a.nb > 1 ? ` ×${a.nb}` : ''}
            </span>
          ))}
          {onLancerAttaques && (
            <button type="button" className="combatmj-roll-btn" onClick={onLancerAttaques}>
              🎲 Lancer l&apos;attaque
            </button>
          )}
        </div>
      )}

      {/* Résistances / immunités / vulnérabilités (ennemis) */}
      {ennemi && (resistances.length > 0 || immunites.length > 0 || vulnerabilites.length > 0) && (
        <div className="combatmj-defenses">
          {resistances.length > 0 && (
            <span className="combatmj-def is-res">🛡 résiste : {resistances.join(', ')}</span>
          )}
          {immunites.length > 0 && (
            <span className="combatmj-def is-imm">⛔ immunisé : {immunites.join(', ')}</span>
          )}
          {vulnerabilites.length > 0 && (
            <span className="combatmj-def is-vuln">💥 vulnérable : {vulnerabilites.join(', ')}</span>
          )}
        </div>
      )}

      {/* Tactique / prochaine action prévue (ennemis) */}
      {ennemi && e.comportement_tactique && (
        <p className="combatmj-tactique">🧠 {e.comportement_tactique}</p>
      )}

      {/* 1.4 — Conditions */}
      <ConditionsEditor
        conditions={conditions}
        onToggle={onToggleCondition}
        onClear={onClearConditions}
      />
    </div>
  )
}
