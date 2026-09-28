# Recensement — Termes de jeu de rôle

> Section 4 de `app/roadmap-audit-app-et-espagnol.md`. **Recensement et classement seuls.
> Aucun terme n'a été remplacé dans le code.**
> Date : 2026-09-28.

## Avertissement

**Je ne suis pas juriste et je ne tranche pas ce qui est protégé.** Ce document classe ce qui
existe, par ordre de sensibilité apparente, pour que vous décidiez. Les remplacements suggérés sont
**indicatifs** et ne sont appliqués nulle part.

Un repère utile pour votre décision : une grande partie du vocabulaire ci-dessous provient du
**SRD** (*System Reference Document*), publié par son éditeur sous licence ouverte. Le code s'y
réfère explicitement (`app/data/bestiaire_dnd5e.ts:2` : « Bestiaire D&D 5e (SRD) »,
`app/data/items_dnd5e.ts:2` : « Items magiques D&D 5e (SRD) »). Ce qui relève du SRD n'a pas le
même statut que le **nom de la marque**, qui n'en fait pas partie.

## Vue d'ensemble

| Catégorie | Termes distincts | Occurrences | Sensibilité |
|---|---|---|---|
| A. Nom de marque | 5 | **75** | 🔴 la plus forte |
| B. Créatures signature | 11 | 28 | 🟠 forte |
| C. Noms propres de sorts / objets / lieux | 4 | 14 | 🟠 forte |
| D. Mécanique générique | ~15 | ~1 900 | 🟢 faible |
| E. Classes et espèces | 22 | ~520 | 🟡 à examiner |

---

## A. Nom de marque — 🔴 le plus sensible

| Terme | Occ. | Fichiers | Dont **visible à l'écran** | Remplacement indicatif |
|---|---|---|---|---|
| `D&D` | 47 | 35 | **Oui — 3 clés de langue + ~12 chaînes JSX** | « 5e », « le SRD », « les règles », ou rien |
| `DnD` | 12 | 10 | Non — identifiants, codes d'invitation | conserver ou renommer en interne |
| `dnd5e` | 7 | 7 | Non — **noms de fichiers** (`bestiaire_dnd5e.ts`, `sorts_dnd5e.ts`, `items_dnd5e.ts`, `dons_dnd5e.ts`) | renommage de fichiers |
| `SRD` | 9 | 6 | **Oui — 3 chaînes JSX** | c'est le terme *correct* à garder |
| `Player's Handbook` | 1 | 1 | Non — commentaire `dons_dnd5e.ts:4` | supprimer la mention |

### Les occurrences visibles à l'écran, à décider en premier

**Dans les fichiers de langue** (donc affichées telles quelles, dans les 3 langues) :

| Fichier | Clé | Valeur |
|---|---|---|
| `messages/fr.json:407` | `import_library` | `📚 Importer depuis la bibliothèque D&D` |
| `messages/en.json:407` | `import_library` | `📚 Import from D&D library` |
| `messages/es.json:407` | `import_library` | `📚 Importar desde la biblioteca de D&D` |

**Dans du JSX** (texte en dur, non traduit — cf. `docs/audit-traductions.md`) :

