'use client'

// Wrapper React autour de @3d-dice/dice-box. La librairie est strictement
// client-side (Babylon.js + AmmoJS via web worker), elle s'instancie en
// montant un canvas dans un conteneur DOM identifié par un sélecteur.
//
// L'API exposée :
// - mount via <Dice3DBoxScene ref={ref} onError={...} />
// - ref.current.roll('3d20') => Promise<number[]>
// - ref.current.clear()
//
// Le hook ref.current peut être null tant que init() n'a pas terminé. Le
// conteneur appelant doit gérer ce cas.

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef
} from 'react'

export type DiceBoxHandle = {
  ready: boolean
  roll: (notation: string) => Promise<number[]>
  clear: () => void
}

type DiceBoxResult = { value: number; sides?: number; rollId?: string }

// Approximation du type — la lib n'expose pas de définitions TS officielles.
type DiceBoxInstance = {
  init: () => Promise<void>
  roll: (notation: string) => Promise<DiceBoxResult[] | DiceBoxResult>
  clear: () => void
  updateConfig?: (cfg: Record<string, unknown>) => void
  onRollComplete?: (results: unknown) => void
}

type DiceBoxConfig = {
  assetPath: string
  theme?: string
  scale?: number
  gravity?: number
  mass?: number
  friction?: number
  restitution?: number
  themeColor?: string
  startingHeight?: number
  spinForce?: number
  throwForce?: number
}

export type Dice3DBoxSceneProps = {
  onError?: (err: Error) => void
  onReady?: () => void
  themeColor?: string
}

// Bleu nuit profond : luminance perçue ≈ 32, sous le seuil 175 que la lib
// utilise pour décider du suffixe de matériau. Sous ce seuil, dice-box
// charge la variante "_light" du diffuse → chiffres blancs lumineux sur
// corps bleu sombre (option 1 demandée).
const DEFAULT_THEME_COLOR = '#1a1f3a'

const Dice3DBoxScene = forwardRef<DiceBoxHandle, Dice3DBoxSceneProps>(
  function Dice3DBoxScene(
    { onError, onReady, themeColor = DEFAULT_THEME_COLOR },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const boxRef = useRef<DiceBoxInstance | null>(null)
    const readyRef = useRef(false)
    const reactId = useId().replace(/[^a-zA-Z0-9]/g, '')
    const containerId = `dice-box-${reactId}`

    useEffect(() => {
      let cancelled = false
      const startInit = async () => {
        try {
          const container = containerRef.current
          if (!container) {
            console.warn('[dice] container ref vide, on attend')
            return
          }
          const rect = container.getBoundingClientRect()
          console.log(
            `[dice] container ${container.id} taille = ${rect.width}×${rect.height}`
          )
          if (rect.width < 10 || rect.height < 10) {
            console.warn(
              '[dice] container quasi vide — le canvas risque de ne rien afficher tant que le parent est visible'
            )
          }
          // Import dynamique : la lib touche à window/document au chargement
          // du module, on évite donc tout SSR / bundle initial.
          console.log('[dice] import du module @3d-dice/dice-box')
          const mod = await import('@3d-dice/dice-box')
          if (cancelled) return
          type DiceBoxCtor = new (
            selector: string,
            cfg: DiceBoxConfig
          ) => DiceBoxInstance
          const DiceBox = (mod as { default: DiceBoxCtor }).default
          const config: DiceBoxConfig = {
            assetPath: '/dice/',
            // theme 'rust' embarque les chiffres dans sa texture diffuse (le
            // thème 'default' n'inclut pas les numéros, d'où des dés vierges)
            theme: 'rust',
            // scale 12 : dés massifs et chiffres bien lisibles. La caméra
            // de DiceBox n'est pas configurable directement (pas de
            // cameraDistance / cameraZoom dans l'API publique de la lib),
            // on agrandit donc les dés plutôt que de zoomer.
            scale: 12,
            gravity: 1,
            mass: 1,
            friction: 0.8,
            restitution: 0,
            themeColor,
            // Proportionnel au scale pour que les dés gros ne spawnent pas
            // au-dessus du frustum de la caméra.
            startingHeight: 12,
            spinForce: 5,
            throwForce: 5
          }
          const selector = `#${containerId}`
          console.log('[dice] init avec selector', selector, 'config', config)
          const instance = new DiceBox(selector, config)
          await instance.init()
          if (cancelled) {
            console.log('[dice] init annulée (unmount avant fin)')
            try {
              instance.clear()
            } catch {
              /* ignore cleanup errors */
            }
            return
          }
          // Un canvas avec class .dice-box-canvas a normalement été
          // ajouté au container par la lib. On vérifie sa présence et
          // ses dimensions pour aider le debug.
          const canvas = container.querySelector('canvas')
          if (canvas) {
            console.log(
              `[dice] init success, canvas ${canvas.width}×${canvas.height} (style ${canvas.style.width || 'default'}×${canvas.style.height || 'default'})`
            )
          } else {
            console.warn('[dice] init success mais aucun canvas trouvé dans le container')
          }
          boxRef.current = instance
          readyRef.current = true
          onReady?.()
        } catch (err) {
          console.error('[dice] init failed:', err)
          if (!cancelled) onError?.(err as Error)
        }
      }
      startInit()
      return () => {
        cancelled = true
        try {
          boxRef.current?.clear()
        } catch {
          /* ignore */
        }
        boxRef.current = null
        readyRef.current = false
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerId])

    useImperativeHandle(
      ref,
      (): DiceBoxHandle => ({
        get ready() {
          return readyRef.current
        },
        roll: async (notation: string) => {
          const box = boxRef.current
          if (!box) throw new Error('DiceBox non initialisé')
          try {
            box.clear()
          } catch {
            /* ignore */
          }
          console.log('[dice] roll demande', notation)
          const out = await box.roll(notation)
          const arr = Array.isArray(out) ? out : [out]
          const values = arr
            .filter((r): r is DiceBoxResult => !!r && typeof r.value === 'number')
            .map((r) => r.value)
          console.log('[dice] roll resultat', values)
          return values
        },
        clear: () => {
          try {
            boxRef.current?.clear()
          } catch {
            /* ignore */
          }
        }
      }),
      []
    )

    return (
      <div
        ref={containerRef}
        id={containerId}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          // Le canvas généré par dice-box est en position absolute par
          // défaut ; le parent doit avoir une taille déterminée.
        }}
      />
    )
  }
)

export default Dice3DBoxScene
