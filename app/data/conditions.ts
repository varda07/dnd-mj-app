// Conditions D&D 5e — données de référence
// Source : règles officielles (résumé français).
// L'identifiant (clé) est stocké en base dans la colonne `conditions` (jsonb
// array de clés), et les icônes / descriptions sont purement UI.

export type ConditionKey =
  | 'aveugle'
  | 'a_terre'
  | 'assourdi'
  | 'charme'
  | 'effraye'
  | 'empoisonne'
  | 'entrave'
  | 'etourdi'
  | 'inconscient'
  | 'invisible'
  | 'metamorphose'
  | 'paralyse'
  | 'petrifie'
  | 'ralenti'
  | 'saisi'

export type Condition = {
  key: ConditionKey
  nom: string
  icone: string
  description: string
  effets: string[]
}

export const CONDITIONS: Condition[] = [
  {
    key: 'aveugle',
    nom: 'Aveuglé',
    icone: '👁️‍🗨️',
    description:
      'La créature ne peut pas voir, et automatiquement rate tout jet de caractéristique qui nécessite la vue.',
    effets: [
      'Ne peut pas voir',
      'Rate les jets nécessitant la vue',
      'Les jets d’attaque contre elle ont l’avantage',
      'Ses propres jets d’attaque ont le désavantage'
    ]
  },
  {
    key: 'a_terre',
    nom: 'À terre',
    icone: '❌',
    description:
      'La créature est allongée au sol. Se relever coûte la moitié du mouvement.',
    effets: [
      'Seul Ramper est possible, sauf à se relever',
      'Désavantage aux jets d’attaque',
      'Avantage aux attaques de mêlée contre elle',
      'Désavantage aux attaques à distance contre elle'
    ]
  },
  {
    key: 'assourdi',
    nom: 'Assourdi',
    icone: '🔇',
    description:
      'La créature ne peut pas entendre et rate automatiquement les jets de caractéristique nécessitant l’ouïe.',
    effets: ['Ne peut pas entendre', 'Rate les jets nécessitant l’ouïe']
  },
  {
    key: 'charme',
    nom: 'Charmé',
    icone: '💗',
    description:
      'La créature ne peut pas attaquer son charmeur ni le cibler avec des effets nuisibles ; le charmeur a l’avantage aux interactions sociales avec elle.',
    effets: [
      'Ne peut pas attaquer le charmeur',
      'Ne peut pas cibler le charmeur avec un effet nuisible',
      'Le charmeur a l’avantage aux jets de charisme contre elle'
    ]
  },
  {
    key: 'effraye',
    nom: 'Effrayé',
    icone: '😨',
    description:
      'La créature subit le désavantage tant qu’elle voit la source de sa peur, et ne peut pas s’en rapprocher volontairement.',
    effets: [
      'Désavantage aux jets de caractéristique et d’attaque tant qu’elle voit la source',
      'Ne peut pas s’approcher volontairement de la source'
    ]
  },
  {
    key: 'empoisonne',
    nom: 'Empoisonné',
    icone: '🤢',
    description:
      'La créature subit le désavantage aux jets d’attaque et aux jets de caractéristique.',
    effets: ['Désavantage aux jets d’attaque', 'Désavantage aux jets de caractéristique']
  },
  {
    key: 'entrave',
    nom: 'Entravé',
    icone: '⛓️',
    description:
      'La vitesse de la créature est nulle. Elle subit le désavantage aux attaques et aux jets de Dextérité.',
    effets: [
      'Vitesse = 0 ; pas de bonus de vitesse',
      'Désavantage aux jets d’attaque',
      'Avantage aux jets d’attaque contre elle',
      'Désavantage aux jets de sauvegarde de Dextérité'
    ]
  },
  {
    key: 'etourdi',
    nom: 'Étourdi',
    icone: '💫',
    description:
      'La créature est neutralisée, ne peut pas bouger et ne peut parler que difficilement.',
    effets: [
      'Incapacité (pas d’action ni de réaction)',
      'Ne peut pas bouger',
      'Ne parle que difficilement',
      'Rate les jets de sauvegarde de Force et de Dextérité',
      'Avantage aux attaques contre elle'
    ]
  },
  {
    key: 'inconscient',
    nom: 'Inconscient',
    icone: '😵',
    description:
      'La créature est neutralisée, ne peut pas bouger ni parler, et n’a aucune conscience de son environnement.',
    effets: [
      'Incapacité, pas de mouvement ni de parole',
      'Lâche ce qu’elle tient et tombe à terre',
      'Rate les jets de sauvegarde de Force et de Dextérité',
      'Avantage aux attaques contre elle',
      'Toute attaque de mêlée à 1,50 m est un coup critique'
    ]
  },
  {
    key: 'invisible',
    nom: 'Invisible',
    icone: '👻',
    description:
      'La créature est impossible à voir sans l’aide d’un sens spécial ou d’un sort, et profite de ses attaques.',
    effets: [
      'Impossible à voir sans sens spécial',
      'Considérée comme fortement obscurcie pour la localiser',
      'Avantage aux jets d’attaque',
      'Désavantage aux jets d’attaque contre elle'
    ]
  },
  {
    key: 'metamorphose',
    nom: 'Métamorphosé',
    icone: '🔄',
    description:
      'La forme de la créature est modifiée (par un sort, un objet ou une capacité).',
    effets: ['Forme physique modifiée', 'Stats remplacées par la nouvelle forme']
  },
  {
    key: 'paralyse',
    nom: 'Paralysé',
    icone: '⚡',
    description:
      'La créature est neutralisée, ne peut pas bouger ni parler. Les coups critiques pleuvent.',
    effets: [
      'Incapacité, pas de mouvement ni de parole',
      'Rate les jets de sauvegarde de Force et de Dextérité',
      'Avantage aux attaques contre elle',
      'Toute attaque de mêlée à 1,50 m est un coup critique'
    ]
  },
  {
    key: 'petrifie',
    nom: 'Pétrifié',
    icone: '🗿',
    description:
      'La créature est transformée en une substance minérale inanimée (le plus souvent de la pierre) avec ses biens.',
    effets: [
      'Transformée en pierre, incapacité',
      'Poids multiplié par dix',
      'Ne vieillit plus',
      'Résistance à tous les dégâts',
      'Immunisée au poison et à la maladie',
      'Rate les jets de Force et de Dextérité',
      'Avantage aux attaques contre elle'
    ]
  },
  {
    key: 'ralenti',
    nom: 'Ralenti',
    icone: '🐌',
    description:
      'La créature agit au ralenti : vitesse divisée par deux, moins d’attaques, CA et Dex pénalisés.',
    effets: [
      'Vitesse divisée par 2',
      '-2 à la CA et aux jets de sauvegarde de Dextérité',
      'Ne peut pas utiliser de réactions',
      'Une seule attaque ou un seul sort par tour'
    ]
  },
  {
    key: 'saisi',
    nom: 'Saisi',
    icone: '✋',
    description:
      'La créature est immobilisée par un agresseur ou un effet. Sa vitesse tombe à 0.',
    effets: [
      'Vitesse = 0 ; ne bénéficie d’aucun bonus de vitesse',
      'Prend fin si la saisie est brisée ou si l’agresseur ne peut plus maintenir la prise'
    ]
  }
]

export const CONDITIONS_MAP: Record<ConditionKey, Condition> = CONDITIONS.reduce(
  (acc, c) => {
    acc[c.key] = c
    return acc
  },
  {} as Record<ConditionKey, Condition>
)

export const isConditionKey = (v: unknown): v is ConditionKey =>
  typeof v === 'string' && v in CONDITIONS_MAP
