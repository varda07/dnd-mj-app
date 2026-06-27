'use client'

import { useState, useEffect, useRef, CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import type { DiceBoxHandle } from './Dice3DBoxScene'
import {
  playSound,
  getSoundsEnabled,
  setSoundsEnabled,
  getVolume,
  setVolume,
  getUrl,
  setUrl,
  resetUrl,
  SOUND_DEFAULT_URLS,
  type SoundKey
} from '@/app/lib/dice-sounds'
import { unlockAchievement, incrementCounter } from '@/app/lib/achievements'

// @3d-dice/dice-box est strictement client-side (Babylon.js + AmmoJS via
// web worker). On charge le wrapper dynamiquement, ssr désactivé.
const Dice3DBoxScene = dynamic(() => import('./Dice3DBoxScene'), { ssr: false })

// ---------------------------------------------------------------------------
// Silhouettes SVG des dés. Utilisées pour le sélecteur de type (icônes nettes
// et lisibles à 22 px) ET pour le mode fallback si le moteur 3D plante.
// ---------------------------------------------------------------------------
const DIE_SHAPES: Record<string, string> = {
  d4: '50,8 92,86 8,86',
  d6: '15,15 85,15 85,85 15,85',
  d8: '50,5 92,50 50,95 8,50',
  d10: '50,5 90,38 78,90 22,90 10,38',
  d12: '50,5 92,38 76,92 24,92 8,38',
  d20: '50,5 88,28 88,72 50,95 12,72 12,28'
}

function DieSilhouetteIcon({
  type,
  size = 22,
  highlight = false
}: {
  type: string
  size?: number
  highlight?: boolean
}) {
  const points = DIE_SHAPES[type] ?? DIE_SHAPES.d6
  // Identifiant stable basé sur (type+highlight) — évite les collisions quand
  // plusieurs icônes coexistent sans nécessiter useId.
  const gradId = `die-grad-${type}-${highlight ? 'on' : 'off'}`
  const stops = highlight
    ? ['#fef08a', '#C9A84C', '#8B7333']
    : ['#9ca3af', '#6b7280', '#4b5563']
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="55%" stopColor={stops[1]} />
          <stop offset="100%" stopColor={stops[2]} />
        </linearGradient>
      </defs>
      <polygon
        points={points}
        fill={`url(#${gradId})`}
        stroke="rgba(0,0,0,0.45)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// DiceArt2D : SVG stylisé qui représente le dé avec un faux relief 3D
// (gradient + facettes intérieures + drop-shadow). Pas de WebGL, pas de
// CSS 3D — uniquement DOM + SVG. Anime le numéro pendant le roll pour
// donner l'illusion du dé qui tournoie.
// ---------------------------------------------------------------------------

// Palette neutre (or) et palettes critiques (succès / échec) — appliquées
// via les linearGradients du SVG.
type DicePalette = {
  light: string
  mid: string
  dark: string
  accent: string
}

const PALETTE_GOLD: DicePalette = {
  light: '#fef08a',
  mid: '#C9A84C',
  dark: '#8B7333',
  accent: '#fef9c3'
}
const PALETTE_CRIT_SUCCESS: DicePalette = {
  light: '#fef9c3',
  mid: '#facc15',
  dark: '#a16207',
  accent: '#ffffff'
}
const PALETTE_CRIT_FAIL: DicePalette = {
  light: '#fecaca',
  mid: '#dc2626',
  dark: '#7f1d1d',
  accent: '#fff5f5'
}

// Pour chaque type de dé, on définit :
// - outline : la silhouette principale du polygone
// - facets : un tableau de sous-polygones avec un coefficient d'ombrage
//   (1 = clair, 0 = sombre) qui crée l'illusion 3D des faces visibles
// - numAnchor : où centrer le numéro (souvent (50, 60-65) pour un meilleur
//   alignement visuel selon la forme)
type FacetDef = { points: string; shade: number }
type DiceArtDef = {
  outline: string
  facets: FacetDef[]
  numAnchor: { x: number; y: number }
  numScale: number // facteur de taille du chiffre (relatif)
}

const DICE_ART: Record<string, DiceArtDef> = {
  // D4 — triangle équilatéral, 3 sous-triangles depuis le centroïde.
  d4: {
    outline: '50,8 92,86 8,86',
    numAnchor: { x: 50, y: 68 },
    numScale: 0.42,
    facets: [
      { points: '50,8 50,60 8,86', shade: 0.85 },   // gauche
      { points: '50,8 92,86 50,60', shade: 1.0 },   // droite
      { points: '8,86 50,60 92,86', shade: 0.55 }   // bas
    ]
  },
  // D6 — silhouette hexagonale d'un cube en projection iso : top / left / right.
  d6: {
    outline: '50,10 85,30 85,70 50,90 15,70 15,30',
    numAnchor: { x: 50, y: 60 },
    numScale: 0.36,
    facets: [
      { points: '50,10 85,30 50,50 15,30', shade: 1.05 }, // top (le plus clair)
      { points: '15,30 50,50 50,90 15,70', shade: 0.85 }, // left
      { points: '85,30 50,50 50,90 85,70', shade: 0.55 }  // right (le plus sombre)
    ]
  },
  // D8 — losange vertical, 4 sous-triangles depuis le centre.
  d8: {
    outline: '50,5 92,50 50,95 8,50',
    numAnchor: { x: 50, y: 56 },
    numScale: 0.4,
    facets: [
      { points: '50,5 92,50 50,50', shade: 1.0 },   // top-right (clair)
      { points: '50,5 50,50 8,50', shade: 0.85 },   // top-left
      { points: '8,50 50,50 50,95', shade: 0.6 },   // bottom-left
      { points: '50,50 92,50 50,95', shade: 0.45 }  // bottom-right (sombre)
    ]
  },
  // D10 — pentagone allongé, 5 facettes en triangles autour du sommet.
  d10: {
    outline: '50,5 90,38 78,90 22,90 10,38',
    numAnchor: { x: 50, y: 60 },
    numScale: 0.36,
    facets: [
      { points: '50,5 90,38 50,55', shade: 1.0 },   // haut-droite
      { points: '50,5 50,55 10,38', shade: 0.85 },  // haut-gauche
      { points: '10,38 50,55 22,90', shade: 0.6 },  // bas-gauche
      { points: '22,90 50,55 78,90', shade: 0.45 }, // bas (sombre)
      { points: '78,90 50,55 90,38', shade: 0.7 }   // bas-droite
    ]
  },
  // D12 — pentagone régulier avec un pentagone intérieur + 5 trapèzes
  // périphériques pour faux relief.
  d12: {
    outline: '50,5 92,38 76,92 24,92 8,38',
    numAnchor: { x: 50, y: 60 },
    numScale: 0.36,
    facets: [
      // Pentagone central (clair)
      { points: '50,32 70,46 62,70 38,70 30,46', shade: 1.05 },
      // 5 trapèzes périphériques, ombrage variable pour l'effet 3D
      { points: '50,5 92,38 70,46 50,32', shade: 0.85 },
      { points: '92,38 76,92 62,70 70,46', shade: 0.65 },
      { points: '76,92 24,92 38,70 62,70', shade: 0.5 },
      { points: '24,92 8,38 30,46 38,70', shade: 0.7 },
      { points: '8,38 50,5 50,32 30,46', shade: 0.95 }
    ]
  },
  // D20 — hexagone pour silhouette d'icosaèdre, triangle central + 6
  // triangles autour pour évoquer l'icosaèdre vu de face.
  d20: {
    outline: '50,5 88,28 88,72 50,95 12,72 12,28',
    numAnchor: { x: 50, y: 56 },
    numScale: 0.32,
    facets: [
      // Triangle central (face avant de l'icosaèdre, le plus clair)
      { points: '50,30 75,55 25,55', shade: 1.1 },
      // 6 triangles autour
      { points: '50,5 88,28 75,55 50,30', shade: 0.9 },
      { points: '88,28 88,72 75,55', shade: 0.55 },
      { points: '88,72 50,95 75,55', shade: 0.45 },
      { points: '50,95 12,72 25,55 75,55', shade: 0.5 },
      { points: '12,72 12,28 25,55', shade: 0.65 },
      { points: '12,28 50,5 50,30 25,55', shade: 0.85 }
    ]
  }
}

function paletteFor(value: number | undefined, sides: number): DicePalette {
  if (value === 1) return PALETTE_CRIT_FAIL
  if (sides === 20 && value === 20) return PALETTE_CRIT_SUCCESS
  return PALETTE_GOLD
}

// Mélange un hex vers blanc/noir selon shade (>1 vers blanc, <1 vers noir).
// shade=1 retourne la couleur de base.
function shadeColor(hex: string, factor: number): string {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return hex
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  const mix = (c: number) =>
    factor > 1
      ? Math.round(c + (255 - c) * (factor - 1))
      : Math.round(c * factor)
  const clamp = (n: number) => Math.max(0, Math.min(255, n))
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0')
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}

function DiceArt2D({
  type,
  sides,
  size,
  value,
  rolling,
  delay = 0
}: {
  type: string
  sides: number
  size: number
  value?: number
  rolling: boolean
  delay?: number
}) {
  const art = DICE_ART[type] ?? DICE_ART.d6
  const palette = paletteFor(value, sides)

  // Pendant le roll, on cycle un numéro aléatoire toutes les 80 ms : ça donne
  // l'illusion que le dé "roule" et change de face. Quand le roll s'arrête,
  // on affiche la valeur finale.
  const [displayValue, setDisplayValue] = useState<number | null>(null)
  useEffect(() => {
    if (!rolling) {
      setDisplayValue(value ?? null)
      return
    }
    setDisplayValue(Math.floor(Math.random() * sides) + 1)
    const id = window.setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * sides) + 1)
    }, 80)
    return () => window.clearInterval(id)
  }, [rolling, value, sides])

  // Identifiants stables pour les gradients SVG. Inclure delay évite les
  // collisions quand plusieurs dés du même type coexistent.
  const uid = `${type}-${delay}`
  const idMain = `dice-grad-main-${uid}`
  const idShine = `dice-shine-${uid}`

  // Critique : drop-shadow plus marqué.
  const isCritS = sides === 20 && value === 20
  const isCritF = value === 1
  const dropShadow = isCritS
    ? 'drop-shadow(0 0 16px rgba(254,240,138,0.85)) drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
    : isCritF
      ? 'drop-shadow(0 0 16px rgba(220,38,38,0.85)) drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
      : 'drop-shadow(0 4px 10px rgba(0,0,0,0.55)) drop-shadow(0 0 4px rgba(201,168,76,0.3))'

  const wrapperStyle: CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    display: 'inline-block',
    filter: dropShadow,
    animationName: rolling ? 'dice-rolling-shake' : 'dice-idle-wobble',
    animationDuration: rolling ? '0.55s' : '4.5s',
    animationTimingFunction: rolling ? 'linear' : 'ease-in-out',
    animationIterationCount: 'infinite',
    animationFillMode: 'both',
    animationDelay: `${delay}ms`
  }

  return (
    <div style={wrapperStyle}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          {/* Gradient principal : éclairage diagonal pour faux relief 3D */}
          <linearGradient id={idMain} x1="0" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor={palette.light} />
            <stop offset="50%" stopColor={palette.mid} />
            <stop offset="100%" stopColor={palette.dark} />
          </linearGradient>
          {/* Reflet brillant en haut à gauche */}
          <radialGradient id={idShine} cx="0.3" cy="0.25" r="0.6">
            <stop offset="0%" stopColor={palette.accent} stopOpacity="0.6" />
            <stop offset="60%" stopColor={palette.accent} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outline + remplissage de base */}
        <polygon
          points={art.outline}
          fill={`url(#${idMain})`}
          stroke="rgba(0,0,0,0.55)"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />

        {/* Facettes intérieures pour l'illusion 3D — chaque sous-polygone
            reçoit une teinte dérivée de la couleur centrale du gradient. */}
        {art.facets.map((f, i) => (
          <polygon
            key={i}
            points={f.points}
            fill={shadeColor(palette.mid, f.shade)}
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="0.8"
            strokeLinejoin="round"
            opacity={0.92}
          />
        ))}

        {/* Reflet superposé pour insister sur le métal */}
        <polygon
          points={art.outline}
          fill={`url(#${idShine})`}
          stroke="none"
          pointerEvents="none"
        />

        {/* Outline final par-dessus, plus épais, pour un trait propre */}
        <polygon
          points={art.outline}
          fill="none"
          stroke="rgba(0,0,0,0.7)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Numéro résultat ou défilement pendant le roll */}
        {displayValue !== null && (
          <text
            x={art.numAnchor.x}
            y={art.numAnchor.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.round(100 * art.numScale)}
            fontWeight="900"
            fill={isCritF ? '#ffffff' : '#1a120a'}
            stroke={isCritF ? '#7f1d1d' : 'rgba(255,255,255,0.5)'}
            strokeWidth={isCritF ? 1.4 : 1.0}
            paintOrder="stroke fill"
            style={{
              fontFamily: 'var(--font-cinzel), Cinzel, serif',
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))'
            }}
          >
            {displayValue}
          </text>
        )}
      </svg>
    </div>
  )
}

