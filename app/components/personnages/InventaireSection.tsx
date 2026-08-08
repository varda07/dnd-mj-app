'use client'

// ============================================================================
// InventaireSection — inventaire structuré éditable (Phase 2.5)
// ----------------------------------------------------------------------------
// Liste d'objets (arme/armure/consommable/outil/objet) avec quantité, usages
// consommables, équipé/rangé, description. Édition optimiste + réconciliation
// Realtime (le MJ et le joueur peuvent tous deux modifier en séance).
// Rendu à insérer dans un <Panel title="Inventaire"> de la fiche.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ajouterObjet,
  changerQuantite,
  consommerUsage,
  fetchInventaire,
  modifierObjet,
  restituerUsage,
  supprimerObjet,
  type ObjetInventaire,
  type TypeObjet
} from '@/app/lib/inventaire'
import PastillesUsage from '@/app/components/ui/PastillesUsage'

const TYPES: Array<{ key: TypeObjet; label: string; icon: string }> = [
  { key: 'arme', label: 'Arme', icon: '⚔️' },
  { key: 'armure', label: 'Armure', icon: '🛡️' },
  { key: 'consommable', label: 'Consommable', icon: '🧪' },
  { key: 'outil', label: 'Outil', icon: '🔧' },
  { key: 'objet', label: 'Objet', icon: '📦' }
]
const ICON: Record<TypeObjet, string> = {
  arme: '⚔️',
  armure: '🛡️',
  consommable: '🧪',
  outil: '🔧',
  objet: '📦'
}

