// ============================================================================
// Génère les icônes de l'app à partir de public/icon.svg :
//   - public/icon-192.png
//   - public/icon-512.png
//   - app/favicon.ico  (PNG 64×64 encapsulé dans un conteneur ICO)
// ----------------------------------------------------------------------------
// Lancement :
//   node scripts/generate-icons.mjs
// ou via npm script :
//   npm run icons
// ----------------------------------------------------------------------------
// Sharp charge le SVG via librsvg, le rastérise à la densité voulue, puis
// l'encode en PNG. Le fond reste celui défini dans le SVG (#0a0b0d).
// Sharp ne sait pas écrire de .ico : on emballe nous-mêmes un PNG dans un
// conteneur ICO minimal (les ICO « PNG-compressed » sont supportés par tous
// les navigateurs modernes).
// ============================================================================

import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '..', 'public')
const appDir = resolve(__dirname, '..', 'app')
const svgPath = resolve(publicDir, 'icon.svg')

const TARGETS = [
  { size: 192, out: 'icon-192.png' },
  { size: 512, out: 'icon-512.png' }
]

// Emballe un buffer PNG dans un conteneur ICO mono-image.
function pngToIco(pngBuffer, size) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // réservé
  header.writeUInt16LE(1, 2) // type : 1 = icône
  header.writeUInt16LE(1, 4) // nombre d'images
  const entry = Buffer.alloc(16)
  entry.writeUInt8(size >= 256 ? 0 : size, 0) // largeur (0 = 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1) // hauteur
  entry.writeUInt8(0, 2) // palette
  entry.writeUInt8(0, 3) // réservé
  entry.writeUInt16LE(1, 4) // plans
  entry.writeUInt16LE(32, 6) // bits par pixel
  entry.writeUInt32LE(pngBuffer.length, 8) // taille des données
  entry.writeUInt32LE(6 + 16, 12) // offset des données
  return Buffer.concat([header, entry, pngBuffer])
}

async function rasterize(svg, size) {
  // density compense le DPI pour avoir un rendu net à la taille demandée.
  // 72 dpi de base → on remonte proportionnellement (72 × size / 100,
  // sachant que le viewBox du SVG est 100×100). Garde-fou : min 96 dpi.
  const density = Math.max(96, Math.round((72 * size) / 100))
  return sharp(svg, { density })
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer()
}

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
      const buffer = await rasterize(svg, size)
      await writeFile(outPath, buffer)
      console.log(`✓ ${out} (${size}×${size}) — ${(buffer.length / 1024).toFixed(1)} KiB`)
    } catch (err) {
      console.error(`✗ Erreur sur ${out} :`, err.message)
      process.exit(1)
    }
  }

  // favicon.ico — PNG 64×64 emballé en ICO, écrit dans app/ (convention Next.js).
  try {
    const faviconPng = await rasterize(svg, 64)
    const ico = pngToIco(faviconPng, 64)
    const icoPath = resolve(appDir, 'favicon.ico')
    await writeFile(icoPath, ico)
    console.log(`✓ favicon.ico (64×64) — ${(ico.length / 1024).toFixed(1)} KiB`)
  } catch (err) {
    console.error('✗ Erreur sur favicon.ico :', err.message)
    process.exit(1)
  }

  console.log('✓ Icônes générées.')
}

main()
