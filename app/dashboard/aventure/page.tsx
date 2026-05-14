'use client'

import { useRouter } from 'next/navigation'

// Tableau de bord « Aventure » autonome (atteint depuis la barre de navigation
// mobile). Même grammaire visuelle que le mode Aventure du dashboard : titre
// MASTER SCREEN + grille de cartes d'activité. Les pages d'activité gèrent
// elles-mêmes la sélection du scénario.
export default function AventurePage() {
  const router = useRouter()

  const cartes = [
    {
      icon: '⚔',
      titre: 'Combat',
      desc: 'Initiatives, HP et conditions tour par tour',
      href: '/dashboard/combat'
    },
    {
      icon: '🧭',
      titre: 'Exploration',
      desc: 'Carte partagée et brouillard de guerre',
      href: '/dashboard/exploration'
    },
    {
      icon: '📺',
      titre: 'Présentation',
      desc: 'Écran joueurs / mode TV',
      href: '/dashboard/presentation'
    },
    {
      icon: '📝',
      titre: 'Journal',
      desc: 'Notes de session de tes scénarios',
      href: '/dashboard/scenarios'
    }
  ]

  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-3 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <header className="dashboard-hero">
        <h1 className="grimoire-codex">MASTER SCREEN</h1>
        <p className="grimoire-slogan">— Fortis Fortuna Adiuvat —</p>
        <div className="grimoire-divider-line" />
      </header>

      <section className="mb-4 md:mb-6 grimoire-frame">
        <span className="grimoire-diamond-top" aria-hidden="true">◆</span>
        <div className="grimoire-inner">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="grimoire-quick-title" style={{ margin: 0 }}>
              Mode Aventure
            </p>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-xs text-gray-400 hover:text-yellow-300 underline"
            >
              ← Retour à l&apos;accueil
            </button>
          </div>
          <div className="grimoire-aventure-grid">
            {cartes.map((c) => (
              <button
                key={c.titre}
                type="button"
                className="grimoire-aventure-card"
                onClick={() => router.push(c.href)}
              >
                <span className="grimoire-aventure-icon" aria-hidden="true">
                  {c.icon}
                </span>
                <p className="grimoire-aventure-card-title">{c.titre}</p>
                <p className="grimoire-aventure-card-desc">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
