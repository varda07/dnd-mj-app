'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// ROADMAP V1 — Phase 3.8 : Hub Administration
// ----------------------------------------------------------------------------
// Regroupe toutes les fonctions admin en sous-sections. Réservé aux comptes
// is_admin (AdminGuard + RLS serveur).
// ============================================================================

import { useRouter } from 'next/navigation'
import AdminGuard from '@/app/components/AdminGuard'

const SECTIONS: { href: string; icon: string; titre: string; desc: string }[] = [
  { href: '/dashboard/admin/stats', icon: '📊', titre: 'Statistiques', desc: 'Vue globale de la plateforme (utilisateurs, contenus, activité).' },
  { href: '/dashboard/admin/feedback', icon: '💬', titre: 'Retours', desc: 'Problèmes et suggestions remontés par les utilisateurs.' },
  { href: '/dashboard/admin/annonces', icon: '📣', titre: 'Annonces', desc: 'Pousser une annonce à tous les utilisateurs.' },
  { href: '/dashboard/admin/moderation', icon: '🚩', titre: 'Modération', desc: 'Contenus signalés à examiner.' },
  { href: '/dashboard/admin/analytics', icon: '📈', titre: 'Analytics', desc: 'Quelles fonctionnalités sont les plus utilisées.' },
  { href: '/dashboard/admin/contenu', icon: '⭐', titre: 'Contenu officiel', desc: 'Marquer des contenus comme vérifiés/officiels.' },
  { href: '/dashboard/admin/feature-flags', icon: '🎚️', titre: 'Feature flags', desc: 'Activer/désactiver des fonctionnalités à distance.' }
]

export default function AdminHubPage() {
  const router = useRouter()
  return (
    <AdminGuard titre="🛡 Administration">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECTIONS.map((s) => (
          <button
            key={s.href}
            type="button"
            onClick={() => router.push(s.href)}
            className="text-left rounded p-4 border border-[rgba(201,168,76,0.20)] bg-[rgba(0,0,0,0.30)] hover:border-[#C9A84C] hover:bg-[rgba(201,168,76,0.05)] transition-all"
          >
            <div className="text-[#C9A84C] font-bold flex items-center gap-2">
              <span className="text-xl">{s.icon}</span> {s.titre}
            </div>
            <div className="text-[12px] text-[#a8a8b0] mt-1">{s.desc}</div>
          </button>
        ))}
      </div>
    </AdminGuard>
  )
}
