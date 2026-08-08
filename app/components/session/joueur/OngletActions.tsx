'use client'

// ============================================================================
// Menu « Actions » de la roue joueur (Delta A.2 / A.3 / A.4)
// ----------------------------------------------------------------------------
// Attaques d'arme, capacités à usage limité, traits de classe / d'espèce.
// Les sorts ont quitté ce menu (→ OngletSorts, pétale « Sorts »).
//
// ⚠️ Règle D&D 5e — Delta A.4 : AUCUN rond d'usage sur les attaques d'arme
// classiques. On ne met des ronds que sur les capacités déclarées à usage
// limité (X/repos court, X/repos long, X/jour), et leur rythme de récupération
// pilote les boutons Repos court / Repos long du MJ.
// ============================================================================

import { useState } from 'react'
import type { CharacterSheet, ClassResource, RechargeRessource } from '@/app/lib/session-live'
import type { SessionJoueurApi } from './useSessionJoueur'
import LigneDepliable from './LigneDepliable'
import PastillesUsage from '@/app/components/ui/PastillesUsage'

const RECHARGES: Array<{ key: RechargeRessource; label: string; court: string }> = [
  { key: 'court', label: 'Repos court', court: '/repos court' },
  { key: 'long', label: 'Repos long', court: '/repos long' },
  { key: 'jour', label: 'Par jour', court: '/jour' }
]

