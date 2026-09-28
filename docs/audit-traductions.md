# Audit — Traductions (FR / EN / ES)

> Section 3 de `app/roadmap-audit-app-et-espagnol.md`. **Recensement seul, rien n'a été corrigé.**
> Date : 2026-09-28. Analyse statique + **vérification visuelle réelle, app basculée en anglais**
> dans Chrome, puis **remise en français**.

## Le constat en une ligne

Les fichiers de langue sont **parfaits** (516 clés, trois langues, zéro trou). Le problème n'est pas
là : **seuls 16 fichiers sur 152 passent par le système de traduction.** Basculer l'app en anglais
laisse l'essentiel de l'interface en français.

> ⚠️ **À lire avant de décider de la Section 5** : l'espagnol **existe déjà et est déjà branché** —
> `messages/es.json` (516 clés, complet), type `Locale = 'fr' | 'en' | 'es'`, détection navigateur,
> et l'option « 🇪🇸 Español » est **présente dans le sélecteur de langue** (vérifié à l'écran).
> La Section 5 telle qu'écrite n'a donc plus d'objet — voir §6.

---

## 1. Le système en place

| | |
|---|---|
| Bibliothèque | **next-intl** (`NextIntlClientProvider`) |
| Fichiers | `messages/fr.json`, `messages/en.json`, `messages/es.json` |
| Provider | `app/i18n/IntlProvider.tsx`, monté dans `app/layout.tsx` |
| Usage | `const t = useTranslations('namespace')` puis `t('cle')` |
| Persistance | `localStorage['dnd-mj-locale']` **puis** colonne `profiles.langue` |

**Ordre de résolution** (`IntlProvider.tsx:60-92`) : `'fr'` au rendu serveur → localStorage ou
langue du navigateur → **profil en base, qui écrase tout**. C'est pourquoi modifier seulement
localStorage ne change rien ; il faut passer par le sélecteur.

---

## 2. Le point le plus important : le texte en dur

**16 fichiers sur 152** (~11 %) utilisent `useTranslations`. Les 136 autres affichent du texte
écrit en dur, invisible pour la traduction.

### Preuve visuelle — app réellement basculée en anglais

**Dashboard d'accueil** — traduits : `Global search`, `Customize home`, `DM/PLAYER`,
`FORGE/ADVENTURE`, `SETTINGS`, `Language`, `Accessibility`, `My account`, `Replay tutorial`,
`Sign out`, `Prepare a combat`, `Express combat`, `Tactical combat`, `CODEX`, `ADVENTURE`, `TOOLS`.

Restés en **français** à l'écran :

| Texte affiché | Où |
|---|---|
| `SCÉNARIO ACTIF` | autel du dashboard |
| `QUÊTES`, `DÉSACTIVER` | boutons sous l'autel |
| `Calculateur de re…` | sidebar › Aventure › Combat |
| `Cartes`, `Univers` | sections de la sidebar |
| `Tables d'effets` | sidebar › Outils |
| `Retours & suggesti…` | sidebar › Outils |
| `Aide` | sidebar › Outils |
| `Thèmes custom` | sidebar › Paramètres |

**Page `/dashboard/personnages`** — traduits : `Back`, `Characters`, `Create a character`,
`RANDOM GENERATOR`. Restés en **français** :

| Texte affiché | Nature |
|---|---|
| `NOUVEAU PERSONNAGE — COMMENT LE CRÉER ?` | titre de section |
| `RECOMMANDÉ` | badge |
| `Guidé` / `Étape par étape, avec les règles expliquées` | carte |
| `Rapide` / `Le formulaire complet, ci-dessous` | carte |
| `Surprends-moi` / `Un personnage complet, généré au hasard` | carte |
| `MÉTHODE STATS :` | label |
| `Nom du personnage *` | label de champ |
| `Ex : Alwin` | placeholder |
| `Classe` | label (devrait être « Class ») |
| `Humain`, `Barbare (d12) — For` | valeurs des listes déroulantes |

Ces dernières viennent des **données de jeu** (`app/data/dnd5e.ts`), pas de l'interface : elles
demanderont une stratégie distincte des libellés d'interface.

### Volume mesuré

| Mesure | Nombre |
|---|---|
| Textes JSX **accentués** en dur | 154 |
| Attributs `placeholder` / `title` / `aria-label` **accentués** en dur | 131 |
| **Total minimum** | **285** |

> Ce chiffre est un **plancher** : il ne compte que les chaînes portant un accent. « Combat »,
> « Notes », « Nom du scenario », « Ajouter », « Supprimer » n'y figurent pas. Le volume réel est
> nettement supérieur.

### Fichiers à externaliser en priorité

| Fichier | Chaînes accentuées |
|---|---|
| `app/dashboard/scenarios/[id]/edit/page.tsx` | 9 |
| `app/dashboard/combat-prepare/page.tsx` | 9 |
| `app/dashboard/scenarios/MindMap.tsx` | 8 |
| `app/dashboard/scenarios/[id]/quetes/page.tsx` | 8 |
| `app/dashboard/scenarios/[id]/recap/page.tsx` | 6 |
| `app/dashboard/scenarios/[id]/economie/page.tsx` | 6 |
| `app/dashboard/feedback/page.tsx` | 6 |
| `app/components/DiceLauncher.tsx` | 6 |
| `app/dashboard/tables-effets/page.tsx` | 5 |
| `app/components/presentation/CombatCockpitMJ.tsx` | 5 |
| `app/components/AttackRoller.tsx` | 5 |
| `app/dashboard/scenarios/[id]/calendrier/page.tsx` | 4 |
| `app/dashboard/personnages/[id]/ModaleMonteeNiveau.tsx` | 4 |
| `app/dashboard/maps/hexcrawl/page.tsx` | 4 |
| `app/components/session/mj/ZoneTravailMJ.tsx` | 4 |
| `app/components/OnboardingTutorial.tsx` | 4 |
| `app/components/MeteoGenerator.tsx` | 4 |

