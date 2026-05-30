'use client'

// ============================================================================
// Roadmap Affinement 4.6 — Astuces aléatoires au chargement
// ----------------------------------------------------------------------------
// Petite bulle discrète en bas qui affiche une astuce au démarrage de la
// session. Désactivable via le toggle (persisté en localStorage).
// ============================================================================

import { useEffect, useState, useMemo } from 'react'

const TIPS = [
  '💡 Ctrl+K ouvre la recherche globale, accessible partout dans l\'app.',
  '🎲 Cliquez sur le dé flottant pour lancer rapidement n\'importe quel dé.',
  '📖 Activez un scénario depuis sa fiche pour qu\'il devienne ton scénario par défaut.',
  '⚔️ En combat, glissez-déposez les participants pour réorganiser l\'initiative.',
  '🎨 Tu peux personnaliser ton dashboard depuis Personnalisation → Widgets.',
  '🎭 Le mode Présentation diffuse ton combat sur une TV ou un autre écran.',
  '🌗 Plusieurs thèmes visuels sont dispo dans Personnalisation → Thèmes.',
  '🧙 Les sorts et items D&D 5e officiels sont importables depuis Bibliothèque.',
  '🔥 Les attaques de zone (Fireball, etc.) sont gérables via "Effet de zone" en combat.',
  '📔 À la fin d\'une session, génère un récap automatique depuis le menu scénario.',
  '👥 Suis des MJ pour voir leurs nouvelles créations dans ton flux communauté.',
  '🏆 Débloque des achievements en jouant : lance ton premier dé, ton premier combat…',
  '⚡ Active le mode Hexcrawl pour un voyage tour-par-tour.',
  '📌 Pose des marqueurs sur les cartes pour noter pièges, trésors, ennemis.',
  '🌫 Le brouillard de guerre se peint au pinceau sur les maps en présentation.',
  '🎵 La Sound Box te permet de jouer ambiances et musiques pendant la session.',
  '✨ Les sorts ont des filtres avancés : type de dégâts, sauvegardes, école…',
  '📊 Suis l\'XP, l\'or et le loot de chaque PJ depuis la fiche scénario.',
  '🗺 Crée des mindmaps pour visualiser les relations entre PNJ.',
  '🎲 Lance la roue Wild Magic pour des effets aléatoires épiques.',
  '🛡 Les conditions D&D (étourdi, paralysé…) s\'appliquent en un clic en combat.',
  '🌦 Génère la météo de ton scénario selon la saison et le biome.',
  '📅 Crée un calendrier in-game personnalisé pour ta campagne.',
  '👁 Le Master Screen présentation cache automatiquement les notes MJ.',
  '🐉 Le bestiaire D&D 5e est importable d\'un clic depuis Bibliothèque.',
  '⭐ Marque tes scénarios favoris pour les retrouver en un clin d\'œil.',
  '🎓 Refais le tutoriel à tout moment depuis Aide → Refaire le tutoriel.',
  '📝 Les memos persistent par scénario : prends des notes en cours de session.',
  '🔄 Tu peux dupliquer un scénario complet pour en faire une variante.',
  '💾 Sauvegarde une fiche PNJ comme template pour la réutiliser plus tard.',
]

const STORAGE_KEY = 'codex_random_tip_v1'
const SESSION_KEY = 'codex_random_tip_session'

export default function RandomTip() {
  const [enabled, setEnabled] = useState(true)
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const off = window.localStorage.getItem(STORAGE_KEY) === 'off'
      if (off) { setEnabled(false); return }
      const alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === '1'
      if (alreadyShown) return
      setIndex(Math.floor(Math.random() * TIPS.length))
      const t = setTimeout(() => setVisible(true), 1200)
      window.sessionStorage.setItem(SESSION_KEY, '1')
      return () => clearTimeout(t)
    } catch { /* noop */ }
  }, [])

  const tip = useMemo(() => TIPS[index] ?? '', [index])

  if (!enabled || !visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        maxWidth: 520,
        width: 'calc(100vw - 32px)',
        padding: '10px 14px',
        background: 'linear-gradient(180deg, #14171dee 0%, #0a0c10ee 100%)',
        border: '1px solid rgba(201, 168, 76, 0.32)',
        borderRadius: 10,
        boxShadow: '0 8px 28px rgba(0,0,0,0.5), 0 0 18px rgba(201,168,76,0.10)',
        backdropFilter: 'blur(4px)',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 13,
        color: 'rgba(232,232,236,0.9)',
        letterSpacing: '0.02em',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ flex: 1 }}>{tip}</span>
      <button
        type="button"
        onClick={() => setIndex((i) => (i + 1) % TIPS.length)}
        title="Astuce suivante"
        aria-label="Astuce suivante"
        style={{
          background: 'transparent', border: 0, cursor: 'pointer',
          color: 'rgba(201,168,76,0.85)', fontSize: 14, padding: '0 4px'
        }}
      >↻</button>
      <button
        type="button"
        onClick={() => { setVisible(false) }}
        title="Fermer"
        aria-label="Fermer"
        style={{
          background: 'transparent', border: 0, cursor: 'pointer',
          color: 'rgba(232,232,236,0.5)', fontSize: 14, padding: '0 4px'
        }}
      >✕</button>
      <button
        type="button"
        onClick={() => {
          try { window.localStorage.setItem(STORAGE_KEY, 'off') } catch { /* noop */ }
          setEnabled(false)
        }}
        title="Ne plus afficher"
        aria-label="Désactiver les astuces"
        style={{
          background: 'transparent', border: 0, cursor: 'pointer',
          color: 'rgba(232,232,236,0.4)', fontSize: 11, padding: '0 4px'
        }}
      >🚫</button>
    </div>
  )
}
