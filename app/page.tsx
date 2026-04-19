'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else window.location.href = '/dashboard'
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
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
      setMessage(`Erreur création compte : ${error.message}`)
    } else {
      console.log('[auth] signUp succès :', data)
      setMessage('Compte créé avec succès !')
    }
    setLoading(false)
  }

  return (
    <main className="login-root min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-x-hidden">
      <style>{`
        .login-root {
          background-color: #050200;
          background-image:
            repeating-linear-gradient(
              45deg,
              rgba(201, 168, 76, 0.025),
              rgba(201, 168, 76, 0.025) 1px,
              transparent 1px,
              transparent 8px
            ),
            repeating-linear-gradient(
              -45deg,
              rgba(139, 0, 0, 0.02),
              rgba(139, 0, 0, 0.02) 1px,
              transparent 1px,
              transparent 12px
            );
          color: #C9A84C;
        }

        .login-title {
          font-family: var(--font-cinzel), 'Cinzel', serif;
          letter-spacing: 0.08em;
          color: #C9A84C;
          text-shadow: 0 0 12px rgba(201, 168, 76, 0.4);
          overflow-wrap: break-word;
        }

        .login-slogan {
          font-family: var(--font-cinzel), 'Cinzel', serif;
          letter-spacing: 0.15em;
          color: #C9A84C;
          opacity: 0.7;
          font-style: italic;
          text-shadow: 0 0 6px rgba(201, 168, 76, 0.3);
          overflow-wrap: break-word;
        }

        .login-card {
          background-color: #1a0f05;
          background-image: linear-gradient(
            135deg,
            rgba(201, 168, 76, 0.05) 0%,
            transparent 40%,
            transparent 60%,
            rgba(139, 0, 0, 0.08) 100%
          );
          border: 1px solid rgba(201, 168, 76, 0.5);
          box-shadow:
            inset 0 0 20px rgba(139, 0, 0, 0.2),
            0 0 14px rgba(201, 168, 76, 0.18);
        }

        .login-input {
          background-color: #0a0502;
          border: 1px solid rgba(201, 168, 76, 0.3);
          color: #f4e9c7;
          font-family: var(--font-cinzel), 'Cinzel', serif;
          letter-spacing: 0.05em;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .login-input::placeholder {
          color: rgba(201, 168, 76, 0.4);
        }
        .login-input:focus {
          border-color: #C9A84C;
          box-shadow: inset 0 0 8px rgba(201, 168, 76, 0.15);
          outline: none;
        }

        .login-btn-primary {
          font-family: var(--font-cinzel), 'Cinzel', serif;
          letter-spacing: 0.1em;
          background: linear-gradient(135deg, #e8c664 0%, #C9A84C 50%, #8B6914 100%);
          color: #050200;
          border: 1px solid #8B6914;
          box-shadow:
            0 2px 8px rgba(201, 168, 76, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.15);
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .login-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 4px 12px rgba(201, 168, 76, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        .login-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-btn-secondary {
          font-family: var(--font-cinzel), 'Cinzel', serif;
          letter-spacing: 0.1em;
          background-color: transparent;
          color: #C9A84C;
          border: 1px solid rgba(201, 168, 76, 0.5);
          transition: background-color 0.2s, border-color 0.2s;
        }
        .login-btn-secondary:hover:not(:disabled) {
          background-color: rgba(201, 168, 76, 0.08);
          border-color: #C9A84C;
        }
        .login-btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="w-full max-w-sm">
        {/* Titre */}
        <h1 className="login-title text-2xl sm:text-3xl font-bold text-center mb-3">
          ⚔️ D&amp;D MANAGER
        </h1>

        {/* Slogan */}
        <p className="login-slogan text-center text-[10px] sm:text-xs mb-6 break-words px-2">
          FORTIS FORTUNA ADIUVAT
        </p>

        {/* Carte formulaire */}
        <div className="login-card p-5 sm:p-6 rounded-lg">
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input w-full p-3 rounded text-sm"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input w-full p-3 rounded text-sm"
            />

            {message && (
              <p
                className="text-xs text-center break-words"
                style={{
                  color: '#ff8844',
                  fontFamily: 'var(--font-cinzel), Cinzel, serif',
                  letterSpacing: '0.05em'
                }}
              >
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="login-btn-primary w-full p-3 rounded font-bold text-sm"
            >
              {loading ? 'CHARGEMENT...' : 'SE CONNECTER'}
            </button>
            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
              className="login-btn-secondary w-full p-3 rounded font-bold text-sm"
            >
              CRÉER UN COMPTE
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
