# Inventaire de la direction artistique — Master Screen

> Périmètre : côté MJ (dashboard, pages CRUD, mode présentation/cockpit) et pages
> principales. Le mode session joueur (`app/components/session/joueur/`) n'est
> inventorié qu'en **comparaison**, puisque c'est lui qui doit être refait.
>
> État du code au 2026-09-28, branche `main`, commit `9c07d4d`.

---

## 1. Où la DA est définie

Il n'y a **pas** de fichier de thème CSS séparé, pas de `tailwind.config.js`, pas de
dossier `styles/` CSS. Tout tient en **quatre emplacements** :

| # | Emplacement | Rôle | Volume |
|---|---|---|---|
| 1 | `app/globals.css` | **Le fichier de DA.** Tokens, thèmes, traitement premium, ~320 classes maison, animations, a11y | 4 532 lignes |
| 2 | `app/styles/themes.ts` | Source de vérité JS des 6 thèmes + `applyTheme()` qui injecte les `--theme-*` sur `<html>` | 160 lignes |
| 3 | `app/layout.tsx` | Chargement des 5 polices Google (variables CSS `--font-*`), `metadata`, `viewport.themeColor` | — |
| 4 | `app/components/ui/*` | Couche composants React qui consomme les classes `.codex-*` (Modal, Toast, EmptyState, Skeleton, Tooltip, PageTransition, BackToTop) | 13 fichiers |

### Tailwind v4, sans fichier de config

`postcss.config.mjs` → `@tailwindcss/postcss`. `app/globals.css:1` fait
`@import "tailwindcss"`. Le seul bloc `@theme` est **squelettique** (`globals.css:285-290`) :

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

👉 **Aucun token de design ne passe par `@theme`.** Les couleurs Tailwind par défaut
(`gray-800`, `yellow-500`…) ne sont pas redéfinies dans la config : elles sont
**interceptées après coup** par des overrides `!important` dans `globals.css`
(voir §3.2). C'est l'architecture centrale à connaître.

### Où vivent les rayons / espacements / ombres

- **Ombres** : 3 tokens seulement (`--codex-shadow-sm/md/gold`, `globals.css:877-879`) —
  en pratique **peu utilisés** ; les ombres sont réécrites en dur dans chaque classe.
- **Rayons** : **aucun token**. Valeurs littérales, dominantes : `4px` (×19), `6px` (×15),
  `8px` (×14), `10px` (×14), `50%` (×13), `999px` (×8). Côté JSX, `rounded` (×675) et
  `rounded-lg` (×116) dominent.
- **Espacements** : **aucun token**. Uniquement les échelles Tailwind (`px-3`, `gap-2`…)
  côté JSX et des valeurs en `px` dans `globals.css`.

---

## 2. Les tokens de design réutilisables (noms exacts)

### 2.1 Tokens sémantiques de thème — `--theme-*`

Injectés à l'exécution par `applyTheme()` (`app/styles/themes.ts:135-155`) en
`style` inline sur `<html>`, **plus** `data-theme="<clé>"` sur le même élément.

