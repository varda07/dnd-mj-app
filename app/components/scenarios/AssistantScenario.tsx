'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { StepProgress, ChoiceCard, ChoiceGrid, GenerateButton } from '@/app/components/ui/FormKit'
import { genererNomPnj } from '@/app/data/noms_pnj'
import { genererPersonnalitePnj, formaterPersonnalitePnj } from '@/app/data/personnalites_pnj'

// ============================================================================
// AssistantScenario — Roadmap Créations, Phase 1
// ----------------------------------------------------------------------------
// Assistant guidé « une question à la fois » pour créer un scénario, suivi d'un
// écran de génération d'éléments optionnels (lieu, PNJ, première rencontre,
// chapitres) réellement créés en base et liés au scénario. Réutilise les
// générateurs existants (noms par culture, personnalités).
// ============================================================================

const OR = '#C9A84C'

type ChoiceOpt = { key: string; icon?: string; label: string; sub?: string }

const Q_JOUEURS: ChoiceOpt[] = [
  { key: '2-3', icon: '👥', label: '2-3 joueurs' },
  { key: '4-5', icon: '👥', label: '4-5 joueurs' },
  { key: '6+', icon: '👥', label: '6 et plus' },
  { key: '?', icon: '🤷', label: 'Je ne sais pas encore' }
]
const Q_NIVEAU: ChoiceOpt[] = [
  { key: '1-4', icon: '🌱', label: '1-4', sub: 'Débutants' },
  { key: '5-10', icon: '⚔️', label: '5-10', sub: 'Aguerris' },
  { key: '11-16', icon: '🛡️', label: '11-16', sub: 'Héros' },
  { key: '17-20', icon: '👑', label: '17-20', sub: 'Légendes' },
  { key: 'mixte', icon: '🎭', label: 'Mixte', sub: 'Niveaux variés' }
]
const Q_CADRE: ChoiceOpt[] = [
  { key: 'ville', icon: '🏰', label: 'Ville', sub: 'Intrigues urbaines' },
  { key: 'donjon', icon: '🕳️', label: 'Donjon', sub: 'Exploration souterraine' },
  { key: 'nature', icon: '🌲', label: 'Nature sauvage', sub: 'Contrées hostiles' },
  { key: 'mer', icon: '⛵', label: 'Mer & îles', sub: 'Aventures maritimes' },
  { key: 'plans', icon: '🌌', label: 'Autres plans', sub: 'Réalités étranges' },
  { key: 'varie', icon: '🗺️', label: 'Varié', sub: 'Un peu de tout' }
]
const Q_DUREE: ChoiceOpt[] = [
  { key: 'oneshot', icon: '⚡', label: 'One-shot', sub: 'Une session' },
  { key: 'mini', icon: '📖', label: 'Mini-campagne', sub: '3-5 sessions' },
  { key: 'longue', icon: '📚', label: 'Campagne longue', sub: 'Au long cours' },
  { key: 'sandbox', icon: '🌍', label: 'Sandbox', sub: 'Monde ouvert' }
]

// --- Générateurs légers de titre & lieu (contextuels au cadre) --------------
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const TITRE_ADJ = ['Ombres', 'Cendres', 'Larmes', 'Cris', 'Murmures', 'Chaînes', 'Épines', 'Reliques', 'Serments', 'Ruines']
const TITRE_LIEU = ['de la Cité engloutie', 'du Roi Sorcier', 'des Terres grises', 'de la Tour brisée', 'du Val maudit', 'des Profondeurs', 'de l’Aube pâle', 'du Sanctuaire oublié', 'de la Marée noire', 'des Neiges éternelles']
const genererTitre = () => `${pick(['Les', 'Le', 'La'])} ${pick(TITRE_ADJ)} ${pick(TITRE_LIEU)}`

