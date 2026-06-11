'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  WIDGETS,
  WIDGETS_BY_TYPE,
  GRID_COLS,
  GRID_ROWS,
  chevauche,
  premierEmplacementLibre,
  nouveauId,
  type DashboardConfig,
  type DashboardPrefs,
  type WidgetType
} from '@/app/lib/widgets'
import WidgetRender from '@/app/components/widgets/WidgetRender'

// ============================================================================
// Page Personnalisation
// ----------------------------------------------------------------------------
// Édite un objet `dashboard_config` jsonb stocké sur profiles, contenant :
//   - active : id de la config à utiliser sur la page d'accueil, ou null
//   - configs : liste de configurations nommées
//
// Drag & drop natif HTML5 :
//   - depuis la palette (widget non placé) vers une case → ajout
//   - depuis une case occupée vers une autre case → déplacement
// ============================================================================

export default function PersonnalisationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<DashboardPrefs>({ active: null, configs: [] })
  const [configId, setConfigId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [draggingType, setDraggingType] = useState<WidgetType | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  // --------------------------------------------------------------------------
  // Chargement initial
  // --------------------------------------------------------------------------
  useEffect(() => {
    let cancel = false
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('dashboard_config')
        .eq('id', user.id)
        .maybeSingle()
      if (cancel) return
      const raw = (data?.dashboard_config as DashboardPrefs | null) ?? null
      const norm: DashboardPrefs =
        raw && Array.isArray(raw.configs)
          ? raw
          : { active: null, configs: [] }
      setPrefs(norm)
      setConfigId(norm.active ?? norm.configs[0]?.id ?? null)
      setLoading(false)
    }
    load()
    return () => {
      cancel = true
    }
  }, [router])

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  const config = useMemo(
    () => prefs.configs.find((c) => c.id === configId) ?? null,
    [prefs.configs, configId]
  )

  const sauvegarder = useCallback(
    async (next: DashboardPrefs) => {
      setStatusMsg('Sauvegarde…')
      setPrefs(next)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase
        .from('profiles')
        .update({ dashboard_config: next })
        .eq('id', user.id)
      if (error) {
        console.error('[perso] save :', error)
        setStatusMsg('Erreur')
        return
      }
      setStatusMsg('✓ Sauvegardé')
      setTimeout(() => setStatusMsg(''), 1500)
    },
    []
  )

  const patchConfig = useCallback(
    async (id: string, fn: (c: DashboardConfig) => DashboardConfig) => {
      const next: DashboardPrefs = {
        ...prefs,
        configs: prefs.configs.map((c) => (c.id === id ? fn(c) : c))
      }
      await sauvegarder(next)
    },
    [prefs, sauvegarder]
  )

  const creerConfig = useCallback(async () => {
    const nom = window.prompt('Nom de la configuration ?', 'Nouvelle configuration')
    if (!nom) return
    const newCfg: DashboardConfig = {
      id: nouveauId(),
      nom: nom.trim() || 'Nouvelle configuration',
      widgets: []
    }
    const next: DashboardPrefs = {
      ...prefs,
      configs: [...prefs.configs, newCfg]
    }
    await sauvegarder(next)
    setConfigId(newCfg.id)
  }, [prefs, sauvegarder])

  const supprimerConfig = useCallback(
    async (id: string) => {
      if (!window.confirm('Supprimer cette configuration ?')) return
      const next: DashboardPrefs = {
        active: prefs.active === id ? null : prefs.active,
        configs: prefs.configs.filter((c) => c.id !== id)
      }
      await sauvegarder(next)
      setConfigId(next.configs[0]?.id ?? null)
    },
    [prefs, sauvegarder]
  )

  const utiliserCommeActive = useCallback(
    async (id: string | null) => {
      await sauvegarder({ ...prefs, active: id })
    },
    [prefs, sauvegarder]
  )

  // --------------------------------------------------------------------------
  // Drag & drop
  // --------------------------------------------------------------------------
  const onCellDrop = (x: number, y: number) => {
    if (!config) return
    if (draggingType !== null) {
      // Ajout depuis la palette
      const def = WIDGETS_BY_TYPE[draggingType]
      // Snap pour rester dans la grille
      const xClamp = Math.min(x, GRID_COLS - def.w)
      const yClamp = Math.min(y, GRID_ROWS - def.h)
      if (chevauche(config.widgets, { x: xClamp, y: yClamp, w: def.w, h: def.h })) {
        setStatusMsg('Emplacement occupé')
        setTimeout(() => setStatusMsg(''), 1500)
      } else {
        patchConfig(config.id, (c) => ({
          ...c,
          widgets: [...c.widgets, { type: def.type, x: xClamp, y: yClamp, w: def.w, h: def.h }]
        }))
      }
      setDraggingType(null)
      return
    }
    if (draggingIndex !== null) {
      // Déplacement d'un widget placé
      const w = config.widgets[draggingIndex]
      const xClamp = Math.min(x, GRID_COLS - w.w)
      const yClamp = Math.min(y, GRID_ROWS - w.h)
      if (chevauche(config.widgets, { x: xClamp, y: yClamp, w: w.w, h: w.h }, draggingIndex)) {
        setStatusMsg('Emplacement occupé')
        setTimeout(() => setStatusMsg(''), 1500)
      } else {
        patchConfig(config.id, (c) => ({
          ...c,
          widgets: c.widgets.map((it, i) =>
            i === draggingIndex ? { ...it, x: xClamp, y: yClamp } : it
          )
        }))
      }
      setDraggingIndex(null)
    }
  }

  const supprimerWidget = (index: number) => {
    if (!config) return
    patchConfig(config.id, (c) => ({
      ...c,
      widgets: c.widgets.filter((_, i) => i !== index)
    }))
  }

  const ajoutAutomatique = (type: WidgetType) => {
    if (!config) return
    const def = WIDGETS_BY_TYPE[type]
    const slot = premierEmplacementLibre(config.widgets, def.w, def.h)
    if (!slot) {
      setStatusMsg('Grille pleine — supprime un widget')
      setTimeout(() => setStatusMsg(''), 2000)
      return
    }
    patchConfig(config.id, (c) => ({
      ...c,
      widgets: [...c.widgets, { type: def.type, x: slot.x, y: slot.y, w: def.w, h: def.h }]
    }))
  }

  // --------------------------------------------------------------------------
  // Rendu
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <p className="text-gray-400">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Retour
          </button>
          <h1 className="text-xl md:text-2xl grim-title">
            🎨 Personnaliser l&apos;accueil
          </h1>
          {statusMsg && (
            <span className="text-xs text-yellow-300 italic">{statusMsg}</span>
          )}
        </div>

        {/* Barre de configurations */}
        <div className="bg-gray-800 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2">
          <select
            value={configId ?? ''}
            onChange={(e) => setConfigId(e.target.value || null)}
            className="p-2 rounded bg-gray-900 text-white border border-gray-700 outline-none text-sm flex-1 min-w-[200px]"
          >
            {prefs.configs.length === 0 && (
              <option value="">Aucune configuration</option>
            )}
            {prefs.configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
                {prefs.active === c.id ? ' (active)' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={creerConfig}
            className="px-3 py-2 bg-yellow-500 text-gray-900 font-bold rounded text-xs uppercase tracking-wider hover:bg-yellow-400"
          >
            + Nouvelle
          </button>
          {config && (
            <>
              <button
                type="button"
                onClick={() => {
                  const nom = window.prompt('Renommer la configuration ?', config.nom)
                  if (nom !== null) patchConfig(config.id, (c) => ({ ...c, nom: nom.trim() || c.nom }))
                }}
                className="px-3 py-2 border border-gray-700 text-gray-300 rounded text-xs uppercase tracking-wider hover:bg-gray-700"
              >
                ✎ Renommer
              </button>
              <button
                type="button"
                onClick={() =>
                  utiliserCommeActive(prefs.active === config.id ? null : config.id)
                }
                className={`px-3 py-2 rounded text-xs uppercase tracking-wider font-bold ${
                  prefs.active === config.id
                    ? 'bg-green-600/20 border border-green-500 text-green-300'
                    : 'border border-yellow-600 text-yellow-300 hover:bg-yellow-500/10'
                }`}
              >
                {prefs.active === config.id
                  ? '✓ Utilisée comme accueil'
                  : '✅ Utiliser comme accueil'}
              </button>
              <button
                type="button"
                onClick={() => supprimerConfig(config.id)}
                className="px-3 py-2 border border-red-700/50 text-red-300 rounded text-xs uppercase tracking-wider hover:bg-red-900/30"
              >
                Supprimer
              </button>
            </>
          )}
          {prefs.active !== null && (
            <button
              type="button"
              onClick={() => utiliserCommeActive(null)}
              className="ml-auto px-3 py-2 text-xs text-gray-400 hover:text-white underline"
              title="Revenir au dashboard par défaut"
            >
              ↺ Dashboard par défaut
            </button>
          )}
        </div>

        {!config ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400 italic">
              Crée une première configuration pour commencer à composer ton dashboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            {/* Grille principale */}
            <div className="grim-card p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500 font-bold mb-2">
                Aperçu — {GRID_COLS} × {GRID_ROWS}
              </p>
              <div
                className="grid gap-2 relative"
                style={{
                  gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
                  gridAutoRows: '110px'
                }}
              >
                {/* Cellules vides cliquables (drop targets) */}
                {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, idx) => {
                  const x = idx % GRID_COLS
                  const y = Math.floor(idx / GRID_COLS)
                  const occupee = config.widgets.some(
                    (w) =>
                      x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h
                  )
                  if (occupee) return null
                  return (
                    <div
                      key={`cell-${x}-${y}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onCellDrop(x, y)}
                      className="rounded border border-dashed border-gray-700/60 hover:border-yellow-500/60 transition-colors"
                      style={{ gridColumn: `${x + 1}`, gridRow: `${y + 1}` }}
                    />
                  )
                })}

                {/* Widgets placés */}
                {config.widgets.map((w, i) => {
                  const def = WIDGETS_BY_TYPE[w.type]
                  return (
                    <div
                      key={`w-${i}`}
                      draggable
                      onDragStart={() => {
                        setDraggingIndex(i)
                        setDraggingType(null)
                      }}
                      onDragEnd={() => setDraggingIndex(null)}
                      className="relative rounded-lg overflow-hidden group"
                      style={{
                        gridColumn: `${w.x + 1} / span ${w.w}`,
                        gridRow: `${w.y + 1} / span ${w.h}`,
                        background:
                          'linear-gradient(180deg, rgba(20,15,8,0.5) 0%, rgba(10,8,4,0.3) 100%)',
                        border: '1px solid rgba(201,168,76,0.20)',
                        cursor: 'grab'
                      }}
                      title={`${def.label} — glisser pour déplacer`}
                    >
                      <div className="pointer-events-none w-full h-full">
                        <WidgetRender type={w.type} />
                      </div>
                      <button
                        type="button"
                        onClick={() => supprimerWidget(i)}
                        className="absolute top-1 right-1 w-9 h-9 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-black/60 text-red-300 hover:bg-red-700 hover:text-white text-base md:text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        title="Supprimer ce widget"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Palette */}
            <aside className="grim-card p-3 max-h-[calc(100vh-200px)] overflow-y-auto [scrollbar-width:thin]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500 font-bold mb-3">
                Widgets disponibles
              </p>
              <div className="space-y-2">
                {WIDGETS.map((w) => (
                  <div
                    key={w.type}
                    draggable
                    onDragStart={() => {
                      setDraggingType(w.type)
                      setDraggingIndex(null)
                    }}
                    onDragEnd={() => setDraggingType(null)}
                    onClick={() => ajoutAutomatique(w.type)}
                    className="p-2 rounded border border-gray-700 bg-gray-900/40 hover:border-yellow-600 hover:bg-yellow-500/5 cursor-grab transition-all"
                    title="Glisser dans la grille ou cliquer pour placer automatiquement"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{w.icone}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">
                          {w.label}
                        </p>
                        <p className="text-[10px] text-gray-400 italic truncate">
                          {w.description}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {w.w}×{w.h}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
