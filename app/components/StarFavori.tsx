'use client'

import { useFavoris, type FavoriType } from '@/app/lib/favoris'

// Petit bouton étoile réutilisable. ⭐ vide / ★ plein, hover qui simule l'état
// inverse. Utilise le hook partagé useFavoris : tous les boutons sur la page
// sont synchronisés en temps réel.
export default function StarFavori({
  type,
  id,
  size = 18,
  className = ''
}: {
  type: FavoriType
  id: string
  size?: number
  className?: string
}) {
  const { est, toggle } = useFavoris()
  const actif = est(type, id)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        toggle(type, id)
      }}
      aria-label={actif ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      title={actif ? 'Retirer des favoris' : 'Épingler en favori'}
      className={`inline-flex items-center justify-center leading-none transition ${
        actif ? 'text-yellow-400 hover:text-gray-500' : 'text-gray-500 hover:text-yellow-400'
      } ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {actif ? '★' : '☆'}
    </button>
  )
}
