'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap 11.1 — Custom themes
// ----------------------------------------------------------------------------
// Éditeur de thème : color pickers pour les 7 variables de thème, preview
// live, sauvegarde dans `themes_custom`, application (CSS vars + localStorage
// pour persistance via ThemeLoader), export/import JSON.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  lireFichierJSON,
  ouvrirSelecteurFichier,
  telechargerJSON
} from '@/app/lib/import-export'

// Les 7 variables CSS pilotées par le système de thème (cf. styles/themes.ts).
const VARS: { cle: string; cssVar: string; label: string }[] = [
  { cle: 'bg_primary', cssVar: '--theme-bg-primary', label: 'Fond principal' },
  { cle: 'bg_secondary', cssVar: '--theme-bg-secondary', label: 'Fond secondaire' },
  { cle: 'bg_card', cssVar: '--theme-bg-card', label: 'Fond des cartes' },
  { cle: 'border_color', cssVar: '--theme-border', label: 'Bordures' },
  { cle: 'text_primary', cssVar: '--theme-text-primary', label: 'Texte principal' },
  { cle: 'text_secondary', cssVar: '--theme-text-secondary', label: 'Texte secondaire' },
  { cle: 'accent_color', cssVar: '--theme-accent', label: 'Accent' }
]

type Variables = Record<string, string>

const DEFAUT: Variables = {
  bg_primary: '#0a0b0d',
  bg_secondary: '#0f1115',
  bg_card: '#12141a',
  border_color: '#2a2418',
  text_primary: '#e8e8ec',
  text_secondary: '#6a6a72',
  accent_color: '#C9A84C'
}

const LS_KEY = 'customTheme'

type ThemeSauve = {
  id: string
  nom: string
  variables: Variables
  public: boolean
}

// Applique un set de variables au :root (utilisé pour la preview et l'app).
function appliquerVariables(v: Variables) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  VARS.forEach(({ cle, cssVar }) => {
    if (v[cle]) root.style.setProperty(cssVar, v[cle])
  })
}