**Cas particulier — `app/components/Sidebar.tsx`** : partiellement traduit. Certaines entrées
passent par `t()`, d'autres sont en dur — c'est ce qui produit la sidebar mi-anglaise mi-française
vue plus haut. Exemples en dur : `'Calculateur de rencontre'` (l.310), `'Éditeur de cartes'`
(l.318), `'Carte du monde'` (l.325), `'Succès'` (l.352), `'Historique'` (l.354),
`"Tables d'effets"` (l.358), `'Retours & suggestions'` (l.360), `'Aide'` (l.362).

---

## 3. Parité des clés : irréprochable

| | FR | EN | ES |
|---|---|---|---|
| Clés | **516** | **516** | **516** |
| Manquantes par rapport au FR | — | **0** | **0** |
| Présentes en EN/ES mais pas en FR | — | **0** | **0** |
| Valeurs vides ou nulles | 0 | **0** | **0** |

**Aucune action requise sur les fichiers de langue.**

---

## 4. Clés définies mais jamais utilisées

**277 clés sur 516 (54 %)** n'apparaissent dans aucun appel `t()`.

| Namespace | Clés inutilisées |
|---|---|
| `spells` | 46 |
| `combat` | 46 |
| `dashboard` | 42 |
| `common` | 27 |
| `conditions` | 24 |
| `characters` | 23 |
| `search` | 15 |
| `items` | 12 |
| `login` | 8 |
| `palette` | 8 |
| `community` | 7 |
| `library` | 7 |
| `language` | 4 |
| `sidebar` | 3 |
| `scenarios` | 3 |
| `pnj` | 2 |

> **Réserve méthodologique** : un seul appel à clé dynamique existe
> (`CommandPalette.tsx:409` → ``t(`section_${c}`)``), il explique une partie des namespaces
> `palette` et `search`. Le reste des 277 est bien du vocabulaire mort.

Lecture la plus probable : ces clés ont été écrites **en prévision** d'une traduction des pages
correspondantes, qui n'a jamais eu lieu — ce sont les 136 fichiers du §2. **Elles ne sont donc pas
à supprimer : elles sont le plan de travail.**

---

## 5. Traductions oubliées ou inversées

### Anglais resté en français : aucun

Les 60 clés dont la valeur EN est identique à la valeur FR sont des mots réellement identiques dans
les deux langues (`Description`, `Notes`, `Public`, `Combat`, `Initiative`, `Items`, `Maps`,
`Race`, `Potion`, `Rare`, `Invisible`, `Email`, `Concentration`, `Grimoire`, `Exploration`,
`Type`…) ou des libellés volontairement bilingues (`dashboard.menu_language` =
« 🌍 Langue / Language »). **Rien à corriger.**

### Français resté en anglais : un cas

| Clé | Valeur FR | Attendu |
|---|---|---|
| `characters.method_4d6` | `"4d6 drop lowest"` | `"4d6, retirer le plus bas"` |

Confirmé à l'écran : le bouton affiche **« 4d6 drop lowest »** en français.
La valeur est identique dans les trois langues.

---

## 6. Conséquence pour la Section 5 (ajout de l'espagnol)

**La Section 5 telle qu'écrite est déjà réalisée.** Vérifié :

| Étape prévue en Section 5 | État réel |
|---|---|
| Créer `messages/es.json` sur le modèle de l'anglais | ✅ existe, 516 clés, même structure |
| Traduire toutes les clés | ✅ aucune clé vide |
| Ajouter l'espagnol au sélecteur de langue | ✅ « 🇪🇸 Español » visible à l'écran |
| Enregistrer l'espagnol dans la configuration | ✅ `Locale`, `MESSAGES`, `readStoredLocale`, `readNavigatorLocale` |
| Vérifier qu'aucune clé ne manque | ✅ 0 manquante |

**Ce qui resterait utile, en revanche** : l'espagnol souffre exactement du même mal que l'anglais —
il ne couvre que les 11 % de l'interface qui passent par `t()`. Le travail à valeur n'est pas
d'ajouter une langue, c'est **d'externaliser les 285+ chaînes en dur** (§2). Une fois fait, les
trois langues en profitent d'un coup.

À vérifier de votre côté : la **qualité** des traductions espagnoles existantes, que je n'ai pas
évaluée (je n'ai contrôlé que la complétude structurelle).

---

## Ce que cet audit ne couvre pas

- La qualité rédactionnelle des traductions EN et ES.
- Les chaînes de **données de jeu** (`app/data/*.ts` : classes, espèces, sorts, monstres) : elles
  ne sont pas dans le système de traduction et relèvent d'une décision à part — voir
  `docs/recensement-termes-jdr.md`.
- Le rendu de l'app en espagnol, non parcouru à l'écran.
