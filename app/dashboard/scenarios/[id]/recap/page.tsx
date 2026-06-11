'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap Affinement 2.9 — Journal automatique de session
// ----------------------------------------------------------------------------
// Liste des récaps d'un scénario + bouton « 📔 Terminer la session » qui
// génère un récap pré-rempli :
//   - PNJ rencontrés (depuis pnj du scénario)
//   - Loot trouvé (placeholder)
//   - Lieux visités (depuis chapitres récents)
//   - Quêtes débloquées / terminées
//   - XP distribuée (placeholder)
// Tout est éditable avant validation.
// ============================================================================

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import EmptyState from '@/app/components/ui/EmptyState'
import { SkeletonList } from '@/app/components/ui/Skeleton'
import { toast } from '@/app/components/ui/Toast'
import { confirmDialog } from '@/app/components/ui/ConfirmDialog'
import Modal from '@/app/components/ui/Modal'

// Schéma compatible avec la migration `20260515040000_roadmap_phase8.sql`
// (table déjà existante : id, scenario_id, titre, numero, contenu, texte).
type Recap = {
  id: string
  scenario_id: string
  titre: string
  numero: number
  contenu: {
    pnj_rencontres?: string[]
    loot?: string[]
    lieux?: string[]
    quetes_terminees?: string[]
    quetes_debloquees?: string[]
    xp_distribuee?: number
    combats?: Array<{ titre: string; resultat: string }>
    resume?: string
    date_iso?: string
  }
  texte: string | null
  created_at: string
}

export default function RecapsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const scenarioId = params?.id

  const [scenarioNom, setScenarioNom] = useState('')
  const [recaps, setRecaps] = useState<Recap[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState<Recap | null>(null)

  const charger = useCallback(async () => {
    if (!scenarioId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: scn } = await supabase
      .from('scenarios').select('id, nom').eq('id', scenarioId).maybeSingle()
    if (!scn) { setNotFound(true); setLoading(false); return }
    setScenarioNom(scn.nom as string)

    const { data } = await supabase
      .from('recaps_sessions')
      .select('*')
      .eq('scenario_id', scenarioId)
      .order('numero', { ascending: false })
    setRecaps((data ?? []) as Recap[])
    setLoading(false)
  }, [scenarioId, router])

  useEffect(() => { void charger() }, [charger])

  const genererBrouillon = async () => {
    if (!scenarioId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Compile en parallèle : PNJ + chapitres + quêtes + dernier combat
    const [pnjRes, chapRes, quetesRes, combatRes] = await Promise.all([
      supabase.from('pnj').select('nom').eq('mj_id', user.id),
      supabase.from('chapitres').select('titre').eq('scenario_id', scenarioId).order('ordre').limit(10),
      supabase.from('quetes').select('titre, status').eq('scenario_id', scenarioId),
      supabase.from('combats').select('nom, vainqueur').eq('scenario_id', scenarioId).order('created_at', { ascending: false }).limit(5),
    ])

    const pnjList = ((pnjRes.data ?? []) as { nom: string }[]).map(p => p.nom).slice(0, 8)
    const lieuxList = ((chapRes.data ?? []) as { titre: string }[]).map(c => c.titre)
    const quetesTerm = ((quetesRes.data ?? []) as { titre: string; status: string }[])
      .filter(q => q.status === 'terminee').map(q => q.titre)
    const quetesDebloq = ((quetesRes.data ?? []) as { titre: string; status: string }[])
      .filter(q => q.status === 'active').map(q => q.titre).slice(0, 6)
    const combatsList = ((combatRes.data ?? []) as Array<{ nom: string | null; vainqueur: string | null }>)
      .map(c => ({ titre: c.nom ?? 'Combat', resultat: c.vainqueur ?? 'Issue inconnue' }))

    // Trouve le prochain numéro de session
    const { data: derniere } = await supabase
      .from('recaps_sessions')
      .select('numero')
      .eq('scenario_id', scenarioId)
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle()
    const prochainNumero = ((derniere?.numero as number | undefined) ?? 0) + 1

    const { data: created, error } = await supabase
      .from('recaps_sessions')
      .insert({
        scenario_id: scenarioId,
        titre: `Session ${prochainNumero} — ${new Date().toLocaleDateString('fr-FR')}`,
        numero: prochainNumero,
        contenu: {
          pnj_rencontres: pnjList,
          loot: [],
          lieux: lieuxList,
          quetes_terminees: quetesTerm,
          quetes_debloquees: quetesDebloq,
          xp_distribuee: 0,
          combats: combatsList,
          resume: '',
          date_iso: new Date().toISOString(),
        },
        texte: '',
      })
      .select('*')
      .single()
    if (error) toast.error('Impossible de créer le récap : ' + error.message)
    else {
      toast.success('Récap pré-rempli créé — édite-le pour le finaliser')
      setEditing(created as Recap)
      await charger()
    }
  }

  const supprimer = async (r: Recap) => {
    const ok = await confirmDialog({
      title: 'Supprimer ce récap ?',
      message: `« ${r.titre} » sera supprimé.`,
      destructive: true,
    })
    if (!ok) return
    const { error } = await supabase.from('recaps_sessions').delete().eq('id', r.id)
    if (error) toast.error(error.message)
    else { toast.success('Supprimé'); await charger() }
  }

  if (notFound) return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <EmptyState icon="📔" title="Scénario introuvable" message="Ce scénario n'existe pas ou tu n'y as pas accès." />
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white">← Retour</button>
          <h1 className="text-2xl grim-title flex-1">📔 Journal de session — {scenarioNom}</h1>
          <button
            type="button"
            onClick={genererBrouillon}
            className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold codex-btn-press"
          >📔 Terminer la session…</button>
        </div>

        {loading ? <SkeletonList count={3} type="card" /> : recaps.length === 0 ? (
          <EmptyState
            icon="📔"
            title="Aucune session récapitulée"
            message="Lance « Terminer la session » à la fin de chaque session pour générer un récap chronologique."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {recaps.map((r) => (
              <RecapCard key={r.id} recap={r} onEdit={() => setEditing(r)} onDelete={() => supprimer(r)} />
            ))}
          </div>
        )}
      </div>

      <EditRecapModal
        recap={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); void charger() }}
      />
    </main>
  )
}

