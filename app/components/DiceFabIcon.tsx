'use client'

// ============================================================================
// DiceFabIcon — le d20 de Master Screen
// ----------------------------------------------------------------------------
// Silhouette d'icosaèdre vue de face, facettes bleu cobalt et « 20 » gravé en
// or : c'est la marque de dé de l'application. Module autonome pour que les
// écrans qui n'ont besoin QUE de l'icône (page écran de table, lobby de
// jonction) ne tirent pas tout `DiceLauncher` dans leur bundle.
//
// Couleurs volontairement en dur — elles reproduisent le rendu du canvas
// Babylon de `@3d-dice/dice-box` et ne doivent pas suivre le thème, sans quoi
// le dé 2D et le dé 3D ne se ressembleraient plus.
// ============================================================================

export function DiceFabIcon({ taille = 38 }: { taille?: number } = {}) {
  // d20 façon @3d-dice/dice-box : icosaèdre vu de face, base bleu cobalt
  // éclairci pour ressortir sur le fond sombre du FAB. Relief par facettes
  // (mêmes points que DICE_ART.d20 plus haut dans ce fichier). Le chiffre
  // "20" est doré pour évoquer la gravure du dé 3D. Couleurs hardcodées
  // pour rester cohérent avec le canvas Babylon.
  return (
    <svg
      viewBox="0 0 100 100"
      width={taille}
      height={taille}
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
