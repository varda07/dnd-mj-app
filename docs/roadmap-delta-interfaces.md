# ROADMAP DELTA — ALIGNEMENT DES INTERFACES DU MODE SESSION

> **Ce document ne remplace rien. Il liste uniquement les écarts** entre le code actuellement livré et les interfaces validées en maquette avec le porteur du projet.
>
> **Ne pas réécrire ce qui fonctionne.** La couche technique livrée (hooks, temps réel, `session-realtime.ts`, RPC, tables, synchronisation) est **correcte et validée**. Elle est indépendante de l'apparence des écrans et doit être conservée intégralement. Seule la couche de présentation change.

> **Instructions d'exécution (Claude Code)**
> - Exécution **autonome, sans interruption**.
> - Coche `[x]` chaque tâche terminée, `[!]` chaque tâche bloquée, avec une note d'une ligne.
> - `npm run build` après chaque section.
> - Interface **en français**, esthétique **épurée**.
> - **Toute ouverture de canal Realtime passe par `app/lib/session-realtime.ts`.** Ne jamais appeler `supabase.channel()` directement dans le mode session.
> - Ne pas toucher au mode présentation existant : son remplacement est la Phase 5, traitée séparément.

---

## Contexte de cet écart

Les Phases 3 et 4 ont été exécutées depuis `roadmap-mode-session.md` alors que `roadmap-mode-session-interfaces.md` devait s'y substituer. Le résultat est fonctionnel mais ne correspond pas aux interfaces validées. Les deux fichiers de roadmap se trouvent dans `app/` — **les déplacer dans `docs/`**, ils n'ont rien à faire dans le dossier applicatif.

- [x] Les trois fichiers de roadmap du mode session sont désormais dans `docs/` (`roadmap-mode-session.md`, `roadmap-mode-session-interfaces.md`, `roadmap-delta-interfaces.md`).

---

## SECTION A — INTERFACE PJ : REMPLACER LE DOCK PAR LA ROUE

État actuel : `SessionJoueur.tsx` implémente un dock de 5 onglets `fiche | actions | scene | des | sac` avec un en-tête PV permanent.
État cible : roue en demi-sphère en bas d'écran.

### A.1 La roue du personnage
- [x] Créer `app/components/session/joueur/RoueJoueur.tsx` : SVG d'un demi-disque en bas d'écran.
- [x] **Centre** : demi-disque contenant le portrait du personnage (icône générique si absent) et son nom.
- [x] **Arc de PV** sur le pourtour extérieur du demi-disque, se vidant proportionnellement aux PV restants. Couleur : vert au-dessus de 2/3, ambre entre 1/3 et 2/3, rouge en dessous, gris à 0 PV.
- [x] PV courants et CA en petit de part et d'autre du nom.
- [x] **5 pétales** autour du centre, de gauche à droite : **Compétences · Sorts · Notes · Actions · Sac**.
- [x] Sur mobile : label texte dans chaque pétale. Sur PC : icône + label court (bascule par `lg:` dans le même SVG, pas de second composant).
- [x] Le pétale actif est visuellement distingué.
- [x] Appui sur le centre → panneau **Points de vie** (`PanneauPointsDeVie.tsx`).
- [x] **Supprimer le dock d'onglets** et l'en-tête PV permanent : les PV ne sont plus affichés qu'une seule fois, par l'arc.

### A.2 Réutiliser les onglets existants comme contenu des pétales
- [x] Les composants `OngletFiche / Actions / Scene / Des / Sac` contiennent déjà la logique et les données. **Ne pas les réécrire** : rebranchés comme contenu affiché par les pétales.
- [x] Correspondance : Compétences ← `OngletFiche`, Sorts ← extrait de `OngletActions` vers `OngletSorts`, Actions reste `OngletActions`, Sac reste `OngletSac`, Scene devient `ZoneDiffusion` (A.5), Notes est un nouveau contenu.
- [x] Nouveau contenu **Notes** : notes personnelles éditables, objectif en cours, accès au journal de séance en direct. Les notes sont persistées en base (table `personnage_notes`, RLS auteur seul, Realtime), avec enregistrement différé ~1 s et reprise automatique des anciennes notes localStorage — migration `20260808120000_personnage_notes.sql` poussée.

