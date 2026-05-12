'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useFavoris, type FavoriType } from '@/app/lib/favoris'
import { WIDGETS_BY_TYPE, type WidgetType } from '@/app/lib/widgets'

// ============================================================================
// WidgetRender — affiche le contenu d'un widget par type. Chaque widget est
// volontairement compact : il sert de "raccourci visuel", le détail vit dans
// sa page dédiée (cliquer ouvre la page complète).
// ============================================================================

export default function WidgetRender({ type }: { type: WidgetType }) {
  const meta = WIDGETS_BY_TYPE[type]
  if (!meta) {
    return <Header icone="❓" label={type} />
  }
  switch (type) {
    case 'derniers_jets':    return <DerniersJets />
    case 'stats_persos':     return <StatsPersos />
    case 'notes_rapides':    return <NotesRapides />
    case 'quetes_actives':   return <QuetesActives />
    case 'liste_persos':     return <ListePersos />
    case 'liste_ennemis':    return <ListeEnnemis />
    case 'timer_session':    return <TimerSession />
    case 'favoris':          return <FavorisWidget />
    case 'sound_box':        return <SoundBoxWidget />
    case 'combat':           return <CombatWidget />
    case 'carte_mentale':    return <Placeholder icone={meta.icone} label={meta.label} href="/dashboard/scenarios" desc="Ouvre la carte mentale" />
    case 'inventaire':       return <Placeholder icone={meta.icone} label={meta.label} href="/dashboard/items" desc="Voir l'inventaire complet" />
    case 'mini_carte':       return <Placeholder icone={meta.icone} label={meta.label} href="/dashboard/maps" desc="Ouvrir les cartes" />
    case 'journal_campagne': return <Placeholder icone={meta.icone} label={meta.label} href="/dashboard/scenarios" desc="Journal de campagne" />
    default:                 return <Header icone={meta.icone} label={meta.label} />
  }
}

// ----------------------------------------------------------------------------
// Sous-composants
// ----------------------------------------------------------------------------

function Header({ icone, label, sub }: { icone: string; label: string; sub?: string }) {
  return (
    <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2 border-b border-[rgba(201,168,76,0.10)]">
      <span className="text-base leading-none">{icone}</span>
      <span
        className="uppercase tracking-[0.22em] text-[#C9A84C] font-bold"
        style={{ fontSize: 9 }}
      >
        {label}
      </span>
      {sub && <span className="text-[10px] text-gray-500 ml-auto truncate">{sub}</span>}
    </div>
  )
}

function Placeholder({
  icone,
  label,
  href,
  desc
}: {
  icone: string
  label: string
  href: string
  desc: string
}) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="w-full h-full flex flex-col text-left"
    >
      <Header icone={icone} label={label} />
      <div className="flex-1 flex items-center justify-center p-3">
        <p className="text-xs text-gray-400 italic text-center">{desc}</p>
      </div>
    </button>
  )
}

// ---- Derniers jets ----
function DerniersJets() {
  const [jets, setJets] = useState<Array<{ id: string; type_de: string; resultats: number[] }>>([])
  useEffect(() => {
    let cancel = false
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('jets_de_des')
        .select('id, type_de, resultats')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (!cancel) setJets((data ?? []) as typeof jets)
    }
    load()
    return () => {
      cancel = true
    }
  }, [])
  return (
    <div className="flex flex-col h-full">
      <Header icone="🎲" label="Derniers jets" />
      <div className="flex-1 p-2 space-y-1 overflow-y-auto [scrollbar-width:thin]">
        {jets.length === 0 ? (
          <p className="text-[11px] text-gray-500 italic text-center py-2">Aucun jet</p>
        ) : (
          jets.map((j) => {
            const total = j.resultats.reduce((a, b) => a + b, 0)
            return (
              <div
                key={j.id}
                className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-gray-900/50"
              >
                <span className="text-gray-300">{j.type_de}</span>
                <span className="text-yellow-400 font-bold">{total}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ---- Stats persos ----
function StatsPersos() {
  const router = useRouter()
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    let cancel = false
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count: c } = await supabase
        .from('personnages')
        .select('id', { count: 'exact', head: true })
        .eq('joueur_id', user.id)
      if (!cancel) setCount(c ?? 0)
    }
    load()
    return () => {
      cancel = true
    }
  }, [])
  return (
    <button
      type="button"
      onClick={() => router.push('/dashboard/personnages')}
      className="w-full h-full flex flex-col text-left"
    >
      <Header icone="📊" label="Stats persos" />
      <div className="flex-1 flex flex-col items-center justify-center p-2">
        <p
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 32,
            color: '#f5f2e8',
            lineHeight: 1
          }}
        >
          {count ?? '…'}
        </p>
        <p className="text-[10px] text-gray-500 italic mt-1">
          personnage{(count ?? 0) > 1 ? 's' : ''}
        </p>
      </div>
    </button>
  )
}

