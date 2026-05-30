'use client'

// ============================================================================
// Roadmap Affinement 2.1 — Galerie de templates de scénarios pré-faits.
// ----------------------------------------------------------------------------
// Modale avec un grid de cartes-templates. Au clic, crée un scénario complet
// (titre + description + notes + chapitres) puis appelle onCreated(scenarioId).
// ============================================================================

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TEMPLATES_SCENARIOS, type ScenarioTemplate } from '@/app/data/templates_scenarios'
import Modal from '@/app/components/ui/Modal'
import { toast } from '@/app/components/ui/Toast'

export default function TemplatesScenariosGallery({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated?: (scenarioId: string) => void
}) {
  const [loading, setLoading] = useState<string | null>(null)

  const creer = async (template: ScenarioTemplate) => {
    setLoading(template.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Connecte-toi pour créer un scénario.')
        return
      }
      // 1. Crée le scénario
      const { data: scen, error: errScen } = await supabase
        .from('scenarios')
        .insert({
          nom: template.nom,
          description: template.description,
          notes: template.notes,
          mj_id: user.id,
        })
        .select('id')
        .single()
      if (errScen || !scen) {
        toast.error('Erreur : ' + (errScen?.message ?? 'inconnue'))
        return
      }
      // 2. Insère les chapitres associés
      const chaps = template.chapitres.map((c) => ({
        scenario_id: scen.id,
        titre: c.titre,
        resume: c.resume,
        ordre: c.ordre,
      }))
      const { error: errChaps } = await supabase.from('chapitres').insert(chaps)
      if (errChaps) {
        // Non bloquant : le scénario est créé, mais les chapitres ont échoué.
        toast.warning('Scénario créé mais chapitres non insérés : ' + errChaps.message)
      } else {
        toast.success(`Scénario « ${template.nom} » créé depuis template`)
      }
      onCreated?.(scen.id)
      onClose()
    } finally {
      setLoading(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="📚 Templates de scénarios" size="xl">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {TEMPLATES_SCENARIOS.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={loading !== null}
            onClick={() => creer(t)}
            className="codex-card codex-interactive codex-focus-ring"
            style={{
              padding: 16,
              textAlign: 'left',
              background: t.ambient,
              cursor: 'pointer',
              border: '1px solid rgba(201, 168, 76, 0.18)',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minHeight: 180,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 32, lineHeight: 1 }}>{t.emoji}</span>
              <span
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--theme-accent, #C9A84C)',
                }}
              >
                {t.nom}
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'rgba(232,232,236,0.7)',
                margin: 0,
                lineHeight: 1.45,
                fontStyle: 'italic',
              }}
            >
              {t.pitch}
            </p>
            <p
              style={{
                fontSize: 12,
                color: 'rgba(232,232,236,0.55)',
                margin: 0,
                lineHeight: 1.4,
                flex: 1,
              }}
            >
              {t.description}
            </p>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(201, 168, 76, 0.75)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginTop: 4,
              }}
            >
              {loading === t.id ? '⏳ Création…' : `📜 ${t.chapitres.length} chapitres`}
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