| Token | Sens | Valeur en thème `eclipsed` (défaut) |
|---|---|---|
| `--theme-bg-primary` | Fond de page | `#0a0b0d` |
| `--theme-bg-secondary` | Fond de panneau | `#0f1115` |
| `--theme-bg-card` | Fond de carte | `#12141a` |
| `--theme-border` | Bordure générique | `rgba(201,168,76,0.15)` |
| `--theme-text-primary` | Texte principal | `#e8e8ec` |
| `--theme-text-secondary` | Texte secondaire | `#6a6a72` |
| `--theme-accent` | **Accent (l'or)** | `#C9A84C` |

C'est **le** jeu de tokens à utiliser. Convention établie partout dans `globals.css` :
toujours avec un fallback — `var(--theme-accent, #C9A84C)` — et en dosage via
`color-mix(in srgb, var(--theme-accent, #C9A84C) N%, transparent)`.

### 2.2 Tokens « premium » — `--premium-*`

Définis en CSS pur, un bloc par thème (`globals.css:322-440`), sélecteur
`html[data-theme="<clé>"]`. Ils pilotent le traitement décoratif :

`--premium-accent` · `--premium-accent-soft` · `--premium-accent-strong` ·
`--premium-accent-tip` · `--premium-ornament` · `--premium-ornament-tip` ·
`--premium-overlay` · `--premium-texture` · `--premium-inset` · `--premium-inset-strong`

### 2.3 Tokens globaux — `--codex-*` (`globals.css:874-882`)

```
--codex-gold          #C9A84C
--codex-gold-soft     rgba(201, 168, 76, 0.15)
--codex-gold-strong   rgba(201, 168, 76, 0.4)
--codex-shadow-sm     0 1px 2px rgba(0, 0, 0, 0.25)
--codex-shadow-md     0 4px 12px rgba(0, 0, 0, 0.35)
--codex-shadow-gold   0 6px 22px rgba(201, 168, 76, 0.18)
--codex-ease          cubic-bezier(0.4, 0, 0.2, 1)   ← utilisé partout, le vrai token vivant
```

### 2.4 Polices — variables `--font-*` (`app/layout.tsx`)

| Variable | Police | Usage réel |
|---|---|---|
| `--font-cinzel` | Cinzel 400/600/700 | `h1 h2 h3 button` sur **tous les thèmes sauf `eclipsed`** |
| `--font-inter` | Inter 300–600 | Toute la typo du thème `eclipsed` (défaut), en `!important` |
| `--font-geist-sans` / `--font-geist-mono` | Geist | Déclarées, **quasi inutilisées** (reliquat du starter Next) |
| `--font-dyslexic` | Atkinson Hyperlegible | A11y, sous `html[data-a11y-dyslexic="true"]` |

⚠️ **Écart important** : la police « signature » réellement à l'écran n'est ni Cinzel ni
Inter — c'est **`Georgia, 'Times New Roman', serif` écrit en dur 44 fois** dans
`globals.css` (tous les titres `.grim-title`, `.grimoire-*`, `.joueur-*`, `.codex-display`).
Georgia est le serif de l'identité, mais **il n'existe aucun token pour lui**.

### 2.5 Les 6 thèmes (`app/styles/themes.ts`)

`eclipsed` (défaut, or `#C9A84C` sur noir, sobre « Linear/Notion ») · `runique`
(violet `#a855f7`) · `parchemin` (ambre `#d97706`) · `lave` (rouge `#ff4400`) ·
`necromancien` (vert `#00cc44`) · `royal` (or `#C9A84C` + sang, seul thème `PREMIUM_THEMES`).

Chaque thème porte `label`, `description`, `slogan` (ex. royal : `FORTIS FORTUNA ADIUVAT`).

---

## 3. Ce qui donne son identité visuelle à l'app

### 3.1 L'or `#C9A84C` — la constante absolue

Une seule couleur traverse tout : **`#C9A84C`** (or patiné). On la retrouve en
`--theme-accent`, `--premium-accent`, `--codex-gold`, dans `viewport.themeColor`
(`layout.tsx`), dans `manifest.json` (`theme_color`), dans la scrollbar, dans le
skip-link a11y. C'est l'identité avant tout le reste.

Le geste récurrent : **or très dilué au repos, or franc à l'interaction.**
Bordures à 4–15 %, hover à 28–35 %, actif à 55–60 %.

### 3.2 L'architecture « Tailwind détourné »

Point structurant à comprendre avant de coder quoi que ce soit
(`globals.css:445-470` + `1935-1943`). Le thème **intercepte** un jeu **fermé** de classes Tailwind :

```
.bg-gray-900     → var(--theme-bg-primary)
.bg-gray-800     → var(--theme-bg-secondary) + dégradé + bordure animée + ornements
.bg-gray-700     → var(--theme-bg-card)
.border-gray-700 → var(--theme-border)
.border-gray-600 → var(--theme-border)
.text-yellow-500 → var(--theme-accent) + text-shadow
.bg-yellow-500   → dégradé d'accent + box-shadow
.ring-yellow-500 → var(--theme-accent)
```

👉 **Conséquence** : écrire `bg-gray-800` **est** l'API de thème.
Écrire `bg-stone-900` ou `border-yellow-800` produit une couleur **figée**, immunisée
aux 6 thèmes. Côté MJ le dashboard respecte massivement la convention :
`text-gray-400` ×399, `bg-gray-700` ×197, `bg-gray-800` ×181, `border-gray-700` ×173,
`bg-yellow-500` ×126.

### 3.3 Le traitement « premium » automatique (`globals.css:471-636`)

Sans toucher au JSX, toute page sous `html[data-theme]` reçoit :

- **Fond grimoire** : halo doré radial en haut + halo violet `rgba(74,26,92,0.16)` en bas,
  ancrés au viewport (`background-attachment: fixed`), puis overlay teinté + texture.
- **Cartes ornées** : `.bg-gray-800:not(.theme-no-deco):not(button)` reçoit une
  **bordure qui pulse** (`@keyframes premium-pulse`, 4 s) et des **ornements de coins**
  en L filigrané avec points (`::before` haut-gauche, `::after` bas-droit).
- **Filet doré animé** sous le header via `.theme-header-border` + `.theme-header-glow`
  (`@keyframes premium-border-slide`).
- **Opt-out** : `.theme-no-deco` neutralise tout sur une surface.
- `eclipsed` (le thème par défaut) **neutralise entièrement** ce traitement
  (`globals.css:673-864`) : pas de Cinzel, pas d'ornement, pas de texture, cartes plates
  à `linear-gradient(180deg, #0e1014, #0a0c10)` + bordure `rgba(255,255,255,0.04)`.

### 3.4 Le d20 bleu/or

Deux objets distincts, **ne pas confondre** :

1. **`DiceFabIcon`** (`app/components/DiceLauncher.tsx:1591-1730`) — l'icône du bouton
   flottant de dés. Icosaèdre vu de face, silhouette `50,5 88,28 88,72 50,95 12,72 12,28`,
   **facettes bleu cobalt** (`#5b6dc4` → `#2d3a6b`, contour `#1a2148`, facettes
   `#4a5aa6` `#4554a0` `#34418a` `#283265` `#222a5b` `#1f2752`), et le **« 20 » gravé en
   or `#C9A84C`** en `Georgia, serif`. Couleurs volontairement hardcodées pour rester
   raccord avec le canvas Babylon de `@3d-dice/dice-box`. **C'est le bleu/or de l'app.**
2. **`DICE_ART`** (`DiceLauncher.tsx:110-208`) — les dés 2D des résultats, eux **dorés**,
   via 3 palettes : `PALETTE_GOLD` (`#fef08a`/`#C9A84C`/`#8B7333`/`#fef9c3`),
   `PALETTE_CRIT_SUCCESS` (jaune vif, sur 20 naturel), `PALETTE_CRIT_FAIL`
   (rouge `#dc2626`, sur 1 naturel). Le contraste **or / rouge crit** est un marqueur fort.

Le logo de l'app (`public/icon.svg`) n'est **pas** un d20 : c'est un monogramme **MS**
serif italique dans un double cercle, en dégradé or `#ffdd88 → #C9A84C → #5a4520`
sur fond `#0a0b0d`.

### 3.5 Les rouges

Il n'y a pas **un** rouge mais trois registres, tous conventionnels :

- **Crit fail / dégâts** : `#dc2626`, `#ef4444`, `#f87171` (`PALETTE_CRIT_FAIL`, KO, `codex-condition-dying`).
- **Action destructive** : `.joueur-btn-leave` — `rgba(216,110,100,0.85)` sur bordure
  `rgba(170,60,52,0.42)`, hover `rgba(150,42,36,0.16)`.
- **Le « sang royal »** : `rgba(139,0,0,0.08)` en dégradé de carte sur `html[data-theme="royal"]`.
  ⚠️ **Deux commentaires explicites dans le code** documentent le retrait du rouge sang
  opaque (`#8B0000`) des bordures — il « jurait avec l'or » et donnait des bordures
  « en dents de scie » (`globals.css:436-438`, `themes.ts:110-112`). **Ne pas le réintroduire.**

### 3.6 Le style de carte — deux grammaires coexistantes

| | `.codex-card` / `.codex-tile` | `.grim-card` |
|---|---|---|
| Fond | `linear-gradient(180deg, #0e1014, #0a0c10)` | `linear-gradient(135deg, rgba(20,15,8,.6), rgba(10,8,4,.4))` |
| Bordure | `1px rgba(255,255,255,0.04)` | `1px` accent 12 % + **`border-left: 2px` accent 45 %** |
| Rayon | `10px` | `8px` |
| Ombre | inset 1px blanc + 2 ombres portées | aucune au repos |
| Hover | accent 35 %, `translateY(-1px) scale(1.01)`, halo or | accent 30 %, filet gauche plein or, halo, **`top: -1px`** |
| Ambiance | froid, neutre, « Linear/Notion » | chaud, brun/or, « grimoire » |

`.grim-card` est **la plus utilisée** (74 occurrences dans `app/dashboard`) devant
`.codex-card` (13). Son **filet gauche or de 2 px** est la signature de carte la plus
reconnaissable de l'app.

⚠️ `.grim-card-hover` utilise `top` et **pas** `transform` — commentaire de 8 lignes dans
`globals.css:1811-1818` : un `transform` crée un bloc englobant qui casse l'ancrage des
modales `position: fixed` descendantes. Piège documenté, à respecter.

### 3.7 Bordures, filets et ornements

- **Filet dégradé or** : `transparent → accent 22 % → transparent`, motif de
  `.codex-divider`, `.codex-section-title::before/::after`, `.grimoire-divider-line`.
- **Losange `◆`** : `.grim-diamond`, `.grimoire-diamond-top`, `.grimoire-altar-diamond`,
  `.sidebar-section-deco`. L'ornement récurrent.
- **Label de section** : 10 px, `font-weight: 700`, `letter-spacing: 0.24em`, uppercase,
  gris (`.codex-section-title`, `.grimoire-modal-label`, `.joueur-btn-explore`).
- **Titre serif or** : Georgia, `font-weight: 300`, `letter-spacing: 0.10–0.30em`,
  `text-shadow` or à 28–35 % (`.grim-title`, `.grimoire-codex`, `.joueur-title`, `.codex-display`).

### 3.8 Familles de classes existantes (~320 au total)

| Préfixe | Nb | Portée |
|---|---|---|
| `.codex-*` | 79 | Composants transverses : card, tile, modal, toast, empty, skeleton, tooltip, spinner, progress, input, divider, section-title, press, fade-in, focus-ring, scroll, spell-slot, condition |
| `.grim-*` + `.grimoire-*` | 69 | Habillage grimoire : titres, cartes CRUD, frame/autel du dashboard, accordéon PJ, modale, onglets, pills |
| `.combatmj-*` `.combatj-*` `.cockpit-*` `.combatcarte-*` `.aw-*` | 116 | Cockpit MJ, vue joueurs, carte tactique, roue d'action |
| `.presentation-*` | 47 | Ancien mode présentation |
| `.joueur-*` | 10 | Vue « Joueur » **du dashboard** (pas le mode session) |
| `.sidebar-section-*` `.dice-fab` `.ko-*` `.a11y-*` `.markdown-light` | reste | Nav, FAB de dés, animations KO, a11y |

### 3.9 La couche composants React (`app/components/ui/`)

Existante et branchée sur les `.codex-*` : `Modal` (`.codex-modal*`), `Toast`
(`.codex-toast*`), `EmptyState` (`.codex-empty*`), `Skeleton` (`.codex-skeleton*`),
`Tooltip`, `ConfirmDialog`, `PageTransition`, `BackToTop`, `LazyImage`, `ActionMenu`,
`FormKit`, `PastillesUsage`. Montés globalement dans `app/dashboard/layout.tsx`
(`ToastHost`, `ConfirmDialogHost`, `BackToTop`).

### 3.10 Accessibilité — déjà en place (`globals.css:2257-2364`)

Piloté par `data-a11y-*` sur `<html>` : filtres daltonisme, police dyslexique,
haut contraste, `reduce-motion`, focus rings ARIA, skip-link. **Le haut contraste ne
cible que `.bg-gray-800`, `.bg-gray-700`, `.text-gray-400`, `.text-gray-500`** — donc
une surface qui n'utilise pas ces classes perd le mode haut contraste.

---

## 4. Comparaison avec `app/components/session/joueur/`

### 4.1 La cause racine : le thème n'y est jamais chargé

`ThemeLoader` n'est monté **que** dans `app/dashboard/layout.tsx:24`. Il n'existe **aucun
layout** sous `app/session/`, `app/presentation/`, `app/rejoindre/`.

Conséquence mécanique : sur `/session/[id]/joueur`, `<html>` n'a **ni `data-theme`, ni
aucune variable `--theme-*`**. Donc :

- les overrides `html[data-theme] .bg-gray-800 { … }` ne s'appliquent pas ;
- tout le traitement premium (fond grimoire, ornements, Cinzel) est inerte ;
- `var(--theme-accent, #C9A84C)` tombe systématiquement sur son fallback ;
- le choix de thème du MJ n'a **aucun effet** sur l'écran joueur.

Le mode session a donc été écrit **hors système**, et l'a compensé en codant tout en dur.
C'est le point à corriger en premier — pas un détail de style.

### 4.2 Aucune classe du design system n'est utilisée

Grep sur `app/components/session/joueur/*.tsx` pour
`codex-* | grim-* | grimoire-* | joueur-* | cockpit-*` : **0 occurrence, sur 14 fichiers.**

Même constat sur `app/components/session/mj/*.tsx` : **0 occurrence**. La divergence
concerne **tout le mode session**, MJ compris — utile à savoir pour la refonte.

### 4.3 Palette : `stone`/`yellow-600-800` au lieu de `gray`/`yellow-500`

Classes Tailwind dans `session/joueur/` (top) :

```
text-yellow-600 ×19    text-stone-500 ×16    border-yellow-800 ×14
bg-stone-900    ×12    text-yellow-100 ×8    text-stone-300   ×8
text-stone-400  ×7     bg-stone-800    ×5    text-cyan-300    ×5
```

**Aucune de ces classes n'est interceptée par le thème.** Le dashboard, lui, utilise
`text-gray-400` ×399 / `bg-gray-800` ×181 / `border-gray-700` ×173 — c'est-à-dire
exactement les classes que le thème sait remapper. `text-yellow-500` (remappé) apparaît
2 fois seulement côté joueur, contre 57 côté dashboard.

L'écart n'est pas cosmétique : `stone` est un gris **chaud brun**, `gray` un gris
**neutre froid**. Le poste joueur est donc *déjà* dans une autre ambiance que le thème
`eclipsed` par défaut.

### 4.4 Couleurs de fond réinventées

`#0e0b06` (brun très sombre) est codé en dur comme fond de page à **3 endroits** :
`SessionJoueur.tsx:92` et `:120`, `app/session/[id]/joueur/page.tsx` (le `Shell`).
`#15110a` sert de fond de carte (toast de jet, carte de sélection de perso).

Ces deux valeurs **n'existent nulle part ailleurs** dans l'app. Les équivalents du
système seraient `--theme-bg-primary` (`#0a0b0d`) et `--theme-bg-card` (`#12141a`).

### 4.5 Bordures : la bonne couleur, mais recopiée à la main

`rgba(201,168,76,0.18)`, `rgba(201,168,76,0.2)`, `rgba(201,168,76,0.25)`,
`rgba(201,168,76,0.3)`, `rgba(201,168,76,0.35)`, `rgba(201,168,76,0.4)`,
`rgba(201,168,76,0.5)`, `rgba(201,168,76,0.55)` — 8 opacités différentes de l'or,
écrites en `style={{ borderColor: … }}` dans 6 fichiers.

C'est la *bonne intention* (l'or dilué, cf. §3.1) implémentée **sans** le token : une
`color-mix(in srgb, var(--theme-accent) N%, transparent)` aurait donné le même rendu
tout en suivant le thème.

