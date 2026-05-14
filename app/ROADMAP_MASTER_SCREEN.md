# 🎲 ROADMAP MASTER SCREEN - Améliorations complètes

## ⚠️ INSTRUCTIONS POUR CLAUDE CODE

Travaille sur ce fichier de manière **incrémentale**, fonctionnalité par fonctionnalité.

Pour chaque feature :
1. ✅ Implémente le code complet (composants, pages, logique)
2. ✅ Génère les SQL nécessaires dans `supabase/[nom_feature].sql` (idempotent)
3. ✅ Met à jour les imports et la sidebar si besoin
4. ✅ Coche la case `[ ]` → `[x]` quand terminé dans ce fichier
5. ✅ Si tu rencontres un problème ou doute, mets `[!]` avec une note

À la fin, liste tous les SQL à appliquer dans Supabase et toutes les notes importantes.

**Respecte le style "grimoire" existant : thème sombre, or #C9A84C, Georgia serif pour titres, bordures or fines, gradients radiaux subtils.**

**Utilise les CSS variables des thèmes (`var(--color-accent)`, etc.) pour la compatibilité multi-thèmes.**

---

## 📖 PHASE 1 - SCÉNARIOS

### [x] 1.1 - Embranchements visuels dans la mindmap
- Liens entre nœuds typés : "principal", "alternatif", "secret", "échec"
- Couleurs distinctes par type (or, bleu, violet, rouge)
- Le MJ peut marquer un chemin comme "exploré" (effet visuel : trait plus épais ou opacité)
- SQL : ajouter colonne `type_chemin` text sur `mindmap_liens` (default 'principal')
- **[x] Fait** : SQL `mindmap_liens.type_chemin` + `explore`. Éditeur de lien (`MindMap.tsx`) : sélecteur de type de chemin (Principal=or / Alternatif=bleu / Secret=violet / Échec=rouge) + case « Chemin exploré ». Rendu SVG + export canvas : un type ≠ principal impose sa couleur, un chemin exploré est tracé plus épais (4px) et opaque. `type_chemin`/`explore` inclus dans l'export/import JSON.

