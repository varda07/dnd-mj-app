'use client'

// ============================================================================
// Roadmap Modes 1.6 — Mode auto ambiance sonore
// ----------------------------------------------------------------------------
// Charge la bibliothèque sons_user du MJ. Selon le contexte (combat actif,
// exploration, pause, boss), joue un son aléatoire de la catégorie adaptée.
// Mode auto / manuel + volume + fade.
//
// Le son est joué LOCALEMENT côté MJ (HTMLAudio). Pour pousser aux joueurs,
// utilise l'URL via le champ lieu_son du etat_presentation (UI existante).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Son = { id: string; categorie: string; nom: string; url: string; volume: number }
type Mode = 'off' | 'auto' | 'manuel'

const CATEGORIE_PAR_CONTEXTE: Record<string, string> = {
  combat: 'combat',
  combat_boss: 'boss',
  exploration: 'exploration',
  dialogue: 'dialogue',
  pause: 'repos',
  city: 'city',
  nature: 'nature',
  dungeon: 'dungeon',
  horror: 'horror',
  suspense: 'suspense',
}

const CATEGORIES_RAPIDES: Array<{ key: string; label: string; icon: string }> = [
  { key: 'combat',      label: 'Combat',      icon: '⚔️' },
  { key: 'exploration', label: 'Exploration', icon: '🗺' },
  { key: 'dialogue',    label: 'Dialogue',    icon: '💬' },
  { key: 'suspense',    label: 'Suspense',    icon: '🎭' },
  { key: 'repos',       label: 'Repos',       icon: '🛏' },
  { key: 'boss',        label: 'Boss',        icon: '🐉' },
]

export default function AmbianceSonoreAuto({
  contexte,
}: {
  /** 'combat' | 'combat_boss' | 'exploration' | 'pause' | 'dialogue' | etc. */
  contexte: string
}) {
  const [mode, setMode] = useState<Mode>('off')
  const [bibliotheque, setBibliotheque] = useState<Son[]>([])
  const [enCours, setEnCours] = useState<Son | null>(null)
  const [volume, setVolume] = useState(60)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Charge la bibliothèque
  useEffect(() => {
    let cancel = false
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancel) return
      const { data } = await supabase
        .from('sons_user').select('id, categorie, nom, url, volume').eq('user_id', user.id)
      if (cancel) return
      setBibliotheque((data ?? []) as Son[])
    })()
    return () => { cancel = true }
  }, [])

  // Crée l'audio element une fois
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.loop = true
    audioRef.current.preload = 'auto'
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  // Volume sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100
  }, [volume])

  const fadeAndPlay = useCallback((son: Son | null) => {
    const audio = audioRef.current
    if (!audio) return
    if (!son) {
      audio.pause()
      setEnCours(null)
      return
    }
    if (enCours?.id === son.id) return
    // Fade out simple : on coupe direct (la transition fade smooth nécessite
    // un setInterval — on garde simple ici).
    audio.pause()
    audio.src = son.url
    audio.volume = volume / 100
    audio.play().catch(() => { /* autoplay bloqué : nécessite un user click */ })
    setEnCours(son)
  }, [enCours, volume])

  const sonAleatoirePourCategorie = useCallback((cat: string): Son | null => {
    const filtres = bibliotheque.filter((s) => s.categorie === cat)
    if (filtres.length === 0) return null
    return filtres[Math.floor(Math.random() * filtres.length)]
  }, [bibliotheque])

  // Auto mode : suit le contexte
  useEffect(() => {
    if (mode !== 'auto') return
    const cat = CATEGORIE_PAR_CONTEXTE[contexte] ?? 'exploration'
    const choisi = sonAleatoirePourCategorie(cat)
    fadeAndPlay(choisi)
  }, [mode, contexte, sonAleatoirePourCategorie, fadeAndPlay])

  const jouerCategorie = (cat: string) => {
    setMode('manuel')
    fadeAndPlay(sonAleatoirePourCategorie(cat))
  }

  const stop = () => {
    setMode('off')
    fadeAndPlay(null)
  }

  const setModeAuto = () => {
    if (bibliotheque.length === 0) return
    setMode('auto')
  }

  return (
    <div className="codex-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-yellow-500 font-bold">
          🎵 Ambiance sonore
        </span>
        {bibliotheque.length === 0 && (
          <a href="/dashboard/sons" className="text-[10px] text-yellow-300 underline">
            Construire ma bibliothèque
          </a>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <button type="button" onClick={setModeAuto}
          disabled={bibliotheque.length === 0}
          className={`text-xs px-2 py-1 rounded border ${
            mode === 'auto' ? 'bg-green-500/20 border-green-400/50 text-green-200' : 'bg-gray-800 border-gray-700 text-gray-300'
          } disabled:opacity-40`}
          title="Suit automatiquement le contexte (combat → musique combat, etc.)"
        >
          {mode === 'auto' ? '● Mode auto actif' : 'Mode auto'}
        </button>
        <button type="button" onClick={stop} disabled={mode === 'off'}
          className="text-xs px-2 py-1 rounded border bg-gray-800 border-gray-700 text-gray-300 disabled:opacity-40"
        >⏹ Stop</button>
      </div>

      {bibliotheque.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES_RAPIDES.map((c) => {
              const has = bibliotheque.some((s) => s.categorie === c.key)
              return (
                <button key={c.key} type="button" onClick={() => jouerCategorie(c.key)} disabled={!has}
                  className={`text-[11px] px-2 py-0.5 rounded border ${
                    enCours && enCours.categorie === c.key
                      ? 'bg-yellow-500/20 border-yellow-400 text-yellow-200'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-yellow-500/40'
                  } disabled:opacity-30`}
                  title={has ? `Jouer un son ${c.label}` : `Aucun son ${c.label} — ajoute-en`}
                >
                  {c.icon} {c.label}
                </button>
              )
            })}
          </div>

          {enCours && (
            <div className="text-[10px] text-gray-400 italic">
              ▶ {enCours.nom}
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span>Vol</span>
            <input type="range" min={0} max={100} value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="flex-1 accent-yellow-500"
            />
            <span className="tabular-nums w-7 text-right">{volume}</span>
          </div>
        </>
      )}
    </div>
  )
}
