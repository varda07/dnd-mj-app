'use client'

// ============================================================================
// PersonnagesLiesPanel — V1 5.1
// ----------------------------------------------------------------------------
// Depuis l'édition d'un scénario : lier / délier les personnages DU COMPTE
// (joueur_id = utilisateur courant) à ce scénario. Un PJ lié apparaît ensuite
// dans le combat / la session (chargés par scenario_id). Seuls les PJ du
// compte sont listés. Un PJ ne peut être lié qu'à un scénario à la fois ;
// le lier ici le déplace s'il était ailleurs.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Perso = {
  id: string
  nom: string
  image_url: string | null
  classe: string | null
  niveau: number | null
  scenario_id: string | null
}

export default function PersonnagesLiesPanel({ scenarioId }: { scenarioId: string }) {
  const [persos, setPersos] = useState<Perso[]>([])
  const [open, setOpen] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const charger = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('personnages')
      .select('id, nom, image_url, classe, niveau, scenario_id')
      .eq('joueur_id', user.id)
      .order('nom')
    setPersos((data ?? []) as Perso[])
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const toggle = async (p: Perso) => {
    const lieIci = p.scenario_id === scenarioId
    setBusy(p.id)
    const { error } = await supabase
      .from('personnages')
      .update({ scenario_id: lieIci ? null : scenarioId })
      .eq('id', p.id)
    setBusy(null)
    if (!error) {
      setPersos((ps) =>
        ps.map((x) =>
          x.id === p.id ? { ...x, scenario_id: lieIci ? null : scenarioId } : x
        )
      )
    }
  }

  const lies = persos.filter((p) => p.scenario_id === scenarioId)

  return (
    <div className="rounded-lg border border-yellow-800/40 bg-[#171717]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-xs font-bold text-yellow-500">
          🧙 Personnages liés{lies.length > 0 ? ` (${lies.length})` : ''}
        </span>
        <span className="text-[10px] text-gray-500">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {persos.length === 0 ? (
            <p className="text-[11px] text-gray-500 italic">
              Aucun personnage sur ce compte. Crée-en dans la page Personnages.
            </p>
          ) : (
            persos.map((p) => {
              const lieIci = p.scenario_id === scenarioId
              const lieAilleurs = !lieIci && !!p.scenario_id
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 p-1.5 rounded border transition ${
                    lieIci
                      ? 'border-yellow-600/50 bg-yellow-500/5'
                      : 'border-gray-700/60 bg-[#0f0f0f]'
                  }`}
                >
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt=""
                      className="w-7 h-7 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded bg-black/40 flex items-center justify-center text-xs flex-shrink-0">
                      🧙
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-200 truncate">{p.nom}</p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {[p.classe, p.niveau ? `Niv. ${p.niveau}` : null]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                      {lieAilleurs && (
                        <span className="text-orange-400/80"> · lié ailleurs</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => toggle(p)}
                    className={`text-[10px] px-2 py-1 rounded border font-bold uppercase tracking-wider transition disabled:opacity-40 ${
                      lieIci
                        ? 'border-red-700/50 text-red-300 hover:bg-red-700/20'
                        : 'border-yellow-700/50 text-yellow-300 hover:bg-yellow-700/20'
                    }`}
                  >
                    {lieIci ? 'Délier' : lieAilleurs ? 'Déplacer ici' : 'Lier'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
