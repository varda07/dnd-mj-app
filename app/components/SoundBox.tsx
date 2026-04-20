'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_2ca6e1c3f7.mp3'
  },
  {
    id: 'foret',
    label: 'Forêt',
    icon: '🌲',
    description: 'Oiseaux, vent, feuillage',
    url: 'https://cdn.pixabay.com/audio/2021/10/25/audio_f7a1f35c0c.mp3'
  },
  {
    id: 'donjon',
    label: 'Donjon',
    icon: '🗝️',
    description: 'Atmosphère sombre, échos',
    url: 'https://cdn.pixabay.com/audio/2022/08/04/audio_2ca6e1c3f7.mp3'
  },
  {
    id: 'combat',
    label: 'Combat',
    icon: '⚔️',
    description: 'Musique épique de bataille',
    url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_ba7d8fd1d8.mp3'
  },
  {
    id: 'tempete',
    label: 'Tempête',
    icon: '⛈️',
    description: 'Pluie, tonnerre, vent fort',
    url: 'https://cdn.pixabay.com/audio/2022/03/09/audio_c8a73e51e6.mp3'
  },
  {
    id: 'mystere',
    label: 'Mystère',
    icon: '🔮',
    description: 'Musique mystérieuse, tension',
    url: 'https://cdn.pixabay.com/audio/2022/05/16/audio_1808fbf07a.mp3'
  }
]

const STORAGE_KEY = 'soundbox_custom_urls'
const BUCKET = 'sounds'

export default function SoundBox() {
  const [open, setOpen] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.5)
  const [loading, setLoading] = useState<string | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [customUrls, setCustomUrls] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string>('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setCustomUrls(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const urlFor = (amb: Ambiance) => customUrls[amb.id] || amb.url

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
    const audio = new Audio(urlFor(amb))
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

  const persistCustomUrls = (next: Record<string, string>) => {
    setCustomUrls(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }

  const onUpload = async (ambId: string, file: File) => {
    setUploadError('')
    if (!file.type.startsWith('audio/')) {
      setUploadError('Le fichier doit être un MP3 ou un audio.')
      return
    }
    setUploading(ambId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUploadError('Connexion requise.')
        return
      }
      const ext = file.name.split('.').pop() || 'mp3'
      const path = `${user.id}/${ambId}.${ext}`
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type || 'audio/mpeg' })
      if (error) {
        setUploadError(error.message)
        return
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const bustedUrl = `${data.publicUrl}?t=${Date.now()}`
      persistCustomUrls({ ...customUrls, [ambId]: bustedUrl })
    } finally {
      setUploading(null)
    }
  }

  const clearCustom = (ambId: string) => {
    const next = { ...customUrls }
    delete next[ambId]
    persistCustomUrls(next)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
              <h3 className="text-lg font-bold text-yellow-500">
                {manageOpen ? '⚙️ Gérer mes sons' : '🎵 Ambiances'}
              </h3>
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
              {!manageOpen && (
                <>
                  <div>
                    <label className="text-gray-400 text-sm">
                      Volume :{' '}
                      <span className="text-yellow-500 font-bold">
                        {Math.round(volume * 100)}%
                      </span>
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
                      const custom = !!customUrls[amb.id]
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
                            <div
                              className={`font-bold ${
                                isPlaying ? 'text-yellow-500' : 'text-gray-200'
                              }`}
                            >
                              {amb.label}
                              {custom && (
                                <span className="ml-2 text-[10px] text-green-400 font-normal">
                                  • perso
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {amb.description}
                            </div>
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

                  <button
                    type="button"
                    onClick={() => {
                      setUploadError('')
                      setManageOpen(true)
                    }}
                    className="w-full p-2 bg-gray-900 border border-yellow-600 text-yellow-500 rounded hover:bg-gray-700 text-sm font-bold"
                  >
                    ⚙️ Gérer mes sons
                  </button>
                </>
              )}

              {manageOpen && (
                <>
                  <p className="text-gray-400 text-xs">
                    Uploade un MP3 pour remplacer le son par défaut de chaque ambiance.
                    Les fichiers sont stockés dans le bucket{' '}
                    <code className="text-yellow-500">{BUCKET}</code> de Supabase Storage.
                  </p>

                  {uploadError && (
                    <p className="text-red-400 text-xs bg-red-900/30 border border-red-800 rounded p-2">
                      {uploadError}
                    </p>
                  )}

                  <div className="space-y-3">
                    {AMBIANCES.map((amb) => {
                      const custom = customUrls[amb.id]
                      const isUploading = uploading === amb.id
                      return (
                        <div
                          key={amb.id}
                          className="p-3 rounded-lg bg-gray-900 border border-gray-700 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{amb.icon}</span>
                            <span className="font-bold text-gray-200 flex-1">{amb.label}</span>
                            {custom && (
                              <span className="text-[10px] text-green-400">• perso</span>
                            )}
                          </div>

                          <label className="block">
                            <span className="sr-only">Fichier MP3 pour {amb.label}</span>
                            <input
                              type="file"
                              accept="audio/*,.mp3"
                              disabled={isUploading}
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) onUpload(amb.id, f)
                                e.target.value = ''
                              }}
                              className="w-full text-xs text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-yellow-500 file:text-gray-900 file:font-bold hover:file:bg-yellow-400 disabled:opacity-50"
                            />
                          </label>

                          {isUploading && (
                            <p className="text-xs text-yellow-400">Envoi en cours…</p>
                          )}

                          {custom && !isUploading && (
                            <button
                              type="button"
                              onClick={() => clearCustom(amb.id)}
                              className="text-xs text-red-400 hover:text-red-300 underline"
                            >
                              Réinitialiser au son par défaut
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setManageOpen(false)}
                    className="w-full p-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    ← Retour aux ambiances
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
