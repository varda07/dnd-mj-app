# Audit — Navigation : boutons retour et sorties

> Section 2 de `app/roadmap-audit-app-et-espagnol.md`. **Recensement seul, rien n'a été corrigé.**
> Date : 2026-09-28. Analyse statique + parcours réel dans Chrome sur `http://localhost:3000`.

## Résumé

| Constat | Chiffre |
|---|---|
| Surfaces modales faites main (`fixed inset-0`) | **31** |
| … qui utilisent le composant partagé `<Modal>` | **1** |
| … qui se ferment avec Échap | **2** (vérifié en vrai) |
| Modales sans aucune sortie | **0** |
| Formes de retour différentes dans l'app | **~12** |
| Pages sans retour vers leur parent | **17** |
| Composant de retour partagé | **aucun** |

Bonne nouvelle : **on ne reste jamais coincé** — toute modale a une sortie, et le bouton 🏠 est
présent sur tout `/dashboard`. Le problème est ailleurs : la navigation est **réimplémentée à
chaque page**, sans composant commun, avec des libellés et des comportements qui varient.

---

## 1. Modales : la sortie existe toujours, mais Échap ne marche pas

J'ai d'abord cru à quatre modales sans fermeture (`GuidedTour`, `OnboardingTutorial`,
`SignalerButton`, `maps/page`). **Vérification faite, c'est faux** : toutes ont une sortie
(« Passer », « Annuler », clic extérieur). Mon critère de recherche cherchait « Fermer » et « ✕ ».

Le vrai défaut est ailleurs et il est **confirmé par un test réel** :

> Lanceur de dés ouvert sur `/dashboard/scenarios` → envoi d'un `keydown` Escape →
> **la modale reste ouverte.**

| Surface | `<Modal>` partagé | Échap | Clic extérieur |
|---|---|---|---|
| `components/ui/Modal.tsx` (le composant) | — | ✅ | ✅ |
| `session/joueur/ZoneDiffusion.tsx` | ✅ | ✅ | ✅ |
| `components/CommandPalette.tsx` | ❌ | ✅ | ✅ |
| **Les 28 autres** | ❌ | **❌** | variable |

Les 28 autres incluent : `DiceLauncher`, `SoundBox`, `WildMagicRoller`, `SituationsRandom`,
`SignalerButton`, `GuidedTour`, `OnboardingTutorial`, `AssistantPersonnage`, `AssistantScenario`,
`MindMap`, `ModaleMonteeNiveau`, et les modales internes de `combat`, `combat-prepare`,
`combat-rapide`, `ennemis`, `items`, `sorts`, `pnj`, `personnages`, `scenarios/[id]/edit`,
`scenarios/[id]/quetes`, `tables-effets`, `maps/editor`, `maps`, `dashboard`.

**Proposition** : faire passer ces surfaces par `<Modal>` (qui apporte déjà ✕, clic extérieur,
Échap et verrou de défilement), ou au minimum par le hook `useModalEffects` déjà exporté par
`components/ui/Modal.tsx` — c'est exactement ce à quoi il sert.

---

## 2. Pages sans retour vers leur parent

Nuance : le layout `/dashboard` monte `HomeButton` (🏠 en haut à gauche), donc **toute page
`/dashboard/**` a au moins un retour à l'accueil**. Ce qui manque ci-dessous, c'est un retour vers
le **parent logique**.