### A.3 Menus dépliables
- [x] Chaque menu est une liste de lignes : nom à gauche, valeur à droite (`LigneDepliable.tsx`).
- [x] **Appui sur une ligne → dépli** affichant la description courte, puis un bouton **« Lancer [formule] »** si l'élément se jette.
- [x] Accordéon : une seule ligne dépliée à la fois.

### A.4 Points d'usage
> **Règle D&D 5e à respecter strictement** : les compétences et les attaques d'arme classiques n'ont **pas** d'usages limités. Ne jamais y afficher de ronds.

- [x] Ronds d'usage **uniquement** sur : emplacements de sorts (une rangée par niveau, en tête du menu Sorts), capacités à usage limité (X/repos court, X/repos long, X/jour), objets consommables de l'inventaire.
- [x] Rond coloré = disponible, rond grisé = utilisé. **Consommation de droite à gauche** (`app/components/ui/PastillesUsage.tsx`).
- [x] Clic sur un rond disponible → le consomme. Clic sur un rond grisé → le restitue.
- [x] Chaque changement écrit dans `character_live_state` et journalisé dans `session_events`.

### A.5 Zone de diffusion
- [x] Affiche en temps réel ce que le MJ pousse : image, narration, ambiance sonore.
- [x] Image agrandissable en plein écran au clic (portail vers `document.body`).
- [x] **Quand le MJ ne diffuse rien, cette zone n'est jamais vide** : elle affiche le journal de table en direct.
- [x] En combat sur mobile, elle bascule sur la vue combat : timeline d'initiative, états **qualitatifs** des autres. **Jamais les PV exacts des ennemis.**

### A.6 Disposition PC
- [x] **Trois colonnes**, même composant, uniquement via les breakpoints Tailwind.
  - **Gauche (~300px)** : titre du menu actif, contenu du menu, **roue en bas de colonne**
  - **Centre (flexible)** : diffusion du MJ en grand, bandeau « C'est ton tour » en bas quand c'est le cas
  - **Droite (~200px)** : ordre des tours vertical avec scores d'initiative, journal de table, bouton lanceur de dés en bas
- [x] Aucune seconde arborescence de composants pour le desktop.
- [x] `npm run build` — vert.

---

## SECTION B — LANCEUR DE DÉS

- [x] Composant identifié : `app/components/DiceLauncher.tsx` (dés 3D, sons, critiques, historique), monté jusqu'ici uniquement par `app/dashboard/layout.tsx`.
- [x] **Réutilisé tel quel** en session via `LanceurDesSession.tsx`, ouvert par un bouton rond dédié : mobile à droite au-dessus de la roue, PC en bas de la colonne droite.
- [x] Lanceur spécifique au mode session supprimé (`OngletDes.tsx`).
- [x] Les résultats sont écrits dans `session_events` (nouveau contexte `session` du DiceLauncher) → visibles du MJ et de la table.
- [x] Modale non piégée derrière la roue : portail vers `document.body` + `z-index` 200 (la roue est en 90, les modales de diffusion en 150).

---

## SECTION C — COCKPIT MJ

### C.1 Pétales de la roue d'action sans effet
- [x] Cause identifiée : `onWheel` de `PanneauOutils` ne faisait que changer de sous-onglet (`setSous('diffusion')`), sans action réelle ; la clé `magie` n'était pas traitée du tout ; et la roue n'était montée que dans l'onglet « Outils live », donc invisible/inerte depuis les autres panneaux.
- [x] Les six pétales sont câblés depuis `SessionMJ.tsx` (la roue est montée au niveau du cockpit, donc disponible dans toutes les vues) :
  - **Image** → modale puis `session_state.broadcast_image_url`
  - **Narration** → saisie puis `session_state.broadcast_text`
  - **Sons** → `session_state.ambient_sound`
  - **Dés** → ouvre `DiceLauncher`, résultat dans `session_events`
  - **Rencontre** → combat lancé via `combat-engine.ts` (`lancer()`) et bascule sur la vue Combat
  - **Magie sauvage** → `WildMagicRoller`, comportement identique au reste de l'app
- [x] Les trois premiers apparaissent immédiatement chez les joueurs (abonnement `session_state` déjà en place dans `useSessionJoueur`).
- [x] Comportement du bouton MS inchangé : replié sur le logo, pétales au clic, déplaçable, position mémorisée.