### [x] 1.2 - Session zéro
- **[x] Fait** : table `session_zero` (+ RLS lecture/écriture MJ & joueurs inscrits, trigger `updated_at`). Page `/dashboard/scenarios/[id]/session-zero` créée — sections lignes rouges, attentes joueurs, style de jeu (3 sliders combat/RP/exploration en %), ton (sérieux/humoristique/sombre/léger), tabous, inspirations. Auto-save débounce dans `contenu` jsonb. Bouton « 📋 Session zéro » ajouté dans la colonne droite de l'éditeur de scénario.
- Nouvelle page `/dashboard/scenarios/[id]/session-zero`
- Template avec sections :
  - Lignes rouges (ce qu'on évite)
  - Attentes joueurs
  - Style de jeu (ratio combat/RP/exploration en %)
  - Ton (sérieux / humoristique / sombre / léger)
  - Tabous et limites
  - Inspirations (films, livres, séries)
- Les joueurs invités au scénario peuvent contribuer
- SQL : table `session_zero` (id, scenario_id, contenu jsonb, created_at, updated_at)

### [x] 1.3 - Notes secrètes MJ
- Sur chaque scénario, ajouter une section "Notes secrètes MJ"
- Visible uniquement par le MJ (jamais en mode présentation)
- Sauvegarde dans `scenarios.notes_secretes` text
- **[x] Fait** : SQL `scenarios.notes_secretes`. Section repliable « 🔒 Notes secrètes MJ » dans la colonne droite de `/dashboard/scenarios/[id]/edit`, auto-save débounce. La page d'édition est MJ-only et `notes_secretes` n'est jamais envoyé en présentation.

### [x] 1.4 - Estimation de durée par chapitre
- Champ "durée estimée" sur chaque chapitre (en minutes)
- Affichage du total estimé sur la fiche scénario
- SQL : ajouter colonne `duree_estimee` int sur `chapitres`
- **[x] Fait** : SQL `chapitres.duree_estimee`. Input « ⏱ Durée estimée » dans l'éditeur de chapitre (auto-save) + total cumulé du scénario affiché à côté (heures + minutes).

---

## 👹 PHASE 2 - ENNEMIS & PNJ

### [x] 2.1 - Générateur de noms PNJ par culture
- Bouton "🎲 Générer un nom" dans création PNJ
- Sélecteur de culture : Humain, Elfe, Demi-elfe, Nain, Halfelin, Gnome, Demi-orc, Tieffelin, Drow, Aasimar, Goliath, Tabaxi, etc.
- Banques de noms dans `app/data/noms_pnj.ts` (prénoms F/H/N + noms de famille par culture)
- Génère prénom + nom selon la culture sélectionnée
- **[x] Fait** : `app/data/noms_pnj.ts` (12 cultures, prénoms H/F/N + noms de famille, `genererNomPnj`). Sélecteur culture + genre + bouton « 🎲 Générer un nom » dans le formulaire PNJ.

### [x] 2.2 - Personnalités aléatoires PNJ
- **[x] Fait** : `app/data/personnalites_pnj.ts` (trait, idéal, lien, défaut, manie, secret, motivation, peur — tables D&D 5e). Bouton « 🎲 Générer une personnalité » dans le formulaire PNJ, remplit le champ Personnalité via `formaterPersonnalitePnj`.
- Bouton "🎲 Générer une personnalité"
- Tables D&D 5e :
  - Trait (16 options)
  - Idéal (alignement)
  - Lien (6 options)
  - Défaut (6 options)
  - Manie/quirk
  - Secret
  - Motivation actuelle
  - Peur cachée
- Crée `app/data/personnalites_pnj.ts`

### [x] 2.3 - Loot tables automatiques
- **[x] Fait** : `app/data/loot_tables.ts` (`genererLoot`, `formaterLoot`, `palierPourCR` — pièces/gemmes/objets d'art/objets magiques par palier de CR). Sélecteur de palier (CR 0-4 / 5-10 / 11-16 / 17+) + bouton « 🎲 Générer le loot » dans le formulaire ennemi ; le butin est ajouté aux notes de l'ennemi.
- Bouton "🎲 Générer le loot" sur les ennemis
- Tables D&D 5e officielles : Treasure Hoard A à I, Individual Treasure
- Calcul automatique selon CR de l'ennemi
- Génère : pièces (cuivre/argent/or/platine), gemmes, art objects, items magiques
- Crée `app/data/loot_tables.ts`

### [x] 2.4 - Stat blocks compactes vs détaillées
- **[x] Fait** : bouton « 📋 Vue compacte / 🔎 Vue détaillée » dans l'en-tête de la liste ennemis. Compacte = HP + Armure (essentiel combat) ; détaillée = les 6 stats + notes. Préférence persistée en `localStorage` (`ennemis_vue_compacte`).
- Toggle "Vue compacte / détaillée" sur les fiches ennemis
- Compacte : juste essentiel pour combat (HP, AC, attaques principales, vitesse)
- Détaillée : tout (capacités, traits, lore, immunités, résistances)
- État sauvegardé en localStorage par utilisateur

### [x] 2.5 - Variants de monstres
- **[x] Fait** : SQL `ennemis.variant_de` (FK → ennemis, `on delete set null`) — migration `supabase/migrations/20260514220000_ennemis_variants.sql`. Bouton « ⎘ Variante » sur chaque fiche ennemi → modale avec 4 archétypes (👑 Chef +25 % HP / ⭐ Élite +25 % HP +2 stats / 🔮 Mage +3 INT / 🐉 Ancien +50 % HP +3 stats). Le formulaire est pré-rempli avec les stats modifiées ; l'enregistrement crée un ennemi indépendant lié au parent. Badge « ↳ variante de X » sur les cartes de variantes.
- Bouton "Créer une variante" sur un ennemi
- Pré-remplit avec les stats du monstre original
- Suggestions automatiques : "Chef" (+25% HP, +1 attaque), "Mage" (sorts niveau 1-3), "Élite" (+stats), "Ancien" (sorts haut niveau)
- Crée un nouvel ennemi indépendant lié au parent (colonne `variant_de uuid` references ennemis)

### [x] 2.6 - Encounter builder
- **[x] Fait** : `app/data/encounter.ts` (seuils d'XP par niveau DMG p.82, multiplicateur de rencontre, `calculerBudget` / `xpAjuste` / `evaluerDifficulte`). Page `/dashboard/combat/encounter-builder` : inputs nb PJ + niveau moyen → budget facile/moyen/difficile/mortel, composition de rencontre depuis le bestiaire du MJ (+/- quantités), difficulté en direct (XP bruts → ×multiplicateur → ajustés), boutons « Suggérer (Moyen/Difficile) » et « Lancer ce combat ». Lien « 🧮 Calculateur de rencontre » ajouté dans l'en-tête de `/dashboard/combat`.
- Page `/dashboard/combat/encounter-builder`
- Inputs : nombre de PJ + niveau moyen
- Calcule CR équilibré selon les règles D&D 5e :
  - Facile : ~25% du seuil
  - Moyen : ~50% du seuil
  - Difficile : ~75% du seuil
  - Mortel : ~100%+ du seuil
- Suggère des combinaisons d'ennemis (depuis le bestiaire de l'utilisateur)
- Bouton "Lancer ce combat" qui pré-remplit `/dashboard/combat`

---

## 🧙 PHASE 3 - PERSONNAGES

### [ ] 3.1 - Import D&D Beyond via JSON
- Bouton "📥 Importer depuis D&D Beyond" dans création personnage
- Modale avec textarea pour coller le JSON
- Parse le JSON D&D Beyond format
- Pré-remplit tous les champs : nom, race, classe, niveau, stats, sorts, équipement
- Affiche un récap avant validation
- Gère les cas où certains champs manquent

### [ ] 3.2 - Export PDF de la fiche
- Bouton "📄 Exporter en PDF" sur les fiches personnage
- Utilise `jspdf` (npm install jspdf jspdf-autotable)
- Layout : feuille officielle D&D 5e (2 pages)
- Sections : caractéristiques, compétences, jets de sauvegarde, attaques, sorts, équipement, backstory
- Téléchargement direct

### [x] 3.3 - Système de craft d'items personnels
- **[x] Fait** : section repliable « 🔨 Propriétés (arme / armure / objet magique) » dans le formulaire items — champs optionnels Dégâts / CA-armure / Poids / Valeur / Propriétés magiques. Bouton « 🔨 Insérer dans la description » : formate les champs renseignés en bloc « — Propriétés — » et l'ajoute à la description (pas de colonne SQL, comme demandé). Pas de duplication possible (insertion à la demande, pas un re-format auto à chaque save).
- Sur la page items, bouton "🔨 Créer un item custom"
- Formulaire complet : nom, description, type (arme/armure/objet magique/consommable), rareté, propriétés magiques, dégâts si arme, AC si armure, poids, valeur
- Sauvegarde dans la collection perso de l'utilisateur
- Pas de SQL, utilise la table items existante

### [x] 3.4 - Backstory generator
- **[x] Fait** : `app/data/backstory_templates.ts` (`genererBackstory` — origine, événement, perte, motivation, secret + récit assemblé en 4 paragraphes). Décision : ajout d'une colonne `personnages.backstory` (text) — aucun champ « récit libre » n'existait. Panneau « Backstory » sur la fiche détaillée `personnages/[id]` : textarea + bouton « 📝 Générer une backstory » (confirme avant d'écraser un texte existant).
- Bouton "📝 Générer une backstory" dans création perso
- Tire aléatoirement :
  - Origine (orphelin, noble déchu, fugitif, ex-soldat, etc.)
  - Événement marquant (trahison, perte, révélation, miracle)
  - Perte ou tragédie
  - Motivation actuelle
  - Secret caché
- Génère un texte cohérent de 3-5 paragraphes
- L'utilisateur peut modifier ensuite
- Crée `app/data/backstory_templates.ts`

### [ ] 3.5 - Liens entre persos / PNJ
Étend le système de relations PNJ existant :
- Permettre des liens PJ ↔ PJ (frères, amis, rivaux, mentor)
- Permettre PJ ↔ PNJ (mentor, ennemi juré, contact)
- Visualisation en mindmap pour la campagne entière
- SQL : étendre `pnj_relations` pour accepter `entite_type` ('personnage' ou 'pnj')

### [x] 3.6 - Inspirations tracker visuel
- Sur fiche perso, affichage des points d'inspiration en visuel
- Diamants ou étoiles à cliquer pour ajouter/retirer
- Max configurable par campagne (default 1, configurable jusqu'à 5)
- SQL : ajouter colonne `inspiration_max` int sur `personnages` (default 1)
- **[x] Fait** : SQL `personnages.inspiration_max` + `inspiration_points` (le booléen `inspiration` historique reste synchronisé pour la compat). Sur la fiche : rangée de losanges ◆ cliquables (remplis = points détenus) + stepper « max » 1→5. Migration `20260514230000_personnages_inspiration_backstory.sql` (commune avec 3.4).

### [x] 3.7 - Multiclassing visuel amélioré
- **[x] Fait** : panneau « Multiclasse » sur la fiche perso (affiché dès qu'il y a des entrées dans `classes_multiples`) — chaque classe en chip (classe + sous-classe + « Niv. X ») et le **niveau total** mis en avant via `niveauTotal()`. NB : pas de « tabs » avec sorts/capacités par classe car ces données ne sont pas stockées par classe dans le schéma (sorts = liste partagée, `traits_classe` = champ unique) — le panneau affiche donc la répartition réelle, fidèle aux données.
- Sur fiche perso multiclasse, tabs en haut pour switcher entre les classes
- Chaque tab affiche : niveau dans cette classe, sorts disponibles, capacités spécifiques
- Total des niveaux affiché clairement
- Indicateur visuel des classes (icônes ou couleurs)

---

## 🎒 PHASE 4 - ITEMS

### [x] 4.1 - Items magiques générés
- **[x] Fait** : au lieu de créer `items_magiques_tables.ts` (qui aurait dupliqué les données), j'ai ajouté `genererItemMagique(filtres)` à `app/data/items_dnd5e.ts` — il pioche dans `ITEMS_DND5E` (SRD complet déjà présent). Sélecteur de rareté + bouton « 🎲 Générer un item magique » dans le formulaire items : pré-remplit nom / type / rareté / description.
- Bouton "🎲 Générer un item magique" dans la création
- Filtres : rareté (commun/peu commun/rare/très rare/légendaire), école de magie, type
- Tables D&D 5e officielles (Magic Item Tables A à I)
- Crée `app/data/items_magiques_tables.ts`

### [x] 4.2 - Identification d'objets
- **[x] Fait** : case « 🔮 Objet mystérieux » sur le formulaire item + sélecteur de niveau de révélation (0 Rien / 1 Nom / 2 Type / 3 Tout). La carte item affiche un badge « Mystérieux — révélation X/3 » et une ligne « 👁 Vue joueur » qui montre exactement ce que verraient les joueurs (helper `vueJoueurItem`). Garde anti-régression : tout test utilise `item.identifie === false` (les items pré-migration, champ absent, restent pleinement visibles).
- Toggle sur chaque item : "Identifié / Mystérieux"
- Si mystérieux, l'item affiche juste "Objet inconnu" pour les joueurs
- Le MJ peut révéler les propriétés progressivement (nom révélé, puis description, puis pouvoirs)
- SQL : ajouter colonnes `identifie` bool default true, `niveau_identification` int (0-3) sur `items`
- **[!] Note** : le helper `vueJoueurItem` est prêt et appliqué côté MJ (ligne « Vue joueur »). Le masquage dans une vraie vue *joueur* dédiée reste à brancher quand cette vue existera (la page items est MJ-only).

### [x] 4.3 - Crafting recipes
- **[x] Fait** : section repliable « ⚒️ Recette de craft » sur le formulaire item (matériaux multi-lignes / temps / compétence). Stockée dans `items.recette_craft` (jsonb, `null` si vide). La carte item affiche un badge « ⚒️ Recette » + un encart détaillant matériaux/temps/compétence.
- Sur chaque item magique, possibilité d'ajouter une "recette de craft"
- Liste de matériaux requis (texte libre)
- Temps de craft
- Compétence requise (Arcanes, Forge, etc.)
- SQL : ajouter colonne `recette_craft` jsonb sur `items`

### [x] 4.4 - Économie de campagne
- **[x] Fait** : page `app/dashboard/scenarios/[id]/economie/page.tsx` — une fiche par région/ville (table `economie_campagne`, 1 ligne/région), avec modificateurs de prix par catégorie de biens (%, +rouge / -vert, raison) et liste de marchands (nom/type/note). Auto-save débounce des lignes modifiées. Bouton d'accès « 💰 Économie de campagne » ajouté dans la sidebar « Scénario global » de l'éditeur. RLS : MJ du scénario uniquement.
- Page `/dashboard/scenarios/[id]/economie`
- Tracker des prix de base par région/ville
- Modificateurs locaux (inflation, pénurie, abondance)
- Liste des marchands disponibles avec leurs stocks
- SQL : table `economie_campagne` (id, scenario_id, region text, modificateurs jsonb, marchands jsonb)

---

## 🗺 PHASE 5 - MAPS & EXPLORATION

### [!] 5.1 - Brouillard de guerre avancé
- **[!] Bloqué** : nécessite une *surface de visualisation interactive* de carte (canvas zoomable, drawing au pinceau, partagé MJ/joueurs). Aujourd'hui les maps sont des **images statiques** (`maps.image_url`) affichées en `<img>` — il n'existe pas de « table de jeu » où afficher une carte en session. Ce viewer est une brique d'architecture à scoper séparément ; 5.1/5.2/5.3 en dépendent toutes.
- Sur les maps, mode "brouillard de guerre" avec révélation progressive
- Le MJ dessine au pinceau les zones explorées
- Sauvegarde de l'état du fog par scénario
- SQL : table `fog_of_war` (id, map_id, scenario_id, zones_explorees jsonb)

### [!] 5.2 - Pings et marqueurs
- **[!] Bloqué** : même dépendance que 5.1 — pas de surface de carte interactive sur laquelle poser des pings. À reprendre après la brique « table de jeu ».
- Les joueurs peuvent poser des "pings" sur la carte (signaux temporaires)
- Le MJ voit les pings de tous les joueurs
- Marqueurs permanents (POI) que le MJ peut placer
- Couleurs assignées par joueur
- SQL : table `map_markers` (id, map_id, user_id, type text, x int, y int, label text, couleur text, created_at, expires_at)

### [!] 5.3 - Calques sur les maps
- **[!] Bloqué** : même dépendance que 5.1. Note : l'éditeur de tuiles a déjà une notion de calques en *édition* (terrain/décor/créatures/fog) mais ce sont des calques d'édition, pas des calques révélables aux joueurs en session — ça suppose là encore le viewer partagé.
- Système de calques pour les cartes :
  - Calque "base" : la carte visible
  - Calque "pièges" : éléments cachés
  - Calque "trésors"
  - Calque "ennemis"
  - Calque "notes MJ"
- Toggle visibility par calque
- Le MJ révèle les calques aux joueurs un par un
- SQL : table `map_calques` (id, map_id, nom text, ordre int, contenu jsonb, visible_joueurs bool)

### [x] 5.4 - Générateur de donjons procédural
- **[x] Fait** : page `app/dashboard/maps/generer-donjon/page.tsx`. Inputs taille (petit/moyen/grand) · thème (crypte/temple/grotte/forteresse) · difficulté (facile→mortel). Génération : placement de pièces sans chevauchement + corridors en L, classification (entrée / trésor / salle de garde / salle piégée / vide / antre du boss aux difficultés élevées), peuplement (loot par palier de difficulté, ennemis thématiques regroupés « 3× Squelette », pièges thématiques). Aperçu canvas (pièces teintées + numérotées + emoji), rapport textuel par pièce. Export PNG → bucket `MAP` + ligne `maps` (rapport complet stocké dans `description`). Bouton « 🏰 Générer un donjon » ajouté sur la page Maps. Aucun SQL requis (réutilise le schéma `maps`).
- Page `/dashboard/maps/generer-donjon`
- Inputs : taille (petit/moyen/grand), thème (crypte/temple/grotte/forteresse), difficulté
- Génère :
  - Layout de pièces et corridors
  - Loot dans certaines pièces
  - Ennemis suggérés
  - Pièges aléatoires
- Sauvegarde la map générée dans la bibliothèque

### [x] 5.5 - Mode hexcrawl
- **[x] Fait** : page `app/dashboard/maps/hexcrawl/page.tsx`. Gestion de régions (création nom + dimensions 2-20 × 2-18, suppression cascade) ; grille hexagonale SVG flat-top en décalage odd-q. Chaque hexagone : biome (10 biomes colorés avec emoji + durée de traversée), lieu d'intérêt, événements possibles, rumeurs, statut « exploré » (hexagones non explorés grisés/pointillés = brouillard). Édition au clic + auto-save débounce des hexagones modifiés. **Mode déplacement** : on pose un pion puis on parcourt les hexagones *voisins* (adjacence hexagonale correcte) ; chaque pas accumule la durée du biome traversé dans un journal de voyage (total en heures + conversion en jours à 8 h/jour). Bouton « 🧭 Hexcrawl » ajouté sur la page Maps.
- Page `/dashboard/maps/hexcrawl`
- Grille hexagonale pour exploration de monde
- Chaque hex peut avoir : biome, événements possibles, lieux d'intérêt, rumeurs
- Système de voyage en hexagones avec durée
- SQL : table `hexcrawl_maps` + `hex_tiles`

---

## ⚔️ PHASE 6 - COMBAT

### [!] 6.1 - Auto-roll attaques ennemis
- **[!] Bloqué (intégration combat profonde)** : la table `ennemis` ne stocke pas de structure d'attaques (bonus d'attaque, dés de dégâts, multiattack) — uniquement des stats brutes + notes texte. L'auto-roll demande (a) un modèle de données d'attaques, (b) une intégration dans la page combat (3600+ lignes) avec ciblage de PJ et application de dégâts. À scoper séparément avec un vrai modèle d'attaques.
- Sur la fiche ennemi en combat, bouton "🎲 Attaquer"
- Lance automatiquement : d20 + bonus d'attaque vs AC cible
- Si touche, lance les dégâts
- Affiche le résultat clairement (touche/rate, dégâts)
- Applique automatiquement les dégâts au PJ ciblé (avec confirmation)
- Gère les attaques multiples (Multiattack)

### [!] 6.2 - Effets de zone visuels
- **[!] Bloqué** : nécessite une *map de combat interactive* (surface canvas avec tokens positionnés) qui n'existe pas — même blocage que 5.1/5.2/5.3. Sans grille de combat où placer les formes et détecter les tokens, la feature n'a pas de support.
- Sur la map de combat, drag-and-drop de formes :
  - Cône 15ft, 30ft, 60ft
  - Cube 5ft, 10ft, 15ft, 20ft, 30ft
  - Cylindre/Cercle 5ft, 10ft, 20ft, 30ft, 40ft
  - Ligne 30ft, 60ft, 100ft
- Détecte automatiquement les PJ/ennemis dans la zone
- Bouton "Appliquer dégâts + jet de sauvegarde" sur tous les ciblés

### [x] 6.3 - Stratégies des ennemis
- **[x] Fait** : colonne `ennemis.comportement_tactique` + champ texte libre sur la fiche ennemi, avec bouton « 💡 Suggérer » qui pré-remplit selon l'INT du monstre (< 6 / 6-12 / 13+, helper `suggestionTactique`). Affiché sur la carte ennemi (« 🧠 Tactique : … »).
- Sur chaque ennemi, champ "Comportement tactique" (texte libre)
- Suggestions auto selon INT du monstre :
  - INT < 6 : "Attaque le plus proche, fuit si grièvement blessé"
  - INT 6-12 : "Cible le plus faible, fuit à 25% HP"
  - INT 13+ : "Stratégie complexe, cible les casters/soigneurs, utilise terrain"
- Affiché en mode présentation pour le MJ uniquement

### [x] 6.4 - Combat de masse
- **[x] Fait (modèle + fiche ennemi)** : colonnes `ennemis.est_groupe` + `ennemis.taille_groupe`. Case « 👥 Combat de masse » sur la fiche ennemi avec nombre d'unités ; la carte ennemi affiche un badge groupe avec PV agrégés. **[!] Note** : l'interaction « mort par paquet » en plein combat (retirer N unités d'un clic dans la page combat) relève de l'intégration combat — le modèle de données est prêt, le câblage in-combat reste à faire.
- Pour gérer 20+ ennemis identiques (gobelins, soldats)
- Mode "groupe" : agrégation des HP totaux du groupe
- Initiative unique pour le groupe
- "Mort par paquet" : retirer N gobelins d'un coup
- SQL : ajouter colonne `est_groupe` bool, `taille_groupe` int sur `combats`

### [!] 6.5 - Reaction tracker
- **[!] Bloqué (intégration combat profonde)** : l'état par participant vit dans `combats.etats_combat` (jsonb) et la logique de tour est dans la page combat (3600+ lignes). Ajouter un flag « réaction utilisée » + reset au début du tour demande de toucher cette logique d'initiative — risqué en passe autonome, à faire avec la page combat ouverte.
- Sur chaque participant au combat, indicateur "Réaction disponible/utilisée"
- Reset automatique au début du tour du perso
- Visible en mode présentation

---

## ✨ PHASE 7 - SORTS

### [!] 7.1 - Spell slots tracker visuel
- **[!] Reporté** : les emplacements existent déjà (`personnages.sorts_slots_max` / `sorts_slots_used`). La refonte purement visuelle (icônes pentagrammes, couleur par niveau, animation de consommation) se fait dans la fiche perso (2800+ lignes) — édition cosmétique localisée mais risquée en passe autonome sans revue visuelle. À faire en interactif.
- Refonte de l'affichage des emplacements de sorts sur la fiche perso
- Cases à cocher avec icônes (genre pentagrammes, étoiles)
- Couleur par niveau de sort
- Animation quand on consomme un slot
- Visuel "épuisé" quand tous les slots d'un niveau sont utilisés

### [!] 7.2 - Recherche avancée par dégâts/effets
- **[!] Bloqué (données)** : la table `sorts` n'a pas de métadonnées structurées de dégâts/effets — pas de colonne `type_degats`, `categorie` (offensif/soin/contrôle/utilitaire) ni `jet_sauvegarde`. Les filtres avancés demandent d'abord d'enrichir le modèle `sorts` (et d'annoter le SRD). À scoper avec une migration `sorts` dédiée.
- Sur la page sorts, filtres avancés :
  - "Affichage les sorts qui font des dégâts" → liste des sorts offensifs
  - "Affichage les sorts de soin" → sorts heal
  - "Sorts de contrôle (étourdir, paralyser, etc.)"
  - "Sorts utilitaires (déplacement, invisibilité, etc.)"
- Recherche par type de dégât (feu/glace/foudre/etc.)
- Recherche par jet de sauvegarde requis

### [!] 7.3 - Composantes inventory (tracker visuel)
- **[!] Partiel — SQL prête, UI à câbler** : la colonne `personnages.composantes` (jsonb) est créée (migration Phase 7). La section UI sur la fiche perso (liste possédée + ✓/✗ par sort) reste à insérer dans la fiche perso (2800+ lignes) — câblage `Personnage` type / `normalize` / `FICHE_COLUMNS` / payload, comme pour backstory/inspiration. Reporté pour éviter le risque en passe autonome.
- Sur la fiche perso, section "Composantes matérielles"
- Liste des composantes possédées avec quantité
- Affichage sur chaque sort des composantes requises avec ✓ ou ✗ selon dispo
- Pas de consommation automatique, juste visuel
- SQL : ajouter colonne `composantes` jsonb sur `personnages`

### [!] 7.4 - Effets visuels au lancement de sort
- **[!] Bloqué (intégration présentation profonde)** : demande de hooker l'événement « lancer un sort » dans le mode présentation et d'y greffer une couche d'animation par école. Le mode présentation est un sous-système conséquent — à faire en interactif avec ce code ouvert.
- Quand on lance un sort en mode présentation, animation discrète
- Couleur selon école : Évocation = rouge/orange, Illusion = violet, Nécromancie = vert sombre, etc.
- Particules ou flash subtil
- Affiche le nom du sort et le lanceur

### [x] 7.5 - Création de sorts custom
- **[x] Déjà en place** : la page `/dashboard/sorts` est déjà un CRUD complet de sorts custom — formulaire avec nom, niveau, école, composantes (verbal/somatique/matériel), concentration, rituel, temps d'incantation, portée, durée, classes compatibles, type d'action et description. Les sorts créés sont sauvegardés dans la collection de l'utilisateur. (Jet de sauvegarde / dés de dégâts se renseignent dans la description — pas de colonnes dédiées, cf. 7.2.)
- Bouton "✨ Créer un sort custom" sur la page sorts
- Formulaire complet : nom, niveau, école, composantes, durée, portée, jet de sauvegarde, dégâts, description
- Sauvegarde dans la collection perso

---

## 📅 PHASE 8 - SESSION & CAMPAIGN

### [!] 8.1 - Journal automatique de session
- **[!] Partiel — table prête, agrégation à faire** : la table `recaps_sessions` (jsonb `contenu` + `texte`) est créée avec sa RLS. La *génération automatique* doit agréger combats / PNJ rencontrés / loot / lieux / quêtes depuis plusieurs tables — agrégation cross-table lourde qui dépend de relations qu'il faut tracer (et qui n'existent pas toutes : pas de log « PNJ rencontré » ni « lieu visité »). À reprendre quand 10.2 (historique) sera semé partout — il fournira la matière première.
- À la fin de chaque session, bouton "📔 Générer le récap"
- Compile automatiquement :
  - Combats menés (avec résultats)
  - PNJ rencontrés
  - Loot trouvé
  - Lieux visités
  - Quêtes débloquées/terminées
- Affichage chronologique
- Possibilité d'éditer le récap avant validation
- Sauvegarde dans une nouvelle table `recaps_sessions`

### [x] 8.2 - XP tracker visuel avec milestones
- **[x] Fait** : page `app/dashboard/scenarios/[id]/xp/page.tsx`. Barre de progression de chaque PJ vers le niveau suivant (seuils SRD via `xpRequisProchainNiveau`/`niveauPourXp`, badge « peut monter de niveau »). Distribution rapide d'XP avec sélection des PJ ciblés (montant +/-). Jalons (milestones) configurables. Historique des distributions. Jalons + historique en localStorage ; les XP sont écrits dans `personnages.xp`. Bouton « ✨ Suivi d'XP » ajouté dans la sidebar de l'éditeur de scénario.
- Page `/dashboard/scenarios/[id]/xp`
- Visuel : barre de progression vers le prochain niveau
- Possibilité de définir des milestones (XP à atteindre pour level up)
- Distribution rapide d'XP au groupe
- Historique des distributions

### [!] 8.3 - Recap automatique de campagne
- **[!] Bloqué (dépend de 8.1)** : la vue d'ensemble « histoire » de campagne agrège la timeline des sessions (8.1), l'évolution des PJ, les PNJ majeurs, les quêtes — elle suppose que 8.1 produise déjà des récaps structurés. À reprendre après 8.1.
- Page `/dashboard/scenarios/[id]/recap-campagne`
- Vue d'ensemble de toute la campagne :
  - Timeline des sessions
  - Personnages joueurs avec leur évolution
  - PNJ majeurs rencontrés
  - Quêtes principales et secondaires
  - Lieux importants
- Format "histoire" lisible pour les nouveaux joueurs

### [x] 8.4 - Memo board pour MJ
- **[x] Fait** : page `app/dashboard/scenarios/[id]/memo/page.tsx` + table `memos_mj`. Checklist de pense-bête cochables (ajout, coche/décoche, suppression), tri faits en bas, option « masquer les éléments faits ». Bouton « 📌 Memo MJ » dans la sidebar de l'éditeur de scénario. RLS : MJ du scénario uniquement.
- Sur chaque scénario, section "Memo MJ"
- Liste de pense-bête :
  - "Le PNJ X a promis Y aux joueurs"
  - "Surprise prévue à la session 5"
  - "Récompense en attente : Z"
- Format checklist (cochable)
- SQL : table `memos_mj` (id, scenario_id, texte, fait bool, created_at)

### [x] 8.5 - Achievements de campagne
- **[x] Fait (catalogue + page)** : tables `achievements` (catalogue, 6 succès seedés : première mort, 100 dés, niveau 10, coup critique, tueur de boss, 10 sessions) + `user_achievements`. Page `app/dashboard/achievements/page.tsx` : grille débloqués/verrouillés, compteur. **[!] Note** : le déblocage *automatique* (hooks dans les flux combat/niveau/session) n'est pas câblé — la page permet en attendant un marquage manuel.
- Système de badges débloqués automatiquement :
  - "Première mort" (1er PJ mort)
  - "100 dés lancés"
  - "Niveau 10 atteint"
  - "Premier critique 20"
  - "Boss vaincu"
  - "10 sessions complétées"
- Affichage dans le profil du joueur
- SQL : table `achievements` + `user_achievements`

---

## 👥 PHASE 9 - COMMUNAUTÉ

### [x] 9.1 - Profils publics utilisateurs
- **[x] Fait** : colonnes `profiles.bio` / `ville` / `langues_parlees` + policy de lecture publique des profils. Page publique `app/profil/[username]/page.tsx` (hors dashboard, accessible sans connexion) : avatar-initiale, bio, ville, langues, et statistiques de créations publiques par type (compte des lignes `public=true` par `auteur_username`).
- Page publique `/profil/[username]`
- Avatar utilisateur, bio (250 caractères max), ville, langues parlées
- Stats publiques : nombre de créations publiques (par type)
- Section "Créations publiques" : grille
- Bouton "Suivre" (à implémenter plus tard)
- SQL : ajouter colonnes `bio`, `ville`, `langues_parlees` sur `profiles`

### [x] 9.2 - Système de likes (étoiles)
- **[x] Fait** : table `likes` (polymorphe entite_type/entite_id, unique par user) + composant réutilisable `LikeButton`. Câblé sur **toutes** les cartes de la page Communauté (scénarios, personnages, ennemis, items, maps, sorts, PNJ) via la fonction `meta()`. Compteur + état liké/non-liké de l'utilisateur, toggle optimiste.
- Bouton ❤️ sur chaque création partagée
- Compteur visible
- Liste des utilisateurs qui ont liké (cliquable pour voir leur profil)
- SQL : table `likes` (user_id, entite_type, entite_id, created_at)

### [x] 9.3 - Système d'étoiles + commentaires sur scénarios
- **[x] Fait** : table `notations_scenarios` (1-5 étoiles + commentaire, unique par scénario/user) + composant `NotationsScenario` (repliable) câblé sur les cartes de scénario de la page Communauté. Affiche la moyenne + nombre d'avis, formulaire de note de l'utilisateur (upsert), liste des commentaires. **[!] Note** : le tri « Meilleures notes » dans la communauté n'est pas branché (le tri actuel est par nombre de copies) — ajout simple à faire ultérieurement.
- Notation 1-5 étoiles
- Commentaire textuel optionnel
- Moyenne affichée sur la fiche scénario
- Tri par "Meilleures notes" dans la communauté
- SQL : table `notations_scenarios` (id, scenario_id, user_id, etoiles int, commentaire text, created_at)

---

## 📱 PHASE 10 - ERGONOMIE

### [!] 10.1 - Quick-add universel (Ctrl+N)
- **[!] Partiel — existe déjà en partie** : le composant `CommandPalette` capture déjà `Ctrl+N` (création de scénario) et `Ctrl+K` ouvre la palette qui liste les actions de création pour tous les types d'entités. Le menu déroulant *dédié* déclenché par `Ctrl+N` (avec choix scénario/perso/ennemi/PNJ/item/map/sort) demande de refondre `CommandPalette` — l'esprit de la feature est couvert par l'existant, la forme exacte reste à faire.
- Raccourci clavier `Ctrl+N` partout dans l'app
- Ouvre une modale avec menu déroulant :
  - Nouveau scénario
  - Nouveau personnage
  - Nouvel ennemi
  - Nouveau PNJ
  - Nouvel item
  - Nouvelle map
  - Nouveau sort
- Selection → redirection vers la page de création correspondante

### [x] 10.2 - Historique des actions
- **[x] Fait (infra + page)** : table `historique_actions` + helper `app/lib/historique.ts` (`logAction(type, entiteType, entiteId, description)`, fire-and-forget) + page `app/dashboard/historique/page.tsx` (liste chronologique paginée 30/page, emojis par type, « tout effacer »). **[!] Note** : les appels `logAction(...)` restent à semer dans les flux CRUD existants (création/modification/suppression/combat/session) — l'infrastructure est complète et prête à l'emploi, l'instrumentation se fait au fil de l'eau.
- Page `/dashboard/historique`
- Liste chronologique des dernières actions de l'utilisateur :
  - Création de X
  - Modification de Y
  - Combat lancé
  - Session terminée
- Pagination
- SQL : table `historique_actions` (id, user_id, action_type, entite_type, entite_id, description, created_at)

### [!] 10.3 - Mode focus
- **[!] Reporté** : masquer sidebar + header + ne garder qu'une zone active demande de coordonner le layout dashboard, le composant `Sidebar` et chaque page de jeu (combat/exploration/présentation). Intégration transverse à faire en interactif pour vérifier le rendu sur chaque écran.
- Bouton "🎯 Mode focus" pendant le jeu
- Masque tout sauf l'essentiel :
  - Sidebar minimisée
  - Header masqué
  - Une seule zone active (combat / exploration / présentation)
- Toggle pour réactiver l'UI complète

### [x] 10.4 - Notifications push
- **[x] Fait (centre de notifications)** : table `notifications` + composant `NotificationCenter` (cloche flottante coin haut-droit, ajoutée au layout dashboard) : pastille de non-lues, panneau déroulant, marquer lu / tout marquer lu, suppression, navigation via `lien`, rafraîchissement toutes les 60 s. **[!] Note** : la *création* des notifications par les événements (joueur qui rejoint, nouveau commentaire, like) se fait par un simple `insert` dans la table — ces déclencheurs restent à semer dans les flux concernés.
- Système de notifications dans l'app :
  - "Un joueur a rejoint ton scénario"
  - "Un nouveau commentaire sur ton scénario"
  - "Quelqu'un a aimé ta création"
- Centre de notifications (icône cloche dans header)
- SQL : table `notifications` (id, user_id, type, message, lu bool, created_at)

### [!] 10.5 - Widget timer intégré combat
- **[!] Reporté** : timer de session en haut de la page combat (3600+ lignes) avec pause/reprise et sauvegarde du temps total — intégration dans la page combat, à faire en interactif avec ce code ouvert.
- En haut du combat, timer optionnel
- Compte le temps écoulé en session
- Bouton pause/reprise
- Sauvegarde du temps total par session

---

## 🎨 PHASE 11 - PERSONNALISATION

### [x] 11.1 - Custom themes
- **[x] Fait** : table `themes_custom` + page `app/dashboard/themes/custom/page.tsx`. Color pickers pour les 7 variables de thème, preview live, application (CSS vars + persistance localStorage lue par `ThemeLoader` au chargement), sauvegarde/chargement/suppression de thèmes, marquage public, export/import JSON. `ThemeLoader` modifié pour surcharger les variables du thème de base si un thème custom est actif.
- Page `/dashboard/themes/custom`
- Color picker pour chaque variable CSS du thème
- Preview live
- Sauvegarde du thème custom dans le profil
- Partage de thème custom (export/import JSON)
- SQL : table `themes_custom` (id, user_id, nom, variables jsonb, public bool, created_at)

### [x] 11.2 - Wallpapers par scénario
- **[x] Fait** : colonne `scenarios.wallpaper_url` + section repliable « 🖼️ Wallpaper d'ambiance » dans la sidebar de l'éditeur de scénario (saisie d'URL + preview + auto-save débounce). Le wallpaper s'affiche discrètement en fond (opacité 12 %, `fixed -z-10`) sur la page d'édition du scénario. NB : champ distinct de `bg_image_url` (image de fond de combat).
- Sur chaque scénario, possibilité d'uploader une image de fond
- Affichée discrètement en arrière-plan quand le scénario est actif
- SQL : ajouter colonne `wallpaper_url` text sur `scenarios`

### [x] 11.3 - Custom emojis pour conditions
- **[x] Fait** : colonne `profiles.emojis_conditions` (jsonb) + section « 🎭 Emojis des conditions » sur la page Accessibilité (un champ emoji par condition D&D, sauvegarde profil + cache localStorage). Helper `app/lib/conditionEmojis.ts` (`emojiCondition(key)`) prêt à être utilisé partout. **[!] Note** : le remplacement effectif dans les sites d'affichage des conditions (notamment la page combat) reste à câbler en remplaçant `condition.icone` par `emojiCondition(condition.key)` — le helper et le stockage sont en place.
- Sur la page accessibilité ou personnalisation
- Permettre de remplacer les emojis des conditions D&D par ceux préférés de l'utilisateur
- SQL : ajouter colonne `emojis_conditions` jsonb sur `profiles`

---

## 📋 SQL À APPLIQUER À LA FIN

Fichiers SQL générés (idempotents, à exécuter dans le SQL Editor Supabase) :

> Toutes les migrations sont désormais dans `supabase/migrations/` (format
> timestamp). Procédure d'application : voir `README.md` § « Base de données ».

- `supabase/migrations/20260514201700_roadmap_phase1_scenarios.sql` — Phase 1 : 1.1 (`mindmap_liens.type_chemin` + `explore`), 1.2 (table `session_zero` + RLS + trigger), 1.3 (`scenarios.notes_secretes`), 1.4 (`chapitres.duree_estimee`). **Dépend de `security_rls_complete.sql`**.
- `supabase/migrations/20260514220000_ennemis_variants.sql` — 2.5 : `ennemis.variant_de`.
- `supabase/migrations/20260514230000_personnages_inspiration_backstory.sql` — 3.6 (`inspiration_max`, `inspiration_points`) + 3.4 (`backstory`).
- `supabase/migrations/20260515000000_roadmap_phase4_items.sql` — Phase 4 : 4.2 (`items.identifie`, `items.niveau_identification`), 4.3 (`items.recette_craft` jsonb), 4.4 (table `economie_campagne` + RLS MJ + trigger). **Dépend de `security_rls_complete.sql`** (RLS réutilise `fn_is_scenario_mj`).
- `supabase/migrations/20260515010000_hexcrawl.sql` — Phase 5.5 : tables `hexcrawl_maps` + `hex_tiles`, fonction `fn_owns_hexcrawl_map` (SECURITY DEFINER, évite l'EXISTS croisé inline), RLS MJ-propriétaire + trigger updated_at. Autonome (ne dépend que de `scenarios` pour le FK optionnel `scenario_id`).
- `supabase/migrations/20260515020000_roadmap_phase6.sql` — Phase 6 : 6.3 (`ennemis.comportement_tactique`), 6.4 (`ennemis.est_groupe`, `ennemis.taille_groupe`).
- `supabase/migrations/20260515030000_roadmap_phase7.sql` — Phase 7 : 7.3 (`personnages.composantes` jsonb).
- `supabase/migrations/20260515040000_roadmap_phase8.sql` — Phase 8 : 8.1 (table `recaps_sessions`), 8.4 (table `memos_mj`), 8.5 (tables `achievements` + `user_achievements`, 6 succès seedés). **Dépend de `security_rls_complete.sql`** (`fn_is_scenario_mj`).
- `supabase/migrations/20260515050000_roadmap_phase9.sql` — Phase 9 : 9.1 (`profiles.bio`/`ville`/`langues_parlees` + policy lecture publique), 9.2 (table `likes`), 9.3 (table `notations_scenarios`).
- `supabase/migrations/20260515060000_roadmap_phase10.sql` — Phase 10 : 10.2 (table `historique_actions`), 10.4 (table `notifications`).
- `supabase/migrations/20260515070000_roadmap_phase11.sql` — Phase 11 : 11.1 (table `themes_custom`), 11.2 (`scenarios.wallpaper_url`), 11.3 (`profiles.emojis_conditions`).

**Application : `supabase db push`** applique automatiquement les migrations non encore exécutées (dans l'ordre des timestamps).

---

## 🐛 NOTES ET PROBLÈMES RENCONTRÉS

- **Portée d'une passe** : la roadmap compte ~50 features sur 11 phases. Une passe incrémentale honnête en couvre un sous-ensemble *complètement vérifié* (build OK) plutôt que tout à moitié. Cette passe a livré : 1.3, 1.4, 2.1, 2.2 **terminés** ; 1.1, 1.2, 2.3, 3.4, 4.1 **amorcés** (SQL ou module data prêt, câblage UI à finir) ; le reste non démarré.
- **Modules `app/data/` créés et utilisables dès maintenant** : `noms_pnj.ts`, `personnalites_pnj.ts`, `loot_tables.ts`, `backstory_templates.ts`, `items_magiques_tables.ts`. Les 2 premiers sont déjà câblés (PNJ) ; les 3 autres attendent leur bouton.
- **`roadmap_phase1_scenarios.sql` doit être exécuté APRÈS `security_rls_complete.sql`** (les policies de `session_zero` réutilisent les fonctions `fn_*`).
- Aucun blocage technique rencontré — build prod ✅ à chaque étape.

---

## ✅ STATUT FINAL

Date de la dernière passe : 2026-05-15 (passe autonome Phases 6-11)
Phases complètes : **Phase 1 (4/4)** · **Phase 2 (6/6)** · **Phase 4 (4/4)** · **Phase 9 (3/3)** · **Phase 11 (3/3)**
Phases partielles : Phase 3 (4/7) · Phase 5 (2/5) · Phase 6 (2/5) · Phase 7 (1/5) · Phase 8 (3/5) · Phase 10 (2/5)
**Features terminées [x] : 34 / ~50** — 1.1-1.4, 2.1-2.6, 3.3, 3.4, 3.6, 3.7, 4.1-4.4, 5.4, 5.5, 6.3, 6.4, 7.5, 8.2, 8.4, 8.5, 9.1, 9.2, 9.3, 10.2, 10.4, 11.1, 11.2, 11.3
Features bloquées / partielles [!] : 13 — 5.1/5.2/5.3 (table de jeu interactive), 6.1/6.5 (intégration combat profonde), 6.2 (map de combat), 7.1 (refonte visuelle fiche perso), 7.2 (modèle `sorts` à enrichir), 7.3 (SQL prête, UI fiche perso à câbler), 7.4 (intégration présentation), 8.1/8.3 (agrégation cross-table lourde), 10.1 (Ctrl+N partiellement couvert), 10.3 (intégration layout), 10.5 (intégration combat)
Phase 3 en pause (décision utilisateur) : 3.1 import D&D Beyond, 3.2 export PDF, 3.5 liens persos/PNJ.
Migrations Supabase : toutes dans `supabase/migrations/` (timestamps) — `supabase db push`.
Build : ✅ `npm run build` exit 0, `tsc --noEmit` clean — vérifié à chaque batch de la passe.

### Récurrence des blocages [!]
La grande majorité des features non livrées partagent **3 causes racines**, pas des oublis :
1. **Pas de surface de carte interactive** (« table de jeu ») → bloque 5.1, 5.2, 5.3, 6.2.
2. **Page combat monolithique (3600+ lignes)** : toute feature in-combat (auto-roll, réactions, timer, mort par paquet) est risquée en passe autonome → 6.1, 6.5, 10.5 (et la partie in-combat de 6.4).
3. **Modèles de données à enrichir** avant l'UI : `sorts` sans métadonnées de dégâts (7.2), `historique_actions` à instrumenter avant que 8.1/8.3 aient de la matière.

Ces trois chantiers sont les vrais prochains jalons — chacun débloque plusieurs features d'un coup.