| Fichier:ligne | Texte affiché |
|---|---|
| `components/OnboardingTutorial.tsx:258` | « Un compagnon pour tes campagnes de **D&D** : scénarios, combats, PNJ, dés… » |
| `components/OnboardingTutorial.tsx:333` | « Fiche complète **D&D 5e** : stats, classes multiples, sorts, équipement » |
| `components/OnboardingTutorial.tsx:337` | « Bestiaire **D&D** et templates de PNJ prêts à importer » |
| `components/OnboardingTutorial.tsx:530` | Titre de carte « Bestiaire **D&D** » |
| `components/OnboardingTutorial.tsx:533` | Titre de carte « Sorts **D&D 5e** » |
| `components/OnboardingTutorial.tsx:534` | « Les sorts du **SRD** avec descriptions, niveaux, écoles… » |
| `components/RandomTip.tsx:20` | « Les sorts et items **D&D 5e** officiels sont importables… » |
| `components/RandomTip.tsx:33` | « Les conditions **D&D** (étourdi, paralysé…) s'appliquent en un clic » |
| `components/RandomTip.tsx:37` | « Le bestiaire **D&D 5e** est importable d'un clic » |
| `components/WildMagicRoller.tsx:124` | « Roll un d100 sur la table officielle **Wild Magic D&D 5e**. » |
| `dashboard/aide/page.tsx:164` | « Comment importer du contenu **D&D 5e** officiel ? » |
| `dashboard/ennemis/page.tsx:518` | `title="Importer depuis le bestiaire D&D 5e"` |
| `dashboard/personnages/page.tsx:778` | `title="Aide : créer un personnage D&D 5e"` |
| `dashboard/items/page.tsx:534` | `title="Générer un objet magique du SRD…"` |

> Le mot **« officiel »** revient plusieurs fois (« la table officielle », « du contenu D&D 5e
> officiel »). C'est le tour de phrase le plus exposé : il suggère un adoubement de l'éditeur.
> Indépendamment du nom de marque, il mérite d'être revu.

---

## B. Créatures signature — 🟠

Toutes dans les **données de jeu**, aucune dans l'interface.

| Terme | Occ. | Fichier(s) | Remplacement indicatif |
|---|---|---|---|
| Slaad | 9 | `data/bestiaire_dnd5e.ts` | « Crapaud du Chaos » |
| Drow | 5 | `data/bestiaire_dnd5e.ts`, `data/dnd5e.ts`, `data/noms_pnj.ts` | « Elfe noir » |
| Yuan-ti | 3 | `data/dnd5e.ts` | « Homme-serpent » |
| Otyugh | 3 | `data/bestiaire_dnd5e.ts`, `dashboard/maps/generer-donjon/page.tsx` | « Charognard des fosses » |
| Aboleth | 2 | `data/bestiaire_dnd5e.ts` | « Horreur abyssale » |
| Bulette | 2 | `data/bestiaire_dnd5e.ts` | « Requin-des-terres » |
| Beholder | 1 | `data/bestiaire_dnd5e.ts` | « Tyrannœil » |
| Mind Flayer | 1 | `data/bestiaire_dnd5e.ts` | « Dévoreur d'esprits » |
| Flagelleur (mental) | 1 | `data/bestiaire_dnd5e.ts` | idem — c'est la traduction française du précédent |
| Owlbear | 1 | `data/bestiaire_dnd5e.ts` | « Ours-hibou » |
| Kuo-toa | 1 | `data/situations_random.ts` | « Homme-poisson » |

*Non trouvés (absents du code) : Displacer Beast, Githyanki, Modron, Umber Hulk, Rust Monster,
Flumph, Tarrasque.*

Créatures au nom **générique** présentes en nombre et *a priori* non sensibles : Troll (28),
Gobelin (20), Kobold (5), Gnoll, Ogre, Zombie, Squelette, Goule, Spectre, Ombre.

---

## C. Noms propres de sorts, objets et lieux — 🟠

| Terme | Occ. | Fichier(s) | Nature | Remplacement indicatif |
|---|---|---|---|---|
| Vecna | 9 | `data/items_dnd5e.ts` | objets au nom d'un personnage (« Main de… », « Œil de… ») | « Main du Liche-Roi » |
| Tasha | 3 | `data/dnd5e.ts`, `data/sorts_dnd5e.ts` | sorts au nom d'un personnage | « Fou rire irrésistible » (le sort sans le nom propre) |
| Mordenkainen | 1 | `data/dnd5e.ts` | sort au nom d'un personnage | retirer le nom, garder l'effet |
| Zariel | 1 | `data/dnd5e.ts` | archidiablesse nommée | « Seigneur des Enfers » |

*Non trouvés : Bigby, Otiluke, Evard, Leomund, Melf, Otto, Rary, Drawmij, Tenser, Nystul,
Waterdeep, Baldur's Gate, Faerûn, Neverwinter, Ravenloft, Strahd, Tiamat, Bahamut.*

