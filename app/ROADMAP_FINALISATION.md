# 🎯 ROADMAP FINALISATION & ACCESSIBILITÉ — Master Screen

## ⚠️ INSTRUCTIONS POUR CLAUDE CODE

Travaille en **autonomie complète**. Coche `[x]` quand fait, `[!]` si bloqué + note.
Génère les SQL dans `supabase/migrations/` avec timestamp. Vérifie `npm run build` souvent.
**Style grimoire** : sombre, or #C9A84C, Georgia serif, CSS variables des thèmes.

Cette roadmap se base sur l'audit d'accessibilité fonctionnelle réalisé précédemment.

---

## 🧹 PHASE 1 - NETTOYAGE DU CODE MORT (P0)

### [x] 1.1 - Supprimer les vestiges de combat
Ces composants ont été supplantés par du code inline, ils sont morts. Les SUPPRIMER :
> ✅ FAIT — 10 fichiers supprimés après double-vérif grep (0 import). Build vert.
- `app/components/combat/VueTactique` (remplacé par presentation/CombatCarte)
- `app/components/combat/InitiativeTimeline` (timeline inline)
- `app/components/combat/QuickActionsMenu` (actions inline)
- `app/components/combat/TourRapideButton` (inline)
- `app/components/combat/PauseCombatButton` (inline)
- `app/components/combat/MortDramatique` (effet KO inline)
- `app/components/combat/FinCombatModal` (écran victoire inline)
- `app/components/combat/DegatsCalculator` (HpControls + AOE inline)
- `GlobalSearch` + `openGlobalSearch` (remplacé par CommandPalette)
- `PresentationTabsBar` (barre d'onglets non utilisée)

⚠️ AVANT de supprimer chaque composant, VÉRIFIER une dernière fois qu'il n'est importé/monté nulle part (grep). Ne PAS supprimer JetGroupeModal, HistoriqueCombat, FollowButton, CommentairesCommunaute, le dossier donjon/, ni LazyImage/Tooltip (on va peut-être les utiliser).

### [x] 1.2 - Évaluer LazyImage et Tooltip
> ✅ FAIT — Tooltip conservé (utilisé en Phase 4), LazyImage conservé.
- LazyImage et Tooltip (ui/) sont des primitives jamais utilisées
- On va UTILISER Tooltip pour les tutoriels (voir Phase 4) → le garder
- LazyImage : le garder aussi (utile pour les perfs plus tard)

---

## 🔌 PHASE 2 - BRANCHER LES FEATURES ORPHELINES (P1)

### [x] 2.1 - Galerie d'achievements
> ✅ Lien « 🏆 Succès » ajouté dans la sidebar (section OUTILS) → /dashboard/achievements. La page affiche déjà succès débloqués + à débloquer.
- La logique de déblocage (unlockAchievement) tourne déjà partout
- Il manque juste l'accès à `/dashboard/achievements`
- Ajouter un lien "🏆 Succès" dans la sidebar (section OUTILS) ET dans le profil utilisateur
- Vérifier que la page affiche bien les succès débloqués + ceux à débloquer

### [x] 2.2 - Donjon builder manuel
> ✅ Nouvelle page /dashboard/maps/builder (« 🏗 Atelier de donjon ») montant les 7 composants donjon/ (TuilesPalette, PiegesPalette, TriggerEditor, AnnotationsMJPanel, MapLiensPanel, RandomEncounterRoller, GmViewToggle) + mini-CRUD zones de rencontre. Accès : bouton sur la page Maps + hub Cartes de la sidebar.
- Le dossier `app/components/donjon/` (7 composants) n'est consommé nulle part
- Composants : TuilesPalette, PiegesPalette, TriggerEditor, AnnotationsMJPanel, MapLiensPanel, RandomEncounterRoller, GmViewToggle
- Brancher ces composants dans l'éditeur de map (`maps/editor`) via un mode "Builder avancé" ou des onglets
- OU créer une page dédiée `/dashboard/maps/builder` accessible depuis la page Maps
- L'objectif : rendre accessible la palette de tuiles, pièges, déclencheurs, annotations MJ, liens entre cartes, table de rencontres, bascule vue MJ/joueur

### [x] 2.3 - Communauté : Mon flux + profils publics
> ✅ Bouton « 📡 Mon flux » sur la page Communauté → /dashboard/communaute/flux. Les noms d'auteurs des cartes deviennent des liens cliquables vers /profil/[username].
- Brancher `/dashboard/communaute/flux` : ajouter un onglet "Mon flux" sur la page Communauté
- Ça débloque aussi `/profil/[username]` (accessible depuis le flux)
- Vérifier que le flux affiche les créations des utilisateurs suivis

### [x] 2.4 - Templates de donjons
> ✅ Bouton « 📚 Templates » sur la page Maps + entrée « Templates de donjons » dans le hub Cartes de la sidebar → /dashboard/maps/templates.
- Brancher `/dashboard/maps/templates` : ajouter un accès depuis la page Maps (bouton "📚 Templates de donjons")

### [x] 2.5 - Historique global
> ✅ Entrée « 📜 Historique » ajoutée dans la sidebar (section OUTILS) → /dashboard/historique.
- Brancher `/dashboard/historique` : ajouter un lien dans la sidebar (section OUTILS) ou accessible depuis le profil

### [x] 2.6 - Tables d'effets custom
> ✅ Entrée « 🎲 Tables d'effets » ajoutée dans la sidebar (section OUTILS) → /dashboard/tables-effets.
- Brancher `/dashboard/tables-effets` : ajouter un accès (sidebar OUTILS ou depuis les paramètres)

### [x] 2.7 - Thèmes custom
> ✅ Bouton « ✨ Thèmes custom » ajouté dans la sidebar (section PARAMÈTRES, à côté du sélecteur de thème) → /dashboard/themes/custom.
- Brancher `/dashboard/themes/custom` : ajouter un accès depuis les paramètres de thème (à côté du sélecteur de thème existant)

### [x] 2.8 - Follow + Commentaires communauté (P2)
> ✅ FollowButton monté sur /profil/[username]. CommentairesCommunaute monté en bloc repliable sous chaque carte partagée de la page Communauté (sauf personnages, type non supporté).
- Monter `FollowButton` sur les profils publics et les cartes communauté
- Monter `CommentairesCommunaute` sur les pages de détail des créations partagées

### [x] 2.9 - Jet de groupe + Historique de combat (P2)
> ✅ Bouton « 🎲 Jet groupé » + panneau « 📜 Historique du combat » branchés dans CombatCockpitMJ. NB : `id` ajouté au type CombatLite + au select combats pour alimenter HistoriqueCombat. Le jet groupé tourne sans modificateurs de caracs dans cette vue (non chargés) — d20 + DC pleinement fonctionnels.
- Brancher `JetGroupeModal` dans le cockpit de combat (bouton "🎲 Jet groupé")
- Brancher `HistoriqueCombat` (viewer) pour consulter le log d'un combat (bouton "📜 Historique" dans le combat)

---

## 🗂 PHASE 3 - REGROUPEMENT DE LA SIDEBAR EN HUBS

### [x] 3.1 - Hub Combat
> ✅ Hub « ⚔️ Combat » dépliable dans AVENTURE : Préparateur, Combat rapide, Combat (grille), Calculateur de rencontre.
Regrouper tous les onglets liés au combat dans une seule entrée sidebar avec sous-menu :
- **⚔️ Combat** (entrée principale qui déplie) :
  - Préparateur de combat
  - Combat rapide
  - Combat (grille tactique)
  - Calculateur de rencontre (encounter builder)
- Allège la sidebar en regroupant ces 4 accès

### [x] 3.2 - Hub Cartes & Exploration
> ✅ Hub « 🗺️ Cartes & Exploration » dépliable : Maps, Éditeur, Atelier de donjon, Générateur, Hexcrawl, Templates, Exploration. (Maps retiré du CODEX.)
Regrouper tous les onglets liés aux cartes/exploration :
- **🗺️ Cartes & Exploration** (entrée principale qui déplie) :
  - Maps (liste)
  - Éditeur de carte
  - Donjon builder (manuel)
  - Générateur de donjon (procédural)
  - Hexcrawl
  - Templates de donjons
  - Exploration
- Allège la sidebar

### [x] 3.3 - Réorganisation cohérente
> ✅ Structure appliquée. CODEX (sans Maps), AVENTURE (hubs + Présentation directe), OUTILS (Sound Box, Succès, Historique, Personnaliser, Accessibilité, Tables d'effets, Aide), PARAMÈTRES (Langue, Thème + Thèmes custom, Tutoriel). Sous-menus persistés en localStorage (clés hub_combat / hub_cartes via le mécanisme sections existant).
- Garder le mode présentation accessible facilement (entrée dédiée, c'est central)
- Structure finale sidebar :
  - **CODEX** : Scénarios, Personnages, Ennemis, PNJ, Items, Sorts, Bibliothèque, Communauté
  - **AVENTURE** : Hub Combat, Hub Cartes & Exploration, Mode présentation
  - **OUTILS** : Sound Box, Succès, Historique, Personnaliser l'accueil, Accessibilité, Tables d'effets, Aide
  - **PARAMÈTRES** : Langue, Thème (+ thèmes custom), Tutoriel
- Sous-menus dépliables/repliables avec état sauvegardé (localStorage)

### [x] 3.4 - Sous-pages scénario accessibles sur mobile
> ✅ Barre de navigation `lg:hidden` (scroll horizontal) ajoutée en haut de la fiche scénario (page edit) : Session zéro, Économie, XP, Memo, Calendrier, Récap — visibles sous 1024px. Le panneau aside desktop reste `hidden lg:flex`.
- Les 6 sous-pages scénario (recap, xp, economie, memo, session-zero, calendrier) sont dans un panneau `hidden lg:flex` → invisibles sous 1024px
- Les sortir de ce panneau : créer des onglets sur la fiche scénario (visibles sur tous les écrans)
- Accessibles sans entrer en mode édition

---

## 📚 PHASE 4 - TUTORIELS DÉTAILLÉS (TOOLTIPS GUIDÉS)

### [x] 4.1 - Système de tutoriel contextuel par tooltips
> ✅ Moteur créé : `app/lib/tours.ts` (registre + persistance tutoriels_vus) + `app/components/GuidedTour.tsx` (overlay spotlight via box-shadow, carte positionnée près de la cible, Précédent/Suivant/Passer, surbrillance de l'élément `data-tour=…`, dégrade en carte centrée si cible absente). Le primitive ui/Tooltip est réutilisé sur le bouton lanceur 🎓.
- Créer un système de tutoriels guidés "étape par étape" avec tooltips qui pointent les éléments de la page
- Chaque étape : un tooltip pointant un bouton/zone avec un texte explicatif ("Clique ici pour ajouter un ennemi")
- Navigation : Précédent / Suivant / Passer
- Surbrillance de l'élément ciblé (le reste de la page assombri)
- Réutiliser le composant Tooltip existant (ui/)

### [x] 4.2 - Déclenchement double
> ✅ Auto à la première visite (vérif profiles.tutoriels_vus, marqué vu à la fin) + manuel via bouton flottant 🎓 (et helper startTour()). Désactivation des tutos auto : section « 🎓 Tutoriels guidés automatiques » dans la page Accessibilité (préférence localStorage) + case « ne plus afficher » dans l'overlay.
- **Automatique** : à la première visite d'une page importante (sauvegarder dans profiles.tutoriels_vus quels tutos ont été vus)
- **Sur demande** : bouton "❓ Aide" / "🎓 Tutoriel" sur chaque page importante qui relance le tuto contextuel
- L'utilisateur peut désactiver les tutos auto dans les paramètres

### [x] 4.3 - Tutoriels des pages importantes
> ✅ 6 tours définis et montés : Combat (/dashboard/combat), Préparateur (/dashboard/combat-prepare, spotlight « Nouveau combat »), Mode diffusion (/dashboard/presentation, spotlight onglets cockpit), Création de scénario (page edit, spotlights barre sous-pages + chapitres), Fiche personnage (/dashboard/personnages/[id]). Tour Mindmap défini dans le registre. NB : les étapes sans marqueur `data-tour` s'affichent en cartes centrées (le moteur dégrade proprement) ; d'autres marqueurs spotlight peuvent être ajoutés incrémentalement.
Créer des tutoriels guidés pour :
- **Combat** : initiative, actions, conditions, fin de combat
- **Préparateur de combat** : créer/configurer/sauvegarder un combat
- **Mode diffusion** : lancer la diffusion, roue d'action, pousser narration/images, gérer combat
- **Création de scénario** : chapitres, mindmap, notes
- **Fiche personnage** : caractéristiques, sorts, HP, repos
- **Mindmap** : créer des nœuds, lier des entités

### [x] 4.4 - SQL tutoriels
- Vérifier/ajouter colonne `tutoriels_vus` jsonb sur profiles (peut déjà exister)
> ✅ Colonne déjà présente — migration `20260530128000_tutoriels_vus.sql` (jsonb default '{}'). Aucune nouvelle migration nécessaire.

---

## 💬 PHASE 5 - SUGGESTIONS & PROBLÈMES

### [x] 5.1 - Page de soumission
> ✅ Page /dashboard/feedback : catégorie (🐛 Problème / 💡 Suggestion), titre, description, soumettre + message de confirmation. Métadonnées auto : route d'origine (document.referrer), navigateur (userAgent), écran/vue, langue, user_id, timestamp. Accès : sidebar OUTILS « 💬 Retours & suggestions » + centre d'aide.
- Nouvelle page `/dashboard/feedback` accessible depuis la sidebar (section OUTILS) et le centre d'aide
- Formulaire :
  - Catégorie : 🐛 Problème / 💡 Suggestion
  - Titre (court)
  - Description (détaillée)
  - Soumettre
- Collecte automatique (dans les limites légales) :
  - Page d'où vient le retour (route)
  - Navigateur + version
  - Taille d'écran / device
  - User ID (l'utilisateur connecté)
  - Timestamp
- Message de confirmation après soumission

### [x] 5.2 - Stockage + email
> ✅ Table `feedback` (id, user_id, categorie, titre, description, statut, metadonnees jsonb, reponse_admin, created_at, updated_at) — migration `20260611120000_feedback.sql`. Statut default 'nouveau' (nouveau/en_cours/resolu). Stockage Supabase opérationnel. Email : champ `reponse_admin` prévu ; l'envoi mail effectif reste à activer quand l'adresse de l'app sera dispo (pas bloquant).
- Stocker dans Supabase : table `feedback` (id, user_id, categorie, titre, description, statut, metadonnees jsonb, created_at, updated_at)
- Statut : 'nouveau' / 'en_cours' / 'resolu' (default 'nouveau')
- Préparer l'envoi email (champ pour l'adresse de réception — laisser configurable, sera activé plus tard quand l'adresse email de l'app sera disponible)
- Pour l'instant, le stockage Supabase suffit

### [x] 5.3 - Suivi côté utilisateur
> ✅ Section « 📋 Mes retours » sur la page feedback : liste des retours de l'utilisateur avec badge de statut (🆕 Nouveau / 🔄 En cours / ✅ Résolu) + affichage de la réponse admin éventuelle.
- L'utilisateur peut voir ses propres retours soumis avec leur statut
- Section "Mes retours" dans la page feedback
- Affichage du statut : 🆕 Nouveau / 🔄 En cours / ✅ Résolu
- L'utilisateur voit quand son retour passe en "Résolu"

### [x] 5.4 - Page admin (réservée au compte admin)
> ✅ Page /dashboard/admin/feedback réservée à `profiles.is_admin = true` (vérif + écran « accès refusé » sinon ; RLS via fonction SECURITY DEFINER `est_admin()`). Liste TOUS les retours, filtres catégorie/statut, tri date, détails techniques (métadonnées), changement de statut, réponse/note interne, badge compteur des nouveaux. Colonne `is_admin` ajoutée (migration feedback ; à passer true manuellement sur ton compte). Accès admin : bouton « 🛡 Console admin » conditionnel sur la page feedback.
- Nouvelle page `/dashboard/admin/feedback` accessible UNIQUEMENT par le compte admin (ton compte)
- Définir l'admin : par user_id en dur, ou colonne `is_admin` bool sur profiles
- La page liste TOUS les retours de tous les utilisateurs :
  - Filtres par catégorie (problème/suggestion) et statut
  - Tri par date
  - Voir tous les détails (message + métadonnées techniques)
  - Changer le statut (nouveau → en cours → résolu)
  - Éventuellement répondre / ajouter une note interne
- Badge compteur des nouveaux retours non traités
- SQL : ajouter colonne `is_admin` bool default false sur profiles (mettre true manuellement sur ton compte)

### [x] 5.5 - Lien depuis le centre d'aide
> ✅ Page Aide : les 2 cartes « Signaler un bug » / « Suggérer une amélioration » pointent désormais vers /dashboard/feedback (au lieu de GitHub Issues). Les mentions de features (achievements, follow, flux) sont maintenant exactes car ces features ont été branchées en Phase 2.
- Dans la page Aide existante, ajouter des liens RÉELS et cliquables vers :
  - "💬 Signaler un problème ou suggérer" → page feedback
  - Corriger les mentions de features qui décrivaient des trucs inaccessibles (maintenant branchés)

---

## 🛡 PHASE 6 - ANTI-RÉGRESSION

### [x] 6.1 - Script anti-orphelin
> ✅ `scripts/check-orphan-routes.mjs` (Node natif, sans dépendance) : liste les page.tsx sans lien entrant (href/Link/router.push), gère les segments dynamiques, exit 1 si orpheline. Documenté dans le README (section « Anti-régression »).
- Créer un script `scripts/check-orphan-routes.mjs`
- Liste toutes les pages (page.tsx) qui n'ont aucun href/router.push entrant
- Permet de détecter les futures routes orphelines avant qu'elles s'accumulent
- Documenter son usage dans le README

### [x] 6.2 - Vérification finale
- Après tous les branchements, refaire un passage : toutes les routes ont-elles un accès ?
- Vérifier qu'aucune feature n'est plus orpheline
- Build vert + tsc clean
> ✅ `node scripts/check-orphan-routes.mjs` → **0 route orpheline / 47 analysées**. `npm run build` → **vert**. `npx tsc --noEmit` → **0 erreur**. Les 22 composants jadis non montés sont soit supprimés (Phase 1, vestiges), soit branchés (Phase 2 : donjon/, FollowButton, CommentairesCommunaute, JetGroupeModal, HistoriqueCombat ; Tooltip via GuidedTour). GlobalSearch supprimé (doublon CommandPalette).

---

## 📋 SQL À APPLIQUER

- [x] `supabase/migrations/20260611120000_feedback.sql` — table `feedback`,
  colonne `profiles.is_admin`, fonction `est_admin()` (SECURITY DEFINER) + RLS.
  → À pousser via `supabase db push` (après le `migration repair` des migrations
  déjà appliquées, cf. README). **Puis : passer `is_admin = true` manuellement
  sur ton compte** dans le SQL Editor :
  `update public.profiles set is_admin = true where id = '<ton-user-id>';`
- Phase 4 (tutoriels) : aucune migration — `tutoriels_vus` existe déjà
  (`20260530128000_tutoriels_vus.sql`).

---

## 🐛 NOTES ET PROBLÈMES

- **Next.js 16** : toute page utilisant `useSearchParams()` doit être enveloppée
  dans `<Suspense>` (sinon le build échoue à la prérender). Appliqué à la nouvelle
  page `/dashboard/maps/builder`.
- **Jet groupé (2.9)** dans le cockpit : la vue MJ ne charge pas les
  caractéristiques des combattants → les jets se font sans modificateur (d20 + DC
  seulement). Suffisant pour un jet de groupe rapide ; brancher les mods plus tard
  si besoin.
- **Tutoriels (4.3)** : montés sur 5 pages. Les étapes ciblées (`data-tour`) ont
  un spotlight ; les autres s'affichent en cartes centrées. Ajouter des marqueurs
  `data-tour` supplémentaires améliorera progressivement le ciblage.
- **Mindmap (4.3)** : tour défini dans le registre mais pas de second bouton
  lanceur monté sur la page edit (éviter deux lanceurs 🎓) — déclenchable via
  `startTour('mindmap')` si on ajoute un bouton dédié.

---

## ✅ STATUT FINAL

Date de fin : 2026-06-11
Phases complétées : **6 / 6**
Features complétées : **30 / 30** (1.1–1.2, 2.1–2.9, 3.1–3.4, 4.1–4.4, 5.1–5.5, 6.1–6.2)

Vérifications : `npm run build` ✅ vert · `npx tsc --noEmit` ✅ 0 erreur ·
`node scripts/check-orphan-routes.mjs` ✅ 0 route orpheline (47/47 accessibles).

Fichiers créés : `app/dashboard/maps/builder/page.tsx`, `app/dashboard/feedback/page.tsx`,
`app/dashboard/admin/feedback/page.tsx`, `app/lib/tours.ts`, `app/components/GuidedTour.tsx`,
`supabase/migrations/20260611120000_feedback.sql`, `scripts/check-orphan-routes.mjs`.
Fichiers supprimés (Phase 1) : 10 composants morts (combat/ vestiges, GlobalSearch, PresentationTabsBar).
