// Helpers pour l'import/export JSON d'éléments (perso/scenario/...) et de la
// bibliothèque complète. Formats :
//
// Élément unique :
//   { app: 'dnd-mj-app', version: 1, type: 'personnage', data: { ... } }
//
// Bibliothèque :
//   { app: 'dnd-mj-app', version: 1, type: 'bibliotheque',
//     data: { scenarios: [], personnages: [], ennemis: [], items: [], maps: [], sorts: [] } }

export const APP_TAG = 'dnd-mj-app'
export const EXPORT_VERSION = 1

export type ExportType =
  | 'scenario'
  | 'personnage'
  | 'ennemi'
  | 'item'
  | 'map'
  | 'sort'
  | 'bibliotheque'

export type Enveloppe<TData = unknown> = {
  app: string
  version: number
  type: ExportType
  data: TData
  exported_at?: string
}

// Champs à retirer avant export : identifiants, colonnes créées par la DB ou
// spécifiques à un utilisateur. À l'import, ces champs sont régénérés.
const CHAMPS_A_RETIRER = [
  'id',
  'mj_id',
  'joueur_id',
  'scenario_id',
  'personnage_id',
  'created_at',
  'updated_at',
  'public',
  'nb_copies',
  'auteur_username',
  'conditions'
] as const

export function nettoyer<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if ((CHAMPS_A_RETIRER as readonly string[]).includes(k)) continue
    out[k] = v
  }
  return out
}

export function construireEnveloppe<TData>(type: ExportType, data: TData): Enveloppe<TData> {
  return {
    app: APP_TAG,
    version: EXPORT_VERSION,
    type,
    data,
    exported_at: new Date().toISOString()
  }
}

// Déclenche un téléchargement navigateur avec le contenu donné.
export function telechargerJSON(filename: string, contenu: unknown) {
  const texte = JSON.stringify(contenu, null, 2)
  const blob = new Blob([texte], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Nettoie le nom de fichier pour éviter / \ : * ? " < > |.
export function slugFichier(base: string) {
  const safe = base
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return safe || 'export'
}

export async function lireFichierJSON(file: File): Promise<unknown> {
  const texte = await file.text()
  return JSON.parse(texte)
}

// Retourne le data si l'enveloppe correspond au type attendu. Lève sinon.
export function validerEnveloppe<TData>(
  raw: unknown,
  typesAcceptes: ExportType[]
): Enveloppe<TData> {
  if (!raw || typeof raw !== 'object') throw new Error('Fichier JSON invalide.')
  const obj = raw as Partial<Enveloppe<TData>>
  if (obj.app !== APP_TAG) throw new Error("Ce fichier n'a pas été exporté depuis D&D Manager.")
  if (typeof obj.version !== 'number') throw new Error('Version manquante.')
  if (obj.version > EXPORT_VERSION) {
    throw new Error(
      `Ce fichier a été exporté par une version plus récente (v${obj.version}).`
    )
  }
  if (!obj.type || !typesAcceptes.includes(obj.type)) {
    throw new Error(
      `Type incorrect (reçu "${obj.type}", attendu ${typesAcceptes.join(' ou ')}).`
    )
  }
  if (obj.data === undefined || obj.data === null) throw new Error('Contenu manquant.')
  return obj as Enveloppe<TData>
}

// Sucre syntaxique pour un input[type=file] caché.
// Utilisation :
//   <label><input type="file" accept="application/json" onChange={onFichier} hidden />Importer</label>
export function ouvrirSelecteurFichier(
  onFichier: (f: File) => void,
  accept = 'application/json,.json'
) {
  if (typeof document === 'undefined') return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.onchange = () => {
    const f = input.files?.[0]
    if (f) onFichier(f)
  }
  input.click()
}
