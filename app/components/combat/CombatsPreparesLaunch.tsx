'use client'

// ============================================================================
// Lancement de combats préparés DEPUIS le mode diffusion — Phase 3.2
// ----------------------------------------------------------------------------
// Liste les combats préparés du scénario actif et permet de les lancer
// directement en diffusion (sans repasser par le préparateur). Au lancement on
// applique la config via lancerCombatPrepare puis on recharge la page diffusion
// pour repartir sur un roster frais (ennemis fraîchement liés) + combat actif.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import {
  loadCombatsPrepares,
  lancerCombatPrepare,
  type CombatPrepare
} from '@/app/lib/combats-prepares'

export default function CombatsPreparesLaunch({ scenarioId }: { scenarioId: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [liste, setListe] = useState<CombatPrepare[]>([])
  const [enCours, setEnCours] = useState(false)

  const charger = useCallback(async () => {
    setListe(await loadCombatsPrepares(scenarioId))
  }, [scenarioId])

  useEffect(() => {
    // charger() est async : setListe après await (pas synchrone).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ouvert) charger()
  }, [ouvert, charger])

  const lancer = useCallback(async (cp: CombatPrepare) => {
    setEnCours(true)
    const ok = await lancerCombatPrepare(cp, 'diffusion')
    if (ok && typeof window !== 'undefined') {
      // V1 3.4 — recharge la diffusion AVEC ?diffuser=1 pour rouvrir directement
      // le panneau Combat (et relancer la diffusion). Sans ce flag, on retombait
      // sur l'accueil du mode diffusion et il fallait recliquer sur l'onglet
      // Combat. Roster frais (ennemis liés) + combat actif au passage.
      const url = new URL(window.location.href)
      url.searchParams.set('diffuser', '1')
      window.location.href = url.toString()
    } else {
      setEnCours(false)
    }
  }, [])

  return (
    <div className="combatmj-carte-section">
      <button type="button" className="combatmj-carte-toggle" onClick={() => setOuvert((o) => !o)}>
        {ouvert ? '▾' : '▸'} 📚 Lancer un combat préparé
      </button>
      {ouvert && (
        <div className="mt-2">
          {liste.length === 0 ? (
            <p className="text-[10px] text-gray-500 italic">
              Aucun combat préparé pour ce scénario. Crée-en dans 🛠 Préparateur de combat.
            </p>
          ) : (
            <ul className="space-y-1">
              {liste.map((cp) => (
                <li
                  key={cp.id}
                  className="flex items-center gap-2 p-2 rounded border border-gray-700 bg-gray-900/40"
                >
                  <span className="flex-1 min-w-0 text-xs text-gray-200 truncate">
                    {cp.nom}
                    <span className="text-gray-500 ml-1">
                      ({cp.participants.filter((p) => p.kind === 'ennemi').length} ennemis
                      {cp.avec_carte ? ' · 🗺' : ''})
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={enCours}
                    onClick={() => lancer(cp)}
                    className="text-[10px] px-2 py-1 rounded border border-[rgba(201,168,76,0.4)] text-[#ffe6a8] hover:bg-[rgba(201,168,76,0.15)] disabled:opacity-40"
                  >
                    ▶ Lancer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
