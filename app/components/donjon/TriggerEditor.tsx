'use client'

// ============================================================================
// Roadmap Modes 3.3 — Éditeur de triggers conditionnels
// ----------------------------------------------------------------------------
// Permet de créer/lister/supprimer des triggers attachés à une map. Chaque
// trigger a un type (combat/dialogue/texte/loot/teleport/effet) et un contenu.
// Validation MJ avant déclenchement = TRUE par défaut.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'
import { confirmDialog } from '@/app/components/ui/ConfirmDialog'
import Modal from '@/app/components/ui/Modal'

type Trigger = {
  id: string
  map_id: string
  nom: string
  zone: { x_pct: number; y_pct: number; w_pct?: number; h_pct?: number }
  type: 'combat' | 'dialogue' | 'texte' | 'loot' | 'teleport' | 'effet'
  contenu: Record<string, unknown>
  valide_mj: boolean
  declenche: boolean
}

const TYPES: Array<{ key: Trigger['type']; label: string; icon: string }> = [
  { key: 'combat',   label: 'Combat',     icon: '⚔️' },
  { key: 'dialogue', label: 'Dialogue',   icon: '💬' },
  { key: 'texte',    label: 'Texte narratif', icon: '📜' },
  { key: 'loot',     label: 'Loot',       icon: '🎁' },
  { key: 'teleport', label: 'Téléporter', icon: '🌀' },
  { key: 'effet',    label: 'Effet',      icon: '✨' },
]

export default function TriggerEditor({ mapId }: { mapId: string }) {
  const [items, setItems] = useState<Trigger[]>([])
  const [editing, setEditing] = useState<Trigger | null>(null)
  const [nouveau, setNouveau] = useState(false)
  const [nom, setNom] = useState('')
  const [type, setType] = useState<Trigger['type']>('texte')
  const [contenuTexte, setContenuTexte] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('triggers_map').select('*').eq('map_id', mapId)
    setItems((data ?? []) as Trigger[])
  }, [mapId])

  useEffect(() => { void charger() }, [charger])

  const sauver = async () => {
    if (!nom.trim()) { toast.error('Nom requis.'); return }
    const contenu = { texte: contenuTexte }
    if (editing) {
      await supabase.from('triggers_map').update({ nom, type, contenu }).eq('id', editing.id)
      toast.success('Trigger mis à jour')
    } else {
      await supabase.from('triggers_map').insert({
        map_id: mapId,
        nom: nom.trim(),
        type,
        zone: { x_pct: 50, y_pct: 50, w_pct: 10, h_pct: 10 },
        contenu,
      })
      toast.success('Trigger créé')
    }
    setEditing(null); setNouveau(false); setNom(''); setContenuTexte('')
    void charger()
  }

  const supprimer = async (t: Trigger) => {
    const ok = await confirmDialog({ title: 'Supprimer ce trigger ?', message: t.nom, destructive: true })
    if (!ok) return
    await supabase.from('triggers_map').delete().eq('id', t.id)
    void charger()
  }

  const ouvrirEdition = (t?: Trigger) => {
    if (t) {
      setEditing(t); setNom(t.nom); setType(t.type)
      setContenuTexte((t.contenu.texte as string | undefined) ?? '')
    } else {
      setEditing(null); setNom(''); setType('texte'); setContenuTexte('')
      setNouveau(true)
    }
  }

  return (
    <div className="codex-card p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-yellow-500 font-bold">
          ⚡ Triggers conditionnels ({items.length})
        </span>
        <button type="button" onClick={() => ouvrirEdition()}
          className="text-xs px-2 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/40 text-yellow-200">
          + Ajouter
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500 italic">Aucun trigger. Crée des effets qui se déclenchent quand les PJ entrent dans une zone.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((t) => {
            const meta = TYPES.find((x) => x.key === t.type)
            return (
              <li key={t.id} className="flex items-center gap-2 text-xs">
                <span className="text-lg">{meta?.icon}</span>
                <span className="flex-1 text-gray-200">{t.nom}</span>
                {t.declenche && <span className="text-[10px] text-gray-500">déclenché</span>}
                {!t.valide_mj && <span className="text-[10px] text-red-400">auto</span>}
                <button type="button" onClick={() => ouvrirEdition(t)} className="text-xs text-gray-400 hover:text-yellow-300 px-1.5 py-1">✏</button>
                <button type="button" onClick={() => supprimer(t)} className="text-[10px] text-red-400">🗑</button>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={nouveau || !!editing} onClose={() => { setNouveau(false); setEditing(null) }}
        title={editing ? '✏ Modifier le trigger' : '+ Nouveau trigger'} size="sm"
        footer={
          <>
            <button type="button" onClick={() => { setNouveau(false); setEditing(null) }} className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-300 text-sm">Annuler</button>
            <button type="button" onClick={sauver} className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold text-sm">Sauvegarder</button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <label className="text-xs text-gray-400">Nom
            <input value={nom} onChange={(e) => setNom(e.target.value)}
              className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
          </label>
          <label className="text-xs text-gray-400">Type
            <select value={type} onChange={(e) => setType(e.target.value as Trigger['type'])}
              className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white">
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-400">Contenu (texte narratif, description, ID…)
            <textarea value={contenuTexte} onChange={(e) => setContenuTexte(e.target.value)}
              placeholder="« Une voix résonne dans tes oreilles : tu n'aurais pas dû entrer ici. »"
              className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white h-20" />
          </label>
        </div>
      </Modal>
    </div>
  )
}
