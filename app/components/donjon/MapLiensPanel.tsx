'use client'

// ============================================================================
// Roadmap Modes 3.10 — Liens entre maps (donjons multi-étages)
// ----------------------------------------------------------------------------
// Liste les liens sortants d'une map (escaliers, portails…) avec leurs cibles.
// CRUD + navigation rapide vers la map de destination.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'
import { confirmDialog } from '@/app/components/ui/ConfirmDialog'

type MapLite = { id: string; nom: string }
type MapLien = {
  id: string
  map_source_id: string
  map_destination_id: string
  position_source: { x_pct: number; y_pct: number }
  label: string
  type: 'escalier' | 'portail' | 'porte'
}

const ICONES: Record<string, string> = { escalier: '⤴', portail: '🌀', porte: '🚪' }

export default function MapLiensPanel({ mapId }: { mapId: string }) {
  const router = useRouter()
  const [liens, setLiens] = useState<MapLien[]>([])
  const [maps, setMaps] = useState<MapLite[]>([])
  const [nouveauDest, setNouveauDest] = useState('')
  const [nouveauLabel, setNouveauLabel] = useState('')
  const [nouveauType, setNouveauType] = useState<'escalier' | 'portail' | 'porte'>('escalier')

  const charger = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: ls }, { data: ms }] = await Promise.all([
      supabase.from('map_liens').select('*').eq('map_source_id', mapId),
      supabase.from('maps').select('id, nom').eq('mj_id', user.id),
    ])
    setLiens((ls ?? []) as MapLien[])
    setMaps(((ms ?? []) as MapLite[]).filter((m) => m.id !== mapId))
  }, [mapId])

  useEffect(() => { void charger() }, [charger])

  const creer = async () => {
    if (!nouveauDest || !nouveauLabel.trim()) { toast.error('Choisis une map cible et un libellé.'); return }
    const { error } = await supabase.from('map_liens').insert({
      map_source_id: mapId,
      map_destination_id: nouveauDest,
      position_source: { x_pct: 50, y_pct: 50 },
      label: nouveauLabel.trim(),
      type: nouveauType,
    })
    if (error) toast.error(error.message)
    else {
      toast.success('Lien créé')
      setNouveauDest(''); setNouveauLabel('')
      void charger()
    }
  }

  const supprimer = async (l: MapLien) => {
    const ok = await confirmDialog({ title: 'Supprimer ce lien ?', message: l.label, destructive: true })
    if (!ok) return
    await supabase.from('map_liens').delete().eq('id', l.id)
    void charger()
  }

  const labelDest = (id: string) => maps.find((m) => m.id === id)?.nom ?? '(map inconnue)'

  return (
    <div className="codex-card p-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-yellow-500 font-bold mb-2">
        ⤴ Liens entre maps (multi-étages)
      </div>

      {liens.length === 0 ? (
        <p className="text-xs text-gray-500 italic">Aucun lien. Crée des passages vers d'autres cartes (étages, salles secrètes…).</p>
      ) : (
        <ul className="space-y-1 mb-3">
          {liens.map((l) => (
            <li key={l.id} className="flex items-center gap-2 text-xs">
              <span className="text-lg">{ICONES[l.type] ?? '↪'}</span>
              <button type="button" onClick={() => router.push(`/dashboard/maps/editor?id=${l.map_destination_id}`)}
                className="flex-1 text-left text-yellow-300 hover:underline">
                {l.label} → {labelDest(l.map_destination_id)}
              </button>
              <button type="button" onClick={() => supprimer(l)} className="text-red-400 px-1">🗑</button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-gray-700/30 pt-2 flex flex-col gap-1">
        <select value={nouveauDest} onChange={(e) => setNouveauDest(e.target.value)}
          className="p-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs">
          <option value="">— Map de destination —</option>
          {maps.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
        <div className="flex gap-1">
          <input value={nouveauLabel} onChange={(e) => setNouveauLabel(e.target.value)}
            placeholder="Libellé (Étage 1, etc.)"
            className="flex-1 p-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs" />
          <select value={nouveauType} onChange={(e) => setNouveauType(e.target.value as 'escalier' | 'portail' | 'porte')}
            className="p-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs">
            <option value="escalier">⤴ Escalier</option>
            <option value="portail">🌀 Portail</option>
            <option value="porte">🚪 Porte</option>
          </select>
        </div>
        <button type="button" onClick={creer}
          className="text-xs px-2 py-1 rounded bg-yellow-500/15 border border-yellow-500/40 text-yellow-200 codex-btn-press">
          + Créer le lien
        </button>
      </div>
    </div>
  )
}
