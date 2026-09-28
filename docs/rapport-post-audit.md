# Rapport — Roadmap post-audit

> Exécution de `app/roadmap-post-audit.md` (4 phases). Date : 2026-09-28.
> Vérifications réelles dans Chrome sur `http://localhost:3000`, session authentifiée.
> Aucune donnée utilisateur créée, modifiée ni supprimée.

---

## ⚠️ À VALIDER PAR LE PORTEUR DU PROJET

Trois points ne peuvent pas être tranchés sans toi. Ils sont classés par urgence.

### 1. `supabase db push` n'a pas été lancé — et c'est volontaire

Le push aurait embarqué **une seconde migration, destructive**, que je n'ai pas écrite :

```
20260808130000_suppression_mode_presentation.sql   ← supprime 4 tables + leurs données
20260928200000_bucket_sons.sql                     ← la mienne
```

Son propre en-tête dit : *« ⚠️ MIGRATION DESTRUCTIVE — À POUSSER SCIEMMENT »*, et précise que
tant qu'elle n'est pas poussée, l'app fonctionne tout aussi bien. Elle supprime
`sessions_presentation`, `historique_session`, `sondages_session` et `presentation_etats`.

Déclencher ça par effet de bord d'une tâche « ajouter un bucket » n'était pas acceptable.
**L'objectif de la Phase 1 est malgré tout atteint** : le bucket est désormais versionné, donc un
déploiement neuf le reconstruira. Le push ne concerne que ta base existante, où le bucket a déjà
été créé à la main.

Quand tu veux pousser les deux :

```bash
supabase db push --linked
```

### 2. La mention d'attribution SRD doit être vérifiée sur le texte de licence

`app/dashboard/credits/page.tsx` contient la formule d'attribution dans sa forme usuelle, mais
**je l'ai écrite de mémoire**. Ni sa formulation exacte ni l'URL ne sont vérifiées. La page affiche
un bandeau « À valider avant mise en ligne publique » ; supprime-le une fois la formule confirmée.

**Point qui peut surprendre** : cette mention *nomme l'éditeur*, alors que la Phase 3 a justement
retiré son nom partout ailleurs. Ce n'est pas une contradiction — c'est l'inverse. Le nom disparaît
du discours commercial (« contenu D&D officiel »), et apparaît là où la licence l'exige. C'est
précisément ce qui rend l'usage du contenu SRD légitime.

### 3. Un bug trouvé au passage, non corrigé (hors périmètre)

`app/dashboard/exploration/page.tsx:715` appelle `supabase.storage.from('maps')` en minuscules.
Partout ailleurs c'est `'MAP'`, et c'est `MAP` qui est déclaré en migration. **Les identifiants de
bucket sont sensibles à la casse** : cet appel vise un bucket inexistant et produit une URL morte.
Non corrigé — la roadmap dit de ne rien modifier hors demande.

---

## PHASE 1 — Migration manquante ✅ (avec une correction de diagnostic)

> **Le diagnostic de départ était faux, et l'erreur venait de mon propre audit.**
> `docs/audit-cablage.md` affirmait que la **table `sons`** manquait dans les migrations.
> `sons` n'est pas une table : c'est un **bucket Storage**. La vraie table, `sons_user`, **est**
> versionnée depuis `20260531101000_sons_user.sql`, RLS et index compris. Mon `grep` sur
> `.from('sons')` capturait aussi `storage.from('sons')` — exactement le piège que j'avais pourtant
> signalé pour `ennemie` et `personnage` deux lignes plus bas dans le même rapport.
> **`docs/audit-cablage.md` a été corrigé.**

- [x] **Structure réelle inspectée** — `supabase db dump` indisponible (Docker Desktop non lancé),
      et l'introspection PostgREST refusée à la clé publique. Structure dérivée de l'usage dans le
      code, qui est faisant foi pour ce dont l'app a besoin.
- [x] **Migration écrite** : `supabase/migrations/20260928200000_bucket_sons.sql` — bucket public
      + 4 policies (`select` public, `insert`/`update`/`delete` réservés au propriétaire via
      `storage.foldername(name)[1] = auth.uid()`). Idempotente (`on conflict do nothing`,
      `drop policy if exists`). Conventions reprises à l'identique de `20260512003600_setup.sql`.
- [x] **Recensement complet** buckets utilisés vs déclarés :

      utilisés  : ennemie, personnage, MAP, maps(*), sons
      déclarés  : ennemie, personnage, MAP, battle map, Items
      manquant  : sons          (*) 'maps' = l'écart de casse signalé plus haut

      Côté **tables**, aucune dérive : toutes celles utilisées par le client sont en migration.
- [!] **`supabase db push`** — non lancé. Raison en tête de rapport.
- [x] `npm run build` vert.

---

## PHASE 2 — Pages inaccessibles ✅

