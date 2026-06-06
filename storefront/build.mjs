// Vercel build: compile client assets to static files (served by the CDN) and
// lay out the Build Output API v3 structure for the serverless function.
//
// Strategy (validated against this app):
//  - The Remix asset server content-hashes each chunk. We register it once with a
//    fixed ASSET_BUILD_ID so hashes are deterministic, enumerate the closed set of
//    chunks for every client entry + the stylesheet, fetch their compiled bytes,
//    and write them under .vercel/output/static/assets/...  (Vercel CDN).
//  - We write app/asset-manifest.json mapping each entry -> { href, preloads } so
//    the running function resolves hrefs from the manifest and NEVER compiles
//    assets at request time.
//  - The function itself is shipped UNBUNDLED (api/ + app/ + node_modules), run
//    through Remix's node-tsx loader, so island import.meta.url identities survive.

import { mkdirSync, writeFileSync, cpSync, rmSync, existsSync } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import 'remix/node-tsx'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(ROOT, '.vercel', 'output')
const STATIC = path.join(OUT, 'static')
const FUNC = path.join(OUT, 'functions', 'index.func')

const BUILD_ID = process.env.ASSET_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())
process.env.ASSET_BUILD_ID = BUILD_ID
process.env.NODE_ENV = 'production'

const { assetServer, CLIENT_ENTRIES, STYLESHEET_ENTRY } = await import('./app/utils/assets.ts')

console.log(`[build] asset build id: ${BUILD_ID}`)

// 1. Compile assets: enumerate the closed set of hashed chunk URLs.
const entryHrefs = {} // relativeEntry -> { href, preloads }
const allHrefs = new Set()

async function collect(entry) {
  const href = await assetServer.getHref(entry)
  let preloads = []
  try {
    preloads = await assetServer.getPreloads(entry)
  } catch {
    preloads = []
  }
  entryHrefs[entry] = { href, preloads }
  allHrefs.add(href)
  for (const p of preloads) allHrefs.add(p)
}

for (const entry of CLIENT_ENTRIES) await collect(entry)
await collect(STYLESHEET_ENTRY)

// Crawl emitted bytes to guarantee we capture every referenced chunk (closure).
const toFetch = [...allHrefs]
const fetched = new Set()
const refRe = /\/assets\/[A-Za-z0-9_\-.\/@]+\.(?:tsx|ts|jsx|js|css)/g

rmSync(STATIC, { recursive: true, force: true })

while (toFetch.length) {
  const href = toFetch.pop()
  if (fetched.has(href)) continue
  fetched.add(href)

  const res = await assetServer.fetch(new Request('http://local' + href))
  if (!res || res.status !== 200) {
    throw new Error(`Asset compile failed for ${href}: ${res ? res.status : 'no response'}`)
  }
  const body = Buffer.from(await res.arrayBuffer())

  // Write to .vercel/output/static + the same path under the function (so the
  // function can also serve it as a fallback if a request ever reaches it).
  const relPath = href.replace(/^\//, '') // assets/...
  for (const base of [STATIC]) {
    const dest = path.join(base, relPath)
    mkdirSync(path.dirname(dest), { recursive: true })
    writeFileSync(dest, body)
  }

  for (const m of String(body).matchAll(refRe)) {
    if (!fetched.has(m[0])) toFetch.push(m[0])
  }
}

console.log(`[build] wrote ${fetched.size} static asset files`)

// 2. Emit the manifest the running function reads.
const manifest = { buildId: BUILD_ID, entries: entryHrefs }
writeFileSync(path.join(ROOT, 'asset-manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`[build] wrote asset-manifest.json (${Object.keys(entryHrefs).length} entries)`)

// 3. Lay out the serverless function (unbundled source + node_modules).
rmSync(FUNC, { recursive: true, force: true })
mkdirSync(FUNC, { recursive: true })

for (const item of ['api', 'app', 'db', 'asset-manifest.json', 'package.json', 'tsconfig.json']) {
  const src = path.join(ROOT, item)
  if (existsSync(src)) cpSync(src, path.join(FUNC, item), { recursive: true })
}
// node_modules are needed because we run unbundled through node-tsx.
cpSync(path.join(ROOT, 'node_modules'), path.join(FUNC, 'node_modules'), {
  recursive: true,
  dereference: true,
})

writeFileSync(
  path.join(FUNC, '.vc-config.json'),
  JSON.stringify({
    runtime: 'nodejs22.x',
    handler: 'api/index.mjs',
    launcherType: 'Nodejs',
    // NOTE: do NOT set an `environment` map here — it suppresses Vercel's
    // injection of project env vars (DATABASE_URL, SESSION_SECRET, ...). The
    // function resolves asset hrefs from asset-manifest.json at runtime, so it
    // does not need ASSET_BUILD_ID; only the build step does.
  }),
)

// 4. Build Output config: static assets first, everything else to the function.
mkdirSync(OUT, { recursive: true })
writeFileSync(
  path.join(OUT, 'config.json'),
  JSON.stringify({
    version: 3,
    routes: [
      // Force correct MIME for hashed client assets. Files keep their original
      // .tsx/.ts/.js extensions (import specifiers inside the bundles reference
      // each other by those names), so Vercel's extension-based MIME is wrong
      // (.tsx -> octet-stream) and browsers refuse to execute the modules.
      // These run BEFORE `handle: filesystem` with `continue: true` so the header
      // is set, then the static file is served.
      {
        src: '/assets/(.*)\\.(tsx|ts|jsx|js|mjs)$',
        headers: {
          'content-type': 'text/javascript; charset=utf-8',
          'cache-control': 'public, max-age=31536000, immutable',
        },
        continue: true,
      },
      {
        src: '/assets/(.*)\\.css$',
        headers: {
          'content-type': 'text/css; charset=utf-8',
          'cache-control': 'public, max-age=31536000, immutable',
        },
        continue: true,
      },
      // Vercel reserves the /api/* path prefix (zero-config functions) and will
      // 404 it at the platform edge before our catch-all runs. Route it to our
      // function explicitly, ahead of the filesystem handler.
      { src: '/api/(.*)', dest: '/index' },
      { handle: 'filesystem' },
      { src: '/(.*)', dest: '/index' },
    ],
  }),
)

console.log('[build] Build Output ready -> .vercel/output/')