| Page | Parent attendu | Proposition |
|---|---|---|
| `dashboard/admin/analytics` | `/dashboard/admin` | « ← Administration » (le libellé existe déjà ailleurs) |
| `dashboard/admin/annonces` | `/dashboard/admin` | idem |
| `dashboard/admin/contenu` | `/dashboard/admin` | idem |
| `dashboard/admin/feature-flags` | `/dashboard/admin` | idem |
| `dashboard/admin/feedback` | `/dashboard/admin` | idem |
| `dashboard/admin/moderation` | `/dashboard/admin` | idem |
| `dashboard/admin/stats` | `/dashboard/admin` | idem |
| `dashboard/admin` | `/dashboard` | « ← Dashboard » |
| `dashboard/combat/encounter-builder` | `/dashboard/combat` | « ← Combat » (libellé déjà utilisé ailleurs) |
| `dashboard/historique` | `/dashboard` | « ← Retour » |
| `dashboard/achievements` | `/dashboard` | « ← Retour » |
| `dashboard/maps/hexcrawl` | `/dashboard/maps` | « ← Cartes » (libellé déjà utilisé) |
| **`dashboard/scenarios/[id]/economie`** | le scénario | **« ← Scénario »** — ses pages sœurs l'ont déjà |
| **`dashboard/scenarios/[id]/memo`** | le scénario | idem |
| **`dashboard/scenarios/[id]/session-zero`** | le scénario | idem |
| **`dashboard/scenarios/[id]/xp`** | le scénario | idem |
| `rejoindre/[code]` | — | hors `/dashboard` : **aucun 🏠 non plus**. Ajouter une sortie explicite. |

### L'incohérence la plus visible

Les sous-pages d'un scénario ne se comportent pas pareil :

| A un retour | N'en a pas |
|---|---|
| `calendrier`, `notes`, `quetes`, `recap`, `edit` | `economie`, `memo`, `session-zero`, `xp` |

Même niveau, même contexte, moitié seulement avec un retour.

### Hors `/dashboard` : pas de `HomeButton`

`HomeButton` n'est monté que dans `app/dashboard/layout.tsx`. Les routes `/session/**`,
`/rejoindre/[code]`, `/profil/[username]` et `/presentation/[sessionId]` n'en ont pas.

Pour `/session/**` c'est **volontaire et correct** : le mode session est un plein écran de partie,
on n'y met pas de bouton « accueil » à portée de clic accidentel. `SessionMJ` a sa propre sortie.
Pour `/rejoindre/[code]` en revanche, c'est un manque.

---

## 3. Cohérence du retour : aucun composant partagé

Aucune des pages n'utilise de composant commun. On trouve, en parallèle :

| Forme | Occurrences |
|---|---|
| `router.back()` | 35 |
| « ← Retour » | 29 |
| « ← Scénario » | 4 |
| « ← Précédent » | 3 |
| « ← Dashboard » | 3 |
| « ← Scénarios », « ← Régions », « ← Maps », « ← Cartes », « ← Combat », « ← Administration », « ← Mes… », « ← Retour à l'accueil » | 1 chacune |

Deux problèmes :

1. **Le libellé change** d'une page à l'autre pour la même intention.
2. **`router.back()` ≠ retour au parent.** Arrivé sur une page par un lien direct, la palette de
   commandes ou un favori, `router.back()` renvoie à l'écran précédent — qui peut être n'importe
   quoi, voire hors de l'app. 35 pages ont ce comportement.

**Proposition** : un composant `<BoutonRetour href="…" label="…" />` unique, placé toujours au même
endroit (en haut à gauche du contenu, là où « ← Retour » est déjà majoritaire), qui navigue vers un
parent **explicite** plutôt que vers l'historique.

---

## 4. Tunnels : aucun cul-de-sac trouvé

| Tunnel | Étape précédente | Sortie |
|---|---|---|
| Création de personnage (`Guidé` / `Rapide` / `Surprends-moi`) | ✅ « ← Précédent » dans l'assistant | ✅ |
| Création de scénario (`Guidé` / `Un modèle` / `Page blanche`) | ✅ | ✅ |
| Jonction de session (`/session/[id]/rejoindre`) | ✅ boutons « Retour au tableau de bord » selon la phase | ✅ |
| Lobby joueur (`/session/[id]/joueur`) | ✅ bouton « Retour à l'accueil » si session terminée | ✅ |

---

## Ce que cet audit ne couvre pas

- Le parcours de session **à deux appareils** (MJ + joueur simultanés) : **à faire manuellement par
  l'utilisateur**. Un seul navigateur ne permet pas de vérifier qu'un joueur bloqué sur son poste
  dispose bien d'une sortie pendant que le MJ pilote.
- Les pages d'administration, non parcourues (elles agissent sur du contenu réel).
- Le rendu mobile réel : le redimensionnement de fenêtre n'a pas été concluant pendant la session.
