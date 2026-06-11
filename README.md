This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

# 🗄️ Base de données — migrations Supabase

Les migrations SQL vivent dans **`supabase/migrations/`**, au format
`AAAAMMJJHHMMSS_nom.sql` (timestamp croissant). La configuration CLI est dans
`supabase/config.toml`. Projet distant : **`llqiojlwbrhiqgztizun`**.

> ⚠️ **La base distante contient DÉJÀ tout le schéma** (les 39 migrations ont
> été appliquées à la main dans le SQL Editor). Il ne faut donc **jamais**
> rejouer ces migrations telles quelles : on les marque « déjà appliquées »
> une seule fois (étape 4), puis seules les **nouvelles** migrations seront
> poussées. Toutes les migrations sont par ailleurs **idempotentes**
> (`create ... if not exists`, `drop policy if exists`, blocs `do $$`), donc un
> rejeu accidentel ne casse rien.

## 1. Installer la CLI Supabase (Windows)

`npm install -g supabase` **échoue sur ce poste** (le registre npm est derrière
un proxy SSL non vérifiable). Utiliser l'une de ces méthodes :

**Option A — Scoop (recommandé)**
```powershell
# installer Scoop si absent : voir https://scoop.sh
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Option B — binaire autonome**
Télécharger `supabase_windows_amd64.zip` depuis
<https://github.com/supabase/cli/releases>, extraire `supabase.exe` dans un
dossier présent dans le `PATH` (ex. `C:\Users\lberg\bin`).

Vérifier : `supabase --version`

## 2. Initialiser (déjà fait)

`supabase/config.toml` et `supabase/migrations/` existent déjà dans le dépôt —
**ne pas relancer `supabase init`**.

## 3. S'authentifier et lier le projet

```powershell
supabase login
# → ouvre le navigateur (ou demande un access token créé sur
#   https://supabase.com/dashboard/account/tokens). Coller le token.

supabase link --project-ref llqiojlwbrhiqgztizun
# → demande le mot de passe de la base (Dashboard → Project Settings →
#   Database → Database password). Le saisir une fois.
```

## 4. ⚠️ ÉTAPE DE SÉCURITÉ — marquer les migrations existantes comme appliquées

Comme le schéma est déjà en place, on dit à la CLI « ces 39 migrations sont
déjà dans la base » **sans les rejouer** :

```powershell
supabase migration repair --status applied `
  20260419001300 20260419010300 20260420214100 20260420222500 20260422231500 `
  20260423123300 20260423150200 20260423151100 20260423152100 20260423160600 `
  20260423164800 20260423170200 20260423173500 20260427230100 20260427230700 `
  20260427235700 20260508224200 20260508224300 20260508233600 20260509000300 `
  20260509231200 20260509235100 20260512001800 20260512003600 20260512151600 `
  20260512152100 20260512153100 20260512153300 20260512160400 20260512181500 `
  20260512181501 20260512181502 20260512184100 20260514142600 20260514144400 `
  20260514183600 20260514184800 20260514192200 20260514201700
```

Puis vérifier que tout est aligné :
```powershell
supabase migration list
# → toutes les migrations doivent apparaître côté "Local" ET "Remote".
```

## 5. Appliquer les nouvelles migrations

À partir de là, pour pousser **uniquement les nouvelles** migrations :
```powershell
supabase db push
```

## 6. Créer une nouvelle migration

```powershell
supabase migration new nom_de_la_feature
# → crée supabase/migrations/<timestamp>_nom_de_la_feature.sql (vide)
```
Écrire le SQL dedans (**toujours idempotent** : `if not exists`,
`drop policy if exists` + `create policy`, blocs `do $$ ... end $$`), puis
`supabase db push`.

> Note projet : toute nouvelle migration générée par l'assistant est placée
> directement dans `supabase/migrations/` avec un timestamp.

## Dépannage

- **`db push` veut tout rejouer** → l'étape 4 (`migration repair`) n'a pas été
  faite. La refaire. (Même si rejoué, c'est sans danger : tout est idempotent.)
- **Erreur de mot de passe au `link`** → le régénérer dans le Dashboard.
- **`supabase` introuvable** → le binaire n'est pas dans le `PATH` (étape 1).

---

# 🧭 Anti-régression — détecteur de routes orphelines

Pour éviter qu'une page soit codée mais jamais reliée à l'interface (route
« orpheline », inaccessible via l'UI) :

```bash
node scripts/check-orphan-routes.mjs
```

Le script liste toutes les pages `app/**/page.tsx`, dérive leur route, et vérifie
qu'au moins un lien entrant (`href`, `<Link>`, `router.push`) existe dans le code
source (`.ts`/`.tsx`). Il gère les segments dynamiques (`[id]`, `[username]`…) et
ignore les points d'entrée (`/`, `/dashboard`).

- **Code de sortie 0** : aucune orpheline.
- **Code de sortie 1** : au moins une route sans lien entrant (la liste est
  affichée) — utile en CI / pre-commit.

Quand le script signale une route, ajoute-lui un accès (sidebar, dashboard, page
parente, ou palette Cmd+K). Les pages réservées (ex. console admin) doivent avoir
un lien conditionnel (affiché selon le rôle) pour rester « reliées ».

---

## Learn More (Next.js)

- [Next.js Documentation](https://nextjs.org/docs)
- [Deploy on Vercel](https://vercel.com/new)
