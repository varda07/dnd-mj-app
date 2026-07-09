'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { StepProgress, ChoiceCard, ChoiceGrid, GenerateButton } from '@/app/components/ui/FormKit'
import {
  RACES,
  CLASSES,
  HISTORIQUES,
  STANDARD_ARRAY,
  NIVEAU_SOUS_CLASSE,
  NOMS_PAR_RACE,
  modificateur,
  bonusMaitrise,
  moyenneDeVie,
  type StatKey
} from '@/app/data/dnd5e'

// ============================================================================
// AssistantPersonnage — Roadmap Créations, Phase 2
// ----------------------------------------------------------------------------
// Assistant guidé D&D 5e, une étape par écran. Réutilise les données et règles
// existantes (RACES, CLASSES, HISTORIQUES, seuils de sous-classe, PV, bonus de
// maîtrise). À la fin, crée le personnage puis renvoie vers sa fiche (où les
// sorts filtrés par classe/niveau et l'équipement se peaufinent).
// ============================================================================

const OR = '#C9A84C'
const STATS: { key: StatKey; abbr: string; nom: string }[] = [
  { key: 'for', abbr: 'FOR', nom: 'Force' },
  { key: 'dex', abbr: 'DEX', nom: 'Dextérité' },
  { key: 'con', abbr: 'CON', nom: 'Constitution' },
  { key: 'int', abbr: 'INT', nom: 'Intelligence' },
  { key: 'sag', abbr: 'SAG', nom: 'Sagesse' },
  { key: 'cha', abbr: 'CHA', nom: 'Charisme' }
]
const STAT_COL: Record<StatKey, 'force' | 'dexterite' | 'constitution' | 'intelligence' | 'sagesse' | 'charisme'> = {
  for: 'force', dex: 'dexterite', con: 'constitution', int: 'intelligence', sag: 'sagesse', cha: 'charisme'
}

const RESUME_CLASSE: Record<string, string> = {
  Barbare: 'Colosse en furie, encaisse et frappe fort.',
  Barde: 'Artiste polyvalent, magie et soutien social.',
  Clerc: 'Serviteur divin : soins, buffs et zèle.',
  Druide: 'Gardien de la nature, formes animales.',
  Ensorceleur: 'Magie innée, sorts modulables.',
  Guerrier: 'Maître des armes, attaques multiples.',
  Magicien: 'Érudit arcanique au vaste grimoire.',
  Moine: 'Arts martiaux et énergie du ki.',
  Occultiste: 'Pacte avec une entité, magie de pacte.',
  Paladin: 'Chevalier sacré, serments et châtiment.',
  Rôdeur: 'Traqueur des terres sauvages, demi-lanceur.',
  Roublard: 'Furtivité, attaque sournoise, précision.',
  Artificier: 'Ingénieur magique, objets et gadgets.'
}

// Coût du « point buy » (27 points), scores 8→15.
const COUT_PB: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const roll4d6 = () => {
  const d = [0, 0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6)).sort((a, b) => b - a)
  return d[0] + d[1] + d[2]
}

type Methode = 'standard' | 'pointbuy' | '4d6'

