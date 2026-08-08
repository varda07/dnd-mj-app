'use client'

// Onglet « Actions » (Phase 3.3) — attaques, sorts + emplacements visuels,
// concentration, ressources de classe (compteurs), capacités race/background.

import { useState } from 'react'
import type { CharacterSheet, ClassResource, SortJoue } from '@/app/lib/session-live'
import type { SessionJoueurApi } from './useSessionJoueur'

export default function OngletActions({
  sheet,
  spells,
  api,
  roll,
  rollExpr
}: {
  sheet: CharacterSheet
  spells: SortJoue[]
  api: SessionJoueurApi
  roll: (label: string, bonus: number) => void
  rollExpr: (label: string, expr: string) => void
}) {
  const [detail, setDetail] = useState<SortJoue | null>(null)
  const [nouvRes, setNouvRes] = useState('')
  const [nouvResMax, setNouvResMax] = useState('')

  // Regroupe les sorts par niveau.
  const parNiveau = new Map<number, SortJoue[]>()
  for (const s of spells) {
    const arr = parNiveau.get(s.niveau) ?? []
    arr.push(s)
    parNiveau.set(s.niveau, arr)
  }
  const niveaux = [...parNiveau.keys()].sort((a, b) => a - b)

  const slotMax = (lvl: number) => sheet.sorts_slots_max?.[String(lvl)] ?? 0
  const slotUsed = (lvl: number) => api.slotsUsed?.[String(lvl)] ?? 0

  const lancerSort = async (s: SortJoue) => {
    if (s.niveau > 0) {
      const ok = await api.consommerSlot(s.niveau)
      if (!ok) {
        alert(`Aucun emplacement de niveau ${s.niveau} disponible.`)
        return
      }
    }
    if (s.concentration) await api.setConcentration(s.nom)
    const des = extraireExpr(s.description)
    if (des) rollExpr(`Sort : ${s.nom}`, des)
  }

  const ajouterRes = async () => {
    const nom = nouvRes.trim()
    const max = parseInt(nouvResMax.replace(/[^0-9]/g, ''), 10) || 0
    if (!nom || max <= 0) return
    await api.setResources({
      ...api.resources,
      [nom]: { label: nom, max, used: 0 }
    })
    setNouvRes('')
    setNouvResMax('')
  }
  const majRes = async (key: string, r: ClassResource, delta: number) => {
    const used = Math.max(0, Math.min(r.max, r.used + delta))
    await api.setResources({ ...api.resources, [key]: { ...r, used } })
  }
  const suppRes = async (key: string) => {
    const next = { ...api.resources }
    delete next[key]
    await api.setResources(next)
  }

  return (
    <div className="space-y-5">
      {/* Concentration en cours */}
      {api.concentration && (
        <div className="rounded-lg border px-3 py-2 flex items-center justify-between"
          style={{ borderColor: 'rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.08)' }}>
          <span className="text-cyan-200 text-sm">🌀 Concentration : <b>{api.concentration}</b></span>
          <button type="button" onClick={() => api.setConcentration(null)} className="text-cyan-300 text-xs underline">
            Arrêter
          </button>
        </div>
      )}

      {/* Attaques */}
      <section>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Attaques</p>
        {sheet.armes.length === 0 ? (
          <p className="text-stone-500 text-sm italic">Aucune arme.</p>
        ) : (
          <div className="space-y-1.5">
            {sheet.armes.map((a, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-yellow-800/25 bg-stone-900/40 px-2.5 py-2">
                <span className="flex-1 min-w-0 text-yellow-100 font-medium text-sm truncate">⚔️ {a.nom || 'Arme'}</span>
                <button type="button" onClick={() => roll(`Attaque : ${a.nom}`, parseInt(a.bonus, 10) || 0)}
                  className="px-2.5 py-1 rounded bg-stone-800 border border-yellow-800/40 text-yellow-200 text-xs font-bold">
                  Att. {a.bonus || '+0'}
                </button>
                <button type="button" onClick={() => rollExpr(`Dégâts : ${a.nom}`, a.degats)}
                  className="px-2.5 py-1 rounded bg-red-900/40 border border-red-800/50 text-red-200 text-xs font-bold">
                  Dgts {a.degats || '—'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sorts */}
      <section>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Sorts</p>
        {spells.length === 0 ? (
          <p className="text-stone-500 text-sm italic">Aucun sort connu.</p>
        ) : (
          <div className="space-y-3">
            {niveaux.map((lvl) => {
              const max = slotMax(lvl)
              const used = slotUsed(lvl)
              return (
                <div key={lvl}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-yellow-500">
                      {lvl === 0 ? 'Sorts mineurs' : `Niveau ${lvl}`}
                    </span>
                    {lvl > 0 && max > 0 && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: max }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => (i < used ? api.restaurerSlot(lvl) : api.consommerSlot(lvl))}
                            title={i < used ? 'Emplacement utilisé' : 'Emplacement disponible'}
                            className="w-3.5 h-3.5 rounded-sm border"
                            style={{
                              background: i < used ? '#57534e' : '#C9A84C',
                              borderColor: i < used ? '#78716c' : '#e0c874'
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    {(parNiveau.get(lvl) ?? []).map((s) => (
                      <div key={s.junction_id} className={`flex items-center gap-2 rounded border px-2.5 py-1.5 ${
                        s.prepare ? 'border-yellow-800/30 bg-stone-900/40' : 'border-stone-800 bg-stone-900/20 opacity-70'
                      }`}>
                        <button type="button" onClick={() => setDetail(s)} className="flex-1 min-w-0 text-left">
                          <span className="text-sm text-yellow-100 truncate block">
                            {s.concentration ? '🌀 ' : ''}{s.nom}
                          </span>
                        </button>
                        <button type="button" onClick={() => lancerSort(s)}
                          className="px-2.5 py-1 rounded bg-stone-800 border border-yellow-800/40 text-yellow-200 text-xs font-bold">
                          Lancer
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Ressources de classe (compteurs) */}
      <section>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Ressources de classe</p>
        {Object.keys(api.resources).length > 0 && (
          <div className="space-y-1.5 mb-2">
            {Object.entries(api.resources).map(([key, r]) => (
              <div key={key} className="flex items-center gap-2 rounded-lg border border-yellow-800/25 bg-stone-900/40 px-2.5 py-2">
                <span className="flex-1 min-w-0 text-yellow-100 text-sm truncate">{r.label ?? key}</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: r.max }).map((_, i) => (
                    <span key={i} className="w-2.5 h-2.5 rounded-full border"
                      style={{ background: i < r.used ? '#57534e' : '#a78bfa', borderColor: '#8b5cf6' }} />
                  ))}
                </div>
                <button type="button" onClick={() => majRes(key, r, 1)} className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 text-xs">Utiliser</button>
                <button type="button" onClick={() => majRes(key, r, -1)} className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 text-xs">+1</button>
                <button type="button" onClick={() => suppRes(key)} className="text-stone-600 hover:text-red-300 text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input value={nouvRes} onChange={(e) => setNouvRes(e.target.value)} placeholder="Rage, Ki, Inspiration…"
            className="flex-1 min-w-[7rem] bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1.5 text-sm text-gray-200 outline-none" />
          <input value={nouvResMax} onChange={(e) => setNouvResMax(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Max"
            className="w-16 bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1.5 text-sm text-gray-200 outline-none" />
          <button type="button" onClick={ajouterRes} className="px-3 py-1.5 rounded bg-stone-800 border border-yellow-700/40 text-yellow-300 text-xs font-bold">➕</button>
        </div>
        {sheet.traits_classe.trim() && (
          <p className="text-stone-400 text-xs mt-2 whitespace-pre-wrap">{sheet.traits_classe}</p>
        )}
      </section>

      {/* Capacités de race et de background */}
      {(sheet.traits_espece.trim() || (sheet.historique ?? '').trim()) && (
        <section>
          <p className="text-xs uppercase tracking-widest text-yellow-600 mb-2">Race & background</p>
          {sheet.traits_espece.trim() && <p className="text-stone-300 text-sm whitespace-pre-wrap mb-2">{sheet.traits_espece}</p>}
          {(sheet.historique ?? '').trim() && <p className="text-stone-400 text-xs">Historique : {sheet.historique}</p>}
        </section>
      )}

      {/* Détail d'un sort */}
      {detail && (
        <div className="fixed inset-0 z-[130] bg-black/70 flex items-end sm:items-center justify-center p-3" onClick={() => setDetail(null)}>
          <div className="w-full max-w-md rounded-2xl border-2 p-4 max-h-[80vh] overflow-y-auto"
            style={{ background: '#15110a', borderColor: 'rgba(201,168,76,0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-lg" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>{detail.nom}</h3>
              <button type="button" onClick={() => setDetail(null)} className="text-stone-400 text-xl leading-none">✕</button>
            </div>
            <p className="text-xs text-stone-400 mb-2">
              {detail.niveau === 0 ? 'Sort mineur' : `Niveau ${detail.niveau}`}
              {detail.ecole ? ` · ${detail.ecole}` : ''}
              {detail.concentration ? ' · Concentration' : ''}
              {detail.rituel ? ' · Rituel' : ''}
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs text-stone-400 mb-2">
              <span>⏱ {detail.temps_incantation ?? '—'}</span>
              <span>🎯 {detail.portee ?? '—'}</span>
              <span>⏳ {detail.duree ?? '—'}</span>
              <span>
                {[detail.composantes_verbal && 'V', detail.composantes_somatique && 'S', detail.composantes_materiel && 'M']
                  .filter(Boolean).join(', ') || '—'}
              </span>
            </div>
            <p className="text-stone-300 text-sm whitespace-pre-wrap">{detail.description ?? 'Aucune description.'}</p>
            <button type="button" onClick={() => { lancerSort(detail); setDetail(null) }}
              className="mt-3 w-full py-2 rounded-lg font-bold text-gray-900 bg-[#C9A84C]">
              Lancer le sort
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Extrait la première expression de dés d'une description (ex "2d6" dans le texte).
function extraireExpr(desc: string | null): string | null {
  if (!desc) return null
  const m = desc.match(/\d+d(?:4|6|8|10|12|20)(?:\s*[+-]\s*\d+)?/i)
  return m ? m[0] : null
}
