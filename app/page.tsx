'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { supabase } from '../lib/supabase'

type Mode = 'landing' | 'login' | 'signup'

export default function Home() {
  const [mode, setMode] = useState<Mode>('landing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const t = useTranslations('login')

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else window.location.href = '/dashboard'
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: nom.trim() ? { username: nom.trim() } : undefined
      }
    })
    if (error) {
      console.error('[auth] signUp erreur complète :', {
        message: error.message,
        name: error.name,
        status: error.status,
        code: (error as { code?: string }).code,
        cause: (error as { cause?: unknown }).cause,
        stack: error.stack,
        raw: error
      })
      setMessage(t('signup_error', { message: error.message }))
    } else {
      // Si l'inscription a immédiatement renvoyé une session (confirm email
      // désactivé côté Supabase), bascule directement sur le dashboard.
      if (data.session) {
        window.location.href = '/dashboard'
        return
      }
      setMessage(t('account_created'))
    }
    setLoading(false)
  }

  const resetForm = () => {
    setMessage('')
    setEmail('')
    setPassword('')
    setNom('')
  }

  return (
    <main className="codex-root min-h-screen flex items-center justify-center px-4 sm:px-8 py-10 overflow-x-hidden relative">
      <style>{`
        .codex-root {
          background-color: #050608;
          color: #e8e8ec;
          font-family: var(--font-inter), 'Inter', system-ui, -apple-system, sans-serif;
          background-image:
            radial-gradient(ellipse at 50% 35%, rgba(201, 168, 76, 0.10) 0%, transparent 55%),
            radial-gradient(ellipse at 0% 80%, rgba(91, 33, 182, 0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 20%, rgba(139, 0, 0, 0.10) 0%, transparent 50%);
        }

        /* Cadre fin doré à 14px des bords intérieurs */
        .codex-frame {
          position: fixed;
          inset: 14px;
          border: 1px solid rgba(201, 168, 76, 0.10);
          border-radius: 4px;
          pointer-events: none;
          z-index: 0;
        }

        .codex-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 560px;
          text-align: center;
        }

        .codex-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-weight: 300;
          font-size: 26px;
          letter-spacing: 0.1em;
          color: #C9A84C;
          text-shadow:
            0 0 18px rgba(201, 168, 76, 0.35),
            0 0 36px rgba(201, 168, 76, 0.15);
          margin: 18px 0 14px;
        }
        @media (min-width: 640px) {
          .codex-title {
            font-size: 40px;
            letter-spacing: 0.16em;
          }
        }

        .codex-divider {
          width: 80px;
          height: 1px;
          margin: 0 auto 12px;
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(201, 168, 76, 0.6) 50%,
            transparent 100%
          );
        }

        .codex-slogan {
          font-size: 11px;
          letter-spacing: 0.42em;
          color: rgba(201, 168, 76, 0.7);
          font-style: italic;
          text-transform: uppercase;
          margin-bottom: 28px;
        }

        .codex-pitch {
          font-style: italic;
          color: #d8d8e0;
          font-size: 13px;
          line-height: 1.8;
          max-width: 420px;
          margin: 0 auto 36px;
        }

        .codex-features {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px 8px;
          max-width: 360px;
          margin: 0 auto 36px;
        }
        @media (min-width: 640px) {
          .codex-features {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            max-width: 440px;
          }
        }

        .codex-feature {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .codex-feature-icon {
          color: #C9A84C;
          font-size: 20px;
          line-height: 1;
          filter: drop-shadow(0 0 6px rgba(201, 168, 76, 0.25));
        }
        .codex-feature-label {
          font-size: 8px;
          letter-spacing: 0.22em;
          color: rgba(201, 168, 76, 0.55);
          text-transform: uppercase;
          font-weight: 500;
        }

        .codex-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          justify-content: center;
          align-items: stretch;
          max-width: 360px;
          margin: 0 auto;
        }
        @media (min-width: 640px) {
          .codex-actions {
            flex-direction: row;
            max-width: none;
          }
        }

        .codex-btn {
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          padding: 13px 32px;
          border-radius: 4px;
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.2s ease;
        }
        .codex-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .codex-btn-primary {
          background-image: linear-gradient(135deg, #e8c664 0%, #C9A84C 50%, #8B6914 100%);
          color: #050608;
          border: 1px solid #C9A84C;
          box-shadow: 0 4px 18px rgba(201, 168, 76, 0.25), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .codex-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(201, 168, 76, 0.35), inset 0 1px 0 rgba(255,255,255,0.25);
        }

        .codex-btn-secondary {
          background-color: rgba(10, 11, 13, 0.6);
          color: #C9A84C;
          border: 1px solid rgba(201, 168, 76, 0.5);
        }
        .codex-btn-secondary:hover:not(:disabled) {
          background-color: rgba(201, 168, 76, 0.06);
          border-color: rgba(201, 168, 76, 0.85);
          color: #e8c664;
        }

        /* ============================================================ */
        /* Formulaires (mode login/signup)                                */
        /* ============================================================ */
        .codex-form {
          margin: 28px auto 0;
          max-width: 380px;
          background-color: rgba(18, 20, 26, 0.7);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(201, 168, 76, 0.18);
          border-radius: 8px;
          padding: 24px 22px;
          text-align: left;
        }
        .codex-form h2 {
          font-family: Georgia, 'Times New Roman', serif;
          font-weight: 300;
          letter-spacing: 0.2em;
          color: #C9A84C;
          font-size: 18px;
          text-align: center;
          margin-bottom: 18px;
          text-transform: uppercase;
        }
        .codex-label {
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(201, 168, 76, 0.55);
          margin-bottom: 6px;
          display: block;
        }
        .codex-input {
          background-color: #050608;
          border: 1px solid rgba(201, 168, 76, 0.18);
          color: #e8e8ec;
          font-family: inherit;
          font-size: 13px;
          letter-spacing: 0.02em;
          width: 100%;
          padding: 10px 12px;
          border-radius: 4px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .codex-input::placeholder {
          color: #4a4a52;
        }
        .codex-input:focus {
          border-color: rgba(201, 168, 76, 0.6);
          box-shadow: 0 0 0 1px rgba(201, 168, 76, 0.15);
          outline: none;
        }
        .codex-error {
          color: #dc2626;
          font-size: 12px;
          letter-spacing: 0.04em;
          text-align: center;
          margin-top: 4px;
        }
        .codex-link {
          background: none;
          border: none;
          color: rgba(201, 168, 76, 0.7);
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 6px;
          transition: color 0.15s ease;
        }
        .codex-link:hover {
          color: #e8c664;
        }
      `}</style>

      <div className="codex-frame" aria-hidden="true" />

      <div className="codex-content">
        {/* Logo / sceau */}
        <div className="mx-auto" style={{ width: 80, height: 80 }} aria-hidden="true">
          <MasterScreenSeal />
        </div>

        {/* Titre */}
        <h1 className="codex-title">MASTER SCREEN</h1>

        {/* Ligne dorée */}
        <div className="codex-divider" />

        {/* Slogan */}
        <p className="codex-slogan">La Forge Éclipsée</p>

        {mode === 'landing' && (
          <>
            <p className="codex-pitch">
              Dans l&apos;ombre des anciens grimoires, tu forges tes aventures.
              <br />
              L&apos;outil ultime pour les Maîtres du Jeu D&amp;D.
            </p>

            <div className="codex-features">
              <Feature icon="⚔" label="Combat" />
              <Feature icon="🪄" label="Sorts" />
              <Feature icon="🗺" label="Explo" />
              <Feature icon="🎲" label="Dés 3D" />
              <Feature icon="👹" label="Bestiaire" />
              <Feature icon="📜" label="Scénarios" />
            </div>

            <div className="codex-actions">
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setMode('signup')
                }}
                className="codex-btn codex-btn-primary"
              >
                Commencer
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setMode('login')
                }}
                className="codex-btn codex-btn-secondary"
              >
                Connexion
              </button>
            </div>
          </>
        )}

        {mode === 'login' && (
          <form
            className="codex-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleLogin()
            }}
          >
            <h2>Connexion</h2>
            <div style={{ marginBottom: 14 }}>
              <label className="codex-label" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="toi@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="codex-input"
                autoComplete="email"
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label className="codex-label" htmlFor="login-pass">
                Mot de passe
              </label>
              <input
                id="login-pass"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="codex-input"
                autoComplete="current-password"
              />
            </div>
            {message && <p className="codex-error">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="codex-btn codex-btn-primary"
              style={{ width: '100%', marginTop: 8 }}
            >
              {loading ? '…' : 'Entrer'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button
                type="button"
                className="codex-link"
                onClick={() => {
                  resetForm()
                  setMode('signup')
                }}
              >
                Pas encore de compte ? Créer
              </button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="codex-link"
                onClick={() => {
                  resetForm()
                  setMode('landing')
                }}
              >
                ← Retour
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form
            className="codex-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleRegister()
            }}
          >
            <h2>Créer un compte</h2>
            <div style={{ marginBottom: 14 }}>
              <label className="codex-label" htmlFor="signup-nom">
                Nom
              </label>
              <input
                id="signup-nom"
                type="text"
                placeholder="Ton nom de MJ"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="codex-input"
                autoComplete="name"
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="codex-label" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                placeholder="toi@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="codex-input"
                autoComplete="email"
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label className="codex-label" htmlFor="signup-pass">
                Mot de passe
              </label>
              <input
                id="signup-pass"
                type="password"
                placeholder="6 caractères minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="codex-input"
                autoComplete="new-password"
              />
            </div>
            {message && <p className="codex-error">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="codex-btn codex-btn-primary"
              style={{ width: '100%', marginTop: 8 }}
            >
              {loading ? '…' : 'Forger mon compte'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button
                type="button"
                className="codex-link"
                onClick={() => {
                  resetForm()
                  setMode('login')
                }}
              >
                Déjà un compte ? Se connecter
              </button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="codex-link"
                onClick={() => {
                  resetForm()
                  setMode('landing')
                }}
              >
                ← Retour
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}

// ============================================================================
// MasterScreenSeal — sceau SVG : anneau + monogramme « M S », accordé avec
// public/icon.svg.
// ============================================================================
function MasterScreenSeal() {
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      role="img"
      aria-label="Sceau Master Screen"
    >
      <defs>
        <linearGradient id="ms-seal-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffdd88" />
          <stop offset="50%" stopColor="#C9A84C" />
          <stop offset="100%" stopColor="#5a4520" />
        </linearGradient>
        <radialGradient id="ms-seal-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* halo central */}
      <circle cx="50" cy="50" r="44" fill="url(#ms-seal-glow)" />
      {/* anneau extérieur */}
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke="url(#ms-seal-gold)"
        strokeWidth="1.6"
      />
      {/* anneau intérieur pointillé */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="url(#ms-seal-gold)"
        strokeWidth="0.6"
        strokeDasharray="2 2"
      />
      {/* points cardinaux */}
      <circle cx="50" cy="6" r="2.2" fill="#ffdd88" />
      <circle cx="94" cy="50" r="2.2" fill="#ffdd88" />
      <circle cx="50" cy="94" r="2.2" fill="#ffdd88" />
      <circle cx="6" cy="50" r="2.2" fill="#ffdd88" />
      {/* monogramme M S */}
      <text
        x="48"
        y="67"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="56"
        fontWeight="bold"
        fontStyle="italic"
        fill="url(#ms-seal-gold)"
      >
        M
      </text>
      <text
        x="62"
        y="71"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="27"
        fontWeight="bold"
        fontStyle="italic"
        fill="#0a0a0a"
        stroke="#f5f1e8"
        strokeWidth="0.6"
        paintOrder="stroke"
      >
        S
      </text>
    </svg>
  )
}

// ============================================================================
// Feature — icône + label en bas
// ============================================================================
function Feature({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="codex-feature">
      <span className="codex-feature-icon">{icon}</span>
      <span className="codex-feature-label">{label}</span>
    </div>
  )
}