// ---- Notes rapides (localStorage) ----
function NotesRapides() {
  const KEY = 'codex-notes-rapides'
  const [val, setVal] = useState('')
  useEffect(() => {
    // Lecture localStorage côté client uniquement → légitime sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVal(window.localStorage.getItem(KEY) ?? '')
  }, [])
  return (
    <div className="flex flex-col h-full">
      <Header icone="📜" label="Notes rapides" sub="local" />
      <textarea
        value={val}
        onChange={(e) => {
          setVal(e.target.value)
          try {
            window.localStorage.setItem(KEY, e.target.value)
          } catch {
            /* ignore */
          }
        }}
        placeholder="Mémo libre…"
        className="flex-1 w-full p-2 bg-transparent text-xs text-gray-200 outline-none resize-none"
      />
    </div>
  )
}

// ---- Quêtes actives ----
function QuetesActives() {
  const router = useRouter()
  const [quetes, setQuetes] = useState<Array<{ id: string; titre: string; scenario_id: string }>>([])
  useEffect(() => {
    let cancel = false
    const load = async () => {
      const { data } = await supabase
        .from('quetes')
        .select('id, titre, scenario_id')
        .eq('status', 'active')
        .limit(8)
      if (!cancel) setQuetes((data ?? []) as typeof quetes)
    }
    load()
    return () => {
      cancel = true
    }
  }, [])
  return (
    <div className="flex flex-col h-full">
      <Header icone="📅" label="Quêtes actives" sub={`${quetes.length}`} />
      <div className="flex-1 p-2 space-y-1 overflow-y-auto [scrollbar-width:thin]">
        {quetes.length === 0 ? (
          <p className="text-[11px] text-gray-500 italic text-center py-2">
            Aucune quête active
          </p>
        ) : (
          quetes.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() =>
                router.push(`/dashboard/scenarios/${q.scenario_id}/quetes`)
              }
              className="block w-full text-left text-[11px] px-2 py-1 rounded hover:bg-yellow-500/10 text-gray-200 truncate"
            >
              🎯 {q.titre}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ---- Liste persos ----
function ListePersos() {
  const router = useRouter()
  const [persos, setPersos] = useState<Array<{ id: string; nom: string; hp_actuel: number; hp_max: number }>>([])
  useEffect(() => {
    let cancel = false
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: scenarios } = await supabase
        .from('scenarios')
        .select('id')
        .eq('mj_id', user.id)
      const ids = (scenarios ?? []).map((s: { id: string }) => s.id)
      if (ids.length === 0) {
        if (!cancel) setPersos([])
        return
      }
      const { data } = await supabase
        .from('personnages')
        .select('id, nom, hp_actuel, hp_max')
        .in('scenario_id', ids)
        .order('nom')
        .limit(10)
      if (!cancel) setPersos((data ?? []) as typeof persos)
    }
    load()
    return () => {
      cancel = true
    }
  }, [])
  return (
    <div className="flex flex-col h-full">
      <Header icone="🧙" label="Persos" sub={`${persos.length}`} />
      <div className="flex-1 p-2 space-y-1 overflow-y-auto [scrollbar-width:thin]">
        {persos.length === 0 ? (
          <p className="text-[11px] text-gray-500 italic text-center py-2">Aucun</p>
        ) : (
          persos.map((p) => {
            const r = Math.max(0, Math.min(1, p.hp_actuel / Math.max(1, p.hp_max)))
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => router.push(`/dashboard/personnages/${p.id}`)}
                className="w-full text-left px-2 py-1 rounded hover:bg-yellow-500/10"
              >
                <div className="flex items-center justify-between text-[11px] text-gray-200">
                  <span className="truncate">{p.nom}</span>
                  <span className="text-gray-500 text-[10px]">
                    {p.hp_actuel}/{p.hp_max}
                  </span>
                </div>
                <div className="h-1 bg-gray-900 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${r * 100}%`,
                      background: r > 0.5 ? '#22c55e' : r > 0.25 ? '#eab308' : '#ef4444'
                    }}
                  />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ---- Liste ennemis ----
function ListeEnnemis() {
  const router = useRouter()
  const [ennemis, setEnnemis] = useState<Array<{ id: string; nom: string }>>([])
  useEffect(() => {
    let cancel = false
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('ennemis')
        .select('id, nom')
        .eq('mj_id', user.id)
        .order('nom')
        .limit(10)
      if (!cancel) setEnnemis((data ?? []) as typeof ennemis)
    }
    load()
    return () => {
      cancel = true
    }
  }, [])
  return (
    <div className="flex flex-col h-full">
      <Header icone="👹" label="Ennemis" sub={`${ennemis.length}`} />
      <div className="flex-1 p-2 space-y-1 overflow-y-auto [scrollbar-width:thin]">
        {ennemis.length === 0 ? (
          <p className="text-[11px] text-gray-500 italic text-center py-2">Aucun</p>
        ) : (
          ennemis.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => router.push('/dashboard/ennemis')}
              className="block w-full text-left text-[11px] px-2 py-1 rounded hover:bg-yellow-500/10 text-gray-200 truncate"
            >
              {e.nom}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ---- Timer session ----
function TimerSession() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])
  const format = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h}h ${m.toString().padStart(2, '0')}m ${sec.toString().padStart(2, '0')}s`
  }
  return (
    <div className="flex flex-col h-full">
      <Header icone="⏱" label="Timer session" />
      <div className="flex-1 flex flex-col items-center justify-center p-2 gap-2">
        <p
          style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#f5f2e8' }}
        >
          {format(seconds)}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRunning((v) => !v)}
            className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-yellow-500 text-gray-900 font-bold"
          >
            {running ? 'Pause' : 'Démarrer'}
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false)
              setSeconds(0)
            }}
            className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-gray-700 text-white"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Favoris ----
function FavorisWidget() {
  const { favoris } = useFavoris()
  const router = useRouter()
  const total = (Object.keys(favoris) as FavoriType[]).reduce(
    (n, k) => n + (favoris[k]?.length ?? 0),
    0
  )
  return (
    <button
      type="button"
      onClick={() => router.push('/dashboard')}
      className="w-full h-full flex flex-col text-left"
    >
      <Header icone="🌟" label="Favoris" />
      <div className="flex-1 flex flex-col items-center justify-center p-2">
        <p
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 32,
            color: '#f5f2e8',
            lineHeight: 1
          }}
        >
          {total}
        </p>
        <p className="text-[10px] text-gray-500 italic mt-1">épinglé{total > 1 ? 's' : ''}</p>
      </div>
    </button>
  )
}

// ---- Sound Box ----
function SoundBoxWidget() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('soundbox:open'))}
      className="w-full h-full flex flex-col text-left"
    >
      <Header icone="🎵" label="Sound Box" />
      <div className="flex-1 flex items-center justify-center p-2">
        <p className="text-xs text-gray-400 italic text-center">
          Cliquer pour ouvrir
        </p>
      </div>
    </button>
  )
}

// ---- Combat ----
function CombatWidget() {
  const router = useRouter()
  const [info, setInfo] = useState<{ round: number; tour: number; actif: boolean } | null>(null)
  useEffect(() => {
    let cancel = false
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: scn } = await supabase
        .from('scenarios')
        .select('id')
        .eq('mj_id', user.id)
        .eq('actif', true)
        .maybeSingle()
      if (!scn) {
        if (!cancel) setInfo(null)
        return
      }
      const { data } = await supabase
        .from('combats')
        .select('round, tour_actuel, actif')
        .eq('scenario_id', scn.id)
        .maybeSingle()
      if (!cancel)
        setInfo(
          data
            ? { round: data.round, tour: data.tour_actuel, actif: data.actif }
            : null
        )
    }
    load()
    return () => {
      cancel = true
    }
  }, [])
  return (
    <button
      type="button"
      onClick={() => router.push('/dashboard/combat')}
      className="w-full h-full flex flex-col text-left"
    >
      <Header icone="⚔️" label="Combat" />
      <div className="flex-1 flex items-center justify-center p-2">
        {info?.actif ? (
          <div className="text-center">
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#fca5a5' }}>
              Round {info.round}
            </p>
            <p className="text-[10px] text-gray-400 italic mt-1">tour {info.tour + 1}</p>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic text-center">
            Aucun combat actif
          </p>
        )}
      </div>
    </button>
  )
}
