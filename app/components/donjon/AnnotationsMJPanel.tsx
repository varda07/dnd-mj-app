'use client'

// ============================================================================
// Roadmap Modes 3.11 — Annotations MJ (post-it) sur la map
// ----------------------------------------------------------------------------
// CRUD complet des annotations attachées à une map. Style post-it doré avec
// icône 📝. Position en pourcentages. Le rendu visuel sur la map est laissé
// au parent (overlay sur l'éditeur de carte).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'
import { confirmDialog } from '@/app/components/ui/ConfirmDialog'

type Annotation = {
  id: string
  map_id: string
  position: { x_pct: number; y_pct: number }
  contenu: string
  couleur: string
  created_at: string
}

export default function AnnotationsMJPanel({
  mapId,
  onAddRequest,
}: {
  mapId: string
  /** Si fourni, déclenché quand le MJ veut ajouter (parent peut alors faire un placement par clic). */
  onAddRequest?: () => void
}) {
  const [items, setItems] = useState<Annotation[]>([])

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from('annotations_mj_map').select('*').eq('map_id', mapId)
      .order('created_at', { ascending: false })
    setItems((data ?? []) as Annotation[])
  }, [mapId])

  useEffect(() => { void charger() }, [charger])

  const supprimer = async (a: Annotation) => {
    const ok = await confirmDialog({ title: 'Supprimer cette annotation ?', message: a.contenu, destructive: true })
    if (!ok) return
    await supabase.from('annotations_mj_map').delete().eq('id', a.id)
    toast.success('Supprimée')
    void charger()
  }

  const editer = async (a: Annotation) => {
    const nouveau = window.prompt('Modifier la note :', a.contenu)
    if (nouveau === null) return
    await supabase.from('annotations_mj_map').update({ contenu: nouveau }).eq('id', a.id)
    void charger()
  }

  return (
    <div className="codex-card p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-yellow-500 font-bold">
          📝 Annotations MJ ({items.length})
        </span>
        {onAddRequest && (
          <button type="button" onClick={onAddRequest}
            className="text-xs px-2 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/40 text-yellow-200">
            + Ajouter
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500 italic">Aucune note. Pratique pour les rappels : « Trahison du PNJ ici », « Combat surprise possible »…</p>
      ) : (
        <ul className="space-y-1.5 max-h-60 overflow-y-auto codex-scroll pr-1">
          {items.map((a) => (
            <li key={a.id}
              className="text-xs p-2 rounded border"
              style={{
                background: `${a.couleur}18`,
                borderColor: `${a.couleur}55`,
                color: '#fef3c7',
              }}
            >
              <div className="whitespace-pre-wrap">{a.contenu}</div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-gray-500">
                  ({a.position.x_pct.toFixed(0)}%, {a.position.y_pct.toFixed(0)}%)
                </span>
                <span className="flex gap-1">
                  <button type="button" onClick={() => editer(a)} className="text-[10px] text-gray-400 hover:text-yellow-300">✏</button>
                  <button type="button" onClick={() => supprimer(a)} className="text-[10px] text-red-400">🗑</button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Helper : créer une annotation à une position donnée. */
export async function creerAnnotation(mapId: string, x_pct: number, y_pct: number, contenu: string) {
  const { error } = await supabase.from('annotations_mj_map').insert({
    map_id: mapId,
    position: { x_pct, y_pct },
    contenu,
  })
  if (error) { toast.error(error.message); return false }
  return true
}
