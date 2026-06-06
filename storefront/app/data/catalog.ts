import { Database } from 'remix/data-table'

import { books, type Book } from './schema.ts'

/**
 * Catalog sync layer.
 *
 * The storefront's source of truth for products is the MinCMS headless API
 * (https://github.com/nathanjmorton/mincms). We pull the published catalog from
 * `${MINCMS_API_URL}/api/products`, map each product into the local `books`
 * shape, and upsert the rows into SQLite.
 *
 * SQLite therefore acts as BOTH a live cache (fast reads, no per-request fan-out
 * to the API) AND an offline fallback: if the API is unreachable, the last known
 * catalog stays available and the site keeps working. All existing UI, cart,
 * search and order code keeps reading from `books` and is unaware of the source.
 */

export const MINCMS_API_URL = (process.env.MINCMS_API_URL ?? 'https://mincms-ten.vercel.app').replace(
  /\/+$/,
  '',
)

// Optional write key, only needed if we ever push back to MinCMS.
export const MINCMS_API_KEY = process.env.MINCMS_API_KEY ?? ''

// Don't hammer the API: refresh the cache at most once per window.
const REFRESH_INTERVAL_MS = Number(process.env.MINCMS_REFRESH_MS ?? 30_000)

// Network timeout for an API refresh.
const FETCH_TIMEOUT_MS = Number(process.env.MINCMS_TIMEOUT_MS ?? 5_000)

interface MinCmsProduct {
  id: number
  name: string
  slug: string
  description: string | null
  price: number
  currency: string | null
  image: string | null
  inventory: number | null
  inStock: boolean
  status: string
  createdAt: string
  updatedAt: string
}

const PLACEHOLDER_IMAGE = '/images/placeholder.jpg'

/** Map a MinCMS product onto the storefront's Book row shape. */
export function productToBook(product: MinCmsProduct): Book {
  let image = product.image && product.image.trim() !== '' ? product.image : PLACEHOLDER_IMAGE
  let year = Number.isFinite(Date.parse(product.createdAt))
    ? new Date(product.createdAt).getFullYear()
    : new Date().getFullYear()

  return {
    id: product.id,
    slug: product.slug,
    title: product.name,
    // Products have no "author"; surface the storefront brand instead.
    author: 'MinCMS Store',
    description: product.description ?? '',
    price: product.price,
    // Products have no genre; bucket by currency so the genre browse still works.
    genre: (product.currency ?? 'usd').toLowerCase(),
    image_urls: JSON.stringify([image]),
    cover_url: image,
    isbn: `MINCMS-${product.id}`,
    published_year: year,
    in_stock: product.inStock,
  }
}

interface RefreshState {
  lastSuccessAt: number
  inFlight: Promise<boolean> | null
}

const state: RefreshState = { lastSuccessAt: 0, inFlight: null }

async function fetchProducts(signal: AbortSignal): Promise<MinCmsProduct[]> {
  let res = await fetch(`${MINCMS_API_URL}/api/products?status=published`, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!res.ok) {
    throw new Error(`MinCMS API responded ${res.status} ${res.statusText}`)
  }

  let body = (await res.json()) as { data?: MinCmsProduct[] }
  if (!body || !Array.isArray(body.data)) {
    throw new Error('MinCMS API returned an unexpected payload')
  }
  return body.data
}

/** Reconcile the local `books` cache with the live MinCMS catalog. */
async function reconcile(db: Database, products: MinCmsProduct[]): Promise<void> {
  let mapped = products.map(productToBook)
  let liveSlugs = new Set(mapped.map((b) => b.slug))

  await db.transaction(async (tx) => {
    let existing = await tx.findMany(books)
    let existingBySlug = new Map(existing.map((b) => [b.slug, b]))

    // Remove rows that no longer exist in MinCMS (only runs on a good fetch,
    // so the cache is never emptied while the API is down).
    for (let row of existing) {
      if (!liveSlugs.has(row.slug)) {
        await tx.delete(books, row.id)
      }
    }

    // Upsert each product by slug.
    for (let book of mapped) {
      let prior = existingBySlug.get(book.slug)
      let { id: _ignored, ...changes } = book
      if (prior) {
        await tx.update(books, prior.id, changes)
      } else {
        await tx.create(books, book)
      }
    }
  })
}

/**
 * Refresh the SQLite catalog cache from MinCMS.
 *
 * Throttled to one network round-trip per REFRESH_INTERVAL_MS and de-duplicated
 * across concurrent requests. Never throws: on any failure it logs and leaves
 * the existing cache in place. Returns true if a fresh sync succeeded.
 */
export async function refreshCatalog(db: Database, options?: { force?: boolean }): Promise<boolean> {
  let now = Date.now()
  if (!options?.force && now - state.lastSuccessAt < REFRESH_INTERVAL_MS) {
    return false
  }
  if (state.inFlight) {
    return state.inFlight
  }

  state.inFlight = (async () => {
    let controller = new AbortController()
    let timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      let products = await fetchProducts(controller.signal)
      await reconcile(db, products)
      state.lastSuccessAt = Date.now()
      return true
    } catch (error) {
      console.warn(
        `[catalog] MinCMS sync failed, serving cached catalog from SQLite: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return false
    } finally {
      clearTimeout(timer)
      state.inFlight = null
    }
  })()

  return state.inFlight
}
