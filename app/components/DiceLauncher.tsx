'use client'

import { useState, useId, CSSProperties } from 'react'
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

  const lancer = async () => {
    setRolling(true)
    setShowParticles(false)
    setResults([])

    await new Promise((r) => setTimeout(r, 1000))

    const jets = Array.from(
      { length: count },
      () => Math.floor(Math.random() * selectedDice.sides) + 1
    )
    setResults(jets)
    setRolling(false)
    setShowParticles(true)
    setTimeout(() => setShowParticles(false), 1400)

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
      `}</style>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-yellow-500 text-gray-900 text-2xl font-bold shadow-2xl hover:scale-110 hover:bg-yellow-400 transition-transform z-[70] flex items-center justify-center"
        style={{
          bottom: 'max(1rem, env(safe-area-inset-bottom))',
          right: 'max(1rem, env(safe-area-inset-right))'
        }}
        aria-label="Lanceur de dés"
      >
        {open ? '×' : '🎲'}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed right-4 left-4 md:left-auto md:right-6 md:w-80 max-h-[calc(100vh-100px)] overflow-y-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-700 z-[70]"
            style={{ bottom: '80px' }}
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
        </>
      )}
    </>
  )
}
