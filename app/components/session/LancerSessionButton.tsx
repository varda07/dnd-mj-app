'use client'

// ============================================================================
// LancerSessionButton — bouton « Lancer la session » (Phase 2.1)
// ----------------------------------------------------------------------------
// Depuis un scénario : ouvre une modale (titre de la séance + sélecteur de
// setup), crée la game_session en statut 'lobby' via la RPC start_session
// (qui notifie automatiquement tous les joueurs liés), puis emmène le MJ dans
// le lobby /session/[id]/mj. Remplace le bouton « Diffuser ».
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { startSession, type SetupMode } from '@/app/lib/session'
import SetupSelector, { SETUP_STORAGE_KEY } from './SetupSelector'

export default function LancerSessionButton({
  scenarioId,
  scenarioNom,
  compact = false
}: {
  scenarioId: string
  scenarioNom: string
  compact?: boolean
}) {
  const router = useRouter()
  const [ouvert, setOuvert] = useState(false)
  const [titre, setTitre] = useState('')
  const [setup, setSetup] = useState<SetupMode | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  // Réutilise le dernier setup choisi (même clé que le mode diffusion).
  useEffect(() => {
    if (!ouvert) return
    try {
      const saved = localStorage.getItem(SETUP_STORAGE_KEY) as SetupMode | null
      if (saved) setSetup(saved)
    } catch {}
    setTitre('')
    setErreur('')
  }, [ouvert])

  const lancer = async () => {
    setEnCours(true)
    setErreur('')
    try {
      if (setup) localStorage.setItem(SETUP_STORAGE_KEY, setup)
    } catch {}
    const res = await startSession(scenarioId, titre, setup ?? undefined)
    if (!res.ok || !res.sessionId) {
      setErreur(messageErreur(res.error))
      setEnCours(false)
      return
    }
    router.push(`/session/${res.sessionId}/mj`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className={
          compact
            ? 'text-sm font-bold px-2 py-1.5 rounded transition text-gray-900 bg-[#C9A84C] hover:brightness-110'
            : 'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-gray-900 bg-[#C9A84C] hover:brightness-110 transition'
        }
        title="Lancer une session de jeu"
      >
        🎲 {compact ? 'Session' : 'Lancer la session'}
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-[110] bg-black/75 flex items-center justify-center p-4"
          onClick={() => !enCours && setOuvert(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border-2 shadow-2xl flex flex-col max-h-[90vh]"
            style={{ background: '#15110a', borderColor: 'rgba(201,168,76,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: 'rgba(201,168,76,0.2)' }}
            >
              <h3
                className="font-bold text-lg"
                style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}
              >
                🎲 Lancer la session
              </h3>
              <button
                type="button"
                onClick={() => !enCours && setOuvert(false)}
                className="text-gray-400 hover:text-white text-xl leading-none"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <p className="text-stone-400 text-sm">
                Scénario :{' '}
                <span className="text-yellow-200 font-bold">« {scenarioNom} »</span>
              </p>

              <div>
                <label className="block text-stone-400 text-xs uppercase tracking-widest mb-1">
                  Titre de la séance (optionnel)
                </label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex. Séance 4 — Le Puits Noir"
                  className="w-full rounded-lg bg-black/40 border border-stone-700 focus:border-amber-500 px-3 py-2 text-stone-100 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">
                  Setup de jeu
                </label>
                <SetupSelector value={setup} onChange={setSetup} />
              </div>

              {erreur && <p className="text-red-300 text-sm">{erreur}</p>}
            </div>

            <div
              className="p-4 border-t flex items-center justify-end gap-2"
              style={{ borderColor: 'rgba(201,168,76,0.2)' }}
            >
              <button
                type="button"
                onClick={() => setOuvert(false)}
                disabled={enCours}
                className="px-4 py-2 rounded-lg text-stone-300 hover:text-white text-sm disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={lancer}
                disabled={enCours}
                className="px-5 py-2.5 rounded-lg font-bold text-gray-900 bg-[#C9A84C] hover:brightness-110 disabled:opacity-60"
              >
                {enCours ? 'Ouverture du lobby…' : 'Ouvrir le lobby'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function messageErreur(code?: string): string {
  const map: Record<string, string> = {
    not_authenticated: 'Tu dois être connecté·e.',
    not_mj: "Seul le MJ du scénario peut lancer une session.",
    unknown: 'Impossible de lancer la session pour le moment.'
  }
  return (code && map[code]) || map.unknown
}
