# ROADMAP POST-AUDIT — CORRECTIONS PRIORITAIRES

> Issue des rapports d'audit du 2026-09-28 (`docs/audit-cablage.md`,
> `docs/audit-navigation.md`, `docs/audit-traductions.md`, `docs/recensement-termes-jdr.md`).
> Quatre chantiers indépendants, dans l'ordre décidé avec le porteur du projet.

> **Instructions d'exécution (Claude Code)**
> - Exécution **autonome, sans interruption**. Coche `[x]` / `[!]` avec une note d'une ligne.
> - `npm run build` après chaque phase.
> - Interface **en français**. Sidebar **à droite**.
> - Toute migration passe par `supabase/migrations/` + `supabase db push`.
> - Ne modifie aucun comportement non demandé. En cas de doute, `[!]` plutôt que d'improviser.

---

## PHASE 1 — MIGRATION MANQUANTE : TABLE `sons` (le plus urgent)

> **Pourquoi en premier** : la table `sons` existe dans la base réelle mais **dans aucune
> migration du dépôt** (constat `docs/audit-cablage.md`). Un déploiement neuf n'aurait pas cette
> table → la page Sons planterait. C'est un risque de déploiement, pas un confort.

- [ ] Inspecter la structure réelle de la table `sons` dans la base (colonnes, types, contraintes,
      index, politiques RLS, appartenance à la publication Realtime).
- [ ] Écrire une migration dans `supabase/migrations/` qui **recrée cette table à l'identique**,
      idempotente si possible (`create table if not exists`), avec ses RLS et ses index.
- [ ] Vérifier qu'aucune autre table utilisée par l'app n'est dans le même cas (présente en base,
      absente des migrations). Si oui, les traiter dans la même migration et le noter.
- [ ] `supabase db push` puis `npm run build`.

---

## PHASE 2 — PAGES COMPLÈTES MAIS INACCESSIBLES

> Constat `docs/audit-cablage.md` : deux pages finies et fonctionnelles ne sont reliées à rien.

- [ ] **`/dashboard/aventure`** (mode Aventure) : ajouter un point d'entrée dans la navigation
      principale (sidebar à droite), cohérent avec les autres entrées.
- [ ] **`/dashboard/sons`** (bibliothèque sonore) : ajouter un point d'entrée dans la navigation.
      Vérifier au passage que la Phase 1 a bien fiabilisé sa table.
- [ ] Vérifier qu'aucune **autre** page listée comme orpheline dans le rapport ne devrait être
      reliée. Les redirections volontaires (`/dashboard/maps/builder`, `maps/generer-donjon`,
      `/dashboard/presentation`) **ne sont pas** des défauts : ne pas y toucher.
- [ ] Vérifier que les deux pages nouvellement reliées fonctionnent une fois accessibles par le menu
      (navigation réelle dans Chrome).
- [ ] `npm run build`.

---

## PHASE 3 — CONFORMITÉ : NOM DE MARQUE, MOT « OFFICIEL », ATTRIBUTION SRD

