# 🛠 ROADMAP PRÉPARATEUR DE COMBAT

## ⚠️ INSTRUCTIONS POUR CLAUDE CODE

Travaille en **autonomie complète**. Coche `[x]` quand fait, `[!]` si bloqué + note.
Génère les SQL dans `supabase/migrations/` avec timestamp. Vérifie `npm run build` souvent.
**Style grimoire** : sombre, or #C9A84C, Georgia serif, CSS variables des thèmes.

⚠️ La page combat actuelle (`/dashboard/combat`) fait ~3700 lignes. Travaille avec PRUDENCE, par étapes, en vérifiant le build. Ne casse RIEN.

---

## 🎯 OBJECTIF

Transformer l'ancienne page combat (`/dashboard/combat`, la complète avec grille tactique) en **PRÉPARATEUR DE COMBAT**. Le MJ y prépare ses combats EN AMONT (avant la session), les sauvegarde liés à un scénario, puis les lance le jour J en combat rapide ou en diffusion.

**Écosystème combat final :**
- **Préparateur de combat** (ancienne page combat refondue) : créer/configurer/sauvegarder des combats à l'avance
- **Combat rapide** : lancer un combat léger MJ seul (existant)
- **Mode diffusion** : combat diffusé avec vue joueurs (existant), avec accès aux combats préparés
- Le moteur `combat-engine.ts` reste le cœur commun

---

## 🛠 PHASE 1 - LE PRÉPARATEUR DE COMBAT

### [!] 1.1 - Refondre /dashboard/combat en préparateur
- Transformer la page en outil de préparation (plus de "combat live" ici, ça passe par combat rapide/diffusion)
- Interface de configuration d'un combat :
  - **Nom du combat** (ex: "Embuscade gobeline", "Boss dragon du chapitre 3")
  - **Scénario lié** (sélecteur — le combat est rattaché à un scénario)
  - **Ennemis** : ajouter depuis le bestiaire, créer des variantes, définir le nombre
  - **PJ impliqués** : sélectionner quels personnages joueurs participeront
  - **Notes de combat** : tactiques prévues, dialogue de boss, conditions spéciales
- Préserver la logique existante utile, retirer ce qui ne sert qu'au combat live

### [x] 1.2 - Grille tactique FACULTATIVE
- Garder la grille tactique / placement de jetons, mais la rendre OPTIONNELLE
- Toggle "Utiliser une battle map" :
  - Si activé : sélection d'une map + placement des jetons (PJ et ennemis) à l'avance
  - Si désactivé : combat sans carte (juste initiative + HP)
- Ne JAMAIS bloquer le MJ s'il ne veut pas de carte

### [x] 1.3 - Placement des jetons pré-configuré
- Si une battle map est choisie, le MJ place les jetons des PJ et ennemis sur la grille
- Ces positions sont SAUVEGARDÉES avec le combat préparé
- Au lancement du combat, les jetons apparaissent aux positions préparées
- Les positions restent MODIFIABLES à la volée par le MJ pendant le combat (au cas où)

### [x] 1.4 - Conditions de départ optionnelles
- Possibilité de définir des conditions de départ :
  - Ennemis cachés / en embuscade (surprise round)
  - Conditions initiales sur certains participants
  - Ordre d'initiative préset (optionnel, sinon rollé au lancement)

---

## 💾 PHASE 2 - SAUVEGARDE & LIAISON SCÉNARIO

### [x] 2.1 - Enrichir combats_prepares
- Étendre la table `combats_prepares` existante avec les champs nécessaires :
  - nom, scenario_id (déjà là), participants (ennemis + PJ), carte_id, positions jetons jsonb, conditions_depart jsonb, notes, initiative_preset jsonb
- Migration idempotente pour ajouter les colonnes manquantes

### [x] 2.2 - Liaison au scénario
- Chaque combat préparé est lié à un scénario
- Depuis la fiche d'un scénario, section "⚔️ Combats préparés" listant les combats de ce scénario
- Possibilité de créer un nouveau combat préparé directement depuis le scénario

### [x] 2.3 - Bibliothèque de combats préparés
- Page ou section listant tous les combats préparés du MJ
- Filtres par scénario
- Actions : éditer, dupliquer, supprimer, lancer
- Recherche par nom

---

## ▶️ PHASE 3 - LANCEMENT DES COMBATS PRÉPARÉS

