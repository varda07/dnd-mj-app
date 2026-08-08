'use client'

// ============================================================================
// PastillesUsage — ronds d'usage d'une ressource limitée (Delta A.4)
// ----------------------------------------------------------------------------
// ⚠️ Règle D&D 5e : ces ronds ne s'affichent QUE sur ce qui a réellement un
// nombre d'usages limité — emplacements de sorts, capacités X/repos, objets à
// charges. JAMAIS sur une compétence ni sur une attaque d'arme classique :
// laisser croire au joueur qu'il a un nombre de jets limité serait un contresens.
//
// Consommation de DROITE à GAUCHE : le rond consommé est toujours le plus à
// droite encore disponible. Clic sur un rond coloré → consomme ; clic sur un
// rond grisé → restitue.
// ============================================================================

export default function PastillesUsage({
  max,
  used,
  couleur = '#C9A84C',
  onConsommer,
  onRestituer,
  taille = 14,
  label
}: {
  max: number
  used: number
  couleur?: string
  onConsommer?: () => void
  onRestituer?: () => void
  taille?: number
  label?: string
}) {
  if (max <= 0) return null
  const restants = Math.max(0, Math.min(max, max - used))
  const interactif = !!onConsommer || !!onRestituer

  return (
    <span
      className="inline-flex items-center gap-1 align-middle"
      role="group"
      aria-label={label ? `${label} : ${restants}/${max}` : `${restants}/${max}`}
    >
      {Array.from({ length: max }).map((_, i) => {
        // Les `used` ronds les plus à DROITE sont les consommés.
        const consomme = i >= max - used
        const commun = {
          key: i,
          title: consomme ? 'Utilisé — cliquer pour restituer' : 'Disponible — cliquer pour consommer',
          style: {
            width: taille,
            height: taille,
            borderRadius: 999,
            background: consomme ? 'transparent' : couleur,
            border: `1.5px solid ${consomme ? 'rgba(120,113,108,0.8)' : couleur}`,
            boxShadow: consomme ? 'none' : `0 0 6px ${couleur}55`,
            flexShrink: 0
          } as React.CSSProperties
        }
        if (!interactif) return <span {...commun} aria-hidden />
        return (
          <button
            {...commun}
            type="button"
            className="transition active:scale-90"
            onClick={() => (consomme ? onRestituer?.() : onConsommer?.())}
          />
        )
      })}
    </span>
  )
}
