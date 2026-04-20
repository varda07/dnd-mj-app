'use client'

import { useEffect, useRef, useState } from 'react'

type Ambiance = {
  id: string
  label: string
  icon: string
  description: string
  url: string
}

const AMBIANCES: Ambiance[] = [
  {
    id: 'taverne',
    label: 'Taverne',
    icon: '🍺',
    description: 'Ambiance taverne animée',
    url: 'https://assets.mixkit.co/active_storage/sfx/1190/1190-preview.mp3'
  },
  {
    id: 'foret',
    label: 'Forêt',
    icon: '🌲',
    description: 'Oiseaux, vent, feuillage',
    url: 'https://assets.mixkit.co/active_storage/sfx/1210/1210-preview.mp3'
  },
  {
    id: 'donjon',
    label: 'Donjon',
    icon: '🗝️',
    description: 'Atmosphère sombre, échos',
    url: 'https://assets.mixkit.co/active_storage/sfx/1208/1208-preview.mp3'
  },
  {
    id: 'combat',
    label: 'Combat',
    icon: '⚔️',
    description: 'Musique épique de bataille',
    url: 'https://assets.mixkit.co/active_storage/sfx/1192/1192-preview.mp3'
  },
  {
    id: 'tempete',
    label: 'Tempête',
    icon: '⛈️',
    description: 'Pluie, tonnerre, vent fort',
    url: 'https://assets.mixkit.co/active_storage/sfx/1203/1203-preview.mp3'
  },
  {
    id: 'mystere',
    label: 'Mystère',
    icon: '🔮',
    description: 'Musique mystérieuse, tension',
    url: 'https://assets.mixkit.co/active_storage/sfx/1211/1211-preview.mp3'
  }
]

export default function SoundBox() {
  const [open, setOpen] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.5)
  const [loading, setLoading] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const toggle = async (amb: Ambiance) => {
    if (playingId === amb.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    setLoading(amb.id)
    const audio = new Audio(amb.url)
    audio.loop = true
    audio.volume = volume
    audioRef.current = audio

    try {
      await audio.play()
      setPlayingId(amb.id)
    } catch {
      setPlayingId(null)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            console.log('[SoundBox] isOpen:', !v)
            return !v
          })
        }}
        className="fixed bottom-4 left-4 md:bottom-6 md:left-6 w-14 h-14 rounded-full bg-yellow-500 text-gray-900 text-2xl font-bold shadow-2xl hover:scale-110 hover:bg-yellow-400 transition-transform z-[70] flex items-center justify-center"
        style={{
          bottom: 'max(1rem, env(safe-area-inset-bottom))',
          left: 'max(1rem, env(safe-area-inset-left))'
        }}
        aria-label="Ambiances sonores"
      >
        {open ? (
          '×'
        ) : playingId ? (
          <span className="relative flex items-center justify-center">
            🎵
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-gray-900 animate-pulse" />
          </span>
        ) : (
          '🎵'
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed left-4 right-4 md:right-auto md:left-6 md:w-80 max-h-[calc(100vh-100px)] overflow-y-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-700 z-[70]"
            style={{ bottom: '80px' }}
          >
          <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800 z-10">
            <h3 className="text-lg font-bold text-yellow-500">🎵 Ambiances</h3>
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
              <label className="text-gray-400 text-sm">
                Volume : <span className="text-yellow-500 font-bold">{Math.round(volume * 100)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
                className="w-full accent-yellow-500"
              />
            </div>

            <div className="space-y-2">
              {AMBIANCES.map((amb) => {
                const isPlaying = playingId === amb.id
                const isLoading = loading === amb.id
                return (
                  <button
                    key={amb.id}
                    type="button"
                    onClick={() => toggle(amb)}
                    disabled={isLoading}
                    className={`w-full p-3 rounded-lg flex items-center gap-3 transition text-left ${
                      isPlaying
                        ? 'bg-yellow-500/20 border border-yellow-500'
                        : 'bg-gray-700 border border-transparent hover:bg-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{amb.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold ${isPlaying ? 'text-yellow-500' : 'text-gray-200'}`}>
                        {amb.label}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{amb.description}</div>
                    </div>
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        isPlaying ? 'bg-yellow-500 text-gray-900' : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {isLoading ? '…' : isPlaying ? '■' : '▶'}
                    </span>
                  </button>
                )
              })}
            </div>

            {playingId && (
              <button
                type="button"
                onClick={() => {
                  audioRef.current?.pause()
                  setPlayingId(null)
                }}
                className="w-full p-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                Tout arrêter
              </button>
            )}
          </div>
        </div>
        </>
      )}
    </>
  )
}