export default function CustomThemesPage() {
  const router = useRouter()
  const [nom, setNom] = useState('Mon thème')
  const [vars, setVars] = useState<Variables>({ ...DEFAUT })
  const [estPublic, setEstPublic] = useState(false)
  const [sauves, setSauves] = useState<ThemeSauve[]>([])
  const [message, setMessage] = useState('')

  const charger = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }
    const { data } = await supabase
      .from('themes_custom')
      .select('id, nom, variables, public')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setSauves((data ?? []) as ThemeSauve[])
  }, [router])

  useEffect(() => {
    charger()
    // Pré-remplit avec le thème custom actif s'il y en a un.
    try {
      const actif = localStorage.getItem(LS_KEY)
      if (actif) setVars({ ...DEFAUT, ...JSON.parse(actif) })
    } catch {
      /* ignore */
    }
  }, [charger])

  const setVar = (cle: string, valeur: string) =>
    setVars((v) => ({ ...v, [cle]: valeur }))

  const previsualiser = () => {
    appliquerVariables(vars)
    setMessage('Aperçu appliqué (non sauvegardé).')
  }

  const appliquer = () => {
    appliquerVariables(vars)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(vars))
    } catch {
      /* ignore */
    }
    setMessage('✓ Thème appliqué — il sera conservé à la prochaine connexion.')
  }

  const reinitialiser = () => {
    try {
      localStorage.removeItem(LS_KEY)
    } catch {
      /* ignore */
    }
    setVars({ ...DEFAUT })
    setMessage('Thème custom désactivé — rechargez la page pour revenir au thème de base.')
  }

  const sauvegarder = async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('themes_custom').insert({
      user_id: user.id,
      nom: nom.trim() || 'Mon thème',
      variables: vars,
      public: estPublic
    })
    if (error) {
      setMessage(`Erreur : ${error.message}`)
      return
    }
    setMessage('✓ Thème sauvegardé.')
    charger()
  }

  const supprimer = async (id: string) => {
    await supabase.from('themes_custom').delete().eq('id', id)
    charger()
  }

  const chargerSauve = (t: ThemeSauve) => {
    setNom(t.nom)
    setVars({ ...DEFAUT, ...t.variables })
    setEstPublic(t.public)
    appliquerVariables({ ...DEFAUT, ...t.variables })
    setMessage(`Thème « ${t.nom} » chargé dans l'éditeur.`)
  }

  const exporter = () => {
    telechargerJSON(`theme-${nom.trim().toLowerCase().replace(/\s+/g, '-') || 'custom'}.json`, {
      type: 'theme_custom',
      nom,
      variables: vars
    })
  }

  const importer = () => {
    ouvrirSelecteurFichier(async (f) => {
      try {
        const raw = (await lireFichierJSON(f)) as {
          nom?: string
          variables?: Variables
        }
        if (!raw.variables) throw new Error('Fichier de thème invalide.')
        setNom(raw.nom ?? 'Thème importé')
        setVars({ ...DEFAUT, ...raw.variables })
        setMessage('Thème importé dans l’éditeur.')
      } catch (err) {
        setMessage(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
      }
    })
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Retour
          </button>
          <h1 className="text-2xl grim-title">Thème personnalisé</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
          {/* Éditeur */}
          <section className="rounded-lg p-4 bg-gray-800 border border-gray-700 space-y-3">
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom du thème"
              className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none text-sm"
            />
            <div className="space-y-2">
              {VARS.map((v) => (
                <div key={v.cle} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={
                      /^#[0-9a-f]{6}$/i.test(vars[v.cle] ?? '')
                        ? vars[v.cle]
                        : '#000000'
                    }
                    onChange={(e) => setVar(v.cle, e.target.value)}
                    className="w-10 h-9 rounded bg-transparent border border-gray-600 cursor-pointer flex-shrink-0"
                    aria-label={v.label}
                  />
                  <span className="text-sm text-gray-300 w-40 flex-shrink-0">
                    {v.label}
                  </span>
                  <input
                    type="text"
                    value={vars[v.cle] ?? ''}
                    onChange={(e) => setVar(v.cle, e.target.value)}
                    className="flex-1 p-1.5 rounded bg-gray-700 text-white border border-gray-600 outline-none text-xs font-mono"
                  />
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={estPublic}
                onChange={(e) => setEstPublic(e.target.checked)}
                className="accent-yellow-500"
              />
              Rendre ce thème public
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={previsualiser}
                className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm font-bold"
              >
                👁 Aperçu
              </button>
              <button
                type="button"
                onClick={appliquer}
                className="px-3 py-2 rounded bg-yellow-500 text-gray-900 text-sm font-bold"
              >
                ✓ Appliquer
              </button>
              <button
                type="button"
                onClick={sauvegarder}
                className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm font-bold"
              >
                💾 Sauvegarder
              </button>
              <button
                type="button"
                onClick={exporter}
                className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
              >
                📤 Export
              </button>
              <button
                type="button"
                onClick={importer}
                className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
              >
                📥 Import
              </button>
              <button
                type="button"
                onClick={reinitialiser}
                className="px-3 py-2 rounded text-sm text-gray-400 hover:text-red-300"
              >
                Désactiver
              </button>
            </div>
            {message && <p className="text-yellow-400 text-xs">{message}</p>}
          </section>

          {/* Preview + thèmes sauvegardés */}
          <aside className="space-y-4">
            <div
              className="rounded-lg p-3 border"
              style={{
                background: vars.bg_secondary,
                borderColor: vars.border_color
              }}
            >
              <p
                className="text-[10px] uppercase tracking-widest mb-2"
                style={{ color: vars.text_secondary }}
              >
                Aperçu
              </p>
              <div
                className="rounded p-3 border"
                style={{
                  background: vars.bg_card,
                  borderColor: vars.border_color
                }}
              >
                <p
                  className="font-bold text-sm"
                  style={{ color: vars.accent_color }}
                >
                  Titre d&apos;exemple
                </p>
                <p className="text-xs mt-1" style={{ color: vars.text_primary }}>
                  Texte principal sur une carte.
                </p>
                <p className="text-xs" style={{ color: vars.text_secondary }}>
                  Texte secondaire, plus discret.
                </p>
                <button
                  type="button"
                  className="mt-2 px-2 py-1 rounded text-xs font-bold"
                  style={{
                    background: vars.accent_color,
                    color: vars.bg_primary
                  }}
                >
                  Bouton
                </button>
              </div>
            </div>

            <div className="rounded-lg p-3 bg-gray-800 border border-gray-700">
              <p className="text-[10px] uppercase tracking-widest text-[#C9A84C]/80 mb-2">
                Mes thèmes sauvegardés
              </p>
              {sauves.length === 0 ? (
                <p className="text-gray-500 text-xs italic">Aucun.</p>
              ) : (
                <ul className="space-y-1">
                  {sauves.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 text-xs rounded border border-gray-700 bg-black/30 px-2 py-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => chargerSauve(t)}
                        className="flex-1 text-left text-gray-200 hover:text-[#e6c878] truncate"
                      >
                        {t.nom}
                        {t.public && <span className="text-gray-500"> · 🌍</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => supprimer(t.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
