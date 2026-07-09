# ✨ ROADMAP REFONTE DES CRÉATIONS — Master Screen

## ⚠️ INSTRUCTIONS POUR CLAUDE CODE

Travaille en **autonomie complète**. Coche `[x]` quand fait, `[!]` si bloqué + note.
Génère les SQL dans `supabase/migrations/` avec timestamp. Vérifie `npm run build` souvent.
**Style grimoire** : sombre, or #C9A84C, Georgia serif, CSS variables des thèmes.

⚠️ Ne casse RIEN de l'existant. Les créations actuelles doivent continuer de fonctionner pendant la transition.

---

## 🎯 OBJECTIF

Les formulaires de création actuels sont austères et administratifs — ils cassent l'immersion d'une app pourtant très soignée. On les remplace par des interfaces qui **guident sans infantiliser** et qui donnent envie de créer.

**Deux approches selon la fréquence de création :**
- **Créations rares et structurantes** (scénario, personnage) → **assistant guidé** étape par étape
- **Créations fréquentes** (PNJ, ennemi) → **sélecteur de point de départ + formulaire avec dés de génération**

---

## 📜 PHASE 1 — ASSISTANT DE CRÉATION DE SCÉNARIO

### [ ] 1.1 - Sélecteur de point de départ
Au clic sur "Créer un scénario", afficher d'abord un choix (3 cartes cliquables) :
- **🪄 Guidé** (recommandé) : l'app pose des questions et construit le squelette
- **📐 Un modèle** : partir d'un template existant (les 8 templates déjà en base)
- **📄 Page blanche** : le formulaire classique (titre, description, notes) pour ceux qui savent ce qu'ils veulent

Style : cartes avec icône, titre, sous-titre explicatif. Le mode "Guidé" a un liseré doré + badge "Recommandé".

### [ ] 1.2 - L'assistant guidé (une question à la fois)
Interface : une seule question par écran, mise en avant.

**Éléments communs à chaque étape :**
- Barre de progression segmentée en haut (ex : "2 / 5")
- Question en Georgia serif, taille généreuse
- Sous-titre expliquant à quoi ça sert
- Réponses en **choix cliquables** (cartes/pastilles), pas des champs texte quand c'est possible
- Boutons : ← Retour · Passer · Suivant →
- "Passer" toujours disponible (ne jamais bloquer le MJ)

