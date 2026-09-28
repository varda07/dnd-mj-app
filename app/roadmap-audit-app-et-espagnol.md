# ROADMAP — AUDIT COMPLET DE L'APP + AJOUT DE L'ESPAGNOL

> **Deux natures de tâches dans ce document, à ne pas confondre :**
> - **Audit (Sections 1 à 4)** : Claude Code **recense et rapporte**, il ne corrige rien. Chaque
>   section produit un fichier dans `docs/`. Le but est de savoir ce qui va et ce qui ne va pas.
> - **Réalisation (Section 5)** : ajout de la langue espagnole. La seule section qui écrit du code
>   applicatif, et **elle ne démarre qu'après** l'audit des traductions (Section 3).
>
> **Ce que Claude Code ne peut pas faire, et ne doit pas prétendre faire** : tester l'app en vrai
> (cliquer, naviguer, jouer une session à deux appareils). Il vérifie le code et le build. Le test
> réel fait l'objet d'une checklist séparée pour l'utilisateur.

> **Instructions d'exécution (Claude Code)**
> - Exécution **autonome, sans interruption**. Coche `[x]` / `[!]` avec une note d'une ligne.
> - Pour les Sections 1 à 4 : **n'écris aucun code applicatif**, seulement les rapports `docs/`.
> - Interface **en français**. Sidebar **à droite**.
> - `npm run build` uniquement après la Section 5.

---

## SECTION 1 — CÂBLAGE : CE QUI EST BRANCHÉ ET CE QUI NE L'EST PAS

Objectif : cartographier ce qui existe mais ne mène à rien, et ce qui devrait exister mais manque.

- [ ] Lister **toutes les routes/pages** de l'app et, pour chacune, par où on y accède (quel lien,
      quel bouton, quelle entrée de menu). Marquer celles qui ne sont **atteignables par aucun
      chemin** dans l'interface.
- [ ] Lister les **boutons et liens qui ne déclenchent rien** ou pointent vers une route inexistante
      (handlers vides, `href` mort, `onClick` sans effet).
- [ ] Lister les **composants et fonctions jamais importés** (code mort).
- [ ] Lister les **RPC / tables Supabase définies mais jamais appelées** côté client, et l'inverse :
      les appels client vers une RPC/table qui n'existe pas.
- [ ] Repérer les **fonctionnalités visiblement incomplètes** : un formulaire sans soumission, une
      liste sans action, un écran vide qui devrait contenir quelque chose.
- [ ] Écrire **`docs/audit-cablage.md`** : un tableau par catégorie, avec le chemin du fichier et
      une colonne « à brancher / à supprimer / à vérifier avec l'utilisateur ». **Ne rien corriger.**

---

## SECTION 2 — NAVIGATION : BOUTONS RETOUR ET SORTIES

Objectif : s'assurer qu'on ne se retrouve jamais coincé sur un écran.

