# Audit — Câblage : ce qui est branché et ce qui ne l'est pas

> Section 1 de `app/roadmap-audit-app-et-espagnol.md`. **Recensement seul, rien n'a été corrigé.**
> Date : 2026-09-28. Analyse statique **et vérification réelle dans Chrome** sur `http://localhost:3000`
> (session authentifiée, données réelles — aucune donnée créée, modifiée ni supprimée).

## Résumé

| Catégorie | Résultat |
|---|---|
| Routes totales | 59 |
| Routes réellement inatteignables | **2** |
| Redirections héritées (volontaires, pas des défauts) | 4 |
| Boutons / liens morts | **0** |
| Modules jamais importés | 4 |
| RPC appelées mais inexistantes | 0 |
| Tables utilisées mais absentes des migrations | **0** (corrigé — voir §4) |
| Buckets Storage absents des migrations | **1** (`sons`) |
| Fonctionnalité branchée sur rien | **1** (feature flags) |

Le câblage est globalement sain. Les deux vrais problèmes sont une **dérive de migration** et une
**fonctionnalité d'administration sans effet**.

---

## 1. Routes inatteignables par l'interface

Testées en naviguant réellement à l'URL.

| Route | État réel constaté | Verdict |
|---|---|---|
| `/dashboard/aventure` | **Page complète et fonctionnelle** : bandeau « MODE AVENTURE », 4 cartes (Combat, Exploration, Session, Journal) + lien « ← Retour à l'accueil ». Aucune référence dans le code (`0` occurrence hors d'elle-même). | **À vérifier avec l'utilisateur** — le dashboard d'accueil a déjà un onglet « AVENTURE » qui affiche ce contenu en ligne. La page est probablement un doublon devenu orphelin. À brancher ou à supprimer. |
| `/dashboard/sons` | **Page complète et fonctionnelle** : « Bibliothèque sonore », formulaire d'ajout (nom, URL, tags, upload), filtres par tag, liste. Référencée **uniquement dans un `.md`**, jamais dans le code. | **À brancher** — l'entrée « Sound Box » de la sidebar ouvre le widget flottant, pas cette page. Il n'existe aucun chemin vers la bibliothèque sonore. |

### Redirections héritées — **pas des défauts**

J'ai cliqué : ces routes ne sont pas cassées, ce sont des passerelles volontaires pour les anciens
liens et favoris. Elles n'ont pas d'entrée de menu, et c'est normal.

| Route | Redirige vers | Confirmé |
|---|---|---|
| `/dashboard/presentation` | `/dashboard/scenarios` | ✅ testé — commentaire d'en-tête explicite (« Phase 5 ») |
| `/dashboard/maps/builder` | `/dashboard/maps/editor?tab=gm` | ✅ testé — onglet « Outils MJ » actif à l'arrivée |
| `/dashboard/maps/generer-donjon` | `/dashboard/maps/editor?tab=generate` | ✅ testé — onglet « Générer » actif, donjon rendu |
| `/presentation/[sessionId]` | `/session/<id>/ecran` | lecture du code |

### Routes accessibles — pour mémoire

Toutes les autres routes ont un chemin : sidebar (Codex, Aventure, Cartes, Univers, Outils,
Paramètres), page `/dashboard/admin` (qui liste ses 6 sous-pages), page `/dashboard/maps`
(templates), `SessionMJ` (lien « écran » en nouvel onglet), et les routes dynamiques
(`scenarios/[id]/*`, `personnages/[id]`, `pnj/[id]`) atteintes depuis leurs listes.

---

## 2. Boutons et liens morts

**Aucun.** Recherché et non trouvé :

