'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Page Compte — gestion du compte utilisateur.
// V1 1.3 — section « Changer mon mot de passe ».
// La vérification du mot de passe actuel se fait via une ré-authentification
// (signInWithPassword) car Supabase n'expose pas de « verify password »
// direct. Si elle réussit, on applique le nouveau via updateUser.
// ============================================================================
export default function ComptePage() {
  const router = useRouter()
  const t = useTranslations('compte')

  const [email, setEmail] = useState('')
  const [current, setCurrent] = useState('')
  const [next1, setNext1] = useState('')
  const [next2, setNext2] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  const submit = async () => {
    setMsg(null)
    if (next1.length < 6) return setMsg({ type: 'err', text: t('err_too_short') })
    if (next1 !== next2) return setMsg({ type: 'err', text: t('err_mismatch') })
    if (current && current === next1) return setMsg({ type: 'err', text: t('err_same') })

    setLoading(true)
    // 1. Ré-authentification : confirme le mot de passe actuel.
    const { error: e1 } = await supabase.auth.signInWithPassword({
      email,
      password: current
    })
    if (e1) {
      setLoading(false)
      return setMsg({ type: 'err', text: t('err_current_wrong') })
    }
    // 2. Mise à jour du mot de passe.
    const { error: e2 } = await supabase.auth.updateUser({ password: next1 })
    setLoading(false)
    if (e2) return setMsg({ type: 'err', text: e2.message })

    setMsg({ type: 'ok', text: t('success') })
    setCurrent('')
    setNext1('')
    setNext2('')
  }

  return (
    <main className="codex-fade-in min-h-screen bg-gray-900 text-white p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            ← {t('back')}
          </button>
          <h1 className="text-xl md:text-2xl grim-title">🔐 {t('title')}</h1>
        </div>

        <section className="grim-card p-4 md:p-5">
          <header className="mb-4">
            <h2 className="text-base font-bold text-yellow-500">
              🔑 {t('change_password')}
            </h2>
            {email && (
              <p className="text-xs text-gray-400 mt-1">
                {t('connected_as')} <span className="text-gray-200">{email}</span>
              </p>
            )}
          </header>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            {/* champ email caché pour l'accessibilité / gestionnaires de mots de passe */}
            <input type="email" value={email} readOnly hidden autoComplete="username" />

            <Field
              label={t('current_password')}
              value={current}
              onChange={setCurrent}
              autoComplete="current-password"
            />
            <Field
              label={t('new_password')}
              value={next1}
              onChange={setNext1}
              autoComplete="new-password"
              placeholder={t('min_chars')}
            />
            <Field
              label={t('confirm_password')}
              value={next2}
              onChange={setNext2}
              autoComplete="new-password"
            />

            {msg && (
              <p
                className={`text-sm ${
                  msg.type === 'ok' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {msg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !current || !next1 || !next2}
              className="w-full bg-yellow-500 text-gray-900 font-bold py-2.5 rounded-md hover:bg-yellow-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? '…' : t('save')}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
  placeholder
}: {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full p-2.5 rounded-md bg-gray-800 text-white border border-gray-700 outline-none focus:border-yellow-500 transition"
      />
    </div>
  )
}
