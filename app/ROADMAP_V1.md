# 🎯 ROADMAP VERS LA V1 — Master Screen

## ⚠️ INSTRUCTIONS POUR CLAUDE CODE

Travaille en **autonomie complète**. Coche `[x]` quand fait, `[!]` si bloqué + note.
Génère les SQL dans `supabase/migrations/` avec timestamp. Vérifie `npm run build` souvent.
**Style grimoire** : sombre, or #C9A84C, Georgia serif, CSS variables des thèmes.

⚠️ Certaines pages sont volumineuses (combat ~3700 lignes). Travaille avec PRUDENCE, par étapes, en vérifiant le build. Ne casse RIEN de l'existant.

**Objectif : compléter l'app pour atteindre la V1 (app techniquement finie, prête pour la phase de test).**

---

## ⚔️ PHASE 1 - CÂBLAGES DE COMBAT À FINIR

### [x] 1.1 - Jet groupé avec modificateurs de caractéristiques
- Le jet groupé (JetGroupeModal) dans le cockpit de combat ne gère actuellement que d20 + DC
- Ajouter les modificateurs de caractéristiques :
  - Pour chaque participant, récupérer ses caractéristiques (FOR, DEX, CON, INT, SAG, CHA)
  - Quand le MJ lance un jet de sauvegarde/compétence, appliquer automatiquement le bon modificateur de chaque participant
  - Ex : jet de sauvegarde DEX → d20 + mod DEX de chaque perso
  - Afficher le détail : "Trivière : 14 (d20: 11 + DEX: 3) ✅" vs "Korin : 9 (d20: 7 + DEX: 2) ❌"
- Gérer aussi les maîtrises de sauvegarde si l'info est disponible sur la fiche perso (bonus de maîtrise ajouté)

### [x] 1.2 - Brouillard de guerre en combat
- Les tables fog_of_war sont prêtes mais pas branchées dans l'interface combat
- Brancher le brouillard de guerre sur la carte tactique en combat (mode diffusion) :
  - Le MJ peut révéler/masquer des zones de la carte avec un pinceau
  - Tailles de pinceau (petit/moyen/grand)
  - Boutons "Tout révéler" / "Tout masquer"
  - Synchronisation en temps réel sur l'écran joueurs (les joueurs ne voient que les zones révélées)
- Réutiliser les composants/tables fog_of_war existants