**Les questions (dans l'ordre) :**
1. **Titre de l'aventure** (champ texte + bouton 🎲 pour suggérer un titre évocateur)
2. **Combien de joueurs ?** (choix : 2-3 / 4-5 / 6+ / je ne sais pas encore)
3. **Niveau du groupe ?** (choix : 1-4 débutants / 5-10 aguerris / 11-16 héros / 17-20 légendes / mixte)
4. **Le cadre principal ?** (choix : Ville / Donjon / Nature sauvage / Mer & îles / Autres plans / Varié)
5. **Durée visée ?** (choix : One-shot / Mini-campagne (3-5 sessions) / Campagne longue / Sandbox ouvert)

⚠️ NE PAS demander le "ton" de l'aventure — le MJ le décide en jouant, pas dans un formulaire.

### [ ] 1.3 - Écran de génération (options cochables)
Après la dernière question, un écran récapitulatif propose des éléments à générer, TOUS OPTIONNELS (cases à cocher, décochables) :
- ☑ **Un nom de lieu / ville de départ** (généré selon le cadre choisi)
- ☑ **2-3 PNJ de départ** (générés avec nom + rôle + personnalité, adaptés au cadre)
- ☑ **Une première rencontre** (générée selon niveau et cadre : combat, social ou exploration)
- ☐ **Des chapitres vides pré-nommés** (selon la durée visée)

Le MJ coche ce qu'il veut, puis "Créer mon aventure".
Les éléments générés sont réellement créés en base et liés au scénario.

### [ ] 1.4 - Génération contextuelle
- Les PNJ générés utilisent les générateurs existants (noms par culture, personnalités)
- Le nom de lieu s'adapte au cadre (ville → nom de ville, donjon → nom de crypte/ruine, etc.)
- La première rencontre s'adapte au niveau du groupe (CR équilibré) et au cadre
- Réutiliser les systèmes existants (situations random, générateurs de noms, encounter builder)

---

## 👤 PHASE 2 — ASSISTANT DE CRÉATION DE PERSONNAGE

### [ ] 2.1 - Sélecteur de point de départ
Au clic sur "Créer un personnage" :
- **🪄 Guidé** (recommandé) : étape par étape, avec explications des règles
- **⚡ Rapide** : formulaire complet pour ceux qui connaissent D&D par cœur
- **🎲 Surprends-moi** : personnage complet généré aléatoirement (race/classe/caracs/historique), modifiable ensuite

### [ ] 2.2 - L'assistant guidé (flow D&D 5e)
Étapes, une par écran, avec barre de progression :

1. **Niveau** — quel niveau démarre le personnage ? (les stats/PV/dons s'ajusteront automatiquement)
2. **Race** — cartes cliquables avec l'illustration/icône, les bonus raciaux affichés
3. **Classe** — cartes cliquables, avec un résumé court ("Le Guerrier excelle au combat rapproché")
4. **Sous-classe** — proposée SEULEMENT si le niveau atteint le seuil requis pour cette classe
5. **Caractéristiques** — 3 méthodes au choix :
   - Répartition standard (15,14,13,12,10,8)
   - Achat de points (point buy, 27 points)
   - Jets de dés (4d6 drop lowest, avec bouton 🎲)
   Afficher les modificateurs calculés en direct, et suggérer une répartition adaptée à la classe
6. **Historique (background)** — cartes cliquables avec les compétences accordées
7. **Sorts** (si classe de lanceur) — sélecteur filtré par classe ET niveau, avec barre de recherche
8. **Équipement de départ** — proposé selon classe + historique, modifiable

### [ ] 2.3 - Aide contextuelle
- Sur chaque étape, une info discrète explique la règle ("Ta classe détermine tes capacités de combat et de magie")
- Les choix affichent leurs conséquences ("+2 FOR, +1 CON" sur une race)
- Un bouton "Pourquoi ?" optionnel pour les débutants
- Ne JAMAIS bloquer : bouton "Passer" partout, on peut compléter plus tard

### [ ] 2.4 - Respect des règles D&D 5e
- Les PV se calculent selon classe + niveau + modificateur de CON
- Le bonus de maîtrise selon le niveau
- Les emplacements de sorts selon classe et niveau
- Les dons proposés aux niveaux d'ASI (4, 8, 12, 16, 19 + bonus classe)
- Les sorts filtrés par classe et niveau accessible
(Ces règles ont déjà été corrigées dans une passe précédente — les réutiliser)

---

## 👹 PHASE 3 — CRÉATION PNJ & ENNEMIS (rapide et ludique)

### [ ] 3.1 - Sélecteur de point de départ
Au clic sur "Créer un PNJ" ou "Créer un ennemi", 4 cartes :
- **📖 Du bestiaire** (ennemis seulement) : import depuis le bestiaire D&D 5e
- **📋 Une variante** : partir d'un existant et le modifier
- **🎲 Surprends-moi** : tout généré aléatoirement, ajustable ensuite
- **📄 De zéro** : formulaire vide

### [ ] 3.2 - Formulaire enrichi avec dés de génération
Le formulaire garde sa structure actuelle (elle fonctionne bien), mais :
- **Un bouton 🎲 à côté de chaque champ générable** : nom, personnalité, secret, apparence, motivation, etc.
- Un clic sur le dé régénère UNIQUEMENT ce champ
- Un bouton **"🎲 Tout relancer"** en haut du formulaire régénère l'ensemble
- Brancher les générateurs existants (noms par culture, personnalités aléatoires) directement dans le formulaire
- Les champs restent librement éditables à la main

### [ ] 3.3 - Champs générables
**PNJ :**
- Nom (générateur par culture existant)
- Race, rôle/métier
- Personnalité (générateur existant)
- Apparence
- Motivation / objectif
- Secret (visible MJ uniquement)

**Ennemis :**
- Nom
- Type de créature
- Comportement tactique
- Butin potentiel

### [ ] 3.4 - Ne PAS transformer en wizard
Important : PNJ et ennemis se créent souvent en série (10 gobelins, 5 gardes). Le flow doit rester **rapide** : sélecteur → formulaire → créer. Pas d'étapes multiples obligatoires.

---

## 🎨 PHASE 4 — HARMONISATION VISUELLE DES FORMULAIRES

### [ ] 4.1 - Composant de formulaire cohérent
Pour tous les formulaires restants de l'app (items, sorts, maps, etc.) :
- **Labels au-dessus des champs** avec petite icône (pas juste des placeholders qui disparaissent)
- **Placeholders évocateurs** qui montrent le format attendu (ex : "La Crypte du Roi Sorcier" plutôt que "Nom du scénario")
- **Indications contextuelles** à droite des labels quand c'est utile ("Visible par tes joueurs" / "Privé")
- **Boutons d'action alignés à droite**, dimensionnés (PAS de bouton doré pleine largeur qui écrase le formulaire)
- Bouton secondaire "Annuler" à côté du bouton principal
- Séparateur fin avant la zone de boutons
- Ornement ◆ pour séparer l'en-tête du contenu (cohérent avec le dashboard)

### [ ] 4.2 - En-têtes de formulaire
- Titre en Georgia serif
- Sous-titre d'accroche court sous le titre (ex : "Donne vie à ta prochaine aventure")
- Action secondaire (ex : "Partir d'un modèle") en haut à droite

### [ ] 4.3 - Composant réutilisable
- Créer des composants réutilisables : `<FormField>`, `<FormHeader>`, `<FormActions>`, `<GenerateButton>` (le dé)
- Les appliquer partout pour garantir la cohérence

---

## 📱 PHASE 5 — RESPONSIVE

### [ ] 5.1 - Assistants sur mobile
- Les assistants guidés (scénario, personnage) doivent être parfaitement utilisables sur mobile
- Une question par écran = format idéal pour mobile
- Cartes de choix empilées en 1 colonne sur petit écran
- Boutons de navigation accessibles au pouce (touch targets ≥ 44px)

### [ ] 5.2 - Formulaires sur mobile
- Champs pleine largeur
- Les boutons 🎲 restent tapables (≥ 44px)
- Pas de débordement horizontal

---

## 📋 SQL À APPLIQUER

- [ ] supabase/migrations/...
(Probablement aucun SQL nécessaire — c'est essentiellement du front. Vérifier si les générations d'éléments liés nécessitent des colonnes.)

---

## 🐛 NOTES ET PROBLÈMES

-

---

## ✅ STATUT FINAL

Date de fin :
Phases complétées : __ / 5
Features complétées : __ / __
