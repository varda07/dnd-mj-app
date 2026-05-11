// ============================================================================
// Génère public/icon-192.png et public/icon-512.png à partir de public/icon.svg
// ----------------------------------------------------------------------------
// Lancement :
//   node scripts/generate-icons.mjs
// ou via npm script :
//   npm run icons
// ----------------------------------------------------------------------------
// Sharp charge le SVG via librsvg, le rastérise à la densité voulue, puis
// l'encode en PNG. Le fond reste celui défini dans le SVG (#0a0b0d).
// ============================================================================

import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '..', 'public')
const svgPath = resolve(publicDir, 'icon.svg')

const TARGETS = [
  { size: 192, out: 'icon-192.png' },
  { size: 512, out: 'icon-512.png' }
]

async function main() {
  let svg
  try {
    svg = await readFile(svgPath)
  } catch (err) {
    console.error(`✗ Impossible de lire ${svgPath} :`, err.message)
    process.exit(1)
  }

  for (const { size, out } of TARGETS) {
    const outPath = resolve(publicDir, out)
    try {
      // density compense le DPI pour avoir un rendu net à la taille demandée.
      // 72 dpi de base → on remonte proportionnellement (72 × size / 100,
      // sachant que le viewBox du SVG est 100×100). Garde-fou : min 96 dpi.
      const density = Math.max(96, Math.round((72 * size) / 100))
      const buffer = await sharp(svg, { density })
        .resize(size, size, { fit: 'cover' })
        .png({ compressionLevel: 9, palette: false })
        .toBuffer()
      await writeFile(outPath, buffer)
      console.log(`✓ ${out} (${size}×${size}) — ${(buffer.length / 1024).toFixed(1)} KiB`)
    } catch (err) {
      console.error(`✗ Erreur sur ${out} :`, err.message)
      process.exit(1)
    }
  }
  console.log('✓ Icônes générées.')
}

main()
