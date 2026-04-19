export type ThemeKey =
  | 'runique'
  | 'parchemin'
  | 'lave'
  | 'necromancien'
  | 'royal'

export type ThemeColors = {
  bg_primary: string
  bg_secondary: string
  bg_card: string
  border_color: string
  text_primary: string
  text_secondary: string
  accent_color: string
}

export type Theme = {
  key: ThemeKey
  label: string
  description: string
  slogan: string
  colors: ThemeColors
}

export const DEFAULT_THEME: ThemeKey = 'runique'

export const THEMES: Record<ThemeKey, Theme> = {
  runique: {
    key: 'runique',
    label: 'Runique',
    description: 'Violet mystique sur pierre',
    slogan: 'ᚷᚨᚱᛞᛁᚨᚾ ᛟᚠ ᚱᛖᚨᛚᛗᛊ',
    colors: {
      bg_primary: '#0f0a1e',
      bg_secondary: '#1a1332',
      bg_card: '#2a1f4a',
      border_color: '#3d2c6b',
      text_primary: '#f5f3fa',
      text_secondary: '#a79fc4',
      accent_color: '#a855f7'
    }
  },
  parchemin: {
    key: 'parchemin',
    label: 'Parchemin',
    description: 'Or antique sur encre',
    slogan: 'MAÎTRE DU DONJON',
    colors: {
      bg_primary: '#0a0805',
      bg_secondary: '#1a1508',
      bg_card: '#2a2010',
      border_color: '#4a3820',
      text_primary: '#fef3c7',
      text_secondary: '#d4a574',
      accent_color: '#d97706'
    }
  },
  lave: {
    key: 'lave',
    label: 'Lave',
    description: 'Rouge infernal et magma',
    slogan: 'FORGÉ DANS LES FLAMMES DES ENFERS',
    colors: {
      bg_primary: '#0f0300',
      bg_secondary: '#1f0a05',
      bg_card: '#2f1510',
      border_color: 'rgba(220,60,0,0.7)',
      text_primary: '#fff0e0',
      text_secondary: '#c08060',
      accent_color: '#ff4400'
    }
  },
  necromancien: {
    key: 'necromancien',
    label: 'Nécromancien',
    description: 'Vert sombre de magie noire',
    slogan: 'LES MORTS OBÉISSENT',
    colors: {
      bg_primary: '#050508',
      bg_secondary: '#0a0a10',
      bg_card: '#0f1012',
      border_color: 'rgba(0,180,60,0.5)',
      text_primary: '#e0ffe8',
      text_secondary: '#6a9078',
      accent_color: '#00cc44'
    }
  },
  royal: {
    key: 'royal',
    label: 'Royal Draconique',
    description: 'Or héraldique et sang royal',
    slogan: 'FORTIS FORTUNA ADIUVAT',
    colors: {
      bg_primary: '#050200',
      bg_secondary: '#0f0805',
      bg_card: '#1a0f05',
      border_color: '#8B0000',
      text_primary: '#C9A84C',
      text_secondary: '#8B0000',
      accent_color: '#C9A84C'
    }
  }
}

export const THEME_KEYS: ThemeKey[] = [
  'runique',
  'parchemin',
  'lave',
  'necromancien',
  'royal'
]

export const PREMIUM_THEMES: ThemeKey[] = ['royal']

export const applyTheme = (key: ThemeKey | null | undefined) => {
  if (typeof document === 'undefined') {
    console.log('[theme] applyTheme appelé côté serveur, ignoré')
    return
  }
  const effective: ThemeKey = key && key in THEMES ? key : DEFAULT_THEME
  const t = THEMES[effective]
  const root = document.documentElement
  const vars: Record<string, string> = {
    '--theme-bg-primary': t.colors.bg_primary,
    '--theme-bg-secondary': t.colors.bg_secondary,
    '--theme-bg-card': t.colors.bg_card,
    '--theme-border': t.colors.border_color,
    '--theme-text-primary': t.colors.text_primary,
    '--theme-text-secondary': t.colors.text_secondary,
    '--theme-accent': t.colors.accent_color
  }
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v)
  }
  root.setAttribute('data-theme', effective)
  console.log(
    `[theme] applyTheme('${effective}') → <html data-theme="${effective}">`,
    {
      cible: root.tagName,
      dataTheme: root.getAttribute('data-theme'),
      variables: vars
    }
  )
}
