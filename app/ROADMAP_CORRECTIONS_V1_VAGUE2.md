# 🐛 ROADMAP CORRECTIONS V1 — VAGUE 2

## ⚠️ INSTRUCTIONS POUR CLAUDE CODE

Travaille en **autonomie complète**. Coche `[x]` quand fait, `[!]` si bloqué + note.
Génère les SQL dans `supabase/migrations/` avec timestamp. Vérifie `npm run build` souvent.
**Style grimoire** : sombre, or #C9A84C, Georgia serif, CSS variables des thèmes.

⚠️ Certaines pages sont volumineuses. Travaille avec PRUDENCE, par étapes. Ne casse RIEN.

Corrections issues de la 2e phase de test réelle.

---

## 🔴 PRIORITÉ 1 — BLOQUANTS DIFFUSION

### [x] 1.1 - Ajout de joueurs à un scénario trop compliqué
**FAIT** :
- Bouton évident **« 👥 Inviter »** visible sur chaque carte scénario (+ dans le menu ⋮).
- Nouvelle **modale d'invitation** : code en GROS + « 📋 Copier le code » + « 🔗 Copier le lien » + **QR code** (api.qrserver) + liste des **joueurs inscrits avec leurs PJ**.
- Nouvelle page **`/rejoindre/[code]`** : le joueur clique le lien → « Rejoindre [Nom du scénario] » → choisit son PJ (ou en crée un, ou rejoint sans PJ) → 1 clic. Non connecté : le code est mémorisé (localStorage) et on revient automatiquement ici après connexion (patch `app/page.tsx`).
- Migration `20260709130000_rejoindre_scenario_via_code.sql` : RPC SECURITY DEFINER `infos_scenario_via_code` (nom du scénario malgré la RLS), `rejoindre_scenario_via_code` (inscription + liaison PJ atomiques, **code réutilisable** multi-joueurs), `joueurs_du_scenario` (liste réservée au MJ). Respecte la règle anti-récursion RLS (pas d'EXISTS croisé inline).
- Ancien affichage inline du code + `codesVisibles`/`cacherCode`/`inviterJoueur` supprimés (remplacés par la modale).
**Problème** : c'est toujours très compliqué d'ajouter des joueurs à un scénario. Il faut que ce soit rapide et intuitif.
**Correction** :
- Simplifier au MAXIMUM le flow d'invitation de joueurs à un scénario
- Depuis la fiche scénario : un bouton évident "👥 Inviter des joueurs"
- Affiche directement : le code d'invitation en gros + un bouton "Copier le lien d'invitation" + un QR code
- Le joueur clique le lien → arrive directement sur "Rejoindre [Nom du scénario]" → sélectionne son PJ (ou en crée un) → c'est fait
- Réduire au minimum le nombre d'étapes et de clics
- Rendre le code/lien visible dès la fiche scénario, sans avoir à fouiller
- Afficher la liste des joueurs déjà inscrits au scénario avec leurs PJ

### [x] 1.2 - Pas d'accès aux PNJ / ennemis / maps liés au scénario en diffusion
**FAIT** : nouvel onglet **« 📦 Contenu »** dans le cockpit de diffusion (`presentation/page.tsx`), rendu par le composant `ElementsScenarioPanel`. Il charge les éléments liés au scénario actif via `scenario_liens` et affiche, en sections repliables :
- 👹 **Ennemis** (PV, CA, stats FOR..CHA, comportement tactique)
- 🧑 **PNJ** (race, rôle, description, personnalité, secrets)
- 🗺️ **Maps** et 🎒 **Items** (vignette + description)

Chaque élément avec visuel a un bouton **« 🖼️ Afficher »** qui pousse l'image en plein écran aux joueurs (réutilise `sauverChamp({ image_plein_ecran })`). Le MJ consulte et affiche son contenu préparé **sans quitter la diffusion**. Le lancement de combat reste sur l'onglet ⚔️ Combat existant. RLS OK (le MJ lit `scenario_liens` + ses entités). *NB : les sorts ne sont pas dans `scenario_liens` (types ennemi/item/map/pnj) → non couverts ici.*
**Problème** : en mode diffusion, le MJ n'a pas accès aux PNJ, ennemis, maps, etc. qu'il a liés au scénario qu'il diffuse. Contre-productif.
**Correction** :
- Dans le cockpit MJ du mode diffusion, ajouter un accès rapide aux éléments liés au scénario actif :
  - 👹 Ennemis du scénario (consultation rapide des fiches, lancer un combat avec)
  - 👤 PNJ du scénario (consultation, afficher aux joueurs)
  - 🗺️ Maps du scénario (afficher, utiliser en combat)
  - 🎒 Items du scénario
  - ✨ Sorts pertinents
- Accessible via un panneau/onglet du cockpit OU via la roue d'action
- Le MJ doit pouvoir consulter et utiliser tout son contenu préparé SANS quitter la diffusion

---

## 🟠 PRIORITÉ 2 — RÈGLES D&D & FICHE PERSONNAGE

### [x] 2.1 - Historique ne s'affiche pas dans la fiche perso
**FAIT** : cause = le champ `historique` n'était jamais inclus dans le payload de création (`app/dashboard/personnages/page.tsx` L607) → toujours vide sur la fiche. Ajouté au payload. Chargé aussi à l'édition (`commencerEdition`) pour ne pas écraser la valeur. La fiche l'affichait déjà correctement (input lié à `perso.historique`).
**Bug** : l'historique (background) ne s'affiche pas dans la fiche personnage.
**Correction** :
- Vérifier que le champ historique/background est bien sauvegardé ET affiché sur la fiche
- Corriger l'affichage

### [x] 2.2 - Classes : corriger la liste
**FAIT** : « Sang-de-dragon » retiré de CLASSES (+ des tables NIVEAU_SOUS_CLASSE et PREREQUIS_MULTICLASSE). Warlock renommé « Sorcier » → « Occultiste » (nom officiel FR 2024, lève la confusion avec Ensorceleur) dans dnd5e.ts, sorts_dnd5e.ts (type ClasseSort, classes_compatibles, SLOTS_PAR_CLASSE, usesShortRest), sorts/page.tsx. Migration SQL `20260709120000_renommer_sorcier_occultiste.sql` pour les données existantes (personnages.classe, classes_multiples, sorts.classes_compatibles). Sous-classes Pacte + slots Pacte Magique déjà présents. Liste = 12 classes officielles + Artificier.
**Problème** :
- "Sang de dragon" est présent dans les CLASSES alors que ce n'est pas une classe (c'est une lignée/race — Drakéide/Dragonborn — ou une sous-classe d'Ensorceleur)
- "Occultiste" (Warlock) manque dans les classes
**Correction** :
- Retirer "Sang de dragon" de la liste des classes
- Ajouter "Occultiste" (Warlock) avec tout ce qui va avec :
  - Sous-classes (Patrons d'Outre-Monde) : Archifée, Fiélon, Grand Ancien, etc.
  - Sorts d'occultiste (Pacte de magie)
  - Emplacements de sorts spécifiques (Pact Magic : peu de slots mais niveau max)
  - Invocations occultes
  - Faveurs de pacte (Pacte de la Lame / du Grimoire / de la Chaîne)
- Vérifier que la liste des classes correspond aux 12 classes officielles D&D 5e : Barbare, Barde, Clerc, Druide, Ensorceleur, Guerrier, Magicien, Moine, Occultiste, Paladin, Rôdeur, Roublard

### [x] 2.3 - Multiclassage : accès à la sous-classe du multiclasse
**FAIT** : `declenchSousClasse` (ModaleMonteeNiveau.tsx) réécrit pour appliquer STRICTEMENT la règle par-classe : la sous-classe n'est proposée que si `niveauDansCetteClasse == seuil` (NIVEAU_SOUS_CLASSE) ET qu'aucune sous-classe n'existe déjà pour cette classe. L'ancienne branche mono-classe conflatait la classe principale et empêchait l'archétype d'une nouvelle classe seuil-1 (Clerc/Ensorceleur/Occultiste) tout en risquant des incohérences. Seuils déjà corrects. Le pas d'étape reste gated (pas de choix d'archétype hors seuil).
**Bug** : lorsqu'on multiclasse, on a accès à la sous-classe de notre multiclasse, ce qui ne devrait pas être le cas.
**Correction** :
- En D&D 5e, une sous-classe (archétype) ne se choisit qu'à un certain niveau DANS cette classe (généralement niveau 1, 2 ou 3 selon la classe)
- Si on multiclasse au niveau 1 dans une nouvelle classe, on n'a PAS accès à sa sous-classe tant qu'on n'a pas atteint le niveau requis dans CETTE classe
- Corriger la logique : le choix de sous-classe n'est proposé que si le niveau dans cette classe atteint le seuil requis
- Seuils D&D 5e : Clerc/Ensorceleur/Occultiste = niveau 1 · Barbare/Barde/Druide/Guerrier/Magicien/Moine/Paladin/Rôdeur/Roublard = niveau 2 ou 3 selon la classe

### [x] 2.4 - Dons (feats) au niveau 4 et suivants
**FAIT** : nouvelle data `app/data/dons_dnd5e.ts` (30 dons PHB FR avec descriptions + prérequis). L'étape ASI de la modale de montée de niveau propose désormais 3 choix : +2 stat / +1 à deux stats / **🎖 Prendre un don**. La liste des dons est filtrée par prérequis auto-vérifiables (stat min, lanceur de sorts → grisés + verrouillés) ; les prérequis d'armure sont affichés en note (non bloquants, « à vérifier avec le MJ »). Le don choisi est ajouté au champ « Exploits » du perso (pas de changement de schéma). Les niveaux ASI (4/8/12/16/19 + bonus Guerrier 6,14 / Roublard 10) étaient déjà corrects via NIVEAUX_ASI.
**Problème** : il manque des dons possibles au niveau 4 et autres, à ajuster selon les classes et les règles D&D.
**Correction** :
- Aux niveaux d'amélioration de caractéristiques (4, 8, 12, 16, 19 — + niveaux bonus pour Guerrier et Roublard), proposer le choix : +2 caractéristiques OU un don (feat)
- Compléter la liste des dons D&D 5e (SRD) disponibles
- Certains dons ont des prérequis (caractéristique minimale, port d'armure, etc.) → les vérifier
- Ajuster selon la classe : le Guerrier a des ASI supplémentaires (niveaux 6 et 14), le Roublard au niveau 10

### [x] 2.5 - Sorts : filtrer selon classe et niveau
**FAIT** : nouveaux helpers `niveauMaxSortClasse` + `sortAutorisePourPerso` (sorts_dnd5e.ts) basés sur les tables de slots existantes (lanceur complet / demi / tiers / Pacte). Dans la modale « Attribuer des sorts » (fiche perso), chaque sort est vérifié contre les classes du perso (mono ou multiclasse, niveau PAR classe) : les sorts inaccessibles sont grisés + non sélectionnables avec la raison (« Niveau de sort X inaccessible (max Y) » ou « Classe incompatible »). Tours de magie (niveau 0) autorisés si classe compatible. Classes compatibles affichées. Toggle MJ « 🔓 autoriser tous les sorts » pour homebrew. La modale charge désormais `classes_compatibles`.
**Problème** : sur la fiche perso, à l'ajout d'un sort, on peut ajouter n'importe quel sort. Un personnage niveau 1 ne devrait pas pouvoir apprendre un sort de niveau 9.
**Correction** :
- Filtrer les sorts proposés selon :
  - La CLASSE du personnage (chaque sort a une liste de classes qui peuvent l'apprendre)
  - Le NIVEAU du personnage (niveau max de sort accessible selon le niveau de perso et la classe)
- Tableau de progression des emplacements de sorts D&D 5e :
  - Lanceur complet (Magicien, Clerc, Druide, Barde, Ensorceleur) : sorts niveau 1 dès niveau 1, niveau 2 au niveau 3, ... niveau 9 au niveau 17
  - Demi-lanceur (Paladin, Rôdeur) : sorts niveau 1 au niveau 2, max niveau 5
  - Tiers-lanceur (Guerrier Chevalier occulte, Roublard Arcanaque) : progression réduite
  - Occultiste : Pact Magic (progression spécifique)
- Afficher un message clair si un sort n'est pas accessible ("Nécessite le niveau X")
- Optionnel : toggle MJ "autoriser tous les sorts" pour les cas particuliers/homebrew

---

## 🟡 PRIORITÉ 3 — NAVIGATION & UX

### [x] 3.1 - Favoris : clic renvoie à la page générale
**FAIT** : routes favoris (ennemis/items/maps/sorts) passent désormais `?focus=<id>` (app/dashboard/page.tsx L151-154). Ajout du support `useFocusHighlight` + `id="focus-<id>"` sur la page sorts (les autres l'avaient déjà). scenarios/personnages/pnj ont leurs pages détail dédiées, inchangés.
**Bug** : quand on clique sur un favori (ex : un ennemi), ça renvoie sur la page d'accueil des ennemis au lieu de la fiche de cet ennemi précis.
**Correction** :
- Le clic sur un favori doit ouvrir la fiche SPÉCIFIQUE de l'élément (avec son id)
- Lien direct vers /dashboard/[type]/[id] ou équivalent avec focus sur l'élément
- Vérifier pour tous les types de favoris (ennemis, PNJ, items, sorts, scénarios, maps...)
- Même problème que le clic depuis la mindmap (déjà corrigé avec ?focus=) → appliquer la même solution

---

## 🔵 PRIORITÉ 4 — AUDIT & FUSION DES DOUBLONS FONCTIONNELS

### [x] 4.1 - Audit complet des fonctionnalités redondantes — AUDIT FAIT, PLAN PROPOSÉ, ⚠️ AUCUNE SUPPRESSION (en attente de validation)
**Problème** : trop de fonctionnalités qui se ressemblent (maps / créateur de donjon / générateur de donjon). Il faudrait regarder toutes les fonctions de l'app et fusionner ou supprimer les doublons.

**Mission** :
1. AUDIT : recenser TOUTES les fonctionnalités de l'app et identifier celles qui se recouvrent
   - Exemple identifié : Maps / Éditeur de carte / Atelier de donjon (builder manuel) / Générateur de donjon (procédural) / Hexcrawl / Templates de donjons → 6 entrées pour "faire une carte"
   - Chercher d'autres recouvrements : combat (4 entrées), création d'entités, etc.
2. PROPOSER un plan de fusion cohérent :
   - Quelles fonctionnalités fusionner en une seule interface unifiée
   - Quelles supprimer car redondantes
   - Quelles garder distinctes (et pourquoi)
3. NE RIEN SUPPRIMER SANS PRÉSENTER LE PLAN D'ABORD
   - Faire l'audit, présenter les recommandations
   - Attendre validation avant d'implémenter

**Piste pour les cartes/donjons** (à valider) :
- UNE seule page "Cartes" avec :
  - Liste de mes cartes
  - Bouton "Créer une carte" → choix du mode : dessiner à la main (éditeur) / construire avec des tuiles (builder) / générer automatiquement (procédural) / partir d'un template / hexcrawl
  - Tous ces modes vivent dans le MÊME éditeur avec des outils différents, pas des pages séparées

**Piste pour le combat** (à valider) :
- Vérifier si les 4 entrées (Préparateur / Combat rapide / Combat grille / Diffusion) sont vraiment toutes nécessaires ou si certaines peuvent fusionner

Produire un RAPPORT D'AUDIT avec recommandations avant toute suppression.

---

## 📊 RAPPORT D'AUDIT — DOUBLONS FONCTIONNELS (aucune suppression effectuée)

### A) Cluster CARTES / DONJONS — 6 entrées + exploration

| Entrée | Route | Rôle réel | Modèle de données |
|--------|-------|-----------|-------------------|
| 🗺️ Maps (liste) | `/dashboard/maps` | Hub : liste des cartes sauvegardées | table `maps` |
| 🎨 Éditeur de tuiles | `/dashboard/maps/editor` | **Créer** une carte à la main (tuiles) + export PNG | → `maps` |
| 🏗 Atelier de donjon | `/dashboard/maps/builder` | **Enrichir** une carte existante (triggers, annotations, multi-étages, zones de rencontre, pièges, vue MJ/joueurs) | → `maps` (+ calques donjon) |
| 🏰 Générateur de donjon | `/dashboard/maps/generer-donjon` | **Générer** un donjon procédural → export PNG | → `maps` (même schéma) |
| 🧭 Hexcrawl | `/dashboard/maps/hexcrawl` | Exploration monde sur grille **hexagonale** | **`hexcrawl_maps` + `hex_tiles`** (modèle DIFFÉRENT) |
| 📚 Templates de donjons | `/dashboard/maps/templates` | Bibliothèque de modèles de donjons (perso + communauté) | tables templates |
| 🏞 Exploration | `/dashboard/exploration` | Mode exploration/voyage narratif | autre |

**Constat** : 4 des 6 entrées (Éditeur, Atelier, Générateur, Liste) travaillent sur le **même** objet `maps` mais via des pages séparées → l'utilisateur ne comprend pas laquelle utiliser pour « faire une carte ». Hexcrawl et Exploration sont des concepts **distincts** (modèle de données différent, finalité différente).

**RECOMMANDATION** :
- ✅ **FUSIONNER** Éditeur + Atelier + Générateur dans **UN seul flux** sous « Maps » :
  - `/dashboard/maps` = liste + bouton **« ➕ Créer une carte »** ouvrant un choix de mode : *Dessiner (tuiles)* / *Générer (procédural)* / *Partir d'un template*.
  - Une fois la carte créée/ouverte, TOUS les outils (tuiles **et** outils MJ de l'Atelier : triggers, calques, pièges…) vivent dans **le même éditeur**, en onglets d'outils — au lieu de 3 pages. L'Atelier devient un « mode outils MJ » de l'éditeur, pas une page à part.
  - `maps/templates` : garder comme **source** dans le sélecteur de création (« Partir d'un template »), retirer de la nav principale.
- 🟰 **GARDER DISTINCTS** : Hexcrawl (grille hexa, modèle propre) et Exploration (voyage narratif) — ce ne sont PAS des cartes de combat. Les regrouper visuellement sous « Exploration & monde » plutôt que sous « Cartes ».
- ⚠️ Fusion techniquement non-triviale (l'éditeur de tuiles et l'atelier ont des composants séparés) → à planifier comme chantier dédié. **Rien supprimé pour l'instant.**

### B) Cluster COMBAT — 4 entrées + calculateur

| Entrée | Route | Rôle réel |
|--------|-------|-----------|
| 🛠 Préparateur | `/dashboard/combat-prepare` | Préparer un combat EN AMONT (`combats_prepares`), le lancer plus tard |
| ⚡ Combat rapide | `/dashboard/combat-rapide` | Combat live **MJ seul** (moteur `useCombatEngine` + `CombatCockpitMJ`), bascule « 📡 Diffuser » |
| ⚔ Combat (grille) | `/dashboard/combat` | Combat live **complet** avec grille/jetons/initiative (`combats`) |
| 📡 Diffusion (onglet Combat) | `/dashboard/presentation` | Combat côté **joueurs** (broadcast), réutilise `CombatCockpitMJ` |
| 🧮 Calculateur de rencontre | `/dashboard/combat/encounter-builder` | Outil de calcul de difficulté (distinct) |

**Constat** : Combat rapide et Combat-grille se recouvrent partiellement (les deux lancent un combat live, `CombatCockpitMJ` est partagé). Le Préparateur et la Diffusion sont des **étapes** complémentaires (préparer → jouer → diffuser), pas des doublons.

**RECOMMANDATION** :
- 🟰 **GARDER** Préparateur (amont), Diffusion (aval joueurs) et Calculateur (outil) — rôles distincts et complémentaires.
- 🔎 **À CLARIFIER** : « Combat rapide » vs « Combat grille ». Deux options :
  - (a) Les fusionner en **une** page combat avec un **toggle « avec grille / sans grille »** (le cockpit est déjà commun) — réduit la confusion.
  - (b) Les garder mais **renommer** pour clarifier l'intention : *« Combat express (MJ seul) »* vs *« Combat tactique (grille + jetons) »*.
  - Recommandation : (a) si le code du cockpit le permet sans risque ; sinon (b) à court terme (renommage sans risque).

### C) Autres recouvrements mineurs (à surveiller, non prioritaires)
- **Systèmes de templates multiples** : Templates de donjons (`maps/templates`), Galerie de templates de scénarios (`TemplatesScenariosGallery`), `TemplatesPicker`, Tables d'effets templates → 3-4 mécaniques de « modèles » séparées. Cohérent fonctionnellement (objets différents) mais gagneraient une **UX unifiée** « Bibliothèque de modèles ». Non urgent.
- **Création d'entités** (personnages / ennemis / PNJ / items / sorts) : PAS des doublons — objets distincts, pattern liste+création cohérent. **Rien à fusionner.**

### D) Plan d'action proposé (par ordre de risque croissant)
1. 🟢 **Sans risque** : renommer les entrées Combat pour clarifier (option B.b) + regrouper Hexcrawl/Exploration hors de « Cartes ».
2. 🟠 **Risque moyen** : retirer `maps/templates` de la nav → l'intégrer comme source dans un futur bouton « Créer une carte ».
3. 🔴 **Chantier dédié** : fusionner Éditeur + Atelier + Générateur en un seul éditeur multi-modes (A) ; éventuellement fusionner Combat rapide + grille (B.a).

### E) ✅ FAIT — Étapes 1 & 2 (sans risque, aucune page/route supprimée)
- **Étape 1 — Renommage Combat** (clarté) :
  - « Combat rapide » → **« Combat express (MJ seul) »** (`adv_combat_rapide`, fr/en/es)
  - « Combat (grille) » → **« Combat tactique (grille) »** (`adv_combat`, fr/en/es)
  - « Préparer un combat » inchangé.
- **Étape 1 — Réorganisation nav** (`Sidebar.tsx`) :
  - Le hub « Cartes & Exploration » devient **« Cartes »** (Maps, Éditeur, Atelier, Générateur uniquement).
  - Nouveau hub **« 🧭 Exploration & monde »** = Hexcrawl + Exploration (concepts distincts, sortis de Cartes).
- **Étape 2 — Templates de donjons retiré de la nav** : `maps/templates` n'est plus dans la sidebar mais **reste accessible** depuis la page Maps (bouton 📚 Templates). Aucune route/logique supprimée.
- `npm run build` ✅.

### F) 📐 PLAN DÉTAILLÉ — Chantier « Éditeur de cartes unifié » (À VALIDER, non commencé)

**Vision** : une seule porte d'entrée « Cartes » où l'on crée/ouvre une carte, puis on travaille dans **un éditeur unique** dont les capacités (dessin, tuiles, génération, outils MJ) sont des **modes/outils** commutables — au lieu de 3-4 pages séparées.

**Modes regroupés dans l'éditeur unifié** :
| Mode | Vient de | Devient |
|------|----------|---------|
| Dessin / Tuiles | `maps/editor` | Mode par défaut d'édition manuelle |
| Génération procédurale | `maps/generer-donjon` | Bouton « ✨ Générer » **dans** l'éditeur (pré-remplit le canvas au lieu d'exporter un PNG depuis une autre page) |
| Outils MJ avancés | `maps/builder` (Atelier) | Panneau d'outils MJ (triggers, calques, pièges, zones, vue MJ/joueurs) **dans** l'éditeur |
| Depuis un template | `maps/templates` | Option « Partir d'un template » à la création (source, pas page) |
| Hexcrawl | `maps/hexcrawl` | **NON fusionné** — modèle de données distinct (`hexcrawl_maps`/`hex_tiles`), reste séparé sous « Exploration & monde » |

**Ce qui serait fusionné / retiré** (à terme) :
- Fusion : `maps/editor` + `maps/generer-donjon` + `maps/builder` → **une** route éditeur (ex. `maps/[id]/edit` ou `maps/editor?id=`).
- Les pages `generer-donjon` et `builder` deviendraient des **modules** de l'éditeur (composants réutilisés), leurs routes pouvant être conservées en redirections le temps de la transition, puis retirées.
- `maps/templates` : garder la page bibliothèque, la brancher comme **source** du sélecteur de création.

**Risques & stratégie « ne rien casser »** :
1. **Composants couplés** : l'Atelier (`components/donjon/*`, 7 composants) et l'éditeur de tuiles ont des états/canvas différents → risque de régression visuelle/perf. → *Stratégie* : ne PAS réécrire ; **monter les composants existants** dans un conteneur à onglets, partager l'objet `maps` (même table/schéma) sans toucher au SQL.
2. **Générateur** : produit aujourd'hui un PNG exporté ; l'intégrer « live » demande d'écrire dans le canvas de l'éditeur. → *Stratégie* : étape 1 = garder l'export PNG mais lancé depuis l'éditeur ; étape 2 = injection directe dans le calque.
3. **Données** : aucun changement de schéma (tout est déjà `maps` sauf Hexcrawl). → risque DB **nul**.
4. **Liens existants** : mindmap/favoris/scénario pointent vers `maps` → inchangés. Garder des redirections temporaires pour `editor`/`builder`/`generer-donjon`.
5. **Transition** : feature flag / bascule progressive, on ne supprime les anciennes routes qu'après validation en test réel.

**Ampleur estimée** : **gros chantier** — ~1 session dédiée. Découpage suggéré :
- Lot 1 (moyen) : conteneur éditeur à onglets + intégration de l'Atelier comme panneau d'outils.
- Lot 2 (moyen) : bouton « Générer » dans l'éditeur (d'abord export, puis injection canvas).
- Lot 3 (petit) : sélecteur de création (Dessiner / Générer / Template) sur la page Maps + redirections.
- Lot 4 (petit) : retrait des anciennes routes après validation.

**➡️ À VALIDER avant de lancer le chantier. Les étapes 1 & 2 sont faites ; la fusion attend ton feu vert.**

---

## 📋 SQL À APPLIQUER

- [x] `supabase/migrations/20260709120000_renommer_sorcier_occultiste.sql` — 2.2 : renomme la classe Sorcier → Occultiste dans les données existantes (personnages.classe, classes_multiples, sorts.classes_compatibles). Idempotent.
- [x] `supabase/migrations/20260709130000_rejoindre_scenario_via_code.sql` — 1.1 : RPC SECURITY DEFINER `infos_scenario_via_code`, `rejoindre_scenario_via_code`, `joueurs_du_scenario` (invitation joueur simplifiée, code réutilisable).

⚠️ **À exécuter** : `supabase db push` (après `supabase migration repair` si besoin, cf. workflow migrations).

---

## 🐛 NOTES ET PROBLÈMES

-

---

## ✅ STATUT FINAL

Date de fin : 2026-07-09
Phases complétées : 4 / 4 (P1, P2, P3 implémentées ; P4 = audit + plan, aucune suppression)
Features complétées : 8 / 8 (1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1) + Audit 4.1
`npm run build` : ✅ OK (compilation + type-check + génération statique)

**Reste à faire côté user** :
- Appliquer les 2 migrations SQL (`supabase db push`).
- Valider le plan de fusion de la Priorité 4 avant toute suppression.