export default function OngletActions({
  sheet,
  api,
  roll,
  rollExpr
}: {
  sheet: CharacterSheet
  api: SessionJoueurApi
  roll: (label: string, bonus: number) => void
  rollExpr: (label: string, expr: string) => void
}) {
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [nouvRes, setNouvRes] = useState('')
  const [nouvResMax, setNouvResMax] = useState('')
  const [nouvRecharge, setNouvRecharge] = useState<RechargeRessource>('long')

  const bascule = (cle: string) => setOuvert((o) => (o === cle ? null : cle))

  const ajouterRes = async () => {
    const nom = nouvRes.trim()
    const max = parseInt(nouvResMax.replace(/[^0-9]/g, ''), 10) || 0
    if (!nom || max <= 0) return
    await api.setResources({
      ...api.resources,
      [nom]: { label: nom, max, used: 0, recharge: nouvRecharge }
    })
    setNouvRes('')
    setNouvResMax('')
  }

  const changerRecharge = async (key: string, r: ClassResource, recharge: RechargeRessource) => {
    await api.setResources({ ...api.resources, [key]: { ...r, recharge } })
  }

  const suppRes = async (key: string) => {
    const next = { ...api.resources }
    delete next[key]
    await api.setResources(next)
  }

  return (
    <div className="space-y-5">
      {/* Attaques — pas de ronds d'usage : une attaque d'arme n'est pas limitée */}
      <section>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">Attaques</p>
        {sheet.armes.length === 0 ? (
          <p className="text-stone-500 text-sm italic">Aucune arme.</p>
        ) : (
          <ul className="space-y-1">
            {sheet.armes.map((a, i) => {
              const cle = `arme:${i}`
              const bonus = parseInt(a.bonus, 10) || 0
              const signe = bonus >= 0 ? `+${bonus}` : `${bonus}`
              return (
                <LigneDepliable
                  key={cle}
                  nom={`⚔️ ${a.nom || 'Arme'}`}
                  valeur={a.bonus || '+0'}
                  ouvert={ouvert === cle}
                  onToggle={() => bascule(cle)}
                  description={`Attaque au toucher ${signe}${a.degats ? ` · dégâts ${a.degats}` : ''}. Nombre d'attaques non limité.`}
                  formule={`1d20${signe}`}
                  onLancer={() => roll(`Attaque : ${a.nom}`, bonus)}
                  contenu={
                    a.degats ? (
                      <button
                        type="button"
                        onClick={() => rollExpr(`Dégâts : ${a.nom}`, a.degats)}
                        className="w-full py-2 rounded-lg font-bold text-sm bg-red-900/40 border border-red-800/50 text-red-200"
                      >
                        🩸 Lancer {a.degats}
                      </button>
                    ) : null
                  }
                />
              )
            })}
          </ul>
        )}
      </section>

      {/* Capacités à usage limité — ronds d'usage légitimes */}
      <section>
        <p className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">Capacités à usage limité</p>
        {Object.keys(api.resources).length === 0 ? (
          <p className="text-stone-500 text-sm italic mb-2">
            Aucune capacité limitée déclarée (Rage, Ki, Inspiration bardique…).
          </p>
        ) : (
          <ul className="space-y-1 mb-2">
            {Object.entries(api.resources).map(([key, r]) => {
              const cle = `res:${key}`
              const rech = RECHARGES.find((x) => x.key === (r.recharge ?? 'long'))
              return (
                <LigneDepliable
                  key={cle}
                  nom={`${r.label ?? key} ${rech ? `(${r.max}${rech.court})` : ''}`}
                  ouvert={ouvert === cle}
                  onToggle={() => bascule(cle)}
                  accessoire={
                    <PastillesUsage
                      max={r.max}
                      used={r.used}
                      couleur="#a78bfa"
                      taille={11}
                      label={r.label ?? key}
                      onConsommer={() => void api.majRessource(key, 1)}
                      onRestituer={() => void api.majRessource(key, -1)}
                    />
                  }
                  valeur={`${r.max - r.used}/${r.max}`}
                  contenu={
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-stone-500">Récupère à :</span>
                      {RECHARGES.map((x) => (
                        <button
                          key={x.key}
                          type="button"
                          onClick={() => changerRecharge(key, r, x.key)}
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${
                            (r.recharge ?? 'long') === x.key
                              ? 'border-amber-500 bg-amber-900/30 text-yellow-100'
                              : 'border-stone-700 text-stone-400'
                          }`}
                        >
                          {x.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => suppRes(key)}
                        className="ml-auto text-[11px] text-stone-600 hover:text-red-300"
                      >
                        Supprimer
                      </button>
                    </div>
                  }
                />
              )
            })}
          </ul>
        )}

        <div className="flex flex-wrap gap-1.5">
          <input value={nouvRes} onChange={(e) => setNouvRes(e.target.value)} placeholder="Rage, Ki, Inspiration…"
            className="flex-1 min-w-[7rem] bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1.5 text-sm text-gray-200 outline-none" />
          <input value={nouvResMax} onChange={(e) => setNouvResMax(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Max"
            className="w-14 bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1.5 text-sm text-gray-200 outline-none" />
          <select value={nouvRecharge} onChange={(e) => setNouvRecharge(e.target.value as RechargeRessource)}
            className="bg-stone-900/60 border border-yellow-800/30 rounded px-1.5 py-1.5 text-xs text-gray-200 outline-none">
            {RECHARGES.map((x) => (
              <option key={x.key} value={x.key}>{x.label}</option>
            ))}
          </select>
          <button type="button" onClick={ajouterRes} className="px-3 py-1.5 rounded bg-stone-800 border border-yellow-700/40 text-yellow-300 text-xs font-bold">
            Ajouter
          </button>
        </div>
      </section>

      {/* Traits */}
      {(sheet.traits_classe.trim() || sheet.traits_espece.trim() || (sheet.historique ?? '').trim()) && (
        <section>
          <p className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">Traits</p>
          <ul className="space-y-1">
            {sheet.traits_classe.trim() && (
              <LigneDepliable nom="Traits de classe" ouvert={ouvert === 'tr:classe'} onToggle={() => bascule('tr:classe')}
                description={sheet.traits_classe} />
            )}
            {sheet.traits_espece.trim() && (
              <LigneDepliable nom="Traits d'espèce" ouvert={ouvert === 'tr:espece'} onToggle={() => bascule('tr:espece')}
                description={sheet.traits_espece} />
            )}
            {(sheet.historique ?? '').trim() && (
              <LigneDepliable nom="Historique" ouvert={ouvert === 'tr:histo'} onToggle={() => bascule('tr:histo')}
                description={sheet.historique ?? ''} />
            )}
          </ul>
        </section>
      )}
    </div>
  )
}