### 4.6 Georgia réinventé aussi

`style={{ fontFamily: 'Georgia, serif' }}` en inline dans `SessionJoueur.tsx:150`,
`ZoneDiffusion.tsx:98`, `app/session/[id]/joueur/page.tsx`. Même police que
`.grim-title` / `.grimoire-codex`, mais sans la graisse 300, sans le `letter-spacing`,
sans le `text-shadow` or — donc **un serif doré qui ne ressemble pas** aux titres du reste
de l'app.

### 4.7 Les composants partagés sont contournés

| Besoin | Ce qui existe | Ce que `joueur/` fait |
|---|---|---|
| Carte | `.codex-card` / `.grim-card` (filet gauche or) | `border-yellow-800/20 bg-stone-900/30` en Tailwind brut (`LigneDepliable.tsx:39-41`) |
| Modale | `<Modal>` + `.codex-modal*` | importe **seulement** `useModalEffects` puis reconstruit la modale à la main (`ZoneDiffusion.tsx:21`, `:131-142`) |
| Chargement | `.codex-spinner` / `.codex-loading` | `<p className="text-stone-400 text-sm italic">Chargement de ta fiche…</p>` (`SessionJoueur.tsx:93`) |
| État vide | `<EmptyState>` / `.codex-empty` | `<p className="text-stone-500 text-sm italic text-center py-8">` |
| Toast | `<Toast>` / `.codex-toast*` | bouton `fixed top-3` stylé à la main (`SessionJoueur.tsx:210-216`) |
| Pastille de condition | `.codex-condition-*` (7 animations : sparkle, zzz, flame, paralyzed, heal, dying, prone) | `bg-red-900/30 border-red-800/40 text-red-200`, statique (`SessionJoueur.tsx:139-142`) |
| Bouton pressé | `.codex-btn-press` / `.codex-press` | `active:scale-[0.98] transition` réécrit à la main |
| Bouton accent | `.bg-yellow-500` (thémé) ou `.grim-btn` | `bg-[#C9A84C] text-gray-900 hover:brightness-110`, valeur arbitraire Tailwind |
| Focus | `.codex-focus-ring` | rien |

