'use client'

import { useState, useEffect, useId, CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

type DiceType = { label: string; sides: number }

const DICE: DiceType[] = [
  { label: 'd4', sides: 4 },
  { label: 'd6', sides: 6 },
  { label: 'd8', sides: 8 },
  { label: 'd10', sides: 10 },
  { label: 'd12', sides: 12 },
  { label: 'd20', sides: 20 }
]

const FORMES: Record<string, string> = {
  d4: '50,8 86,71 14,71',
  d6: '15,15 85,15 85,85 15,85',
  d8: '50,5 95,50 50,95 5,50',
  d10: '50,5 88,35 72,95 28,95 12,35',
  d12: '50,5 93,36 77,86 24,86 7,36',
  d20: '50,5 89,28 89,72 50,95 11,72 11,28'
}

type GradientKey = 'red' | 'orange' | 'amber' | 'silver' | 'yellow' | 'gold' | 'crit'

const GRADIENTS: Record<GradientKey, [string, string, string]> = {
  red: ['#b91c1c', '#ef4444', '#fca5a5'],
  orange: ['#c2410c', '#f97316', '#fdba74'],
  amber: ['#d97706', '#fbbf24', '#fde68a'],
  silver: ['#9ca3af', '#e5e7eb', '#ffffff'],
  yellow: ['#eab308', '#facc15', '#fef08a'],
  gold: ['#ca8a04', '#facc15', '#fef9c3'],
  crit: ['#fde047', '#fef08a', '#ffffff']
}

function gradientKeyPour(resultat: number, faces: number): GradientKey {
  if (resultat === 1) return 'red'
  if (faces === 20 && resultat === 20) return 'crit'
  if (resultat === faces) return 'gold'
  const ratio = resultat / faces
  if (ratio <= 0.25) return 'orange'
  if (ratio <= 0.5) return 'amber'
  if (ratio >= 0.85) return 'yellow'
  return 'silver'
}

function DiceShape({
  type,
  value,
  gradient,
  className = '',
  style,
  showText = true
}: {
  type: string
  value?: number
  gradient: GradientKey
  className?: string
  style?: CSSProperties
  showText?: boolean
}) {
  const uid = useId().replace(/:/g, '')
  const id = `grad-${uid}`
  const points = FORMES[type] ?? FORMES.d6
  const [c1, c2, c3] = GRADIENTS[gradient]
  return (
    <svg viewBox="0 0 100 100" className={className} style={style}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="50%" stopColor={c2} />
          <stop offset="100%" stopColor={c3} />
        </linearGradient>
      </defs>
      <polygon
        points={points}
        fill={`url(#${id})`}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {showText && value !== undefined && (
        <text
          x="50"
          y="55"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={value >= 10 ? 30 : 38}
          fontWeight="bold"
          fill="#111827"
        >
          {value}
        </text>
      )}
    </svg>
  )
}

export default function DiceLauncher() {
  const [open, setOpen] = useState(false)
  const [selectedDice, setSelectedDice] = useState<DiceType>(DICE[5])
  const [count, setCount] = useState(1)
  const [share, setShare] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [results, setResults] = useState<number[]>([])
  const [showParticles, setShowParticles] = useState(false)
  const [critEffect, setCritEffect] = useState<'success' | 'fail' | null>(null)

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

  const lancer = async () => {
    setRolling(true)
    setShowParticles(false)
    setResults([])
    setCritEffect(null)

    await new Promise((r) => setTimeout(r, 1000))

    const jets = Array.from(
      { length: count },
      () => Math.floor(Math.random() * selectedDice.sides) + 1
    )
    setResults(jets)
    setRolling(false)
    setShowParticles(true)
    setTimeout(() => setShowParticles(false), 1400)

    // Effet critique UNIQUEMENT sur d20.
    // Si plusieurs d20 sont lancés, un seul 20 ou un seul 1 suffit à déclencher l'effet.
    // Priorité au succès critique si les deux sortent simultanément.
    if (selectedDice.sides === 20) {
      if (jets.includes(20)) {
        setCritEffect('success')
        setTimeout(() => setCritEffect(null), 2000)
      } else if (jets.includes(1)) {
        setCritEffect('fail')
        setTimeout(() => setCritEffect(null), 2000)
      }
    }

    if (share) {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('jets_de_des').insert({
        user_id: user?.id,
        type_de: selectedDice.label,
        nombre: count,
        resultats: jets,
        partage: true
      })
    }
  }

  const total = results.reduce((a, b) => a + b, 0)

  return (
    <>
      <style>{`
        @keyframes dice-roll {
          0%   { transform: rotate(0deg) scale(1); }
          25%  { transform: rotate(220deg) scale(1.2); }
          50%  { transform: rotate(440deg) scale(0.85); }
          75%  { transform: rotate(620deg) scale(1.15); }
          100% { transform: rotate(720deg) scale(1); }
        }
        .dice-rolling { animation: dice-roll 1s cubic-bezier(.5,.1,.3,1) infinite; }
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

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-4 md:right-6 w-14 h-14 rounded-full bg-yellow-500 text-gray-900 text-2xl font-bold shadow-2xl hover:scale-110 hover:bg-yellow-400 transition-transform z-[70] flex items-center justify-center bottom-[calc(64px+env(safe-area-inset-bottom)+0.75rem)] md:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{
          right: 'max(1rem, env(safe-area-inset-right))'
        }}
        aria-label="Lanceur de dés"
      >
        {open ? '×' : '🎲'}
      </button>

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
                      <DiceShape
                        type={d.label}
                        gradient={actif ? 'gold' : 'silver'}
                        showText={false}
                        className="w-5 h-5"
                      />
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm">
                Nombre de dés : <span className="text-yellow-500 font-bold">{count}</span>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full accent-yellow-500"
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
              {rolling ? 'Lancement...' : `Lancer ${count}${selectedDice.label}`}
            </button>

            <div className="min-h-[140px] bg-gray-900 rounded-lg flex flex-col items-center justify-center p-4 relative overflow-hidden">
              {rolling && (
                <DiceShape
                  type={selectedDice.label}
                  gradient="silver"
                  showText={false}
                  className="w-24 h-24 dice-rolling"
                />
              )}
              {!rolling && results.length === 0 && (
                <p className="text-gray-500 text-sm">Prêt à lancer...</p>
              )}
              {!rolling && results.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {results.map((r, i) => (
                      <DiceShape
                        key={i}
                        type={selectedDice.label}
                        value={r}
                        gradient={gradientKeyPour(r, selectedDice.sides)}
                        className="w-14 h-14 result-pop drop-shadow-lg"
                        style={{ animationDelay: `${i * 80}ms` } as CSSProperties}
                      />
                    ))}
                  </div>
                  {count > 1 && (
                    <p className="text-yellow-500 font-bold mt-3">
                      Total : {total}
                    </p>
                  )}
                  {showParticles && (
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
                </>
              )}
            </div>

            {share && results.length > 0 && !rolling && (
              <p className="text-green-400 text-xs text-center">✓ Résultat partagé</p>
            )}
          </div>
        </div>
        </div>
      )}
    </>
  )
}
