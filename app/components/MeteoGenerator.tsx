'use client'

// ============================================================================
// Roadmap Affinement 2.4 — Modale "Générer la météo".
// ----------------------------------------------------------------------------
// Sélection saison + biome → résultat structuré (température, précipitations,
// vent, visibilité, description, effets gameplay).
// ============================================================================

import { useState } from 'react'
import Modal from '@/app/components/ui/Modal'
import {
  genererMeteo, SAISONS_LABELS, BIOMES_LABELS,
  type Saison, type Biome, type MeteoResult,
} from '@/app/data/meteo_tables'
import { toast } from '@/app/components/ui/Toast'

export default function MeteoGenerator({
  open,
  onClose,
  defaultSaison = 'été',
  defaultBiome = 'plaine',
}: {
  open: boolean
  onClose: () => void
  defaultSaison?: Saison
  defaultBiome?: Biome
}) {
  const [saison, setSaison] = useState<Saison>(defaultSaison)
  const [biome, setBiome] = useState<Biome>(defaultBiome)
  const [result, setResult] = useState<MeteoResult | null>(null)

  const generer = () => setResult(genererMeteo(saison, biome))

  const copier = async () => {
    if (!result) return
    const text = `Météo (${SAISONS_LABELS[saison]} — ${BIOMES_LABELS[biome]})
Température : ${result.temperature}
Précipitations : ${result.precipitations}
Vent : ${result.vent}
Visibilité : ${result.visibilite}
${result.description}
${result.effets.length ? '\nEffets :\n' + result.effets.map(e => '— ' + e).join('\n') : ''}`
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Météo copiée dans le presse-papiers')
    } catch {
      toast.error('Copie impossible')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="🌦 Générer la météo" size="md"
      footer={
        <>
          {result ? <button type="button" onClick={copier} className="px-3 py-2 rounded bg-gray-800 border border-yellow-500/40 text-yellow-300 text-sm font-bold">📋 Copier</button> : null}
          <button type="button" onClick={generer} className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold codex-btn-press">🎲 Générer</button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-400">Saison
            <select value={saison} onChange={(e) => setSaison(e.target.value as Saison)}
              className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white">
              {(Object.keys(SAISONS_LABELS) as Saison[]).map((s) => (
                <option key={s} value={s}>{SAISONS_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-400">Biome
            <select value={biome} onChange={(e) => setBiome(e.target.value as Biome)}
              className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white">
              {(Object.keys(BIOMES_LABELS) as Biome[]).map((b) => (
                <option key={b} value={b}>{BIOMES_LABELS[b]}</option>
              ))}
            </select>
          </label>
        </div>

        {result ? (
          <div className="codex-card p-4 flex flex-col gap-2">
            <div className="text-base text-yellow-300 font-serif italic" style={{ fontFamily: 'Georgia, serif' }}>
              {result.description}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mt-1">
              <div><span className="text-gray-500 uppercase tracking-wider">Température</span><br/>{result.temperature}</div>
              <div><span className="text-gray-500 uppercase tracking-wider">Précipitations</span><br/>{result.precipitations}</div>
              <div><span className="text-gray-500 uppercase tracking-wider">Vent</span><br/>{result.vent}</div>
              <div><span className="text-gray-500 uppercase tracking-wider">Visibilité</span><br/>{result.visibilite}</div>
            </div>
            {result.effets.length > 0 ? (
              <div className="mt-2 border-t border-gray-700/40 pt-2">
                <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Effets gameplay</div>
                <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                  {result.effets.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic">Choisis une saison et un biome puis clique sur Générer.</div>
        )}
      </div>
    </Modal>
  )
}
