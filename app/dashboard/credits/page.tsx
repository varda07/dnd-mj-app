'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// /dashboard/credits — Crédits et licence
// ----------------------------------------------------------------------------
// Raison d'être : Master Screen embarque du contenu issu du System Reference
// Document 5.1, publié sous licence Creative Commons Attribution 4.0. Cette
// licence est permissive MAIS elle impose d'afficher une mention d'attribution.
// Utiliser ce contenu sans la mention est précisément ce qui met en tort — la
// mention, elle, légitime tout le contenu SRD de l'app.
//
// ⚠️ LE TEXTE D'ATTRIBUTION CI-DESSOUS DOIT ÊTRE VALIDÉ PAR LE PORTEUR DU PROJET
// sur le texte de licence de référence avant toute mise en ligne publique. Il
// est reproduit ici de mémoire, dans sa forme usuelle ; ni sa formulation exacte
// ni l'URL ne doivent être considérées comme vérifiées.
// ============================================================================

import { useRouter } from 'next/navigation'

const ATTRIBUTION_SRD_EN = `This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.`

export default function CreditsPage() {
  const router = useRouter()

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 codex-fade-in">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white"
        >
          ← Retour
        </button>
        <h1 className="text-2xl grim-title flex-1">⚖️ Crédits et licence</h1>
      </div>

      <section className="grim-card p-4 mb-4">
        <h2 className="codex-section-title codex-section-title-left">L&apos;application</h2>
        <p className="text-gray-300 text-sm leading-relaxed">
          <strong className="text-yellow-500">Master Screen</strong> — La Forge Éclipsée.
          Outil d&apos;aide au maître du jeu : scénarios, personnages, combats, cartes et
          sessions en direct. Master Screen est le nom de cette application ; ce n&apos;est
          pas un système de règles.
        </p>
      </section>

      <section className="grim-card p-4 mb-4">
        <h2 className="codex-section-title codex-section-title-left">
          Contenu sous licence — System Reference Document 5.1
        </h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          Les bestiaires, sorts, objets, conditions et éléments de règles proposés à
          l&apos;import dans Master Screen proviennent du <strong>System Reference
          Document 5.1</strong>, publié sous licence <strong>Creative Commons
          Attribution 4.0 International</strong>. Cette licence autorise leur
          réutilisation, y compris commerciale, à la condition d&apos;afficher la
          mention d&apos;attribution reproduite ci-dessous.
        </p>

        <div className="rounded-lg border border-gray-700 bg-gray-700 p-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-yellow-500 mb-2">
            Mention d&apos;attribution
          </p>
          <p className="text-gray-200 text-xs leading-relaxed font-mono whitespace-pre-wrap">
            {ATTRIBUTION_SRD_EN}
          </p>
        </div>

        <p className="text-gray-500 text-xs italic mt-3 leading-relaxed">
          La mention est reproduite en anglais, langue dans laquelle la licence l&apos;exige.
          Le contenu de règles est traduit en français dans l&apos;application ; cette
          traduction ne modifie ni la licence ni l&apos;obligation d&apos;attribution.
        </p>
      </section>

      <section className="grim-card p-4 mb-4">
        <h2 className="codex-section-title codex-section-title-left">Ce que Master Screen n&apos;est pas</h2>
        <p className="text-gray-300 text-sm leading-relaxed">
          Master Screen n&apos;est affilié à aucun éditeur de jeu de rôle, n&apos;est
          approuvé par aucun d&apos;eux, et ne distribue aucun contenu au-delà de ce que
          la licence ci-dessus autorise. Le contenu que vous créez dans l&apos;application
          vous appartient.
        </p>
      </section>

      {/* Bandeau de validation — à retirer une fois la formule confirmée. */}
      <section
        className="rounded-lg border p-3"
        style={{
          borderColor: 'color-mix(in srgb, var(--theme-accent, #C9A84C) 45%, transparent)',
          background: 'color-mix(in srgb, var(--theme-accent, #C9A84C) 8%, transparent)'
        }}
      >
        <p className="text-yellow-200 text-xs leading-relaxed">
          <strong>À valider avant mise en ligne publique.</strong> La formulation exacte de
          la mention d&apos;attribution et l&apos;URL de la licence doivent être vérifiées
          sur le texte de licence de référence. Une fois confirmées, supprimez ce bandeau
          (<code className="text-yellow-100">app/dashboard/credits/page.tsx</code>).
        </p>
      </section>
    </main>
  )
}
