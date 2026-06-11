'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap Affinement 4.4 — Centre d'aide intégré
// ----------------------------------------------------------------------------
// Page /dashboard/aide avec :
//   - Refaire le tutoriel
//   - Guide d'utilisation par fonctionnalité
//   - FAQ
//   - Signaler un bug (lien GitHub Issues)
//   - Suggérer une amélioration
//   - Contact support
// ============================================================================

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/app/components/ui/Toast'
import { confirmDialog } from '@/app/components/ui/ConfirmDialog'

type Article = {
  id: string
  titre: string
  categorie: string
  icon: string
  contenu: string
}

const ARTICLES: Article[] = [
  // ---------- Démarrer ----------
  {
    id: 'creer-scenario',
    titre: 'Créer mon premier scénario',
    categorie: 'Démarrer',
    icon: '📖',
    contenu: `Va dans **Codex → Scénarios**. Donne un nom et une description, ou clique sur **« 📚 Depuis un template… »** pour partir d'un squelette pré-fait (Donjon classique, Mystère social, Heist, etc.). Les chapitres sont créés automatiquement.`,
  },
  {
    id: 'creer-perso',
    titre: 'Créer un personnage joueur',
    categorie: 'Démarrer',
    icon: '🧙',
    contenu: `**Codex → Personnages** puis « Créer ». Remplis nom, classe, race, niveau. Les statistiques (FOR, DEX, CON…) et les emplacements de sorts sont calculés automatiquement selon la classe.`,
  },
  {
    id: 'inviter-joueur',
    titre: 'Inviter un joueur dans un scénario',
    categorie: 'Démarrer',
    icon: '🤝',
    contenu: `Sur la fiche d'un scénario, clique sur **« 🔑 Inviter un joueur »** pour générer un code unique. Le joueur le saisit depuis sa propre app pour rejoindre.`,
  },
  // ---------- Mode Aventure ----------
  {
    id: 'combat',
    titre: 'Lancer un combat',
    categorie: 'Mode Aventure',
    icon: '⚔️',
    contenu: `Active un scénario, puis **Aventure → Combat**. Ajoute les PJ et ennemis, lance l'initiative. Les conditions, les dégâts et les KO sont gérés automatiquement.`,
  },
  {
    id: 'aoe',
    titre: 'Utiliser un effet de zone (Fireball, etc.)',
    categorie: 'Mode Aventure',
    icon: '🔥',
    contenu: `Dans un combat actif, ouvre le menu **« 💥 Effet de zone »**. Saisis l'expression de dégâts (ex : 8d6), le type de sauvegarde (DEX/CON), le DD. Coche les cibles, l'app applique automatiquement plein/moitié dégâts.`,
  },
  {
    id: 'presentation',
    titre: 'Diffuser sur une TV (mode Présentation)',
    categorie: 'Mode Aventure',
    icon: '📺',
    contenu: `Va dans **Présentation** et démarre une session. Tu obtiens un QR code à scanner depuis n'importe quel écran : tablet, TV via navigateur, etc. Tout ce que tu fais côté MJ est diffusé en temps réel.`,
  },
  // ---------- Outils ----------
  {
    id: 'commande-globale',
    titre: 'Recherche globale (Ctrl+K)',
    categorie: 'Outils',
    icon: '🔍',
    contenu: `Appuie sur **Ctrl + K** (ou ⌘+K sur Mac) n'importe où dans l'app pour ouvrir la palette : retrouve sorts, ennemis, personnages, scénarios instantanément.`,
  },
  {
    id: 'des',
    titre: 'Lancer des dés',
    categorie: 'Outils',
    icon: '🎲',
    contenu: `Le bouton flottant **🎲** en bas à droite ouvre le lanceur 3D. Choisis le type de dé, le nombre, avantage/désavantage. Les critiques (20 / 1 nat) déclenchent une animation spectaculaire.`,
  },
  {
    id: 'sound-box',
    titre: 'Sound Box (ambiances musicales)',
    categorie: 'Outils',
    icon: '🎵',
    contenu: `Ouvre la **Sound Box** depuis le menu flottant. Joue ambiances et boucles sonores en parallèle. Tes playlists sont sauvegardées entre sessions.`,
  },
  {
    id: 'meteo',
    titre: 'Générer la météo',
    categorie: 'Outils',
    icon: '🌦',
    contenu: `Depuis la fiche d'un scénario, clique sur **« 🌦 Générer la météo »**. Choisis saison + biome — l'app génère température, précipitations, vent, visibilité et effets gameplay.`,
  },
  {
    id: 'calendrier',
    titre: 'Calendrier in-game',
    categorie: 'Outils',
    icon: '🗓',
    contenu: `Sur la fiche d'un scénario, **« 🗓 Calendrier in-game »**. Configure tes mois, jours de la semaine, saisons. Avance la date jour par jour. Note les événements importants sur la timeline.`,
  },
  {
    id: 'recap',
    titre: 'Récap automatique de session',
    categorie: 'Outils',
    icon: '📔',
    contenu: `À la fin d'une session, clique sur **« 📔 Récap de session »** dans la fiche scénario. L'app compile automatiquement combats, PNJ rencontrés, lieux visités, quêtes débloquées. Éditable.`,
  },
  // ---------- Communauté ----------
  {
    id: 'partager',
    titre: 'Partager mes créations',
    categorie: 'Communauté',
    icon: '🌍',
    contenu: `Sur chaque entité (scénario, ennemi, PNJ, item, sort, map), tu peux activer **« Public »**. Tes créations apparaissent alors dans **Communauté** pour les autres MJ.`,
  },
  {
    id: 'follow',
    titre: 'Suivre des utilisateurs',
    categorie: 'Communauté',
    icon: '📡',
    contenu: `Va sur un profil public (depuis Communauté) et clique sur **« + Suivre »**. Retrouve toutes leurs nouvelles créations dans **Communauté → Mon flux**.`,
  },
  // ---------- Personnalisation ----------
  {
    id: 'themes',
    titre: 'Changer de thème visuel',
    categorie: 'Personnalisation',
    icon: '🎨',
    contenu: `**Personnalisation → Thèmes**. Plusieurs thèmes disponibles (Eclipsed, Forge, Tavern…) — chacun avec sa propre palette et son ambiance.`,
  },
  {
    id: 'achievements',
    titre: 'Achievements & succès',
    categorie: 'Personnalisation',
    icon: '🏆',
    contenu: `Va dans **Achievements** pour voir tes succès débloqués. Lance des dés, crée du contenu, joue des sessions : chaque action peut débloquer un badge.`,
  },
]