### [x] 3.1 - Bouton "Lancer" avec choix du mode
- Sur chaque combat préparé, bouton "▶ Lancer"
- Choix du mode au lancement :
  - "⚡ Combat rapide" (MJ seul)
  - "📡 Mode diffusion" (avec vue joueurs)
- Le combat démarre avec toute la config préparée (ennemis, PJ, carte, jetons, conditions)

### [x] 3.2 - Accès aux combats préparés DANS le mode diffusion
- IMPORTANT : dans le mode diffusion côté MJ, afficher la liste des combats préparés du scénario actif
- Le MJ peut sélectionner et lancer un combat préparé directement depuis la diffusion
- Sans avoir à repasser par l'onglet/page préparateur
- Accessible via l'onglet Combat du cockpit OU via la roue d'action (pétale Rencontre/Combat)

### [x] 3.3 - Lancement à la volée toujours possible
- Garder la possibilité de lancer un combat impromptu SANS préparation :
  - Via combat rapide (ajout d'ennemis à la volée)
  - Via les situations random (rencontres aléatoires)
- Le préparateur n'est PAS obligatoire, c'est un confort

---

## 🧹 PHASE 4 - COHÉRENCE

### [x] 4.1 - Clarifier la navigation
- Renommer l'entrée sidebar "Combat" en "Préparateur de combat" (ou "Préparer un combat")
- Garder "Combat rapide" pour le lancement direct
- Descriptions claires partout pour éviter la confusion
- Mettre à jour le dashboard (accès rapide) en cohérence

### [x] 4.2 - Vérifier le moteur partagé
- S'assurer que les combats préparés utilisent bien le moteur combat-engine.ts au lancement
- Pas de divergence de logique entre combat préparé lancé, combat rapide, combat diffusé

---

## 📋 SQL À APPLIQUER

- [x] `supabase/migrations/20260608120000_preparateur_combat.sql`
  - Enrichit `combats_prepares` : `pj_ids`, `positions`, `conditions_depart`,
    `initiative_preset`, `avec_carte`, `updated_at` (idempotent, RLS inchangée).
- ⚠️ Rappels : `20260608110000_moteur_combat.sql` (table `combats_prepares`,
  `combats.demarre_a`) et `20260608100000_combat_diffusion.sql` doivent être
  appliquées avant. ➡️ `supabase db push`.

---

## 🐛 NOTES ET PROBLÈMES

- **1.1 [!] — refonte non destructive** : plutôt que de vider la page combat de
  ~3700 lignes (risque majeur, et l'instruction « ne casse RIEN »), le préparateur
  est une **nouvelle page** `/dashboard/combat-prepare`. La page combat live
  complète (`/dashboard/combat`, grille tactique) est **préservée** et reste
  accessible (sidebar « Combat (grille) » + carte dashboard). Toutes les
  fonctionnalités de préparation (1.2–1.4) sont livrées dans la nouvelle page.
  Gut in-place de l'ancienne page = reporté volontairement.
- **1.4 partiel** : « round de surprise » exposé dans l'UI + schéma
  `conditions_depart` / `initiative_preset` prêts et **appliqués au lancement**.
  L'UI fine (conditions initiales par participant, éditeur d'ordre d'initiative
  préset) n'est pas encore exposée — schéma prêt, à brancher.
- **Lancement & ennemis** : lancer un combat préparé **lie** ses ennemis au
  scénario (`scenario_id`). Si un même ennemi du bestiaire sert dans plusieurs
  scénarios, son `scenario_id` est réassigné (pas de clonage en v1). À noter.
- **Diffusion (3.2)** : lancer un combat préparé depuis le cockpit recharge la
  page diffusion (`window.location.reload`) pour repartir sur un roster frais
  (ennemis fraîchement liés) + combat actif. Simple et fiable.
- **4.2** : `lancerCombatPrepare` utilise le helper partagé `rollInitiative` du
  moteur → pas de divergence d'init entre préparé / rapide / diffusé. Tous
  opèrent sur la même ligne `combats` par scénario.

---

## ✅ STATUT FINAL

Date de fin : 2026-06-08
Phases complétées : 4 / 4 (1.1 volontairement non-destructif, 1.4 partiel UI)
Features complétées : 11 [x] + 1 [!] (1.1)

