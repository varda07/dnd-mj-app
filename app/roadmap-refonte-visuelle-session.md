# ROADMAP — REFONTE VISUELLE DU MODE SESSION (côté PJ)

> **Objectif : le mode session doit respecter la direction artistique déjà existante de l'app.**
> Il ne s'agit **pas** d'inventer un nouveau style, mais de rebrancher le thème existant et de
> remplacer les valeurs écrites en dur par les tokens de DA que le reste de l'app utilise déjà.
>
> Référence obligatoire : **`docs/inventaire-da.md`**. Tout ce qui suit en découle.

> **Instructions d'exécution (Claude Code)**
> - Exécution **autonome, sans interruption**. Coche `[x]` / `[!]` avec une note d'une ligne.
> - `npm run build` après chaque section.
> - **Refonte visuelle uniquement.** Ne modifie aucun comportement, aucune logique de données,
>   aucun canal Realtime, aucune RPC. Si un changement de style exige de toucher à la logique,
>   marque `[!]` et laisse en place.
> - **N'invente aucun token, aucune couleur, aucune police.** Utilise exclusivement ce qui est
>   recensé dans `docs/inventaire-da.md`. Si un token manque pour un besoin réel, signale-le en
>   `[!]` au lieu d'écrire une valeur en dur.
> - La sidebar est **à droite**. Interface **en français**.

---

## Cause racine (rappel de l'inventaire)

Le côté session n'est pas mal stylé par choix : **`ThemeLoader` n'est monté que dans
`app/dashboard/layout.tsx`**, et il n'existe aucun layout sous `app/session/`. Résultat : sur
`/session/**`, `<html>` n'a ni `data-theme` ni variables `--theme-*` — tout le système de thème
est inerte, et le code a compensé en écrivant les couleurs en dur.

**La correction est donc structurelle d'abord, cosmétique ensuite.** On rebranche le thème, puis
on remplace le dur par les tokens. L'essentiel du travail est de la substitution mécanique.

---

## SECTION 1 — REBRANCHER LE THÈME (préalable, tout en dépend)

- [ ] Créer **`app/session/layout.tsx`** qui monte `ThemeLoader` (comme `app/dashboard/layout.tsx`),
      de sorte que `<html>` reçoive `data-theme` et les variables `--theme-*` sur toutes les
      routes `/session/**` — joueur, MJ et écran.
- [ ] Vérifier que le thème actif de l'utilisateur est bien appliqué : ouvrir `/session/[id]/joueur`
      et confirmer dans l'inspecteur que `data-theme` est présent sur `<html>` et que les
      `--theme-*` sont renseignées.
- [ ] **Point de vigilance** : s'assurer que ce nouveau layout n'introduit aucune propriété
      (`transform`, `filter`, `backdrop-filter`, `will-change`, `contain`) sur un ancêtre de
      modale — piège documenté dans l'inventaire, déjà corrigé deux fois. Les modales du mode
      session sont portées vers `document.body`, cela doit le rester.
- [ ] `npm run build`

> Une fois le thème vivant, une grande partie des couleurs en dur peut être remplacée par les
> classes Tailwind interceptées par le thème (`bg-gray-800`, `border-gray-700`, `text-yellow-500`…).
> C'est l'API de thème de l'app. Les sections suivantes s'appuient là-dessus.

---

## SECTION 2 — REMPLACER LES COULEURS EN DUR PAR LES TOKENS

Périmètre : `app/components/session/joueur/**` en priorité, puis `app/components/session/mj/**`
et `app/components/session/**`. L'inventaire précise que la divergence couvre tout le mode session.

- [ ] Remplacer la palette **`stone-*`** et **`yellow-600 / yellow-800`** (non interceptées par le
      thème) par les classes que le thème gère : **`gray-*`** et **`yellow-500`**, comme le
      dashboard. Se référer au jeu de classes interceptées listé dans l'inventaire.
- [ ] Supprimer le fond de page **`#0e0b06`** écrit en dur (3 occurrences) et utiliser le fond de
      page normal du thème.
