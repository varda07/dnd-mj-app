'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      setMessage(t('signup_error', { message: error.message }))
    } else {
      console.log('[auth] signUp succès :', data)
      setMessage(t('account_created'))
    }
    setLoading(false)
  }

  return (
    <main className="login-root min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-x-hidden">
      <style>{`
        .login-root {
          background-color: #0a0b0d;
          color: #e8e8ec;
          font-family: var(--font-inter), 'Inter', system-ui, -apple-system, sans-serif;
        }

        .login-title {
          font-family: var(--font-inter), 'Inter', system-ui, sans-serif;
          font-weight: 500;
          letter-spacing: 0.18em;
          color: #C9A84C;
        }

        .login-slogan {
          font-family: var(--font-inter), 'Inter', system-ui, sans-serif;
          font-weight: 400;
          letter-spacing: 0.25em;
          color: #6a6a72;
          text-transform: uppercase;
        }

        .login-card {
          background-color: #12141a;
          border: 1px solid rgba(201, 168, 76, 0.15);
          border-radius: 10px;
        }

        .login-label {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #6a6a72;
          font-weight: 400;
        }

        .login-input {
          background-color: #0a0b0d;
          border: 1px solid rgba(201, 168, 76, 0.15);
          color: #e8e8ec;
          font-family: inherit;
          font-size: 14px;
          letter-spacing: 0.02em;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          border-radius: 6px;
        }
        .login-input::placeholder {
          color: #4a4a52;
          letter-spacing: 0;
        }
        .login-input:focus {
          border-color: rgba(201, 168, 76, 0.55);
          box-shadow: 0 0 0 1px rgba(201, 168, 76, 0.15);
          outline: none;
        }

        .login-btn-primary {
          font-family: inherit;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          background-color: #C9A84C;
          color: #0a0b0d;
          border: 1px solid #C9A84C;
          border-radius: 6px;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .login-btn-primary:hover:not(:disabled) {
          background-color: #d4b558;
          border-color: #d4b558;
        }
        .login-btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .login-btn-secondary {
          font-family: inherit;
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          background-color: transparent;
          color: #e8e8ec;
          border: 1px solid rgba(201, 168, 76, 0.15);
          border-radius: 6px;
          transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .login-btn-secondary:hover:not(:disabled) {
          background-color: rgba(201, 168, 76, 0.04);
          border-color: rgba(201, 168, 76, 0.35);
          color: #C9A84C;
        }
        .login-btn-secondary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .login-error {
          color: #dc2626;
          font-size: 12px;
          letter-spacing: 0.04em;
        }

        .login-divider {
          height: 1px;
          background-color: rgba(201, 168, 76, 0.15);
          margin: 0;
        }
      `}</style>

      <div className="w-full max-w-sm">
        <h1 className="login-title text-xl sm:text-2xl text-center mb-3">
          {t('app_title')}
        </h1>

        <p className="login-slogan text-center text-[10px] sm:text-[11px] mb-10">
          {t('app_slogan')}
        </p>

        <div className="login-card p-6 sm:p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="login-label">{t('email')}</div>
              <input
                type="email"
                placeholder={t('email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input w-full px-3 py-2.5"
              />
            </div>

            <div className="space-y-2">
              <div className="login-label">{t('password')}</div>
              <input
                type="password"
                placeholder={t('password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input w-full px-3 py-2.5"
              />
            </div>

            {message && (
              <p className="login-error text-center break-words">{message}</p>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="login-btn-primary w-full py-3 text-xs"
            >
              {loading ? '…' : t('sign_in')}
            </button>

            <div className="login-divider" />

            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
              className="login-btn-secondary w-full py-3 text-xs"
            >
              {t('register')}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
