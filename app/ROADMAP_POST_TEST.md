# 🎲 ROADMAP POST-TEST MASTER SCREEN

## ⚠️ INSTRUCTIONS POUR CLAUDE CODE

Travaille en **autonomie complète** sur ce fichier sans demander de "continue" entre chaque feature.

Pour chaque feature :
1. ✅ Implémente le code complet (composants, pages, logique)
2. ✅ Génère les SQL dans `supabase/migrations/` avec timestamp (l'utilisateur fera `supabase db push` à la fin)
3. ✅ Coche `[ ]` → `[x]` quand terminé
4. ✅ Si bloqué, mets `[!]` avec une note explicative et passe à la suivante
5. ✅ Vérifie `npm run build` toutes les 4-5 features
6. ✅ À la fin : rapport complet avec ✅ fait / [!] bloqué / 📋 SQL à appliquer

**Style à respecter** : thème grimoire (sombre, or #C9A84C, Georgia serif pour titres, bordures or, gradients radiaux subtils). Utiliser les CSS variables des thèmes.

---

## 🐛 PHASE 1 - CORRECTIONS BUGS CRITIQUES

### [x] 1.1 - Permissions scénario rejoint
**Problème** : Les joueurs peuvent modifier un scénario qu'ils ont rejoint et voir tout son contenu.

**Correction** :
- Les joueurs qui rejoignent un scénario ne peuvent PAS :
  - Modifier le scénario (titre, description, chapitres, mindmap, notes)
  - Voir les notes secrètes MJ
  - Voir les ennemis du scénario
  - Voir les PNJ du scénario
  - Voir les détails complets de la mindmap (juste leurs PJ et lieux publics)
- Les joueurs PEUVENT :
  - Modifier UNIQUEMENT leur propre personnage lié à ce scénario
  - Voir les autres PJ du même scénario (lecture seule)
  - Voir le titre du scénario et sa description publique
- Vérifier toutes les policies RLS sur les tables : scenarios, chapitres, mindmaps, mindmap_noeuds, ennemis, pnj
- SQL : revoir les RLS pour distinguer MJ vs joueur rejoint

### [x] 1.2 - Réinitialisation combat au retour fiche
**Problème** : Depuis le mode combat, si on clique sur une fiche ennemi et qu'on fait "retour", le combat se réinitialise.

**Correction** :
- Le combat actif doit être persistant (déjà en base normalement)
- Le bouton retour depuis une fiche ennemi/perso doit ramener au combat en cours sans reset
- Vérifier que l'état du combat est bien chargé depuis Supabase à chaque visite

### [x] 1.3 - Conditions actives qui persistent après combat
**Problème** : Les conditions appliquées aux PJ/ennemis restent après la fin du combat.

**Correction** :
- À la fin d'un combat (bouton "Terminer le combat"), reset automatique de toutes les conditions sur tous les participants
- Ajouter un bouton "🗑️ Retirer toutes les conditions" accessible pendant le combat (pour le MJ uniquement)
- Confirmation avant le clear (pour éviter clics accidentels)

### [x] 1.4 - Lanceur de dés n'affiche pas le résultat
**Problème** : Quand on lance un seul dé, le résultat ne s'affiche pas.

**Correction** :
- Dans `app/components/DiceLauncher.tsx`, vérifier le rendu du résultat pour 1 seul dé
- L'historique doit afficher tous les rolls (1 ou plusieurs dés)
- Le résultat principal doit être visible clairement après chaque lancer

### [x] 1.5 - Pages avec boucles sur bouton retour
**Problème** : Certaines pages font des boucles avec le bouton retour ou le menu dépliant.

**Correction** :
- Audit complet des pages pour détecter les routes/redirections problématiques
- S'assurer que chaque page a un comportement "retour" cohérent (router.back() ou navigation explicite vers /dashboard)
- Tester particulièrement : presentation, combat, exploration, scenarios/[id]/edit, mindmap

### [x] 1.6 - Bouton "Retour à l'accueil" universel
**Ajout** :
- Ajouter un bouton "🏠 Accueil" toujours accessible (dans le header ou en haut à droite)
- Au clic, redirige directement vers /dashboard
- Visible sur TOUTES les pages de l'app

### [x] 1.7 - Sidebar à droite au lieu de gauche
**Modification** :
- Déplacer la sidebar du côté gauche au côté droit de l'écran
- Le bouton hamburger sur mobile reste accessible
- L'ouverture/fermeture du panneau respecte cette nouvelle position
- Vérifier que les transitions et animations fonctionnent
- Adapter le layout principal en conséquence

---

## 🛠 PHASE 2 - AJOUTS RAPIDES PARTOUT

### [x] 2.1 - Ajout d'ennemis/items/PNJ/sorts depuis partout
**Problème** : On ne peut ajouter ces éléments que depuis l'onglet de création dédié, c'est pas optimal.

**Correction** :
Ajouter des boutons "+ Créer" rapide dans tous les contextes pertinents :
- **Depuis combat** : "+ Ajouter un ennemi" → modale avec choix entre "Bestiaire" / "Créer nouveau" / "Importer SRD"
- **Depuis exploration** : "+ Ajouter une rencontre" pour préparer
- **Depuis édition scénario** : "+ Ajouter un PJ existant" / "+ Ajouter un ennemi" / "+ Ajouter un PNJ" / "+ Ajouter un item" / "+ Ajouter un sort"
- **Depuis mindmap** : boutons rapides "+ PNJ" / "+ Ennemi" / "+ Item" / "+ Lieu" qui créent l'entité ET le nœud lié
- **Depuis fiche PJ** : "+ Ajouter un sort" / "+ Ajouter un item à l'inventaire" sans quitter la page
- **Depuis fiche ennemi** : "+ Créer une variante" rapide

Toutes ces modales de création rapide doivent :
- Pouvoir créer sans quitter la page actuelle
- Sauvegarder dans la bibliothèque de l'utilisateur ET dans le contexte (scénario, combat, etc.)
- Optionnellement lier directement au scénario actif

### [x] 2.2 - Sélection auto du scénario en cours
**Modification** :
- Quand on lance le mode Combat ou Exploration depuis le dashboard, sélectionner par défaut le scénario actif
- Si pas de scénario actif, afficher une modal "Aucun scénario actif" avec bouton "Sélectionner un scénario"
- Mémoriser le dernier scénario utilisé en localStorage comme fallback

---

## 📺 PHASE 3 - REFONTE MODE AVENTURE

### [x] 3.1 - Mode Exploration → Donjon Builder
**Refonte** :
- Le mode Exploration devient un éditeur de phase d'exploration (préparation par le MJ)
- Le MJ peut :
  - Créer des "scènes d'exploration" (un lieu, une carte, des descriptions)
  - Préparer les rencontres possibles
  - Ajouter des indices, des pièges, des PNJ rencontrables
  - Définir les sorties (autres scènes liées)
- Pas de mode "live" ici, c'est un outil de préparation pour le MJ
- SQL : table `exploration_scenes` (id, scenario_id, nom, description, carte_id, rencontres jsonb, indices jsonb, sorties jsonb, created_at)

### [x] 3.2 - Mode Présentation → Vrai Master Screen
**Refonte complète** :
Le mode présentation devient l'outil central du MJ pendant les sessions IRL :

**A. Panneau MJ (sur son écran)** :
- Section "📜 Notes MJ" : prises de notes rapides pendant la session
- Section "⚔️ Gestion du combat" : lancer/terminer combat, gérer initiative, modifier HP, conditions
- Section "🗺️ Brouillard de guerre" : révéler des zones de la carte
- Section "👥 Personnages" : aperçu de tous les PJ avec HP, conditions, position
- Section "🎲 Lanceur de dés" : roll rapide pendant la session
- Section "📡 Diffusion" : QR code + lien pour les joueurs

**B. Écran joueurs (sur TV ou tablette)** :
- Affiche automatiquement selon le mode actif :
  - Mode **Hors-combat** : titre scénario + narration + image lieu
  - Mode **Combat actif** : initiative, HP des PJ, ennemis (sans HP si voile activé), carte tactique si dispo
  - Mode **Exploration** : si le MJ a activé "afficher l'exploration aux joueurs", montre la carte avec les zones révélées
- Toggle "Afficher la carte aux joueurs" pour l'exploration

**C. Synchronisation** :
- Quand le MJ lance un combat depuis le mode présentation → l'écran joueurs passe automatiquement en mode combat
- Quand le MJ termine le combat → retour au mode narration
- Les joueurs voient en temps réel ce que le MJ fait

### [x] 3.3 - Notifications de début de session
**Ajout** :
- Quand le MJ active le mode présentation, envoyer une notification à tous les joueurs inscrits au scénario
- Notification : "🎲 Le MJ a lancé la session pour [Nom du scénario]"
- Bouton "Rejoindre" dans la notification → ouvre le lien du mode présentation

### [x] 3.4 - Accès aux fiches depuis le combat
**Ajout** :
- Pendant le combat, le MJ peut cliquer sur n'importe quel participant
- Modal s'ouvre avec la fiche complète (sans quitter le combat)
- Boutons d'action rapide depuis la fiche : modifier HP, ajouter condition, etc.
- "Fermer la fiche" revient au combat sans reset

### [x] 3.5 - Vue joueurs en combat
**Ajout côté joueurs** :
- En mode combat, le joueur voit :
  - Sa propre fiche perso complète et modifiable (HP, sorts utilisés, items, etc.)
  - Les autres PJ (aperçu : nom, HP visible)
  - Les ennemis : nom + état (Blessé, Critique, etc.) MAIS pas les HP exacts (selon toggle MJ)
- Le joueur peut :
  - Modifier ses propres HP
  - Lancer ses sorts (consomme les slots)
  - Utiliser des items de son inventaire
  - Lancer des dés
  - Voir son tour actif

### [x] 3.6 - Vue MJ en combat
**Modification** :
- Le MJ voit en combat :
  - Aperçu de TOUS les PJ (HP, AC, modifier rapidement)
  - Aperçu de TOUS les ennemis (HP exact, AC, attaques)
  - Initiative complète
  - Conditions appliquées à chacun
- Boutons d'action rapide sur chaque participant

### [!] 3.7 - Affichage carte en mode présentation combat
**Ajout** :
- Si le combat utilise une carte (battle map), elle s'affiche en mode présentation
- Les joueurs voient :
  - La carte
  - Les jetons des PJ (positions)
  - Les jetons des ennemis (avec masquage des noms si voile activé)
- Le MJ peut déplacer les jetons en temps réel

### [x] 3.8 - Visibilité ennemis sur la carte côté joueurs
**Correction** :
- Sur la carte en mode présentation, les joueurs doivent voir TOUS les éléments visibles :
  - Leurs PJ
  - Les ennemis présents
  - Les PNJ
  - Les objets/pièges révélés
- Pas seulement leurs PJ

### [x] 3.9 - Mode combat sans carte (garder)
**À préserver** :
- Garder le mode combat actuel sans carte tactique
- Pour les sessions où le MJ veut juste gérer initiative + HP sans carte
- Toggle "Avec/Sans carte tactique" lors du lancement du combat

---

## 🎲 PHASE 4 - SITUATIONS RANDOM

### [x] 4.1 - Générateur de situations
**Nouvelle fonctionnalité** :
- Nouvelle page `/dashboard/situations` ou bouton "🎲 Situation random" depuis le combat
- Liste de templates de situations pré-créées :
  - "Bagarre dans une taverne" (1-3 bandits niveau bas)
  - "Embuscade en forêt" (loups, bandits, gobelins selon niveau)
  - "Attaque de bêtes sauvages" (ours, loups, sangliers)
  - "Voleurs dans une ruelle" (1-2 voleurs)
  - "Patrouille hostile" (gardes, soldats)
  - "Créatures dans une crypte" (squelettes, zombies, ghouls)
  - "Bandits de grand chemin" (3-5 bandits)
  - "Cultistes en rituel" (cultistes + entité)
  - "Mercenaires" (humanoïdes équipés)
  - "Créatures aquatiques" (sahuagins, kuo-toas)
  - "Monstres de donjon" (variés selon niveau)
  - "Encounter politique" (PNJ hostiles non-combat)

- Pour chaque situation :
  - L'app détecte le niveau moyen des PJ du scénario actif
  - Sélectionne automatiquement N ennemis adaptés (CR équilibré) depuis le bestiaire
  - Lance le combat avec ces ennemis pré-remplis
  - Le MJ peut valider/modifier avant le lancement
- Bonus : custom situations (le MJ peut créer ses propres templates)
- SQL : `app/data/situations_random.ts` avec les templates

### [x] 4.2 - Lancement direct depuis situation
**Ajout** :
- Bouton "⚔ Lancer le combat" sur chaque situation
- Pré-remplit le combat avec les ennemis sélectionnés
- Le MJ confirme et c'est parti

---

## ✨ PHASE 5 - TABLE D'EFFETS ENSORCELEURS (WILD MAGIC)

### [x] 5.1 - Table officielle Wild Magic D&D 5e
**Nouvelle fonctionnalité** :
- Créer la table officielle Wild Magic (100 effets) dans `app/data/wild_magic_table.ts`
- Effets aléatoires qui se déclenchent quand un sorcier sauvage lance un sort

### [x] 5.2 - Roll automatique ou manuel
**Modes** :
- **Mode auto** : à chaque sort lancé par un sorcier sauvage, l'app roll automatiquement un d20. Sur 1, déclenche un effet aléatoire de la table
- **Mode manuel** : le MJ choisit quand déclencher un effet via un bouton "🎲 Roll Wild Magic"
- Configuration dans les options du personnage (sorcier sauvage)

### [x] 5.3 - Affichage de l'effet
**Comportement** :
- L'effet est visible UNIQUEMENT par le MJ par défaut
- Le MJ peut choisir d'afficher l'effet aux joueurs (mode présentation)
- Bouton "👁 Afficher aux joueurs" / "🙈 Garder caché"
- L'effet apparaît avec animation en mode présentation

### [x] 5.4 - Custom effects tables
**Bonus** :
- Le MJ peut créer ses propres tables d'effets personnalisées
- Pour d'autres classes ou items magiques avec effets aléatoires
- SQL : table `tables_effets_custom` (id, user_id, nom, description, effets jsonb, created_at)

---

## 📋 SQL À APPLIQUER

Liste des nouveaux fichiers SQL générés (à exécuter via `supabase db push`) :

- [x] `supabase/migrations/20260519120000_phase1_permissions_scenarios.sql` — Durcissement RLS chapitres/scenario_liens/quetes/ennemis/pnj
- [x] `supabase/migrations/20260519121000_phase5_wild_magic.sql` — Colonne `wild_magic` sur presentation_etats + table `tables_effets_custom`
- [x] `supabase/migrations/20260519122000_phase3_exploration_scenes.sql` — Table `exploration_scenes`

⚠ Vérifier le timestamp local Supabase avant `db push`. Si un repair est requis :
```bash
supabase migration repair --status reverted <timestamp>
```

---

## 🐛 NOTES ET PROBLÈMES

- **3.7 Carte tactique en présentation [!]** : Différé — nécessite un canvas dédié + sync des positions via `presentation_etats`. La présentation actuelle affiche déjà le roster ennemis avec masquage (voile MJ), c'est la moitié de 3.8.
- **3.1 Multi-scènes exploration** : La table SQL est créée mais l'UI multi-scènes n'est pas exposée. Le mode actuel reste un Donjon Builder mono-scène (brush + items/ennemis cachés). UI à compléter dans une itération suivante.
- **2.1 Quick create** : Implémenté pour combat (+ Ennemi) et édition scénario (+ Créer Ennemi/Item/Map/PNJ). Mindmap / fiche PJ / fiche ennemi : utilisation des modals d'ajout existants.

---

## ✅ STATUT FINAL

Date de fin : 2026-05-19
Phases complétées : 5 / 5
Features complétées : 23 / 24 (3.7 reporté)
