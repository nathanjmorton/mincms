import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { assetServer, assetsRootDir } from './assets.ts'

/**
 * Asset resolution that works in two modes:
 *
 * - **Production (Vercel / precompiled):** a manifest emitted by `build.mjs`
 *   maps each client-entry/stylesheet (by project-relative path) to its hashed
 *   `/assets/...` href and preloads. The compiled bytes are uploaded as static
 *   files served by Vercel's CDN, so the running function never compiles assets.
 *
 * - **Dev / no manifest:** we fall back to the live `assetServer`, which compiles
 *   on demand and serves bytes itself (the long-running / systemd path).
 *
 * The render and asset-entry middleware call through here so neither needs to
 * know which mode is active.
 */

export interface AssetManifest {
  buildId: string
  // project-relative source path -> { href, preloads }
  entries: Record<string, { href: string; preloads: string[] }>
}

const MANIFEST_PATH = path.join(assetsRootDir, 'asset-manifest.json')

let manifest: AssetManifest | null = null
let loaded = false

function loadManifest(): AssetManifest | null {
  if (loaded) return manifest
  loaded = true
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as AssetManifest
  } catch {
    manifest = null
  }
  return manifest
}

/** Normalize an entry id (file URL, absolute path, or relative path) to project-relative. */
export function toRelativeEntry(entryId: string): string {
  let withoutHash = entryId.split('#')[0]
  let filePath = withoutHash.startsWith('file://') ? fileURLToPath(withoutHash) : withoutHash
  if (path.isAbsolute(filePath)) {
    return path.relative(assetsRootDir, filePath).split(path.sep).join('/')
  }
  return filePath.split(path.sep).join('/')
}

/** Resolve a client entry to its browser href + exported component name. */
export async function resolveHref(entryId: string): Promise<string> {
  let m = loadManifest()
  if (m) {
    let rel = toRelativeEntry(entryId)
    let hit = m.entries[rel]
    if (hit) return hit.href
    // Unknown entry in production manifest: surface clearly rather than 404 later.
    throw new Error(`Asset manifest has no entry for "${rel}". Re-run the asset build.`)
  }
  return assetServer.getHref(entryId)
}

/** Resolve the preload list for a client entry. */
export async function resolvePreloads(entryId: string): Promise<string[]> {
  let m = loadManifest()
  if (m) {
    let rel = toRelativeEntry(entryId)
    return m.entries[rel]?.preloads ?? []
  }
  return assetServer.getPreloads(entryId).catch(() => [])
}

/** True when a precompiled manifest is present (production/Vercel). */
export function hasManifest(): boolean {
  return loadManifest() !== null
}
