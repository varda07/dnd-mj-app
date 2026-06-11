#!/usr/bin/env node
// ============================================================================
// Roadmap Finalisation 6.1 — Détecteur de routes orphelines
// ----------------------------------------------------------------------------
// Liste toutes les pages (app/**/page.tsx) qui n'ont AUCUN lien entrant
// (href / <Link> / router.push) dans le code source (.ts/.tsx). Permet de
// repérer une route codée mais inaccessible avant qu'elle s'accumule.
//
// Usage :  node scripts/check-orphan-routes.mjs
// Sortie :  liste des routes orphelines ; code de sortie 1 si au moins une
//           orpheline est trouvée (pratique en CI), 0 sinon.
//
// Aucune dépendance externe (Node natif).
// ============================================================================

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const APP = join(ROOT, 'app')

// Routes considérées comme des points d'entrée (toujours « accessibles ») :
// la racine et le dashboard sont atteints par redirection / au chargement.
const ENTRYPOINTS = new Set(['/', '/dashboard'])

function walk(dir, acc = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return acc
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p)
  }
  return acc
}

const sourceFiles = walk(APP)
walk(join(ROOT, 'lib'), sourceFiles)
const sources = sourceFiles.map((f) => [f, readFileSync(f, 'utf8')])

const pages = sourceFiles.filter((f) => f.replace(/\\/g, '/').endsWith('/page.tsx'))

function fileToRoute(f) {
  const rel = relative(APP, f).split(sep).join('/').replace(/\/?page\.tsx$/, '')
  return rel === '' ? '/' : '/' + rel
}

// Construit une regex tolérante aux segments dynamiques ([id] → ${...} dans les
// template literals, donc tout sauf un slash ou un délimiteur de chaîne).
function routeToRegex(route) {
  const parts = route.split('/').filter(Boolean)
  if (parts.length === 0) return null
  const body = parts
    .map((seg) =>
      /^\[.*\]$/.test(seg)
        ? "[^/'\"`)\\s]+"
        : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    )
    .join('/')
  return new RegExp('/' + body)
}

const orphans = []
for (const page of pages) {
  const route = fileToRoute(page)
  if (ENTRYPOINTS.has(route)) continue
  const re = routeToRegex(route)
  if (!re) continue
  let referenced = false
  for (const [f, content] of sources) {
    if (f === page) continue // ignore les self-références dans la page elle-même
    if (re.test(content)) {
      referenced = true
      break
    }
  }
  if (!referenced) orphans.push(route)
}

console.log(`\n🔎 Routes analysées : ${pages.length}`)
if (orphans.length === 0) {
  console.log('✅ Aucune route orpheline — toutes les pages ont un lien entrant.\n')
  process.exit(0)
}
console.log(`\n❌ ${orphans.length} route(s) orpheline(s) (aucun href/Link/router.push entrant) :\n`)
for (const r of orphans.sort()) console.log(`   - ${r}`)
console.log('\n→ Ajoute un lien (sidebar, dashboard, page parente, palette Cmd+K) vers chacune.\n')
process.exit(1)
