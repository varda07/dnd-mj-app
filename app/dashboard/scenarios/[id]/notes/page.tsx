'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type NoteEntry = {
  id: string
  titre: string
  date: string
  contenu: string
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

const AUTOSAVE_DELAY_MS = 2000

export default function NotesSessionPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const scenarioId = params?.id

  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [scenarioNom, setScenarioNom] = useState('')
  const [entries, setEntries] = useState<NoteEntry[]>([])
  const [status, setStatus] = useState<SaveStatus>('idle')

  const entriesRef = useRef<NoteEntry[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedRef = useRef<NoteEntry[] | null>(null)

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
      if (error || !data) {
        setAuthorized(false)
        setLoading(false)
        return
      }
      if (data.mj_id !== user.id) {
        setAuthorized(false)
        setLoading(false)
        return
      }
      setAuthorized(true)
      setScenarioNom(data.nom ?? '')
      const raw = (data.notes_sessions as NoteEntry[] | null) ?? []
      loadedRef.current = raw
      entriesRef.current = raw
      setEntries(raw)
      setLoading(false)
    }
    init()
  }, [scenarioId, router])

  const saveNow = useCallback(async () => {
    if (!scenarioId) return
    setStatus('saving')
    const { error } = await supabase
      .from('scenarios')
      .update({ notes_sessions: entriesRef.current })
      .eq('id', scenarioId)
    if (error) {
      console.error('[notes] save échec :', error)
      setStatus('error')
      return
    }
    setStatus('saved')
  }, [scenarioId])

  const scheduleAutosave = useCallback(() => {
    setStatus('pending')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveNow()
    }, AUTOSAVE_DELAY_MS)
  }, [saveNow])

  useEffect(() => {
    entriesRef.current = entries
    if (loadedRef.current === null) return
    if (entries === loadedRef.current) return
    scheduleAutosave()
  }, [entries, scheduleAutosave])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const todayIso = () => new Date().toISOString().slice(0, 10)

  const addEntry = () => {
    const nouvelle: NoteEntry = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      titre: '',
      date: todayIso(),
      contenu: ''
    }
    setEntries((prev) => [nouvelle, ...prev])
  }

  const updateEntry = (id: string, patch: Partial<NoteEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const removeEntry = (id: string) => {
    if (!window.confirm('Supprimer cette entrée ?')) return
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const statusLabel = () => {
    if (status === 'pending') return '… modifications non enregistrées'
    if (status === 'saving') return 'Enregistrement…'
    if (status === 'saved') return '✓ Enregistré'
    if (status === 'error') return '⚠︎ Erreur de sauvegarde'
    return ''
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400">Chargement…</p>
      </main>
    )
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => router.push('/dashboard/scenarios')}
            className="text-gray-400 hover:text-white mb-4"
          >
            ← Retour
          </button>
          <p className="text-red-400">
            Accès refusé : seuls les MJ du scénario peuvent consulter ces notes.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard/scenarios')}
            className="text-gray-400 hover:text-white"
          >
            ← Retour
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-yellow-500 truncate">
            📝 Notes — {scenarioNom}
          </h1>
        </div>

        <div className="flex items-center justify-between mb-4 gap-2">
          <button
            type="button"
            onClick={addEntry}
            className="px-4 py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 text-sm"
          >
            + Nouvelle entrée
          </button>
          <span
            className={`text-xs ${
              status === 'error'
                ? 'text-red-400'
                : status === 'saved'
                ? 'text-green-400'
                : 'text-gray-400'
            }`}
          >
            {statusLabel()}
          </span>
        </div>

        {entries.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune note. Crée ta première entrée.</p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4 space-y-2"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <input
                    type="date"
                    value={entry.date}
                    onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                    className="p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={entry.titre}
                    onChange={(e) => updateEntry(entry.id, { titre: e.target.value })}
                    placeholder="Titre de la session"
                    className="flex-1 p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="text-red-400 hover:text-red-300 text-sm px-2"
                    aria-label="Supprimer l'entrée"
                  >
                    🗑 Supprimer
                  </button>
                </div>
                <textarea
                  value={entry.contenu}
                  onChange={(e) => updateEntry(entry.id, { contenu: e.target.value })}
                  placeholder="Notes de session…"
                  className="w-full p-3 rounded bg-gray-900 text-white border border-gray-700 outline-none text-sm leading-relaxed min-h-[240px] resize-y"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
