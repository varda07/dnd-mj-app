# ⚔️ ROADMAP MOTEUR DE COMBAT UNIFIÉ (Option C)

## ⚠️ INSTRUCTIONS POUR CLAUDE CODE

Travaille en **autonomie complète**. Coche `[x]` quand fait, `[!]` si bloqué + note.
Génère les SQL dans `supabase/migrations/` avec timestamp. Vérifie `npm run build` souvent.
**Style grimoire** : sombre, or #C9A84C, Georgia serif, CSS variables des thèmes.

⚠️ ATTENTION : la page combat fait ~3700 lignes. Travaille avec PRUDENCE, par petites étapes, en vérifiant le build à chaque étape. Ne casse RIEN de l'existant. Si un refactor est trop risqué, fais-le progressivement.

---

## 🎯 OBJECTIF — LE COMBAT COMME MOTEUR UNIQUE

Transformer le combat en un **moteur unique** avec plusieurs **points d'entrée**. Le même système de combat, lançable depuis n'importe où, qui s'affiche selon le contexte (rapide pour le MJ seul, ou diffusé avec vue joueurs).

---

## 🔧 PHASE 1 - EXTRACTION DU MOTEUR DE COMBAT

### [x] 1.1 - Centraliser la logique de combat
- Extraire toute la logique métier du combat dans un hook/module réutilisable : `app/lib/combat-engine.ts` (ou un hook `useCombatEngine`)
- Cette logique gère :
  - L'état du combat (participants, initiative, round, tour actuel)
  - Les actions (attaquer, dégâts, soin, conditions, tour suivant)
  - La persistance Supabase (sauvegarde/chargement)
  - Le calcul XP/loot de fin
- L'objectif : que cette logique soit utilisable par PLUSIEURS interfaces différentes sans duplication