- [ ] Parcourir toutes les pages et sous-vues et lister celles **sans moyen de revenir en arrière**
      (pas de bouton retour, pas de fermeture, pas de fil d'Ariane).
- [ ] Signaler en particulier : les modales sans croix ni fermeture au clic extérieur, les écrans de
      détail sans retour à la liste, les tunnels (création de personnage, jonction de session) sans
      étape précédente.
- [ ] Vérifier la cohérence : le bouton retour est-il **au même endroit** partout ? Utilise-t-il le
      même composant ?
- [ ] Écrire **`docs/audit-navigation.md`** : liste des pages concernées, ce qui manque, et une
      proposition de correction par cas. **Ne rien corriger.**

---

## SECTION 3 — TRADUCTIONS : AUDIT DE L'EXISTANT (FR + EN)

Objectif : savoir précisément où en est la traduction avant d'ajouter une langue.

- [ ] Identifier le **système de traduction** en place : quelle bibliothèque, où sont les fichiers
      de langue, comment une chaîne est traduite (clés, hook, composant).
- [ ] Lister **tout le texte écrit en dur** dans les composants qui **ne passe pas** par le système
      de traduction (donc jamais traduisible). C'est le point le plus important : ces chaînes sont
      invisibles pour la traduction.
- [ ] Comparer les fichiers **français et anglais** : lister les **clés présentes en FR mais
      absentes ou vides en EN**, et l'inverse.
- [ ] Repérer les **clés définies mais jamais utilisées** (traduction morte).
- [ ] Repérer les chaînes anglaises qui sont en réalité restées en français (traduction oubliée).
- [ ] Écrire **`docs/audit-traductions.md`** : d'abord la liste du texte en dur à externaliser
      (avec fichier + ligne), ensuite le tableau des clés manquantes par langue. **Ne rien
      corriger** — mais ce rapport est le plan de travail des Sections suivantes.

---

## SECTION 4 — TERMES DE JEU DE RÔLE : RECENSEMENT POUR DÉCISION

> **Contexte** : l'app ne doit pas s'appuyer sur des termes propriétaires pour lesquels nous n'avons
> ni les droits ni l'accord. **Mais tout le vocabulaire de jeu n'est pas protégé** : une partie
> relève de contenu sous licence ouverte (mécaniques génériques, caractéristiques, jets), une autre
> est protégée (le nom de la marque, certains monstres, sorts et objets signature).
>
> **Claude Code ne tranche pas ce qui est protégé — il n'est pas juriste.** Sa tâche est de **tout
> recenser et classer** pour que l'utilisateur décide. Ne remplacer aucun terme dans cette section.

- [ ] Rechercher dans **tout le code et tous les fichiers de langue** les termes liés au jeu de rôle
      et les recenser dans un tableau.
- [ ] Pour chaque terme trouvé : le terme, le(s) fichier(s) et emplacement(s), le nombre
      d'occurrences, et une **catégorie** :
  - **Nom de marque** (le nom du jeu, ses abréviations, éditeur) — le plus sensible
  - **Créature/PNJ signature** (monstres au nom propre et reconnaissable)
  - **Sort / objet / lieu signature** (noms propres reconnaissables)
  - **Terme de mécanique générique** (caractéristiques, type de jet, points de vie, classe
    d'armure, initiative — vocabulaire courant du jeu de rôle)
  - **Incertain** (à examiner par l'utilisateur)
- [ ] Proposer, **à titre indicatif seulement**, un terme de remplacement neutre pour les catégories
      sensibles (ex. une formulation générique), sans l'appliquer.
- [ ] Écrire **`docs/recensement-termes-jdr.md`** avec ce tableau, trié par catégorie, les plus
      sensibles en premier. **Ne rien modifier dans le code.**

> Après lecture de ce rapport, l'utilisateur décidera quels termes remplacer et par quoi. Le
> remplacement fera l'objet d'une roadmap dédiée.

---

## SECTION 5 — AJOUT DE LA LANGUE ESPAGNOLE

> **Ne démarre qu'après la Section 3.** Ajouter l'espagnol sur une base trouée reproduirait les
> trous. Le rapport `docs/audit-traductions.md` doit exister et avoir été pris en compte.

- [ ] Créer le **fichier de langue espagnol** sur le modèle exact du fichier anglais, avec la même
      structure de clés.
- [ ] Traduire en espagnol **toutes les clés** présentes dans la langue de référence (celle qui est
      la plus complète selon l'audit). Traduction espagnole naturelle et correcte, pas mot à mot.
- [ ] **Ne pas traduire** les termes que l'utilisateur aura signalés comme à conserver (ils seront
      décidés en Section 4) : pour l'instant, garder pour ces termes la même valeur que la langue de
      référence, et les marquer clairement pour révision.
- [ ] Ajouter l'espagnol au **sélecteur de langue** de l'app (là où on choisit FR/EN aujourd'hui),
      avec le libellé et le drapeau/code appropriés.
- [ ] Enregistrer l'espagnol dans la **configuration du système de traduction** (liste des langues
      supportées, langue de secours).
- [ ] Vérifier qu'aucune clé n'est manquante en espagnol par rapport à la référence : s'il en
      manque, les lister en `[!]` plutôt que d'inventer.
- [ ] `npm run build`
- [ ] Écrire **`docs/rapport-espagnol.md`** : ce qui a été traduit, ce qui a été laissé en attente
      de décision (termes JDR), ce qui reste `[!]`.

---

## Rappels

- Sections 1 à 4 : **rapports uniquement**, aucun code applicatif touché.
- Section 4 : Claude Code **classe**, il ne juge pas le droit et ne remplace rien.
- Section 5 : dépend de la Section 3, et respecte les termes que l'utilisateur voudra garder.
- Le **test réel de l'app** n'est pas dans cette roadmap : il est fait par l'utilisateur (checklist
  séparée), parce que Claude Code ne peut pas cliquer, naviguer ni jouer une session.
