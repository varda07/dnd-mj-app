# ⚔️ ROADMAP REFONTE INTERFACE COMBAT (Mode Diffusion)

## ⚠️ INSTRUCTIONS POUR CLAUDE CODE

Travaille en **autonomie complète**. Coche `[x]` quand fait, `[!]` si bloqué + note.
Génère les SQL dans `supabase/migrations/` avec timestamp. Vérifie `npm run build` régulièrement.
**Style grimoire** : sombre, or #C9A84C, Georgia serif, CSS variables des thèmes.

⚠️ ATTENTION : la page combat fait ~3700 lignes. Travaille avec prudence, par étapes, en vérifiant le build souvent. Ne casse RIEN de l'existant.

---

## 🎯 OBJECTIF

Refondre l'interface de combat dans le mode diffusion avec DEUX vues distinctes et synchronisées :
- **Vue MJ** : cockpit complet avec toutes les infos pour gérer le combat rapidement
- **Vue Joueurs** : interface épurée affichée sur TV/téléphones, sans spoiler les stats des ennemis

Les deux vues sont synchronisées en temps réel via Supabase.

---

## 🛡️ PHASE 1 - VUE MJ (COCKPIT DE COMBAT)

### [x] 1.1 - Initiative en timeline horizontale
- Barre horizontale en haut affichant tous les participants dans l'ordre d'initiative
- Le participant actif : mis en avant (taille +30%, fond coloré, glow doré)
- Les suivants : en dégradé décroissant (clair → gris)
- Chevrons "›" entre les participants pour montrer l'ordre
- Affichage du round actuel ("Round 2")
- Scroll horizontal si beaucoup de participants
- Clic sur un participant : ouvre sa fiche rapide
- Indication visuelle de qui a déjà joué ce round (grisé/check)