- [x] **`/dashboard/aventure`** → entrée « Mode Aventure » en tête de la section **Aventure**
      (avant les sous-hubs Combat / Cartes / Univers, qu'elle chapeaute logiquement).
- [x] **`/dashboard/sons`** → entrée « Bibliothèque sonore » dans **Outils**, juste sous « Sound
      Box » : le widget joue l'ambiance, la page gère la bibliothèque.
- [x] **Aucune autre page à relier.** Les 4 redirections héritées (`maps/builder`,
      `maps/generer-donjon`, `dashboard/presentation`, `presentation/[sessionId]`) n'ont pas été
      touchées, conformément à la consigne.
- [x] **Vérifié dans Chrome** : clic sur « Mode Aventure » → `/dashboard/aventure` (titre
      « ⚔️ AVENTURE ») ; clic sur « Bibliothèque sonore » → `/dashboard/sons` (titre « 🎵
      Bibliothèque sonore »), entrée surlignée comme active dans la sidebar.
- [x] `npm run build` vert.

---

## PHASE 3 — Marque, « officiel », attribution ✅

### 3.1 Nom de marque retiré de l'interface

**Aucun « D&D » n'est plus visible à l'écran.** Vérifié par recherche globale sur `app/`,
`messages/` et `public/`, hors commentaires et hors `app/data/`.

| Cible | Traitement |
|---|---|
| `messages/{fr,en,es}.json` → `import_library` | « bibliothèque D&D » → « bibliothèque SRD 5.1 », cohérent dans les 3 langues |
| `OnboardingTutorial.tsx` (5 chaînes) | « Fiche complète D&D 5e » → « SRD 5.1 » ; « Bestiaire D&D » → « Bestiaire SRD 5.1 » ; « campagnes de D&D » → « campagnes de **jeu de rôle** » |
| `RandomTip.tsx` (3 chaînes) | idem |
| `WildMagicRoller.tsx`, `aide/page.tsx`, `ennemis/page.tsx`, `personnages/page.tsx` | idem |

**Quatre occurrences visibles que la roadmap ne listait pas** (mon §A les avait manquées) ont été
traitées aussi :

| Fichier | Pourquoi ça comptait |
|---|---|
| `app/layout.tsx:39` | **La description de l'application** — métadonnées de page, la plus exposée de toutes |
| `public/manifest.json:4` | Même texte, dans le manifeste PWA |
| `app/lib/tours.ts` (3 chaînes) | Textes des tutoriels guidés, visibles au premier lancement |

Non touchés, comme demandé : identifiants internes (`DnD` des codes d'invitation), noms de fichiers
(`bestiaire_dnd5e.ts`…), et **tout le contenu de `app/data/`**.

### 3.2 Mot « officiel » retiré

Retiré de toutes les chaînes où il qualifiait du contenu ou une table de règles :
« la table **officielle** Wild Magic D&D 5e » → « la table Wild Magic (SRD 5.1) » ;
« du contenu D&D 5e **officiel** » → « du contenu SRD 5.1 » ; « Plus de 100 monstres **officiels** »
→ « Plus de 100 monstres SRD 5.1 » ; « Importe un élément **officiel** » → « de la bibliothèque » ;
« La table de magie sauvage **officielle** » → « (SRD 5.1) ».

> **Une distinction que je n'ai pas écrasée.** « officiel » a un **second sens** dans ce code : la
> colonne `officiel` de la base et la page `/dashboard/admin/contenu` (« Marquer officiel ») servent
> au **marquage éditorial par l'admin de l'app** — aucun rapport avec un éditeur de jeu. Y toucher
> aurait changé le schéma et le sens d'une fonctionnalité. **Laissé intact.**
> Les commentaires de code dans `app/data/` mentionnant « officiel » sont également laissés : ils ne
> sont pas visibles.

### 3.3 Page d'attribution

- [x] **`/dashboard/credits`** créée — « ⚖️ Crédits et licence », avec l'application, le contenu
      sous licence, la mention d'attribution encadrée, et ce que Master Screen **n'est pas**
      (aucune affiliation, aucune approbation).
- [x] Accessible depuis **Outils → Crédits et licence**.
- [!] Formule à valider — voir en tête de rapport.
- [x] `npm run build` vert.

---

## PHASE 4 — Externalisation des textes ✅ (périmètre prioritaire)

### Résultat mesuré

| | Avant | Après |
|---|---|---|
| Clés FR / EN / ES | 516 / 516 / 516 | **554 / 554 / 554** |
| Clés manquantes ou vides | 0 | **0** |
| Fichiers utilisant `useTranslations` | 16 | **17** |
| Chaînes FR accentuées en dur | ~285 | **268** |

- [x] **38 clés ajoutées** dans les trois langues (espagnol inclus, traduit — pas recopié).
- [x] **Clés existantes réutilisées plutôt que dupliquées**, exactement comme demandé. L'audit avait
      vu juste : les 277 clés « mortes » étaient le plan de travail. Réutilisées telles quelles :
      `characters.name_label`, `name_ph`, `method_label`, `method_27pts`, `method_4d6`, `class`,
      `history`, `alignment`, et `sidebar.adv_presentation` (« Session en cours »).
- [x] **Une traduction erronée corrigée** : `characters.method_4d6` valait `"4d6 drop lowest"` —
      de l'anglais dans le fichier **français** (signalé par l'audit). Désormais « 4d6, retirer le
      plus bas » en FR, « 4d6, descartar el más bajo » en ES.

### Écrans traités

| Écran | Externalisé |
|---|---|
| **Sidebar** | Mode Aventure, Calculateur de rencontre, Éditeur de cartes, Carte du monde, Succès, Historique, Bibliothèque sonore, Tables d'effets, Retours & suggestions, Aide, Crédits et licence, Thèmes custom, Session en cours, + les 3 titres de hubs (Combat / Cartes / Univers) |
| **Dashboard** | Scénario actif, les 5 boutons de l'autel (Combat, Exploration, Journal, Quêtes, Désactiver), le message d'autel vide, et les 8 libellés de statistiques |
| **Page Personnages** | Nouveau personnage — comment le créer ?, Guidé / Rapide / Surprends-moi + leurs 3 sous-titres, Méthode stats, 27 points, 4d6, Nom du personnage, placeholder, Classe, Historique, Alignement |
| **`ui/FormKit.tsx`** | Le badge « Recommandé » — composant partagé, donc corrigé pour tous ses usages |

### Vérification réelle dans Chrome

**En anglais** — résidus français sur les écrans traités : **0**. L'autel affiche
« ACTIVE SCENARIO », la sidebar « Adventure Mode », « Sound library », « Effect tables »,
« Credits and licence », « Custom themes », « Maps », « World » ; la page Personnages
« NEW CHARACTER — HOW TO CREATE IT? », « RECOMMENDED », « STATS METHOD », « Character name * »,
« e.g. Alwin », « Alignment ».

**En espagnol** — résidus français : **0**. « Personajes », « Guiado », « Sorpréndeme »,
« Nombre del personaje », « Modo Aventura », « Biblioteca de sonidos », « Créditos y licencia »,
« Tablas de efectos », « Mapas », « Mundo ».

**Français remis** à la fin de la vérification (`dnd-mj-locale = fr`).

### Ce qui reste — et pourquoi

- [!] **268 chaînes accentuées restent en dur**, hors périmètre prioritaire de la roadmap. Le gros
      des fichiers concernés est listé dans `docs/audit-traductions.md` §2 : `scenarios/[id]/edit`,
      `combat-prepare`, `MindMap`, `quetes`, `recap`, `economie`, `feedback`, `DiceLauncher`,
      `tables-effets`, `CombatCockpitMJ`, `AttackRoller`, `calendrier`, `hexcrawl`… Ce chiffre est
      un **plancher** : il ne compte que les chaînes portant un accent.
- [!] **Clés mortes non supprimées.** La roadmap demandait de les nettoyer « sauf si manifestement
      réservées à un usage futur — dans le doute, `[!]` ». Le doute est levé dans l'autre sens :
      cette phase vient d'en **réutiliser neuf** telles quelles. Les supprimer reviendrait à jeter
      le travail préparatoire des écrans non encore traités. **Recommandation : les garder**, et
      les traiter comme la liste de ce qu'il reste à câbler.
- [!] **Données de jeu non traduites** (« Humain », « Barbare (d12) — For », « Acolyte — Perspicacité,
      Religion »). Elles viennent de `app/data/*.ts`, hors système de traduction, et relèvent d'une
      décision séparée : les traduire demanderait une structure par langue pour tout le contenu SRD.

---

## Vérification finale

| Point | État |
|---|---|
| `npm run build` | ✅ vert après chaque phase |
| `supabase db push` | [!] volontairement non lancé — voir en tête |
| Bucket `sons` versionné | ✅ un déploiement neuf le reconstruit |
| Pages Aventure et Sons accessibles | ✅ vérifié au clic dans Chrome |
| Aucun « D&D » visible | ✅ vérifié par recherche globale |
| Aucun « officiel » sur du contenu de règles | ✅ (le marquage éditorial admin est préservé) |
| `app/data/` intact | ✅ **aucune créature, sort, classe ou espèce renommé** |
| Attribution SRD en place | ✅ page créée et reliée — [!] formule à valider |
| EN et ES sans résidu français sur les écrans traités | ✅ vérifié à l'écran |
| Lint | ✅ aucune régression (1 erreur pré-existante dans `Sidebar.tsx`, déjà présente au HEAD) |

## Fichiers touchés

**Créés (3)** — `supabase/migrations/20260928200000_bucket_sons.sql` ·
`app/dashboard/credits/page.tsx` · `docs/rapport-post-audit.md`

**Modifiés (11)** — `app/components/Sidebar.tsx` · `app/components/ui/FormKit.tsx` ·
`app/components/OnboardingTutorial.tsx` · `app/components/RandomTip.tsx` ·
`app/components/WildMagicRoller.tsx` · `app/dashboard/page.tsx` ·
`app/dashboard/personnages/page.tsx` · `app/dashboard/aide/page.tsx` ·
`app/dashboard/ennemis/page.tsx` · `app/layout.tsx` · `app/lib/tours.ts` ·
`public/manifest.json` · `messages/{fr,en,es}.json`

**Corrigé** — `docs/audit-cablage.md` (erreur table/bucket `sons`)
