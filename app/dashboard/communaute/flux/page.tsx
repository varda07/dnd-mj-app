'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap Affinement 2.15 — Mon flux : nouvelles créations des utilisateurs suivis
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import EmptyState from '@/app/components/ui/EmptyState'
import { SkeletonList } from '@/app/components/ui/Skeleton'

type FluxItem = {
  type: 'scenario' | 'ennemi' | 'pnj' | 'item' | 'sort' | 'map'
  id: string
  nom: string
  auteur: string
  auteur_id: string
  date: string
}

export default function MonFluxPage() {
  const router = useRouter()
  const [items, setItems] = useState<FluxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [followingCount, setFollowingCount] = useState(0)

  const charger = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
    const ids = (follows ?? []).map((f: { following_id: string }) => f.following_id)
    setFollowingCount(ids.length)
    if (ids.length === 0) { setItems([]); setLoading(false); return }

    // Récupère le username de chaque suivi pour l'affichage
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', ids)
    const usernameMap = new Map<string, string>(((profiles ?? []) as Array<{ id: string; username: string | null }>).map(p => [p.id, p.username ?? 'Anonyme']))

    // Pour chaque table d'entités publiques, on prend les 5 plus récentes par auteur
    const fluxItems: FluxItem[] = []
    const sources: Array<{ table: 'scenarios' | 'ennemis' | 'pnj' | 'items' | 'sorts' | 'maps'; type: FluxItem['type']; ownerCol: string }> = [
      { table: 'scenarios', type: 'scenario', ownerCol: 'mj_id' },
      { table: 'ennemis',   type: 'ennemi',   ownerCol: 'mj_id' },
      { table: 'pnj',       type: 'pnj',      ownerCol: 'mj_id' },
      { table: 'items',     type: 'item',     ownerCol: 'mj_id' },
      { table: 'sorts',     type: 'sort',     ownerCol: 'user_id' },
      { table: 'maps',      type: 'map',      ownerCol: 'mj_id' },
    ]
    for (const src of sources) {
      const { data } = await supabase
        .from(src.table)
        .select(`id, nom, created_at, ${src.ownerCol}`)
        .in(src.ownerCol, ids)
        .eq('public', true)
        .order('created_at', { ascending: false })
        .limit(30)
      const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
      rows.forEach((row) => {
        const ownerId = row[src.ownerCol] as string
        fluxItems.push({
          type: src.type,
          id: row.id as string,
          nom: (row.nom as string) ?? 'Sans nom',
          auteur: usernameMap.get(ownerId) ?? 'Anonyme',
          auteur_id: ownerId,
          date: row.created_at as string,
        })
      })
    }
    fluxItems.sort((a, b) => b.date.localeCompare(a.date))
    setItems(fluxItems.slice(0, 80))
    setLoading(false)
  }, [router])

  useEffect(() => { void charger() }, [charger])

  const ICONS: Record<FluxItem['type'], string> = {
    scenario: '📖', ennemi: '👹', pnj: '🤝', item: '🎒', sort: '✨', map: '🗺',
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white">← Retour</button>
          <h1 className="text-2xl grim-title">📡 Mon flux</h1>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Les dernières créations publiques des {followingCount} utilisateur{followingCount > 1 ? 's' : ''} que tu suis.
        </p>

        {loading ? <SkeletonList count={5} type="card" /> : items.length === 0 ? (
          followingCount === 0 ? (
            <EmptyState
              icon="📡"
              title="Tu ne suis personne pour l'instant"
              message="Va sur un profil public et clique sur « + Suivre » pour voir leurs créations ici."
            />
          ) : (
            <EmptyState
              icon="🕊"
              title="Aucune création récente"
              message="Les utilisateurs que tu suis n'ont pas publié de contenu public récemment."
            />
          )
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((it) => (
              <div key={`${it.type}-${it.id}`} className="codex-card codex-card-hover p-3 flex items-center gap-3">
                <span className="text-2xl">{ICONS[it.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-yellow-300">{it.nom}</div>
                  <div className="text-xs text-gray-400">
                    par <button type="button" onClick={() => router.push(`/profil/${encodeURIComponent(it.auteur)}`)} className="underline hover:text-yellow-300">{it.auteur}</button>
                    {' · '}
                    {new Date(it.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/communaute')}
                  className="text-xs px-2 py-1 rounded bg-gray-800 border border-yellow-500/30 text-yellow-300"
                >Voir</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