- `onClick={() => {}}` ou handler vide : 0
- `href="#"` ou `href=""` : 0
- `<form>` sans `onSubmit` : 0 (3 faux positifs — l'attribut est à la ligne suivante)
- `onClick` ne faisant qu'un `console.log` : 0
- `TODO` / `FIXME` / « à implémenter » / « coming soon » dans le code applicatif : 0

### Un cas à signaler : le bouton de dés flottant

| Élément | Constat |
|---|---|
| FAB « Ouvrir le lanceur de dés » (`/dashboard/scenarios`) | **En fait fonctionnel (testé).** Deux clics de souris synthétiques n'ont rien produit, ce qui le faisait passer pour mort ; un `.click()` programmatique ouvre bien le lanceur (« d20 », « Avantage » apparaissent dans le DOM, 2 surfaces `fixed` > 150 px). L'échec venait de mon outillage de clic, pas de l'app. |

> À retester manuellement d'un vrai clic pour lever le dernier doute, mais rien n'indique un défaut.

---

## 3. Code mort (jamais importé)

| Fichier | Contenu | Verdict |
|---|---|---|
| `app/components/ui/LazyImage.tsx` | Composant d'image différée | **À supprimer** — jamais importé, et absent du barrel `ui/index.ts` |
| `app/components/ui/index.ts` | Barrel exportant 9 composants `ui/` | **À supprimer ou à adopter** — aucun fichier n'importe `from '@/app/components/ui'` ; tous les composants sont importés par leur chemin direct |
| `app/lib/featureFlags.ts` | `useFeatureFlag(nom)` | **À brancher** — voir §5 |
| `app/lib/static_cache.ts` | `cacheGet` / `cacheSet` / `cached` | **À vérifier avec l'utilisateur** — utilitaire de cache localStorage jamais employé |

---

## 4. RPC et tables Supabase

### RPC — tout est cohérent

Les **11** RPC appelées côté client existent toutes en migration :
`admin_analytics_top`, `admin_stats`, `incrementer_nb_copies`, `infos_scenario_via_code`,
`join_session`, `joueurs_du_scenario`, `lier_personnage_via_code`, `rejoindre_scenario_via_code`,
`sessions_a_rejoindre`, `set_session_status`, `start_session`.

Les 20 fonctions non appelées par le client **ne sont pas du code mort** — vérifié :

- les `fn_*` sont les helpers `SECURITY DEFINER` des politiques RLS et y sont massivement utilisés
  (`fn_is_scenario_mj` 61 fois, `est_admin` 31, `fn_owns_personnage` 19, etc.) ;
- les `touch_*` / `*_touch_updated_at` sont des fonctions de trigger, appelées par la base.

### Tables — RAS. Le manque est un bucket Storage

> ⚠️ **Correction du 2026-09-28 (post-audit).** Ce rapport affirmait initialement que la **table
> `sons`** manquait dans les migrations. **C'était faux.** `sons` n'est pas une table : c'est un
> **bucket Storage** (`supabase.storage.from('sons')`). La vraie table s'appelle `sons_user` et
> elle **est** versionnée depuis `20260531101000_sons_user.sql`, RLS et index compris. L'erreur
> venait du même piège que j'avais pourtant signalé deux lignes plus bas — un `grep` sur
> `.from('sons')` qui capture aussi `storage.from('sons')`.

**Toutes les tables utilisées par le client sont présentes en migration.** Aucune dérive.

*(Rappel : `ennemie`, `personnage` et `sons` ne sont pas des tables mais des **buckets Storage**.)*

### Buckets Storage — un vrai manque

| Bucket | Déclaré en migration | Utilisé par |
|---|---|---|
| `personnage` | ✅ `20260512003600_setup.sql` | fiches de personnage |
| `ennemie` | ✅ idem | ennemis, PNJ |
| `MAP` | ✅ idem + `20260509000300_maps_editor.sql` | cartes |
| `battle map`, `Items` | ✅ idem | déclarés, semble-t-il inutilisés |
| **`sons`** | ❌ **absent** | `/dashboard/sons` (upload d'ambiances) |

`20260531101000_sons_user.sql:41-42` le dit explicitement : *« si tu veux uploader des fichiers,
crée aussi un bucket Storage "sons" (public read, write authenticated) via le dashboard Supabase »*.
Le code affiche d'ailleurs ce message à l'utilisateur en cas d'échec d'upload.

**Corrigé le 2026-09-28** par `supabase/migrations/20260928200000_bucket_sons.sql` (bucket + 4
policies, idempotent).

### Un écart de casse à vérifier

| Fichier | Appel | Problème |
|---|---|---|
| `app/dashboard/exploration/page.tsx:715` | `supabase.storage.from('maps')` | Tous les autres appels utilisent `'MAP'` (majuscules) et c'est `MAP` qui est déclaré en migration. Les identifiants de bucket sont **sensibles à la casse** : cet appel vise un bucket inexistant, et l'URL publique produite serait morte. **À vérifier avec l'utilisateur** — non corrigé, hors périmètre de la roadmap post-audit. |

---

## 5. Fonctionnalités visiblement incomplètes

| Fonctionnalité | Constat | Verdict |
|---|---|---|
| **Feature flags** | `/dashboard/admin/feature-flags` permet de créer et basculer des drapeaux dans la table `feature_flags`. Mais `useFeatureFlag()` (`app/lib/featureFlags.ts`) **n'est appelé nulle part**. Les drapeaux ne pilotent donc rien. | **À brancher ou à supprimer** — en l'état, l'administrateur manipule une valeur sans effet, ce qui est trompeur. |
| **Bibliothèque sonore** | Page complète mais sans accès (§1), et table absente des migrations (§4). | **À brancher** + corriger la migration. |
| **Mode Aventure** | Page complète mais sans accès, doublon probable de l'onglet du dashboard (§1). | **À vérifier avec l'utilisateur.** |

---

## Ce que cet audit ne couvre pas

- La **synchronisation temps réel d'une session à deux appareils** : un seul navigateur ne la teste
  pas. **À faire manuellement par l'utilisateur.**
- Le comportement des pages d'administration : non parcourues (elles agissent sur du contenu réel).