const LIEUX: Record<string, string[]> = {
  ville: ['Val-de-Brume', 'Portecendre', 'Hautroc', 'Boisdoré', 'Pierrefonte', 'Corbeval'],
  donjon: ['la Crypte des Sept Rois', 'les Catacombes d’Ombreval', 'le Tombeau oublié', 'les Mines de Fer-Noir'],
  nature: ['la Forêt des Murmures', 'les Landes brûlées', 'le Col du Vent Hurlant', 'la Vallée perdue'],
  mer: ['Port-Salaise', 'l’Île aux Épaves', 'la Baie des Naufrageurs', 'l’Archipel des Brumes'],
  plans: ['le Bastion du Vide', 'les Jardins d’Airain', 'la Cité entre les mondes'],
  varie: ['Le Carrefour des Mondes', 'la Route des Cendres', 'les Marches du Nord']
}
const genererLieu = (cadre: string) => pick(LIEUX[cadre] ?? LIEUX.varie)

const ROLES = ['Aubergiste', 'Marchand', 'Garde', 'Prêtre', 'Érudit', 'Noble', 'Contrebandier', 'Guérisseuse', 'Capitaine', 'Ermite']

// Première rencontre contextuelle (texte) selon cadre + niveau.
function genererRencontre(cadre: string, niveauLabel: string): string {
  const parCadre: Record<string, string[]> = {
    ville: ['une bagarre de taverne qui dégénère', 'un pickpocket porteur d’un message codé', 'une émeute devant la halle'],
    donjon: ['une embuscade de gobelins dans un couloir effondré', 'un piège ancien gardant une porte scellée', 'des morts-vivants réveillés par l’intrusion'],
    nature: ['une meute de loups affamés au crépuscule', 'un pont gardé par un troll péager', 'un campement de bandits sur la route'],
    mer: ['un abordage de pirates par temps de brume', 'une créature des profondeurs frôlant la coque', 'un naufragé aux intentions troubles'],
    plans: ['une faille instable crachant des élémentaires', 'un gardien extraplanaire exigeant un péage', 'une distorsion qui échange les visages'],
    varie: ['des voyageurs en détresse (ou est-ce un piège ?)', 'un carrefour gardé par une énigme vivante']
  }
  const base = pick(parCadre[cadre] ?? parCadre.varie)
  return `Première rencontre (${niveauLabel}) : ${base}.`
}

