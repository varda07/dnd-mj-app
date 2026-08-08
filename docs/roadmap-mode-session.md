# ROADMAP — Refonte totale : « Mode Diffusion » → **MODE SESSION**

> **Instructions d'exécution (Claude Code)**
> - Exécute cette roadmap **de manière autonome, sans interruption ni question**.
> - Coche `[x]` chaque tâche terminée, `[!]` chaque tâche bloquée ou divergente (avec une note d'une ligne expliquant pourquoi).
> - Toute modification de schéma passe par un fichier dans `supabase/migrations/`, appliqué avec `supabase db push`.
> - Après **chaque phase**, lance `npm run build` et corrige les erreurs avant de continuer.
> - Toute l'interface utilisateur est **en français**.
> - Esthétique : **épurée**, lisible en pleine partie, priorité à la clarté fonctionnelle.
> - La sidebar de l'app est **à droite** de l'écran — respecte cette convention.
> - **Ne réécris pas** ce qui fonctionne déjà : roue d'action, timeline d'initiative horizontale, `combat-engine.ts`, cockpit combat MJ, sélecteur de setup (PC+TV / PC+Téléphones / Phone+Phone / MJ seul). Tu les **intègres** au nouveau mode.

---

## Contexte

Le « mode diffusion » actuel est trop compliqué et ne correspond pas à l'usage réel. Il est conçu comme une **diffusion passive** (le MJ pousse du contenu, les joueurs regardent). Ce n'est pas ce qu'il faut.

**Cible : un vrai mode de jeu.** Une session de JDR où chaque participant a son propre poste de travail :
- **Côté MJ** : tout ce qui a été préparé pour la séance + les outils utiles en live.
- **Côté PJ** : tout ce qui concerne son personnage, en autonomie.

On renomme donc partout « Mode diffusion » en **« Session »** / **« En session »**.

### Décisions produit validées (non négociables)

| Décision | Choix retenu | Conséquence technique |
|---|---|---|
| Comptes joueurs | **Compte obligatoire** | Auth requise ; RLS sur `auth.uid()` ; pas d'accès anonyme ; les liens de session redirigent vers login avec `returnUrl` |
| Support des PJ | **Mixte (téléphone + PC)** | Interface PJ **mobile-first**, montant en gamme jusqu'au desktop. Pas deux interfaces séparées. |
| Édition des PV / ressources | **MJ **et** PJ** | État temps réel partagé, mise à jour optimiste + réconciliation, journal des modifications |

### Problèmes à résoudre en priorité
1. **Ajouter des joueurs est trop compliqué.** → Notification in-app automatique au lancement de la session.
2. **Les PJ ne voient rien de plus une fois connectés.** → Interface PJ complète et ergonomique.
3. **Ce n'est pas un mode de diffusion, c'est un mode de jeu.** → Refonte conceptuelle complète.

---

## PHASE 0 — AUDIT PRÉALABLE (obligatoire, avant toute écriture de code)

Cette phase est **bloquante**. Elle détermine le volume réel de travail des phases 3 et 4.

- [ ] Inventorier le **modèle de données des personnages** : table(s) `characters` (ou équivalent). Lister précisément les champs existants et les champs manquants pour jouer une session :
  - PV max / PV actuels / PV temporaires
  - CA, initiative, vitesse
  - Caractéristiques + modificateurs, jets de sauvegarde, maîtrises
  - Compétences et bonus de maîtrise
  - Sorts connus / préparés, emplacements de sorts par niveau (max + consommés)
  - Ressources de classe (rage, inspiration bardique, points de ki, magie sauvage, invocations d'occultiste, etc.)
  - Inventaire, équipement, monnaie
  - États / conditions (empoisonné, à terre, etc.), concentration en cours
- [ ] Inventorier les **composants d'affichage de fiche de personnage** déjà existants (chemins de fichiers, niveau de complétude, réutilisables ou non).
- [ ] Inventorier l'**implémentation actuelle du mode diffusion** : routes, composants, tables Supabase, canaux Realtime, hooks. Identifier ce qui est réutilisable et ce qui est à supprimer.
- [ ] Vérifier l'existence et le fonctionnement du **lien PJ ↔ scénario** (RPC atomique de code d'invitation déjà en place).
- [ ] Vérifier s'il existe une **infrastructure de notifications** in-app (table, composant cloche, provider). Sinon → à créer en Phase 2.
- [ ] Vérifier la configuration **Supabase Realtime** : quelles tables sont déjà en publication, quels canaux sont utilisés.
- [ ] Lister les **points d'entrée de `combat-engine.ts`** et la façon dont le combat s'intègre aujourd'hui à la diffusion.
- [ ] Écrire le rapport dans **`docs/audit-mode-session.md`** avec, pour chaque point : ce qui existe / ce qui manque / effort estimé.
- [ ] **Adapter la suite de cette roadmap** en fonction de l'audit. Si une tâche des phases suivantes est déjà faite, coche-la `[x]` avec la mention « déjà existant ». Si une tâche est impossible telle que décrite, marque `[!]` et implémente l'équivalent le plus proche.

---

## PHASE 1 — MODÈLE DE DONNÉES

Migration dans `supabase/migrations/`.

### 1.1 Table `game_sessions`
- [ ] Créer `game_sessions` :
  - `id` uuid PK
  - `scenario_id` uuid FK → scénario
  - `mj_user_id` uuid FK → auth.users
  - `status` text : `lobby` | `active` | `paused` | `ended`
  - `title` text (nom de la séance, ex. « Séance 4 — Le Puits Noir »)
  - `started_at`, `ended_at` timestamptz
  - `created_at`, `updated_at` timestamptz
- [ ] Contrainte : **une seule session `active` ou `lobby` par scénario** à la fois (index unique partiel).

### 1.2 Table `session_state` (état partagé temps réel)
- [ ] Créer `session_state` (relation 1-1 avec `game_sessions`) :
  - `session_id` uuid PK FK
  - `current_chapter_id` / `current_location_id` (nullable)
  - `broadcast_image_url` text (image actuellement diffusée, nullable)
  - `broadcast_text` text (narration poussée aux PJ, nullable)
  - `ambient_sound` jsonb (piste, volume, état lecture)
  - `active_combat_id` uuid (nullable)
  - `updated_at` timestamptz
- [ ] Activer Realtime sur cette table.

### 1.3 Table `session_participants`
- [ ] Créer `session_participants` :
  - `session_id` uuid FK
  - `user_id` uuid FK → auth.users
  - `character_id` uuid FK → personnage joué (nullable si spectateur)
  - `role` text : `mj` | `joueur`
  - `joined_at`, `last_seen_at` timestamptz
  - `is_connected` boolean
  - PK composite (`session_id`, `user_id`)
- [ ] Activer Realtime.

### 1.4 État vivant du personnage
- [ ] Selon les conclusions de l'audit : soit **compléter la table `characters`**, soit créer **`character_live_state`** pour les valeurs qui changent en séance :
  - `current_hp`, `temp_hp`, `max_hp_override`
  - `spell_slots_used` jsonb (par niveau)
  - `class_resources_used` jsonb
  - `conditions` jsonb (liste d'états actifs)
  - `concentration_spell` text (nullable)
  - `death_saves` jsonb (succès / échecs)
  - `updated_at`, `updated_by` uuid
- [ ] **Activer Realtime** sur cette table/ces colonnes — c'est le cœur de la synchro MJ ↔ PJ.

### 1.5 Journal de session
- [ ] Créer `session_events` :
  - `id`, `session_id`, `actor_user_id`, `character_id` (nullable)
  - `type` text : `hp_change` | `resource_used` | `dice_roll` | `condition` | `join` | `leave` | `combat_start` | `combat_end` | `narration`
  - `payload` jsonb
  - `created_at`
- [ ] Activer Realtime (c'est aussi le flux du **journal de partie** affiché côté MJ et PJ).

### 1.6 Notifications
- [ ] Créer `notifications` (si l'audit confirme l'absence) :
  - `id`, `user_id`, `type` (`session_started`, `session_reminder`…), `payload` jsonb
  - `read_at` timestamptz nullable, `created_at`
- [ ] Activer Realtime pour l'affichage instantané.

### 1.7 Sécurité (RLS)
- [ ] RLS sur toutes les nouvelles tables :
  - Le **MJ** de la session : lecture/écriture complète sur sa session, ses participants, l'état de tous les personnages de la session.
  - Un **PJ** : lecture de `session_state`, `session_participants`, `session_events` de sa session ; lecture/écriture sur **l'état vivant de son propre personnage uniquement** ; lecture des **états qualitatifs** des autres PJ (pas les PV exacts des PNJ/monstres).
  - Un utilisateur non-participant : **aucun accès**.
- [ ] Écrire une **RPC atomique `join_session(session_id, character_id)`** : vérifie que l'utilisateur est bien lié au scénario, crée la ligne `session_participants`, initialise l'état vivant du personnage, écrit un `session_event` de type `join`. Le tout dans une transaction.
- [ ] Appliquer : `supabase db push`
- [ ] `npm run build`

---

## PHASE 2 — LANCEMENT, NOTIFICATION ET LOBBY

**Objectif : faire rejoindre un joueur en 1 geste, jamais plus.**

### 2.1 Lancement côté MJ
- [ ] Depuis un scénario, bouton clair **« Lancer la session »** (remplace tout bouton « Diffuser » existant).
- [ ] Crée une `game_sessions` en statut `lobby`, avec `session_state` initialisé.
- [ ] Conserve le **sélecteur de setup existant** (PC+TV / PC+Téléphones / Phone+Phone / MJ seul) — il fonctionne bien, il est simplement rebranché sur le nouveau mode.

### 2.2 Notification in-app automatique
- [ ] Au passage en `lobby`, **créer une notification pour chaque utilisateur ayant un PJ lié au scénario** (via une RPC ou un trigger Postgres).
- [ ] Composant **cloche de notifications** dans le header (badge compteur, liste déroulante, marquage lu).
- [ ] **Bandeau persistant en haut de l'accueil** : « 🎲 [Nom du MJ] a lancé *[Titre du scénario]* — **Rejoindre** ». Un seul clic → entrée dans la session.
- [ ] Réception **temps réel** via Realtime : le bandeau apparaît sans rafraîchir la page.
- [ ] Le bandeau disparaît si le joueur a déjà rejoint ou si la session est terminée.

### 2.3 Lien de secours
- [ ] Générer un **lien de session partageable** (`/session/[id]/rejoindre`). Comme les comptes sont obligatoires : si l'utilisateur n'est pas connecté → redirection vers login avec `returnUrl`, puis **jonction automatique** après authentification.
- [ ] Si l'utilisateur n'a **aucun PJ lié** à ce scénario : lui proposer directement **soit** de saisir le code d'invitation, **soit** de créer un personnage via l'assistant existant, puis de rejoindre. Pas de cul-de-sac.

### 2.4 Salle d'attente (lobby)
- [ ] Écran de lobby côté MJ : liste des joueurs attendus, qui est connecté, avec quel personnage, état « prêt ». Bouton **« Démarrer la partie »** → statut `active`.
- [ ] Écran de lobby côté PJ : sélection de son personnage si plusieurs, aperçu de sa fiche, bouton « Je suis prêt », message d'attente.
- [ ] **Présence temps réel** (Supabase Realtime Presence) : connexion/déconnexion visible immédiatement, mise à jour de `is_connected`.
- [ ] Reconnexion : si un joueur ferme puis rouvre l'app pendant une session `active`, il **retourne directement dans la session** sans repasser par le lobby.
- [ ] `npm run build`

---

## PHASE 3 — INTERFACE PJ (priorité maximale)

Route : `/session/[id]/joueur`
**Mobile-first**, responsive jusqu'au desktop. Une seule interface, pas deux.

### 3.1 Structure de navigation
- [ ] **Mobile** : dock de navigation en bas, 5 onglets max, gros boutons tactiles, atteignables au pouce.
- [ ] **Desktop** : passage en multi-colonnes (fiche à gauche, scène au centre, dés/journal à droite) — sans changer de code, uniquement via les breakpoints Tailwind.
- [ ] Onglets : **Fiche** · **Actions** · **Scène** · **Dés** · **Sac**.
- [ ] En-tête permanent (toujours visible, tous onglets) : nom du perso, **barre de PV**, CA, états actifs, indicateur de concentration.

### 3.2 Onglet « Fiche »
- [ ] **Bloc PV en haut, gros et manipulable** : barre visuelle + boutons rapides `−1 / −5 / +1 / +5` + saisie libre pour dégâts/soins. PV temporaires gérés séparément.
- [ ] Caractéristiques avec modificateurs — **cliquer sur une caractéristique lance le jet** correspondant.
- [ ] Jets de sauvegarde cliquables.
- [ ] Compétences avec maîtrise indiquée, cliquables pour jeter.
- [ ] CA, initiative, vitesse, bonus de maîtrise, dés de vie.
- [ ] Jets de sauvegarde contre la mort si PV = 0 (interface dédiée, succès/échecs).

### 3.3 Onglet « Actions »
- [ ] **Attaques** : liste avec bonus d'attaque et dégâts — un clic lance l'attaque, un second les dégâts.
- [ ] **Sorts** : regroupés par niveau, avec **emplacements de sorts visuels** (points/carrés à cocher, consommés d'un clic). Sorts préparés mis en avant.
- [ ] Détail d'un sort au clic (temps d'incantation, portée, composantes, durée, description).
- [ ] **Concentration** : lancer un sort à concentration remplace visiblement la concentration en cours et prévient le joueur.
- [ ] **Ressources de classe** (rage, ki, inspiration, invocations…) : compteurs visuels décrémentables.
- [ ] **Capacités de race et de background** consultables.

### 3.4 Onglet « Scène »
- [ ] Affiche **ce que le MJ diffuse** en temps réel : image, texte de narration, ambiance sonore en cours.
- [ ] Image en plein écran au clic.
- [ ] **Si un combat est actif** : cet onglet bascule automatiquement en **vue combat joueur** :
  - Timeline d'initiative horizontale (composant existant), tour actuel mis en évidence
  - Son propre tour clairement signalé (badge + vibration mobile si disponible)
  - **États qualitatifs des autres** (En pleine forme / Blessé / Mal en point / Mourant) — jamais les PV exacts des ennemis
  - Bouton « Fin de mon tour »

### 3.5 Onglet « Dés »
- [ ] Lanceur de dés complet (d4 → d100, quantité, modificateur, avantage/désavantage).
- [ ] **Chaque jet est écrit dans `session_events`** → visible instantanément par le MJ et les autres joueurs.
- [ ] Historique des jets de la session.
- [ ] Option **jet privé** (visible du MJ uniquement).

### 3.6 Onglet « Sac »
- [ ] Inventaire, équipement porté/rangé, monnaie, poids si géré.
- [ ] Ajout/suppression/quantité éditables par le joueur.

### 3.7 Synchronisation temps réel
- [ ] **Mise à jour optimiste** côté client (l'interface réagit instantanément) puis confirmation serveur.
- [ ] Réconciliation Realtime : si le **MJ modifie les PV** d'un PJ, le changement apparaît **immédiatement** chez le joueur, et inversement.
- [ ] En cas de conflit : **dernier écrit gagne**, et l'événement est journalisé dans `session_events` avec l'auteur — pour que le MJ puisse toujours voir qui a changé quoi.
- [ ] Indicateur discret de connexion (connecté / reconnexion en cours / hors ligne).
- [ ] `npm run build`

---

## PHASE 4 — COCKPIT MJ

Route : `/session/[id]/mj`
Optimisé pour un MJ qui gère une partie en direct : **tout accessible en un geste**, rien qui distrait.

### 4.1 Panneau « Ma préparation »
- [ ] Accès immédiat à tout ce qui a été préparé pour ce scénario : **chapitres, lieux, PNJ, rencontres, notes**.
- [ ] Recherche rapide dans la préparation.
- [ ] Marquer le **chapitre / lieu actuel** → met à jour `session_state` (contexte partagé).
- [ ] Un clic sur une **rencontre préparée** → la lance en combat via `combat-engine.ts` (point d'entrée « préparé »).

### 4.2 Panneau « Ma table » (état des PJ)
- [ ] Vue temps réel de **tous les PJ** : PV exacts, CA, états, ressources consommées, concentration, connexion.
- [ ] Le MJ peut **modifier directement** les PV et ressources de n'importe quel PJ (dégâts de zone, effets, corrections).
- [ ] Alerte visuelle si un PJ tombe à 0 PV.

### 4.3 Outils live
- [ ] **Roue d'action** (composant existant) conservée telle quelle, MJ uniquement.
- [ ] **Diffusion** vers les PJ : pousser une image, un texte de narration, une ambiance sonore → écrit dans `session_state` → apparaît chez tous les joueurs.
- [ ] **Journal de session** temps réel : tous les jets de dés des joueurs, changements de PV, événements — en flux continu.
- [ ] **Combat** : lancement depuis la session, cockpit MJ complet existant (PV exacts, CA, attaques, résistances, immunités, comportement) + timeline d'initiative. Réutiliser `combat-engine.ts`, ne pas le dupliquer.
- [ ] Contrôles de session : **Pause**, **Reprendre**, **Terminer la session** (avec confirmation).

### 4.4 Ergonomie MJ
- [ ] Respecter le **setup choisi** (PC+TV / PC+Téléphones / Phone+Phone / MJ seul) : en PC+TV, une vue « écran partagé » épurée destinée à la télé, distincte du cockpit MJ.
- [ ] Interface épurée : aucune information non utile pendant le jeu.
- [ ] ⚠️ **Piège CSS connu** : ne jamais poser `will-change: transform` sur un conteneur parent de modale — cela crée un bloc conteneur qui casse l'ancrage `position: fixed` au viewport. Bug déjà rencontré et corrigé sur ce projet, ne pas le réintroduire.
- [ ] `npm run build`

---

## PHASE 5 — MIGRATION ET NETTOYAGE

- [ ] Rediriger **toutes les anciennes routes du mode diffusion** vers les nouvelles routes de session.
- [ ] **Supprimer le code mort** de l'ancien mode diffusion (composants, hooks, tables inutilisées) une fois les phases 1-4 validées.
- [ ] Renommer partout dans l'UI : « Mode diffusion » / « Diffuser » → **« Session »** / **« Lancer la session »**. Exception : garder « Diffuser ce combat » pour le basculement en cours de partie, qui reste pertinent.
- [ ] Mettre à jour la **sidebar (à droite)** : entrée « Session en cours » visible et cliquable quand une session est active, pour MJ comme pour PJ.
- [ ] Vérifier que les **hubs existants** (Hub Combat, Hub Cartes & Exploration) pointent bien vers le nouveau mode.
- [ ] Ajouter des **infobulles guidées** sur les éléments nouveaux, cohérentes avec le système de tooltips existant.

---

## PHASE 6 — VÉRIFICATION FINALE

- [ ] `npm run build` sans erreur ni warning bloquant.
- [ ] `supabase db push` : toutes les migrations appliquées.
- [ ] Parcours testé de bout en bout :
  1. MJ lance une session depuis un scénario
  2. Le joueur reçoit la notification in-app **sans rafraîchir**
  3. Le joueur rejoint en 1 clic
  4. Le joueur voit sa fiche complète et fonctionnelle
  5. Le joueur lance un dé → le MJ le voit en direct
  6. Le MJ inflige des dégâts → les PV changent chez le joueur en direct
  7. Le joueur se soigne → le MJ le voit en direct
  8. Le MJ diffuse une image → elle apparaît chez tous les joueurs
  9. Le MJ lance un combat → tout le monde bascule en vue combat
  10. Un joueur ferme et rouvre l'app → il revient dans la session
  11. Le MJ termine la session → tout le monde sort proprement
- [ ] Vérifier le rendu sur **téléphone ET sur PC** pour l'interface PJ.
- [ ] Écrire le compte-rendu dans **`docs/rapport-mode-session.md`** : ce qui est fait, ce qui est marqué `[!]`, et ce qui reste à traiter.

---

## Rappels de convention

- Migrations SQL → `supabase/migrations/` → `supabase db push`
- Build vérifié après chaque phase → `npm run build`
- Interface **en français**, esthétique **épurée**
- Sidebar **à droite**
- Ne pas réécrire les composants qui fonctionnent — les intégrer
- Marquer `[x]` fait / `[!]` problème, avec note explicative