Seuls `PastillesUsage` et `useModalEffects` sont réellement réutilisés.

### 4.8 Ce que `joueur/` apporte de neuf et de légitime

Tout n'est pas à jeter — deux éléments sont des **inventions justifiées** parce qu'aucun
équivalent n'existe dans le système :

- **`RoueJoueur`** (`RoueJoueur.tsx`) — demi-roue SVG à viewBox fixe `320×172`, centre
  `(160,168)`, rayons `R_ARC=154` / `R_OUT=142` / `R_IN=76`, 5 pétales de 36°, jauge de PV
  sur l'arc extérieur. Pièce d'identité forte, sans équivalent ailleurs.
- **`couleurPv()`** — code couleur PV `#4ade80` (>2/3) / `#f59e0b` (1/3–2/3) / `#ef4444`
  (<1/3) / `#6b7280` (0). Cohérent avec `PALETTE_CRIT_FAIL` et `.codex-condition-*`, mais
  **dupliqué** : `.cockpit-hp-fill`, `.combatj-row-fill`, `.presentation-card-hp-fill`
  portent la même logique de leur côté. Candidat à une factorisation.

Le point à garder pour la refonte : **la roue et le code PV sont à conserver ; leur
habillage — fonds, bordures, typo, cartes, états vides, modales — est à reprendre sur les
tokens existants.**

