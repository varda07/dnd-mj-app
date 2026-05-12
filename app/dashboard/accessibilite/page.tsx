'use client'

export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { useA11y, type DaltonienType } from '@/app/lib/accessibility'

// ============================================================================
// Page Accessibilité — 6 options activées globalement via les attributs
// data-a11y-* sur <html>. Persistées localStorage + profiles.accessibilite.
// ============================================================================

const DALTONIEN_OPTIONS: { value: DaltonienType; label: string; desc: string }[] = [
  { value: 'off', label: 'Désactivé', desc: 'Couleurs originales' },
  { value: 'deuteranopie', label: 'Deutéranopie', desc: 'Confusion verts/rouges (plus fréquent)' },
  { value: 'protanopie', label: 'Protanopie', desc: 'Rouges peu visibles' },
  { value: 'tritanopie', label: 'Tritanopie', desc: 'Confusion bleus/jaunes' }
]

export default function AccessibilitePage() {
  const router = useRouter()
  const { settings, update, reset } = useA11y()

  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            ← Retour
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-yellow-500">
            ♿ Accessibilité
          </h1>
          <button
            type="button"
            onClick={reset}
            className="ml-auto text-xs text-gray-400 hover:text-white underline"
          >
            Réinitialiser
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          Toutes ces options sont gratuites, s&apos;appliquent immédiatement et
          persistent entre les sessions. Elles sont également suivies sur tous
          tes appareils si tu es connecté.
        </p>

        <div className="space-y-4">
          {/* ---- 1. Mode daltonien ---- */}
          <section className="bg-gray-800 rounded-lg p-4 md:p-5">
            <header className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 className="text-base font-bold text-yellow-500">
                🎨 Mode daltonien
              </h2>
              <span className="text-xs text-gray-400 italic">
                Corrige les couleurs pour mieux distinguer rouges/verts/bleus
              </span>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DALTONIEN_OPTIONS.map((opt) => {
                const actif = settings.daltonien === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ daltonien: opt.value })}
                    className={`text-left p-3 rounded-md transition border ${
                      actif
                        ? 'bg-yellow-500/10 border-yellow-500'
                        : 'bg-gray-900/40 border-gray-700 hover:border-yellow-600/60'
                    }`}
                  >
                    <p className="text-sm font-bold text-white">{opt.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ---- 2. Police dyslexique ---- */}
          <section className="bg-gray-800 rounded-lg p-4 md:p-5">
            <header className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-yellow-500">
                  🔤 Police dyslexique
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Utilise Atkinson Hyperlegible — conçue par le Braille Institute
                  pour améliorer la lecture (alternative à OpenDyslexic).
                </p>
              </div>
              <Switch
                checked={settings.dyslexique}
                onChange={(v) => update({ dyslexique: v })}
              />
            </header>
          </section>

          {/* ---- 3. Taille de police ---- */}
          <section className="bg-gray-800 rounded-lg p-4 md:p-5">
            <header className="mb-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold text-yellow-500">
                  🔍 Taille de police
                </h2>
                <span className="text-sm font-mono text-yellow-300">
                  {settings.fontScale}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Agrandit (ou réduit) toutes les tailles de texte de l&apos;application.
              </p>
            </header>
            <input
              type="range"
              min={80}
              max={150}
              step={5}
              value={settings.fontScale}
              onChange={(e) => update({ fontScale: parseInt(e.target.value) })}
              className="w-full accent-yellow-500"
              aria-label="Taille de police"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>80%</span>
              <span>100%</span>
              <span>150%</span>
            </div>
          </section>

          {/* ---- 4. Haut contraste ---- */}
          <section className="bg-gray-800 rounded-lg p-4 md:p-5">
            <header className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-yellow-500">
                  🌓 Mode haut contraste
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Renforce les bordures, les textes et les anneaux de focus.
                </p>
              </div>
              <Switch
                checked={settings.hautContraste}
                onChange={(v) => update({ hautContraste: v })}
              />
            </header>
          </section>

          {/* ---- 5. Réduction des animations ---- */}
          <section className="bg-gray-800 rounded-lg p-4 md:p-5">
            <header className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-yellow-500">
                  ⏸ Réduire les animations
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Désactive transitions, fades, et autres mouvements non
                  essentiels (utile en cas de cinétose).
                </p>
              </div>
              <Switch
                checked={settings.reduireAnimations}
                onChange={(v) => update({ reduireAnimations: v })}
              />
            </header>
          </section>

          {/* ---- 6. Lecteur d'écran amélioré ---- */}
          <section className="bg-gray-800 rounded-lg p-4 md:p-5">
            <header className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-yellow-500">
                  📢 Lecteur d&apos;écran amélioré
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Active des anneaux de focus plus visibles et privilégie les
                  étiquettes ARIA explicites pour la navigation au clavier.
                </p>
              </div>
              <Switch
                checked={settings.ariaImproved}
                onChange={(v) => update({ ariaImproved: v })}
              />
            </header>
          </section>
        </div>
      </div>
    </main>
  )
}

// ============================================================================
// Switch — toggle on/off accessible
// ============================================================================
function Switch({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-yellow-500' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block w-5 h-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
