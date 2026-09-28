'use client'

// ============================================================================
// SetupSelector — sélecteur de setup de session (Phase 2.1)
// ----------------------------------------------------------------------------
// Extraction du sélecteur existant du mode diffusion (PC+TV / PC+Téléphones /
// Tél+Tél / MJ seul), rebranché sur le nouveau Mode Session. On garde le même
// libellé, le même localStorage et les mêmes 4 options — il fonctionne bien.
// ============================================================================

import type { SetupMode } from '@/app/lib/session'

export const SETUP_STORAGE_KEY = 'presentation_setup_mode'

export const SETUPS: Array<{
  key: SetupMode
  icon: string
  titre: string
  desc: string
}> = [
  {
    key: 'pc-tv',
    icon: '🖥️📺',
    titre: 'PC + TV',
    desc: 'Cockpit complet sur PC, écran joueurs sur la TV. Le plus complet.'
  },
  {
    key: 'pc-tel',
    icon: '🖥️📱',
    titre: 'PC + Téléphones',
    desc: 'Cockpit sur PC, chaque joueur suit sur son téléphone.'
  },
  {
    key: 'tel-tel',
    icon: '📱📱',
    titre: 'Tél + Tél',
    desc: 'Cockpit compact sur ton téléphone, joueurs sur leurs téléphones.'
  },
  {
    key: 'mj-seul',
    icon: '👤',
    titre: 'MJ seul',
    desc: 'Juste tes outils de MJ, sans écran joueurs séparé.'
  }
]

export default function SetupSelector({
  value,
  onChange
}: {
  value: SetupMode | null
  onChange: (mode: SetupMode) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {SETUPS.map((s) => {
        const selected = value === s.key
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            className={`grim-card grim-card-hover text-left px-3 py-2.5 ${
              selected ? 'is-active' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{s.icon}</span>
              <span className="font-bold text-yellow-100 text-sm">{s.titre}</span>
              {selected && <span className="ml-auto text-yellow-500">✓</span>}
            </div>
            <p className="text-gray-400 text-xs mt-1 leading-snug">{s.desc}</p>
          </button>
        )
      })}
    </div>
  )
}
