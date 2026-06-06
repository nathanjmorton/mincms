import { Database } from 'remix/data-table'

import { books, posts, type Book, type Post } from './schema.ts'

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

interface MinCmsPost {
  id: number
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  coverImage: string | null
  status: string
  createdAt: string
  updatedAt: string
}

/** Map a MinCMS blog post onto the storefront's Post row shape. */
export function postToRow(post: MinCmsPost): Post {
  let toEpoch = (value: string) => {
    let parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : Date.now()
  }

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? '',
    content: post.content ?? '',
    cover_image: post.coverImage && post.coverImage.trim() !== '' ? post.coverImage : '',
    published_at: toEpoch(post.createdAt),
    updated_at: toEpoch(post.updatedAt),
  }
}

interface RefreshState {
  lastSuccessAt: number
  inFlight: Promise<boolean> | null
}

const state: RefreshState = { lastSuccessAt: 0, inFlight: null }

async function fetchList<T>(resource: 'products' | 'posts', signal: AbortSignal): Promise<T[]> {
  let res = await fetch(`${MINCMS_API_URL}/api/${resource}?status=published`, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!res.ok) {
    throw new Error(`MinCMS API responded ${res.status} ${res.statusText} for /api/${resource}`)
  }

  let body = (await res.json()) as { data?: T[] }
  if (!body || !Array.isArray(body.data)) {
    throw new Error(`MinCMS API returned an unexpected payload for /api/${resource}`)
  }
  return body.data
}

/**
 * Reconcile a local cache table with a freshly fetched, slug-keyed list.
 * Generic over the table so products and posts share the same upsert/prune logic.
 */
async function reconcileTable<Row extends { id: number; slug: string }>(
  db: Database,
  table: any,
  mapped: Row[],
): Promise<void> {
  let liveSlugs = new Set(mapped.map((r) => r.slug))

  await db.transaction(async (tx) => {
    let existing = (await tx.findMany(table)) as unknown as Row[]
    let existingBySlug = new Map(existing.map((r) => [r.slug, r]))

    // Remove rows that no longer exist in MinCMS (only runs on a good fetch,
    // so the cache is never emptied while the API is down).
    for (let row of existing) {
      if (!liveSlugs.has(row.slug)) {
        await tx.delete(table, row.id)
      }
    }

    // Upsert each row by slug.
    for (let row of mapped) {
      let prior = existingBySlug.get(row.slug)
      let { id: _ignored, ...changes } = row
      if (prior) {
        await tx.update(table, prior.id, changes)
      } else {
        await tx.create(table, row)
      }
    }
  })
}

/**
 * Refresh the SQLite caches (products -> books, posts) from MinCMS.
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
      let [products, postList] = await Promise.all([
        fetchList<MinCmsProduct>('products', controller.signal),
        fetchList<MinCmsPost>('posts', controller.signal),
      ])
      await reconcileTable(db, books, products.map(productToBook))
      await reconcileTable(db, posts, postList.map(postToRow))
      state.lastSuccessAt = Date.now()
      return true
    } catch (error) {
      console.warn(
        `[catalog] MinCMS sync failed, serving cached content from SQLite: ${
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