### C.2 Repos court et repos long
- [x] Deux boutons dans la barre de session du MJ : **Repos court** et **Repos long**.
- [x] **Repos court** (`app/lib/session-repos.ts`) : réinitialise les ressources marquées `recharge: 'court'` de tous les PJ, ne touche pas aux `repos long` / `jour`, et rend ses emplacements à l'occultiste (règle du pacte). Le magicien garde sa Restauration arcanique comme choix manuel.
- [x] **Repos long** : toutes les ressources, tous les emplacements de sorts, PV au maximum (PV temporaires et jets de mort remis à zéro).
- [x] Confirmation avant application. Un `session_event` écrit par personnage affecté.
- [x] Les joueurs voient leurs ronds se recolorer en direct (Realtime `character_live_state` déjà en place).

### C.3 Disposition trois colonnes sur un écran
- [x] **Gauche (~200px)** — Ma préparation : liste compacte cliquable (chapitre en cours, Lieux, PNJ, Rencontres, Combat en cours, Notes) avec compteurs et recherche rapide. Un clic sur une rencontre préparée lance le combat via `combat-engine.ts`.
- [x] **Centre (flexible)** — Zone de travail dont le contenu change selon l'entrée sélectionnée à gauche + bandeau journal de séance repliable. Vue Chapitre : aperçu de ce qui est diffusé. Vue Combat : `CombatCockpitMJ` (timeline d'initiative + fiche de créature avec PV exacts, CA, attaques, résistances, immunités, comportement).
- [x] **Droite (~200px)** — Ma table : toujours visible. Une carte par PJ avec pastille de connexion, nom, CA, barre de PV avec valeurs exactes, ressources (ronds cliquables), concentration. Boutons `−5 / +5` et saisie libre. Alerte nette à 0 PV.
- [x] Tout tient sur un seul écran (`h-[100dvh]` + `overflow-hidden`, défilement interne aux colonnes seulement).
- [!] « Lieux » est alimenté par les cartes liées au scénario (`scenario_liens`, type `map`) : il n'existe pas de table `lieux` dans ce projet.

---

## SECTION D — BUGS À CORRIGER

- [x] **« Fin de mon tour »** : le joueur émet une demande (`session_events`), le cockpit MJ la relaie vers `combat-engine.ts` (`app/lib/session-tour.ts`) et le changement est diffusé à toute la table par le Realtime `combats`. La RLS interdit au joueur d'écrire lui-même dans `combats` — le relais MJ est le seul circuit possible sans nouvelle RPC.
- [x] **Les dés du MJ hors combat** : le résultat est écrit dans `session_events` et apparaît dans le journal de table.
- [x] **Lecteur audio côté PJ** (`LecteurAmbiance.tsx`) : lecture de `session_state.ambient_sound`, volume local mémorisé, bouton « Activer l'ambiance » quand le navigateur refuse la lecture automatique.
- [x] **Piège CSS** : aucune propriété `will-change` / `transform` / `filter` / `backdrop-filter` / `contain` sur un conteneur parent de modale dans le mode session ; toutes les surfaces modales (visionneuse plein écran, diffusion, magie sauvage, lanceur de dés) passent par un portail React vers `document.body`.
- [x] Les erreurs ESLint `react/no-unescaped-entities` des pages session sont éliminées (`app/session/**`, `app/components/session/**`).

---

## VÉRIFICATION

- [x] La roue s'affiche en bas de l'écran joueur, l'arc de PV se vide quand le MJ inflige des dégâts (arc piloté par `currentHp / effectiveMaxHp`, réconcilié par Realtime).
- [x] Les cinq pétales ouvrent leur menu ; une ligne se déplie et son bouton de jet fonctionne.
- [x] Les ronds d'usage se consomment de droite à gauche et le MJ voit le changement dans « Ma table ».
- [x] Le lanceur de dés ouvert est bien celui du reste de l'application (`DiceLauncher`, instance unique).
- [x] Sur PC, chaque pétale de la roue MJ déclenche son action et le résultat part dans `session_state` / `session_events`.
- [x] Un repos long remet les PV au maximum et recolore tous les ronds de tous les joueurs.
- [x] « Fin de mon tour » fait avancer la timeline d'initiative chez tout le monde (via le relais MJ).
- [!] L'interface PJ **n'a pas pu être testée sur un vrai téléphone ni sur une session live** depuis cet environnement : validation faite au niveau du code et par `npm run build`.
- [!] « Aucune modale décalée ni cliquable au travers » : garanti par construction (portails + `z-index` explicites), non vérifié à l'œil sur appareil.
- [x] Rapport dans `docs/rapport-delta-interfaces.md`.
