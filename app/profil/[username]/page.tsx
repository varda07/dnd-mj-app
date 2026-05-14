'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap 9.1 — Profils publics utilisateurs
// ----------------------------------------------------------------------------
// Page publique /profil/[username] : avatar, bio, ville, langues parlées,
// statistiques de créations publiques par type. Lecture seule, accessible
// sans authentification (policy `profiles_public_read`).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profil = {
  id: string
  username: string
  bio: string
  ville: string
  langues_parlees: string
}

// Tables partageables : on compte les lignes publiques de l'auteur.
const TYPES_CREATION: { table: string; label: string; emoji: string }[] = [
  { table: 'scenarios', label: 'Scénarios', emoji: '📜' },
  { table: 'personnages', label: 'Personnages', emoji: '🧝' },
  { table: 'ennemis', label: 'Ennemis', emoji: '👹' },
  { table: 'pnj', label: 'PNJ', emoji: '🧑‍🌾' },
  { table: 'items', label: 'Items', emoji: '⚔️' },
  { table: 'maps', label: 'Cartes', emoji: '🗺️' },
  { table: 'sorts', label: 'Sorts', emoji: '✨' }
]

export default function ProfilPublicPage() {
  const router = useRouter()
  const params = useParams<{ username: string }>()
  const username = params?.username
    ? decodeURIComponent(params.username)
    : ''

  const [profil, setProfil] = useState<Profil | null>(null)
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const charger = useCallback(async () => {
    if (!username) return
    const { data: p } = await supabase
      .from('profiles')
      .select('id, username, bio, ville, langues_parlees')
      .eq('username', username)
      .maybeSingle()
    if (!p) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setProfil(p as Profil)

    // Compte des créations publiques par type (auteur_username).
    const compte: Record<string, number> = {}
    await Promise.all(
      TYPES_CREATION.map(async ({ table }) => {
        const { count } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('public', true)
          .eq('auteur_username', username)
        compte[table] = count ?? 0
      })
    )
    setStats(compte)
    setLoading(false)
  }, [username])

  useEffect(() => {
    charger()
  }, [charger])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
        <p className="text-gray-400">Chargement…</p>
      </main>
    )
  }

  if (notFound || !profil) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Profil introuvable : « {username} ».</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
        >
          Retour à l&apos;accueil
        </button>
      </main>
    )
  }

  const totalCreations = Object.values(stats).reduce((s, n) => s + n, 0)
  const initiale = (profil.username || '?').charAt(0).toUpperCase()

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-200 text-sm mb-6"
        >
          ← Retour
        </button>

        {/* En-tête profil */}
        <header className="flex items-center gap-4 mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold flex-shrink-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(201,168,76,0.25) 0%, rgba(201,168,76,0.08) 100%)',
              border: '2px solid rgba(201,168,76,0.4)',
              color: '#C9A84C',
              fontFamily: 'Georgia, serif'
            }}
          >
            {initiale}
          </div>
          <div className="min-w-0">
            <h1
              className="text-[#C9A84C] truncate"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 28,
                fontWeight: 400
              }}
            >
              {profil.username}
            </h1>
            <p className="text-gray-500 text-sm">
              {profil.ville ? `📍 ${profil.ville}` : 'Aventurier·ère'}
              {' · '}
              {totalCreations} création{totalCreations > 1 ? 's' : ''} publique
              {totalCreations > 1 ? 's' : ''}
            </p>
          </div>
        </header>

        {/* Bio */}
        {profil.bio && (
          <section className="rounded-lg p-4 mb-4 bg-gray-800/60 border border-[rgba(201,168,76,0.15)]">
            <p className="text-gray-200 text-sm whitespace-pre-wrap italic">
              « {profil.bio} »
            </p>
          </section>
        )}

        {/* Langues */}
        {profil.langues_parlees && (
          <p className="text-sm text-gray-400 mb-6">
            🗣️ <span className="text-gray-500">Langues parlées :</span>{' '}
            {profil.langues_parlees}
          </p>
        )}

        {/* Stats de créations */}
        <h2 className="text-[#C9A84C] font-bold text-sm uppercase tracking-widest mb-3">
          Créations publiques
        </h2>
        {totalCreations === 0 ? (
          <p className="text-gray-500 text-sm italic">
            Cet utilisateur n&apos;a pas encore partagé de création.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TYPES_CREATION.filter((t) => (stats[t.table] ?? 0) > 0).map((t) => (
              <div
                key={t.table}
                className="rounded-lg p-3 bg-gray-800 border border-gray-700 text-center"
              >
                <div className="text-2xl">{t.emoji}</div>
                <div className="text-xl font-bold text-yellow-400 mt-1">
                  {stats[t.table]}
                </div>
                <div className="text-[11px] text-gray-500 uppercase tracking-wider">
                  {t.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