type DiceType = { label: string; sides: number }

const DICE: DiceType[] = [
  { label: 'd4', sides: 4 },
  { label: 'd6', sides: 6 },
  { label: 'd8', sides: 8 },
  { label: 'd10', sides: 10 },
  { label: 'd12', sides: 12 },
  { label: 'd20', sides: 20 }
]

type RollMode = 'normal' | 'avantage' | 'desavantage'

type JetRow = {
  id: string
  type_de: string
  nombre: number
  resultats: number[]
  created_at: string
  mode?: RollMode | null
}

export default function DiceLauncher() {
  const [open, setOpen] = useState(false)
  const [shake, setShake] = useState(false)
  // Mode diffusion MJ : la roue d'action remplace ce FAB. On masque alors le
  // FAB classique (event `dice:fab-hidden`) pour ne jamais avoir deux boutons.
  const [fabHidden, setFabHidden] = useState(false)
  useEffect(() => {
    const onHidden = (e: Event) => {
      setFabHidden(!!(e as CustomEvent<boolean>).detail)
    }
    window.addEventListener('dice:fab-hidden', onHidden as EventListener)
    return () => window.removeEventListener('dice:fab-hidden', onHidden as EventListener)
  }, [])
  const [selectedDice, setSelectedDice] = useState<DiceType>(DICE[5])
  const [count, setCount] = useState(1)
  const [share, setShare] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [results, setResults] = useState<number[]>([])
  const [showParticles, setShowParticles] = useState(false)
  const [critEffect, setCritEffect] = useState<'success' | 'fail' | null>(null)
  const [activeTab, setActiveTab] = useState<'lancer' | 'historique' | 'params'>('lancer')
  // Settings audio — initialisé depuis localStorage côté client uniquement.
  const [soundsOn, setSoundsOn] = useState(true)
  const [volume, setVol] = useState(70)
  const [soundUrls, setSoundUrls] = useState<Record<SoundKey, string>>(SOUND_DEFAULT_URLS)
  useEffect(() => {
    setSoundsOn(getSoundsEnabled())
    setVol(getVolume())
    setSoundUrls({
      'dice-roll': getUrl('dice-roll'),
      'crit-success': getUrl('crit-success'),
      'crit-fail': getUrl('crit-fail')
    })
  }, [])
  // Avantage / désavantage — uniquement applicable au d20.
  const [advantage, setAdvantage] = useState(false)
  const [disadvantage, setDisadvantage] = useState(false)
  // Index du dé "retenu" pour le surbrillance dorée (advantage/disadvantage).
  const [keptIndex, setKeptIndex] = useState<number | null>(null)
  const [historique, setHistorique] = useState<JetRow[]>([])
  const [historiqueLoading, setHistoriqueLoading] = useState(false)
  // État du moteur 3D : 'init' (en chargement), 'ready' (utilisable),
  // 'failed' (on retombe sur DiceArt2D + jet random local).
  const [boxStatus, setBoxStatus] = useState<'init' | 'ready' | 'failed'>('init')
  const boxRef = useRef<DiceBoxHandle | null>(null)

  // Timeout de sécurité : si la lib ne signale pas onReady en 3 s, on
  // bascule en mode failed pour ne pas bloquer l'UI sur un canvas vide.
  useEffect(() => {
    if (!open || boxStatus !== 'init') return
    const id = window.setTimeout(() => {
      setBoxStatus((s) => {
        if (s === 'init') {
          console.warn(
            '[dice] init non terminée après 3 s — bascule sur le fallback SVG'
          )
          return 'failed'
        }
        return s
      })
    }, 3000)
    return () => window.clearTimeout(id)
  }, [open, boxStatus])

  // À l'ouverture du panneau on (re)passe en mode init pour que le box ait
  // une chance de se monter. À la fermeture, on remet à 'init' aussi pour
  // ne pas garder un statut périmé.
  useEffect(() => {
    if (!open) {
      setBoxStatus('init')
    }
  }, [open])

  const fetchHistorique = async () => {
    setHistoriqueLoading(true)
    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch (err) {
      console.warn('[dice] historique : getUser échec :', err)
    }
    if (!user) {
      setHistorique([])
      setHistoriqueLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('jets_de_des')
      .select('id, type_de, nombre, resultats, created_at, mode')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) {
      console.error('[dice] historique : select error :', error)
    } else {
    }
    setHistorique((data ?? []) as JetRow[])
    setHistoriqueLoading(false)
  }

  useEffect(() => {
    if (open && activeTab === 'historique') fetchHistorique()
  }, [open, activeTab])

  // Ouverture externe (CommandPalette → action "Lancer un d20").
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ dice?: string }>).detail
      if (detail?.dice) {
        const d = DICE.find((x) => x.label === detail.dice)
        if (d) setSelectedDice(d)
      }
      setOpen(true)
    }
    window.addEventListener('dice:open', onOpen)
    return () => window.removeEventListener('dice:open', onOpen)
  }, [])

  // Shake de l'écran entier pendant un échec critique
  useEffect(() => {
    if (critEffect !== 'fail') return
    document.body.classList.add('crit-body-shake')
    const t = setTimeout(() => document.body.classList.remove('crit-body-shake'), 500)
    return () => {
      clearTimeout(t)
      document.body.classList.remove('crit-body-shake')
    }
  }, [critEffect])

  // Mode effectif : si avantage ET désavantage cochés → ils s'annulent.
  const isD20 = selectedDice.sides === 20
  const rollMode: RollMode =
    !isD20 ? 'normal'
    : advantage && disadvantage ? 'normal'
    : advantage ? 'avantage'
    : disadvantage ? 'desavantage'
    : 'normal'

  const lancer = async () => {
    playSound('dice-roll')
    setRolling(true)
    setShowParticles(false)
    setResults([])
    setCritEffect(null)
    setKeptIndex(null)

    // Avantage/désavantage force le nombre à 2 sur d20.
    const effectiveCount = rollMode === 'normal' ? count : 2
    const notation = `${effectiveCount}${selectedDice.label}`
    let jets: number[] = []
    let usedBox = false
    if (boxStatus === 'ready' && boxRef.current?.ready) {
      try {
        jets = await boxRef.current.roll(notation)
        usedBox = jets.length === effectiveCount
        if (!usedBox) {
          console.warn('[dice-box] résultats incomplets, fallback random:', jets)
        }
      } catch (err) {
        console.error('[dice-box] roll a échoué, fallback random:', err)
      }
    }
    if (!usedBox) {
      // Fallback : timing visuel + tirage local (le composant DiceArt2D
      // anime alors le défilement de chiffres).
      await new Promise((r) => setTimeout(r, 1000))
      jets = Array.from(
        { length: effectiveCount },
        () => Math.floor(Math.random() * selectedDice.sides) + 1
      )
    }
    // Détermine l'index du dé retenu pour la surbrillance.
    if (rollMode === 'avantage') {
      const maxVal = Math.max(...jets)
      setKeptIndex(jets.indexOf(maxVal))
    } else if (rollMode === 'desavantage') {
      const minVal = Math.min(...jets)
      setKeptIndex(jets.indexOf(minVal))
    } else {
      setKeptIndex(null)
    }
    setResults(jets)
    setRolling(false)
    setShowParticles(true)
    setTimeout(() => setShowParticles(false), 1400)

    // Effet critique UNIQUEMENT sur d20.
    // En avantage/désavantage, seul le dé retenu compte pour le critique.
    if (selectedDice.sides === 20) {
      const valeursPourCrit =
        rollMode === 'normal'
          ? jets
          : [
              rollMode === 'avantage'
                ? Math.max(...jets)
                : Math.min(...jets)
            ]
      if (valeursPourCrit.includes(20)) {
        setCritEffect('success')
        playSound('crit-success')
        setTimeout(() => setCritEffect(null), 2000)
        // Roadmap Affinement 2.10 — achievement crit
        void unlockAchievement('premier_crit')
      } else if (valeursPourCrit.includes(1)) {
        setCritEffect('fail')
        playSound('crit-fail')
        setTimeout(() => setCritEffect(null), 2000)
        void unlockAchievement('premier_fumble')
      }
    }

    // Roadmap Affinement 2.10 — compteur de dés lancés
    for (let i = 0; i < jets.length; i++) {
      void incrementCounter('des_lances', 100, 'cent_des')
      void incrementCounter('des_lances_1000', 1000, 'mille_des')
    }
    // Premier dé
    void unlockAchievement('premier_de')

    // ---- Persistance Supabase ----
    let user: { id: string } | null = null
    try {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError) console.warn('[dice] getUser auth error:', authError)
      user = data.user
    } catch (err) {
      console.warn('[dice] getUser a planté (lock multi-onglet ?) :', err)
    }
    if (!user) {
      console.warn(
        '[dice] aucun user authentifié — jet non sauvegardé ; reconnecte-toi pour activer l’historique.'
      )
      return
    }
    const payload = {
      user_id: user.id,
      type_de: selectedDice.label,
      nombre: jets.length,
      // La colonne `resultats` est int[] dans la table existante. On envoie
      // les valeurs individuelles ; le total est recalculé à la lecture.
      // (Format JSON {total, dice} = nécessiterait une migration jsonb côté
      // BDD avant tout changement ici.)
      resultats: jets,
      partage: share,
      mode: rollMode
    }
    const { data: inserted, error } = await supabase
      .from('jets_de_des')
      .insert(payload)
      .select('id, type_de, nombre, resultats, created_at, mode')
      .single()
    if (error) {
      // Détail complet pour diagnostiquer une RLS / contrainte / colonne :
      console.error('[dice] save error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return
    }
    // Mise à jour optimiste — le nouveau jet apparaît instantanément dans
    // l'onglet Historique sans attendre le round-trip d'un re-fetch.
    if (inserted) {
      setHistorique((prev) => [inserted as JetRow, ...prev].slice(0, 20))
    }
    // Re-fetch en arrière-plan pour rester aligné avec la BDD (au cas où un
    // autre onglet aurait écrit aussi).
    fetchHistorique()
  }

  // En mode avantage/désavantage, le total = la valeur du dé retenu.
  // En mode normal, c'est la somme.
  const total =
    rollMode === 'normal' || keptIndex === null
      ? results.reduce((a, b) => a + b, 0)
      : results[keptIndex] ?? 0

  return (
    <>
      <style>{`
        /* Animation principale du roll : rotation rapide sur 3 axes. Tour
           complet sur ~1.1 s, infinie pendant la phase rolling. */
        /* Animation du roll : combinaison de rotation 2D + shake + scale
           pour donner l'impression que le dé bouge dans tous les sens. */
        @keyframes dice-rolling-shake {
          0%   { transform: rotate(0deg)   translate(0, 0)     scale(1);    }
          10%  { transform: rotate(72deg)  translate(-3px, 1px) scale(1.05); }
          25%  { transform: rotate(180deg) translate(2px, -2px) scale(0.95); }
          40%  { transform: rotate(252deg) translate(-2px, 2px) scale(1.05); }
          55%  { transform: rotate(324deg) translate(2px, -1px) scale(0.97); }
          70%  { transform: rotate(396deg) translate(-1px, 2px) scale(1.05); }
          85%  { transform: rotate(468deg) translate(2px, 0)    scale(0.96); }
          100% { transform: rotate(540deg) translate(0, 0)     scale(1);    }
        }
        /* Idle : balancement très léger pour garder le dé "vivant". */
        @keyframes dice-idle-wobble {
          0%, 100% { transform: rotate(0deg); }
          25%      { transform: rotate(2deg) translateY(-1px); }
          50%      { transform: rotate(0deg) translateY(0); }
          75%      { transform: rotate(-2deg) translateY(-1px); }
        }
        @keyframes particle-fly {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
        }
        .particle { animation: particle-fly 1.3s ease-out forwards; }
        @keyframes result-pop {
          0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(10deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .result-pop { animation: result-pop .5s cubic-bezier(.17,.67,.35,1.4) forwards; }

        /* ===== Effets CRITIQUE — réservés au d20 ===== */

        /* Flash plein écran — succès (or) */
        @keyframes crit-flash-gold {
          0%   { opacity: 0.85; }
          60%  { opacity: 0.25; }
          100% { opacity: 0; }
        }
        .crit-flash-gold {
          background:
            radial-gradient(circle at center, rgba(254,240,138,0.9) 0%, rgba(201,168,76,0.85) 35%, rgba(139,105,20,0.7) 70%, rgba(0,0,0,0) 100%);
          animation: crit-flash-gold 500ms ease-out forwards;
        }

        /* Flash plein écran — échec (rouge sang) */
        @keyframes crit-flash-red {
          0%   { opacity: 0.9; }
          60%  { opacity: 0.3; }
          100% { opacity: 0; }
        }
        .crit-flash-red {
          background:
            radial-gradient(circle at center, rgba(220,38,38,0.9) 0%, rgba(139,0,0,0.85) 40%, rgba(69,10,10,0.9) 80%, rgba(0,0,0,0.95) 100%);
          animation: crit-flash-red 500ms ease-out forwards;
        }

        /* Grand chiffre central — succès */
        @keyframes crit-number-gold {
          0%   { transform: translate(-50%, -50%) scale(0) rotate(-20deg); opacity: 0; filter: blur(8px); }
          20%  { transform: translate(-50%, -50%) scale(1.4) rotate(8deg); opacity: 1; filter: blur(0); }
          35%  { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
          80%  { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.15) rotate(0deg); opacity: 0; }
        }
        .crit-number-gold { animation: crit-number-gold 2s ease-out forwards; }

        /* Grand chiffre central — échec */
        @keyframes crit-number-red {
          0%   { transform: translate(-50%, -50%) scale(0) rotate(10deg); opacity: 0; filter: blur(6px); }
          20%  { transform: translate(-50%, -50%) scale(1.35) rotate(-4deg); opacity: 1; filter: blur(0); }
          35%  { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
          80%  { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.9) rotate(0deg); opacity: 0; }
        }
        .crit-number-red { animation: crit-number-red 2s ease-out forwards; }

        /* Texte CRITIQUE ! sous le chiffre — succès */
        @keyframes crit-text-gold {
          0%, 20%   { transform: translateX(-50%) scale(0); opacity: 0; }
          35%  { transform: translateX(-50%) scale(1.15); opacity: 1; }
          45%  { transform: translateX(-50%) scale(1); opacity: 1; }
          85%  { transform: translateX(-50%) scale(1); opacity: 1; }
          100% { transform: translateX(-50%) scale(0.95); opacity: 0; }
        }
        .crit-text-gold { animation: crit-text-gold 2s ease-out forwards; }

        /* Texte ÉCHEC CRITIQUE — animation glitch */
        @keyframes crit-text-glitch {
          0%, 20%   { transform: translateX(-50%) translate(0,0) skew(0); opacity: 0; }
          22%  { transform: translateX(-50%) translate(-4px,-2px) skew(-2deg); opacity: 1; }
          25%  { transform: translateX(-50%) translate(3px,1px) skew(2deg); opacity: 1; }
          28%  { transform: translateX(-50%) translate(-2px,2px) skew(0); opacity: 1; }
          32%  { transform: translateX(-50%) translate(1px,-1px) skew(1deg); opacity: 1; }
          36%  { transform: translateX(-50%) translate(0,0) skew(0); opacity: 1; }
          82%  { transform: translateX(-50%) translate(0,0) skew(0); opacity: 1; }
          86%  { transform: translateX(-50%) translate(-2px,1px) skew(-1deg); opacity: 1; }
          100% { transform: translateX(-50%) translate(0,0); opacity: 0; }
        }
        .crit-text-glitch { animation: crit-text-glitch 2s linear forwards; }

        /* Particules dorées explosant du centre */
        @keyframes crit-particle {
          0%   { transform: translate(-50%,-50%) scale(0.6); opacity: 1; }
          30%  { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0); opacity: 0; }
        }
        .crit-particle { animation: crit-particle 1.4s cubic-bezier(.2,.6,.3,1) forwards; }

        /* Gouttes de sang tombant du haut */
        @keyframes crit-blood-drop {
          0%   { transform: translateY(-60px) scaleY(0.3); opacity: 0; }
          15%  { opacity: 0.9; }
          100% { transform: translateY(110vh) scaleY(1.6); opacity: 0.7; }
        }
        .crit-blood-drop { animation: crit-blood-drop 1.7s cubic-bezier(.3,.2,.6,1) forwards; }

        /* Shake appliqué au body pendant un échec */
        @keyframes crit-shake {
          0%,100% { transform: translate(0,0); }
          10% { transform: translate(-5px, 2px); }
          20% { transform: translate(6px, -3px); }
          30% { transform: translate(-6px, 1px); }
          40% { transform: translate(5px, -2px); }
          50% { transform: translate(-4px, 3px); }
          60% { transform: translate(5px, 2px); }
          70% { transform: translate(-5px, -2px); }
          80% { transform: translate(4px, 3px); }
          90% { transform: translate(-2px, -4px); }
        }
        body.crit-body-shake { animation: crit-shake 500ms ease-in-out; }
      `}</style>

      {critEffect && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {/* Flash plein écran (500ms) */}
          <div
            className={
              critEffect === 'success'
                ? 'crit-flash-gold absolute inset-0'
                : 'crit-flash-red absolute inset-0'
            }
          />

          {/* Grand chiffre central (80px) */}
          <div
            className={
              critEffect === 'success' ? 'crit-number-gold' : 'crit-number-red'
            }
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              fontSize: 'min(200px, 45vw)',
              fontWeight: 900,
              lineHeight: 1,
              color: critEffect === 'success' ? '#C9A84C' : '#8B0000',
              textShadow:
                critEffect === 'success'
                  ? '0 0 40px rgba(201,168,76,0.95), 0 0 80px rgba(254,240,138,0.8), 0 0 120px rgba(201,168,76,0.6)'
                  : '0 0 40px rgba(139,0,0,0.95), 0 0 80px rgba(220,38,38,0.7), 0 0 120px rgba(69,10,10,0.5)',
              fontFamily: 'var(--font-cinzel), Cinzel, serif'
            }}
          >
            {critEffect === 'success' ? '20' : '1'}
          </div>

          {/* Texte sous le chiffre */}
          <div
            className={
              critEffect === 'success' ? 'crit-text-gold' : 'crit-text-glitch'
            }
            style={{
              position: 'absolute',
              top: 'calc(50% + min(130px, 28vw))',
              left: '50%',
              fontSize: 'clamp(20px, 5vw, 36px)',
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: critEffect === 'success' ? '#fef08a' : '#dc2626',
              textShadow:
                critEffect === 'success'
                  ? '0 0 16px rgba(201,168,76,0.9), 0 0 32px rgba(254,240,138,0.6)'
                  : '0 0 10px rgba(139,0,0,0.9), 0 0 24px rgba(220,38,38,0.6)',
              fontFamily: 'var(--font-cinzel), Cinzel, serif',
              whiteSpace: 'nowrap'
            }}
          >
            {critEffect === 'success' ? 'CRITIQUE !' : 'ÉCHEC CRITIQUE'}
          </div>

          {/* Particules dorées pour le succès (24 étoiles explosent du centre) */}
          {critEffect === 'success' &&
            Array.from({ length: 28 }).map((_, i) => {
              const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.3
              const distance = 180 + Math.random() * 220
              const dx = Math.cos(angle) * distance
              const dy = Math.sin(angle) * distance
              const size = 6 + Math.random() * 8
              const palette = ['#fde047', '#fef08a', '#C9A84C', '#ffffff', '#e0c470']
              const color = palette[i % palette.length]
              return (
                <span
                  key={i}
                  className="crit-particle"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px rgba(201,168,76,0.6)`,
                    animationDelay: `${100 + Math.random() * 150}ms`,
                    ['--dx' as string]: `${dx}px`,
                    ['--dy' as string]: `${dy}px`
                  } as CSSProperties}
                />
              )
            })}

          {/* Gouttes de sang pour l'échec (10 drops qui tombent du haut) */}
          {critEffect === 'fail' &&
            Array.from({ length: 12 }).map((_, i) => {
              const leftPct = Math.random() * 100
              const width = 4 + Math.random() * 5
              const height = 30 + Math.random() * 50
              const delay = Math.random() * 400
              return (
                <span
                  key={i}
                  className="crit-blood-drop"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `${leftPct}%`,
                    width: `${width}px`,
                    height: `${height}px`,
                    borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%',
                    background:
                      'linear-gradient(180deg, rgba(139,0,0,0.9) 0%, rgba(69,10,10,0.95) 60%, rgba(0,0,0,0.9) 100%)',
                    boxShadow: '0 0 6px rgba(139,0,0,0.8)',
                    animationDelay: `${delay}ms`
                  } as CSSProperties}
                />
              )
            })}
        </div>
      )}

      {!fabHidden && (
      <button
        type="button"
        onClick={() => {
          // « Secousse » brève au clic avant l'ouverture du panneau.
          setShake(true)
          window.setTimeout(() => setShake(false), 550)
          setOpen((v) => !v)
        }}
        className={`dice-fab ${shake ? 'dice-fab-shaking' : ''} fixed z-[70] flex items-center justify-center rounded-full`}
        style={{
          width: 60,
          height: 60,
          // Roadmap 1.7 — sidebar passée à droite : on déplace le FAB en bas
          // à gauche pour éviter le chevauchement.
          left: 'max(24px, env(safe-area-inset-left))',
          // V1 3.3 — la bottom bar mobile a été supprimée : on ancre simplement
          // au-dessus de la safe-area (plus de réserve de 56px qui décalait le
          // lanceur de dés sur mobile).
          bottom: `calc(env(safe-area-inset-bottom) + 24px)`
        }}
        aria-label={open ? 'Fermer le lanceur de dés' : 'Ouvrir le lanceur de dés'}
        aria-pressed={open}
      >
        {open ? (
          <span
            style={{
              fontSize: 24,
              lineHeight: 1,
              fontWeight: 600,
              color: 'var(--theme-accent, #C9A84C)'
            }}
          >
            ×
          </span>
        ) : (
          <DiceFabIcon />
        )}
      </button>
      )}
      <style>{`
        /* Desktop ≥ md : pas de bottom bar, ancre simple à 24px du bord. */
        @media (min-width: 768px) {
          .dice-fab {
            bottom: max(24px, env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full md:w-80 max-w-[90vw] max-h-[80vh] overflow-y-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-700"
          >
          <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800 z-10">
            <h3 className="text-lg font-bold text-yellow-500">🎲 Lanceur de dés</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white text-2xl leading-none w-7 h-7 flex items-center justify-center"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          <div className="flex border-b border-gray-700 sticky top-[56px] bg-gray-800 z-10">
            <button
              type="button"
              onClick={() => setActiveTab('lancer')}
              className={`flex-1 py-2 text-sm font-bold transition ${
                activeTab === 'lancer'
                  ? 'text-yellow-500 border-b-2 border-yellow-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🎲 Lancer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('historique')}
              className={`flex-1 py-2 text-sm font-bold transition ${
                activeTab === 'historique'
                  ? 'text-yellow-500 border-b-2 border-yellow-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📜 Historique
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('params')}
              className={`flex-1 py-2 text-sm font-bold transition ${
                activeTab === 'params'
                  ? 'text-yellow-500 border-b-2 border-yellow-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ⚙️ Sons
            </button>
          </div>

          {activeTab === 'historique' ? (
            <div className="p-4 space-y-2">
              {historiqueLoading && (
                <p className="text-gray-500 text-sm text-center">Chargement...</p>
              )}
              {!historiqueLoading && historique.length === 0 && (
                <p className="text-gray-500 text-sm text-center">Aucun jet enregistré.</p>
              )}
              {!historiqueLoading &&
                historique.map((jet) => {
                  const total = jet.resultats.reduce((a, b) => a + b, 0)
                  const isD20 = jet.type_de === 'd20'
                  const hasCritSuccess = isD20 && jet.resultats.includes(20)
                  const hasCritFail = isD20 && jet.resultats.includes(1)
                  const date = new Date(jet.created_at)
                  const dateLabel = date.toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                  const mode = jet.mode ?? 'normal'
                  const keptValue =
                    mode === 'avantage'
                      ? Math.max(...jet.resultats)
                      : mode === 'desavantage'
                      ? Math.min(...jet.resultats)
                      : null
                  const keptIdx =
                    keptValue !== null ? jet.resultats.indexOf(keptValue) : -1
                  const displayTotal = keptValue !== null ? keptValue : total
                  return (
                    <div
                      key={jet.id}
                      className={`p-3 rounded-lg border ${
                        hasCritSuccess
                          ? 'bg-yellow-500/10 border-yellow-500'
                          : hasCritFail
                          ? 'bg-red-600/10 border-red-600'
                          : 'bg-gray-900 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-200 flex items-center gap-1">
                          {jet.nombre}
                          {jet.type_de}
                          {mode === 'avantage' && (
                            <span className="text-[9px] uppercase tracking-widest px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                              ✨ avantage
                            </span>
                          )}
                          {mode === 'desavantage' && (
                            <span className="text-[9px] uppercase tracking-widest px-1 py-0.5 rounded bg-red-600/20 text-red-300 border border-red-600/40">
                              💀 désavantage
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            hasCritSuccess
                              ? 'text-yellow-400'
                              : hasCritFail
                              ? 'text-red-400'
                              : 'text-yellow-500'
                          }`}
                        >
                          {mode === 'normal' ? 'Total' : 'Retenu'} : {displayTotal}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {jet.resultats.map((r, i) => {
                          const isCritS = isD20 && r === 20
                          const isCritF = isD20 && r === 1
                          const isKept = i === keptIdx
                          const isDimmed = keptIdx !== -1 && !isKept
                          return (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                                isKept
                                  ? 'bg-yellow-500 text-gray-900 ring-2 ring-yellow-300'
                                  : isDimmed
                                  ? 'bg-gray-800 text-gray-500 line-through'
                                  : isCritS
                                  ? 'bg-yellow-500 text-gray-900'
                                  : isCritF
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-700 text-gray-200'
                              }`}
                            >
                              {r}
                            </span>
                          )
                        })}
                      </div>
                      <p className="text-[10px] text-gray-500">{dateLabel}</p>
                    </div>
                  )
                })}
            </div>
          ) : activeTab === 'params' ? (
            <div className="p-4 space-y-4">
              <div>
                <label className="flex items-center gap-2 text-gray-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={soundsOn}
                    onChange={(e) => {
                      setSoundsOn(e.target.checked)
                      setSoundsEnabled(e.target.checked)
                    }}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span className="text-sm font-bold">🔊 Sons activés</span>
                </label>
                <p className="text-gray-500 text-xs mt-1">
                  Joue un son au lancer, et un son spécial sur crit (20 ou 1 naturel sur d20).
                </p>
              </div>

              <div>
                <label className="text-gray-400 text-sm flex justify-between">
                  <span>Volume</span>
                  <span className="text-gray-300">{volume}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => {
                    const v = parseInt(e.target.value)
                    setVol(v)
                    setVolume(v)
                  }}
                  className="w-full accent-yellow-500"
                />
              </div>

              <div className="border-t border-gray-700 pt-3 space-y-3">
                <p className="text-gray-400 text-xs italic">
                  Dépose tes MP3 dans <code className="px-1 py-0.5 bg-gray-900 rounded text-yellow-400">public/sounds/</code> ou colle une URL custom (Supabase Storage bucket <em>sounds</em>, CDN, etc.).
                </p>
                {(['dice-roll', 'crit-success', 'crit-fail'] as SoundKey[]).map((k) => (
                  <SoundField
                    key={k}
                    soundKey={k}
                    url={soundUrls[k]}
                    onChange={(v) => {
                      setUrl(k, v)
                      setSoundUrls((s) => ({ ...s, [k]: v }))
                    }}
                    onReset={() => {
                      resetUrl(k)
                      setSoundUrls((s) => ({ ...s, [k]: SOUND_DEFAULT_URLS[k] }))
                    }}
                    onTest={() => playSound(k)}
                  />
                ))}
              </div>
            </div>
          ) : (
          <div className="p-4 space-y-3">
            <div>
              <label className="text-gray-400 text-sm">Type de dé</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {DICE.map((d) => {
                  const actif = selectedDice.label === d.label
                  return (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setSelectedDice(d)}
                      className={`p-2 rounded font-bold transition flex items-center justify-center gap-1 ${
                        actif
                          ? 'bg-yellow-500 text-gray-900'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <DieSilhouetteIcon
                        type={d.label}
                        size={22}
                        highlight={actif}
                      />
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {isD20 && (
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition select-none ${
                    advantage
                      ? 'bg-yellow-500/15 border-yellow-500 text-yellow-200'
                      : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-yellow-600/60'
                  }`}
                  title="Avantage : lance 2d20 et garde le meilleur"
                >
                  <input
                    type="checkbox"
                    checked={advantage}
                    onChange={(e) => setAdvantage(e.target.checked)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span className="text-xs font-bold">✨ Avantage</span>
                </label>
                <label
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition select-none ${
                    disadvantage
                      ? 'bg-red-700/20 border-red-600 text-red-200'
                      : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-red-600/60'
                  }`}
                  title="Désavantage : lance 2d20 et garde le plus mauvais"
                >
                  <input
                    type="checkbox"
                    checked={disadvantage}
                    onChange={(e) => setDisadvantage(e.target.checked)}
                    className="w-4 h-4 accent-red-500"
                  />
                  <span className="text-xs font-bold">💀 Désavantage</span>
                </label>
                {advantage && disadvantage && (
                  <p className="col-span-2 text-[10px] text-gray-400 italic text-center">
                    Les deux cochés s'annulent — jet normal.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-gray-400 text-sm">
                Nombre de dés :{' '}
                <span className="text-yellow-500 font-bold">
                  {rollMode === 'normal' ? count : 2}
                </span>
                {rollMode !== 'normal' && (
                  <span className="text-[10px] text-gray-500 ml-1">(forcé en {rollMode})</span>
                )}
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={count}
                disabled={rollMode !== 'normal'}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full accent-yellow-500 disabled:opacity-50"
              />
            </div>

            <label className="flex items-center gap-2 text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={share}
                onChange={(e) => setShare(e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
              />
              <span className="text-sm">Partager le résultat</span>
            </label>

            <button
              type="button"
              onClick={lancer}
              disabled={rolling}
              className="w-full p-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 disabled:opacity-60 transition"
            >
              {rolling
                ? 'Lancement...'
                : `Lancer ${rollMode === 'normal' ? count : 2}${selectedDice.label}${
                    rollMode === 'avantage'
                      ? ' (✨ avantage)'
                      : rollMode === 'desavantage'
                      ? ' (💀 désavantage)'
                      : ''
                  }`}
            </button>

            {/* Bandeau résultat — placé AU-DESSUS du canvas pour rester
                visible sans avoir à scroller / regarder en bas. Affiche le
                total en gros + le détail des dés individuels juste sous.
                Roadmap 1.4 — affiché aussi pour 1 seul dé (sinon le résultat
                n'est lisible que sur la face 3D). */}
            {!rolling && results.length > 0 && (
              <div
                className="bg-gray-800 rounded-lg px-4 py-2 flex items-baseline justify-between gap-3 flex-wrap"
                style={{
                  border: '1px solid rgba(201,168,76,0.3)',
                  boxShadow: '0 0 0 1px rgba(201,168,76,0.05) inset'
                }}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-[10px] uppercase tracking-[0.22em] font-bold"
                    style={{ color: '#C9A84C' }}
                  >
                    {rollMode === 'avantage'
                      ? 'Retenu (Avantage)'
                      : rollMode === 'desavantage'
                      ? 'Retenu (Désavantage)'
                      : 'Total'}
                  </span>
                  <span
                    className="text-2xl font-bold leading-none"
                    style={{
                      color: '#fef08a',
                      fontFamily: 'var(--font-cinzel), Cinzel, serif',
                      textShadow: '0 0 10px rgba(201,168,76,0.6)'
                    }}
                  >
                    {total}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-gray-400 truncate">
                  {rollMode !== 'normal' && keptIndex !== null
                    ? results.map((r, i) =>
                        i === keptIndex ? (
                          <span key={i} className="text-yellow-300 font-bold">
                            [{r}]
                          </span>
                        ) : (
                          <span key={i} className="line-through opacity-60">
                            {r}
                          </span>
                        )
                      ).reduce<React.ReactNode[]>((acc, el, i) => {
                        if (i > 0) acc.push(' / ')
                        acc.push(el)
                        return acc
                      }, [])
                    : results.join(' + ')}
                </span>
              </div>
            )}

            <div
              className="bg-gray-900 rounded-lg relative overflow-hidden"
              style={{ height: 420 }}
            >
              {/* Le canvas Babylon est TOUJOURS dimensionné et visible (pas
                  de display:none) — sinon il se monte avec un layout 0×0 et
                  ne dessine jamais rien. On masque visuellement avec
                  visibility/opacity quand l'init n'est pas finie ou a
                  échoué, mais le canvas garde ses dimensions. */}
              <div
                className="absolute inset-0"
                style={{
                  visibility: boxStatus === 'failed' ? 'hidden' : 'visible',
                  opacity: boxStatus === 'ready' ? 1 : 0.001,
                  transition: 'opacity 0.4s'
                }}
              >
                <Dice3DBoxScene
                  ref={boxRef}
                  // Bleu nuit profond : la lib bascule automatiquement vers
                  // la variante du matériau qui rend les chiffres en clair
                  // (luminance < 175 → suffixe _light → numbers blancs).
                  themeColor="#1a1f3a"
                  onReady={() => setBoxStatus('ready')}
                  onError={(err) => {
                    console.error('[dice-launcher] init box échouée :', err)
                    setBoxStatus('failed')
                  }}
                />
              </div>
              {/* Fallback / phase init : DiceArt2D superposé. Visible tant
                  que boxStatus !== 'ready'. Disparaît avec un fade quand le
                  canvas devient visible. */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-3 pointer-events-none"
                style={{
                  opacity: boxStatus === 'ready' ? 0 : 1,
                  transition: 'opacity 0.4s'
                }}
              >
                {boxStatus === 'init' && !rolling && results.length === 0 && (
                  <p className="text-gray-500 text-xs mb-2">
                    Chargement du moteur 3D…
                  </p>
                )}
                {boxStatus === 'failed' && (
                  <button
                    type="button"
                    onClick={() => setBoxStatus('init')}
                    className="pointer-events-auto mb-2 px-3 py-1 text-[10px] uppercase tracking-wider rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    title="Relancer l'initialisation du moteur 3D"
                  >
                    ⚠ Mode 3D indisponible — réessayer
                  </button>
                )}
                <div className="flex flex-wrap items-center justify-center gap-4 py-2">
                  {Array.from({
                    length: rollMode === 'normal' ? count : 2
                  }).map((_, i) => {
                    const total = rollMode === 'normal' ? count : 2
                    const dieSize = total > 4 ? 64 : total > 2 ? 80 : 96
                    const kept = keptIndex === i
                    const dimmed = keptIndex !== null && !kept
                    return (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          padding: 4,
                          borderRadius: 16,
                          background: kept
                            ? 'radial-gradient(circle, rgba(254,240,138,0.35) 0%, rgba(201,168,76,0.18) 60%, transparent 100%)'
                            : 'transparent',
                          boxShadow: kept
                            ? '0 0 18px 4px rgba(254,240,138,0.65), 0 0 32px 8px rgba(201,168,76,0.3)'
                            : 'none',
                          opacity: dimmed ? 0.45 : 1,
                          transition: 'opacity 0.3s, box-shadow 0.3s'
                        }}
                      >
                        <DiceArt2D
                          type={selectedDice.label}
                          sides={selectedDice.sides}
                          size={dieSize}
                          value={results[i]}
                          rolling={rolling}
                          delay={i * 90}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              {!rolling && showParticles && results.length > 0 && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const angle = (i / 16) * Math.PI * 2
                    const distance = 70 + Math.random() * 50
                    const dx = Math.cos(angle) * distance
                    const dy = Math.sin(angle) * distance
                    const couleurs = ['bg-yellow-400', 'bg-yellow-300', 'bg-orange-400', 'bg-white']
                    const couleur = couleurs[i % couleurs.length]
                    return (
                      <span
                        key={i}
                        className={`particle absolute w-2 h-2 rounded-full ${couleur}`}
                        style={{
                          ['--dx' as string]: `${dx}px`,
                          ['--dy' as string]: `${dy}px`,
                          animationDelay: `${Math.random() * 100}ms`
                        } as CSSProperties}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {share && results.length > 0 && !rolling && (
              <p className="text-green-400 text-xs text-center">✓ Résultat partagé</p>
            )}
          </div>
          )}
        </div>
        </div>
      )}
    </>
  )
}

// ----------------------------------------------------------------------------
// SoundField — input URL + boutons Réinitialiser / Tester pour un son donné.
// ----------------------------------------------------------------------------
const SOUND_LABELS: Record<SoundKey, string> = {
  'dice-roll': '🎲 Son du lancer',
  'crit-success': '✨ Crit succès (nat 20)',
  'crit-fail': '💀 Crit échec (nat 1)'
}

function SoundField({
  soundKey,
  url,
  onChange,
  onReset,
  onTest
}: {
  soundKey: SoundKey
  url: string
  onChange: (v: string) => void
  onReset: () => void
  onTest: () => void
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-gray-400">
        {SOUND_LABELS[soundKey]}
      </label>
      <div className="flex gap-1 mt-1">
        <input
          type="text"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/sounds/…mp3 ou https://…"
          className="flex-1 p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none text-xs focus:border-yellow-500"
        />
        <button
          type="button"
          onClick={onTest}
          className="px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs"
          title="Tester ce son"
        >
          ▶
        </button>
        <button
          type="button"
          onClick={onReset}
          className="px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs"
          title="Réinitialiser à la valeur par défaut"
        >
          ↺
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// DiceFabIcon — silhouette d20 pentagonale + chiffre "20" centré. Toutes les
// couleurs sont relatives au thème via var(--theme-accent) et
// var(--theme-bg-primary), pour que le bouton s'accorde automatiquement à
// eclipsed / runique / parchemin / lave / necromancien / royal.
// ----------------------------------------------------------------------------
function DiceFabIcon() {
  // d20 façon @3d-dice/dice-box : icosaèdre vu de face, base bleu cobalt
  // éclairci pour ressortir sur le fond sombre du FAB. Relief par facettes
  // (mêmes points que DICE_ART.d20 plus haut dans ce fichier). Le chiffre
  // "20" est doré pour évoquer la gravure du dé 3D. Couleurs hardcodées
  // pour rester cohérent avec le canvas Babylon.
  return (
    <svg
      viewBox="0 0 100 100"
      width={38}
      height={38}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <defs>
        {/* Gradient principal — bleu plus clair en haut, plus sombre en
            bas, façon métal éclairé par le dessus. */}
        <linearGradient id="d20-face-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b6dc4" />
          <stop offset="100%" stopColor="#2d3a6b" />
        </linearGradient>
        {/* Highlight métallique très subtil sur la face haute-gauche. */}
        <linearGradient id="d20-highlight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Silhouette extérieure */}
      <polygon
        points="50,5 88,28 88,72 50,95 12,72 12,28"
        fill="#2d3a6b"
        stroke="#1a2148"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Facettes périphériques — du plus clair (faces tournées vers la
          lumière) au plus sombre (faces fuyantes). Structure DICE_ART.d20. */}
      <polygon
        points="50,5 88,28 75,55 50,30"
        fill="#4a5aa6"
        stroke="#1a2148"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <polygon
        points="12,28 50,5 50,30 25,55"
        fill="#4554a0"
        stroke="#1a2148"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <polygon
        points="88,28 88,72 75,55"
        fill="#283265"
        stroke="#1a2148"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <polygon
        points="12,28 12,72 25,55"
        fill="#34418a"
        stroke="#1a2148"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <polygon
        points="88,72 50,95 75,55"
        fill="#1f2752"
        stroke="#1a2148"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <polygon
        points="50,95 12,72 25,55"
        fill="#222a5b"
        stroke="#1a2148"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />

      {/* Face avant — la plus claire, avec gradient haut→bas */}
      <polygon
        points="50,30 75,55 25,55"
        fill="url(#d20-face-front)"
        stroke="#1a2148"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* Reflet métallique subtil sur la facette haute-gauche */}
      <polygon
        points="12,28 50,5 50,30 25,55"
        fill="url(#d20-highlight)"
        pointerEvents="none"
      />

      {/* "20" gravé en or sur la face avant */}
      <text
        x="50"
        y="46"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="18"
        fontWeight="700"
        fill="#C9A84C"
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          letterSpacing: '-0.04em'
        }}
      >
        20
      </text>
    </svg>
  )
}