> **Décisions arrêtées avec le porteur du projet — à respecter strictement :**
> - On ne retire **que** le nom de marque visible, le mot « officiel », et on **ajoute** la mention
>   d'attribution SRD.
> - **On ne renomme RIEN dans `app/data/`** : ni créatures (Beholder, Slaad, Vecna…), ni sorts, ni
>   caractéristiques, ni classes, ni espèces. Ce contenu relève du SRD et son renommage casserait
>   les données déjà importées chez les utilisateurs.
> - Terme de remplacement retenu quand « D&D » **désigne le système de règles** : **« SRD 5.1 »**
>   (ou « 5e » quand « SRD 5.1 » alourdit une phrase courte, au jugement, mais jamais le nom de
>   l'app à la place).
> - **« Master Screen » ne remplace jamais « D&D »** : Master Screen est le nom de l'app, pas un
>   système de règles. Il reste là où il désigne l'app, nulle part ailleurs.

### 3.1 Retirer le nom de marque visible à l'écran
Cible : les occurrences **visibles**, listées en §A de `docs/recensement-termes-jdr.md`.

- [ ] **Fichiers de langue** — clé `import_library`, dans les **trois** fichiers `fr.json`,
      `en.json`, `es.json` (ligne 407) : retirer « D&D » de la valeur. Ex. FR « Importer depuis la
      bibliothèque SRD 5.1 », EN « Import from the SRD 5.1 library », ES « Importar desde la
      biblioteca SRD 5.1 ». Garder les trois cohérentes.
- [ ] **Texte en dur JSX** — remplacer « D&D » / « D&D 5e » par « SRD 5.1 » dans :
      `OnboardingTutorial.tsx` (lignes 258, 333, 337, 530, 533), `RandomTip.tsx` (20, 33, 37),
      `WildMagicRoller.tsx` (124), `dashboard/aide/page.tsx` (164), `dashboard/ennemis/page.tsx`
      (518), `dashboard/personnages/page.tsx` (778), `dashboard/items/page.tsx` (534).
      *(Ces chaînes seront de toute façon externalisées en Phase 4 ; ici on corrige d'abord le
      contenu, l'externalisation suivra.)*
- [ ] Ne pas toucher aux usages **non visibles** : identifiants internes, codes d'invitation
      (`DnD`), noms de fichiers (`bestiaire_dnd5e.ts`…). Le renommage de fichiers n'apporte rien et
      risque de casser des imports — **hors périmètre**.
- [ ] **`SRD` reste `SRD`** partout où il est déjà écrit : c'est le terme correct.

### 3.2 Supprimer le mot « officiel »
> C'est la formulation la plus exposée : « officiel » suggère un adoubement de l'éditeur.

- [ ] Retirer « officiel » / « officielle » de **toutes** les chaînes où il qualifie le contenu ou
      les tables de jeu (repérées en §A : « la table officielle Wild Magic », « du contenu D&D 5e
      officiel », « les sorts et items D&D 5e officiels »…).
- [ ] Reformuler proprement : « contenu SRD 5.1 », « la table Wild Magic (SRD 5.1) », etc. Jamais
      « officiel » pour du contenu de jeu.
- [ ] Vérifier qu'aucune occurrence de « officiel » qualifiant du contenu de règles ne subsiste
      (recherche globale).

### 3.3 Ajouter la mention d'attribution SRD
> **Obligation de la licence ouverte du SRD** : l'utiliser sans afficher l'attribution requise est
> précisément ce qui met en tort. C'est cette mention qui légitime tout le contenu SRD de l'app.

- [ ] Créer une section/page **« Crédits et licence »** accessible depuis la navigation (pied de
      page, page Aide, ou À propos — au choix, mais accessible).
- [ ] Y afficher le **texte d'attribution du SRD 5.1** requis par la licence Creative Commons
      correspondante (formule d'attribution du System Reference Document 5.1, sous CC-BY-4.0), avec
      mention de l'éditeur d'origine telle que la licence l'exige.
- [ ] **[!] à signaler au porteur** : la formule exacte d'attribution doit être vérifiée par lui
      sur le texte de licence officiel avant publication. Mettre en place l'emplacement et un texte
      de départ, et marquer la validation finale comme à confirmer.
- [ ] `npm run build`.

---

## PHASE 4 — EXTERNALISATION DES TEXTES EN DUR

> Constat `docs/audit-traductions.md` : les trois fichiers de langue sont **complets** (516 clés,
> FR/EN/ES, zéro trou), mais **seuls 16 fichiers sur 152** passent par le système de traduction.
> ~285 chaînes sont écrites en dur → jamais traduites, quelle que soit la langue. C'est **ça**, le
> vrai problème de langue — pas l'espagnol, qui existe déjà et est complet.

> **Faire cette phase APRÈS la Phase 3** : ainsi on externalise les chaînes de marque déjà
> corrigées (SRD 5.1, sans « officiel »), en une seule passe au lieu de deux.

- [ ] Reprendre la liste des chaînes en dur de `docs/audit-traductions.md` (fichier + ligne).
- [ ] Pour chacune : créer une clé de traduction, l'ajouter dans **les trois** fichiers de langue
      (`fr.json`, `en.json`, `es.json`) avec la traduction correcte, et remplacer le texte en dur
      dans le composant par l'appel au système de traduction (`useTranslations` / le hook en place).
- [ ] Traiter en priorité les écrans les plus visibles relevés à l'écran dans l'audit : la sidebar
      (« Tables d'effets », « Aide », « Thèmes custom »), le dashboard (« SCÉNARIO ACTIF »,
      « QUÊTES », « DÉSACTIVER »), la page Personnages (« NOUVEAU PERSONNAGE — COMMENT LE
      CRÉER ? », « Surprends-moi », « Nom du personnage »).
- [ ] Garder une **nomenclature de clés cohérente** avec celle déjà en place (mêmes conventions de
      nommage que les 516 clés existantes).
- [ ] Ne pas créer de doublons : si une clé existe déjà pour un texte identique, la réutiliser.
- [ ] Après externalisation, **vérifier dans Chrome** en basculant l'app en anglais puis en
      espagnol : les écrans traités ne doivent plus laisser aucun texte français résiduel. Remettre
      le français ensuite.
- [ ] Nettoyer les **clés mortes** signalées par l'audit (définies, jamais utilisées), sauf si elles
      sont manifestement réservées à un usage futur — dans le doute, `[!]`.
- [ ] `npm run build`.

---

## VÉRIFICATION FINALE

- [ ] `npm run build` vert, `supabase db push` à jour.
- [ ] La table `sons` est dans une migration ; un déploiement neuf reconstruirait l'app entière.
- [ ] Les pages Aventure et Sons sont accessibles depuis la navigation.
- [ ] Aucun « D&D » visible à l'écran ; aucun « officiel » qualifiant du contenu de règles.
- [ ] Le contenu de `app/data/` est **intact** (aucune créature/sort/classe renommé).
- [ ] La mention d'attribution SRD est en place (formule finale à valider par le porteur).
- [ ] En anglais et en espagnol, les écrans principaux n'ont plus de texte français résiduel.
- [ ] Rapport dans `docs/rapport-post-audit.md` : ce qui est fait, ce qui est `[!]`, et en tête la
      **liste des points nécessitant une validation humaine** (formule d'attribution SRD notamment).

---

## Rappels

- On corrige la **marque** et le mot **« officiel »**, on **ajoute l'attribution** — on ne renomme
  pas le contenu SRD.
- « SRD 5.1 » pour le système de règles ; « Master Screen » seulement pour l'app.
- L'espagnol **existe déjà** : ne pas le recréer. Le vrai travail langue est l'externalisation.
- `npm run build` après chaque phase ; `[!]` plutôt qu'improviser.
