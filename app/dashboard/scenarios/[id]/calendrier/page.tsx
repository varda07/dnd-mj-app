'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap Affinement 2.3 — Calendrier in-game personnalisable
// ----------------------------------------------------------------------------
// Page /dashboard/scenarios/[id]/calendrier
// - Crée automatiquement un calendrier par défaut au premier accès
// - Édition des mois / jours de semaine
// - Vue mensuelle avec événements
// - Avancement de la date (jour suivant, semaine suivante, mois suivant)
// - Événements importants marqués (icônes + 3 niveaux d'importance)
// ============================================================================

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Modal from '@/app/components/ui/Modal'
import EmptyState from '@/app/components/ui/EmptyState'
import { SkeletonList } from '@/app/components/ui/Skeleton'
import { toast } from '@/app/components/ui/Toast'
import { confirmDialog } from '@/app/components/ui/ConfirmDialog'

type MoisDef = { nom: string; jours: number }

type Calendrier = {
  id: string
  scenario_id: string
  mois: MoisDef[]
  jours_semaine: string[]
  saisons: string[]
  annee_courante: number
  mois_courant: number
  jour_courant: number
  notes: string
}

type Evenement = {
  id: string
  calendrier_id: string
  annee: number
  mois: number
  jour: number
  titre: string
  description: string | null
  icone: string
  importance: number
}

const ICONES = ['⭐', '⚔️', '🎭', '🎉', '💀', '🏆', '🔮', '🌙', '☀️', '🌧', '⚡', '🎁', '🗡', '👑', '🕯', '🐉']

