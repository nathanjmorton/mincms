import type { Middleware } from 'remix/router'
import { Database } from 'remix/data-table'

import { db } from '../data/setup.ts'
import { books } from '../data/schema.ts'
import { refreshCatalog } from '../data/catalog.ts'

export function loadDatabase(): Middleware<{
  key: typeof Database
  value: Database
  property: 'db'
}> {
  return async (context, next) => {
    context.set(Database, db, { property: 'db' })

    // Keep the local SQLite catalog in sync with the MinCMS API.
    // If the cache is empty (cold start / first ever request) we await the sync
    // so the first render has products; otherwise we refresh in the background
    // and serve the cached catalog immediately.
    try {
      let cached = await db.count(books)
      if (cached === 0) {
        await refreshCatalog(db, { force: true })
      } else {
        void refreshCatalog(db)
      }
    } catch (error) {
      console.warn('[catalog] sync skipped:', error instanceof Error ? error.message : error)
    }

    return next()
  }
}