### 4.9 Récapitulatif des divergences

| Sujet | Reste de l'app | `session/joueur/` | Verdict |
|---|---|---|---|
| `ThemeLoader` monté | oui (`dashboard/layout.tsx`) | **non** | ⛔ cause racine |
| Classes `.codex-*` / `.grim-*` | 74 `.grim-card`, 31 `.codex-btn-press`… | **0** | ⛔ réinvente |
| Palette Tailwind | `gray-*` + `yellow-500` (thémés) | `stone-*` + `yellow-600/800` (figés) | ⛔ hors thème |
| Fond de page | `--theme-bg-primary` | `#0e0b06` en dur ×3 | ⛔ réinvente |
| Or | `color-mix(var(--theme-accent) N%)` | `rgba(201,168,76,0.xx)` ×8 variantes | ⚠️ bonne couleur, mauvais canal |
| Serif | `.grim-title` (Georgia 300 + tracking + glow) | `fontFamily: 'Georgia, serif'` inline | ⚠️ même police, rendu différent |
| Cartes | filet gauche or 2 px | `border-yellow-800/20` uniforme | ⛔ perd la signature |
| Modale / toast / vide / spinner | composants `ui/` | réécrits à la main | ⛔ réinvente |
| Conditions | `.codex-condition-*` animées | pastilles rouges statiques | ⛔ réinvente en moins bien |
| Ombres / rayons | `10px`/`8px` + ombres en couches | `rounded-xl`/`rounded-lg`, pas d'ombre | ⚠️ à aligner |
| Haut contraste a11y | cible `.bg-gray-*`/`.text-gray-*` | aucune de ces classes | ⛔ a11y perdue |
| Roue SVG + `couleurPv` | — | invention propre | ✅ à garder |

