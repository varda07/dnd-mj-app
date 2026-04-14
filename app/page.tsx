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
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Compte créé avec succès !')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-96">
        <h1 className="text-3xl font-bold text-center text-yellow-500 mb-2">⚔️ D&D Manager</h1>
        <p className="text-gray-400 text-center mb-6">Connecte-toi pour commencer</p>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-yellow-500 outline-none"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-yellow-500 outline-none"
          />
          {message && <p className="text-yellow-400 text-sm text-center">{message}</p>}
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full p-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 transition"
          >
            {loading ? 'Chargement...' : 'Se connecter'}
          </button>
          <button
            type="button"
            onClick={handleRegister}
            disabled={loading}
            className="w-full p-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600 transition border border-gray-600"
          >
            Créer un compte
          </button>
        </div>
      </div>
    </main>
  )
}