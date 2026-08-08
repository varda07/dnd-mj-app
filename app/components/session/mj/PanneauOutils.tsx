'use client'

// Panneau « Outils live » (Phase 4.3) — roue d'action, diffusion (image/texte/
// ambiance → session_state), journal de session temps réel, combat (cockpit MJ
// existant via combat-engine). Contrôles de session : dans l'en-tête (SessionMJ).

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useCombatEngine } from '@/app/lib/combat-engine'
import CombatCockpitMJ from '@/app/components/presentation/CombatCockpitMJ'
import ActionWheelMJ from '@/app/components/presentation/ActionWheelMJ'
import type { FogState } from '@/app/components/presentation/CombatCarte'
import { fetchSessionEvents, type SessionEvent, type SessionState } from '@/app/lib/session-live'

type Sous = 'diffusion' | 'combat' | 'journal'

export default function PanneauOutils({
  sessionId,
  scenarioId,
  etat,
  onPatchState
}: {
  sessionId: string
  scenarioId: string
  etat: SessionState | null
  onPatchState: (patch: Partial<SessionState>) => void
}) {
  const [sous, setSous] = useState<Sous>('diffusion')
  const [imgUrl, setImgUrl] = useState('')
  const [texte, setTexte] = useState('')
  const [sonUrl, setSonUrl] = useState('')
  const [events, setEvents] = useState<SessionEvent[]>([])

  const combatApi = useCombatEngine(scenarioId, { isMj: true })
  const { combat } = combatApi

  // Référence le combat actif dans l'état de session (pour les joueurs).
  const dernierCombatId = useRef<string | null>(null)
  useEffect(() => {
    if (combat?.actif && combat.id && etat && etat.active_combat_id !== combat.id && dernierCombatId.current !== combat.id) {
      dernierCombatId.current = combat.id
      onPatchState({ active_combat_id: combat.id })
    }
  }, [combat?.actif, combat?.id, etat, onPatchState])

  // Journal temps réel.
  const chargerJournal = useCallback(async () => {
    setEvents(await fetchSessionEvents(sessionId, 80))
  }, [sessionId])
  useEffect(() => {
    void chargerJournal()
    const channel = supabase
      .channel(`session-journal:${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_events', filter: `session_id=eq.${sessionId}` }, () => void chargerJournal())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, chargerJournal])

  const onWheel = (key: string) => {
    if (key === 'image') setSous('diffusion')
    else if (key === 'narration') setSous('diffusion')
    else if (key === 'sons') setSous('diffusion')
    else if (key === 'rencontre') setSous('combat')
    else if (key === 'des') window.dispatchEvent(new CustomEvent('dice:open'))
  }

  const diffuserImage = () => { if (imgUrl.trim()) { onPatchState({ broadcast_image_url: imgUrl.trim() }); setImgUrl('') } }
  const diffuserTexte = () => onPatchState({ broadcast_text: texte.trim() || null })
  const diffuserSon = () => onPatchState({ ambient_sound: sonUrl.trim() ? { piste: sonUrl.trim(), volume: 50, en_lecture: true } : null })

  return (
    <div>
      {/* Sous-onglets */}
      <div className="flex gap-1 mb-4">
        {(['diffusion', 'combat', 'journal'] as Sous[]).map((s) => (
          <button key={s} type="button" onClick={() => setSous(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold ${sous === s ? 'bg-stone-900/60 text-yellow-100 border border-amber-500/40' : 'text-stone-400'}`}>
            {s === 'diffusion' ? '📡 Diffusion' : s === 'combat' ? '⚔️ Combat' : '📜 Journal'}
          </button>
        ))}
      </div>

      {sous === 'diffusion' && (
        <div className="space-y-4 max-w-2xl">
          {/* Image */}
          <div>
            <p className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">Image diffusée</p>
            {etat?.broadcast_image_url && (
              <div className="flex items-center gap-2 mb-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={etat.broadcast_image_url} alt="" className="h-14 rounded border border-yellow-800/30" />
                <button type="button" onClick={() => onPatchState({ broadcast_image_url: null })} className="text-red-300 text-xs underline">Retirer</button>
              </div>
            )}
            <div className="flex gap-2">
              <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="URL d'image (ou depuis Ma préparation)"
                className="flex-1 bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1.5 text-sm text-gray-200 outline-none" />
              <button type="button" onClick={diffuserImage} className="px-3 py-1.5 rounded bg-[#C9A84C] text-gray-900 text-sm font-bold">Diffuser</button>
            </div>
          </div>

          {/* Texte */}
          <div>
            <p className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">Narration diffusée</p>
            <textarea value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Texte de narration poussé aux joueurs…"
              className="w-full h-24 bg-stone-900/60 border border-yellow-800/30 rounded p-2 text-sm text-gray-200 outline-none resize-y" />
            <div className="flex gap-2 mt-1.5">
              <button type="button" onClick={diffuserTexte} className="px-3 py-1.5 rounded bg-[#C9A84C] text-gray-900 text-sm font-bold">Diffuser</button>
              <button type="button" onClick={() => { setTexte(''); onPatchState({ broadcast_text: null }) }} className="px-3 py-1.5 rounded border border-yellow-800/40 text-yellow-200 text-sm">Effacer</button>
            </div>
            {etat?.broadcast_text && <p className="text-stone-500 text-xs mt-1">Diffusé : {etat.broadcast_text.slice(0, 80)}…</p>}
          </div>

          {/* Son */}
          <div>
            <p className="text-xs uppercase tracking-widest text-yellow-600 mb-1.5">Ambiance sonore</p>
            <div className="flex gap-2">
              <input value={sonUrl} onChange={(e) => setSonUrl(e.target.value)} placeholder="URL de piste audio"
                className="flex-1 bg-stone-900/60 border border-yellow-800/30 rounded px-2 py-1.5 text-sm text-gray-200 outline-none" />
              <button type="button" onClick={diffuserSon} className="px-3 py-1.5 rounded bg-[#C9A84C] text-gray-900 text-sm font-bold">Lancer</button>
              <button type="button" onClick={() => onPatchState({ ambient_sound: null })} className="px-3 py-1.5 rounded border border-yellow-800/40 text-yellow-200 text-sm">Stop</button>
            </div>
            {etat?.ambient_sound?.piste && <p className="text-stone-500 text-xs mt-1">🎵 {etat.ambient_sound.piste}</p>}
          </div>
        </div>
      )}

      {sous === 'combat' && (
        <CombatCockpitMJ
          combat={combat}
          personnages={combatApi.personnages}
          ennemis={combatApi.ennemis}
          onModifierHp={combatApi.modifierHp}
          onToggleCondition={combatApi.toggleCondition}
          onClearConditions={combatApi.clearConditions}
          onTourSuivant={combatApi.tourSuivant}
          onTourPrecedent={combatApi.tourPrecedent}
          onTerminer={combatApi.terminer}
          onLancer={() => combatApi.lancer()}
          onMoveJeton={combatApi.deplacerJeton}
          onToggleCarteVisible={combatApi.toggleCarteVisible}
          onTogglePause={combatApi.togglePause}
          enPause={combat?.en_pause}
          onFogChange={(fog: FogState) => combatApi.sauverCombat({ fog })}
          carteBackground={null}
        />
      )}

      {sous === 'journal' && (
        <ul className="space-y-1 max-w-2xl">
          {events.length === 0 && <li className="text-stone-500 text-sm italic">Journal vide.</li>}
          {events.map((e) => (
            <li key={e.id} className="text-sm rounded border border-yellow-800/15 bg-stone-900/30 px-2.5 py-1.5 text-stone-300">
              <span className="text-stone-600 text-xs mr-2">{new Date(e.created_at).toLocaleTimeString('fr-FR')}</span>
              {formatEvent(e)}
            </li>
          ))}
        </ul>
      )}

      {/* Roue d'action MJ (bouton flottant) */}
      <ActionWheelMJ onSelect={onWheel} />
    </div>
  )
}

function formatEvent(e: SessionEvent): string {
  const p = e.payload as Record<string, unknown>
  switch (e.type) {
    case 'dice_roll':
      return `🎲 ${String(p.nom ?? '?')} — ${String(p.label ?? 'jet')} = ${String(p.total ?? '')}${p.prive ? ' (privé)' : ''}`
    case 'hp_change':
      return `❤️ ${String(p.cible ?? '')} PV ${Number(p.delta) >= 0 ? '+' : ''}${String(p.delta ?? '')} → ${String(p.to ?? '')} (${p.par === 'mj' ? 'MJ' : 'joueur'})`
    case 'resource_used':
      return `🔮 Emplacement/ressource utilisé${p.slot ? ` (niv. ${String(p.slot)})` : ''}`
    case 'condition':
      return p.concentration !== undefined ? `🌀 Concentration : ${String(p.concentration ?? 'arrêtée')}` : `⚠️ États mis à jour`
    case 'join':
      return `➜ Un joueur a rejoint (${String(p.role ?? '')})`
    case 'narration':
      return p.action === 'fin_tour' ? `⏭ ${String(p.nom ?? 'Un joueur')} termine son tour` : `📜 ${String(p.status ?? 'Narration')}`
    default:
      return e.type
  }
}
