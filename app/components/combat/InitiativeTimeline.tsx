'use client'

// ============================================================================
// Roadmap Modes 2.2 — Timeline horizontale de l'initiative
// ----------------------------------------------------------------------------
// Tous les participants alignés selon l'ordre d'initiative.
// Le tour actuel est mis en avant (+30% taille, glow doré pulsant).
// Le suivant en clair, les autres en gris dégradé.
// Click = ouvre la fiche rapide (callback).
// ============================================================================

export type InitiativeEntry = {
  id: string
  nom: string
  kind: 'perso' | 'ennemi'
  image_url?: string | null
  initiative: number
  hp_actuel?: number
  hp_max?: number
}

export default function InitiativeTimeline({
  entries,
  tourIndex,
  round,
  onOpen,
}: {
  entries: InitiativeEntry[]
  tourIndex: number
  round: number
  onOpen?: (entry: InitiativeEntry) => void
}) {
  if (entries.length === 0) return null
  return (
    <div className="codex-card p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-yellow-500 font-bold">
          ⚔ Initiative — Round {round}
        </span>
        <span className="text-[10px] text-gray-500 tabular-nums">{tourIndex + 1} / {entries.length}</span>
      </div>
      <div className="flex items-end gap-2 overflow-x-auto codex-scroll pb-1">
        {entries.map((e, i) => {
          const isCurrent = i === tourIndex
          const isNext = i === (tourIndex + 1) % entries.length
          const opacity = isCurrent ? 1 : isNext ? 0.85 : 0.45
          const size = isCurrent ? 56 : 40
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onOpen?.(e)}
              title={`${e.nom} — init ${e.initiative}${e.hp_actuel !== undefined ? ` · ${e.hp_actuel}/${e.hp_max} pv` : ''}`}
              className="flex flex-col items-center flex-shrink-0 transition codex-btn-press"
              style={{ opacity }}
            >
              <span style={{ fontSize: 9, color: 'rgba(232,232,236,0.5)', marginBottom: 2 }}>
                {e.initiative}
              </span>
              <div
                style={{
                  width: size, height: size,
                  borderRadius: '50%',
                  border: `2px solid ${
                    isCurrent ? '#fbbf24' : e.kind === 'perso' ? '#60a5fa' : '#f87171'
                  }`,
                  background: e.image_url ? `url(${e.image_url}) center/cover` : (e.kind === 'perso' ? '#1e3a5f' : '#3f1d1d'),
                  boxShadow: isCurrent ? '0 0 14px rgba(251,191,36,0.7), inset 0 0 12px rgba(251,191,36,0.25)' : 'none',
                  animation: isCurrent ? 'codex-cond-sparkle 2s ease-in-out infinite' : undefined,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 'bold', fontSize: 14,
                }}
              >
                {!e.image_url && e.nom.slice(0, 1).toUpperCase()}
              </div>
              <span
                style={{
                  marginTop: 4,
                  fontSize: isCurrent ? 12 : 10,
                  fontWeight: isCurrent ? 'bold' : 'normal',
                  color: isCurrent ? '#fef3c7' : 'rgba(232,232,236,0.7)',
                  maxWidth: 80,
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {e.nom}
              </span>
              {e.hp_actuel !== undefined && e.hp_max !== undefined && (
                <span style={{
                  fontSize: 9, color: e.hp_actuel <= 0 ? '#f87171' : 'rgba(232,232,236,0.5)',
                  fontFamily: 'ui-monospace, monospace',
                }}>
                  {e.hp_actuel}/{e.hp_max}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