> ⚠️ Un premier comptage donnait « Otto » 67 et « Rary » 54. **Faux positifs de sous-chaîne**
> (« b**otto**m », « lib**rary** »). Après comptage à limites de mots : **0 occurrence** de l'un
> comme de l'autre.

---

## D. Mécanique générique — 🟢

Vocabulaire courant du jeu de rôle, présent dans tout le genre.

| Terme | Occ. |
|---|---|
| Constitution | 355 |
| Sagesse | 351 |
| Charisme | 345 |
| Avantage / Désavantage | 199 / 87 |
| Initiative | 134 |
| Repos court / long | 39 / 34 |
| Dextérité | 29 |
| Points de vie | 26 |
| Jet de sauvegarde | 11 |
| Bonus de maîtrise | 11 |
| Classe d'armure, Force, Intelligence, dés `d4`–`d100` | massif |

**Aucune action suggérée.** Remplacer ce vocabulaire rendrait l'app incompréhensible pour son
public sans bénéfice apparent.

---

## E. Classes et espèces — 🟡 à examiner

Noms de classes et d'espèces. La plupart sont du vocabulaire de fantasy ancien et commun
(Barde, Druide, Guerrier, Magicien, Paladin, Nain, Elfe, Gnome). Quelques-uns sont des
créations plus spécifiques à un éditeur — c'est là que votre arbitrage compte.

| Terme | Occ. | Note |
|---|---|---|
| Magicien | 84 | commun |
| Ensorceleur | 63 | commun |
| Barde | 52 | commun |
| **Occultiste** | 43 | traduction française d'un nom de classe spécifique |
| Druide | 40 | commun |
| Clerc | 39 | commun |
| **Artificier** | 30 | classe plus récente et spécifique |
| Paladin | 23 | commun |
| Guerrier | 21 | commun |
| Humain | 21 | commun |
| Rôdeur | 16 | commun |
| Elfe | 16 | commun |
| Nain | 15 | commun |
| Gnome | 10 | commun |
| **Tieffelin** | 10 | translittération d'un nom d'espèce spécifique |
| Halfelin | 7 | commun (proche d'un terme littéraire protégé par ailleurs) |
| Roublard | 7 | commun |
| Barbare / Moine | 6 / 6 | commun |
| **Aasimar** | 5 | nom d'espèce spécifique |
| Demi-orc | 4 | commun |
| **Drakéide** | 3 | nom d'espèce spécifique |

Les termes en gras (**Occultiste**, **Artificier**, **Tieffelin**, **Aasimar**, **Drakéide**) sont
ceux que je vous signale comme **incertains** : plus caractéristiques d'un éditeur que le fonds
commun de la fantasy. Je ne propose pas de remplacement — le choix dépend de l'identité que vous
voulez donner à l'app.

---

## Ce sur quoi je n'ai pas tranché

- **Le statut juridique de chaque terme.** Le tableau classe par sensibilité apparente, pas par
  droit applicable.
- **Le périmètre du SRD.** Savoir lesquels de ces monstres, sorts et objets en font partie demande
  de confronter le contenu au document de licence — cela vous revient.
- **Les données importables** (`bestiaire_dnd5e.ts`, `sorts_dnd5e.ts`, `items_dnd5e.ts` :
  240 Ko cumulés) : je n'ai recensé que les noms sensibles, pas relu chaque entrée.

## Si vous décidez de remplacer

Deux observations pour la roadmap dédiée :

1. **Le nom de marque est le plus facile** : 75 occurrences, dont ~15 seulement sont visibles à
   l'écran, toutes listées nominativement en §A. C'est quelques heures de travail.
2. **Les noms de créatures et d'objets sont plus délicats** : ils sont dans des données déjà
   **importées dans des comptes utilisateurs réels**. Renommer la source ne renomme pas ce que les
   MJ ont déjà copié dans leurs scénarios. Il faudra décider si la reprise vaut pour l'existant.
