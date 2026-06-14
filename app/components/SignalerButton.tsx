'use client'

// ============================================================================
// ROADMAP V1 — Phase 3.3 : Bouton « 🚩 Signaler »
// ----------------------------------------------------------------------------
// Réutilisable sur n'importe quel contenu communautaire (scénario, commentaire,
// table d'effets…). Ouvre une modale (raison + description) et insère une ligne
// dans `signalements`. Échec silencieux/non bloquant si la table est absente.
// ============================================================================

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'

type Raison = 'inapproprie' | 'spam' | 'plagiat' | 'autre'

const RAISONS: { k: Raison; label: string }[] = [
  { k: 'inapproprie', label: 'Contenu inapproprié' },
  { k: 'spam', label: 'Spam' },
  { k: 'plagiat', label: 'Plagiat' },
  { k: 'autre', label: 'Autre' }
]

export default function SignalerButton({
  contenuType,
  contenuId,
  compact
}: {
  contenuType: string
  contenuId: string
  compact?: boolean
}) {
  const [ouvert, setOuvert] = useState(false)
  const [raison, setRaison] = useState<Raison>('inapproprie')
  const [description, setDescription] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const envoyer = async () => {
    setEnvoi(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Connexion requise.'); setEnvoi(false); return }
    const { error } = await supabase.from('signalements').insert({
      user_id: user.id,
      contenu_type: contenuType,
      contenu_id: contenuId,
      raison,
      description: description.trim()
    })
    setEnvoi(false)
    if (error) { toast.error(error.message); return }
    toast.success('Merci, le signalement a été transmis aux modérateurs.')
    setOuvert(false)
    setDescription('')
    setRaison('inapproprie')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        title="Signaler ce contenu"
        className={compact
          ? 'text-gray-500 hover:text-red-300 text-xs'
          : 'text-gray-400 hover:text-red-300 text-xs flex items-center gap-1'}
      >
        🚩{compact ? '' : ' Signaler'}
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOuvert(false)}
        >
          <div
            className="grim-card p-4 max-w-sm w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[#C9A84C] font-bold text-sm">🚩 Signaler ce contenu</h3>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#6a6a72] block mb-1">Raison</label>
              <select
                value={raison}
                onChange={(e) => setRaison(e.target.value as Raison)}
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 text-sm"
              >
                {RAISONS.map((r) => <option key={r.k} value={r.k}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#6a6a72] block mb-1">Description (facultative)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 text-sm"
                placeholder="Précise le problème…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOuvert(false)}
                className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={envoyer}
                disabled={envoi}
                className="px-3 py-1.5 rounded bg-red-800 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {envoi ? 'Envoi…' : 'Signaler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
