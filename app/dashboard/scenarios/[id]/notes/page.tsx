'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Spinner from '@/app/components/Spinner'

// ============================================================================
// Types
// ============================================================================

type NoteEntry = {
  id: string
  titre: string
  date: string
  contenu: string
  tags: string[]
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

const AUTOSAVE_DELAY_MS = 1500

// Tags suggérés — l'utilisateur peut en taper d'autres.
const TAGS_SUGGERES = [
  { key: 'combat', label: 'Combat', icone: '⚔️', couleur: '#ef4444' },
  { key: 'social', label: 'Social', icone: '💬', couleur: '#3b82f6' },
  { key: 'exploration', label: 'Exploration', icone: '🗺️', couleur: '#22c55e' },
  { key: 'enigme', label: 'Énigme', icone: '🔍', couleur: '#a855f7' },
  { key: 'loot', label: 'Loot', icone: '💎', couleur: '#eab308' },
  { key: 'pnj', label: 'PNJ', icone: '🧑', couleur: '#f97316' },
  { key: 'pj', label: 'PJ', icone: '🎭', couleur: '#06b6d4' },
  { key: 'intrigue', label: 'Intrigue', icone: '🎭', couleur: '#ec4899' }
]

const TAG_META = new Map(TAGS_SUGGERES.map((t) => [t.key, t] as const))

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const todayIso = () => new Date().toISOString().slice(0, 10)

// Rendu markdown basique : gras **, italique *, titres #, listes -, sauts de
// ligne. Très volontairement minimaliste pour éviter une dépendance complète.
function rendreMarkdownLeger(src: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  const lignes = src.split('\n')
  const out: string[] = []
  let dansListe = false
  const fermerListe = () => {
    if (dansListe) {
      out.push('</ul>')
      dansListe = false
    }
  }
  for (const ligne of lignes) {
    const l = escape(ligne)
    // titres ### ## #
    const titreMatch = l.match(/^(#{1,3})\s+(.+)$/)
    if (titreMatch) {
      fermerListe()
      const n = titreMatch[1].length
      out.push(`<h${n + 2}>${titreMatch[2]}</h${n + 2}>`)
      continue
    }
    // liste -
    if (/^- /.test(l)) {
      if (!dansListe) {
        out.push('<ul>')
        dansListe = true
      }
      out.push(`<li>${formatInline(l.slice(2))}</li>`)
      continue
    }
    fermerListe()
    if (l.trim() === '') {
      out.push('<br/>')
    } else {
      out.push(`<p>${formatInline(l)}</p>`)
    }
  }
  fermerListe()
  return out.join('')
}

function formatInline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

// ============================================================================
// Page
// ============================================================================

export default function JournalCampagnePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const scenarioId = params?.id

  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [scenarioNom, setScenarioNom] = useState('')
  const [entries, setEntries] = useState<NoteEntry[]>([])
  const [status, setStatus] = useState<SaveStatus>('idle')

  // Filtres / vue
  const [tagFiltres, setTagFiltres] = useState<Set<string>>(new Set())
  const [recherche, setRecherche] = useState('')
  const [dateMin, setDateMin] = useState('')
  const [dateMax, setDateMax] = useState('')
  const [modeCompact, setModeCompact] = useState(false)
  const [enEdition, setEnEdition] = useState<string | null>(null)

  const entriesRef = useRef<NoteEntry[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --------------------------------------------------------------------------
  // Chargement initial
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!scenarioId) return
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data, error } = await supabase
        .from('scenarios')
        .select('id, nom, mj_id, notes_sessions')
        .eq('id', scenarioId)
        .maybeSingle()
      if (error || !data || data.mj_id !== user.id) {
        setAuthorized(false)
        setLoading(false)
        return
      }
      setAuthorized(true)
      setScenarioNom(data.nom ?? '')
      const raw = ((data.notes_sessions as NoteEntry[] | null) ?? []).map(
        normaliser
      )
      entriesRef.current = raw
      setEntries(raw)
      setLoading(false)
    }
    init()
  }, [scenarioId, router])

  // --------------------------------------------------------------------------
  // Auto-save
  // --------------------------------------------------------------------------
  const saveNow = useCallback(async () => {
    if (!scenarioId) return
    setStatus('saving')
    const { error } = await supabase
      .from('scenarios')
      .update({ notes_sessions: entriesRef.current })
      .eq('id', scenarioId)
    if (error) {
      console.error('[journal] save :', error)
      setStatus('error')
      return
    }
    setStatus('saved')
  }, [scenarioId])

  const scheduleAutosave = useCallback(() => {
    setStatus('pending')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(saveNow, AUTOSAVE_DELAY_MS)
  }, [saveNow])

  // Synchronise simplement la ref ; le déclenchement de l'autosave est fait
  // depuis les handlers de mutation pour éviter un setState dans un effet.
  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------
  const addEntry = () => {
    const nouvelle: NoteEntry = {
      id: newId(),
      titre: '',
      date: todayIso(),
      contenu: '',
      tags: []
    }
    setEntries((prev) => [nouvelle, ...prev])
    setEnEdition(nouvelle.id)
    scheduleAutosave()
  }

  const updateEntry = (id: string, patch: Partial<NoteEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
    scheduleAutosave()
  }

  const removeEntry = (id: string) => {
    if (!window.confirm('Supprimer cette entrée ?')) return
    setEntries((prev) => prev.filter((e) => e.id !== id))
    if (enEdition === id) setEnEdition(null)
    scheduleAutosave()
  }

  const togglerTagFiltre = (tag: string) => {
    setTagFiltres((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  // --------------------------------------------------------------------------
  // Calculs dérivés : filtrage + tri + statistiques
  // --------------------------------------------------------------------------
  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) => {
        if (a.date === b.date) return 0
        return a.date < b.date ? 1 : -1
      }),
    [entries]
  )

  const tagsUtilises = useMemo(() => {
    const s = new Set<string>()
    entries.forEach((e) => e.tags.forEach((t) => s.add(t)))
    return Array.from(s).sort()
  }, [entries])

  const filtered = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return sorted.filter((e) => {
      if (tagFiltres.size > 0) {
        const tagSet = new Set(e.tags)
        for (const t of tagFiltres) if (!tagSet.has(t)) return false
      }
      if (dateMin && e.date < dateMin) return false
      if (dateMax && e.date > dateMax) return false
      if (
        q &&
        !`${e.titre}\n${e.contenu}`.toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [sorted, tagFiltres, recherche, dateMin, dateMax])

  const stats = useMemo(() => {
    if (entries.length === 0) return null
    const dates = entries.map((e) => e.date).filter(Boolean).sort()
    return {
      nb: entries.length,
      premiere: dates[0] ?? null,
      derniere: dates[dates.length - 1] ?? null
    }
  }, [entries])

  // --------------------------------------------------------------------------
  // Rendu
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <Spinner label="Chargement du journal…" />
      </main>
    )
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white mb-4"
          >
            ← Retour
          </button>
          <p className="text-red-400">
            Accès refusé : seuls les MJ du scénario peuvent consulter ce journal.
          </p>
        </div>
      </main>
    )
  }

  const statusLabel = (() => {
    if (status === 'pending') return '… modifications non enregistrées'
    if (status === 'saving') return 'Enregistrement…'
    if (status === 'saved') return '✓ Enregistré'
    if (status === 'error') return '⚠︎ Erreur'
    return ''
  })()

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            ← Retour
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-yellow-500 truncate">
            📖 Journal de campagne — {scenarioNom}
          </h1>
        </div>

        {stats && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-3 text-sm text-gray-300 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              📚 <strong className="text-white">{stats.nb}</strong> session
              {stats.nb > 1 ? 's' : ''}
            </span>
            {stats.premiere && (
              <span>
                Première :{' '}
                <span className="text-gray-100">
                  {formatDateCourt(stats.premiere)}
                </span>
              </span>
            )}
            {stats.derniere && (
              <span>
                Dernière :{' '}
                <span className="text-gray-100">
                  {stats.derniere === todayIso()
                    ? "aujourd'hui"
                    : formatDateCourt(stats.derniere)}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-gray-800 rounded-lg p-3 mb-4 flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={addEntry}
            className="px-3 py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 text-sm"
          >
            + Nouvelle entrée de session
          </button>
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher dans le contenu…"
            className="px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm flex-1 min-w-[160px]"
          />
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>du</span>
            <input
              type="date"
              value={dateMin}
              onChange={(e) => setDateMin(e.target.value)}
              className="p-1 rounded bg-gray-700 border border-gray-600 outline-none text-xs text-white"
            />
            <span>au</span>
            <input
              type="date"
              value={dateMax}
              onChange={(e) => setDateMax(e.target.value)}
              className="p-1 rounded bg-gray-700 border border-gray-600 outline-none text-xs text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => setModeCompact((v) => !v)}
            className="px-2 py-1 rounded text-xs text-gray-300 hover:bg-gray-700"
            title="Basculer vue compacte / détaillée"
          >
            {modeCompact ? '🗎 Vue détaillée' : '☰ Vue compacte'}
          </button>
          <span
            className={`text-xs ml-auto ${
              status === 'error'
                ? 'text-red-400'
                : status === 'saved'
                ? 'text-green-400'
                : 'text-gray-400'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Filtres tag */}
        {(tagsUtilises.length > 0 || true) && (
          <div className="flex flex-wrap gap-1 mb-4">
            {[...new Set([...TAGS_SUGGERES.map((t) => t.key), ...tagsUtilises])].map(
              (t) => (
                <TagButton
                  key={t}
                  tag={t}
                  active={tagFiltres.has(t)}
                  onClick={() => togglerTagFiltre(t)}
                />
              )
            )}
            {tagFiltres.size > 0 && (
              <button
                type="button"
                onClick={() => setTagFiltres(new Set())}
                className="text-xs text-gray-400 hover:text-white px-2 py-1"
              >
                ✕ Réinitialiser
              </button>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm italic">
            {entries.length === 0
              ? 'Aucune entrée. Crée ta première note de session.'
              : 'Aucune entrée ne correspond aux filtres.'}
          </p>
        ) : (
          // Timeline verticale
          <div className="relative pl-6">
            <div
              className="absolute left-2 top-0 bottom-0 w-px"
              style={{ background: 'rgba(201,168,76,0.25)' }}
            />
            <div className="space-y-4">
              {filtered.map((entry) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  compact={modeCompact}
                  enEdition={enEdition === entry.id}
                  onEdit={() => setEnEdition(entry.id)}
                  onCloseEdit={() => setEnEdition(null)}
                  onUpdate={(patch) => updateEntry(entry.id, patch)}
                  onRemove={() => removeEntry(entry.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

// ============================================================================
// TimelineEntry
// ============================================================================

function TimelineEntry({
  entry,
  compact,
  enEdition,
  onEdit,
  onCloseEdit,
  onUpdate,
  onRemove
}: {
  entry: NoteEntry
  compact: boolean
  enEdition: boolean
  onEdit: () => void
  onCloseEdit: () => void
  onUpdate: (patch: Partial<NoteEntry>) => void
  onRemove: () => void
}) {
  const [draftTag, setDraftTag] = useState('')

  const ajouterTag = (t: string) => {
    const clean = t.trim().toLowerCase()
    if (!clean) return
    if (entry.tags.includes(clean)) return
    onUpdate({ tags: [...entry.tags, clean] })
    setDraftTag('')
  }
  const retirerTag = (t: string) => {
    onUpdate({ tags: entry.tags.filter((x) => x !== t) })
  }

  return (
    <div className="relative">
      {/* Pastille sur la ligne */}
      <div
        className="absolute -left-[18px] top-3 w-3 h-3 rounded-full ring-2 ring-gray-900"
        style={{ background: '#c9a84c' }}
        aria-hidden="true"
      />
      <article
        className="bg-gray-800 border rounded-lg p-3 md:p-4"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {enEdition ? (
          <div className="space-y-2">
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="date"
                value={entry.date}
                onChange={(e) => onUpdate({ date: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
              />
              <input
                type="text"
                value={entry.titre}
                onChange={(e) => onUpdate({ titre: e.target.value })}
                placeholder="Titre de la session"
                className="flex-1 p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm font-bold"
                autoFocus
              />
              <button
                type="button"
                onClick={onCloseEdit}
                className="px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-white"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="text-red-400 hover:text-red-300 text-xs px-2"
                aria-label="Supprimer"
              >
                🗑
              </button>
            </div>

            <div className="flex flex-wrap gap-1 items-center">
              {entry.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded"
                  style={tagStyle(t)}
                >
                  {tagIcone(t)} {tagLabel(t)}
                  <button
                    type="button"
                    onClick={() => retirerTag(t)}
                    className="opacity-80 hover:opacity-100 ml-0.5"
                    aria-label="Retirer le tag"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                list={`tag-suggest-${entry.id}`}
                value={draftTag}
                onChange={(e) => setDraftTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    ajouterTag(draftTag)
                  }
                }}
                onBlur={() => draftTag && ajouterTag(draftTag)}
                placeholder="+ tag…"
                className="text-[11px] p-1 rounded bg-gray-700 text-white border border-gray-600 outline-none w-20"
              />
              <datalist id={`tag-suggest-${entry.id}`}>
                {TAGS_SUGGERES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </datalist>
            </div>

            <textarea
              value={entry.contenu}
              onChange={(e) => onUpdate({ contenu: e.target.value })}
              placeholder="Notes de session… (markdown : **gras**, *italique*, # titre, - liste)"
              className="w-full p-3 rounded bg-gray-900 text-white border border-gray-700 outline-none text-sm leading-relaxed min-h-[200px] resize-y"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="w-full text-left group"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-xs text-gray-400 font-mono">
                  {formatDateCourt(entry.date)}
                </span>
                <h3 className="text-base font-bold text-white truncate">
                  {entry.titre || 'Sans titre'}
                </h3>
              </div>
              <span className="text-gray-500 group-hover:text-gray-300 text-xs">
                ✎ Éditer
              </span>
            </div>
            {entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-1.5 py-0.5 rounded"
                    style={tagStyle(t)}
                  >
                    {tagIcone(t)} {tagLabel(t)}
                  </span>
                ))}
              </div>
            )}
            {entry.contenu &&
              (compact ? (
                <p className="text-sm text-gray-400 line-clamp-2">
                  {entry.contenu}
                </p>
              ) : (
                <div
                  className="markdown-light text-sm text-gray-200 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: rendreMarkdownLeger(entry.contenu)
                  }}
                />
              ))}
          </button>
        )}
      </article>
    </div>
  )
}

// ============================================================================
// TagButton
// ============================================================================

function TagButton({
  tag,
  active,
  onClick
}: {
  tag: string
  active: boolean
  onClick: () => void
}) {
  const meta = TAG_META.get(tag)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded transition border ${
        active
          ? 'text-white'
          : 'text-gray-300 hover:text-white border-transparent hover:border-gray-600'
      }`}
      style={
        active
          ? {
              background: `${meta?.couleur ?? '#6b7280'}33`,
              borderColor: meta?.couleur ?? '#6b7280'
            }
          : undefined
      }
    >
      {meta?.icone ?? '🏷️'} {meta?.label ?? tag}
    </button>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function normaliser(e: NoteEntry): NoteEntry {
  return {
    id: e.id,
    titre: e.titre ?? '',
    date: e.date ?? todayIso(),
    contenu: e.contenu ?? '',
    tags: Array.isArray(e.tags) ? e.tags : []
  }
}

function formatDateCourt(iso: string): string {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  if (!m || !d) return iso
  return `${d}/${m}`
}

function tagLabel(t: string) {
  return TAG_META.get(t)?.label ?? t
}
function tagIcone(t: string) {
  return TAG_META.get(t)?.icone ?? '🏷️'
}
function tagStyle(t: string): React.CSSProperties {
  const c = TAG_META.get(t)?.couleur ?? '#6b7280'
  return {
    background: `${c}22`,
    color: c,
    border: `1px solid ${c}55`
  }
}
