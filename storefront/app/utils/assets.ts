import * as path from 'node:path'
import { createAssetServer } from 'remix/assets'
import { assetsBase } from '../routes.ts'

const isDevelopment = process.env.NODE_ENV === 'development'

export const assetServer = createAssetServer({
  basePath: assetsBase,
  rootDir: path.resolve(import.meta.dirname, '../..'),
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
  fingerprint: isDevelopment
    ? undefined
    : { buildId: process.env.GITHUB_SHA || String(Date.now()) },
  watch: false,
})
