'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Évènement global : `window.dispatchEvent(new Event('onboarding:open'))`
// pour rouvrir le tutoriel depuis le menu hamburger.
// ============================================================================

const STEPS = 6
type Role = 'mj' | 'joueur'

export default function OnboardingTutorial() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<Role | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [scenarioNom, setScenarioNom] = useState('')
  const [creating, setCreating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // --------------------------------------------------------------------------
  // Détection : ouverture auto si onboarding_complete=false, ou via event
  // --------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      if (cancelled) return
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_complete, role')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (data?.role === 'mj' || data?.role === 'joueur') setRole(data.role)
      if (!data || data.onboarding_complete === false) {
        setOpen(true)
      }
    }
    init()
    const onReopen = () => {
      setStep(0)
      setOpen(true)
    }
    window.addEventListener('onboarding:open', onReopen)
    return () => {
      cancelled = true
      window.removeEventListener('onboarding:open', onReopen)
    }
  }, [])

  // --------------------------------------------------------------------------
  // Sauvegarde finale + fermeture
  // --------------------------------------------------------------------------
  const fermer = useCallback(
    async (markDone: boolean) => {
      setOpen(false)
      if (!userId) return
      if (markDone) {
        // UPDATE (pas UPSERT) : le profil existe déjà à ce stade (créé au
        // signup ou au premier theme/locale fetch). Un UPSERT essaierait
        // d'insérer une ligne sans username et violerait la NOT NULL.
        const patch = {
          onboarding_complete: true,
          ...(role ? { role } : {})
        }
        const { error } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', userId)
        if (error) {
          // PostgrestError n'est pas une vraie Error et se sérialise mal :
          // on log les champs un par un pour avoir une trace exploitable.
          console.error('[onboarding] save :', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          })
        }
      }
    },
    [userId, role]
  )

  const suivant = () => {
    setErrorMsg(null)
    if (step < STEPS - 1) setStep((s) => s + 1)
    else fermer(true)
  }
  const precedent = () => {
    setErrorMsg(null)
    if (step > 0) setStep((s) => s - 1)
  }

  // --------------------------------------------------------------------------
  // Étape 5 : création directe d'un scénario depuis le tuto
  // --------------------------------------------------------------------------
  const creerScenarioRapide = async () => {
    setErrorMsg(null)
    const nom = scenarioNom.trim()
    if (!nom) {
      setErrorMsg('Choisis un nom pour ton scénario.')
      return
    }
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCreating(false)
      setErrorMsg('Session expirée.')
      return
    }
    const { error } = await supabase
      .from('scenarios')
      .insert({ nom, mj_id: user.id })
    setCreating(false)
    if (error) {
      console.error('[onboarding] create scenario :', error)
      setErrorMsg(error.message)
      return
    }
    setScenarioNom('')
    setStep(STEPS - 1)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Tutoriel de bienvenue"
    >
      <div
        className="w-full max-w-2xl max-h-[95vh] flex flex-col rounded-xl shadow-2xl bg-gray-900 theme-no-deco overflow-hidden"
        style={{ border: '1px solid rgba(201,168,76,0.4)' }}
      >
        {/* Progress */}
        <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 flex-1">
            {Array.from({ length: STEPS }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full transition-all"
                style={{
                  background:
                    i <= step ? '#C9A84C' : 'rgba(201,168,76,0.15)'
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => fermer(true)}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 whitespace-nowrap"
            title="Passer le tutoriel"
          >
            Passer →
          </button>
        </div>

        {/* Contenu de l'étape */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 [scrollbar-width:thin]">
          {step === 0 && (
            <StepWelcome role={role} onChange={setRole} />
          )}
          {step === 1 && <StepForge role={role} />}
          {step === 2 && <StepAdventure role={role} />}
          {step === 3 && <StepShortcuts />}
          {step === 4 && (
            <StepCreate
              role={role}
              nom={scenarioNom}
              onChange={setScenarioNom}
              onCreate={creerScenarioRapide}
              creating={creating}
              errorMsg={errorMsg}
            />
          )}
          {step === 5 && <StepLibrary />}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-700 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={precedent}
            disabled={step === 0}
            className="px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Précédent
          </button>
          <span className="text-xs text-gray-500">
            Étape {step + 1} / {STEPS}
          </span>
          {step === STEPS - 1 ? (
            <button
              type="button"
              onClick={async () => {
                await fermer(true)
                // Roadmap correctif — atterrir sur le dashboard (accueil),
                // pas la bibliothèque : l'utilisateur explore à son rythme.
                router.push('/dashboard')
              }}
              className="px-4 py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 text-sm"
            >
              Commencer 🚀
            </button>
          ) : (
            <button
              type="button"
              onClick={suivant}
              disabled={step === 0 && !role}
              className="px-4 py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 text-sm disabled:opacity-50"
            >
              Suivant →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Étapes
// ============================================================================

function StepHeader({ title, icone, sub }: { title: string; icone: string; sub?: string }) {
  return (
    <header className="mb-5">
      <div className="text-5xl mb-3" aria-hidden="true">{icone}</div>
      <h2 className="text-2xl font-bold text-yellow-500 mb-1">{title}</h2>
      {sub && <p className="text-sm text-gray-400">{sub}</p>}
    </header>
  )
}

function StepWelcome({
  role,
  onChange
}: {
  role: Role | null
  onChange: (r: Role) => void
}) {
  return (
    <div>
      <StepHeader
        icone="🎲"
        title="Bienvenue dans la Forge !"
        sub="Un compagnon pour tes campagnes de D&D : scénarios, combats, PNJ, dés, et plus."
      />
      <p className="text-gray-300 mb-4 text-sm leading-relaxed">
        Avant de commencer, dis-nous comment tu utilises l&apos;appli — on
        adaptera l&apos;interface en conséquence (tu pourras changer à tout moment
        via l&apos;onglet MJ / Joueur).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <RoleCard
          actif={role === 'mj'}
          onClick={() => onChange('mj')}
          icone="🧙"
          titre="Maître du Jeu"
          desc="Je crée des scénarios, gère des combats, anime des PNJ."
        />
        <RoleCard
          actif={role === 'joueur'}
          onClick={() => onChange('joueur')}
          icone="🎭"
          titre="Joueur"
          desc="Je joue un personnage et rejoins des campagnes via un code."
        />
      </div>
    </div>
  )
}

function RoleCard({
  actif,
  onClick,
  icone,
  titre,
  desc
}: {
  actif: boolean
  onClick: () => void
  icone: string
  titre: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-lg border-2 transition ${
        actif
          ? 'border-yellow-500 bg-yellow-500/10'
          : 'border-gray-700 bg-gray-800 hover:border-yellow-600/60'
      }`}
    >
      <div className="text-3xl mb-2">{icone}</div>
      <h3 className="text-base font-bold text-white">{titre}</h3>
      <p className="text-xs text-gray-400 mt-1">{desc}</p>
    </button>
  )
}

function StepForge({ role }: { role: Role | null }) {
  return (
    <div>
      <StepHeader
        icone="⚒️"
        title="La Forge"
        sub={
          role === 'joueur'
            ? "Côté Joueur, tu peux créer tes personnages et préparer tes sorts."
            : "L'atelier où tu crées tout le contenu de ta campagne."
        }
      />
      <ul className="space-y-3 text-sm">
        <ForgeItem icone="📖" titre="Scénarios">
          Crée des scénarios avec chapitres imbriqués (Notion-style), notes de
          session et carte mentale.
        </ForgeItem>
        <ForgeItem icone="🎭" titre="Personnages">
          Fiche complète D&D 5e : stats, classes multiples, sorts, équipement,
          jets de sauvegarde de mort, etc.
        </ForgeItem>
        <ForgeItem icone="👹" titre="Ennemis & 🧑 PNJ">
          Bestiaire D&D et templates de PNJ prêts à importer. Lie-les aux
          chapitres de tes scénarios.
        </ForgeItem>
        <ForgeItem icone="🎒" titre="Items & 🗺️ Cartes">
          Inventaire d&apos;objets magiques + éditeur de cartes par tuiles.
        </ForgeItem>
      </ul>
    </div>
  )
}

function ForgeItem({
  icone,
  titre,
  children
}: {
  icone: string
  titre: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span className="text-2xl flex-shrink-0">{icone}</span>
      <div>
        <p className="font-bold text-white">{titre}</p>
        <p className="text-gray-400 text-xs">{children}</p>
      </div>
    </li>
  )
}

function StepAdventure({ role }: { role: Role | null }) {
  return (
    <div>
      <StepHeader
        icone="⚔️"
        title="Le Mode Aventure"
        sub={
          role === 'joueur'
            ? "Tu participes aux combats lancés par ton MJ et explore les chapitres."
            : "Là où ça se joue : combat tour par tour, exploration, dés."
        }
      />
      <ul className="space-y-3 text-sm">
        <ForgeItem icone="⚔️" titre="Combat tour par tour">
          Initiative auto, dégâts, conditions, jets de sauvegarde de mort,
          réactions, actions bonus — tout est suivi.
        </ForgeItem>
        <ForgeItem icone="🧭" titre="Exploration">
          Parcours les chapitres de ton scénario actif et révèle des cartes au
          fur et à mesure.
        </ForgeItem>
        <ForgeItem icone="🎯" titre="Quêtes & objectifs">
          Crée des quêtes (principales/secondaires) avec récompenses XP — l&apos;XP
          est distribuée automatiquement à la fin.
        </ForgeItem>
        <ForgeItem icone="📓" titre="Journal de campagne">
          Note tes sessions sous forme de timeline avec tags et statistiques.
        </ForgeItem>
      </ul>
    </div>
  )
}

function StepShortcuts() {
  return (
    <div>
      <StepHeader
        icone="🎲"
        title="Dés et raccourcis"
        sub="Lance des dés depuis n&apos;importe quelle page et navigue à la vitesse de la pensée."
      />
      <div className="space-y-3">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <p className="text-yellow-500 font-bold text-sm mb-1">🎲 Lanceur de dés</p>
          <p className="text-gray-400 text-xs">
            Bouton flottant en bas à droite de chaque page. Supporte d4/d6/d8/d10/d12/d20,
            avantage/désavantage sur d20, et garde un historique complet de tes jets.
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <p className="text-yellow-500 font-bold text-sm mb-1">
            ⌘K / Ctrl+K — Palette de commandes
          </p>
          <p className="text-gray-400 text-xs">
            Recherche n&apos;importe quel personnage, scénario, ennemi… et navigue
            instantanément. Aussi accessible via l&apos;icône 🔎 du header.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900 border border-gray-600 text-gray-300 font-mono">
              Ctrl
            </kbd>
            <span className="text-gray-600 text-xs">+</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900 border border-gray-600 text-gray-300 font-mono">
              K
            </kbd>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <p className="text-yellow-500 font-bold text-sm mb-1">⭐ Favoris</p>
          <p className="text-gray-400 text-xs">
            Clique sur l&apos;étoile d&apos;un élément pour l&apos;épingler — il apparaîtra
            en haut de ton dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}

function StepCreate({
  role,
  nom,
  onChange,
  onCreate,
  creating,
  errorMsg
}: {
  role: Role | null
  nom: string
  onChange: (v: string) => void
  onCreate: () => Promise<void> | void
  creating: boolean
  errorMsg: string | null
}) {
  if (role === 'joueur') {
    return (
      <div>
        <StepHeader
          icone="🤝"
          title="Rejoindre un scénario"
          sub="Tu joueras dans des scénarios créés par un MJ."
        />
        <p className="text-gray-300 text-sm mb-3">
          Demande à ton MJ un <strong>code d&apos;invitation</strong> (format{' '}
          <code className="inline-block align-middle whitespace-nowrap mx-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono text-[var(--theme-accent,#C9A84C)] bg-[var(--theme-bg-secondary,#0f1115)] border border-[var(--theme-border,rgba(255,255,255,0.08))]">
            DND-XXXXXX
          </code>
          ) puis colle-le dans le menu hamburger → « Rejoindre un scénario ».
        </p>
        <p className="text-gray-400 text-xs">
          Tu pourras ensuite créer ton personnage dans la Forge et le lier au
          scénario.
        </p>
      </div>
    )
  }

  return (
    <div>
      <StepHeader
        icone="📖"
        title="Crée ton premier scénario"
        sub="Tu peux le faire directement ici. Tu pourras y ajouter chapitres et PNJ ensuite."
      />
      <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
        Nom du scénario
      </label>
      <input
        type="text"
        value={nom}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Le Donjon du Dragon Noir…"
        className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700 outline-none focus:border-yellow-500"
        autoFocus
      />
      {errorMsg && (
        <p className="text-red-400 text-xs mt-2">{errorMsg}</p>
      )}
      <button
        type="button"
        onClick={onCreate}
        disabled={creating}
        className="mt-3 w-full p-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 disabled:opacity-50"
      >
        {creating ? 'Création…' : '✨ Créer le scénario'}
      </button>
      <p className="text-gray-500 text-xs mt-3 italic">
        Tu peux aussi passer cette étape et créer plus tard depuis la Forge.
      </p>
    </div>
  )
}

function StepLibrary() {
  return (
    <div>
      <StepHeader
        icone="📚"
        title="Bibliothèque communautaire"
        sub="Tu n&apos;es jamais seul : importe et partage du contenu."
      />
      <ul className="space-y-3 text-sm">
        <ForgeItem icone="🐉" titre="Bestiaire D&D">
          Plus de 100 monstres officiels prêts à utiliser — clic et import.
        </ForgeItem>
        <ForgeItem icone="✨" titre="Sorts D&D 5e">
          Les sorts du SRD avec descriptions, niveaux, écoles, composantes.
        </ForgeItem>
        <ForgeItem icone="🧑" titre="Templates de PNJ">
          Garde-corps, marchands, nobles, brigands — des archétypes prêts à
          adapter.
        </ForgeItem>
        <ForgeItem icone="🌍" titre="Partage communautaire">
          Rends un personnage, scénario, item ou map <strong>public</strong> pour
          que d&apos;autres MJ puissent le copier.
        </ForgeItem>
      </ul>
      <p className="text-gray-300 text-sm mt-5 italic text-center">
        Que les dés te soient favorables. 🎲
      </p>
    </div>
  )
}