- [ ] Remplacer les **8 opacités de `rgba(201,168,76,…)`** recopiées à la main par le canal
      correct : les variables d'or du thème (`--premium-*` / `--theme-*` selon ce que l'inventaire
      identifie comme la bonne source). Bonne couleur, mais elle doit passer par le token, pas être
      recopiée.
- [ ] Vérifier qu'aucune nouvelle valeur hexadécimale d'or, de gris ou de rouge n'est écrite en dur
      dans le mode session à l'issue de cette section.
- [ ] `npm run build`

---

## SECTION 3 — RÉUTILISER LES COMPOSANTS DE DA AU LIEU DE LES RÉÉCRIRE

L'inventaire signale que plusieurs éléments ont été réécrits alors que le composant existe déjà.

- [ ] **Modale** : utiliser le composant modale de la couche `ui/` (déjà utilisé ailleurs, déjà
      porté vers `document.body`) au lieu de toute modale réécrite dans le mode session.
- [ ] **Toast**, **spinner**, **état vide** : remplacer les versions réécrites du mode session par
      les composants `ui/` existants.
- [ ] **Pastilles de condition** : utiliser le composant/style existant plutôt que la version
      réécrite.
- [ ] Appliquer la classe **`.grim-card`** (filet gauche or 2 px) aux cartes du mode session pour
      qu'elles soient cohérentes avec les 74 usages du reste de l'app, partout où une carte du mode
      session joue le même rôle qu'une `grim-card` ailleurs.
- [ ] Reprendre les **filets dégradés, losanges ◆ et le traitement typographique** (Georgia, halo
      doré) là où le mode session présente des titres ou des séparateurs équivalents à ceux du
      dashboard.
- [ ] `npm run build`

---

## SECTION 4 — UNIFIER CE QUI DOIT L'ÊTRE, PRÉSERVER CE QUI EST LÉGITIME

- [ ] **La roue SVG et la demi-sphère du personnage sont des inventions légitimes** (sans
      équivalent ailleurs) : les **conserver**, en veillant seulement à ce que leurs couleurs
      passent désormais par les tokens du thème.
- [ ] **`couleurPv()`** : l'inventaire note qu'elle duplique la logique déjà présente dans
      `.cockpit-hp-fill`, `.combatj-row-fill` et `.presentation-card-hp-fill`. Factoriser pour que
      l'arc de PV de la roue et les barres de PV du reste de l'app partagent **la même source de
      couleur** (mêmes seuils, mêmes teintes). Si la factorisation exige de toucher à la logique de
      rendu de la roue, se limiter à aligner les valeurs de couleur sur la source commune et
      marquer le reste `[!]`.
- [ ] Vérifier la cohérence du **d20** : l'icône de dé du mode session doit être la même que le
      `DiceFabIcon` de l'app (d20 bleu cobalt à chiffre or). Ne pas réintroduire une variante.
- [ ] `npm run build`

---

## SECTION 5 — VÉRIFICATION VISUELLE

- [ ] Ouvrir `/session/[id]/joueur` et une page du dashboard côte à côte : les ors, les gris, les
      cartes, la typographie doivent se ressembler. Plus de rupture visuelle entre les deux.
- [ ] Tester le rendu avec **plusieurs des 6 thèmes** (l'inventaire les recense) : le mode session
      doit changer d'apparence avec le thème, preuve qu'il est bien branché et non figé.
- [ ] Vérifier la **lisibilité en condition de jeu** : PV, nom, états lisibles d'un coup d'œil sur
      un écran de téléphone. La cohérence visuelle ne doit jamais se faire au détriment de la
      lisibilité en partie.
- [ ] Confirmer qu'aucune modale n'est décalée ni cliquable au travers après l'ajout du layout
      (piège du bloc conteneur).
- [ ] Rédiger `docs/rapport-refonte-visuelle-session.md` : ce qui a été rebranché, ce qui a été
      substitué, ce qui reste `[!]`.

---

## Rappels

- **Aucun changement de comportement.** Style uniquement.
- **Aucun token, couleur ou police inventés** — uniquement ce que recense `docs/inventaire-da.md`.
- La roue et la demi-sphère se conservent ; on ne change que leur source de couleur.
- Layout `/session/` sans propriété créant un bloc conteneur au-dessus des modales.
- `npm run build` après chaque section.
