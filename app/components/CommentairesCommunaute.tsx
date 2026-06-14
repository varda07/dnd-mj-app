'use client'

// ============================================================================
// Roadmap Affinement 2.14 — Composant commentaires + threading basique
// ----------------------------------------------------------------------------
// À monter sous une carte d'entité partagée (scénario, ennemi, etc.) sur
// la page Communauté ou profil public.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'
import { confirmDialog } from '@/app/components/ui/ConfirmDialog'
import SignalerButton from '@/app/components/SignalerButton'

export type EntiteType = 'scenario' | 'ennemi' | 'pnj' | 'item' | 'sort' | 'map'

type Commentaire = {
  id: string
  user_id: string
  auteur_username: string
  entite_type: EntiteType
  entite_id: string
  parent_id: string | null
  contenu: string
  created_at: string
}

export default function CommentairesCommunaute({
  entiteType,
  entiteId,
  proprietaireUserId,
}: {
  entiteType: EntiteType
  entiteId: string
  /** ID du propriétaire de l'entité (peut supprimer tous les commentaires). */
  proprietaireUserId?: string
}) {
  const [commentaires, setCommentaires] = useState<Commentaire[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [texte, setTexte] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const charger = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('username').eq('id', user.id).maybeSingle()
      setUsername((profile?.username as string | undefined) ?? user.email ?? 'Anonyme')
    }
    const { data, error } = await supabase
      .from('commentaires_communaute')
      .select('*')
      .eq('entite_type', entiteType)
      .eq('entite_id', entiteId)
      .order('created_at', { ascending: true })
    if (error) {
      // table peut ne pas exister encore (migration non appliquée) — on noie
      console.warn('[commentaires] fetch:', error.message)
    }
    setCommentaires((data ?? []) as Commentaire[])
    setLoading(false)
  }, [entiteType, entiteId])

  useEffect(() => { void charger() }, [charger])

  const poster = async () => {
    if (!userId || !texte.trim()) return
    setEnvoi(true)
    const { error } = await supabase
      .from('commentaires_communaute')
      .insert({
        user_id: userId,
        auteur_username: username,
        entite_type: entiteType,
        entite_id: entiteId,
        parent_id: parentId,
        contenu: texte.trim(),
      })
    setEnvoi(false)
    if (error) toast.error(error.message)
    else {
      setTexte(''); setParentId(null)
      toast.success('Commentaire publié')
      await charger()
    }
  }

  const supprimer = async (c: Commentaire) => {
    const ok = await confirmDialog({
      title: 'Supprimer ce commentaire ?',
      message: 'Cette action est irréversible.',
      destructive: true,
    })
    if (!ok) return
    const { error } = await supabase.from('commentaires_communaute').delete().eq('id', c.id)
    if (error) toast.error(error.message)
    else { toast.success('Supprimé'); await charger() }
  }

  // Construit l'arbre simple (1 niveau de profondeur pour commencer)
  const racines = commentaires.filter((c) => !c.parent_id)
  const reponsesDe = (id: string) => commentaires.filter((c) => c.parent_id === id)

  return (
    <div className="mt-4 border-t border-gray-700/40 pt-3">
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
        💬 Commentaires {loading ? '' : `(${commentaires.length})`}
      </div>

      {userId ? (
        <div className="flex flex-col gap-2 mb-3">
          {parentId && (
            <div className="text-xs text-yellow-400">
              ↪ Réponse — <button type="button" onClick={() => setParentId(null)} className="underline">annuler</button>
            </div>
          )}
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Ajoute un commentaire…"
            maxLength={2000}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm h-16"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={poster}
              disabled={envoi || !texte.trim()}
              className="px-3 py-1.5 rounded bg-yellow-500 text-gray-900 font-bold text-xs disabled:opacity-40 codex-btn-press"
            >Publier</button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-400 italic mb-3">Connecte-toi pour commenter.</div>
      )}

      <div className="flex flex-col gap-2">
        {racines.map((c) => (
          <div key={c.id} className="codex-card p-3 text-sm">
            <CommentaireItem c={c} userId={userId} proprio={proprietaireUserId} onReply={() => setParentId(c.id)} onDelete={() => supprimer(c)} />
            {reponsesDe(c.id).map((r) => (
              <div key={r.id} className="mt-2 ml-4 border-l-2 border-yellow-500/30 pl-3">
                <CommentaireItem c={r} userId={userId} proprio={proprietaireUserId} onReply={() => setParentId(c.id)} onDelete={() => supprimer(r)} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function CommentaireItem({
  c, userId, proprio, onReply, onDelete
}: {
  c: Commentaire
  userId: string | null
  proprio?: string
  onReply: () => void
  onDelete: () => void
}) {
  const moi = userId === c.user_id
  const isProprio = !!proprio && userId === proprio
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-yellow-300 font-semibold">{c.auteur_username}</span>
        <span className="text-[10px] text-gray-500">{new Date(c.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
      </div>
      <div className="text-gray-200 whitespace-pre-wrap">{c.contenu}</div>
      <div className="flex gap-2 mt-1 items-center">
        {userId && <button type="button" onClick={onReply} className="text-[11px] text-gray-400 hover:text-yellow-300">Répondre</button>}
        {(moi || isProprio) && <button type="button" onClick={onDelete} className="text-[11px] text-red-400 hover:text-red-300">Supprimer</button>}
        {userId && !moi && <SignalerButton contenuType="commentaire" contenuId={c.id} compact />}
      </div>
    </div>
  )
}
