import * as path from 'node:path'
import { createAssetServer } from 'remix/assets'
import { assetsBase } from '../routes.ts'

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Stable build id. The asset server content-hashes each chunk, but also salts
 * filenames with a build id. For the Vercel static-asset precompile to line up
 * (build time vs request time), this MUST be deterministic, so we read it from
 * ASSET_BUILD_ID (set by build.mjs and the Vercel function env). It falls back to
 * a per-process value only for the dev server, where assets are compiled live.
 */
const buildId = process.env.ASSET_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'dev'

export const assetsRootDir = path.resolve(import.meta.dirname, '../..')

export const assetServer = createAssetServer({
  basePath: assetsBase,
  rootDir: assetsRootDir,
  allow: [
    'app/assets/**',
    'app/routes.ts',
    'node_modules/remix/**',
    'node_modules/@remix-run/**',
  ],
  fileMap: {
    '/app/*path': 'app/*path',
    '/node_modules/*path': 'node_modules/*path',
  },
  sourceMaps: isDevelopment ? 'external' : undefined,
  minify: !isDevelopment,
  fingerprint: isDevelopment ? undefined : { buildId },
  watch: false,
})

/** Client-entry source files that ship interactive islands to the browser. */
export const CLIENT_ENTRIES = [
  'app/assets/entry.tsx',
  'app/assets/image-carousel.tsx',
  'app/assets/cart-button.tsx',
  'app/assets/cart-items.tsx',
] as const

export const STYLESHEET_ENTRY = 'app/assets/app.css'