const FAQ = [
  {
    q: 'Mes données sont-elles sauvegardées ?',
    r: 'Oui, tout est stocké dans une base Supabase chiffrée. Tu peux exporter chaque entité au format JSON depuis sa fiche.',
  },
  {
    q: 'Comment réinitialiser mon onboarding ?',
    r: 'Va dans **Aide → Refaire le tutoriel** ci-dessus pour relancer l\'onboarding à zéro.',
  },
  {
    q: 'Puis-je utiliser l\'app hors-ligne ?',
    r: 'Partiellement. Une fois chargées, les pages déjà visitées restent consultables, mais la synchro nécessite une connexion.',
  },
  {
    q: 'Comment importer du contenu D&D 5e officiel ?',
    r: 'Va dans **Bibliothèque** : tu peux importer en masse bestiaire, sorts, items, PNJ pré-faits.',
  },
  {
    q: 'L\'app est-elle gratuite ?',
    r: 'Oui, totalement, sans pub. C\'est un projet personnel ouvert à tous les MJ.',
  },
]

export default function AidePage() {
  const router = useRouter()
  const [recherche, setRecherche] = useState('')

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    if (!q) return ARTICLES
    return ARTICLES.filter((a) =>
      `${a.titre} ${a.categorie} ${a.contenu}`.toLowerCase().includes(q)
    )
  }, [recherche])

  const categories = useMemo(() => {
    const cats = new Map<string, Article[]>()
    for (const a of filtres) {
      const arr = cats.get(a.categorie) ?? []
      arr.push(a)
      cats.set(a.categorie, arr)
    }
    return [...cats.entries()]
  }, [filtres])

  const refaireTuto = async () => {
    const ok = await confirmDialog({
      title: 'Refaire le tutoriel ?',
      message: 'Le tutoriel d\'onboarding sera relancé au prochain chargement.',
    })
    if (!ok) return
    try {
      window.localStorage.removeItem('codex_onboarding_done_v1')
      window.localStorage.removeItem('codex_onboarding_step_v1')
      toast.success('Tutoriel réactivé — recharge la page')
    } catch { toast.error('Impossible de réinitialiser') }
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white">← Retour</button>
          <h1 className="text-2xl grim-title">❓ Centre d&apos;aide</h1>
        </div>

        <div className="grim-card p-5 mb-6">
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="🔍 Rechercher dans l&apos;aide…"
            className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <button onClick={refaireTuto} className="codex-card codex-card-hover p-4 text-left codex-btn-press">
            <div className="text-2xl mb-1">🎓</div>
            <div className="font-semibold text-yellow-300">Refaire le tutoriel</div>
          </button>
          <button type="button" onClick={() => router.push('/dashboard/feedback')} className="codex-card codex-card-hover p-4 text-left codex-btn-press">
            <div className="text-2xl mb-1">🐛</div>
            <div className="font-semibold text-yellow-300">Signaler un problème</div>
          </button>
          <button type="button" onClick={() => router.push('/dashboard/feedback')} className="codex-card codex-card-hover p-4 text-left codex-btn-press">
            <div className="text-2xl mb-1">💡</div>
            <div className="font-semibold text-yellow-300">Suggérer une amélioration</div>
          </button>
        </div>

        {categories.map(([cat, articles]) => (
          <section key={cat} className="mb-6">
            <h2 className="text-sm uppercase tracking-wider text-gray-500 mb-2">{cat}</h2>
            <div className="flex flex-col gap-2">
              {articles.map((a) => (
                <details key={a.id} className="codex-card overflow-hidden">
                  <summary className="p-3 cursor-pointer flex items-center gap-3 hover:bg-gray-800/40 transition select-none">
                    <span className="text-xl">{a.icon}</span>
                    <span className="flex-1 font-medium text-gray-100">{a.titre}</span>
                    <span className="text-xs text-gray-500">▾</span>
                  </summary>
                  <div className="p-3 pt-0 text-sm text-gray-300 leading-relaxed">
                    {a.contenu.split('**').map((part, i) => i % 2 === 1
                      ? <strong key={i} className="text-yellow-300">{part}</strong>
                      : <span key={i}>{part}</span>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-gray-500 mb-2">FAQ</h2>
          <div className="flex flex-col gap-2">
            {FAQ.map((f, i) => (
              <details key={i} className="codex-card overflow-hidden">
                <summary className="p-3 cursor-pointer flex items-center gap-3 hover:bg-gray-800/40 transition select-none">
                  <span className="text-xl">❓</span>
                  <span className="flex-1 font-medium text-gray-100">{f.q}</span>
                </summary>
                <div className="p-3 pt-0 text-sm text-gray-300 leading-relaxed">{f.r}</div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
