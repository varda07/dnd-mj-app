'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap 8.4 — Memo board pour MJ
// ----------------------------------------------------------------------------
// Liste de pense-bête cochables par scénario (« Le PNJ X a promis Y »,
// « Surprise prévue à la session 5 », « Récompense en attente : Z »…).
// Table : memos_mj (cf. migration 20260515040000_roadmap_phase8).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Memo = { id: string; texte: string; fait: boolean; ordre: number }

export default function MemoBoardPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const scenarioId = params?.id

  const [scenarioNom, setScenarioNom] = useState('')
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [nouveau, setNouveau] = useState('')
  const [masquerFaits, setMasquerFaits] = useState(false)

  const charger = useCallback(async () => {
    if (!scenarioId) return
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }
    const { data: scn } = await supabase
      .from('scenarios')
      .select('id, nom')
      .eq('id', scenarioId)
      .maybeSingle()
    if (!scn) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setScenarioNom(scn.nom as string)
    const { data } = await supabase
      .from('memos_mj')
      .select('*')
      .eq('scenario_id', scenarioId)
      .order('fait', { ascending: true })
      .order('ordre', { ascending: true })
      .order('created_at', { ascending: true })
    setMemos(
      (data ?? []).map((m) => ({
        id: m.id as string,
        texte: (m.texte as string) ?? '',
        fait: !!m.fait,
        ordre: (m.ordre as number) ?? 0
      }))
    )
    setLoading(false)
  }, [scenarioId, router])

  useEffect(() => {
    charger()
  }, [charger])

  const ajouter = async () => {
    if (!nouveau.trim() || !scenarioId) return
    const ordre = memos.length
    const { data, error } = await supabase
      .from('memos_mj')
      .insert({ scenario_id: scenarioId, texte: nouveau.trim(), ordre })
      .select('*')
      .single()
    if (error || !data) {
      console.error('[memo] insert :', error)
      return
    }
    setMemos((m) => [
      ...m,
      {
        id: data.id as string,
        texte: data.texte as string,
        fait: !!data.fait,
        ordre: (data.ordre as number) ?? ordre
      }
    ])
    setNouveau('')
  }

  const toggler = async (memo: Memo) => {
    const fait = !memo.fait
    setMemos((m) => m.map((x) => (x.id === memo.id ? { ...x, fait } : x)))
    const { error } = await supabase
      .from('memos_mj')
      .update({ fait })
      .eq('id', memo.id)
    if (error) {
      console.error('[memo] toggle :', error)
      setMemos((m) => m.map((x) => (x.id === memo.id ? { ...x, fait: !fait } : x)))
    }
  }

  const supprimer = async (id: string) => {
    setMemos((m) => m.filter((x) => x.id !== id))
    const { error } = await supabase.from('memos_mj').delete().eq('id', id)
    if (error) console.error('[memo] delete :', error)
  }

  if (loading) {
    return (
      <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400">Chargement…</p>
      </main>
    )
  }
  if (notFound) {
    return (
      <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400">Scénario introuvable.</p>
      </main>
    )
  }

  const visibles = masquerFaits ? memos.filter((m) => !m.fait) : memos
  const nbFaits = memos.filter((m) => m.fait).length

  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/scenarios/${scenarioId}/edit`)}
            className="px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[#C9A84C] border border-[rgba(201,168,76,0.30)] hover:bg-[rgba(201,168,76,0.08)] hover:border-[#C9A84C] rounded transition"
          >
            ← Scénario
          </button>
        </div>

        <h1
          className="text-[#C9A84C]"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 30,
            fontWeight: 300,
            letterSpacing: '0.06em'
          }}
        >
          Memo MJ
        </h1>
        <p className="text-gray-400 text-sm mb-1">{scenarioNom}</p>
        <p className="text-gray-500 text-xs italic mb-6">
          Pense-bête de session : promesses faites aux joueurs, surprises
          prévues, récompenses en attente…
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input
            type="text"
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') ajouter()
            }}
            placeholder="Nouveau pense-bête…"
            className="flex-1 min-w-[200px] p-2.5 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
          />
          <button
            type="button"
            onClick={ajouter}
            className="px-4 py-2.5 rounded bg-yellow-500 text-gray-900 font-bold text-sm"
          >
            + Ajouter
          </button>
        </div>

        {memos.length > 0 && (
          <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none mb-3">
            <input
              type="checkbox"
              checked={masquerFaits}
              onChange={(e) => setMasquerFaits(e.target.checked)}
              className="accent-yellow-500"
            />
            Masquer les éléments faits ({nbFaits}/{memos.length})
          </label>
        )}

        <ul className="space-y-2">
          {visibles.length === 0 && (
            <li className="text-gray-500 text-sm italic">
              {memos.length === 0
                ? 'Aucun pense-bête pour l’instant.'
                : 'Tout est fait. 🎉'}
            </li>
          )}
          {visibles.map((m) => (
            <li
              key={m.id}
              className="flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-800 p-3"
            >
              <input
                type="checkbox"
                checked={m.fait}
                onChange={() => toggler(m)}
                className="mt-0.5 accent-yellow-500 flex-shrink-0"
              />
              <span
                className={`flex-1 text-sm ${
                  m.fait ? 'text-gray-500 line-through' : 'text-gray-100'
                }`}
              >
                {m.texte}
              </span>
              <button
                type="button"
                onClick={() => supprimer(m.id)}
                className="text-red-400 hover:text-red-300 text-sm flex-shrink-0"
                title="Supprimer"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
