// Conditions D&D 5e — données de référence
// Source : règles officielles (résumé français).
// L'identifiant (clé) est stocké en base dans la colonne `conditions` (jsonb
// array de clés), et les icônes / descriptions sont purement UI.

export type ConditionKey =
  | 'aveugle'
  | 'a_terre'
  | 'assourdi'
  | 'beni'
  | 'charme'
  | 'effraye'
  | 'empoisonne'
  | 'entrave'
  | 'etourdi'
  | 'hate'
  | 'inconscient'
  | 'invisible'
  | 'metamorphose'
  | 'paralyse'
  | 'petrifie'
  | 'ralenti'
  | 'saisi'
  // Épuisement : 6 niveaux cumulatifs (chaque niveau ajoute ses effets aux
  // précédents). Stockés comme des clés distinctes ; l'UI n'autorise qu'un seul
  // niveau actif à la fois.
  | 'epuisement_1'
  | 'epuisement_2'
  | 'epuisement_3'
  | 'epuisement_4'
  | 'epuisement_5'
  | 'epuisement_6'

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
    key: 'beni',
    nom: 'Béni',
    icone: '✨',
    description:
      'La créature est bénie : elle ajoute 1d4 à ses jets d’attaque et à ses jets de sauvegarde.',
    effets: [
      'Ajoute 1d4 aux jets d’attaque',
      'Ajoute 1d4 aux jets de sauvegarde'
    ]
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
    key: 'hate',
    nom: 'Hâte',
    icone: '⏩',
    description:
      'La créature est hâtée : vitesse doublée, +2 à la CA, avantage aux jets de sauvegarde de Dextérité, et une action supplémentaire à chaque tour.',
    effets: [
      'Vitesse doublée',
      '+2 à la CA',
      'Avantage aux jets de sauvegarde de Dextérité',
      'Action supplémentaire (Attaquer, Foncer, Se désengager, Se cacher ou Utiliser un objet)',
      'À la fin de l’effet : ne peut ni bouger ni agir au tour suivant'
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
  },
  {
    key: 'epuisement_1',
    nom: 'Épuisement (niv. 1)',
    icone: '🥵',
    description: 'Niveau 1 d’épuisement.',
    effets: ['Désavantage aux jets de caractéristique']
  },
  {
    key: 'epuisement_2',
    nom: 'Épuisement (niv. 2)',
    icone: '🥵',
    description: 'Niveau 2 d’épuisement (effets cumulatifs).',
    effets: ['Désavantage aux jets de caractéristique', 'Vitesse réduite de moitié']
  },
  {
    key: 'epuisement_3',
    nom: 'Épuisement (niv. 3)',
    icone: '🥵',
    description: 'Niveau 3 d’épuisement (effets cumulatifs).',
    effets: [
      'Désavantage aux jets de caractéristique',
      'Vitesse réduite de moitié',
      'Désavantage aux jets d’attaque et de sauvegarde'
    ]
  },
  {
    key: 'epuisement_4',
    nom: 'Épuisement (niv. 4)',
    icone: '🥵',
    description: 'Niveau 4 d’épuisement (effets cumulatifs).',
    effets: [
      'Désavantage aux jets de caractéristique',
      'Vitesse réduite de moitié',
      'Désavantage aux jets d’attaque et de sauvegarde',
      'Maximum de points de vie réduit de moitié'
    ]
  },
  {
    key: 'epuisement_5',
    nom: 'Épuisement (niv. 5)',
    icone: '🥵',
    description: 'Niveau 5 d’épuisement (effets cumulatifs).',
    effets: [
      'Désavantage aux jets de caractéristique',
      'Vitesse réduite à 0',
      'Désavantage aux jets d’attaque et de sauvegarde',
      'Maximum de points de vie réduit de moitié'
    ]
  },
  {
    key: 'epuisement_6',
    nom: 'Épuisement (niv. 6)',
    icone: '💀',
    description: 'Niveau 6 d’épuisement : la créature meurt.',
    effets: [
      'La créature meurt',
      'Vitesse à 0',
      'Désavantage à tous les jets',
      'Maximum de points de vie réduit de moitié'
    ]
  }
]

// Clés des 6 niveaux d'épuisement, dans l'ordre. Utilisé par l'UI pour
// proposer un sélecteur de niveau unique plutôt que 6 conditions distinctes.
export const EPUISEMENT_KEYS: ConditionKey[] = [
  'epuisement_1',
  'epuisement_2',
  'epuisement_3',
  'epuisement_4',
  'epuisement_5',
  'epuisement_6'
]

export const isEpuisementKey = (v: unknown): v is ConditionKey =>
  typeof v === 'string' && (EPUISEMENT_KEYS as string[]).includes(v)

// Niveau (1-6) d'une clé d'épuisement, ou 0 si ce n'en est pas une.
export const epuisementNiveau = (key: string): number => {
  const m = /^epuisement_(\d)$/.exec(key)
  return m ? Number(m[1]) : 0
}

export const CONDITIONS_MAP: Record<ConditionKey, Condition> = CONDITIONS.reduce(
  (acc, c) => {
    acc[c.key] = c
    return acc
  },
  {} as Record<ConditionKey, Condition>
)

export const isConditionKey = (v: unknown): v is ConditionKey =>
  typeof v === 'string' && v in CONDITIONS_MAP
