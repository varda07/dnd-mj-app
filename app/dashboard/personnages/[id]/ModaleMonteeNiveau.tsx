'use client'

// ============================================================================
// Modale de montée de niveau — pilote toutes les étapes (HP, sous-classe, ASI,
// sorts, multiclasse) puis renvoie le diff complet via onApply.
// Le parent reste responsable de la persistance Supabase.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import {
  CLASSES,
  NIVEAU_SOUS_CLASSE,
  estNiveauASI,
  moyenneDeVie,
  facesDeVie,
  apprendSorts,
  prerequisManquants,
  type ClasseMultiple
} from '@/app/data/dnd5e'
import { slotsRecommandes } from '@/app/data/sorts_dnd5e'
import { DONS, donAccessible, type DonContext } from '@/app/data/dons_dnd5e'

type StatKey = 'force' | 'dexterite' | 'constitution' | 'intelligence' | 'sagesse' | 'charisme'

const STATS: { key: StatKey; abbr: string; icon: string; courte: 'for' | 'dex' | 'con' | 'int' | 'sag' | 'cha' }[] = [
  { key: 'force', abbr: 'FOR', icon: '💪', courte: 'for' },
  { key: 'dexterite', abbr: 'DEX', icon: '🏃', courte: 'dex' },
  { key: 'constitution', abbr: 'CON', icon: '🫀', courte: 'con' },
  { key: 'intelligence', abbr: 'INT', icon: '🧠', courte: 'int' },
  { key: 'sagesse', abbr: 'SAG', icon: '🙏', courte: 'sag' },
  { key: 'charisme', abbr: 'CHA', icon: '✨', courte: 'cha' }
]

const modifier = (v: number) => Math.floor((v - 10) / 2)

export type PersoSnapshot = {
  classe: string | null
  sous_classe: string
  niveau: number
  hp_max: number
  hp_actuel: number
  de_vie: string | null
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
  sorts_slots_max: Record<string, number>
  classes_multiples: ClasseMultiple[]
}

// Diff appliqué en sortie. Toutes les clés sont optionnelles : seules celles
// présentes seront persistées par le parent.
export type MonteeResult = {
  niveau: number
  hp_max: number
  hp_actuel: number
  sous_classe?: string
  force?: number
  dexterite?: number
  constitution?: number
  intelligence?: number
  sagesse?: number
  charisme?: number
  sorts_slots_max?: Record<string, number>
  classes_multiples: ClasseMultiple[]
  // Don (feat) choisi à la place de l'ASI — le parent l'ajoute aux « Exploits ».
  donAjoute?: string
  // Pour résumé visuel
  resume: {
    classeMontee: string
    hpGagnes: number
    detailDe: string
    sousClasseChoisie?: string
    asi?: string
    slotsModifies?: { niveau: string; avant: number; apres: number }[]
    multiclasse?: boolean
  }
}

type Etape = 'class-choice' | 'hp' | 'sous-classe' | 'asi' | 'sorts' | 'recap'

