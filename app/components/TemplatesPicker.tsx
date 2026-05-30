'use client'

// ============================================================================
// Roadmap Affinement 2.2 — Bibliothèque personnelle de templates PNJ/ennemis.
// ----------------------------------------------------------------------------
// Liste les templates sauvegardés par l'utilisateur ; clic = applique à la
// fiche en cours d'édition via le callback `onApply(contenu)`. Permet aussi
// de supprimer un template.
// ============================================================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/app/components/ui/Modal'
import EmptyState from '@/app/components/ui/EmptyState'
import { SkeletonList } from '@/app/components/ui/Skeleton'
import { toast } from '@/app/components/ui/Toast'
import { confirmDialog } from '@/app/components/ui/ConfirmDialog'
import { unlockAchievement } from '@/app/lib/achievements'

export type TemplateKind = 'pnj' | 'ennemis'

type TemplateRow = {
  id: string
  nom: string
  notes: string | null
  contenu: Record<string, unknown>
  created_at: string
}

export default function TemplatesPicker({
  open,
  onClose,
  kind,
  onApply,
}: {
  open: boolean
  onClose: () => void
  kind: TemplateKind
  onApply: (contenu: Record<string, unknown>) => void
}) {
  const [rows, setRows] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(false)
  const table = kind === 'pnj' ? 'templates_pnj' : 'templates_ennemis'

  useEffect(() => {
    if (!open) return
    let cancel = false
    void (async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from(table)
        .select('id, nom, notes, contenu, created_at')
        .order('created_at', { ascending: false })
      if (cancel) return
      if (error) {
        toast.error('Erreur templates : ' + error.message)
      }
      setRows((data ?? []) as TemplateRow[])
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [open, table])

  const supprimer = async (id: string, nom: string) => {
    const ok = await confirmDialog({
      title: 'Supprimer ce template ?',
      message: `« ${nom} » sera définitivement supprimé.`,
      confirmLabel: 'Supprimer',
      destructive: true,
    })
    if (!ok) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Template supprimé')
      setRows((curr) => curr.filter((r) => r.id !== id))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kind === 'pnj' ? '💾 Mes templates PNJ' : '💾 Mes templates ennemis'}
      size="lg"
    >
      {loading ? (
        <SkeletonList count={4} type="card" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={kind === 'pnj' ? '🤝' : '👹'}
          title="Aucun template pour l’instant"
          message={
            kind === 'pnj'
              ? 'Sauvegarde un PNJ comme template depuis sa fiche pour le réutiliser ici.'
              : 'Sauvegarde un ennemi comme template depuis sa fiche pour le réutiliser ici.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r) => (
            <div
              key={r.id}
              className="codex-card codex-card-hover"
              style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: 15, fontWeight: 600,
                    color: 'var(--theme-accent, #C9A84C)',
                  }}
                >{r.nom}</div>
                {r.notes ? (
                  <div style={{ fontSize: 12, color: 'rgba(232,232,236,0.6)', marginTop: 2 }}>{r.notes}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => { onApply(r.contenu); onClose() }}
                className="codex-btn-press"
                style={{
                  padding: '7px 12px', borderRadius: 6,
                  background: 'linear-gradient(180deg, #C9A84C 0%, #8d7a2d 100%)',
                  color: '#0a0c10', fontSize: 12, fontWeight: 600,
                  border: '1px solid rgba(201,168,76,0.4)', cursor: 'pointer'
                }}
              >Utiliser</button>
              <button
                type="button"
                onClick={() => supprimer(r.id, r.nom)}
                className="codex-btn-press"
                style={{
                  padding: '7px 9px', borderRadius: 6,
                  background: 'transparent', color: 'rgba(248,113,113,0.7)',
                  border: '1px solid rgba(248,113,113,0.25)', cursor: 'pointer'
                }}
                title="Supprimer"
                aria-label="Supprimer"
              >🗑</button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

/**
 * Helper : sauvegarde la fiche courante comme template.
 */
export async function sauvegarderCommeTemplate(
  kind: TemplateKind,
  contenu: Record<string, unknown>,
  defaultName: string
) {
  const nom = window.prompt('Nom du template :', defaultName)
  if (!nom || !nom.trim()) return false
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    toast.error('Connecte-toi pour sauvegarder un template.')
    return false
  }
  const table = kind === 'pnj' ? 'templates_pnj' : 'templates_ennemis'
  // On nettoie les champs qui n'ont pas de sens dans un template (id, scenario_id…)
  const blacklist = new Set(['id', 'mj_id', 'created_at', 'updated_at', 'scenario_id', 'hp_actuel', 'conditions'])
  const clean = Object.fromEntries(
    Object.entries(contenu).filter(([k, v]) => !blacklist.has(k) && v !== undefined)
  )
  const { error } = await supabase.from(table).insert({
    user_id: user.id,
    nom: nom.trim(),
    contenu: clean,
  })
  if (error) {
    toast.error('Erreur : ' + error.message)
    return false
  }
  toast.success(`Template « ${nom} » sauvegardé`)
  // Roadmap Affinement 2.10 — achievement premier template
  void unlockAchievement('premier_template')
  return true
}
