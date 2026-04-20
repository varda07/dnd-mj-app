'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Combat from './combat/page'
import {
  THEMES,
  THEME_KEYS,
  DEFAULT_THEME,
  PREMIUM_THEMES,
  applyTheme,
  type ThemeKey
} from '@/app/styles/themes'

type ScenarioLite = { id: string; nom: string }
type PersoLite = {
  id: string
  nom: string
  classe: string | null
  niveau: number
  hp_actuel: number
  hp_max: number
  image_url: string | null
  scenario_id: string | null
}

export default function Dashboard() {
  const [interface_, setInterface] = useState<'mj' | 'joueur'>('mj')
  const [modeMJ, setModeMJ] = useState<'travail' | 'action'>('travail')
  const [userId, setUserId] = useState('')
  const [scenariosMj, setScenariosMj] = useState<ScenarioLite[]>([])
  const [scenarioCibleId, setScenarioCibleId] = useState('')
  const [codePersonnage, setCodePersonnage] = useState('')
  const [messageMj, setMessageMj] = useState('')
  const [scenariosRejoints, setScenariosRejoints] = useState<ScenarioLite[]>([])
  const [codeScenario, setCodeScenario] = useState('')
  const [messageJoueur, setMessageJoueur] = useState('')
  const [personnagesJoueurs, setPersonnagesJoueurs] = useState<PersoLite[]>([])
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [themeOuvert, setThemeOuvert] = useState(false)
  const [rejoindreOuvert, setRejoindreOuvert] = useState(false)
  const [personnagesOuvert, setPersonnagesOuvert] = useState(false)
  const [themeActuel, setThemeActuel] = useState<ThemeKey>(DEFAULT_THEME)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', user.id)
        .maybeSingle()
      const raw = data?.theme as string | undefined
      if (raw && raw in THEMES) setThemeActuel(raw as ThemeKey)
    }
    load()
  }, [])

  const changerTheme = async (key: ThemeKey) => {
    applyTheme(key)
    setThemeActuel(key)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existing, error: selectError } = await supabase
      .from('profiles')
      .select('username, role')
      .eq('id', user.id)
      .maybeSingle()
    if (selectError) {
      console.error('[theme] lecture profil échec :', selectError)
    }

    const username =
      (existing?.username as string | undefined) ?? user.email ?? user.id
    const role = (existing?.role as string | undefined) ?? 'joueur'

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username, role, theme: key })
    if (error) {
      console.error('[theme] sauvegarde échec :', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        payload: { id: user.id, username, role, theme: key }
      })
    }
  }

  useEffect(() => {
    if (!menuOuvert) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOuvert(false)
        setThemeOuvert(false)
        setRejoindreOuvert(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOuvert])

  const fetchPersonnagesJoueurs = async (scenarioIds: string[]) => {
    if (scenarioIds.length === 0) {
      setPersonnagesJoueurs([])
      return
    }
    const { data } = await supabase
      .from('personnages')
      .select('id, nom, classe, niveau, hp_actuel, hp_max, image_url, scenario_id')
      .in('scenario_id', scenarioIds)
      .order('nom')
    if (data) setPersonnagesJoueurs(data)
  }

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/')
        return
      }
      setUserId(data.user.id)
      const [{ data: mine }, { data: joined }] = await Promise.all([
        supabase.from('scenarios').select('id, nom').eq('mj_id', data.user.id).order('nom'),
        supabase
          .from('scenarios_joueurs')
          .select('scenario:scenarios(id, nom)')
          .eq('joueur_id', data.user.id)
      ])
      if (mine) {
        setScenariosMj(mine)
        fetchPersonnagesJoueurs(mine.map((s) => s.id))
      }
      if (joined) {
        const list = joined
          .map((r: { scenario: ScenarioLite | ScenarioLite[] | null }) =>
            Array.isArray(r.scenario) ? r.scenario[0] : r.scenario
          )
          .filter((s): s is ScenarioLite => !!s)
        setScenariosRejoints(list)
      }
    }
    init()
  }, [])

  const ajouterPersonnageAuScenario = async () => {
    setMessageMj('')
    const code = codePersonnage.trim().toUpperCase()
    if (!code) return setMessageMj('Entre un code.')
    if (!scenarioCibleId) return setMessageMj('Choisis un scénario cible.')

    const { data: invit, error: err1 } = await supabase
      .from('codes_invitation')
      .select('id, personnage_id, utilise')
      .eq('code', code)
      .maybeSingle()
    if (err1 || !invit) return setMessageMj('Code introuvable.')
    if (invit.utilise) return setMessageMj('Ce code a déjà été utilisé.')
    if (!invit.personnage_id) return setMessageMj("Ce code n'est pas un code de personnage.")

    const { error: err2 } = await supabase
      .from('personnages')
      .update({ scenario_id: scenarioCibleId })
      .eq('id', invit.personnage_id)
    if (err2) return setMessageMj('Impossible de lier le personnage : ' + err2.message)

    await supabase.from('codes_invitation').update({ utilise: true }).eq('id', invit.id)

    setMessageMj('✓ Personnage ajouté au scénario !')
    setCodePersonnage('')
    fetchPersonnagesJoueurs(scenariosMj.map((s) => s.id))
  }

  const quitterScenario = async (scenarioId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir quitter ce scénario ?')) return
    const { error } = await supabase
      .from('scenarios_joueurs')
      .delete()
      .eq('scenario_id', scenarioId)
      .eq('joueur_id', userId)
    if (error) {
      setMessageJoueur('Impossible de quitter : ' + error.message)
      return
    }
    setScenariosRejoints((prev) => prev.filter((s) => s.id !== scenarioId))
  }

  const rejoindreScenario = async () => {
    setMessageJoueur('')
    const code = codeScenario.trim().toUpperCase()
    if (!code) return setMessageJoueur('Entre un code.')

    const { data: invit, error: err1 } = await supabase
      .from('codes_invitation')
      .select('id, scenario_id, utilise')
      .eq('code', code)
      .maybeSingle()
    if (err1 || !invit) return setMessageJoueur('Code introuvable.')
    if (invit.utilise) return setMessageJoueur('Ce code a déjà été utilisé.')
    if (!invit.scenario_id) return setMessageJoueur("Ce code n'est pas un code de scénario.")

    const { error: err2 } = await supabase
      .from('scenarios_joueurs')
      .insert({ scenario_id: invit.scenario_id, joueur_id: userId })
    if (err2 && !err2.message.toLowerCase().includes('duplicate')) {
      return setMessageJoueur('Impossible de rejoindre : ' + err2.message)
    }

    await supabase.from('codes_invitation').update({ utilise: true }).eq('id', invit.id)

    const { data: scenario } = await supabase
      .from('scenarios')
      .select('id, nom')
      .eq('id', invit.scenario_id)
      .maybeSingle()

    if (scenario) {
      setScenariosRejoints((prev) =>
        prev.some((s) => s.id === scenario.id) ? prev : [...prev, scenario]
      )
      setMessageJoueur(`✓ Rejoint : ${scenario.nom}`)
    } else {
      setMessageJoueur('✓ Rejoint.')
    }
    setCodeScenario('')
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-3 sm:p-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-gray-700 theme-header-border theme-no-deco">
        <div className="min-w-0 justify-self-start">
          <h1 className="text-base sm:text-xl font-bold text-yellow-500 truncate text-center sm:text-left">
            D&D MANAGER
          </h1>
          <p
            className="text-[11px] uppercase text-center sm:text-left truncate mt-0.5 italic"
            style={{
              color: THEMES[themeActuel].colors.accent_color,
              opacity: 0.75,
              fontFamily: 'var(--font-cinzel), Cinzel, serif',
              letterSpacing: '0.25em',
              textShadow: `0 0 6px ${THEMES[themeActuel].colors.accent_color}66`
            }}
          >
            {THEMES[themeActuel].slogan}
          </p>
          {themeActuel === 'royal' && (
            <div
              className="flex justify-center mt-2"
              style={{
                background: '#030100',
                boxShadow: 'inset 0 0 24px rgba(0,0,0,0.95)',
                borderRadius: '4px',
                padding: '6px 10px',
                width: 'fit-content',
                margin: '8px auto 0'
              }}
            >
              <svg
                viewBox="0 0 200 80"
                width="120"
                aria-label="Yeux de dragon royal"
              >
                <style>{`
                  .royal-eye {
                    transform-box: fill-box;
                    transform-origin: center;
                    animation: royal-eye-blink 4.5s infinite ease-in-out;
                  }
                  .royal-iris-wrap {
                    transform-box: fill-box;
                    transform-origin: center;
                    animation: royal-eye-scan 6s infinite ease-in-out;
                  }
                  .royal-iris-inner {
                    animation: royal-iris-pulse 3s infinite ease-in-out;
                  }
                  @keyframes royal-eye-blink {
                    0%, 88%, 100% { transform: scaleY(1); }
                    92% { transform: scaleY(0.05); }
                    96% { transform: scaleY(0.05); }
                  }
                  @keyframes royal-eye-scan {
                    0%, 100% { transform: translateX(0); }
                    30% { transform: translateX(-1.5px); }
                    70% { transform: translateX(1.5px); }
                  }
                  @keyframes royal-iris-pulse {
                    0%, 100% { opacity: 0.88; }
                    50% { opacity: 1; }
                  }
                `}</style>

                <defs>
                  <radialGradient id="royal-iris-left" cx="0.5" cy="0.5" r="0.55">
                    <stop offset="0%" stopColor="#ff2200" />
                    <stop offset="25%" stopColor="#cc1100" />
                    <stop offset="55%" stopColor="#880000" />
                    <stop offset="80%" stopColor="#330000" />
                    <stop offset="100%" stopColor="#0a0000" />
                  </radialGradient>
                  <radialGradient id="royal-iris-right" cx="0.5" cy="0.5" r="0.55">
                    <stop offset="0%" stopColor="#ff2200" />
                    <stop offset="25%" stopColor="#cc1100" />
                    <stop offset="55%" stopColor="#880000" />
                    <stop offset="80%" stopColor="#330000" />
                    <stop offset="100%" stopColor="#0a0000" />
                  </radialGradient>
                  <clipPath id="royal-eye-clip-left">
                    <path d="M 32 38 Q 38 28 48 26 Q 70 30 86 46 Q 72 54 52 54 Q 36 48 32 38 Z" />
                  </clipPath>
                  <clipPath id="royal-eye-clip-right">
                    <path d="M 168 38 Q 162 28 152 26 Q 130 30 114 46 Q 128 54 148 54 Q 164 48 168 38 Z" />
                  </clipPath>
                </defs>

                {/* Fond sombre */}
                <rect x="0" y="0" width="200" height="80" fill="#030100" />

                {/* ŒIL GAUCHE */}
                <g className="royal-eye">
                  {/* Socle noir sous l'iris */}
                  <path
                    d="M 32 38 Q 38 28 48 26 Q 70 30 86 46 Q 72 54 52 54 Q 36 48 32 38 Z"
                    fill="#0a0000"
                  />
                  <g clipPath="url(#royal-eye-clip-left)">
                    <g className="royal-iris-wrap">
                      <circle
                        cx="60"
                        cy="40"
                        r="14"
                        fill="url(#royal-iris-left)"
                        className="royal-iris-inner"
                      />
                      {/* Veines fines rouges */}
                      <g stroke="#ff2200" strokeWidth="0.25" fill="none" opacity="0.55">
                        <path d="M 50 34 Q 53 38 52 42" />
                        <path d="M 68 34 Q 69 39 68 42" />
                        <path d="M 52 46 Q 56 44 56 48" />
                        <path d="M 66 46 Q 68 44 70 47" />
                        <path d="M 48 40 Q 52 42 50 44" />
                      </g>
                      {/* Pupille fendue verticale */}
                      <ellipse cx="60" cy="40" rx="1.2" ry="11" fill="#000" />
                      {/* Reflet orange haut-gauche */}
                      <ellipse cx="55" cy="35" rx="2.2" ry="1.4" fill="#ff8844" opacity="0.82" />
                    </g>
                  </g>
                  {/* Contour de la paupière */}
                  <path
                    d="M 32 38 Q 38 28 48 26 Q 70 30 86 46 Q 72 54 52 54 Q 36 48 32 38 Z"
                    fill="none"
                    stroke="#3a0000"
                    strokeWidth="0.4"
                  />
                </g>

                {/* ŒIL DROIT (miroir) */}
                <g className="royal-eye">
                  <path
                    d="M 168 38 Q 162 28 152 26 Q 130 30 114 46 Q 128 54 148 54 Q 164 48 168 38 Z"
                    fill="#0a0000"
                  />
                  <g clipPath="url(#royal-eye-clip-right)">
                    <g className="royal-iris-wrap">
                      <circle
                        cx="140"
                        cy="40"
                        r="14"
                        fill="url(#royal-iris-right)"
                        className="royal-iris-inner"
                      />
                      <g stroke="#ff2200" strokeWidth="0.25" fill="none" opacity="0.55">
                        <path d="M 130 34 Q 133 38 132 42" />
                        <path d="M 148 34 Q 149 39 148 42" />
                        <path d="M 132 46 Q 136 44 136 48" />
                        <path d="M 146 46 Q 148 44 150 47" />
                        <path d="M 128 40 Q 132 42 130 44" />
                      </g>
                      <ellipse cx="140" cy="40" rx="1.2" ry="11" fill="#000" />
                      <ellipse cx="135" cy="35" rx="2.2" ry="1.4" fill="#ff8844" opacity="0.82" />
                    </g>
                  </g>
                  <path
                    d="M 168 38 Q 162 28 152 26 Q 130 30 114 46 Q 128 54 148 54 Q 164 48 168 38 Z"
                    fill="none"
                    stroke="#3a0000"
                    strokeWidth="0.4"
                  />
                </g>
              </svg>
            </div>
          )}
        </div>
        <div className="flex bg-gray-700 rounded-lg p-1 justify-self-center">
          <button type="button" onClick={() => setInterface('mj')} className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm sm:text-base font-bold transition ${interface_ === 'mj' ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'}`}>
            MJ
          </button>
          <button type="button" onClick={() => setInterface('joueur')} className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm sm:text-base font-bold transition ${interface_ === 'joueur' ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'}`}>
            Joueur
          </button>
        </div>
        <div className="relative justify-self-end" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOuvert((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOuvert}
            className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 rounded transition text-2xl leading-none"
          >
            ☰
          </button>
          {menuOuvert && (
            <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden theme-no-deco">
              <button
                type="button"
                onClick={() => {
                  setMenuOuvert(false)
                  setThemeOuvert(false)
                  setRejoindreOuvert(false)
                  router.push('/dashboard/bibliotheque')
                }}
                className="w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition flex items-center gap-2 text-sm"
              >
                📚 Bibliothèque
              </button>
              <div className="border-t border-gray-700" />
              <button
                type="button"
                onClick={() => setRejoindreOuvert((v) => !v)}
                className="w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition flex items-center justify-between gap-2 text-sm"
                aria-expanded={rejoindreOuvert}
              >
                <span>🎟️ Rejoindre un scénario</span>
                <span className="text-xs text-gray-500">{rejoindreOuvert ? '▾' : '▸'}</span>
              </button>
              {rejoindreOuvert && (
                <div className="bg-gray-900/50 border-t border-gray-700 p-3 space-y-2">
                  <p className="text-gray-400 text-xs">
                    Entre le code d&apos;invitation donné par ton MJ.
                  </p>
                  <input
                    type="text"
                    value={codeScenario}
                    onChange={(e) => setCodeScenario(e.target.value)}
                    placeholder="DND-XXXXXX"
                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 outline-none font-mono uppercase text-sm"
                  />
                  <button
                    type="button"
                    onClick={rejoindreScenario}
                    className="w-full px-3 py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 text-sm"
                  >
                    Rejoindre
                  </button>
                  {messageJoueur && (
                    <p className="text-yellow-400 text-xs">{messageJoueur}</p>
                  )}
                </div>
              )}
              <div className="border-t border-gray-700" />
              <button
                type="button"
                onClick={() => setThemeOuvert((v) => !v)}
                className="w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition flex items-center justify-between gap-2 text-sm"
                aria-expanded={themeOuvert}
              >
                <span className="flex items-center gap-2">🎨 Thème</span>
                <span className="text-xs text-gray-500">
                  {THEMES[themeActuel].label} {themeOuvert ? '▾' : '▸'}
                </span>
              </button>
              {themeOuvert && (
                <div className="bg-gray-900/50 border-t border-gray-700 p-2 space-y-1 max-h-80 overflow-y-auto">
                  {THEME_KEYS.map((key) => {
                    const t = THEMES[key]
                    const actif = themeActuel === key
                    const premium = PREMIUM_THEMES.includes(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => changerTheme(key)}
                        className={`w-full flex items-center gap-3 p-2 rounded transition text-left ${
                          actif ? 'bg-gray-700' : 'hover:bg-gray-700/60'
                        } ${premium ? 'ring-1 ring-yellow-600/40' : ''}`}
                      >
                        <div
                          className="flex flex-shrink-0 rounded overflow-hidden"
                          style={{ border: `1px solid ${t.colors.border_color}` }}
                        >
                          <span
                            className="block w-4 h-10"
                            style={{ backgroundColor: t.colors.bg_primary }}
                          />
                          <span
                            className="block w-4 h-10"
                            style={{ backgroundColor: t.colors.bg_secondary }}
                          />
                          <span
                            className="block w-4 h-10"
                            style={{ backgroundColor: t.colors.accent_color }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-bold truncate ${
                              actif ? 'text-white' : 'text-gray-200'
                            }`}
                          >
                            {premium && <span className="mr-1">👑</span>}
                            {t.label}
                            {premium && (
                              <span className="ml-1 text-[10px] font-bold tracking-wide text-yellow-500">
                                — Premium
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {t.description}
                          </p>
                          <p
                            className="text-[10px] font-bold tracking-wider truncate mt-0.5"
                            style={{ color: t.colors.accent_color }}
                          >
                            « {t.slogan} »
                          </p>
                        </div>
                        {actif && (
                          <span className="text-green-400 text-sm flex-shrink-0">
                            ✓
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="border-t border-gray-700" />
              <button
                type="button"
                onClick={async () => {
                  setMenuOuvert(false)
                  setThemeOuvert(false)
                  await supabase.auth.signOut()
                  router.push('/')
                }}
                className="w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition flex items-center gap-2 text-sm"
              >
                🚪 Déconnexion
              </button>
            </div>
          )}
        </div>
        <div className="theme-header-glow" />
      </div>

      {interface_ === 'mj' && (
        <div>
          <div className="bg-gray-800 border-b border-gray-700 p-3 flex justify-center gap-4 theme-no-deco">
            <button type="button" onClick={() => setModeMJ('travail')} className={`px-6 py-2 rounded-lg font-bold transition ${modeMJ === 'travail' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              📜 Forge
            </button>
            <button type="button" onClick={() => setModeMJ('action')} className={`px-6 py-2 rounded-lg font-bold transition ${modeMJ === 'action' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              🗡️ Aventure
            </button>
          </div>
          <div className="p-6">
            {personnagesJoueurs.length > 0 && (
              <div className="bg-gray-800 rounded-lg mb-6 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPersonnagesOuvert((v) => !v)}
                  aria-expanded={personnagesOuvert}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition text-left"
                >
                  <h3 className="text-lg font-bold text-yellow-500">
                    🧙 Personnages des joueurs ({personnagesJoueurs.length})
                  </h3>
                  <span
                    className={`text-yellow-500 text-sm transition-transform duration-300 ${
                      personnagesOuvert ? 'rotate-180' : ''
                    }`}
                  >
                    ▾
                  </span>
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                  style={{ gridTemplateRows: personnagesOuvert ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 pt-0">
                      {personnagesJoueurs.map((p) => {
                        const scenario = scenariosMj.find((s) => s.id === p.scenario_id)
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => router.push(`/dashboard/personnages/${p.id}`)}
                            className="w-full flex items-center gap-3 bg-gray-900/50 border border-gray-700 rounded-lg p-3 hover:bg-gray-700/50 hover:border-yellow-600 transition text-left overflow-hidden"
                            title={`Ouvrir la fiche de ${p.nom}`}
                          >
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.nom}
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-400 flex-shrink-0 bg-gray-900"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white flex-shrink-0">
                                {p.nom.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-white font-bold truncate">{p.nom}</p>
                              <p className="text-gray-400 text-xs truncate">
                                {[p.classe, `Niv. ${p.niveau}`].filter(Boolean).join(' · ')}
                              </p>
                              <p className="text-gray-500 text-xs truncate">
                                ❤️ {p.hp_actuel}/{p.hp_max}
                                {scenario && <span className="ml-2">📖 {scenario.nom}</span>}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {modeMJ === 'travail' && (
              <div>
                <h2 className="text-2xl font-bold text-blue-400 mb-4">📜 Forge</h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button type="button" onClick={() => router.push('/dashboard/scenarios')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left">
                    <h3 className="text-lg font-bold text-yellow-500">Scenarios</h3>
                    <p className="text-gray-400 text-sm mt-1">Creer et gerer tes scenarios</p>
                  </button>
                  <button type="button" onClick={() => router.push('/dashboard/ennemis')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left">
                    <h3 className="text-lg font-bold text-yellow-500">Ennemis</h3>
                    <p className="text-gray-400 text-sm mt-1">Creer et gerer tes ennemis</p>
                  </button>
                  <button type="button" onClick={() => router.push('/dashboard/items')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left">
                    <h3 className="text-lg font-bold text-yellow-500">Items</h3>
                    <p className="text-gray-400 text-sm mt-1">Creer et gerer tes items</p>
                  </button>
                  <button type="button" onClick={() => router.push('/dashboard/maps')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left">
                    <h3 className="text-lg font-bold text-yellow-500">Maps</h3>
                    <p className="text-gray-400 text-sm mt-1">Gerer tes cartes</p>
                  </button>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-yellow-500 mb-2">🎟️ Ajouter un personnage joueur</h3>
                  <p className="text-gray-400 text-sm mb-3">
                    Entre le code partagé par un joueur pour rattacher son personnage à l&apos;un de tes scénarios.
                  </p>
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      type="text"
                      value={codePersonnage}
                      onChange={(e) => setCodePersonnage(e.target.value)}
                      placeholder="DND-XXXXXX"
                      className="flex-1 p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none font-mono uppercase"
                    />
                    <select
                      value={scenarioCibleId}
                      onChange={(e) => setScenarioCibleId(e.target.value)}
                      className="flex-1 p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
                    >
                      <option value="">— Choisir un scénario cible —</option>
                      {scenariosMj.map((s) => (
                        <option key={s.id} value={s.id}>{s.nom}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={ajouterPersonnageAuScenario}
                      className="px-4 py-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400"
                    >
                      Ajouter
                    </button>
                  </div>
                  {messageMj && <p className="text-yellow-400 text-sm mt-2">{messageMj}</p>}
                </div>
              </div>
            )}
            {modeMJ === 'action' && (
              <Combat />
            )}
          </div>
        </div>
      )}

      {interface_ === 'joueur' && (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-yellow-500 mb-4">Interface Joueur</h2>
          <p className="text-gray-400 mb-4">Bienvenue Aventurier !</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button type="button" onClick={() => router.push('/dashboard/personnages')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left">
              <h3 className="text-lg font-bold text-yellow-500">Personnages</h3>
              <p className="text-gray-400 text-sm mt-1">Gerer tes personnages</p>
            </button>
            <button type="button" onClick={() => router.push('/dashboard/sorts')} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition text-left">
              <h3 className="text-lg font-bold text-yellow-500">Sorts</h3>
              <p className="text-gray-400 text-sm mt-1">Gerer tes sorts</p>
            </button>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-yellow-500 mb-2">📜 Scénarios rejoints</h3>
            {scenariosRejoints.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun scénario rejoint pour l&apos;instant.</p>
            ) : (
              <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2 [scrollbar-width:thin]">
                {scenariosRejoints.map((s) => (
                  <li
                    key={s.id}
                    className="snap-start flex-shrink-0 w-64 p-4 rounded-lg bg-gray-900/50 border border-gray-700 text-white flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-xl flex-shrink-0">📖</span>
                      <span className="font-bold truncate">{s.nom}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitterScenario(s.id)}
                      className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded hover:bg-red-500 transition self-end"
                    >
                      Quitter
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  )
}