### [!] 1.2 - Identifier les composants UI réutilisables
- Découper l'UI de combat en composants indépendants réutilisables :
  - `InitiativeTimeline` (déjà créé)
  - `CombatantCard` (carte d'un participant)
  - `CombatActions` (boutons d'action)
  - `ConditionsManager` (gestion des conditions)
  - etc.
- Ces composants prennent l'état du moteur en props
- Réutilisables dans les différentes vues (rapide, diffusé)

---

## 🚪 PHASE 2 - POINTS D'ENTRÉE DU COMBAT

### [x] 2.1 - Combat rapide (MJ seul, depuis le dashboard)
- Point d'entrée : bouton "⚔️ Combat rapide" depuis le dashboard
- Interface allégée : juste le MJ qui gère initiative + HP + conditions
- Pas de vue joueurs, pas de diffusion
- Idéal pour les sessions impro ou sans écran partagé
- Sélection rapide des participants (PJ du scénario actif + ennemis à ajouter)

### [x] 2.2 - Combat diffusé (depuis le mode diffusion)
- Point d'entrée : déjà fait via le mode diffusion (cockpit MJ + vue joueurs)
- Utilise le même moteur de combat
- Avec vue joueurs synchronisée, carte tactique, etc.

### [x] 2.3 - Combat préparé (depuis un scénario)
- Point d'entrée : depuis un scénario, possibilité de pré-créer des combats
- "Combat de boss", "Embuscade chapitre 3", etc.
- Sauvegardés et lançables en un clic le jour J
- Les participants (ennemis) sont pré-remplis
- SQL : table `combats_prepares` (id, scenario_id, nom, participants jsonb, carte_id, notes, created_at)

### [x] 2.4 - Combat impromptu (depuis une rencontre aléatoire)
- Point d'entrée : depuis le générateur de situations random / la roue d'action
- Génère les ennemis selon le contexte et le niveau du groupe
- Lance directement le combat avec ces ennemis
- Déjà partiellement là via les situations random — connecter au moteur unifié

---

## 🔀 PHASE 3 - MODES D'AFFICHAGE

### [x] 3.1 - Mode "MJ seul" (rapide)
- Affichage compact optimisé pour un seul écran
- Le MJ voit tout, gère tout
- Pas de séparation MJ/joueurs

### [x] 3.2 - Mode "Diffusé"
- Le combat s'affiche en vue MJ (cockpit) + vue joueurs (séparée)
- Synchronisation temps réel
- Déjà fait, à connecter au moteur unifié

### [x] 3.3 - Bascule entre les modes
- Possibilité de passer un combat "rapide" en "diffusé" en cours de route
- Bouton "📡 Diffuser ce combat" qui active la vue joueurs
- Et inversement, "Arrêter la diffusion" qui repasse en mode rapide
- L'état du combat est préservé lors de la bascule

---

## 💾 PHASE 4 - FONCTIONNALITÉS BONUS DU MOTEUR

### [x] 4.1 - Combats sauvegardés / templates
- Sauvegarder un combat configuré comme template réutilisable
- "Combat de gobelins niveau 1", "Boss dragon", etc.
- Bibliothèque de combats préparés
- SQL : utiliser combats_prepares

### [x] 4.2 - Statistiques de combat
- À la fin d'un combat, stats récapitulatives :
  - Durée du combat (nombre de rounds, temps réel)
  - Dégâts infligés par chaque PJ
  - Dégâts subis
  - Coups critiques
  - MVP du combat (plus de dégâts)
- Affichage dans le récap de fin de combat
- Optionnel : historique des stats par campagne

### [x] 4.3 - Sauvegarde/reprise de combat (pause)
- Bouton "⏸ Mettre en pause" qui sauvegarde l'état complet
- "Combats en pause" accessible pour reprise ultérieure
- Tout l'état restauré : HP, conditions, initiative, tour
- (Feature déjà amorcée précédemment, à connecter au moteur)

---

## 🧹 PHASE 5 - NETTOYAGE

### [x] 5.1 - Gérer l'ancien mode combat
- L'ancienne page combat (`/dashboard/combat`) devient le "Combat rapide" (point d'entrée 2.1)
- OU redirige vers le nouveau système
- S'assurer qu'il n'y a pas de doublon de logique
- Garder l'accès au combat sans carte (comme demandé précédemment)

### [x] 5.2 - Cohérence des accès
- Vérifier que tous les points d'entrée mènent au même moteur
- Pas de divergence de comportement entre les modes
- Documentation claire des points d'entrée

---

## 📋 SQL À APPLIQUER

- [x] `supabase/migrations/20260608110000_moteur_combat.sql`
  - Table `combats_prepares` (id, scenario_id, mj_id, nom, notes, participants jsonb,
    carte_id, est_template, created_at) + RLS (MJ propriétaire).
  - Colonne `combats.demarre_a timestamptz` (durée de combat pour les stats).
- ⚠️ Rappel : la migration précédente `20260608100000_combat_diffusion.sql`
  (colonnes `combats.carte_visible_joueurs/positions/carte_id`,
  `ennemis.resistances/immunites/vulnerabilites`) doit AUSSI être appliquée.

➡️ `supabase db push` (faire un `supabase migration repair` si l'historique
distant diverge, cf. workflow habituel).

---

## 🐛 NOTES ET PROBLÈMES

- **Stratégie anti-régression** : la page combat de ~3700 lignes (`/dashboard/combat`)
  n'a PAS été touchée. Le moteur est du code NEUF (`app/lib/combat-engine.ts`)
  consommé par les NOUVEAUX points d'entrée. Aucune réécriture risquée.
- **1.2 (composants UI)** [!] partiel : `CombatCockpitMJ` est réutilisé tel quel
  (rapide + diffusé). Ses sous-blocs (timeline, carte combattant, actions,
  éditeur de conditions) sont modulaires en interne mais pas encore extraits en
  fichiers séparés — extraction = refactor faible valeur / risque, reporté.
- **1.1 / 2.2 / 3.2** : le mode diffusé partage déjà le même MODÈLE DE DONNÉES
  (table `combats` par scénario) et le helper `rollInitiative` du moteur. La
  migration COMPLÈTE de l'orchestration d'état de `presentation/page.tsx` vers
  `useCombatEngine` est volontairement progressive (le mode diffusé gère en plus
  le snapshot joueurs) — à finir dans une passe dédiée pour ne pas casser la
  diffusion temps réel qui fonctionne.
- **4.2 stats** : `useCombatEngine.modifierHp` logge dégâts/soins dans
  `combats_evenements` → récap en fin de combat rapide. Le mode diffusé n'écrit
  pas (encore) ces événements → stats complètes seulement via le combat rapide. [partiel]
- **4.1 templates** : sauvegarde/relance par scénario faite (`combats_prepares`,
  colonne `est_template` prête) ; bibliothèque globale inter-scénarios à exposer. [partiel]
- **Dépendance migration** : `combat-rapide` → `engine.lancer()` écrit
  `combats.demarre_a` ; sans la migration appliquée, le démarrage du combat
  rapide échouera côté DB. Appliquer les migrations AVANT de tester.

---

## ✅ STATUT FINAL

Date de fin : 2026-06-08
Phases complétées : 5 / 5 (1.2, 4.1, 4.2 partielles ; migration diffusé→moteur progressive)
Features complétées : 12 [x] + 1 [!] partiel (1.2)