export default function InventaireSection({
  personnageId,
  isOwner
}: {
  personnageId: string
  isOwner: boolean
}) {
  const [objets, setObjets] = useState<ObjetInventaire[]>([])
  const [loading, setLoading] = useState(true)
  const [nom, setNom] = useState('')
  const [type, setType] = useState<TypeObjet>('objet')
  const [quantite, setQuantite] = useState('1')
  const [usagesMax, setUsagesMax] = useState('')
  const [busy, setBusy] = useState(false)
  const skipNextRealtime = useRef(false)

  const recharger = useCallback(async () => {
    setObjets(await fetchInventaire(personnageId))
    setLoading(false)
  }, [personnageId])

  useEffect(() => {
    void recharger()
  }, [recharger])

  // Realtime : édition croisée MJ ↔ joueur.
  useEffect(() => {
    const channel = supabase
      .channel(`inventaire:${personnageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personnage_inventaire',
          filter: `personnage_id=eq.${personnageId}`
        },
        () => {
          if (skipNextRealtime.current) {
            skipNextRealtime.current = false
            return
          }
          void recharger()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [personnageId, recharger])

  // Marque qu'on vient d'écrire pour éviter un refetch redondant sur notre echo.
  const marquerEcriture = () => {
    skipNextRealtime.current = true
  }

  const ajouter = async () => {
    const n = nom.trim()
    if (!n || busy) return
    setBusy(true)
    marquerEcriture()
    const cree = await ajouterObjet(personnageId, {
      nom: n,
      type,
      quantite: Math.max(1, parseInt(quantite, 10) || 1),
      usages_max: usagesMax.trim() ? Math.max(0, parseInt(usagesMax, 10) || 0) : null,
      ordre: objets.length
    })
    if (cree) setObjets((o) => [...o, cree])
    setNom('')
    setQuantite('1')
    setUsagesMax('')
    setType('objet')
    setBusy(false)
  }

  const majQuantite = async (obj: ObjetInventaire, delta: number) => {
    marquerEcriture()
    const res = await changerQuantite(obj, delta)
    setObjets((o) =>
      res.supprime
        ? o.filter((x) => x.id !== obj.id)
        : o.map((x) => (x.id === obj.id ? { ...x, quantite: res.quantite } : x))
    )
  }

  const majUsage = async (obj: ObjetInventaire, sens: 1 | -1) => {
    marquerEcriture()
    const val = sens === 1 ? await consommerUsage(obj) : await restituerUsage(obj)
    setObjets((o) => o.map((x) => (x.id === obj.id ? { ...x, usages_utilises: val } : x)))
  }

  const toggleEquipe = async (obj: ObjetInventaire) => {
    marquerEcriture()
    const equipe = !obj.equipe
    setObjets((o) => o.map((x) => (x.id === obj.id ? { ...x, equipe } : x)))
    await modifierObjet(obj.id, { equipe })
  }

  const renommer = async (obj: ObjetInventaire, nom: string) => {
    setObjets((o) => o.map((x) => (x.id === obj.id ? { ...x, nom } : x)))
  }
  const sauverNom = async (obj: ObjetInventaire) => {
    marquerEcriture()
    await modifierObjet(obj.id, { nom: obj.nom })
  }

  const supprimer = async (obj: ObjetInventaire) => {
    marquerEcriture()
    setObjets((o) => o.filter((x) => x.id !== obj.id))
    await supprimerObjet(obj.id)
  }

  if (loading) {
    return <p className="text-stone-500 text-sm italic">Chargement de l'inventaire…</p>
  }

  return (
    <div className="space-y-2">
      {objets.length === 0 && (
        <p className="text-stone-500 text-sm italic">Sac vide.</p>
      )}

      <ul className="space-y-1.5">
        {objets.map((obj) => (
          <li
            key={obj.id}
            className={`rounded border px-2.5 py-2 ${
              obj.equipe
                ? 'border-amber-500/60 bg-amber-900/15'
                : 'border-yellow-800/30 bg-stone-900/40'
            }`}
          >
            <div className="flex items-center gap-2">
              {isOwner && (
                <button
                  type="button"
                  onClick={() => toggleEquipe(obj)}
                  title={obj.equipe ? 'Équipé — cliquer pour ranger' : 'Rangé — cliquer pour équiper'}
                  className={`flex-shrink-0 text-sm ${obj.equipe ? 'text-amber-400' : 'text-stone-600 hover:text-stone-400'}`}
                >
                  {obj.equipe ? '✓' : '○'}
                </button>
              )}
              <span className="flex-shrink-0" title={obj.type}>
                {ICON[obj.type]}
              </span>
              {isOwner ? (
                <input
                  value={obj.nom}
                  onChange={(e) => renommer(obj, e.target.value)}
                  onBlur={() => sauverNom(obj)}
                  className="flex-1 min-w-0 bg-transparent text-sm text-yellow-100 font-medium outline-none border-b border-transparent focus:border-yellow-700/50"
                />
              ) : (
                <span className="flex-1 min-w-0 text-sm text-yellow-100 font-medium truncate">
                  {obj.nom}
                </span>
              )}

              {/* Quantité */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => majQuantite(obj, -1)}
                    className="w-5 h-5 rounded bg-stone-800 text-stone-300 hover:text-white text-xs leading-none"
                  >
                    −
                  </button>
                )}
                <span className="text-stone-300 text-xs min-w-[1.5rem] text-center">
                  ×{obj.quantite}
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => majQuantite(obj, +1)}
                    className="w-5 h-5 rounded bg-stone-800 text-stone-300 hover:text-white text-xs leading-none"
                  >
                    +
                  </button>
                )}
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => supprimer(obj)}
                  className="flex-shrink-0 text-stone-600 hover:text-red-300 text-xs"
                  aria-label="Supprimer"
                >
                  🗑️
                </button>
              )}
            </div>

            {/* Usages (charges) */}
            {obj.usages_max != null && obj.usages_max > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 pl-6">
                <span className="text-[10px] uppercase tracking-wider text-stone-500">
                  Charges
                </span>
                {/* Ronds d'usage — consommation de DROITE à GAUCHE, clic sur un
                    rond pour consommer / restituer (roadmap delta A.4). */}
                <PastillesUsage
                  max={obj.usages_max}
                  used={obj.usages_utilises}
                  taille={11}
                  label={obj.nom}
                  onConsommer={isOwner ? () => majUsage(obj, 1) : undefined}
                  onRestituer={isOwner ? () => majUsage(obj, -1) : undefined}
                />
                {isOwner && (
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      type="button"
                      onClick={() => majUsage(obj, 1)}
                      disabled={obj.usages_utilises >= (obj.usages_max ?? 0)}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 hover:text-white disabled:opacity-40"
                    >
                      Utiliser
                    </button>
                    <button
                      type="button"
                      onClick={() => majUsage(obj, -1)}
                      disabled={obj.usages_utilises <= 0}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 hover:text-white disabled:opacity-40"
                    >
                      Récup.
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Ajout */}
      {isOwner && (
        <div className="mt-3 pt-3 border-t border-yellow-800/30 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ajouter()}
              placeholder="Nom de l'objet"
              className="flex-1 min-w-[8rem] bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1.5 text-sm text-gray-200 outline-none"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TypeObjet)}
              className="bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1.5 text-sm text-gray-200 outline-none"
            >
              {TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-stone-500">
              Qté
              <input
                value={quantite}
                onChange={(e) => setQuantite(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                className="ml-1 w-14 bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1 text-sm text-gray-200 outline-none"
              />
            </label>
            <label className="text-xs text-stone-500">
              Charges max (optionnel)
              <input
                value={usagesMax}
                onChange={(e) => setUsagesMax(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                placeholder="—"
                className="ml-1 w-16 bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1 text-sm text-gray-200 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={ajouter}
              disabled={busy || !nom.trim()}
              className="ml-auto px-3 py-1.5 rounded bg-stone-800 border border-yellow-700/40 text-yellow-300 hover:border-yellow-600 text-xs font-bold disabled:opacity-40"
            >
              ➕ Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