---

## 5. Points de vigilance documentés dans le code

À ne pas casser lors de la refonte — chacun est un bug déjà corrigé une fois :

1. **`transform` et `position: fixed`** — un `transform` (ou `will-change: transform`) sur
   un conteneur crée un bloc englobant qui **casse l'ancrage viewport des modales
   descendantes**. D'où `top: -1px` au lieu de `translateY` dans `.grim-card-hover`
   (`globals.css:1811-1818`), et le retrait du `transform` persistant de
   `.codex-page-transition` (`globals.css:4032-4038`). `SessionJoueur.tsx:17-19` reprend
   explicitement cette règle en commentaire.
2. **Pas de traitement premium sur les `<button>`** — tous les sélecteurs de carte portent
   `:not(button)`, sinon des « équerres dorées pas nettes » apparaissent sur les boutons
   (`globals.css:528-531`).
3. **Pas de rouge sang opaque en bordure** (`#8B0000`) — retiré volontairement, cf. §3.5.
4. **`.theme-no-deco`** est l'opt-out officiel du traitement premium.
5. **`npm install` est impossible** (proxy SSL) — toute solution doit rester sans nouvelle
   dépendance.

---

## 6. Synthèse en une phrase

L'identité de Master Screen tient à **l'or `#C9A84C` dilué sur fond quasi-noir, aux titres
Georgia 300 très espacés avec halo doré, aux cartes à filet gauche or de 2 px, aux filets
dégradés et losanges `◆`, et au d20 bleu cobalt à chiffre or** ; elle est portée par les
tokens `--theme-*` / `--codex-*` et par ~320 classes `.codex-*` / `.grim*` — dont le mode
session joueur **n'utilise strictement rien**, faute d'avoir jamais chargé `ThemeLoader`.
