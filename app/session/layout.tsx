import ThemeLoader from '@/app/dashboard/ThemeLoader'

// ============================================================================
// Layout du mode session — /session/**
// ----------------------------------------------------------------------------
// Raison d'être : `ThemeLoader` n'était monté que dans `app/dashboard/layout.tsx`.
// Les routes /session/** n'avaient donc NI `data-theme` NI variables `--theme-*`
// sur <html> : tout le système de thème de l'app était inerte, et le mode
// session avait compensé en écrivant ses couleurs en dur (cf. docs/inventaire-da.md).
//
// ⚠ Ce layout ne rend AUCUN élément DOM enveloppant, et surtout aucune propriété
// `transform`, `filter`, `backdrop-filter`, `will-change` ou `contain` : une de
// ces propriétés sur un ancêtre crée un bloc englobant qui casse l'ancrage
// viewport des modales `position: fixed` descendantes. Piège déjà corrigé deux
// fois dans ce dépôt (`.grim-card-hover` utilise `top` et non `transform`,
// `.codex-page-transition` a perdu son transform persistant). Les surfaces
// modales du mode session sont portées vers `document.body` : cela doit le rester.
// ============================================================================

export default function SessionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ThemeLoader />
      {children}
    </>
  )
}