export default function ModaleMonteeNiveau({
  open,
  perso,
  onClose,
  onApply
}: {
  open: boolean
  perso: PersoSnapshot
  onClose: () => void
  onApply: (result: MonteeResult) => void | Promise<void>
}) {
  // -- Multiclasse : classe ciblée par la montée de niveau --
  // null = on monte la classe principale. Un nom = on multiclasse dans cette classe.
  const [multiclasseEnabled, setMulticlasseEnabled] = useState(false)
  const [classeMonteeNom, setClasseMonteeNom] = useState<string>(perso.classe ?? '')

  // -- HP --
  const [hpDe, setHpDe] = useState<number | null>(null)
  const [hpMethode, setHpMethode] = useState<'roll' | 'moyenne' | null>(null)

  // -- Sous-classe --
  const [sousClasseChoix, setSousClasseChoix] = useState<string>('')

  // -- ASI / Don --
  const [asiMode, setAsiMode] = useState<'plus2' | 'deuxplus1' | 'don' | null>(null)
  const [asiTarget1, setAsiTarget1] = useState<StatKey | null>(null)
  const [asiTarget2, setAsiTarget2] = useState<StatKey | null>(null)
  const [donChoisi, setDonChoisi] = useState<string | null>(null)

  // -- Étape courante --
  const [etape, setEtape] = useState<Etape>('class-choice')
  const [animKey, setAnimKey] = useState(0)

  // Reset quand on (ré)ouvre
  useEffect(() => {
    if (!open) return
    setMulticlasseEnabled(false)
    setClasseMonteeNom(perso.classe ?? '')
    setHpDe(null)
    setHpMethode(null)
    setSousClasseChoix('')
    setAsiMode(null)
    setAsiTarget1(null)
    setAsiTarget2(null)
    setDonChoisi(null)
    setEtape('class-choice')
    setAnimKey((k) => k + 1)
  }, [open, perso.classe])

  // -- Calculs dérivés --
  const classeCible = classeMonteeNom
  const classeData = useMemo(
    () => CLASSES.find((c) => c.nom === classeCible),
    [classeCible]
  )

  // Niveau dans la classe ciblée AVANT la montée
  const niveauClasseAvant = useMemo(() => {
    if (!multiclasseEnabled) {
      // Mono ou existante
      const entry = perso.classes_multiples.find((c) => c.classe === classeCible)
      if (entry) return entry.niveau
      // Sinon c'est la classe principale
      return classeCible === perso.classe
        ? (perso.classes_multiples.length === 0 ? perso.niveau : 0)
        : 0
    }
    // Multiclasse : on rentre à 0 dans cette nouvelle classe → on monte à 1
    return 0
  }, [multiclasseEnabled, classeCible, perso])

  const niveauClasseApres = niveauClasseAvant + 1

  // Vérif sous-classe : on la propose si :
  //  - le perso n'a pas déjà de sous-classe pour CETTE classe
  //  - le nouveau niveau de classe atteint le seuil
  // Règle D&D 5e : la sous-classe (archétype) se choisit au niveau DANS cette
  // classe précise (seuil variable selon la classe), pas au niveau total. On
  // ne la propose donc que si le niveau ATTEINT dans la classe ciblée == seuil
  // ET qu'aucune sous-classe n'a encore été choisie pour cette classe.
  const declenchSousClasse = useMemo(() => {
    const seuil = NIVEAU_SOUS_CLASSE[classeCible]
    if (!seuil) return false
    if (niveauClasseApres !== seuil) return false
    // Multiclasse dans une NOUVELLE classe : aucune sous-classe encore → on
    // propose dès que le niveau dans cette classe atteint son seuil.
    if (multiclasseEnabled) return true
    // Classe existante. Si le perso est encore mono-classe, la classe ciblée
    // est forcément la principale → on regarde perso.sous_classe.
    if (perso.classes_multiples.length === 0) {
      return !perso.sous_classe
    }
    // Perso multiclasse : on regarde l'entrée dédiée à cette classe. À défaut
    // (classe principale sans entrée), on retombe sur perso.sous_classe.
    const entry = perso.classes_multiples.find((c) => c.classe === classeCible)
    if (!entry) {
      return classeCible === perso.classe ? !perso.sous_classe : true
    }
    return !entry.sous_classe
  }, [multiclasseEnabled, classeCible, niveauClasseApres, perso])

  const declenchASI = useMemo(
    () => estNiveauASI(classeCible, niveauClasseApres),
    [classeCible, niveauClasseApres]
  )

  // Le perso est-il lanceur de sorts ? (prérequis de certains dons)
  const lanceurDeSorts = useMemo(
    () =>
      apprendSorts(perso.classe) ||
      Object.values(perso.sorts_slots_max ?? {}).some((n) => (n ?? 0) > 0) ||
      perso.classes_multiples.some((c) => apprendSorts(c.classe)),
    [perso]
  )

  // Prérequis multiclasse manquants
  const prerequisKO = useMemo(() => {
    if (!multiclasseEnabled || !classeCible) return []
    return prerequisManquants(classeCible, {
      for: perso.force,
      dex: perso.dexterite,
      con: perso.constitution,
      int: perso.intelligence,
      sag: perso.sagesse,
      cha: perso.charisme
    })
  }, [multiclasseEnabled, classeCible, perso])

  // -- HP gagnés --
  const modCon = modifier(perso.constitution)
  const faces = facesDeVie(classeData?.deVie ?? perso.de_vie)
  const moy = moyenneDeVie(classeData?.deVie ?? perso.de_vie)
  const hpGagnes = hpDe === null ? 0 : Math.max(1, hpDe + modCon)

  // -- Navigation --
  const next = (e: Etape) => {
    setAnimKey((k) => k + 1)
    setEtape(e)
  }

  const passerEtape = () => {
    if (etape === 'class-choice') {
      next('hp')
      return
    }
    if (etape === 'hp') {
      if (declenchSousClasse) next('sous-classe')
      else if (declenchASI) next('asi')
      else next('sorts')
      return
    }
    if (etape === 'sous-classe') {
      if (declenchASI) next('asi')
      else next('sorts')
      return
    }
    if (etape === 'asi') {
      next('sorts')
      return
    }
    if (etape === 'sorts') {
      next('recap')
      return
    }
  }

  // -- Build result on apply --
  const construireResult = (): MonteeResult => {
    const nouvelleStats: Partial<Record<StatKey, number>> = {}
    if (asiMode === 'plus2' && asiTarget1) {
      nouvelleStats[asiTarget1] = Math.min(20, perso[asiTarget1] + 2)
    } else if (asiMode === 'deuxplus1' && asiTarget1 && asiTarget2) {
      nouvelleStats[asiTarget1] = Math.min(20, perso[asiTarget1] + 1)
      nouvelleStats[asiTarget2] = Math.min(20, perso[asiTarget2] + 1)
    }
    // Mode « don » : on ne touche pas aux stats, on renvoie le don choisi.
    const donAjoute =
      asiMode === 'don' && donChoisi ? donChoisi : undefined

    // ClassesMultiples : on met à jour ou on crée l'entrée pour la classe ciblée
    const cm = [...perso.classes_multiples]
    if (cm.length === 0) {
      // Mono → on convertit en multi
      cm.push({
        classe: perso.classe ?? classeCible,
        sous_classe: perso.sous_classe || undefined,
        niveau: perso.niveau
      })
    }
    const idx = cm.findIndex((c) => c.classe === classeCible)
    if (idx === -1) {
      cm.push({
        classe: classeCible,
        sous_classe: declenchSousClasse && sousClasseChoix ? sousClasseChoix : undefined,
        niveau: 1
      })
    } else {
      cm[idx] = {
        ...cm[idx],
        niveau: cm[idx].niveau + 1,
        sous_classe:
          declenchSousClasse && sousClasseChoix
            ? sousClasseChoix
            : cm[idx].sous_classe
      }
    }

    const nouveauNiveauTotal = perso.niveau + 1
    const nouveauHpMax = perso.hp_max + hpGagnes
    const nouveauHpActuel = perso.hp_actuel + hpGagnes

    // Slots de sorts — recomputés sur la classe principale + son nouveau niveau
    // (simplification : on n'agrège pas le multiclasse caster level).
    const ancienSlots = perso.sorts_slots_max
    const slotsCibles = slotsRecommandes(perso.classe, nouveauNiveauTotal)
    const slotsModifies: { niveau: string; avant: number; apres: number }[] = []
    let nouveauxSlots: Record<string, number> | undefined
    if (Object.keys(slotsCibles).length > 0) {
      nouveauxSlots = slotsCibles
      for (const k of Object.keys(slotsCibles)) {
        const avant = ancienSlots[k] ?? 0
        const apres = slotsCibles[k]
        if (apres !== avant) slotsModifies.push({ niveau: k, avant, apres })
      }
    }

    return {
      niveau: nouveauNiveauTotal,
      hp_max: nouveauHpMax,
      hp_actuel: nouveauHpActuel,
      sous_classe:
        declenchSousClasse && sousClasseChoix && classeCible === perso.classe
          ? sousClasseChoix
          : undefined,
      ...nouvelleStats,
      sorts_slots_max: nouveauxSlots,
      classes_multiples: cm,
      donAjoute,
      resume: {
        classeMontee: classeCible,
        hpGagnes,
        detailDe: `${classeData?.deVie ?? perso.de_vie ?? '?'} ${
          hpMethode === 'moyenne' ? `(moyenne ${moy})` : hpDe !== null ? `(jet ${hpDe})` : ''
        } + ${modCon >= 0 ? '+' : ''}${modCon} Con`,
        sousClasseChoisie:
          declenchSousClasse && sousClasseChoix ? sousClasseChoix : undefined,
        asi:
          asiMode === 'plus2' && asiTarget1
            ? `+2 ${asiTarget1.toUpperCase()}`
            : asiMode === 'deuxplus1' && asiTarget1 && asiTarget2
            ? `+1 ${asiTarget1.toUpperCase()} & +1 ${asiTarget2.toUpperCase()}`
            : asiMode === 'don' && donChoisi
            ? `Don : ${donChoisi}`
            : undefined,
        slotsModifies: slotsModifies.length > 0 ? slotsModifies : undefined,
        multiclasse: multiclasseEnabled
      }
    }
  }

  const confirmer = async () => {
    const result = construireResult()
    await onApply(result)
  }

  // -- Helpers UI --
  const lancerDe = () => {
    const v = Math.floor(Math.random() * faces) + 1
    setHpDe(v)
    setHpMethode('roll')
  }
  const prendreMoyenne = () => {
    setHpDe(moy)
    setHpMethode('moyenne')
  }

  // Étape suivante possible ?
  const peutAvancer = () => {
    if (etape === 'class-choice') {
      if (multiclasseEnabled) {
        return !!classeCible && classeCible !== perso.classe && prerequisKO.length === 0
      }
      return !!classeCible
    }
    if (etape === 'hp') return hpDe !== null
    if (etape === 'sous-classe') return !!sousClasseChoix
    if (etape === 'asi') {
      if (asiMode === 'plus2') return !!asiTarget1
      if (asiMode === 'deuxplus1') return !!asiTarget1 && !!asiTarget2 && asiTarget1 !== asiTarget2
      if (asiMode === 'don') return !!donChoisi
      return false
    }
    if (etape === 'sorts') return true
    return true
  }

  if (!open) return null

  const result = etape === 'recap' ? construireResult() : null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .step-anim { animation: slideUp 0.25s ease-out; }
      `}</style>

      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border"
        style={{
          background:
            'linear-gradient(180deg, #1a1410 0%, #14110d 60%, #100c08 100%)',
          borderColor: 'rgba(201,168,76,0.4)',
          boxShadow:
            '0 30px 60px rgba(0,0,0,0.6), 0 0 60px rgba(201,168,76,0.15), inset 0 1px 0 rgba(255,220,140,0.08)'
        }}
      >
        {/* Bandeau cuivré du header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{
            background:
              'linear-gradient(90deg, rgba(201,168,76,0.18), rgba(180,120,60,0.12), rgba(201,168,76,0.18))',
            borderColor: 'rgba(201,168,76,0.4)'
          }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400/80">
              Montée de niveau
            </p>
            <h2 className="text-xl font-serif font-bold text-amber-100">
              ⬆ Niveau {perso.niveau} → {perso.niveau + 1}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-amber-200/70 hover:text-amber-100 text-2xl leading-none w-8 h-8 rounded-full hover:bg-amber-900/30 flex items-center justify-center"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Stepper */}
        <div
          className="px-6 py-3 flex flex-wrap items-center gap-2 border-b text-[10px] uppercase tracking-widest"
          style={{ borderColor: 'rgba(201,168,76,0.15)' }}
        >
          {(['class-choice', 'hp', 'sous-classe', 'asi', 'sorts', 'recap'] as Etape[]).map((s, i) => {
            const label =
              s === 'class-choice' ? 'Classe'
              : s === 'hp' ? 'HP'
              : s === 'sous-classe' ? 'Sous-classe'
              : s === 'asi' ? 'ASI'
              : s === 'sorts' ? 'Sorts'
              : 'Récap'
            const skipped =
              (s === 'sous-classe' && !declenchSousClasse) ||
              (s === 'asi' && !declenchASI)
            const actif = s === etape
            return (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded transition-colors ${
                    actif
                      ? 'bg-amber-500/30 text-amber-100 font-bold'
                      : skipped
                      ? 'text-stone-600 line-through'
                      : 'text-amber-300/60'
                  }`}
                >
                  {label}
                </span>
                {i < 5 && <span className="text-stone-700">›</span>}
              </div>
            )
          })}
        </div>

        {/* Corps */}
        <div className="px-6 py-6 min-h-[280px] max-h-[60vh] overflow-y-auto" key={animKey}>
          <div className="step-anim">
            {etape === 'class-choice' && (
              <EtapeClasse
                perso={perso}
                multiclasseEnabled={multiclasseEnabled}
                setMulticlasseEnabled={setMulticlasseEnabled}
                classeMonteeNom={classeMonteeNom}
                setClasseMonteeNom={setClasseMonteeNom}
                prerequisKO={prerequisKO}
              />
            )}

            {etape === 'hp' && (
              <EtapeHP
                deVie={classeData?.deVie ?? perso.de_vie ?? 'd8'}
                faces={faces}
                moyenne={moy}
                modCon={modCon}
                hpDe={hpDe}
                hpMethode={hpMethode}
                onLancer={lancerDe}
                onMoyenne={prendreMoyenne}
                hpGagnes={hpGagnes}
              />
            )}

            {etape === 'sous-classe' && (
              <EtapeSousClasse
                classeNom={classeCible}
                sousClasses={classeData?.sousClasses ?? []}
                choix={sousClasseChoix}
                onChoix={setSousClasseChoix}
              />
            )}

            {etape === 'asi' && (
              <EtapeASI
                perso={perso}
                mode={asiMode}
                setMode={setAsiMode}
                target1={asiTarget1}
                setTarget1={setAsiTarget1}
                target2={asiTarget2}
                setTarget2={setAsiTarget2}
                donChoisi={donChoisi}
                setDonChoisi={setDonChoisi}
                lanceurDeSorts={lanceurDeSorts}
              />
            )}

            {etape === 'sorts' && (
              <EtapeSorts
                classePrincipale={perso.classe}
                niveauTotalApres={perso.niveau + 1}
                ancienSlots={perso.sorts_slots_max}
              />
            )}

            {etape === 'recap' && result && <EtapeRecap result={result} />}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between border-t gap-3"
          style={{ borderColor: 'rgba(201,168,76,0.15)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200"
          >
            Annuler
          </button>
          {etape !== 'recap' ? (
            <button
              type="button"
              disabled={!peutAvancer()}
              onClick={passerEtape}
              className="px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background:
                  'linear-gradient(135deg, #C9A84C 0%, #8B5A2B 100%)',
                color: '#1a1410',
                boxShadow: '0 4px 14px rgba(201,168,76,0.35)'
              }}
            >
              Continuer ›
            </button>
          ) : (
            <button
              type="button"
              onClick={confirmer}
              className="px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all"
              style={{
                background:
                  'linear-gradient(135deg, #C9A84C 0%, #8B5A2B 100%)',
                color: '#1a1410',
                boxShadow: '0 4px 14px rgba(201,168,76,0.45)'
              }}
            >
              ✓ Appliquer la montée
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Sous-composants par étape
// ----------------------------------------------------------------------------

function EtapeClasse({
  perso,
  multiclasseEnabled,
  setMulticlasseEnabled,
  classeMonteeNom,
  setClasseMonteeNom,
  prerequisKO
}: {
  perso: PersoSnapshot
  multiclasseEnabled: boolean
  setMulticlasseEnabled: (v: boolean) => void
  classeMonteeNom: string
  setClasseMonteeNom: (v: string) => void
  prerequisKO: ('for' | 'dex' | 'con' | 'int' | 'sag' | 'cha')[]
}) {
  // Classes déjà présentes dans l'historique
  const classesActuelles = useMemo(() => {
    if (perso.classes_multiples.length === 0 && perso.classe) {
      return [{ classe: perso.classe, niveau: perso.niveau }]
    }
    return perso.classes_multiples
  }, [perso])

  return (
    <div className="space-y-4">
      <h3 className="text-amber-100 font-serif text-lg mb-2">Dans quelle classe ?</h3>
      <p className="text-stone-400 text-sm">
        Choisis si tu progresses dans une classe existante ou si tu débutes une nouvelle classe.
      </p>

      <div className="space-y-2">
        {!multiclasseEnabled &&
          classesActuelles.map((c) => (
            <button
              key={c.classe}
              type="button"
              onClick={() => setClasseMonteeNom(c.classe)}
              className={`w-full text-left rounded-lg border px-4 py-3 transition-all ${
                classeMonteeNom === c.classe
                  ? 'border-amber-500 bg-amber-900/30'
                  : 'border-stone-700 hover:border-amber-700/60 bg-stone-900/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-amber-100 font-bold">{c.classe}</span>
                <span className="text-amber-400 text-sm">
                  Niv {c.niveau} → {c.niveau + 1}
                </span>
              </div>
            </button>
          ))}
      </div>

      <label className="flex items-center gap-2 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={multiclasseEnabled}
          onChange={(e) => {
            setMulticlasseEnabled(e.target.checked)
            if (!e.target.checked) setClasseMonteeNom(perso.classe ?? '')
            else setClasseMonteeNom('')
          }}
          className="accent-amber-500"
        />
        <span className="text-amber-200 text-sm">⚔ Multiclasser dans une nouvelle classe</span>
      </label>

      {multiclasseEnabled && (
        <div className="space-y-2">
          <select
            value={classeMonteeNom}
            onChange={(e) => setClasseMonteeNom(e.target.value)}
            className="w-full bg-stone-900 border border-amber-800/40 rounded px-3 py-2 text-amber-100"
          >
            <option value="">— Choisir une classe —</option>
            {CLASSES.filter(
              (c) => !classesActuelles.find((cc) => cc.classe === c.nom)
            ).map((c, idx) => (
              <option key={`${c.nom}-${idx}`} value={c.nom}>
                {c.nom} ({c.deVie})
              </option>
            ))}
          </select>
          {classeMonteeNom && prerequisKO.length > 0 && (
            <div className="bg-red-900/30 border border-red-700/60 rounded p-3 text-sm text-red-200">
              ⚠ Prérequis non atteints pour multiclasser dans <b>{classeMonteeNom}</b> :
              <ul className="mt-1 ml-4 list-disc text-red-300">
                {prerequisKO.map((s) => (
                  <li key={s}>{s.toUpperCase()} ≥ 13 requis</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EtapeHP({
  deVie,
  faces,
  moyenne,
  modCon,
  hpDe,
  hpMethode,
  onLancer,
  onMoyenne,
  hpGagnes
}: {
  deVie: string
  faces: number
  moyenne: number
  modCon: number
  hpDe: number | null
  hpMethode: 'roll' | 'moyenne' | null
  onLancer: () => void
  onMoyenne: () => void
  hpGagnes: number
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-amber-100 font-serif text-lg">Points de vie gagnés</h3>
      <p className="text-stone-400 text-sm">
        Dé de vie : <span className="text-amber-300 font-bold">{deVie}</span>
        {' · '}Mod Con : <span className="text-amber-300 font-bold">{modCon >= 0 ? `+${modCon}` : modCon}</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onLancer}
          className={`rounded-lg p-4 border-2 transition-all ${
            hpMethode === 'roll'
              ? 'border-amber-400 bg-amber-900/30'
              : 'border-stone-700 hover:border-amber-700/60 bg-stone-900/40'
          }`}
        >
          <div className="text-3xl mb-1">🎲</div>
          <div className="text-amber-100 font-bold text-sm">Lancer le dé</div>
          <div className="text-stone-400 text-xs">1d{faces} aléatoire</div>
        </button>

        <button
          type="button"
          onClick={onMoyenne}
          className={`rounded-lg p-4 border-2 transition-all ${
            hpMethode === 'moyenne'
              ? 'border-amber-400 bg-amber-900/30'
              : 'border-stone-700 hover:border-amber-700/60 bg-stone-900/40'
          }`}
        >
          <div className="text-3xl mb-1">⚖</div>
          <div className="text-amber-100 font-bold text-sm">Prendre la moyenne</div>
          <div className="text-stone-400 text-xs">+{moyenne} fixe</div>
        </button>
      </div>

      {hpDe !== null && (
        <div
          className="rounded-lg p-4 border step-anim"
          style={{
            background:
              'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(180,120,60,0.08))',
            borderColor: 'rgba(201,168,76,0.4)'
          }}
        >
          <p className="text-amber-300 text-xs uppercase tracking-wider mb-1">Résultat</p>
          <p className="text-amber-100 font-serif text-2xl">
            {hpDe} {modCon >= 0 ? '+' : ''}
            {modCon} = <span className="text-amber-300 font-bold">+{hpGagnes} PV</span>
          </p>
        </div>
      )}
    </div>
  )
}

function EtapeSousClasse({
  classeNom,
  sousClasses,
  choix,
  onChoix
}: {
  classeNom: string
  sousClasses: string[]
  choix: string
  onChoix: (v: string) => void
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-amber-100 font-serif text-lg">Choix de sous-classe — {classeNom}</h3>
      <p className="text-stone-400 text-sm">
        Sélectionne la spécialisation qui définit ton identité de classe.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        {sousClasses.map((sc) => (
          <button
            key={sc}
            type="button"
            onClick={() => onChoix(sc)}
            className={`text-left rounded-lg border px-4 py-3 transition-all ${
              choix === sc
                ? 'border-amber-400 bg-amber-900/30 text-amber-100'
                : 'border-stone-700 hover:border-amber-700/60 bg-stone-900/40 text-amber-200/80'
            }`}
          >
            <span className="font-bold text-sm">{sc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function EtapeASI({
  perso,
  mode,
  setMode,
  target1,
  setTarget1,
  target2,
  setTarget2,
  donChoisi,
  setDonChoisi,
  lanceurDeSorts
}: {
  perso: PersoSnapshot
  mode: 'plus2' | 'deuxplus1' | 'don' | null
  setMode: (m: 'plus2' | 'deuxplus1' | 'don' | null) => void
  target1: StatKey | null
  setTarget1: (s: StatKey | null) => void
  target2: StatKey | null
  setTarget2: (s: StatKey | null) => void
  donChoisi: string | null
  setDonChoisi: (d: string | null) => void
  lanceurDeSorts: boolean
}) {
  const donCtx: DonContext = {
    for: perso.force,
    dex: perso.dexterite,
    con: perso.constitution,
    int: perso.intelligence,
    sag: perso.sagesse,
    cha: perso.charisme,
    lanceurDeSorts
  }
  return (
    <div className="space-y-4">
      <h3 className="text-amber-100 font-serif text-lg">Amélioration ou don</h3>
      <p className="text-stone-400 text-sm">
        Augmente tes caractéristiques (max 20) OU choisis un don (feat).
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('plus2')
            setTarget2(null)
            setDonChoisi(null)
          }}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded border-2 transition-all text-sm font-bold ${
            mode === 'plus2'
              ? 'border-amber-400 bg-amber-900/30 text-amber-100'
              : 'border-stone-700 hover:border-amber-700/60 bg-stone-900/40 text-stone-300'
          }`}
        >
          +2 à une seule stat
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('deuxplus1')
            setDonChoisi(null)
          }}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded border-2 transition-all text-sm font-bold ${
            mode === 'deuxplus1'
              ? 'border-amber-400 bg-amber-900/30 text-amber-100'
              : 'border-stone-700 hover:border-amber-700/60 bg-stone-900/40 text-stone-300'
          }`}
        >
          +1 à deux stats
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('don')
            setTarget1(null)
            setTarget2(null)
          }}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded border-2 transition-all text-sm font-bold ${
            mode === 'don'
              ? 'border-amber-400 bg-amber-900/30 text-amber-100'
              : 'border-stone-700 hover:border-amber-700/60 bg-stone-900/40 text-stone-300'
          }`}
        >
          🎖 Prendre un don
        </button>
      </div>

      {mode === 'don' && (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto step-anim pr-1">
          {DONS.map((don) => {
            const accessible = donAccessible(don, donCtx)
            const selected = donChoisi === don.nom
            return (
              <button
                key={don.nom}
                type="button"
                disabled={!accessible}
                onClick={() => setDonChoisi(don.nom)}
                className={`w-full text-left rounded-lg border px-3 py-2 transition-all ${
                  !accessible
                    ? 'border-stone-800 bg-stone-900/30 opacity-50 cursor-not-allowed'
                    : selected
                    ? 'border-amber-400 bg-amber-900/30'
                    : 'border-stone-700 hover:border-amber-700/60 bg-stone-900/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-amber-100 font-bold text-sm">{don.nom}</span>
                  {don.prerequisTexte && (
                    <span
                      className={`text-[10px] ${
                        accessible ? 'text-amber-400/70' : 'text-red-400/80'
                      }`}
                    >
                      {accessible ? don.prerequisTexte : `🔒 ${don.prerequisTexte}`}
                    </span>
                  )}
                </div>
                <p className="text-stone-400 text-xs mt-0.5">{don.description}</p>
              </button>
            )
          })}
        </div>
      )}

      {(mode === 'plus2' || mode === 'deuxplus1') && (
        <div className="grid grid-cols-3 gap-2 step-anim">
          {STATS.map((s) => {
            const val = perso[s.key]
            const maxed = val >= 20
            const isPicked =
              target1 === s.key || (mode === 'deuxplus1' && target2 === s.key)
            const delta =
              mode === 'plus2' && target1 === s.key
                ? 2
                : mode === 'deuxplus1' && (target1 === s.key || target2 === s.key)
                ? 1
                : 0
            return (
              <button
                key={s.key}
                type="button"
                disabled={maxed && !isPicked}
                onClick={() => {
                  if (mode === 'plus2') {
                    setTarget1(s.key)
                    return
                  }
                  // deuxplus1
                  if (target1 === s.key) {
                    setTarget1(null)
                  } else if (target2 === s.key) {
                    setTarget2(null)
                  } else if (!target1) {
                    setTarget1(s.key)
                  } else if (!target2) {
                    setTarget2(s.key)
                  } else {
                    // Remplacer target2
                    setTarget2(s.key)
                  }
                }}
                className={`rounded p-3 border-2 transition-all text-center disabled:opacity-30 disabled:cursor-not-allowed ${
                  isPicked
                    ? 'border-amber-400 bg-amber-900/30'
                    : 'border-stone-700 hover:border-amber-700/60 bg-stone-900/40'
                }`}
              >
                <div className="text-lg">{s.icon}</div>
                <div className="text-[10px] uppercase tracking-widest text-amber-400/80">
                  {s.abbr}
                </div>
                <div className="text-amber-100 font-bold text-lg">
                  {val}
                  {delta > 0 && (
                    <span className="text-emerald-400 text-xs ml-1">+{delta}</span>
                  )}
                </div>
                {maxed && (
                  <div className="text-[9px] text-red-400 mt-0.5">MAX 20</div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EtapeSorts({
  classePrincipale,
  niveauTotalApres,
  ancienSlots
}: {
  classePrincipale: string | null
  niveauTotalApres: number
  ancienSlots: Record<string, number>
}) {
  const nouveauxSlots = slotsRecommandes(classePrincipale, niveauTotalApres)
  const apprendChoix = apprendSorts(classePrincipale)
  const aDesSlots = Object.keys(nouveauxSlots).length > 0

  const diffs = Object.entries(nouveauxSlots).map(([lvl, n]) => ({
    lvl,
    avant: ancienSlots[lvl] ?? 0,
    apres: n,
    change: n - (ancienSlots[lvl] ?? 0)
  }))

  return (
    <div className="space-y-4">
      <h3 className="text-amber-100 font-serif text-lg">Sorts & emplacements</h3>

      {!aDesSlots ? (
        <p className="text-stone-400 text-sm italic">
          Cette classe ne lance pas de sorts à ce niveau.
        </p>
      ) : (
        <>
          <p className="text-stone-400 text-sm">
            Emplacements mis à jour selon ton niveau total ({niveauTotalApres}) :
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {diffs.map((d) => (
              <div
                key={d.lvl}
                className="rounded p-2 border bg-stone-900/40 text-center"
                style={{ borderColor: 'rgba(201,168,76,0.3)' }}
              >
                <div className="text-[10px] uppercase tracking-widest text-amber-400/70">
                  Niv {d.lvl}
                </div>
                <div className="text-amber-100 font-bold text-lg">
                  {d.avant} → {d.apres}
                </div>
                {d.change > 0 && (
                  <div className="text-emerald-400 text-xs">+{d.change}</div>
                )}
              </div>
            ))}
          </div>
          {apprendChoix && (
            <div
              className="rounded p-3 border text-sm text-amber-200/80"
              style={{
                background: 'rgba(201,168,76,0.08)',
                borderColor: 'rgba(201,168,76,0.3)'
              }}
            >
              📖 Ta classe apprend des sorts choisis. Utilise <b>Attribuer un sort</b>
              {' '}sur ta fiche après confirmation pour ajouter tes nouveaux sorts depuis
              la bibliothèque.
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EtapeRecap({ result }: { result: MonteeResult }) {
  return (
    <div className="space-y-3">
      <h3 className="text-amber-100 font-serif text-lg flex items-center gap-2">
        ✨ Récapitulatif
      </h3>
      <div
        className="rounded-lg p-4 border space-y-2 text-sm"
        style={{
          background:
            'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(180,120,60,0.06))',
          borderColor: 'rgba(201,168,76,0.4)'
        }}
      >
        <RecapLigne
          label="Niveau"
          value={`${result.niveau} ${result.resume.multiclasse ? `(multiclasse : ${result.resume.classeMontee})` : ''}`}
        />
        <RecapLigne
          label="PV"
          value={`+${result.resume.hpGagnes} (${result.resume.detailDe}) — total ${result.hp_max}`}
        />
        {result.resume.sousClasseChoisie && (
          <RecapLigne label="Sous-classe" value={result.resume.sousClasseChoisie} />
        )}
        {result.resume.asi && <RecapLigne label="ASI" value={result.resume.asi} />}
        {result.resume.slotsModifies && result.resume.slotsModifies.length > 0 && (
          <RecapLigne
            label="Emplacements"
            value={result.resume.slotsModifies
              .map((s) => `Niv${s.niveau}: ${s.avant}→${s.apres}`)
              .join(' · ')}
          />
        )}
      </div>
    </div>
  )
}

function RecapLigne({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-widest text-amber-400/80 flex-shrink-0">
        {label}
      </span>
      <span className="text-amber-100 text-right">{value}</span>
    </div>
  )
}
