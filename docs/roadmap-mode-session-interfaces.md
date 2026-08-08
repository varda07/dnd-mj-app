# ROADMAP — MODE SESSION : INTERFACES PJ ET MJ

> **Ce document remplace les Phases 3 et 4 de `roadmap-mode-session.md`.** Les Phases 0, 1, 2, 5 et 6 de ce document restent valables telles quelles.

> **Instructions d'exécution (Claude Code)**
> - Exécution **autonome, sans interruption ni question**.
> - Coche `[x]` chaque tâche terminée, `[!]` chaque tâche bloquée ou divergente, avec une note d'une ligne.
> - **Lis d'abord `docs/audit-mode-session.md`** (produit en Phase 0). Si une donnée nécessaire à cette roadmap n'existe pas encore dans le modèle, crée-la via une migration dans `supabase/migrations/` et applique avec `supabase db push`.
> - `npm run build` après chaque phase, corriger avant de continuer.
> - Interface **en français**. Esthétique **épurée**. Sidebar de l'app **à droite**.
> - **Ne réécris pas** les composants existants : lanceur de dés, bouton MS et sa roue d'action, timeline d'initiative horizontale, `combat-engine.ts`, cockpit combat MJ, sélecteur de setup. Tu les **branches** sur le mode session.

---

## Décisions de conception validées

Ces choix ont été arrêtés avec le porteur du projet à partir de maquettes. Ne pas les réinterpréter.

| Sujet | Décision |
|---|---|
| Interface PJ | **Un seul composant responsive**, mobile-first, qui se déploie en trois colonnes sur PC. Pas deux interfaces séparées. |
| Navigation PJ | **Roue en demi-sphère en bas d'écran** : centre = personnage, 5 pétales autour. |
| Centre de la roue | **Demi-sphère du personnage** : portrait (si disponible), nom, **arc de PV** en périphérie. Appui → panneau points de vie. |
| Les 5 pétales | Compétences · Sorts · Notes · Actions · Sac |
| PV | Affichés **uniquement** par l'arc autour de la demi-sphère. Pas de second affichage en haut d'écran. |
| Lanceur de dés | **Le composant existant de l'app**, ouvert par un bouton rond dédié. Ne pas en créer un nouveau. |
| Points d'usage | Petits ronds : **coloré = disponible**, **grisé = utilisé**. Se consomment **de droite à gauche**. Cliquables dans les deux sens. |
| Repos | **Gérés par le MJ uniquement.** Deux boutons : repos court, repos long. Réinitialise toute la table d'un coup. |
| Écrans MJ | **Un seul écran** pour l'instant. Le cockpit doit tenir intégralement sur l'écran du MJ. |
| Bouton MS | Conservé **tel qu'il est déjà dans l'app** : replié sur le logo, pétales déployées au clic. Ne pas modifier son comportement. |

---

## PHASE 3 — INTERFACE PJ

Route : `/session/[id]/joueur`

### 3.1 Structure responsive
- [ ] **Un seul composant**, décliné par breakpoints Tailwind. Interdiction de créer deux arborescences de composants distinctes pour mobile et desktop.
- [ ] **Mobile (< 768px)**, de haut en bas :
  1. Bandeau supérieur : raccourci « Fiche » à gauche + ordre des tours à droite
  2. Zone de contenu (panneau actif ou diffusion du MJ)
  3. Roue du personnage en bas, collée au bord inférieur (zone du pouce)
  4. Bouton lanceur de dés en rond, à droite au-dessus de la roue
- [ ] **Desktop (≥ 768px)**, trois colonnes :
  - **Gauche (~300px)** : titre du menu actif, contenu du menu, **roue en bas de colonne**
  - **Centre (flexible)** : diffusion du MJ en grand (image + narration), bandeau « C'est ton tour » en bas quand c'est le cas
  - **Droite (~200px)** : ordre des tours en vertical avec scores d'initiative, journal de table en direct, bouton lanceur de dés en bas
- [ ] Sur PC, les pétales affichent **icône + label court** (l'intitulé complet ne rentre pas dans l'arc). Sur mobile, label texte seul.

### 3.2 La roue du personnage
- [ ] Demi-disque centré en bas, cinq secteurs autour d'un demi-disque central.
- [ ] **Centre** : portrait du personnage s'il existe, sinon icône générique ; nom du personnage en dessous ; **arc de PV** sur le pourtour extérieur.
- [ ] L'arc de PV se vide proportionnellement aux PV restants. Couleur : vert au-dessus de 2/3, ambre entre 1/3 et 2/3, rouge en dessous, gris à 0 PV.
- [ ] PV courants et CA affichés en petit de part et d'autre du nom.
- [ ] Appui sur le centre → panneau **Points de vie** (voir 3.4).
- [ ] Appui sur un pétale → ouvre le menu correspondant dans la zone de contenu.
- [ ] Le pétale actif est visuellement distingué.

