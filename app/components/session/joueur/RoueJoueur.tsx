'use client'

// ============================================================================
// RoueJoueur — la roue du personnage (Delta A.1)
// ----------------------------------------------------------------------------
// Demi-sphère ancrée en bas de l'écran (mobile) ou en bas de la colonne gauche
// (PC). Elle remplace intégralement l'ancien dock d'onglets et l'en-tête PV :
// les points de vie ne sont plus affichés qu'ICI, par l'arc du pourtour.
//
//   · centre  : demi-disque portrait + nom + PV / CA — appui ⇒ panneau PV
//   · arc     : jauge de PV sur le pourtour extérieur, vert / ambre / rouge / gris
//   · pétales : Compétences · Sorts · Notes · Actions · Sac (gauche → droite)
//
// Tout est en SVG à viewBox fixe : la roue se met à l'échelle de son conteneur,
// donc un seul composant sert le mobile et le PC (aucune seconde arborescence).
// ============================================================================

export type PetaleKey = 'competences' | 'sorts' | 'notes' | 'actions' | 'sac'

export const PETALES: Array<{ key: PetaleKey; label: string; court: string; icone: string }> = [
  { key: 'competences', label: 'Compétences', court: 'Comp.', icone: '🎯' },
  { key: 'sorts', label: 'Sorts', court: 'Sorts', icone: '✨' },
  { key: 'notes', label: 'Notes', court: 'Notes', icone: '📝' },
  { key: 'actions', label: 'Actions', court: 'Actions', icone: '⚔️' },
  { key: 'sac', label: 'Sac', court: 'Sac', icone: '🎒' }
]

// --- Géométrie du demi-disque (viewBox 320 × 172, centre en bas au milieu) ---
const CX = 160
const CY = 168
const R_ARC = 154 // rayon de la jauge de PV (pourtour extérieur)
const R_OUT = 142 // rayon extérieur des pétales
const R_IN = 76 // rayon intérieur des pétales = bord du demi-disque central

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)]
}

/** Secteur d'anneau entre deux angles (a1 > a2, sens horaire à l'écran). */
function secteur(a1: number, a2: number): string {
  const [x1, y1] = polar(R_OUT, a1)
  const [x2, y2] = polar(R_OUT, a2)
  const [x3, y3] = polar(R_IN, a2)
  const [x4, y4] = polar(R_IN, a1)
  return `M ${x1} ${y1} A ${R_OUT} ${R_OUT} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${R_IN} ${R_IN} 0 0 0 ${x4} ${y4} Z`
}

/** Couleur de la jauge de PV — vert > 2/3, ambre 1/3‥2/3, rouge < 1/3, gris à 0. */
export function couleurPv(hp: number, hpMax: number): string {
  if (hp <= 0 || hpMax <= 0) return '#6b7280'
  const r = hp / hpMax
  if (r > 2 / 3) return '#4ade80'
  if (r > 1 / 3) return '#f59e0b'
  return '#ef4444'
}

const PAS = 180 / PETALES.length // 36° par pétale