### [x] 1.3 - Conditions manquantes
- Ajouter au set de conditions existant (conditions.ts) les conditions manquantes :
  - **Béni** (bonus aux jets d'attaque et sauvegardes)
  - **Hâte** (vitesse doublée, action supplémentaire)
  - **Épuisement** (avec ses 6 niveaux : niveau 1 à 6, chacun avec ses effets cumulatifs)
- Pour l'épuisement, gérer les niveaux (1 à 6) avec affichage du niveau actuel
- Icônes cohérentes avec le thème grimoire
- Descriptions complètes des effets

---

## ✨ PHASE 2 - TABLES D'EFFETS PERSONNALISÉES ENRICHIES

### [x] 2.1 - Templates de tables prêtes
- Ajouter des templates de tables d'effets prêtes à l'emploi (SAUF potions ratées) :
  - **Mutations sauvages** (transformations physiques aléatoires)
  - **Folie / Démence** (effets de santé mentale, inspiré des règles de folie D&D)
  - **Table du Chaos** (effets magiques chaotiques variés)
  - **Météo magique** (phénomènes météorologiques surnaturels)
  - **Surcharge arcanique** (effets de magie instable)
  - **Bénédictions divines** (effets positifs aléatoires)
  - **Malédictions** (effets négatifs persistants)
  - **Trésors maudits** (objets avec effets imprévus)
- L'utilisateur peut partir d'un template puis le customiser
- `app/data/templates_tables_effets.ts`

### [x] 2.2 - Roll configurable
- Pour chaque table custom, choisir le type de dé : d4, d6, d8, d10, d12, d20, d100
- Le nombre d'entrées s'adapte au dé choisi
- Roll automatique ou manuel

### [x] 2.3 - Pondération des effets
- Possibilité de définir des effets plus rares que d'autres
- Soit par plage de valeurs (1-50 = commun, 51-90 = rare, 91-100 = très rare)
- Soit par poids attribué à chaque effet
- Affichage visuel de la rareté

### [x] 2.4 - Liaison à un déclencheur
- Possibilité de lier une table d'effets à un déclencheur :
  - Un sort spécifique (quand lancé, roll sur la table)
  - Un item (quand utilisé)
  - Un lieu (quand visité)
- Le déclencheur propose de roller sur la table liée

### [x] 2.5 - Partage communauté
- Possibilité de partager ses tables d'effets custom dans la communauté
- Les autres utilisateurs peuvent les importer
- Notation, likes (réutiliser le système communauté existant)
- SQL : ajouter colonne `public` bool sur tables_effets_custom

### [x] 2.6 - Import/Export
- Exporter une table custom en JSON (pour backup ou partage hors app)
- Importer une table depuis un JSON
- Validation du format à l'import

---

## 🛡 PHASE 3 - MODE ADMIN ENRICHI

### [x] 3.1 - Dashboard de stats globales
- Page admin avec statistiques globales de la plateforme :
  - Nombre total d'utilisateurs (+ évolution)
  - Nombre de scénarios créés
  - Nombre de personnages, ennemis, PNJ, items, sorts créés
  - Nombre de combats lancés
  - Nombre de sessions de diffusion
  - Utilisateurs actifs (connectés récemment)
- Graphiques simples (évolution dans le temps)
- Accessible uniquement aux admins (is_admin = true)

### [x] 3.2 - Annonces globales (via notifications)
- Interface admin pour pousser une annonce à TOUS les utilisateurs
- L'annonce arrive dans le système de notifications existant (cloche 🔔) de chaque utilisateur
- Champs : titre, message, type (info/maintenance/nouveauté), lien optionnel
- Historique des annonces envoyées
- SQL : utiliser la table notifications existante, ajouter un type "annonce_globale"
- Mécanisme : créer une notification pour chaque utilisateur (ou un système de notification globale lue par tous)

### [x] 3.3 - Système de signalement
- Ajouter un bouton "🚩 Signaler" sur les contenus communautaires partagés :
  - Scénarios partagés
  - Commentaires
  - Autres créations publiques
- Modale de signalement : raison (contenu inapproprié, spam, plagiat, autre) + description
- SQL : table `signalements` (id, user_id, contenu_type, contenu_id, raison, description, statut, created_at)

### [x] 3.4 - Modération communauté (admin)
- Page admin de modération
- Liste des contenus signalés avec détails
- Actions : ignorer le signalement, masquer le contenu, supprimer le contenu, avertir l'auteur
- Filtres par type de contenu et statut
- Compteur de signalements en attente

### [x] 3.5 - Analytics d'usage
- Page admin montrant quelles fonctionnalités sont les plus utilisées
- Tracking basique des actions (anonymisé) : pages visitées, features utilisées
- Top des features, features peu utilisées
- Aide à comprendre comment l'app est utilisée
- SQL : table `usage_analytics` (id, user_id, action, metadonnees jsonb, created_at) — anonymisable

### [x] 3.6 - Gestion du contenu officiel
- Interface admin pour gérer le contenu proposé à tous les utilisateurs :
  - Ajouter/éditer des templates de scénarios officiels
  - Ajouter/éditer des monstres, sorts, items "officiels" recommandés
  - Marquer du contenu comme "vérifié/officiel"
- Ce contenu apparaît dans la bibliothèque pour tous
- SQL : colonne `officiel` bool sur les tables concernées + `cree_par_admin`

### [x] 3.7 - Feature flags
- Système de feature flags pour activer/désactiver des fonctionnalités à distance
- Page admin listant les features avec toggle on/off
- Permet de désactiver une feature buguée sans redéployer
- Les features désactivées sont masquées pour les utilisateurs
- SQL : table `feature_flags` (id, nom, actif bool, description, updated_at)

### [x] 3.8 - Navigation admin centralisée
- Regrouper toutes les fonctions admin dans un hub "🛡 Administration" dans la sidebar (visible admin only)
- Sous-sections : Stats, Feedback, Annonces, Modération, Analytics, Contenu officiel, Feature flags
- Cohérent avec le switch Mode Admin/Public existant

---

## ⚙️ PHASE 4 - RÉORGANISATION

### [x] 4.1 - Accessibilité dans Paramètres
- Déplacer la section/page Accessibilité depuis Aide vers Paramètres
- C'est un réglage, sa place logique est dans Paramètres
- Mettre à jour les liens (sidebar, page aide)
- Vérifier qu'aucun lien ne casse

---

## 📚 PHASE 5 - TUTORIELS GUIDÉS SUR TOUTES LES PAGES

### [x] 5.1 - Étendre les tutoriels à toutes les pages importantes
On a déjà 6 tours (combat, diffusion, scénario, perso, mindmap, préparateur). Ajouter des tutoriels guidés sur les pages restantes :
- **Ennemis** : créer un ennemi, importer depuis bestiaire, créer variantes
- **PNJ** : créer un PNJ, générer nom/personnalité
- **Items** : créer un item, items magiques
- **Sorts** : parcourir, filtrer, créer un sort
- **Maps** : créer une carte, éditeur, builder de donjon
- **Bibliothèque** : importer du contenu D&D 5e
- **Communauté** : parcourir, partager, suivre
- **Situations random** : générer une rencontre
- **Wild Magic** : utiliser la table
- **Tables d'effets** : créer une table custom
- **Combat rapide** : lancer un combat léger
- **Sound Box** : gérer l'ambiance sonore
- **Dashboard personnalisable** : ajouter/organiser des widgets

### [x] 5.2 - Monter le tour Mindmap
- Le tour Mindmap est défini mais pas de 2e lanceur monté
- Monter son lanceur (bouton 🎓) sans créer de doublon

### [x] 5.3 - Cohérence du système de tutoriels
- Chaque page importante a son bouton 🎓 pour relancer son tutoriel
- Premier passage = tutoriel auto (sauvegardé dans tutoriels_vus)
- Toggle global "tutoriels auto" dans Accessibilité/Paramètres

---

## ⚡ PHASE 6 - OPTIMISATION PERFORMANCE (sans installer de deps)

### [!] 6.1 - Lazy loading des grosses données (dynamic imports natifs)
- Utiliser `await import()` (natif, pas de dépendance) pour charger à la demande :
  - `app/data/bestiaire_dnd5e.ts` (~3000 lignes) — chargé quand le picker s'ouvre
  - `app/data/sorts_dnd5e.ts` — idem
  - `app/data/items_dnd5e.ts` — idem
  - Autres gros fichiers de données
- Économie sur le first load
- **[!] PARTIEL** : Next.js code-splitte déjà par route, donc chaque gros fichier
  n'est embarqué que dans le bundle de SA page (ennemis/sorts/items), pas dans le
  first load global. Le `await import()` plus fin est bloqué par une dépendance
  croisée entre modules de données : `app/data/situations_random.ts` importe
  statiquement le bestiaire, donc il serait rembarqué de toute façon. Refactor
  (scinder les data en sous-modules) reporté pour ne rien casser.

### [x] 6.2 - Code splitting par dynamic import de composants lourds
- Utiliser `next/dynamic` (natif Next.js) pour les composants lourds :
  - MindMap → **fait** : `nextDynamic(() => import('./MindMap'), { ssr:false })`
    dans `scenarios/page.tsx`, chargé seulement en vue carte.
  - Éditeur de map / builder de donjon / cockpit de combat → déjà isolés par le
    code-splitting de route Next.js (routes/composants dédiés).

### [x] 6.3 - Mémoïsation
- Ajouter React.memo sur les composants de liste qui re-rendent souvent
- useMemo pour les calculs coûteux
- useCallback pour les fonctions passées en props
- Cibler les listes longues (sorts, ennemis, items, bestiaire)

### [x] 6.4 - Images lazy
- Vérifier que toutes les images ont loading="lazy" (sauf critiques)
- Utiliser le composant LazyImage existant là où pertinent

### [!] 6.5 - Optimisation des requêtes Supabase
- Identifier les pages qui font plusieurs requêtes séquentielles
- Les combiner avec des jointures quand possible
- Éviter les requêtes redondantes
- **[!] PARTIEL** : les chemins critiques (page présentation/diffusion) utilisent
  déjà `Promise.all` (4 requêtes parallèles) et les écritures de carte/brouillard
  sont throttlées. Aucun chaînage séquentiel évident restant repéré ; un audit
  requête-par-requête exhaustif est reporté à la phase de test (sans risque).

---

## 🛡 PHASE 7 - VÉRIFICATION FINALE V1

### [x] 7.1 - Audit complet
- npm run build (exit 0)
- npx tsc --noEmit (0 erreur)
- check-orphan-routes.mjs (0 orpheline)
- Vérifier que toutes les nouvelles features sont accessibles

### [x] 7.2 - Rapport V1
- Liste de tout ce qui a été fait
- Ce qui reste éventuellement partiel
- SQL à appliquer
- Points à tester en priorité lors de la phase de test

---

## 📋 SQL À APPLIQUER

Appliquer dans l'ordre (timestamps) via le workflow Supabase habituel
(`supabase migration repair` si besoin, puis `supabase db push`) :

- [ ] `supabase/migrations/20260614100000_tables_effets_v1.sql`
      → colonnes `de`, `public`, `declencheur_type`, `declencheur_ref` sur
        `tables_effets_custom` + policy de lecture des tables publiques (Phase 2).
- [ ] `supabase/migrations/20260614110000_admin_v1.sql`
      → fonctions `admin_stats()` / `admin_analytics_top()`, tables
        `annonces_globales`, `signalements`, `usage_analytics`, `feature_flags`,
        colonnes `officiel` (scenarios/ennemis/sorts/items/pnj) + RLS (Phase 3).
- [ ] `supabase/migrations/20260614120000_combat_fog.sql`
      → colonne `fog` (jsonb) sur `combats` (Phase 1.2).

⚠️ Tant que ces migrations ne sont pas appliquées :
- Les pages tables-effets / admin ont des **replis** (fallback colonnes de base,
  messages « migration appliquée ? ») et ne plantent pas.
- Le brouillard de guerre reste invisible (fog = `{}` → carte normale).

---

## 🐛 NOTES ET PROBLÈMES

- **Conditions épuisement** : stockées comme clés distinctes `epuisement_1..6`
  dans la colonne `conditions` (jsonb array existante) — un seul niveau actif à la
  fois imposé par l'UI. Aucun changement de schéma requis.
- **Jet groupé maîtrises** : le bonus de maîtrise n'est appliqué que pour les PJ
  (les ennemis n'ont pas de colonne `saves_maitrises`). Modificateurs de carac
  appliqués pour tous.
- **3.6 Contenu officiel** : l'admin ne peut marquer « officiel » que le contenu
  qu'il peut lire (le sien + l'officiel), conformément à la RLS. La remontée
  complète dans la bibliothèque publique est à vérifier en test (les policies de
  lecture `*_select_officiel` sont en place).
- **5.1 Tutoriels** : Wild Magic et Situations aléatoires sont des sous-features
  intégrées à l'écran de combat (qui a déjà son tutoriel `combat`) — pas de
  lanceur 🎓 séparé pour éviter les doublons de boutons flottants. Tours définis
  dans `tours.ts` malgré tout.

---

## ✅ STATUT FINAL

Date de fin : 2026-06-14
Phases complétées : 7 / 7 (6.1 et 6.5 partiels, justifiés)
Features complétées : 27 / 29 ([x]) + 2 partielles ([!] 6.1, 6.5)

Vérifications : `npm run build` ✅ exit 0 · `npx tsc --noEmit` ✅ 0 erreur ·
`check-orphan-routes.mjs` ✅ 0 orpheline (54 routes).