export default function CalendrierPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const scenarioId = params?.id

  const [scenarioNom, setScenarioNom] = useState('')
  const [calendrier, setCalendrier] = useState<Calendrier | null>(null)
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [evtModal, setEvtModal] = useState<{ jour: number; mois: number; annee: number; editing?: Evenement } | null>(null)
  const [configOuvert, setConfigOuvert] = useState(false)

  // Form évènement
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [icone, setIcone] = useState('⭐')
  const [importance, setImportance] = useState(1)

  const charger = useCallback(async () => {
    if (!scenarioId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: scn } = await supabase
      .from('scenarios')
      .select('id, nom')
      .eq('id', scenarioId)
      .maybeSingle()
    if (!scn) { setNotFound(true); setLoading(false); return }
    setScenarioNom(scn.nom as string)

    // Charge le calendrier, le crée s'il n'existe pas.
    let { data: cal } = await supabase
      .from('calendriers_campagne')
      .select('*')
      .eq('scenario_id', scenarioId)
      .maybeSingle()
    if (!cal) {
      const { data: created, error } = await supabase
        .from('calendriers_campagne')
        .insert({ scenario_id: scenarioId })
        .select('*')
        .single()
      if (error) {
        toast.error('Impossible de créer le calendrier : ' + error.message)
        setLoading(false)
        return
      }
      cal = created
    }
    setCalendrier(cal as Calendrier)

    // Charge les événements de l'année courante
    const { data: evts } = await supabase
      .from('evenements_calendrier')
      .select('*')
      .eq('calendrier_id', cal.id)
      .eq('annee', cal.annee_courante)
      .order('mois', { ascending: true })
      .order('jour', { ascending: true })
    setEvenements((evts ?? []) as Evenement[])
    setLoading(false)
  }, [scenarioId, router])

  useEffect(() => { void charger() }, [charger])

  const sauverDate = async (annee: number, moisIdx: number, jour: number) => {
    if (!calendrier) return
    const { error } = await supabase
      .from('calendriers_campagne')
      .update({ annee_courante: annee, mois_courant: moisIdx, jour_courant: jour })
      .eq('id', calendrier.id)
    if (error) toast.error(error.message)
    else {
      setCalendrier((c) => c ? { ...c, annee_courante: annee, mois_courant: moisIdx, jour_courant: jour } : c)
      toast.success('Date avancée')
    }
  }

  const avancerJour = async (n: number) => {
    if (!calendrier) return
    let annee = calendrier.annee_courante
    let moisIdx = calendrier.mois_courant
    let jour = calendrier.jour_courant + n
    while (true) {
      const def = calendrier.mois[moisIdx - 1]
      if (!def) break
      if (jour > def.jours) {
        jour -= def.jours
        moisIdx += 1
        if (moisIdx > calendrier.mois.length) { moisIdx = 1; annee += 1 }
      } else if (jour < 1) {
        moisIdx -= 1
        if (moisIdx < 1) { moisIdx = calendrier.mois.length; annee -= 1 }
        const prev = calendrier.mois[moisIdx - 1]
        if (!prev) break
        jour += prev.jours
      } else break
    }
    await sauverDate(annee, moisIdx, jour)
  }

  const ouvrirModalEvt = (jour: number, evt?: Evenement) => {
    if (!calendrier) return
    setEvtModal({ jour, mois: calendrier.mois_courant, annee: calendrier.annee_courante, editing: evt })
    if (evt) {
      setTitre(evt.titre)
      setDescription(evt.description ?? '')
      setIcone(evt.icone)
      setImportance(evt.importance)
    } else {
      setTitre(''); setDescription(''); setIcone('⭐'); setImportance(1)
    }
  }

  const sauverEvt = async () => {
    if (!evtModal || !calendrier || !titre.trim()) return
    if (evtModal.editing) {
      const { error } = await supabase
        .from('evenements_calendrier')
        .update({ titre, description, icone, importance })
        .eq('id', evtModal.editing.id)
      if (error) { toast.error(error.message); return }
      toast.success('Événement modifié')
    } else {
      const { error } = await supabase
        .from('evenements_calendrier')
        .insert({
          calendrier_id: calendrier.id,
          annee: evtModal.annee,
          mois: evtModal.mois,
          jour: evtModal.jour,
          titre, description, icone, importance,
        })
      if (error) { toast.error(error.message); return }
      toast.success('Événement créé')
    }
    setEvtModal(null)
    await charger()
  }

  const supprimerEvt = async (e: Evenement) => {
    const ok = await confirmDialog({
      title: 'Supprimer cet événement ?',
      message: `« ${e.titre} » sera définitivement supprimé.`,
      destructive: true,
    })
    if (!ok) return
    const { error } = await supabase.from('evenements_calendrier').delete().eq('id', e.id)
    if (error) toast.error(error.message)
    else { toast.success('Supprimé'); await charger() }
  }

  const moisActuel = calendrier?.mois[calendrier.mois_courant - 1]
  const saisonActuelle = useMemo(() => {
    if (!calendrier) return ''
    const idxSaison = Math.floor((calendrier.mois_courant - 1) / (calendrier.mois.length / calendrier.saisons.length))
    return calendrier.saisons[idxSaison] ?? ''
  }, [calendrier])

  const evtsParJour = useMemo(() => {
    if (!calendrier) return new Map<number, Evenement[]>()
    const map = new Map<number, Evenement[]>()
    for (const e of evenements) {
      if (e.mois !== calendrier.mois_courant) continue
      const arr = map.get(e.jour) ?? []
      arr.push(e)
      map.set(e.jour, arr)
    }
    return map
  }, [evenements, calendrier])

  if (notFound) return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <EmptyState icon="🗓" title="Scénario introuvable" message="Ce scénario n'existe pas ou tu n'y as pas accès." />
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white">← Retour</button>
          <h1 className="text-2xl grim-title">🗓 Calendrier — {scenarioNom}</h1>
        </div>

        {loading || !calendrier || !moisActuel ? (
          <SkeletonList count={5} type="card" />
        ) : (
          <>
            {/* Bandeau date courante */}
            <div className="grim-card p-5 mb-6 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[240px]">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date in-game</div>
                <div className="text-2xl font-serif text-yellow-300" style={{ fontFamily: 'Georgia, serif' }}>
                  {calendrier.jour_courant} {moisActuel.nom} — An {calendrier.annee_courante}
                </div>
                <div className="text-sm text-gray-400 mt-1">Saison : {saisonActuelle}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => avancerJour(1)} className="px-3 py-2 bg-yellow-500 text-gray-900 font-bold rounded codex-btn-press">+ 1 jour</button>
                <button type="button" onClick={() => avancerJour(7)} className="px-3 py-2 bg-yellow-600 text-gray-900 font-bold rounded codex-btn-press">+ 1 semaine</button>
                <button type="button" onClick={() => avancerJour(moisActuel.jours)} className="px-3 py-2 bg-yellow-700 text-white font-bold rounded codex-btn-press">+ 1 mois</button>
                <button type="button" onClick={() => avancerJour(-1)} className="px-3 py-2 bg-gray-700 text-white font-bold rounded codex-btn-press">− 1 jour</button>
                <button type="button" onClick={() => setConfigOuvert(true)} className="px-3 py-2 bg-gray-800 border border-yellow-500/40 text-yellow-300 font-bold rounded codex-btn-press">⚙ Config</button>
              </div>
            </div>

            {/* Vue mensuelle */}
            <div className="grim-card p-5">
              <h2 className="text-lg grim-h2 mb-3">{moisActuel.nom} — An {calendrier.annee_courante}</h2>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${calendrier.jours_semaine.length}, minmax(0, 1fr))` }}>
                {calendrier.jours_semaine.map((js) => (
                  <div key={js} className="text-center text-xs uppercase text-gray-500 tracking-wider py-2">{js}</div>
                ))}
                {Array.from({ length: moisActuel.jours }).map((_, idx) => {
                  const jour = idx + 1
                  const evts = evtsParJour.get(jour) ?? []
                  const aujourdhui = jour === calendrier.jour_courant
                  return (
                    <button
                      key={jour}
                      type="button"
                      onClick={() => ouvrirModalEvt(jour)}
                      className={`relative aspect-square p-1 rounded text-left codex-btn-press flex flex-col gap-0.5 ${
                        aujourdhui
                          ? 'bg-yellow-500/20 border-2 border-yellow-400'
                          : 'bg-gray-800 border border-gray-700 hover:border-yellow-500/40'
                      }`}
                    >
                      <span className={`text-xs font-mono ${aujourdhui ? 'text-yellow-200 font-bold' : 'text-gray-400'}`}>{jour}</span>
                      <div className="flex flex-wrap gap-0.5 mt-auto">
                        {evts.slice(0, 4).map((e) => (
                          <span
                            key={e.id}
                            title={e.titre}
                            className={`text-[10px] ${e.importance === 3 ? 'text-red-300' : e.importance === 2 ? 'text-yellow-300' : 'text-gray-300'}`}
                          >{e.icone}</span>
                        ))}
                        {evts.length > 4 ? <span className="text-[10px] text-gray-500">+{evts.length - 4}</span> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Liste événements du mois */}
            <div className="grim-card p-5 mt-6">
              <h2 className="text-lg grim-h2 mb-3">Événements ce mois-ci</h2>
              {evenements.filter((e) => e.mois === calendrier.mois_courant).length === 0 ? (
                <EmptyState icon="📅" title="Aucun événement" message="Clique sur un jour du calendrier pour ajouter un événement." />
              ) : (
                <div className="flex flex-col gap-2">
                  {evenements
                    .filter((e) => e.mois === calendrier.mois_courant)
                    .map((e) => (
                      <div key={e.id} className="codex-card codex-card-hover p-3 flex items-center gap-3">
                        <span className="text-2xl">{e.icone}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-yellow-300">
                            Jour {e.jour} — {e.titre}
                            {e.importance === 3 ? <span className="ml-2 text-red-300 text-[10px] uppercase">majeur</span> : null}
                          </div>
                          {e.description ? <div className="text-xs text-gray-400 mt-0.5">{e.description}</div> : null}
                        </div>
                        <button type="button" onClick={() => ouvrirModalEvt(e.jour, e)} className="text-xs text-gray-400 hover:text-white px-2 py-1">✏</button>
                        <button type="button" onClick={() => supprimerEvt(e)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1">🗑</button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modale ajout / édition événement */}
      <Modal
        open={!!evtModal}
        onClose={() => setEvtModal(null)}
        title={evtModal?.editing ? 'Modifier l’événement' : `Nouvel événement — Jour ${evtModal?.jour}`}
        footer={
          <>
            <button type="button" onClick={() => setEvtModal(null)} className="px-4 py-2 rounded bg-gray-800 text-gray-300 border border-gray-700">Annuler</button>
            <button type="button" onClick={sauverEvt} disabled={!titre.trim()} className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold disabled:opacity-40">Sauvegarder</button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <label className="text-xs text-gray-400">Titre
            <input
              type="text" value={titre} onChange={(e) => setTitre(e.target.value)}
              className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white"
              placeholder="Ex : Festival du Solstice"
            />
          </label>
          <label className="text-xs text-gray-400">Description
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white h-20"
            />
          </label>
          <div>
            <div className="text-xs text-gray-400 mb-1">Icône</div>
            <div className="flex flex-wrap gap-1">
              {ICONES.map((i) => (
                <button
                  key={i} type="button" onClick={() => setIcone(i)}
                  className={`w-8 h-8 rounded text-lg ${icone === i ? 'bg-yellow-500/30 border-2 border-yellow-400' : 'bg-gray-800 border border-gray-700 hover:border-yellow-500/40'}`}
                >{i}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Importance</div>
            <div className="flex gap-1">
              {[1, 2, 3].map((n) => (
                <button
                  key={n} type="button" onClick={() => setImportance(n)}
                  className={`flex-1 py-2 rounded text-xs font-bold ${
                    importance === n
                      ? n === 3 ? 'bg-red-500/30 border-2 border-red-400 text-red-200'
                        : n === 2 ? 'bg-yellow-500/30 border-2 border-yellow-400 text-yellow-200'
                        : 'bg-gray-700 border-2 border-gray-500 text-gray-200'
                      : 'bg-gray-800 border border-gray-700 text-gray-400'
                  }`}
                >{n === 1 ? 'Mineur' : n === 2 ? 'Moyen' : 'Majeur'}</button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modale config (édition des mois/semaine) */}
      <Modal
        open={configOuvert}
        onClose={() => setConfigOuvert(false)}
        title="⚙ Configurer le calendrier"
        size="lg"
        footer={
          <button type="button" onClick={() => setConfigOuvert(false)} className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold">Fermer</button>
        }
      >
        {calendrier ? <CalendrierConfig cal={calendrier} onUpdate={async (patch) => {
          const { error } = await supabase.from('calendriers_campagne').update(patch).eq('id', calendrier.id)
          if (error) toast.error(error.message)
          else { toast.success('Calendrier mis à jour'); await charger() }
        }} /> : null}
      </Modal>
    </main>
  )
}

function CalendrierConfig({ cal, onUpdate }: { cal: Calendrier; onUpdate: (patch: Partial<Calendrier>) => Promise<void> }) {
  const [mois, setMois] = useState<MoisDef[]>(cal.mois)
  const [jsem, setJsem] = useState<string[]>(cal.jours_semaine)
  const [saisons, setSaisons] = useState<string[]>(cal.saisons)

  return (
    <div className="flex flex-col gap-4 text-sm text-gray-200">
      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Mois ({mois.length})</div>
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto codex-scroll pr-1">
          {mois.map((m, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={m.nom}
                onChange={(e) => setMois((arr) => arr.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))}
                className="flex-1 p-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs"
              />
              <input
                type="number" min={1} max={50} value={m.jours}
                onChange={(e) => setMois((arr) => arr.map((x, j) => j === i ? { ...x, jours: parseInt(e.target.value) || 1 } : x))}
                className="w-16 p-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs"
              />
              <button type="button" onClick={() => setMois((arr) => arr.filter((_, j) => j !== i))} className="text-xs text-red-400 px-2">🗑</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setMois((arr) => [...arr, { nom: `Mois ${arr.length + 1}`, jours: 30 }])} className="mt-2 text-xs px-2 py-1 rounded bg-gray-800 border border-yellow-500/30 text-yellow-300">+ Ajouter un mois</button>
      </div>

      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Jours de la semaine</div>
        <div className="flex flex-wrap gap-1">
          {jsem.map((j, i) => (
            <span key={i} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs">
              <input value={j} onChange={(e) => setJsem((arr) => arr.map((x, k) => k === i ? e.target.value : x))} className="bg-transparent outline-none w-20 text-xs" />
              <button type="button" onClick={() => setJsem((arr) => arr.filter((_, k) => k !== i))} className="text-red-400">✕</button>
            </span>
          ))}
          <button type="button" onClick={() => setJsem((arr) => [...arr, 'Nouveau'])} className="text-xs px-2 py-1 rounded bg-gray-800 border border-yellow-500/30 text-yellow-300">+</button>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Saisons</div>
        <div className="flex flex-wrap gap-1">
          {saisons.map((s, i) => (
            <span key={i} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs">
              <input value={s} onChange={(e) => setSaisons((arr) => arr.map((x, k) => k === i ? e.target.value : x))} className="bg-transparent outline-none w-20 text-xs" />
              <button type="button" onClick={() => setSaisons((arr) => arr.filter((_, k) => k !== i))} className="text-red-400">✕</button>
            </span>
          ))}
          <button type="button" onClick={() => setSaisons((arr) => [...arr, 'Nouveau'])} className="text-xs px-2 py-1 rounded bg-gray-800 border border-yellow-500/30 text-yellow-300">+</button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onUpdate({ mois, jours_semaine: jsem, saisons })}
        className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold codex-btn-press"
      >Enregistrer les modifications</button>
    </div>
  )
}
