'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// Roadmap Finalisation 2.2 — Atelier de donjon (builder manuel avancé)
// ----------------------------------------------------------------------------
// Branche les 7 composants du dossier components/donjon/ (jusqu'ici orphelins)
// sur une page unique accessible depuis la page Maps. Le MJ choisit une de ses
// cartes, puis dispose de tous les outils MJ : triggers, annotations, liens
// multi-étages, zones de rencontre, bibliothèques de tuiles et pièges, et la
// bascule Vue MJ / Vue joueurs.
// ============================================================================

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'
import TuilesPalette from '@/app/components/donjon/TuilesPalette'
import PiegesPalette from '@/app/components/donjon/PiegesPalette'
import TriggerEditor from '@/app/components/donjon/TriggerEditor'
import AnnotationsMJPanel, { creerAnnotation } from '@/app/components/donjon/AnnotationsMJPanel'
import MapLiensPanel from '@/app/components/donjon/MapLiensPanel'
import RandomEncounterRoller, { type Zone } from '@/app/components/donjon/RandomEncounterRoller'
import GmViewToggle, { type GmViewMode } from '@/app/components/donjon/GmViewToggle'
import type { TuileDef } from '@/app/data/tuiles_donjon'
import type { Piege } from '@/app/data/pieges_donjon'

type MapLite = { id: string; nom: string; image_url: string | null }

type ZoneRow = {
  id: string
  nom: string
  probabilite_pour_20: number
  type: Zone['type']
  contenu: Record<string, unknown>
}

// Route héritée : redirige vers l'éditeur unifié (onglet « Outils MJ »), en
// préservant ?id=. Le contenu reste exporté via `AtelierPanelContent`.
export default function DonjonBuilderPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-900 text-white p-6"><p className="text-gray-400">Redirection…</p></main>}>
      <BuilderRedirect />
    </Suspense>
  )
}

function BuilderRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  useEffect(() => {
    router.replace(`/dashboard/maps/editor?tab=gm${id ? `&id=${id}` : ''}`)
  }, [router, id])
  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <p className="text-gray-400">Redirection vers l&apos;éditeur…</p>
    </main>
  )
}