export default function AssistantPersonnage({
  onClose,
  onCreated,
  initialSurprise = false
}: {
  onClose: () => void
  onCreated: (id: string) => void
  initialSurprise?: boolean
}) {
  const STEPS = ['Niveau', 'Espèce', 'Classe', 'Sous-classe', 'Caractéristiques', 'Historique', 'Nom']
  const [step, setStep] = useState(0)

  const [niveau, setNiveau] = useState(1)
  const [raceNom, setRaceNom] = useState('')
  const [classeNom, setClasseNom] = useState('')
  const [sousClasse, setSousClasse] = useState('')
  const [historique, setHistorique] = useState('')
  const [nom, setNom] = useState('')

  const [methode, setMethode] = useState<Methode>('standard')
  // Pool de valeurs à assigner (standard array ou 4d6). assign = index dans pool.
  const [pool, setPool] = useState<number[]>([...STANDARD_ARRAY])
  const [assign, setAssign] = useState<Record<StatKey, number>>({
    for: 0, dex: 1, con: 2, int: 3, sag: 4, cha: 5
  })
  // Point buy : score direct par stat.
  const [pb, setPb] = useState<Record<StatKey, number>>({
    for: 8, dex: 8, con: 8, int: 8, sag: 8, cha: 8
  })
  const [creating, setCreating] = useState(false)
  const [erreur, setErreur] = useState('')

  // « Surprends-moi » depuis la carte de sélection : génère tout au montage.
  useEffect(() => {
    if (initialSurprise) surprendsMoi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const race = useMemo(() => RACES.find((r) => r.nom === raceNom), [raceNom])
  const classe = useMemo(() => CLASSES.find((c) => c.nom === classeNom), [classeNom])

  // La sous-classe n'est proposée que si le niveau atteint le seuil de la classe.
  const seuilSousClasse = classeNom ? NIVEAU_SOUS_CLASSE[classeNom] : undefined
  const sousClasseDispo = !!seuilSousClasse && niveau >= seuilSousClasse

  // Stat finale = base (méthode) + bonus racial.
  const statFinale = (k: StatKey): number => {
    const base = methode === 'pointbuy' ? pb[k] : pool[assign[k]] ?? 10
    const bonus = race?.bonusStats?.[k] ?? 0
    return base + bonus
  }
  const pointsPB = useMemo(
    () => STATS.reduce((sum, s) => sum + (COUT_PB[pb[s.key]] ?? 0), 0),
    [pb]
  )

  const total = STEPS.length
  const suivant = () => setStep((s) => Math.min(total, s + 1))
  const retour = () => setStep((s) => Math.max(0, s - 1))

  // Suggère une répartition adaptée à la classe (valeurs hautes sur les caracs
  // principales). N'affecte que l'assignation array/4d6.
  const suggererReparition = (currentPool: number[]) => {
    const ordreStats: StatKey[] = [
      ...((classe?.caracteristiquesPrincipales ?? []) as StatKey[]),
      'con',
      ...STATS.map((s) => s.key)
    ].filter((v, i, arr) => arr.indexOf(v) === i) as StatKey[]
    const idxTriDesc = currentPool
      .map((v, i) => ({ v, i }))
      .sort((a, b) => b.v - a.v)
      .map((o) => o.i)
    const next: Record<StatKey, number> = {} as Record<StatKey, number>
    ordreStats.forEach((k, rang) => {
      next[k] = idxTriDesc[rang]
    })
    setAssign(next)
  }

  const relancer4d6 = () => {
    const p = [0, 0, 0, 0, 0, 0].map(() => roll4d6())
    setPool(p)
    suggererReparition(p)
  }

  const surprendsMoi = () => {
    const r = pick(RACES)
    const c = pick(CLASSES)
    setRaceNom(r.nom)
    setClasseNom(c.nom)
    const seuil = NIVEAU_SOUS_CLASSE[c.nom]
    setSousClasse(seuil && niveau >= seuil && c.sousClasses?.length ? pick(c.sousClasses) : '')
    setHistorique(pick(HISTORIQUES).nom)
    setMethode('standard')
    setPool([...STANDARD_ARRAY])
    setNom(pick(NOMS_PAR_RACE[r.nom] ?? NOMS_PAR_RACE.Humain))
    // Répartition adaptée.
    setTimeout(() => suggererReparition([...STANDARD_ARRAY]), 0)
    setStep(total) // écran récap
  }

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
    if (!classe) {
      setErreur('Choisis une classe.')
      setCreating(false)
      return
    }

    const stats = {
      force: statFinale('for'),
      dexterite: statFinale('dex'),
      constitution: statFinale('con'),
      intelligence: statFinale('int'),
      sagesse: statFinale('sag'),
      charisme: statFinale('cha')
    }
    const conMod = modificateur(stats.constitution)
    // PV : max au niveau 1 + moyenne du dé par niveau suivant, + mod CON / niveau.
    let hp = classe.hpNiveau1Base + conMod
    for (let n = 2; n <= niveau; n++) hp += moyenneDeVie(classe.deVie) + conMod
    hp = Math.max(1, hp)

    const payload = {
      joueur_id: user.id,
      nom: nom.trim() || pick(NOMS_PAR_RACE[raceNom] ?? NOMS_PAR_RACE.Humain),
      race: raceNom || null,
      classe: classeNom,
      sous_classe: sousClasseDispo ? sousClasse : '',
      historique: historique || HISTORIQUES[0].nom,
      niveau,
      de_vie: classe.deVie,
      hp_max: hp,
      hp_actuel: hp,
      ...stats
    }

    const { data, error } = await supabase
      .from('personnages')
      .insert(payload)
      .select('id')
      .single()
    if (error || !data) {
      setErreur(error?.message ?? 'Création impossible.')
      setCreating(false)
      return
    }
    onCreated(data.id as string)
  }

  // --- Rendu -----------------------------------------------------------------
  const Titre = ({ q, aide }: { q: string; aide?: string }) => (
    <div className="mb-4">
      <h3 className="text-xl md:text-2xl font-bold text-yellow-100" style={{ fontFamily: 'Georgia, serif' }}>
        {q}
      </h3>
      {aide && <p className="text-sm text-gray-400 mt-0.5">💡 {aide}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 overflow-y-auto p-3 md:p-6">
      <div
        className="max-w-2xl mx-auto rounded-2xl border-2 shadow-2xl"
        style={{ background: '#12100b', borderColor: 'rgba(201,168,76,0.4)' }}
      >
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
          <p className="font-bold" style={{ color: OR, fontFamily: 'Georgia, serif' }}>🪄 Assistant de personnage</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={surprendsMoi}
              className="text-xs px-2.5 py-1.5 rounded border border-yellow-700/50 text-yellow-300 hover:bg-yellow-500/10"
              title="Générer un personnage complet aléatoire"
            >
              🎲 Surprends-moi
            </button>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8" aria-label="Fermer">×</button>
          </div>
        </div>

        <div className="px-4 md:px-6 py-5">
          {step < total && <StepProgress current={step + 1} total={total} labels={STEPS} />}

          {/* 0 — Niveau */}
          {step === 0 && (
            <div>
              <Titre q="À quel niveau démarre-t-il ?" aide="Les PV, le bonus de maîtrise et les sorts s'ajusteront." />
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={niveau}
                  onChange={(e) => setNiveau(Number(e.target.value))}
                  className="flex-1 min-w-[180px] accent-[#C9A84C]"
                />
                <span className="text-2xl font-bold text-yellow-200 w-12 text-center">{niveau}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Bonus de maîtrise : +{bonusMaitrise(niveau)}</p>
            </div>
          )}

          {/* 1 — Espèce */}
          {step === 1 && (
            <div>
              <Titre q="Son espèce ?" aide="Ta classe détermine les capacités, l'espèce donne des bonus." />
              <ChoiceGrid cols={3}>
                {RACES.slice(0, 12).map((r) => (
                  <ChoiceCard
                    key={r.nom}
                    title={r.nom}
                    subtitle={Object.entries(r.bonusStats).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' · ') || (r.bonusLibre ? `+${r.bonusLibre.valeur} au choix` : '')}
                    selected={raceNom === r.nom}
                    onClick={() => { setRaceNom(r.nom); setTimeout(suivant, 180) }}
                  />
                ))}
              </ChoiceGrid>
            </div>
          )}

          {/* 2 — Classe */}
          {step === 2 && (
            <div>
              <Titre q="Sa classe ?" aide="Elle détermine ses capacités de combat et de magie." />
              <ChoiceGrid cols={3}>
                {CLASSES.map((c) => (
                  <ChoiceCard
                    key={c.nom}
                    title={c.nom}
                    subtitle={RESUME_CLASSE[c.nom] ?? c.deVie}
                    selected={classeNom === c.nom}
                    onClick={() => { setClasseNom(c.nom); setSousClasse(''); setTimeout(suivant, 180) }}
                  />
                ))}
              </ChoiceGrid>
            </div>
          )}

          {/* 3 — Sous-classe (conditionnel) */}
          {step === 3 && (
            <div>
              <Titre
                q="Sa sous-classe ?"
                aide={
                  sousClasseDispo
                    ? 'Choisis un archétype.'
                    : `Disponible au niveau ${seuilSousClasse ?? '?'} de ${classeNom || 'cette classe'} — tu la choisiras plus tard.`
                }
              />
              {sousClasseDispo && classe?.sousClasses?.length ? (
                <ChoiceGrid cols={2}>
                  {classe.sousClasses.map((sc) => (
                    <ChoiceCard
                      key={sc}
                      title={sc}
                      selected={sousClasse === sc}
                      onClick={() => { setSousClasse(sc); setTimeout(suivant, 180) }}
                    />
                  ))}
                </ChoiceGrid>
              ) : (
                <p className="text-sm text-gray-500 italic">Rien à choisir ici pour l'instant — passe à l'étape suivante.</p>
              )}
            </div>
          )}

          {/* 4 — Caractéristiques */}
          {step === 4 && (
            <div>
              <Titre q="Ses caractéristiques ?" aide="Les bonus d'espèce s'ajoutent automatiquement." />
              <div className="flex gap-1.5 mb-4 flex-wrap">
                {([['standard', 'Standard (15,14,13,12,10,8)'], ['pointbuy', 'Achat de points (27)'], ['4d6', 'Jets 4d6']] as [Methode, string][]).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMethode(m)
                      if (m === 'standard') { setPool([...STANDARD_ARRAY]); suggererReparition([...STANDARD_ARRAY]) }
                      if (m === '4d6') relancer4d6()
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      methode === m ? 'bg-[#C9A84C]/20 text-[#e6c878] border-[#C9A84C]' : 'text-gray-400 border-gray-700 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                {methode === '4d6' && <GenerateButton onClick={relancer4d6} title="Relancer les 4d6" className="!min-h-[34px]" />}
              </div>

              {methode === 'pointbuy' && (
                <p className={`text-xs mb-2 ${pointsPB > 27 ? 'text-red-400' : 'text-gray-400'}`}>
                  Points dépensés : {pointsPB} / 27
                </p>
              )}

              <div className="space-y-1.5">
                {STATS.map((s) => {
                  const finale = statFinale(s.key)
                  const bonus = race?.bonusStats?.[s.key] ?? 0
                  return (
                    <div key={s.key} className="flex items-center gap-2">
                      <span className="w-12 text-xs font-bold text-yellow-400/80">{s.abbr}</span>
                      {methode === 'pointbuy' ? (
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setPb((p) => ({ ...p, [s.key]: Math.max(8, p[s.key] - 1) }))} className="w-8 h-8 rounded bg-gray-800 border border-gray-600 text-white">−</button>
                          <span className="w-8 text-center text-white font-bold">{pb[s.key]}</span>
                          <button type="button" onClick={() => setPb((p) => ({ ...p, [s.key]: Math.min(15, p[s.key] + 1) }))} className="w-8 h-8 rounded bg-gray-800 border border-gray-600 text-white">+</button>
                        </div>
                      ) : (
                        <select
                          value={assign[s.key]}
                          onChange={(e) => {
                            const newIdx = Number(e.target.value)
                            setAssign((prev) => {
                              // Échange avec la stat qui détenait cet index.
                              const other = (Object.keys(prev) as StatKey[]).find((k) => prev[k] === newIdx)
                              const next = { ...prev, [s.key]: newIdx }
                              if (other && other !== s.key) next[other] = prev[s.key]
                              return next
                            })
                          }}
                          className="p-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm"
                        >
                          {pool.map((v, i) => (
                            <option key={i} value={i}>{v}</option>
                          ))}
                        </select>
                      )}
                      <span className="text-xs text-gray-500">
                        {bonus > 0 && <span className="text-emerald-400">+{bonus}</span>} =
                      </span>
                      <span className="text-white font-bold w-8 text-center">{finale}</span>
                      <span className="text-xs text-gray-400">
                        ({modificateur(finale) >= 0 ? '+' : ''}{modificateur(finale)})
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 5 — Historique */}
          {step === 5 && (
            <div>
              <Titre q="Son historique ?" aide="Il accorde des maîtrises de compétences." />
              <ChoiceGrid cols={3}>
                {HISTORIQUES.map((h) => (
                  <ChoiceCard
                    key={h.nom}
                    title={h.nom}
                    subtitle={h.competences.join(', ')}
                    selected={historique === h.nom}
                    onClick={() => { setHistorique(h.nom); setTimeout(suivant, 180) }}
                  />
                ))}
              </ChoiceGrid>
            </div>
          )}

          {/* 6 — Nom + récap */}
          {step === 6 && (
            <div>
              <Titre q="Son nom ?" aide="Dernière étape — les sorts et l'équipement se peaufinent ensuite sur la fiche." />
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Aldric Corbeau"
                  className="flex-1 min-w-0 p-3 rounded-lg bg-black/40 text-white border outline-none"
                  style={{ borderColor: 'rgba(201,168,76,0.3)' }}
                />
                <GenerateButton onClick={() => setNom(pick(NOMS_PAR_RACE[raceNom] ?? NOMS_PAR_RACE.Humain))} title="Suggérer un nom" />
              </div>
              <div className="rounded-lg border p-3 text-sm" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(201,168,76,0.25)' }}>
                <p className="text-yellow-200 font-bold mb-1">{nom.trim() || 'Personnage'}</p>
                <p className="text-gray-300">
                  {raceNom || '—'} · {classeNom || '—'}
                  {sousClasseDispo && sousClasse ? ` (${sousClasse})` : ''} · Niv. {niveau}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {STATS.map((s) => `${s.abbr} ${statFinale(s.key)}`).join(' · ')}
                </p>
              </div>
              {erreur && <p className="text-red-400 text-sm mt-3">{erreur}</p>}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2 px-4 md:px-6 py-4 border-t" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
          <button type="button" onClick={step === 0 ? onClose : retour} className="min-h-[44px] px-4 rounded-lg text-sm text-gray-400 hover:text-white">
            {step === 0 ? 'Annuler' : '← Retour'}
          </button>
          <div className="flex items-center gap-2">
            {step < total && (
              <button type="button" onClick={suivant} className="min-h-[44px] px-4 rounded-lg text-sm text-gray-300 hover:text-white border border-gray-600">
                Passer
              </button>
            )}
            {step < total ? (
              <button type="button" onClick={suivant} className="min-h-[44px] px-5 rounded-lg font-bold text-gray-900" style={{ background: OR }}>
                Suivant →
              </button>
            ) : (
              <button type="button" onClick={creer} disabled={creating || !classeNom} className="min-h-[44px] px-5 rounded-lg font-bold text-gray-900 disabled:opacity-60" style={{ background: OR }}>
                {creating ? 'Création…' : '✨ Créer le personnage'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