export default function RoueJoueur({
  nom,
  imageUrl,
  hp,
  hpMax,
  tempHp = 0,
  ca,
  actif,
  onSelect,
  onCentre
}: {
  nom: string
  imageUrl: string | null
  hp: number
  hpMax: number
  tempHp?: number
  ca: number | string
  actif: PetaleKey | null
  onSelect: (key: PetaleKey) => void
  onCentre: () => void
}) {
  const ratio = hpMax > 0 ? Math.max(0, Math.min(1, hp / hpMax)) : 0
  const couleur = couleurPv(hp, hpMax)

  const [arcX1, arcY1] = polar(R_ARC, 180)
  const [arcX2, arcY2] = polar(R_ARC, 0)
  const cheminArc = `M ${arcX1} ${arcY1} A ${R_ARC} ${R_ARC} 0 0 1 ${arcX2} ${arcY2}`

  return (
    <div className="roue-joueur relative w-full select-none" style={{ maxWidth: 420, margin: '0 auto' }}>
      <svg viewBox="0 0 320 172" width="100%" preserveAspectRatio="xMidYMax meet" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="roue-fond" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c1710" />
            <stop offset="100%" stopColor="#0e0b06" />
          </linearGradient>
        </defs>

        {/* Socle du demi-disque */}
        <path
          d={`M ${CX - R_OUT} ${CY} A ${R_OUT} ${R_OUT} 0 0 1 ${CX + R_OUT} ${CY} Z`}
          fill="url(#roue-fond)"
          stroke="rgba(201,168,76,0.18)"
        />

        {/* Jauge de PV — piste puis remplissage proportionnel */}
        <path d={cheminArc} fill="none" stroke="rgba(87,83,78,0.5)" strokeWidth={9} strokeLinecap="round" />
        <path
          d={cheminArc}
          fill="none"
          stroke={couleur}
          strokeWidth={9}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${ratio * 100} 100`}
          style={{ transition: 'stroke-dasharray 350ms ease, stroke 350ms ease', filter: `drop-shadow(0 0 4px ${couleur}88)` }}
        />

        {/* Pétales — de gauche (180°) à droite (0°) */}
        {PETALES.map((p, i) => {
          const a1 = 180 - i * PAS
          const a2 = a1 - PAS
          const milieu = (a1 + a2) / 2
          const [tx, ty] = polar(120, milieu) // label court (PC)
          const [ix, iy] = polar(97, milieu) // icône (PC)
          const [mx, my] = polar(109, milieu) // label complet (mobile)
          const estActif = actif === p.key
          return (
            <g
              key={p.key}
              role="button"
              tabIndex={0}
              aria-label={p.label}
              aria-pressed={estActif}
              onClick={() => onSelect(p.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(p.key)
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={secteur(a1, a2)}
                fill={estActif ? 'rgba(201,168,76,0.28)' : 'rgba(28,23,16,0.95)'}
                stroke={estActif ? '#C9A84C' : 'rgba(201,168,76,0.22)'}
                strokeWidth={estActif ? 2 : 1}
                style={{ transition: 'fill 180ms ease' }}
              />
              {/* Mobile : l'intitulé complet tient dans l'arc. */}
              <text
                className="lg:hidden"
                x={mx}
                y={my}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={estActif ? 700 : 500}
                fill={estActif ? '#fef3c7' : '#d6d3d1'}
                style={{ fontFamily: 'Georgia, serif', pointerEvents: 'none' }}
              >
                {p.label}
              </text>
              {/* PC : la roue est plus étroite → icône + label court. */}
              <g className="hidden lg:block" style={{ pointerEvents: 'none' }}>
                <text x={ix} y={iy} textAnchor="middle" dominantBaseline="central" fontSize={16}>
                  {p.icone}
                </text>
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fontWeight={estActif ? 700 : 500}
                  fill={estActif ? '#fef3c7' : '#a8a29e'}
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {p.court}
                </text>
              </g>
            </g>
          )
        })}

        {/* Bord du demi-disque central */}
        <path
          d={`M ${CX - R_IN} ${CY} A ${R_IN} ${R_IN} 0 0 1 ${CX + R_IN} ${CY} Z`}
          fill="none"
          stroke="rgba(201,168,76,0.4)"
          strokeWidth={1.5}
        />
      </svg>

      {/* Centre : portrait + nom + PV / CA. En HTML (et non en SVG) pour un
          portrait net et un texte qui se tronque proprement. Aucun `transform`
          n'est posé ici : ce conteneur ne doit jamais devenir un bloc conteneur
          pour une modale `position: fixed`. */}
      <button
        type="button"
        onClick={onCentre}
        aria-label="Points de vie"
        title="Points de vie"
        className="absolute flex flex-col items-center justify-end pb-1 gap-0.5"
        style={{
          left: `${((CX - R_IN) / 320) * 100}%`,
          width: `${((R_IN * 2) / 320) * 100}%`,
          bottom: 0,
          height: `${(R_IN / 172) * 100}%`,
          background: 'transparent',
          border: 'none'
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={nom}
            className="rounded-full object-cover"
            style={{ width: '44%', aspectRatio: '1 / 1', border: '1.5px solid rgba(201,168,76,0.55)' }}
          />
        ) : (
          <span
            className="rounded-full flex items-center justify-center text-yellow-500"
            style={{
              width: '44%',
              aspectRatio: '1 / 1',
              background: '#231c12',
              border: '1.5px solid rgba(201,168,76,0.55)',
              fontSize: '0.8rem'
            }}
          >
            🎭
          </span>
        )}
        <span className="flex items-baseline gap-1.5 leading-none w-full justify-center px-1">
          <span className="text-[10px] font-bold" style={{ color: couleur }}>
            {hp}
            {tempHp > 0 && <span className="text-cyan-300">+{tempHp}</span>}
          </span>
          <span
            className="text-[11px] font-bold truncate"
            style={{ color: '#fef3c7', fontFamily: 'Georgia, serif', maxWidth: '55%' }}
          >
            {nom}
          </span>
          <span className="text-[10px] text-stone-400 font-bold">CA {ca}</span>
        </span>
      </button>
    </div>
  )
}
