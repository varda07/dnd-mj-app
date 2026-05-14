// Tables de personnalité PNJ inspirées de D&D 5e (roadmap 2.2).
// `genererPersonnalitePnj()` tire une ligne de chaque table.

export const TRAITS_PERSONNALITE = [
  'Idolâtre un héros légendaire et le cite sans cesse.',
  'Met les gens à l’aise avec un calme imperturbable.',
  'Recueille le moindre ragot et adore le colporter.',
  'Reste poli et courtois en toutes circonstances.',
  'Aime profondément la bonne chère, la boisson et la fête.',
  'Brode des récits invraisemblables à la moindre occasion.',
  'Fait des blagues de mauvais goût aux pires moments.',
  'A déjà commis un crime ou survécu à une grande catastrophe.',
  'Se met facilement en colère.',
  'Voit des présages dans chaque événement.',
  'Est tolérant — ou intolérant — envers les autres peuples.',
  'Cite (ou prétend citer) les écrits sacrés sans relâche.',
  'A connu l’amour, mais cette personne est partie.',
  'A un trésor et le cache jalousement.',
  'Croit en l’égalité de tous et refuse les privilèges.',
  'A horreur de se salir.'
]

export const IDEAUX = [
  'Liberté — les chaînes sont faites pour être brisées. (Chaotique)',
  'Tradition — préserver ce que les anciens ont bâti. (Loyal)',
  'Charité — soulager la souffrance partout. (Bon)',
  'Pouvoir — gravir les échelons par tous les moyens. (Mauvais)',
  'Honnêteté — ne jamais mentir ni tricher. (Loyal)',
  'Aspiration — devenir la meilleure version de soi-même. (Neutre)',
  'Vengeance — réparer un tort coûte que coûte. (variable)',
  'Beauté — créer ou préserver ce qui est sublime. (Bon)',
  'Indépendance — ne dépendre de personne. (Chaotique)',
  'Foi — un dieu guide chacun de mes pas. (Loyal)'
]

export const LIENS = [
  'Je donnerais ma vie pour ceux qui m’ont élevé.',
  'Un objet précieux est le dernier souvenir d’un être cher.',
  'Je dois une dette de vie que je n’ai jamais remboursée.',
  'Ma ville natale est tout ce qui compte vraiment.',
  'Je protège un secret qui pourrait tout détruire.',
  'Je cherche à venger une trahison qui a brisé ma famille.'
]

export const DEFAUTS = [
  'Je ne résiste jamais à un joli visage ou à une bourse pleine.',
  'Quand j’ai un plan, j’y tiens, même s’il est désastreux.',
  'Je juge les autres durement — et moi-même plus encore.',
  'Je n’ai aucune patience avec les imbéciles.',
  'Le moindre affront me met hors de moi.',
  'Je ne sais pas garder un secret pour sauver ma vie.'
]

export const MANIES = [
  'Tapote des doigts dès qu’il/elle réfléchit.',
  'Termine toujours les phrases des autres.',
  'Collectionne un objet insignifiant (boutons, cailloux…).',
  'Refuse de regarder son interlocuteur dans les yeux.',
  'Parle de lui/elle à la troisième personne.',
  'Renifle ou flaire les gens et les objets.',
  'Garde toujours une main sur son arme ou sa bourse.',
  'Ponctue chaque phrase d’un juron inventé.'
]

export const SECRETS = [
  'A usurpé l’identité d’une personne disparue.',
  'Travaille en secret pour une faction ennemie.',
  'A causé, par accident, la mort d’un innocent.',
  'Est en réalité bien plus riche (ou pauvre) qu’il ne le montre.',
  'Cache une maladie ou une malédiction qui le ronge.',
  'Connaît l’emplacement d’un trésor — ou d’un cadavre.'
]

export const MOTIVATIONS = [
  'Rembourser une dette avant qu’il ne soit trop tard.',
  'Retrouver un proche disparu.',
  'Obtenir la reconnaissance qu’on lui a toujours refusée.',
  'Mettre sa famille à l’abri du besoin.',
  'Découvrir la vérité sur ses origines.',
  'Empêcher un événement qu’il/elle est seul(e) à redouter.'
]

export const PEURS = [
  'Être démasqué(e) et perdre tout ce qu’il/elle a bâti.',
  'La solitude — finir ses jours oublié(e) de tous.',
  'Un lieu, une créature ou un souvenir précis qui le hante.',
  'Échouer là où un proche a réussi.',
  'La mort, qu’il/elle a frôlée de trop près.',
  'Devenir ce qu’il/elle déteste le plus.'
]

export type PersonnalitePnj = {
  trait: string
  ideal: string
  lien: string
  defaut: string
  manie: string
  secret: string
  motivation: string
  peur: string
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export function genererPersonnalitePnj(): PersonnalitePnj {
  return {
    trait: pick(TRAITS_PERSONNALITE),
    ideal: pick(IDEAUX),
    lien: pick(LIENS),
    defaut: pick(DEFAUTS),
    manie: pick(MANIES),
    secret: pick(SECRETS),
    motivation: pick(MOTIVATIONS),
    peur: pick(PEURS)
  }
}

// Met la personnalité en forme dans un bloc de texte lisible (pour pré-remplir
// un champ « personnalité » ou « notes »).
export function formaterPersonnalitePnj(p: PersonnalitePnj): string {
  return [
    `Trait : ${p.trait}`,
    `Idéal : ${p.ideal}`,
    `Lien : ${p.lien}`,
    `Défaut : ${p.defaut}`,
    `Manie : ${p.manie}`,
    `Motivation : ${p.motivation}`,
    `Peur cachée : ${p.peur}`
  ].join('\n')
}