function RecapCard({ recap, onEdit, onDelete }: { recap: Recap; onEdit: () => void; onDelete: () => void }) {
  const c = recap.contenu
  const dateIso = c.date_iso ?? recap.created_at
  return (
    <div className="codex-card codex-card-hover p-4">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div>
          <div className="text-yellow-300 font-serif text-lg" style={{ fontFamily: 'Georgia, serif' }}>{recap.titre}</div>
          <div className="text-xs text-gray-500">{new Date(dateIso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onEdit} className="text-xs px-2 py-1 rounded bg-gray-800 border border-yellow-500/30 text-yellow-300">✏ Éditer</button>
          <button type="button" onClick={onDelete} className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-500/10">🗑</button>
        </div>
      </div>
      {c.resume ? <div className="text-sm text-gray-300 italic mt-2 mb-3">{c.resume}</div> : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-300">
        {(c.combats ?? []).length > 0 && (
          <div>
            <div className="uppercase tracking-wider text-gray-500 mb-1">⚔️ Combats</div>
            <ul className="list-disc list-inside space-y-0.5">{c.combats!.map((co, i) => <li key={i}>{co.titre} — {co.resultat}</li>)}</ul>
          </div>
        )}
        {(c.pnj_rencontres ?? []).length > 0 && (
          <div>
            <div className="uppercase tracking-wider text-gray-500 mb-1">🤝 PNJ rencontrés</div>
            <div>{c.pnj_rencontres!.join(', ')}</div>
          </div>
        )}
        {(c.lieux ?? []).length > 0 && (
          <div>
            <div className="uppercase tracking-wider text-gray-500 mb-1">📍 Lieux visités</div>
            <div>{c.lieux!.join(', ')}</div>
          </div>
        )}
        {(c.loot ?? []).length > 0 && (
          <div>
            <div className="uppercase tracking-wider text-gray-500 mb-1">🎁 Loot</div>
            <div>{c.loot!.join(', ')}</div>
          </div>
        )}
        {(c.quetes_terminees ?? []).length > 0 && (
          <div>
            <div className="uppercase tracking-wider text-gray-500 mb-1">✅ Quêtes terminées</div>
            <div>{c.quetes_terminees!.join(', ')}</div>
          </div>
        )}
        {(c.quetes_debloquees ?? []).length > 0 && (
          <div>
            <div className="uppercase tracking-wider text-gray-500 mb-1">🆕 Quêtes débloquées</div>
            <div>{c.quetes_debloquees!.join(', ')}</div>
          </div>
        )}
        {c.xp_distribuee && c.xp_distribuee > 0 ? (
          <div>
            <div className="uppercase tracking-wider text-gray-500 mb-1">✨ XP</div>
            <div>{c.xp_distribuee} XP distribuée</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function EditRecapModal({ recap, onClose, onSaved }: { recap: Recap | null; onClose: () => void; onSaved: () => void }) {
  const [titre, setTitre] = useState(recap?.titre ?? '')
  const [resume, setResume] = useState(recap?.contenu.resume ?? '')
  const [notes, setNotes] = useState(recap?.texte ?? '')
  const [xp, setXp] = useState(String(recap?.contenu.xp_distribuee ?? 0))
  const [loot, setLoot] = useState((recap?.contenu.loot ?? []).join(', '))
  const [pnj, setPnj] = useState((recap?.contenu.pnj_rencontres ?? []).join(', '))
  const [lieux, setLieux] = useState((recap?.contenu.lieux ?? []).join(', '))

  useEffect(() => {
    if (!recap) return
    setTitre(recap.titre)
    setResume(recap.contenu.resume ?? '')
    setNotes(recap.texte ?? '')
    setXp(String(recap.contenu.xp_distribuee ?? 0))
    setLoot((recap.contenu.loot ?? []).join(', '))
    setPnj((recap.contenu.pnj_rencontres ?? []).join(', '))
    setLieux((recap.contenu.lieux ?? []).join(', '))
  }, [recap])

  const sauver = async () => {
    if (!recap) return
    const contenu = {
      ...recap.contenu,
      resume,
      xp_distribuee: parseInt(xp) || 0,
      loot: loot.split(',').map(s => s.trim()).filter(Boolean),
      pnj_rencontres: pnj.split(',').map(s => s.trim()).filter(Boolean),
      lieux: lieux.split(',').map(s => s.trim()).filter(Boolean),
    }
    const { error } = await supabase
      .from('recaps_sessions')
      .update({ titre, contenu, texte: notes })
      .eq('id', recap.id)
    if (error) toast.error(error.message)
    else { toast.success('Récap sauvegardé'); onSaved() }
  }

  return (
    <Modal
      open={!!recap}
      onClose={onClose}
      title="✏ Éditer le récap"
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-300">Annuler</button>
          <button type="button" onClick={sauver} className="px-4 py-2 rounded bg-yellow-500 text-gray-900 font-bold codex-btn-press">Sauvegarder</button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        <label className="text-xs text-gray-400">Titre
          <input value={titre} onChange={(e) => setTitre(e.target.value)} className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
        </label>
        <label className="text-xs text-gray-400">Résumé / récit
          <textarea value={resume} onChange={(e) => setResume(e.target.value)} className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white h-24" placeholder="Ce qui s'est passé pendant cette session…" />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs text-gray-400">PNJ rencontrés (séparés par virgules)
            <input value={pnj} onChange={(e) => setPnj(e.target.value)} className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
          </label>
          <label className="text-xs text-gray-400">Lieux visités (séparés par virgules)
            <input value={lieux} onChange={(e) => setLieux(e.target.value)} className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
          </label>
          <label className="text-xs text-gray-400">Loot trouvé (séparé par virgules)
            <input value={loot} onChange={(e) => setLoot(e.target.value)} className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
          </label>
          <label className="text-xs text-gray-400">XP distribuée
            <input type="number" value={xp} onChange={(e) => setXp(e.target.value)} className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
          </label>
        </div>
        <label className="text-xs text-gray-400">Notes MJ
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white h-16" />
        </label>
      </div>
    </Modal>
  )
}
