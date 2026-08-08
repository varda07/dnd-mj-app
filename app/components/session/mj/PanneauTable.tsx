'use client'

// « Ma table » — colonne DROITE du cockpit MJ (Delta C.3)
// ----------------------------------------------------------------------------
// TOUJOURS visible, jamais masquée : une carte compacte par PJ — pastille de
// connexion, nom, CA, barre de PV avec valeurs exactes, ressources,
// concentration, boutons −5 / +5 et saisie libre. Toute modification part
// immédiatement sur l'écran du joueur (character_live_state + Realtime).
// Alerte visuelle nette à 0 PV.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchParticipants } from '@/app/lib/session'
import {
  fetchAllLiveStates,
  logSessionEvent,
  patchLiveState,
  type CharacterLiveState
} from '@/app/lib/session-live'
import { CONDITIONS_MAP } from '@/app/data/conditions'
import { ouvrirCanal, useSessionPresence } from '@/app/lib/session-realtime'
import PastillesUsage from '@/app/components/ui/PastillesUsage'

type Perso = { id: string; nom: string; image_url: string | null; hp_max: number; ca: number | null }
type Ligne = {
  userId: string
  perso: Perso
  live: CharacterLiveState | null
  connecte: boolean
}

export default function PanneauTable({ sessionId }: { sessionId: string }) {
  const [lignes, setLignes] = useState<Ligne[]>([])
  const [mjId, setMjId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saisie, setSaisie] = useState<Record<string, string>>({})

  // Même salon de présence que la page MJ : un seul canal, partagé et compté
  // par références (cf. session-realtime). Ouvrir un second canal sur ce topic
  // faisait lever `.on('presence')` et coupait le canal de la page.
  const enLigne = useSessionPresence(sessionId, mjId, 'mj')

  const charger = useCallback(async () => {
    const parts = (await fetchParticipants(sessionId)).filter(
      (p) => p.role === 'joueur' && p.character_id
    )
    const ids = parts.map((p) => p.character_id as string)
    let persos: Perso[] = []
    if (ids.length) {
      const { data } = await supabase
        .from('personnages')
        .select('id, nom, image_url, hp_max, ca')
        .in('id', ids)
      persos = (data ?? []) as Perso[]
    }
    const lives = await fetchAllLiveStates(sessionId)
    const liveByChar = new Map(lives.map((l) => [l.character_id, l]))
    const rows: Ligne[] = parts
      .map((p) => {
        const perso = persos.find((x) => x.id === p.character_id)
        if (!perso) return null
        return {
          userId: p.user_id,
          perso,
          live: liveByChar.get(perso.id) ?? null,
          connecte: false
        }
      })
      .filter((x): x is Ligne => x !== null)
    setLignes(rows)
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMjId(data.user?.id ?? null))
    void charger()
    return ouvrirCanal(`session-table:${sessionId}`, (c) =>
      c
        .on('postgres_changes', { event: '*', schema: 'public', table: 'character_live_state', filter: `session_id=eq.${sessionId}` }, () => void charger())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionId}` }, () => void charger())
    )
  }, [sessionId, charger])

  const modifierHp = async (l: Ligne, delta: number) => {
    const max = l.live?.max_hp_override ?? l.perso.hp_max
    const from = l.live?.current_hp ?? l.perso.hp_max
    const to = Math.max(0, Math.min(max, from + delta))
    await patchLiveState(sessionId, l.perso.id, { current_hp: to }, mjId)
    await logSessionEvent(sessionId, 'hp_change', { delta, from, to, par: 'mj', cible: l.perso.nom }, l.perso.id)
  }

  const appliquerSaisie = async (l: Ligne, signe: 1 | -1) => {
    const n = parseInt((saisie[l.perso.id] ?? '').replace(/[^0-9]/g, ''), 10)
    if (!n) return
    await modifierHp(l, signe * n)
    setSaisie((s) => ({ ...s, [l.perso.id]: '' }))
  }

  const majRessource = async (l: Ligne, key: string, delta: number) => {
    const res = { ...(l.live?.class_resources_used ?? {}) }
    const r = res[key]
    if (!r) return
    res[key] = { ...r, used: Math.max(0, Math.min(r.max, r.used + delta)) }
    await patchLiveState(sessionId, l.perso.id, { class_resources_used: res }, mjId)
  }

  if (loading) return <p className="text-stone-500 text-xs italic">Chargement de la table…</p>
  if (lignes.length === 0)
    return <p className="text-stone-500 text-xs italic">Aucun joueur avec un personnage dans cette session.</p>

  return (
    <div className="space-y-2">
      {lignes.map((l) => {
        const max = l.live?.max_hp_override ?? l.perso.hp_max
        const hp = l.live?.current_hp ?? l.perso.hp_max
        const pct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0
        const ko = hp <= 0
        const connecte = enLigne.has(l.userId)
        const conds = l.live?.conditions ?? []
        const res = l.live?.class_resources_used ?? {}
        return (
          <div key={l.perso.id} className={`rounded-lg border p-2 ${ko ? 'border-red-500 ring-1 ring-red-500/50' : 'border-yellow-800/30'}`}
            style={{ background: ko ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.3)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: connecte ? '#22c55e' : '#57534e' }}
                title={connecte ? 'En ligne' : 'Hors ligne'} />
              {l.perso.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.perso.image_url} alt={l.perso.nom} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-yellow-500 text-[9px] font-bold flex-shrink-0">
                  {l.perso.nom.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="flex-1 min-w-0 text-yellow-100 font-bold text-xs truncate">{l.perso.nom}</span>
              <span className="text-stone-500 text-[10px] flex-shrink-0">CA {l.perso.ca ?? '—'}</span>
              {l.live?.concentration_spell && (
                <span className="text-cyan-300 text-[10px] flex-shrink-0" title={`Concentration : ${l.live.concentration_spell}`}>🌀</span>
              )}
            </div>

            {ko && <p className="text-red-300 text-[10px] font-bold animate-pulse mb-1">⚠ À TERRE — 0 PV</p>}

            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-stone-500">PV</span>
              <span className={`text-xs font-bold ${ko ? 'text-red-300' : 'text-yellow-100'}`}>
                {hp}/{max}{(l.live?.temp_hp ?? 0) > 0 && <span className="text-cyan-300"> +{l.live?.temp_hp}</span>}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
              <div className="h-full" style={{ width: `${pct}%`, background: ko ? '#ef4444' : pct <= 25 ? '#fb923c' : '#4ade80' }} />
            </div>

            <div className="flex items-center gap-1 mt-1.5">
              <button type="button" onClick={() => modifierHp(l, -5)}
                className="flex-1 py-0.5 rounded bg-red-900/40 border border-red-800/40 text-red-200 text-[11px] font-bold">−5</button>
              <button type="button" onClick={() => modifierHp(l, 5)}
                className="flex-1 py-0.5 rounded bg-green-900/40 border border-green-800/40 text-green-200 text-[11px] font-bold">+5</button>
              <input value={saisie[l.perso.id] ?? ''} onChange={(e) => setSaisie((s) => ({ ...s, [l.perso.id]: e.target.value }))}
                inputMode="numeric" placeholder="±" aria-label={`Montant pour ${l.perso.nom}`}
                className="w-9 bg-stone-900/60 border border-yellow-800/30 rounded px-1 py-0.5 text-[11px] text-center text-gray-200 outline-none" />
              <button type="button" onClick={() => appliquerSaisie(l, -1)} className="px-1 py-0.5 rounded bg-stone-800 text-red-300 text-[11px]">−</button>
              <button type="button" onClick={() => appliquerSaisie(l, 1)} className="px-1 py-0.5 rounded bg-stone-800 text-green-300 text-[11px]">+</button>
            </div>

            {conds.length > 0 && (
              <div className="flex flex-wrap gap-0.5 mt-1.5">
                {conds.map((c) => (
                  <span key={c} className="text-[9px] px-1 py-0.5 rounded-full bg-red-900/30 border border-red-800/40 text-red-200">
                    {CONDITIONS_MAP[c as keyof typeof CONDITIONS_MAP]?.nom ?? c}
                  </span>
                ))}
              </div>
            )}

            {Object.keys(res).length > 0 && (
              <div className="mt-1.5 space-y-1">
                {Object.entries(res).map(([key, r]) => (
                  <div key={key} className="flex items-center gap-1 text-[10px]">
                    <span className="text-stone-500 flex-1 truncate">{r.label ?? key}</span>
                    <PastillesUsage
                      max={r.max}
                      used={r.used}
                      couleur="#a78bfa"
                      taille={8}
                      label={r.label ?? key}
                      onConsommer={() => majRessource(l, key, 1)}
                      onRestituer={() => majRessource(l, key, -1)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
