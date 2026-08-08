# Audit préalable — Refonte « Mode Diffusion » → « Mode Session »

> Rapport de la **Phase 0** de `app/roadmap-mode-session.md`. Date : 2026-08-07.
> Objectif : mesurer le volume réel de travail des phases suivantes en confrontant la roadmap à l'existant.
> **Verdict global : une grande partie de l'infrastructure existe déjà** (notifications in‑app, Realtime, RPC de liaison PJ↔scénario, moteur de combat, cockpit MJ, roue d'action, sélecteur de setup, lanceur de dés). La refonte est surtout un **changement de modèle** : passer d'une *diffusion passive par snapshot* (`sessions_presentation.etat_jeu`) à un *état de session granulaire et temps réel par participant/personnage*.

---

## 0. Conventions confirmées (à respecter)

- **Migrations** : `supabase/migrations/`, nommées `AAAAMMJJHHMMSS_slug.sql`, 100 % idempotentes (`create ... if not exists`, gardes `pg_publication_tables`). Appliquées via `supabase db push`. Dernière migration en date : `20260709130000_rejoindre_scenario_via_code.sql`.
- **RLS anti‑récursion** : *interdiction des `EXISTS` croisés inline* entre `scenarios` et `scenarios_joueurs`. Tous les contrôles inter‑tables passent par des **fonctions `SECURITY DEFINER`** déjà en place dans `supabase/migrations/20260514144400_security_rls_complete.sql` :
  - `fn_is_scenario_mj(scenario_id)` — l'utilisateur est le MJ du scénario.
  - `fn_has_joined_scenario(scenario_id)` — l'utilisateur a rejoint le scénario.
  - `fn_is_scenario_member(scenario_id)` — MJ **ou** joueur inscrit.
  - `fn_owns_personnage(personnage_id)` — l'utilisateur possède ce personnage.
  - `fn_is_mj_of_personnage(personnage_id)` / `fn_is_mj_of_player(joueur_id)` — le MJ peut voir/éditer les fiches de ses joueurs.
  - → **On réutilise ces fonctions pour la RLS des nouvelles tables** (aucune nouvelle récursion à créer).
  - ⚠️ *Note* : la mémoire projet indiquait `supabase/security_rls_complete.sql` comme source de vérité RLS ; le fichier réel est **`supabase/migrations/20260514144400_security_rls_complete.sql`** (déplacé en migration).
- **Table de jonction** : `scenarios_joueurs (scenario_id, joueur_id, joined_at)` PK composite. Le personnage joué porte `personnages.scenario_id` (+ `personnages.joueur_id` = propriétaire). **Il n'existe pas** de `scenario_players` / `scenario_characters`.
- **Profils** : table `public.profiles` (créée `20260419010300_theme.sql`, corrigée `20260512160400_profiles_fix.sql`).
- **UI** : Next.js 16 (App Router) + React 19, `next-intl`, Tailwind v4. Sidebar **à droite** (`app/components/Sidebar.tsx`). Interface en français.

---

## 1. Modèle de données des personnages — table `public.personnages`

⚠️ La table de base `personnages` **n'est pas créée par une migration du dépôt** (prérequis distant) ; les migrations ne font qu'`add column`. Le schéma TS de référence est le type `Personnage` de `app/dashboard/personnages/[id]/page.tsx` (l.35‑79).

| Catégorie | Existe | Colonne(s) | Manque |
|---|---|---|---|
| **PV** | ✅ | `hp_max`, `hp_actuel`, `temp_hp` | — |
| **CA / vitesse** | ✅ | `ca`, `vitesse` | **initiative non stockée** (calculée depuis mod Dex ; ordre de combat dans `combats.ordre_initiative`) |
| **Caractéristiques** | ✅ | `force, dexterite, constitution, intelligence, sagesse, charisme` | modificateurs calculés à la volée (OK) |
| **Sauvegardes** | ✅ | `saves_maitrises` jsonb | — |
| **Compétences** | ✅ | `comp_maitrises`, `comp_expertise` jsonb ; `autres_maitrises`, `langues` text | bonus de maîtrise calculé (OK) |
| **Sorts / slots** | ✅ | table `personnage_sorts` (`disponible`, `prepare`) ; `sorts_slots_max` jsonb, `sorts_slots_used` jsonb ; table `sorts` (école, VSM, concentration, portée, durée…) | pas de slots de Pacte séparés (occultiste ⇒ slots classiques) |
| **Ressources de classe** | ❌ **manque majeur** | seulement `traits_classe` (texte libre) + inspiration héroïque générique (`inspiration`, `inspiration_points`, `inspiration_max`) | **aucun compteur structuré** (rage, ki, superiorité, points de sorcellerie, channel divinity, invocations, slots de pacte) |
| **Inventaire / monnaie** | ⚠️ partiel | `equipement` (text), `armes` jsonb, `composantes` jsonb, `pieces_or` (int) ; table `items(personnage_id)` | **or uniquement** (pas pc/pa/pe/pp) ; inventaire non structuré (pas de quantités/poids) |
| **Conditions** | ✅ | `conditions` jsonb (index GIN) | — |
| **Death saves / dés de vie** | ✅ | `death_success`, `death_fail` (0‑3) ; `de_vie`, `de_vie_utilises` | colonnes mortes `death_saves_success/_fail` (inutilisées) |
| **Concentration en cours** | ❌ **manque** | `concentration` existe sur `sorts` (propriété du sort), pas sur `personnages` | aucun champ « concentre actuellement sur tel sort » |

