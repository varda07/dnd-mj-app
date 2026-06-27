# 🐛 ROADMAP CORRECTIONS POST-TEST V1 — Master Screen

## ⚠️ INSTRUCTIONS POUR CLAUDE CODE

Travaille en **autonomie complète**. Coche `[x]` quand fait, `[!]` si bloqué + note.
Génère les SQL dans `supabase/migrations/` avec timestamp. Vérifie `npm run build` souvent.
**Style grimoire** : sombre, or #C9A84C, Georgia serif, CSS variables des thèmes.

⚠️ Certaines pages sont volumineuses (combat ~3700 lignes). Travaille avec PRUDENCE, par étapes, en vérifiant le build. Ne casse RIEN de l'existant.

Ces corrections viennent d'une phase de test réelle. Classées par criticité.

---

## 🔴 PRIORITÉ 1 — BUGS CRITIQUES (bloquants)

### [x] 1.1 - Multi-sessions même navigateur = perte de données
**FAIT** : ajout `app/components/SessionGuard.tsx` (monté dans `dashboard/layout.tsx`). Surveille l'identité de session : si le compte change sous l'onglet (connexion d'un autre compte ailleurs) → reload propre pour afficher le bon compte ; si déconnexion → retour accueil. Aucune donnée ne « disparaît » visuellement. NB : l'isolation de deux comptes *réellement simultanés* dans le même navigateur reste impossible (localStorage partagé = limite navigateur) ; on garantit que le dernier compte actif est toujours affiché correctement au lieu d'un écran vide cassé.
**Bug** : quand on a plusieurs sessions sur le même navigateur (même avec des comptes différents), ça crée une erreur et tout ce qu'il y a sur le compte disparaît. Tout revient quand on se reconnecte.
**Cause probable** : conflit de tokens/session Supabase dans le même navigateur (localStorage partagé entre onglets).
**Correction** :
- Investiguer la gestion des sessions Supabase (auth token storage)
- Éviter que deux sessions de comptes différents se marchent dessus
- Isoler correctement les sessions ou gérer proprement le changement de compte
- S'assurer que les données ne "disparaissent" jamais visuellement (même si c'est temporaire, c'est très anxiogène)
- Tester : ouvrir 2 onglets avec 2 comptes → vérifier qu'aucune donnée ne disparaît

### [x] 1.2 - Ajout de personnage à un scénario via code ne fonctionne pas
**FAIT** : cause = la RLS empêchait le MJ de modifier le personnage d'un joueur pas encore inscrit (œuf/poule) → 0 ligne mise à jour, échec silencieux. Solution : RPC SECURITY DEFINER `lier_personnage_via_code(p_code, p_scenario_id)` (migration `20260627120000_lier_personnage_scenario_rpc.sql`) qui, après contrôle que le MJ possède le scénario : lie le perso, inscrit le joueur dans `scenarios_joueurs`, consomme le code — atomiquement. `ajouterJoueur` (scenarios/page.tsx) appelle la RPC + refetch.
**Bug** : la notif "X a rejoint mon scénario" arrive bien, MAIS quand le joueur ajoute son personnage au scénario avec le code, ça ne fonctionne pas.
**Correction** :
- Vérifier tout le flow : code d'invitation → rejoindre → lier son PJ au scénario
- Le PJ du joueur doit bien apparaître dans le scénario du MJ
- Vérifier les RLS et les insertions en base
- Tester le flow complet de bout en bout

### [x] 1.3 - Pas de bouton changer mot de passe
**FAIT** : nouvelle page `app/dashboard/compte/page.tsx` (section « Changer mon mot de passe » : actuel + nouveau + confirmation, ré-auth via `signInWithPassword` puis `updateUser`). Entrée « 🔐 Mon compte » ajoutée dans Paramètres (Sidebar). Traductions fr/en (`compte.*`, `dashboard.params_account`).
**Bug** : il n'y a aucun moyen de changer son mot de passe.
**Correction** :
- Ajouter une section "Changer mon mot de passe" dans les paramètres / profil
- Champs : mot de passe actuel, nouveau, confirmation
- Validation + feedback (succès/erreur)
- Via Supabase auth updateUser

---

## 🟠 PRIORITÉ 2 — BUGS COMBAT (gênent le jeu)

### [x] 2.1 - Boucle bouton retour en mode combat (grille)
**FAIT** : `router.back()` → `router.push('/dashboard')` (la page réécrit l'URL scenario_id et est atteinte via redirections, d'où la boucle). Retour déterministe.
**Bug** : en mode combat, le bouton retour renvoie sur la page d'avant en boucle, impossible de revenir au dashboard. (Le bouton home reste accessible heureusement.)
**Correction** :
- Corriger la navigation retour dans la page combat
- Le retour doit ramener proprement au dashboard ou à la page précédente logique, sans boucle

### [x] 2.2 - Jet groupé : modificateurs invisibles + non appliqués
**FAIT** : (1) `<option>` du select caracs : `colorScheme:dark` + `bg-gray-800 text-white` (fini le blanc sur blanc). (2) Cause des mods à 0 : `combat-engine.ts` ne chargeait pas les caracs (`force…charisme, saves_maitrises`) ni celles des ennemis → ajout au `select`. Le calcul d20 + mod((carac-10)/2) + maîtrise fonctionnait déjà, il manquait les données.
**Bug double** :
1. Le menu dépliant des caractéristiques : texte blanc sur blanc, illisible
2. Les bonus de caractéristique ne s'ajoutent pas, elles sont toutes à 0 à chaque fois
**Correction** :
- Corriger les couleurs du menu déroulant (lisible sur le thème)
- CORRIGER LE CALCUL : les modificateurs de caracs doivent réellement s'appliquer (pas rester à 0)
- Vérifier que les caractéristiques des participants sont bien chargées et utilisées
- Le calcul doit être : d20 + modificateur((carac - 10) / 2) + maîtrise éventuelle

### [x] 2.3 - Menu condition ne se ferme pas
**FAIT** : click-outside ajouté — grille (listener page-level via `data-cond-menu=<pieceId>` sur le menu + bouton) ET cockpit diffusion (`ConditionsEditor`, ref + mousedown).
**Bug** : quand on ajoute une condition, le menu condition ne se ferme pas quand on clique ailleurs.
**Correction** :
- Le menu de conditions se ferme au clic en dehors (click outside)
- Appliquer partout où ce menu apparaît (cockpit + page combat)

### [x] 2.4 - Pas de "retirer toutes les conditions" partout
**FAIT** : cockpit avait déjà 🗑️ global. Grille : bouton global déjà présent + ajout d'un "🗑️ Tout retirer" par participant dans son menu de conditions.
**Bug** : il n'y a pas de bouton pour enlever toutes les conditions d'un coup (à certains endroits).
**Correction** :
- Ajouter le bouton "🗑️ Retirer toutes les conditions" partout où on gère les conditions (cockpit ET page combat grille)

### [x] 2.5 - Pas d'accès à l'équipement/armes/capacités des ennemis en combat
**FAIT** : grille — la carte ennemi dépliée affiche désormais "⚔ ATTAQUES & CAPACITÉS" (attaques, dégâts, portée/type/description) + résistances / immunités / vulnérabilités + comportement tactique. `combat-engine.ts` et le select grille chargent ces colonnes. Cockpit diffusion : déjà l'AttackRoller pour les attaques d'ennemis.
**Bug** : le mode combat ne donne pas accès à l'équipement des ennemis, ni à leurs armes et capacités. Pas pratique.
**Correction** :
- En combat (cockpit ET grille), pouvoir consulter pour chaque ennemi : ses armes, son équipement, ses capacités/actions spéciales
- Accessible rapidement (clic sur l'ennemi ou panneau dédié)
- Sans quitter le combat

### [x] 2.6 - Bouton "remettre PV au max"
**FAIT** : grille — bouton "PV MAX" par participant (réutilise `modifierHp` + logique réveil). Cockpit — bouton "MAX" dans l'éditeur de PV (désactivé si déjà au max).
**Ajout** : ajouter un bouton "remettre les PV au max" sur les participants (au cas où il y a un soin de zone, ou pour reset facilement).
- Sur chaque participant (ou action groupée)

### [x] 2.7 - Boutons Magie Sauvage et Tuto mal placés en combat grille
**FAIT** : le FAB ✨ Magie Sauvage chevauchait le bouton 🎓 tutoriel en bas-gauche. La Magie Sauvage est désormais un bouton de la barre d'outils du combat (`flottant={false}` + contrôle ouvert/onClose). Plus de chevauchement. Le 🎓 reste à sa position standard app-wide (bas-gauche).
**Bug** : le bouton magie sauvage et le bouton tuto sont à un endroit pas pratique en mode combat grille.
**Correction** :
- Repositionner ces boutons à un endroit plus ergonomique en combat grille
- Qu'ils ne gênent pas le jeu

### [x] 2.8 - Rencontre random en combat rapide renvoie au combat classique
**FAIT** : `SituationsRandom.lancerCombat` faisait toujours `router.push('/dashboard/combat')`. Désormais, si un `onCreated` est fourni (combat rapide ET grille gèrent le refresh sur place), on NE redirige plus ; redirection conservée uniquement pour l'usage autonome.
**Bug** : lors d'une rencontre random en combat rapide, ça envoie sur le mode combat classique. Le mode rapide doit rester le mode rapide.
**Correction** :
- Une rencontre random lancée depuis le combat rapide doit rester en mode combat rapide
- Ne pas basculer vers le combat grille classique

### [x] 2.9 - Confirmer : voir une fiche ne reset pas le combat
**VÉRIFIÉ OK** : l'état de combat est persisté dans la table `combats` (1 ligne par scénario, partagée grille/cockpit). Ouvrir une fiche = navigation URL classique ; au retour, l'état est rechargé depuis la base. Aucune remise à zéro possible côté grille comme cockpit.
**Note du test** : "voir une fiche ne reset pas le fight" — semble OK en combat grille, mais VÉRIFIER que c'est bien le cas partout (cockpit diffusion aussi).

---

## 🟡 PRIORITÉ 3 — AFFICHAGE & UX (important pour le confort)

### [x] 3.1 - GROS problème : tutos et fenêtres (magie sauvage, etc.) s'affichent au milieu de la page
**FAIT (cause racine globale)** : `.codex-page-transition` (conteneur pleine page wrappant chaque route) avait `will-change: transform` + `animation … both` qui laissaient un `transform` persistant. Or un transform crée un **bloc englobant** pour les enfants `position: fixed` → toutes les modales/tutos NON portées (Magie Sauvage, situations random, tutoriels guidés…) se centraient sur la PAGE entière au lieu du viewport. Correctif : `will-change: opacity` seul + retrait du `transform` persistant (fill-mode par défaut). Toutes les fenêtres `fixed` s'affichent désormais dans le viewport visible.
**Bug majeur** : les tutos et autres fenêtres de ce type (magie sauvage, etc.) ne s'affichent PAS là où est la personne sur l'écran, mais au milieu de la page → il faut descendre pour les voir. Pas ergonomique du tout.
**Correction** :
- Ces fenêtres/modales/popups doivent s'afficher dans le viewport visible (position fixed centrée sur l'écran visible, pas sur la page entière)
- Utiliser position: fixed centré viewport, pas absolute sur la page
- S'applique aux tutos guidés, popups magie sauvage, et toute fenêtre similaire
- Tester en ayant scrollé vers le bas : la fenêtre doit apparaître devant les yeux

### [x] 3.2 - Superposition pétales roue d'action dans un coin
**FAIT** : `ActionWheelMJ.computeOffsets` bornait CHAQUE pétale aux bords (ils s'empilaient sur un même bord dans un coin). Désormais on translate l'ENSEMBLE du groupe vers l'intérieur en bloc (espacement angulaire préservé → zéro chevauchement) + coin = quart de cercle (90°).
**Bug** : le bouton master screen est parfait, sauf que si on le place dans un coin de l'écran, les icônes pétales se superposent.
**Correction** :
- Quand la roue est dans un coin, mieux calculer le déploiement pour éviter la superposition des pétales
- Adapter l'arc et l'espacement selon la position (coin = quart de cercle bien réparti)

### [x] 3.3 - Problème affichage lanceur de dés sur mobile
**FAIT** : la barre de navigation mobile du bas (`<nav>` de l'accueil) supprimée (navigation via tiroir latéral + FABs). Elle ne servait que sur l'accueil mais TOUS les FABs réservaient 56px partout → décalage du lanceur de dés sur mobile. Réserve de 56px retirée du lanceur de dés, du FAB Magie Sauvage et de la roue d'action.
**Bug** : problème d'affichage sur le lanceur de dés sur mobile. La barre en bas n'a plus d'utilité → à supprimer.
**Correction** :
- Corriger l'affichage du lanceur de dés sur mobile
- Supprimer la barre en bas devenue inutile

### [x] 3.4 - Combat préparé lancé en diffusion : renvoie à l'accueil diffusion
**FAIT** : `CombatsPreparesLaunch` rechargeait sans contexte → retour à l'accueil diffusion. Désormais reload avec `?diffuser=1`, qui rouvre directement le panneau Combat (mécanisme existant) et relance la diffusion.
**Bug** : en mode diffusion, quand on lance un combat préparé, ça le lance bien mais on est renvoyé sur la page "d'accueil" du mode diffusion. Il faut se remettre sur le mode combat pour le voir (alors qu'il est bien lancé).
**Correction** :
- Après lancement d'un combat préparé en diffusion, basculer automatiquement sur l'onglet/vue Combat
- L'utilisateur voit directement le combat lancé

### [x] 3.5 - MindMap : clic sur un élément renvoie à la liste générale
**FAIT** : ennemis/items/maps n'ont pas de page `[id]` → les routes de la carte mentale ciblent désormais `/dashboard/<entite>?focus=<id>`. Nouveau hook `useFocusHighlight` (lib) branché sur les 3 listes : défilement automatique + surlignage doré temporaire de l'élément précis (CSS `.focus-highlight`). PNJ avait déjà sa fiche dédiée.
**Bug** : sur la carte mentale, le lien pour voir l'élément fonctionne, mais ça renvoie sur la page générale. Ex : cliquer sur un ennemi en particulier affiche la liste de TOUS les ennemis. Pas ergonomique.
**Correction** :
- Le clic sur un élément de la mindmap doit ouvrir la fiche SPÉCIFIQUE de cet élément (pas la liste générale)
- Lien direct vers /dashboard/ennemis/[id] (ou la bonne entité avec son id)

### [x] 3.6 - Boucle bouton retour sur la carte mentale
**FAIT** : la carte mentale est une vue de `scenarios/page.tsx` ; son bouton Retour (`router.back()`) bouclait (liens entités empilent de l'historique). Remplacé par `router.push('/dashboard')` déterministe.
**Bug** : toujours un problème de boucle de bouton retour sur la carte mentale.
**Correction** :
- Corriger la navigation retour de la mindmap (pas de boucle)

---

## 🟢 PRIORITÉ 4 — LOGIQUE & DONNÉES

### [x] 4.1 - Roll mode auto semble sur d20 au lieu de d100 (Wild Magic ?)
**VÉRIFIÉ + AMÉLIORÉ** : le code était déjà correct — `rollWildMagic` tire un `Math.random()*100+1` (d100 uniforme) sur une table complète 1→100 sans trou (50 plages de 2) ; les tables d'effets custom tirent sur leur dé configuré (d4…d100). Pas de biais réel. Pour lever le doute, le **nombre tiré (d100 = N)** est désormais affiché dans le résultat de Magie Sauvage (transparence). `rollD20DeclencheSurge` (déclencheur de surge sur nat 1) est du code mort non branché à la sélection d'effet.
**Bug** : l'impression que le roll du mode auto n'est pas sur 100 mais sur 20, on tombe souvent sur le même effet.
**Correction** :
- Vérifier le roll de la table Wild Magic (et tables d'effets) : doit être sur le bon dé (d100 pour Wild Magic officielle)
- Vérifier la distribution aléatoire (pas de biais)
- S'assurer que toutes les entrées de la table sont atteignables

### [x] 4.2 - Stats de personnage selon le niveau à la création
**FAIT** : l'auto-calcul des PV ignorait le niveau (`hpNiveau1Base + modCon`, `niveau` même pas en deps) → un perso niv 10 avait les PV d'un niv 1. Désormais PV = dé max (niv 1) + modCon, puis chaque niveau suivant + (⌊dé/2⌋+1 + modCon), recalculé quand classe/Con/**niveau** changent. Le bonus de maîtrise scalait déjà avec le niveau (`bonusMaitrise(niveau)`). Aperçu de la formule mis à jour.
**Bug** : quand on crée un nouveau personnage, les stats ne sont pas augmentées en fonction du niveau choisi. Un perso niveau 1 peut avoir les mêmes stats de base qu'un perso niveau 10.
**Correction** :
- À la création, ajuster les caractéristiques/HP/bonus selon le niveau choisi
- Appliquer la progression D&D 5e (bonus de maîtrise selon niveau, HP selon niveau et classe, etc.)
- Au minimum : HP et bonus de maîtrise qui scalent avec le niveau

---

## 🔵 PRIORITÉ 5 — NOUVELLES FONCTIONNALITÉS DEMANDÉES

### [x] 5.1 - Lier un personnage à un scénario depuis l'onglet scénario
**FAIT** : nouveau composant `PersonnagesLiesPanel` dans l'édition de scénario (aside « Scénario global »). Liste UNIQUEMENT les PJ du compte (joueur_id = utilisateur), bouton Lier / Délier / Déplacer ici (met à jour `personnages.scenario_id`). Le PJ lié apparaît ensuite en combat / diffusion.
**Ajout** : pouvoir lier un personnage à un scénario depuis l'onglet scénario, et seulement pour les PJ disponibles sur le compte.
**Spécifications** :
- Depuis la fiche/édition d'un scénario, section "Personnages liés"
- Bouton "+ Lier un personnage" qui liste UNIQUEMENT les PJ du compte
- Le PJ lié apparaît dans le scénario

### [x] 5.2 - Barre de recherche pour PNJ, sorts, etc.
**FAIT** : barres de recherche temps réel ajoutées sur les listes Sorts (nom + description), PNJ (nom/race/rôle), Ennemis (nom), Items (nom) ET sur le sélecteur de sorts à la CRÉATION d'un personnage (le plus demandé).
**Ajout** : ajouter une barre de recherche pour les PNJ et les sorts (et autres listes). Pour les sorts, surtout pratique à la création d'un personnage.
**Spécifications** :
- Barre de recherche sur les pages : PNJ, Sorts, Ennemis, Items (les longues listes)
- Surtout : barre de recherche de sorts lors de l'ajout de sorts à un personnage
- Recherche en temps réel (filtre au fur et à mesure de la frappe)

### [!] 5.3 - Refonte du système d'ajout (onglet dédié ?)
**PARTIEL / À ARBITRER** : item volontairement ouvert (« à toi de proposer »). Améliorations livrées qui rendent l'ajout plus évident sans refonte risquée : (a) liaison directe des PJ depuis le scénario (5.1), (b) barres de recherche partout (5.2), (c) navigation directe vers l'élément précis depuis la carte mentale (3.5). Une refonte complète en « onglet dédié » est une vraie redécision UX (impacte scénario edit, combat, perso) : laissée [!] pour validation du design avant de toucher à des pages volumineuses. Pas cassé l'existant.
**Bug UX** : le système d'ajout n'est pas très intuitif. Peut-être créer un onglet dédié.
**Correction** :
- Repenser le système d'ajout d'éléments (PJ, ennemis, items, sorts à un scénario/perso/combat)
- Envisager un onglet/panneau dédié plus clair
- Rendre le flow d'ajout évident
- (À toi de proposer la meilleure approche UX cohérente avec le reste de l'app)

### [x] 5.4 - Étoffer les paramètres d'accessibilité
**FAIT** : la page avait déjà daltonien, police dyslexique, taille de police, haut contraste, réduction d'animations, ARIA, tutoriels, emojis de conditions. Ajout d'un réglage **Espacement du texte** (Normal/Léger/Moyen/Large → letter/word-spacing + line-height, persisté localStorage + profil, comme les autres). Le toggle haptique mobile existe déjà côté lib `haptic.ts`.
**Ajout** : enrichir un peu les paramètres d'accessibilité.
**Suggestions** :
- Taille de police ajustable
- Contraste élevé
- Réduction des animations (prefers-reduced-motion toggle)
- Mode daltonien (palettes adaptées)
- Espacement du texte
- Police dyslexie-friendly (OpenDyslexic)
- Toggle feedback haptique mobile
- (Implémenter ce qui est pertinent et réalisable)

---

## 🛡 PRIORITÉ 6 — ADMIN

### [x] 6.1 - Alerte admin au lancement de l'app
**FAIT** : composant `AdminAlert` (monté dans le layout dashboard). À la connexion, pour l'admin uniquement, compte les `feedback` et `signalements` au statut 'nouveau' et affiche une pastille discrète en haut (lien vers le hub admin). Refermable, non ré-affichée dans la même session (sessionStorage).
**Ajout** : au lancement de l'app, uniquement pour l'admin, un truc pour signaler qu'il y a des notifs / des choses à gérer.
**Spécifications** :
- À la connexion (admin only), une alerte/badge si :
  - Nouveaux feedbacks non traités
  - Nouveaux signalements en attente
- Discret mais visible (badge, toast, ou pastille sur le hub admin)

### [x] 6.2 - Alerte doublons à l'import depuis la base de données
**FAIT** : à l'import du bestiaire (ennemis) ET de la bibliothèque de sorts officiels, on détecte les doublons (nom déjà présent, insensible casse/espaces) : ils sont **ignorés** et un message ⚠️ indique combien ont été importés / ignorés. Évite de polluer la bibliothèque. (Avant : les sorts s'inséraient en double malgré l'indicateur visuel « déjà possédé ».)
**Ajout** : quand on importe des choses de la base de données (bestiaire, sorts...), une alerte si doublons, avec suppression des doublons s'il y en a.
**Spécifications** :
- À l'import de contenu officiel (bestiaire, sorts, items D&D 5e), détecter les doublons (même nom/même entité déjà présente)
- Alerter l'utilisateur
- Proposer de supprimer/ignorer les doublons
- Éviter de polluer la bibliothèque avec des doublons

---

## 🌐 PRIORITÉ 7 — TRADUCTION

### [!] 7.1 - Traductions manquantes
**PARTIEL** : les fichiers `fr/en/es` sont désormais alignés à 100 % (516 clés identiques, vérifié par diff). Toutes les nouvelles chaînes ajoutées dans cette passe (compte/mot de passe, « Tout retirer », « Mon compte », langue espagnole…) sont traduites dans les 3 langues. MAIS de nombreuses chaînes **historiques** sont encore codées en dur en français dans les composants (ex. page combat : « + ÉTAT », « PV MAX », « Aucune arme », cockpit « + Condition », libellés de la roue d'action, etc.). Un audit exhaustif + extraction de ces littéraux vers les fichiers de messages est un chantier dédié volumineux (des dizaines de fichiers) : laissé [!] pour une passe ciblée ultérieure afin de ne pas risquer de régressions massives. Recommandation : traiter page par page.
**Bug** : quand on change la langue, tout n'est pas traduit.
**Correction** :
- Audit complet des chaînes non traduites
- Compléter les fichiers de traduction (fr/en)
- Vérifier toutes les pages, modales, boutons, messages
- S'assurer que rien ne reste en dur

### [x] 7.2 - Ajouter l'espagnol
**FAIT** : `messages/es.json` créé (traduction complète des 516 clés, terminologie D&D). Locale `es` câblée : type `Locale`, `MESSAGES`, détection navigateur/localStorage/profil dans `IntlProvider`, option « 🇪🇸 Español » dans le sélecteur de langue de la sidebar, drapeau 🇪🇸 dans l'aperçu. Parité de clés fr/en/es vérifiée à 100 %. (Les chaînes encore codées en dur — cf. 7.1 — resteront en français tant qu'elles ne sont pas extraites, indépendamment de la langue choisie.)
**Ajout** : ajouter la langue espagnole.
**Spécifications** :
- Créer le fichier de traduction espagnol (es)
- Ajouter l'option dans le sélecteur de langue
- Traduire toutes les chaînes (ou au moins les principales, marquer [!] si trop volumineux pour une passe)

---

## 📋 SQL À APPLIQUER

- [x] `supabase/migrations/20260627120000_lier_personnage_scenario_rpc.sql` — RPC SECURITY DEFINER `lier_personnage_via_code(code, scenario_id)` pour la liaison PJ↔scénario via code (corrige 1.2). **À appliquer via `supabase db push`** (cf. workflow migrations : repair si besoin avant push).

> Aucune autre migration nécessaire : 5.1 (liaison directe des PJ du compte) et 6.x utilisent des tables/colonnes déjà existantes (`personnages.scenario_id`, `feedback.statut`, `signalements.statut`).

---

## 🐛 NOTES ET PROBLÈMES

- **1.1** : l'isolation de DEUX comptes réellement simultanés dans le même navigateur reste impossible (localStorage partagé = limite navigateur). On garantit qu'aucune donnée ne « disparaît » : resynchronisation propre sur changement de compte.
- **5.3** [!] : refonte « onglet d'ajout dédié » volontairement laissée à arbitrer (vraie redécision UX). Améliorations de discoverabilité livrées entre-temps (5.1/5.2/3.5).
- **7.1** [!] : parité fr/en/es à 100 % sur les clés existantes, mais beaucoup de littéraux français codés en dur restent à extraire (chantier dédié, page par page).
- `npm run build` vérifié OK après chaque priorité.

---

## ✅ STATUT FINAL

Date de fin : 2026-06-27
Phases complétées : 7 / 7 (P5.3 et P7.1 en [!] partiel documenté)
Features complétées : 26 / 28 (2 en [!] partiel : 5.3, 7.1)

### Récap par priorité
- **P1 (critiques)** : 1.1 ✅ · 1.2 ✅ (migration SQL) · 1.3 ✅
- **P2 (combat)** : 2.1 ✅ · 2.2 ✅ · 2.3 ✅ · 2.4 ✅ · 2.5 ✅ · 2.6 ✅ · 2.7 ✅ · 2.8 ✅ · 2.9 ✅ (vérifié)
- **P3 (UX)** : 3.1 ✅ (cause racine globale) · 3.2 ✅ · 3.3 ✅ · 3.4 ✅ · 3.5 ✅ · 3.6 ✅
- **P4 (logique)** : 4.1 ✅ (vérifié+transparence) · 4.2 ✅
- **P5 (features)** : 5.1 ✅ · 5.2 ✅ · 5.3 [!] · 5.4 ✅
- **P6 (admin)** : 6.1 ✅ · 6.2 ✅
- **P7 (i18n)** : 7.1 [!] · 7.2 ✅ (espagnol complet)