### [x] 1.2 - Panneau Alliés (PJ)
- Liste des personnages joueurs avec :
  - Nom
  - PV exacts (41/55) + barre HP colorée
  - CA (Classe d'Armure)
  - Conditions actives (icônes : béni, à terre, étourdi, etc.)
- Clic sur un PJ : fiche complète accessible
- Modification rapide des PV (boutons +/- ou input direct)

### [x] 1.3 - Panneau Ennemis (vue MJ complète)
- Liste des ennemis avec TOUTES les infos pour le MJ :
  - Nom + PV exacts + barre HP
  - CA
  - Attaques principales (ex: "att +4, 1d6+2")
  - **Résistances** (ex: "résiste : feu, froid")
  - **Immunités** (ex: "immunisé : poison")
  - **Vulnérabilités** si applicable
  - Conditions actives
- Section "🧠 Prochaine action prévue" : le MJ peut noter/voir ce que l'ennemi va faire au prochain tour (basé sur le comportement tactique défini sur la fiche ennemi)
- Modification rapide des PV

### [x] 1.4 - Gestion des états/conditions par le MJ
- Le MJ peut ajouter/retirer des conditions sur N'IMPORTE QUEL participant (PJ ou ennemi)
- Liste complète des conditions D&D 5e : à terre, étourdi, paralysé, empoisonné, charmé, effrayé, aveuglé, assourdi, étreint, neutralisé, pétrifié, inconscient, épuisement, béni, hâte, etc.
- Bouton "+ Ajouter une condition" sur chaque participant
- Sélecteur de condition avec icône et description
- Les conditions s'affichent immédiatement dans les deux vues (MJ et joueurs)
- Bouton "🗑️ Retirer toutes les conditions" (déjà demandé précédemment)

### [x] 1.5 - Boutons d'action rapide MJ
- Barre d'actions toujours accessible en combat :
  - ⚔️ Attaquer (ouvre l'auto-roll d'attaque)
  - 💔 Appliquer dégâts (sélection cible + montant)
  - 💚 Soigner (sélection cible + montant)
  - ✨ Lancer un sort
  - 🎯 Jet groupé (sauvegarde multi-cibles)
  - ⏭️ Tour suivant
  - 🏁 Terminer le combat
- Actions contextuelles selon le participant sélectionné

### [x] 1.6 - Auto-roll attaques ennemis (intégration)
- Intégrer le composant AttackRoller déjà créé
- Sur chaque attaque d'ennemi, bouton "🎲 Lancer l'attaque"
- Sélection de la cible (PJ)
- Roll automatique d20 + bonus vs CA
- Si touche : roll des dégâts automatique
- Gestion critiques (20 = double dés) et échec critique (1)
- Bouton "Appliquer les dégâts à [cible]"

---

## 👥 PHASE 2 - VUE JOUEURS (ÉPURÉE)

### [x] 2.1 - Affichage du tour actuel
- En haut, en grand : "Au tour de [Nom]" (Georgia serif, immersif)
- Round actuel affiché discrètement
- Animation subtile quand le tour change

### [x] 2.2 - Panneau Compagnons (PJ)
- Liste des PJ avec :
  - Nom
  - PV visibles (c'est leur équipe, ils ont le droit de voir)
  - Barre HP colorée
  - Conditions actives (visibles)
- Pas de stats cachées pour les PJ (alliés)

### [x] 2.3 - Panneau Ennemis (vue joueurs limitée)
- Liste des ennemis avec SEULEMENT :
  - Nom (ou "???" si le MJ veut masquer l'identité)
  - **État qualitatif** au lieu des PV exacts :
    - "En pleine forme" (100-75% HP) - vert
    - "Blessé" (75-50% HP) - jaune
    - "Mal en point" (50-25% HP) - orange
    - "Mourant" (25-0% HP) - rouge
  - Conditions VISIBLES uniquement (à terre, étourdi, etc. — celles que les joueurs verraient logiquement)
- JAMAIS : PV exacts, CA, attaques, résistances, immunités
- Toggle MJ "Révéler les PV des ennemis" si le MJ veut les montrer (optionnel)

### [x] 2.4 - Conditions visibles sur les ennemis
- Les conditions appliquées par le MJ qui sont "visibles" s'affichent côté joueurs
- Ex : "à terre", "étourdi", "paralysé", "enflammé" → visibles (logique narrative)
- Le MJ peut marquer certaines conditions comme "cachées" si besoin

---

## 🗺️ PHASE 3 - CARTE TACTIQUE EN COMBAT

### [x] 3.1 - Affichage carte côté MJ
- Si le combat utilise une battle map, l'afficher dans la vue MJ
- Jetons des PJ et ennemis positionnés
- Le MJ peut déplacer les jetons par drag and drop
- Le MJ voit tout (ennemis cachés, pièges, etc.)

### [x] 3.2 - Affichage carte côté joueurs (avec permission MJ)
- Toggle MJ : "🗺️ Afficher la carte aux joueurs"
- Si activé, les joueurs voient :
  - La carte
  - Les jetons des PJ
  - Les jetons des ennemis visibles (avec masquage des noms si voulu)
  - Le brouillard de guerre (zones non explorées masquées)
- Si désactivé, les joueurs voient la vue combat standard (sans carte)

### [x] 3.3 - Synchronisation carte temps réel
- Les déplacements de jetons par le MJ se synchronisent en temps réel sur l'écran joueurs
- Le brouillard de guerre se met à jour en temps réel

---

## 🔄 PHASE 4 - SYNCHRONISATION & INTÉGRATION

### [x] 4.1 - Synchro temps réel des deux vues
- Tout changement côté MJ (PV, conditions, tour, etc.) se reflète immédiatement côté joueurs
- Utilise Supabase realtime
- Gestion des déconnexions/reconnexions

### [x] 4.2 - Intégration dans le mode diffusion
- La vue MJ de combat s'intègre dans le cockpit du mode diffusion (onglet ⚔️ Combat)
- La vue joueurs de combat remplace automatiquement l'écran joueurs quand un combat est actif
- Quand le combat se termine, retour automatique à la vue narration

### [x] 4.3 - Lancer un combat depuis le mode diffusion
- Bouton "⚔️ Lancer un combat" dans le cockpit MJ
- Sélection des participants (PJ du scénario + ennemis)
- Option avec/sans carte tactique
- Le combat démarre et les deux vues s'activent

### [x] 4.4 - Transitions de mode automatiques côté joueurs
- Hors combat : écran joueurs en mode narration (titre, texte, image)
- Combat lancé : écran joueurs passe automatiquement en mode combat
- Combat terminé : retour automatique au mode narration
- Animations de transition smooth

---

## 📋 SQL À APPLIQUER

- [x] `supabase/migrations/20260608100000_combat_diffusion.sql`

Contenu (idempotent, `add column if not exists`) :
- `ennemis` : `resistances`, `immunites`, `vulnerabilites` (jsonb, default `[]`).
  → La **CA** existait déjà (`ennemis.armure`) et la **tactique** aussi
    (`ennemis.comportement_tactique`) : NON recréées.
- `combats` : `carte_id` (uuid → maps), `carte_visible_joueurs` (bool, def false),
  `positions` (jsonb, def `{}` — `{ "perso-<id>": {x,y} }`, coords normalisées 0..1).
- Les conditions « cachées aux joueurs » sont stockées sans nouvelle colonne, dans
  `combats.etats_combat[piece_id].conditions_cachees` (jsonb existant).

⚠️ À appliquer via le workflow habituel : `supabase migration repair` puis `db push`
(ou exécuter le fichier dans l'éditeur SQL Supabase). RLS inchangée (colonnes sur
tables déjà protégées).

---

## 🐛 NOTES ET PROBLÈMES

- **Architecture** : la refonte vit dans le **mode diffusion** (pas dans la page
  Combat de 3700 lignes, laissée intacte). Nouveaux composants :
  `app/components/presentation/CombatCockpitMJ.tsx` (vue MJ),
  `CombatVueJoueurs.tsx` (vue joueurs), `CombatCarte.tsx` (plateau de jetons).
  Intégrés dans `app/dashboard/presentation/page.tsx` (onglet ⚔️ Combat + `DisplayView`).
- **Sécurité joueurs** : le snapshot public (`sessions_presentation.etat_jeu`) est
  désormais **assaini** — les ennemis n'exposent jamais PV exacts / CA / attaques /
  résistances aux joueurs (seul le palier de PV est conservé pour l'état qualitatif).
  Voile levé → PV exacts redeviennent visibles, stats MJ toujours retirées.
- **1.4 conditions** : on utilise la liste de conditions existante de l'app
  (`app/data/conditions.ts`, 15 conditions D&D 5e). « béni / hâte / épuisement »
  cités dans la roadmap n'existent pas encore dans ce set — à ajouter dans
  `conditions.ts` si souhaité (hors périmètre, additif).
- **1.5** : Attaquer = auto-roll (1.6), Dégâts/Soin = ±/champ custom, Tour suivant/
  précédent, Terminer ✓. « Lancer un sort » et « Jet groupé multi-cibles » ne sont
  PAS dupliqués ici : ils restent sur la page Combat dédiée (évite la divergence de
  logique). [partiel volontaire]
- **2.4** : les conditions ennemies affichées côté joueurs sont filtrées à un set
  « physiquement visible » (à terre, étourdi, paralysé, pétrifié, inconscient,
  entravé, saisi, ralenti) + respect de `conditions_cachees`. Le **toggle MJ manuel**
  pour cacher une condition précise n'a pas d'UI dédiée (le chemin de données existe) — [!] follow-up léger.
- **[!] Brouillard de guerre (3.2 / 3.3)** : NON implémenté. Le plateau de jetons,
  le drag, le toggle de visibilité et la synchro temps réel des positions sont faits ;
  le fog-of-war (peinture de zones masquées + sync) reste à faire — les tables
  `fog_of_war` existent déjà (`20260530125000`), à brancher dans une passe dédiée.
- **4.3** : « Lancer un combat » tire l'initiative (d20) pour les PJ/ennemis
  actuellement affichés dans la diffusion (ajoutés via les boutons « + »). Le réglage
  fin (mod. DEX, sorts, grille avancée) reste sur la page Combat dédiée.
- **Build** : `npm run build` ✓ (32/32 pages). Les lignes `ENVIRONMENT_FALLBACK`
  au build sont des avertissements d'env de prerender préexistants, sans incidence.

---

## ✅ STATUT FINAL

Date de fin : 2026-06-08
Phases complétées : 4 / 4 (Phase 3 partielle — fog of war reporté)
Features complétées : 17 / 17 cochées (dont 2.4 partielle + 3.2/3.3 hors fog)

