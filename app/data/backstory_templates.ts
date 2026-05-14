// Générateur de backstory de personnage (roadmap 3.4).
// Tire une origine, un événement marquant, une perte, une motivation et un
// secret, puis assemble un texte cohérent de plusieurs paragraphes.

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export const ORIGINES = [
  'orphelin(e) recueilli(e) par un ordre monastique',
  'héritier(ère) d’une noblesse déchue, ruinée par les dettes',
  'fugitif(ve) recherché(e) pour un crime jamais commis',
  'ancien(ne) soldat(e) renvoyé(e) après une bataille désastreuse',
  'enfant des rues d’une grande cité portuaire',
  'apprenti(e) d’un artisan ou d’un mage exigeant',
  'rejeton d’une famille de marchands itinérants',
  'survivant(e) d’un village rayé de la carte',
  'élevé(e) à la lisière d’une forêt par un ermite',
  'né(e) sous une étoile que les devins jugeaient maudite'
]

export const EVENEMENTS = [
  'une trahison d’un être de confiance a tout fait basculer',
  'une révélation sur ses véritables origines a changé sa vie',
  'un miracle inexpliqué l’a sauvé(e) d’une mort certaine',
  'la rencontre d’un mentor a donné un sens à son existence',
  'un pacte conclu dans le désespoir le/la lie encore aujourd’hui',
  'la découverte d’un artefact a attiré sur lui/elle des regards dangereux',
  'une promesse faite à un mourant pèse sur sa conscience',
  'un duel ou une épreuve publique a forgé sa réputation'
]

export const PERTES = [
  'la disparition d’un frère ou d’une sœur, jamais retrouvé(e)',
  'la mort d’un parent dans des circonstances obscures',
  'la ruine totale de sa maison et de son nom',
  'l’exil loin de la seule terre qu’il/elle ait aimée',
  'la perte d’un amour, parti(e) sans un mot',
  'la trahison de son propre camp, qui l’a abandonné(e)'
]

export const MOTIVATIONS_BS = [
  'retrouver la personne qu’il/elle a perdue',
  'laver l’honneur de son nom',
  'comprendre la vérité derrière sa malédiction supposée',
  'rembourser une dette de vie qui le/la hante',
  'protéger les derniers êtres qui comptent pour lui/elle',
  'empêcher que sa tragédie ne se reproduise pour d’autres'
]

export const SECRETS_BS = [
  'porte une marque qu’il/elle dissimule à tout prix',
  'a survécu en commettant un acte dont il/elle a honte',
  'connaît l’emplacement de quelque chose que d’autres tueraient pour obtenir',
  'n’est pas réellement celui/celle qu’il/elle prétend être',
  'entend, parfois, une voix qui n’appartient à personne',
  'a juré fidélité à une cause qu’il/elle n’ose plus avouer'
]

export type Backstory = {
  origine: string
  evenement: string
  perte: string
  motivation: string
  secret: string
  texte: string
}

// Génère une backstory complète + le texte assemblé (3-4 paragraphes).
export function genererBackstory(nomPerso?: string): Backstory {
  const origine = pick(ORIGINES)
  const evenement = pick(EVENEMENTS)
  const perte = pick(PERTES)
  const motivation = pick(MOTIVATIONS_BS)
  const secret = pick(SECRETS_BS)
  const nom = nomPerso?.trim() || 'Le personnage'

  const texte = [
    `${nom} a commencé sa vie comme ${origine}. Rien ne le/la destinait à l’aventure — du moins le croyait-il/elle.`,
    `Puis ${evenement}. Cet épisode reste gravé en lui/elle comme une cicatrice : il/elle n’en parle jamais volontiers, mais tout son chemin en découle.`,
    `À cela s’ajoute ${perte} — un manque qu’aucune victoire n’a comblé. C’est en partie pour cette raison qu’il/elle cherche aujourd’hui à ${motivation}.`,
    `Ce que ses compagnons ignorent : ${nom} ${secret}. Un jour, ce secret refera surface. La question est de savoir s’il/elle sera prêt(e) ce jour-là.`
  ].join('\n\n')

  return { origine, evenement, perte, motivation, secret, texte }
}