### 3.3 Menus dépliables — comportement commun
- [ ] Chaque menu est une **liste de lignes**. Une ligne = nom à gauche, valeur/mention à droite.
- [ ] **Appui sur une ligne → la ligne se déplie** et affiche : description courte de l'élément, puis un bouton **« Lancer [formule] »** si l'élément se jette.
- [ ] Une seule ligne dépliée à la fois (accordéon).
- [ ] Le bouton « Lancer » passe par le **lanceur de dés existant** de l'app, et le résultat est écrit dans `session_events` → visible du MJ et de la table.

### 3.4 Points d'usage — règle stricte
> **Correction règles D&D 5e à respecter** : les compétences n'ont **pas** d'usages limités. Ne jamais afficher de ronds sur une compétence ni sur une attaque d'arme classique — cela ferait croire au joueur qu'il a un nombre de jets limité.

- [ ] Les ronds d'usage s'affichent **uniquement** sur :
  - les **emplacements de sorts** (une rangée de ronds par niveau, en tête du menu Sorts)
  - les **capacités à usage limité** (X/repos court, X/repos long, X/jour)
  - les **objets consommables** de l'inventaire (potions, munitions, rations)
- [ ] Rond coloré = disponible. Rond grisé = utilisé. **Consommation de droite à gauche.**
- [ ] Clic sur un rond disponible → le consomme. Clic sur un rond grisé → le restitue (correction d'erreur).
- [ ] Chaque changement est écrit dans `character_live_state` et journalisé dans `session_events`.

### 3.5 Contenu des cinq menus
- [ ] **Compétences** : les 18 compétences avec modificateur, maîtrise et expertise indiquées. Dépli = caractéristique associée + description courte. Bouton de jet. **Pas de ronds.**
- [ ] **Sorts** : rangées de ronds d'emplacements par niveau en tête. Liste des sorts préparés groupés par niveau. Dépli = temps d'incantation, portée, composantes, durée, description, concentration éventuelle. Bouton de jet.
- [ ] **Notes** : notes personnelles du joueur (éditables), objectif en cours, accès au journal de séance en direct.
- [ ] **Actions** : attaques avec bonus et dégâts, capacités de classe utilisables en combat, action « Fin de mon tour » quand c'est le tour du joueur. Ronds sur les capacités limitées uniquement.
- [ ] **Sac** : inventaire, équipement, monnaie. Ronds sur les consommables. Quantités éditables par le joueur.

### 3.6 Panneau Points de vie
- [ ] Ouvert par appui sur la demi-sphère centrale.
- [ ] **Total en grand** : PV actuels / PV max.
- [ ] Boutons rapides `−5 / −1 / +1 / +5` et saisie libre.
- [ ] PV temporaires gérés séparément.
- [ ] États actifs (conditions), concentration en cours.
- [ ] Jets de sauvegarde contre la mort si PV = 0 (succès / échecs).
- [ ] **Pas de bouton repos ici** — les repos sont déclenchés par le MJ.

### 3.7 Bandeau supérieur
- [ ] **Ordre des tours affiché uniquement pendant un combat.** Hors combat, le bandeau affiche le lieu ou le chapitre en cours.
- [ ] Le tour actif est mis en évidence ; le tour du joueur déclenche un signal visuel net (et une vibration sur mobile si l'API est disponible).
- [ ] Raccourci « Fiche » : accès à la fiche complète du personnage (caractéristiques, historique, traits) — consultation hors action de jeu.

### 3.8 Zone de diffusion
- [ ] Affiche en temps réel ce que le MJ pousse : image, texte de narration, ambiance sonore.
- [ ] Image agrandissable en plein écran au clic.
- [ ] **Quand le MJ ne diffuse rien, cette zone n'est jamais vide** : elle affiche le journal de table en direct (jets de dés de tous les joueurs, changements de PV, événements).
- [ ] En combat sur mobile, cette zone bascule sur la vue combat : timeline d'initiative, états **qualitatifs** des autres (En pleine forme / Blessé / Mal en point / Mourant). **Jamais les PV exacts des ennemis.**

### 3.9 Temps réel
- [ ] Mise à jour **optimiste** côté client, puis confirmation serveur.
- [ ] Toute modification faite par le MJ apparaît immédiatement chez le joueur, et inversement.
- [ ] Conflit : **dernier écrit gagne**, avec journalisation de l'auteur dans `session_events`.
- [ ] Indicateur discret de l'état de connexion.
- [ ] `npm run build`

---

## PHASE 4 — COCKPIT MJ (ÉCRAN UNIQUE)

Route : `/session/[id]/mj`
**Contrainte** : tout doit tenir sur un seul écran, sans défilement de la structure générale.

### 4.1 Barre de session (en haut)
- [ ] Titre de la séance + durée écoulée.
- [ ] Boutons **« Repos court »** et **« Repos long »** — voir 4.5.
- [ ] Boutons Pause / Reprendre / Terminer la session (confirmation sur Terminer).

### 4.2 Colonne gauche — Ma préparation (~200px)
- [ ] Liste compacte et cliquable : chapitre en cours, Lieux, PNJ, Rencontres, Combat en cours, Notes.
- [ ] Compteurs à droite de chaque entrée (nombre de PNJ, de rencontres…).
- [ ] L'entrée active est mise en évidence.
- [ ] Recherche rapide dans la préparation.
- [ ] Un clic sur une **rencontre préparée** → lance le combat via `combat-engine.ts` (point d'entrée « préparé »).

### 4.3 Colonne centrale — Zone de travail
- [ ] Son contenu **change selon l'entrée sélectionnée à gauche**. C'est la conséquence assumée de l'écran unique.
- [ ] Vue **Chapitre** : aperçu de ce qui est actuellement diffusé aux joueurs (image + narration).
- [ ] Vue **Combat** : timeline d'initiative horizontale (composant existant) + fiche de la créature sélectionnée avec **PV exacts, CA, attaques, résistances, immunités, comportement**.
- [ ] Vues **Lieux / PNJ / Rencontres / Notes** : contenu préparé, consultable en un clic.

### 4.4 Colonne droite — Ma table (~200px)
- [ ] **Toujours visible, jamais masquée.** C'est la seule information que le MJ ne doit jamais perdre de vue.
- [ ] Une carte par PJ : pastille de connexion, nom, CA, **barre de PV avec valeurs exactes**, ressources en cours, état/concentration.
- [ ] Boutons `−5 / +5` et saisie libre pour ajuster les PV de n'importe quel PJ → répercussion **immédiate** sur son écran.
- [ ] Couleur de la barre : vert / ambre / rouge / gris selon l'état, alerte visuelle nette à 0 PV.

### 4.5 Repos gérés par le MJ
- [ ] **Repos court** : réinitialise les ressources marquées `1/repos court` de **tous les PJ** ; ne touche ni aux emplacements de sorts (hors classes concernées type magicien/occultiste selon les règles) ni aux capacités `1/repos long`.
- [ ] **Repos long** : réinitialise **toutes** les ressources, tous les emplacements de sorts, et remet les PV au maximum pour tous les PJ.
- [ ] Confirmation avant application. Écriture d'un `session_event` par personnage affecté.
- [ ] Les joueurs voient leurs ronds se recolorer en direct.

### 4.6 Roue d'action MJ
- [ ] Réutiliser le **bouton MS existant et sa roue**, sans modifier son comportement : replié sur le logo, pétales déployées au clic, déplaçable, position mémorisée en localStorage.
- [ ] Six pétales existantes : Dés · Magie sauvage · Rencontre · Narration · Sons · Image.
- [ ] Les pétales **Image**, **Narration** et **Sons** écrivent dans `session_state` → apparition immédiate chez tous les joueurs.
- [ ] MJ uniquement. Jamais visible côté joueur.

### 4.7 Ergonomie et pièges
- [ ] Respecter le **sélecteur de setup existant**. En PC+TV, prévoir une vue « écran partagé » épurée destinée à la télévision, distincte du cockpit.
- [ ] ⚠️ **Piège CSS déjà rencontré sur ce projet** : ne jamais poser `will-change: transform` sur un conteneur parent d'une modale — cela crée un bloc conteneur et casse l'ancrage `position: fixed` au viewport. Ne pas réintroduire ce bug.
- [ ] Aucune information non utile pendant le jeu. En cas de doute, retirer.
- [ ] `npm run build`

---

## Vérification de ces deux phases

- [ ] Le MJ inflige des dégâts depuis sa colonne droite → l'arc de PV du joueur se vide en direct sur son téléphone.
- [ ] Le joueur consomme un emplacement de sort → le MJ le voit dans la colonne « Ma table ».
- [ ] Le joueur lance un dé depuis une ligne dépliée → le résultat apparaît dans le journal de table du MJ et des autres joueurs.
- [ ] Le MJ déclenche un repos long → les PV et tous les ronds de tous les joueurs se réinitialisent.
- [ ] Le MJ diffuse une image → elle apparaît dans la zone centrale de tous les joueurs.
- [ ] Le MJ lance un combat → la timeline apparaît chez tout le monde, les joueurs voient les états qualitatifs et jamais les PV exacts des ennemis.
- [ ] L'interface PJ est testée **sur téléphone et sur PC** : même composant, deux dispositions.
- [ ] Rapport final dans `docs/rapport-interfaces-session.md`.