// Contenu « Outils MJ » (ex-Atelier), sans chrome de page (pas de <main> ni de
// bouton retour) → montable tel quel dans l'éditeur unifié.
export function AtelierPanelContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mapParam = searchParams.get('id')

  const [maps, setMaps] = useState<MapLite[]>([])
  const [mapId, setMapId] = useState<string>('')
  const [vue, setVue] = useState<GmViewMode>('mj')
  const [annotKey, setAnnotKey] = useState(0)

  // Zones de rencontre (mini-CRUD local sur random_encounters_zones).
  const [zones, setZones] = useState<ZoneRow[]>([])
  const [zoneNom, setZoneNom] = useState('')
  const [zoneProba, setZoneProba] = useState(5)
  const [zoneType, setZoneType] = useState<Zone['type']>('combat')

  const [derniereTuile, setDerniereTuile] = useState<string>('')
  const [dernierPiege, setDernierPiege] = useState<Piege | null>(null)

  // -- Chargement des cartes du MJ ------------------------------------------
  const chargerMaps = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data } = await supabase
      .from('maps')
      .select('id, nom, image_url')
      .eq('mj_id', user.id)
      .order('created_at', { ascending: false })
    const rows = (data ?? []) as MapLite[]
    setMaps(rows)
    // Sélection initiale : param d'URL > première carte.
    setMapId((prev) => prev || mapParam || rows[0]?.id || '')
  }, [router, mapParam])

  useEffect(() => { void chargerMaps() }, [chargerMaps])

  // -- Chargement des zones de rencontre de la carte choisie -----------------
  const chargerZones = useCallback(async () => {
    if (!mapId) { setZones([]); return }
    const { data } = await supabase
      .from('random_encounters_zones')
      .select('id, nom, probabilite_pour_20, type, contenu')
      .eq('map_id', mapId)
      .order('created_at', { ascending: true })
    setZones((data ?? []) as ZoneRow[])
  }, [mapId])

  useEffect(() => { void chargerZones() }, [chargerZones])

  const ajouterZone = async () => {
    if (!mapId) return
    if (!zoneNom.trim()) { toast.error('Nomme la zone de rencontre.'); return }
    const { error } = await supabase.from('random_encounters_zones').insert({
      map_id: mapId,
      nom: zoneNom.trim(),
      zone: { x: 50, y: 50, w: 20, h: 20 },
      probabilite_pour_20: Math.min(20, Math.max(1, zoneProba)),
      type: zoneType,
      contenu: {},
    })
    if (error) { toast.error(error.message); return }
    toast.success('Zone de rencontre ajoutée')
    setZoneNom('')
    void chargerZones()
  }

  const supprimerZone = async (id: string) => {
    await supabase.from('random_encounters_zones').delete().eq('id', id)
    void chargerZones()
  }

  const ajouterAnnotation = async () => {
    if (!mapId) return
    const texte = window.prompt('Note MJ (placée au centre de la carte) :')
    if (!texte || !texte.trim()) return
    const ok = await creerAnnotation(mapId, 50, 50, texte.trim())
    if (ok) {
      toast.success('Annotation ajoutée')
      setAnnotKey((k) => k + 1) // force le rechargement du panneau
    }
  }

  const onSelectTuile = (tuile: TuileDef, rotation: 0 | 90 | 180 | 270) => {
    setDerniereTuile(`${tuile.label} (${tuile.w}×${tuile.h}${rotation ? `, ${rotation}°` : ''})`)
    toast.info(`Tuile : ${tuile.label}`)
  }

  const onSelectPiege = (piege: Piege) => {
    setDernierPiege(piege)
    toast.info(`Piège : ${piege.nom}`)
  }

  const mapCourante = maps.find((m) => m.id === mapId) ?? null

  return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h1 className="text-2xl grim-title">🏗 Atelier de donjon</h1>
          <div className="ml-auto">
            <GmViewToggle mode={vue} onChange={setVue} />
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Outils avancés de maître du jeu pour préparer une carte : triggers, annotations
          secrètes, liens multi-étages, zones de rencontre aléatoire, et bibliothèques de
          tuiles et de pièges.
        </p>

        {/* Sélecteur de carte */}
        <div className="grim-card p-4 mb-5">
          <label className="text-[11px] uppercase tracking-[0.18em] text-gray-400 block mb-2">
            Carte à équiper
          </label>
          {maps.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              Aucune carte. <button type="button" onClick={() => router.push('/dashboard/maps')} className="underline text-yellow-300">Crée une carte</button> pour commencer.
            </p>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={mapId}
                onChange={(e) => setMapId(e.target.value)}
                className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm min-w-[220px]"
              >
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>{m.nom}</option>
                ))}
              </select>
              {mapCourante?.image_url && (
                <img
                  src={mapCourante.image_url}
                  alt={mapCourante.nom}
                  loading="lazy"
                  className="h-16 rounded object-cover border border-gray-700"
                />
              )}
            </div>
          )}
          {vue === 'joueurs' && (
            <p className="text-[11px] text-emerald-300/80 mt-2">
              👁 Aperçu « Vue joueurs » : sur la carte diffusée, les annotations, pièges et triggers MJ restent cachés aux joueurs.
            </p>
          )}
        </div>

        {mapId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Colonne A — outils MJ persistants */}
            <div className="flex flex-col gap-4">
              <TriggerEditor mapId={mapId} />
              <div>
                <div className="flex justify-end mb-1">
                  <button
                    type="button"
                    onClick={ajouterAnnotation}
                    className="text-xs px-2 py-1 rounded bg-yellow-500/15 border border-yellow-500/40 text-yellow-200"
                  >
                    + Note MJ
                  </button>
                </div>
                <AnnotationsMJPanel key={annotKey} mapId={mapId} />
              </div>
              <MapLiensPanel mapId={mapId} />
            </div>

            {/* Colonne B — zones de rencontre + bibliothèques */}
            <div className="flex flex-col gap-4">
              {/* Zones de rencontre aléatoire */}
              <div className="codex-card p-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-yellow-500 font-bold mb-2">
                  🎲 Zones de rencontre aléatoire ({zones.length})
                </div>
                {zones.length === 0 ? (
                  <p className="text-xs text-gray-500 italic mb-3">
                    Aucune zone. Crée des zones où un jet de d20 peut déclencher une rencontre.
                  </p>
                ) : (
                  <ul className="space-y-1.5 mb-3">
                    {zones.map((z) => (
                      <li key={z.id} className="flex items-center gap-2 text-xs">
                        <span className="flex-1 text-gray-200">
                          {z.nom} <span className="text-gray-500">· {z.type}</span>
                        </span>
                        <RandomEncounterRoller
                          zone={{
                            id: z.id,
                            nom: z.nom,
                            probabilite_pour_20: z.probabilite_pour_20,
                            type: z.type,
                            contenu: z.contenu ?? {},
                          }}
                        />
                        <button type="button" onClick={() => supprimerZone(z.id)} className="text-red-400 px-1">🗑</button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="border-t border-gray-700/30 pt-2 flex flex-col gap-1">
                  <input
                    value={zoneNom}
                    onChange={(e) => setZoneNom(e.target.value)}
                    placeholder="Nom de la zone (ex: Couloir Est)"
                    className="p-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs"
                  />
                  <div className="flex gap-1">
                    <select
                      value={zoneType}
                      onChange={(e) => setZoneType(e.target.value as Zone['type'])}
                      className="p-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs"
                    >
                      <option value="combat">⚔️ Combat</option>
                      <option value="dialogue">💬 Dialogue</option>
                      <option value="loot">🎁 Loot</option>
                      <option value="piege">🪤 Piège</option>
                    </select>
                    <label className="flex items-center gap-1 text-[11px] text-gray-400">
                      ≤
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={zoneProba}
                        onChange={(e) => setZoneProba(Number(e.target.value))}
                        className="w-14 p-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs"
                      />
                      /20
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={ajouterZone}
                    className="text-xs px-2 py-1 rounded bg-yellow-500/15 border border-yellow-500/40 text-yellow-200 codex-btn-press"
                  >
                    + Ajouter la zone
                  </button>
                </div>
              </div>

              {/* Bibliothèque de tuiles */}
              <div>
                <TuilesPalette onSelect={onSelectTuile} />
                {derniereTuile && (
                  <p className="text-[11px] text-gray-400 mt-1">Dernière tuile : <span className="text-yellow-300">{derniereTuile}</span></p>
                )}
              </div>

              {/* Bibliothèque de pièges */}
              <div>
                <PiegesPalette onSelect={onSelectPiege} />
                {dernierPiege && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Dernier piège : <span className="text-yellow-300">{dernierPiege.icon} {dernierPiege.nom}</span> — {dernierPiege.degats} {dernierPiege.type_degats}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