**Valeurs vivantes de séance actuellement stockées** directement sur `personnages` : `hp_actuel`, `temp_hp`, `sorts_slots_used`, `de_vie_utilises`, `death_success/fail`, `conditions`, `inspiration*`. (En combat, KO/death saves sont *dupliqués* dans `combats.etats_combat`.)

### Décision Phase 1.4 (état vivant)
Deux manques (ressources de classe, concentration) + le besoin d'un **auteur/horodatage de modification** (journal MJ↔PJ) et de **Realtime dédié** justifient de **créer une table `character_live_state`** (1‑1 avec `personnages`, dans le contexte d'une session) **plutôt que d'empiler des colonnes** sur `personnages`. Elle superpose l'état de séance : `current_hp`, `temp_hp`, `max_hp_override`, `spell_slots_used` jsonb, `class_resources_used` jsonb, `conditions` jsonb, `concentration_spell`, `death_saves` jsonb, `updated_at`, `updated_by`. Elle est **hydratée** depuis `personnages` à l'entrée en session (`join_session`) et sert de source de vérité temps réel pendant la partie. **Effort : faible** (une table + RLS + hydratation dans la RPC).

---

## 2. Composants d'affichage de fiche — réutilisables pour l'UI PJ

| Brique | Chemin | Réutilisable |
|---|---|---|
| Lanceur de dés d4‑d20 + av/dés, mobile‑first, ouvrable par `window 'dice:open'` | `app/components/DiceLauncher.tsx` | **Oui** (manque d100 + bonus fixe dans l'UI) |
| Wrapper dés 3D | `app/components/Dice3DBoxScene.tsx` | Oui (bas niveau) |
| Vue joueurs combat (barre PV, conditions, `etatQualitatif`) | `app/components/presentation/CombatVueJoueurs.tsx` | **Oui/Partiel** (meilleure réf. visuelle PJ ; lecture seule, styles CSS globaux `combatj-*`) |
| Roller d'attaque d20 vs CA + dégâts (parse `1d6+2`, crit) | `app/components/AttackRoller.tsx` | Partiel |
| Fiche complète (PV, carac, sorts/slots, repos, death saves, level‑up) | `app/dashboard/personnages/[id]/page.tsx` (2903 l.) | **Partiel** — logique D&D 5e riche et solide mais **monolithique**, desktop/MJ, autosave couplé |
| Règles pures (mods, PV, maîtrise, slots, XP) | `app/data/dnd5e.ts`, `app/data/sorts_dnd5e.ts`, `app/data/conditions.ts` | Oui |
| Système UI (Modal/Toast/ConfirmDialog/Tooltip/FormKit/NumberInput) | `app/components/ui/*`, `app/components/NumberInput.tsx` | Oui |
| Haptique / sons | `app/lib/haptic.ts`, `app/lib/dice-sounds.ts` | Oui |

**Constat clé (impacte surtout Phase 3, pas 0‑2)** : il n'existe **pas** de sous‑composants atomiques (`HpBar`, `StatBlock`, `SpellSlots`, `SavingThrows`). Toute la logique est concentrée dans deux fichiers monolithiques (`[id]/page.tsx`, `combat/page.tsx`). Pour l'UI PJ (Phase 3), il faudra **extraire** ces sous‑composants — c'est le principal poste d'effort futur. **Sans conséquence sur les phases 0‑2.**

---

## 3. Implémentation actuelle du « mode diffusion »

### Routes
- `app/dashboard/presentation/page.tsx` (**3027 lignes**) — cœur MJ (cockpit + preview) et vue TV via `?display=1`. Exporte les types partagés (`ScenarioActif`, `EtatPresentation`, `CombatLite`, `Persona`, `Ennemi`, `SetupMode`, `InitiativeEntry`) réutilisés ailleurs. **Login requis.**
- `app/presentation/[sessionId]/page.tsx` — **écran joueurs public anonyme** : lit `sessions_presentation.etat_jeu` (snapshot) + présence anonyme. **À remplacer** (comptes obligatoires).
- `app/rejoindre/[code]/page.tsx` — atterrissage du lien d'invitation (RPC `rejoindre_scenario_via_code`). **À conserver/rebrancher.**

### Composants (`app/components/presentation/`)
`ActionWheelMJ` (roue d'action), `CombatCockpitMJ` (cockpit + timeline initiative inline), `CombatVueJoueurs`, `CombatCarte` (+ `FogState`), `ElementsScenarioPanel`, `SessionTimer`, `JoueursConnectes` (présence anonyme), `HistoriqueSessionPanel` + `logHistorique()`, `SondageLauncher/Viewer`, `AmbianceSonoreAuto`.
**Sélecteur de setup** (`pc-tv | pc-tel | tel-tel | mj-seul`) : **inline** dans `presentation/page.tsx` (const `SETUPS`, localStorage `presentation_setup_mode`). → à extraire en composant réutilisable (Phase 2.1).

### Tables Supabase de diffusion
- `presentation_etats` (1 ligne/scénario) : lieu, narration, image, son, ambiance, `en_pause`… Realtime **activé**. → colonnes à **migrer vers `session_state`**.
- `sessions_presentation` : `code_session`, **`etat_jeu` jsonb (snapshot complet)**, RLS `SELECT using(true)` **public**. Realtime activé. → **remplacée** par `game_sessions` + `session_state`.
- `combats` (1 ligne/scénario, UNIQUE) : round, tour, `ordre_initiative`, `etats_combat`, carte, fog, positions… Realtime **activé**. → **conservée** (support combat en session ; `session_state.active_combat_id` la référencera).
- `combats_evenements`, `combats_prepares` (+ colonnes `ennemis`) → **conservées**.
- `historique_session`, `sondages_session`, `votes_sondages` liées à `sessions_presentation(id)` → à re‑cibler plus tard sur `game_sessions` (hors périmètre 0‑2).

### Realtime & hooks
Canaux existants : `presentation:${scenarioId}` (postgres_changes sur `presentation_etats` + `combats`), `presentation-publique:${sessionId}`, `presentation-presence:${sessionId}` (Presence), `historique:*`, `votes:*`, `combat-evt:*`, **`notifications:${userId}`**, `combat-engine:${scenarioId}`.
**Mécanisme actuel = diffusion passive** : le MJ recalcule un snapshot assaini et l'écrit dans `sessions_presentation.etat_jeu` ; la route publique le rejoue. **Aucun état par PJ.** → c'est précisément ce que la refonte remplace.

### Réutilisable vs à supprimer
- **Réutiliser / intégrer** : `ActionWheelMJ`, `CombatCockpitMJ`, `CombatVueJoueurs`, `CombatCarte`, `combat-engine.ts`, sélecteur de setup, timeline initiative, route `rejoindre/[code]`, tables `combats*`, infra notifications, `DiceLauncher`.
- **Supprimer / remplacer (Phase 5, pas maintenant)** : snapshot `sessions_presentation.etat_jeu`, route publique anonyme, `sessions_presentation`, `presentation_etats` (colonnes migrées), présence anonyme `JoueursConnectes`. La `DisplayView`/`?display=1` reste comme « écran partagé TV » épuré (Phase 4.4).

---

## 4. Lien PJ ↔ scénario (RPC de code d'invitation) — ✅ existe et est atomique

`supabase/migrations/20260709130000_rejoindre_scenario_via_code.sql` :
- `infos_scenario_via_code(p_code)` → `{scenario_id, scenario_nom}` (lecture, `anon+authenticated`).
- `rejoindre_scenario_via_code(p_code, p_personnage_id?)` → inscrit `auth.uid()` dans `scenarios_joueurs` (idempotent) + rattache le perso ; **code réutilisable** (non consommé).
- `joueurs_du_scenario(p_scenario_id)` → liste MJ des joueurs + persos.
`supabase/migrations/20260627120000_lier_personnage_scenario_rpc.sql` : `lier_personnage_via_code` (flux MJ‑saisit‑code‑joueur, usage unique).
→ **La liaison est déjà en place** ; `join_session` (Phase 1.7) s'appuiera sur `scenarios_joueurs` / `personnages.scenario_id` sans réinventer la liaison.

---

## 5. Notifications in‑app — ✅ **déjà existantes** (Phase 2.2 largement pré‑câblée)

- Table `public.notifications` (`20260515060000_roadmap_phase10.sql`) : `id, user_id, type, message, lien, lu, created_at`. RLS : `select/update/delete` sur `user_id = auth.uid()`, **`insert with check (true)`** (un tiers peut notifier). Realtime **activé** (`20260519130000_notifications_realtime.sql`, `replica identity full`).
- Composant **cloche** : `app/components/NotificationCenter.tsx` — FAB 🔔 (`fixed top-4 left-[52px]`), badge non‑lues, panneau 30 dernières, marquer‑lu + `router.push(n.lien)`, abonnement `notifications:${userId}`, fusion des annonces globales.
- **Conséquence roadmap** : la table + le Realtime + la cloche existent. Phase 1.6 (`notifications`) → **déjà fait**. Phase 2.2 se limite à : (a) **émettre** une notif `session_started` à chaque joueur du scénario au passage en lobby (RPC/trigger) ; (b) ajouter un **type `session`/emoji** + **bandeau d'accueil** temps réel « Rejoindre » ; le composant cloche est réutilisé tel quel.

---

## 6. Supabase Realtime — tables déjà publiées

9 tables en publication `supabase_realtime` : `explorations`, `combats`, `presentation_etats`, `sessions_presentation`, `notifications`, `historique_session`, `sondages_session`, `votes_sondages`, `combats_evenements`.
⚠️ **`personnages` et `ennemis` NE sont PAS publiées** → leurs changements de PV/conditions ne se propagent pas par Realtime aujourd'hui (la vue joueurs dépend du snapshot). → La refonte doit publier les **nouvelles** tables (`game_sessions`, `session_state`, `session_participants`, `character_live_state`, `session_events`), ce qui **résout nativement** la synchro MJ↔PJ des PV.

---

## 7. combat-engine.ts — points d'entrée

`app/lib/combat-engine.ts` (`'use client'`, « Moteur unifié ») :
- Helpers purs : `resolveEntiteId`, `etatQualitatif(hp,hpMax)`, `rollInitiative(personnages, ennemis)`, `nextTurnPatch/prevTurnPatch`, `computeCombatStats`.
- Hook `useCombatEngine(scenarioId, {isMj})` → `{combat, personnages, ennemis, …}` + actions (`sauverCombat, modifierHp, toggleCondition, tourSuivant, lancer, terminer, togglePause, deplacerJeton, toggleCarteVisible, rechargerRoster`). Persiste dans `combats` (`onConflict: scenario_id`), s'abonne à `combat-engine:${scenarioId}`, logge dans `combats_evenements`.
- UI partagée : `CombatCockpitMJ` (cockpit MJ + timeline), points d'entrée `dashboard/combat-rapide` et `dashboard/presentation`. Rencontres préparées via `app/lib/combats-prepares.ts` (réutilise `rollInitiative`).
→ **À réutiliser tel quel** ; en session, `session_state.active_combat_id` pointera vers `combats.id`, le cockpit/vues combat sont branchés sans duplication (Phases 3.4 / 4.3).

---

## 8. Adaptation de la roadmap (conclusions actionnables)

| Item roadmap | Statut d'après l'audit | Action |
|---|---|---|
| Phase 1.6 `notifications` | **Déjà existant** | Ne pas recréer la table ; réutiliser `notifications` + `NotificationCenter`. |
| Phase 2.2 cloche de notifications | **Déjà existant** | Réutiliser `NotificationCenter.tsx` ; ajouter type `session` + bandeau. |
| Lien PJ↔scénario (Phase 0/2.3) | **Déjà existant** | `scenarios_joueurs` + RPC `rejoindre_scenario_via_code` ; `join_session` s'appuie dessus. |
| RLS anti‑récursion (Phase 1.7) | **Fonctions dispo** | Réutiliser `fn_is_scenario_mj / fn_has_joined_scenario / fn_owns_personnage`. |
| Combat en session (Phases 3.4/4.3) | **Déjà existant** | Réutiliser `combat-engine.ts` + `CombatCockpitMJ` + `CombatVueJoueurs` ; référencer `combats.id` via `session_state.active_combat_id`. |
| Sélecteur de setup (Phase 2.1) | Existe **inline** | À extraire en composant `SetupSelector` et rebrancher. |
| État vivant du perso (Phase 1.4) | Partiellement sur `personnages` | **Créer `character_live_state`** (ressources de classe + concentration manquent ; besoin auteur/horodatage + Realtime). |
| Realtime PV/conditions | `personnages` **non publiée** | Résolu par les nouvelles tables publiées. |
| Renommage « diffusion » → « session » (Phase 5) | Beaucoup d'occurrences | Reporté en Phase 5 (hors périmètre 0‑2). Nouveau mode construit **à côté** de l'ancien pour ne rien casser pendant 1‑2. |

**Stratégie retenue pour les phases 1‑2** : construire le nouveau socle (`game_sessions` & co., routes `/session/*`, lancement + lobby) **en parallèle** de l'ancien mode diffusion, sans le supprimer ni le renommer tout de suite (migration/nettoyage = Phase 5). Cela garde `npm run build` vert et l'app fonctionnelle à chaque étape.

**Point de vigilance CSS (rappel roadmap)** : ne jamais poser `will-change: transform` sur un parent de modale (casse `position: fixed`). Déjà rencontré/corrigé sur ce projet.