export default function AssistantScenario({
  onClose,
  onCreated
}: {
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const TOTAL = 5
  const [step, setStep] = useState(0) // 0..4 questions, puis 5 = écran génération
  const [titre, setTitre] = useState('')
  const [nbJoueurs, setNbJoueurs] = useState('')
  const [niveau, setNiveau] = useState('')
  const [cadre, setCadre] = useState('')
  const [duree, setDuree] = useState('')

  const [genLieu, setGenLieu] = useState(true)
  const [genPnj, setGenPnj] = useState(true)
  const [genRencontre, setGenRencontre] = useState(true)
  const [genChapitres, setGenChapitres] = useState(false)
  const [creating, setCreating] = useState(false)
  const [erreur, setErreur] = useState('')

  const niveauLabel = useMemo(
    () => Q_NIVEAU.find((n) => n.key === niveau)?.sub ?? 'niveau libre',
    [niveau]
  )

  const suivant = () => setStep((s) => Math.min(TOTAL, s + 1))
  const retour = () => setStep((s) => Math.max(0, s - 1))

  const nbChapitresPourDuree = (d: string) =>
    d === 'oneshot' ? 1 : d === 'mini' ? 4 : d === 'longue' ? 8 : d === 'sandbox' ? 3 : 3

  async function creer() {
    setCreating(true)
    setErreur('')
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      setErreur('Non connecté.')
      setCreating(false)
      return
    }

    const nomFinal = titre.trim() || genererTitre()
    const lieu = genLieu ? genererLieu(cadre || 'varie') : null

    // Résumé lisible du cadrage dans la description.
    const descLignes = [
      cadre && `Cadre : ${Q_CADRE.find((c) => c.key === cadre)?.label ?? cadre}.`,
      niveau && `Groupe : niveau ${niveau} (${niveauLabel}).`,
      nbJoueurs && nbJoueurs !== '?' && `Joueurs : ${nbJoueurs}.`,
      duree && `Format : ${Q_DUREE.find((d) => d.key === duree)?.label ?? duree}.`,
      lieu && `Point de départ : ${lieu}.`
    ].filter(Boolean)
    const notesLignes = [
      lieu && `📍 Lieu de départ : ${lieu}.`,
      genRencontre && genererRencontre(cadre || 'varie', niveauLabel)
    ].filter(Boolean)

    // 1. Scénario
    const { data: scen, error } = await supabase
      .from('scenarios')
      .insert({
        nom: nomFinal,
        description: descLignes.join('\n'),
        notes: notesLignes.join('\n'),
        mj_id: user.id
      })
      .select('id')
      .single()
    if (error || !scen) {
      setErreur(error?.message ?? 'Création impossible.')
      setCreating(false)
      return
    }
    const scenarioId = scen.id as string

    // 2. PNJ de départ (2-3) — réellement créés + liés
    if (genPnj) {
      const nb = 2 + Math.floor(Math.random() * 2) // 2 ou 3
      for (let i = 0; i < nb; i++) {
        const nom = genererNomPnj('humain', 'n')
        const perso = formaterPersonnalitePnj(genererPersonnalitePnj())
        const { data: pnjRow } = await supabase
          .from('pnj')
          .insert({ mj_id: user.id, nom, role: pick(ROLES), personnalite: perso })
          .select('id')
          .single()
        if (pnjRow?.id) {
          await supabase.from('scenario_liens').insert({
            scenario_id: scenarioId,
            element_type: 'pnj',
            element_id: pnjRow.id
          })
        }
      }
    }

    // 3. Chapitres vides pré-nommés
    if (genChapitres) {
      const n = nbChapitresPourDuree(duree)
      const rows = Array.from({ length: n }).map((_, i) => ({
        scenario_id: scenarioId,
        titre: `Chapitre ${i + 1}`,
        ordre: i
      }))
      await supabase.from('chapitres').insert(rows)
    }

    onCreated(scenarioId)
  }

  // --- Rendu -----------------------------------------------------------------
  const QuestionShell = ({
    question,
    aide,
    children
  }: {
    question: string
    aide?: string
    children: React.ReactNode
  }) => (
    <div>
      <h3 className="text-xl md:text-2xl font-bold text-yellow-100 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
        {question}
      </h3>
      {aide && <p className="text-sm text-gray-400 mb-4">{aide}</p>}
      {children}
    </div>
  )

  const grilleChoix = (
    opts: ChoiceOpt[],
    value: string,
    setValue: (v: string) => void
  ) => (
    <ChoiceGrid cols={3}>
      {opts.map((o) => (
        <ChoiceCard
          key={o.key}
          icon={o.icon}
          title={o.label}
          subtitle={o.sub}
          selected={value === o.key}
          onClick={() => {
            setValue(o.key)
            setTimeout(suivant, 180)
          }}
        />
      ))}
    </ChoiceGrid>
  )

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 overflow-y-auto p-3 md:p-6">
      <div
        className="max-w-2xl mx-auto rounded-2xl border-2 shadow-2xl"
        style={{ background: '#12100b', borderColor: 'rgba(201,168,76,0.4)' }}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
          <p className="font-bold" style={{ color: OR, fontFamily: 'Georgia, serif' }}>
            🪄 Assistant d’aventure
          </p>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8" aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="px-4 md:px-6 py-5">
          {step < TOTAL && (
            <StepProgress current={step + 1} total={TOTAL} />
          )}

          {/* Q1 — Titre */}
          {step === 0 && (
            <QuestionShell question="Le titre de ton aventure ?" aide="Tu pourras le changer plus tard.">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="La Crypte du Roi Sorcier"
                  className="flex-1 min-w-0 p-3 rounded-lg bg-black/40 text-white border outline-none"
                  style={{ borderColor: 'rgba(201,168,76,0.3)' }}
                />
                <GenerateButton onClick={() => setTitre(genererTitre())} title="Suggérer un titre" />
              </div>
            </QuestionShell>
          )}

          {/* Q2 — Joueurs */}
          {step === 1 && (
            <QuestionShell question="Combien de joueurs ?" aide="Pour calibrer les rencontres.">
              {grilleChoix(Q_JOUEURS, nbJoueurs, setNbJoueurs)}
            </QuestionShell>
          )}

          {/* Q3 — Niveau */}
          {step === 2 && (
            <QuestionShell question="Le niveau du groupe ?" aide="Détermine la puissance des menaces.">
              {grilleChoix(Q_NIVEAU, niveau, setNiveau)}
            </QuestionShell>
          )}

          {/* Q4 — Cadre */}
          {step === 3 && (
            <QuestionShell question="Le cadre principal ?" aide="L’ambiance et les lieux de départ.">
              {grilleChoix(Q_CADRE, cadre, setCadre)}
            </QuestionShell>
          )}

          {/* Q5 — Durée */}
          {step === 4 && (
            <QuestionShell question="La durée visée ?" aide="Pour proposer un nombre de chapitres adapté.">
              {grilleChoix(Q_DUREE, duree, setDuree)}
            </QuestionShell>
          )}

          {/* Écran de génération */}
          {step === TOTAL && (
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-yellow-100 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                {titre.trim() || 'Ton aventure'}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Choisis ce que l’assistant crée pour toi. Tout est optionnel et modifiable ensuite.
              </p>
              <div className="space-y-2">
                {[
                  { on: genLieu, set: setGenLieu, icon: '📍', label: 'Un lieu / ville de départ', desc: 'Adapté au cadre choisi' },
                  { on: genPnj, set: setGenPnj, icon: '🧑', label: '2-3 PNJ de départ', desc: 'Nom + rôle + personnalité, liés au scénario' },
                  { on: genRencontre, set: setGenRencontre, icon: '⚔️', label: 'Une première rencontre', desc: 'Suggestion selon niveau et cadre (dans les notes)' },
                  { on: genChapitres, set: setGenChapitres, icon: '📖', label: 'Des chapitres vides pré-nommés', desc: 'Selon la durée visée' }
                ].map((o) => (
                  <label
                    key={o.label}
                    className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition"
                    style={{
                      background: o.on ? 'rgba(201,168,76,0.10)' : 'rgba(0,0,0,0.25)',
                      borderColor: o.on ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={o.on}
                      onChange={(e) => o.set(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-[#C9A84C]"
                    />
                    <div>
                      <p className="text-yellow-100 font-bold text-sm">{o.icon} {o.label}</p>
                      <p className="text-gray-400 text-xs">{o.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {erreur && <p className="text-red-400 text-sm mt-3">{erreur}</p>}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2 px-4 md:px-6 py-4 border-t" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
          <button
            type="button"
            onClick={step === 0 ? onClose : retour}
            className="min-h-[44px] px-4 rounded-lg text-sm text-gray-400 hover:text-white"
          >
            {step === 0 ? 'Annuler' : '← Retour'}
          </button>
          <div className="flex items-center gap-2">
            {step < TOTAL && (
              <button
                type="button"
                onClick={suivant}
                className="min-h-[44px] px-4 rounded-lg text-sm text-gray-300 hover:text-white border border-gray-600"
              >
                Passer
              </button>
            )}
            {step < TOTAL ? (
              <button
                type="button"
                onClick={suivant}
                className="min-h-[44px] px-5 rounded-lg font-bold text-gray-900"
                style={{ background: OR }}
              >
                Suivant →
              </button>
            ) : (
              <button
                type="button"
                onClick={creer}
                disabled={creating}
                className="min-h-[44px] px-5 rounded-lg font-bold text-gray-900 disabled:opacity-60"
                style={{ background: OR }}
              >
                {creating ? 'Création…' : '✨ Créer mon aventure'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
