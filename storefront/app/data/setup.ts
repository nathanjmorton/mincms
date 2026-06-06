import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { createDatabase } from 'remix/data-table'
import { createMigrationRunner } from 'remix/data-table/migrations'
import { loadMigrations } from 'remix/data-table/migrations/node'
import { createSqliteDatabaseAdapter } from 'remix/data-table/sqlite'

import { users } from './schema.ts'
import { hashPassword } from '../utils/password-hash.ts'
import { refreshCatalog } from './catalog.ts'

let databaseFilePath: string
let testDatabaseDirectoryPath: string | undefined

if (process.env.NODE_ENV === 'test') {
  testDatabaseDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), 'remix-bookstore-'))
  databaseFilePath = path.join(testDatabaseDirectoryPath, 'bookstore.sqlite')
} else {
  let databaseDirectoryUrl = new URL('../../db/', import.meta.url)
  databaseFilePath = fileURLToPath(new URL('bookstore.sqlite', databaseDirectoryUrl))

  fs.mkdirSync(fileURLToPath(databaseDirectoryUrl), { recursive: true })
}

const migrationsDirectoryPath = fileURLToPath(new URL('../../db/migrations/', import.meta.url))

const sqlite = new DatabaseSync(databaseFilePath)
sqlite.exec('PRAGMA foreign_keys = ON')
const adapter = createSqliteDatabaseAdapter(sqlite)

export const db = createDatabase(adapter)

let initializePromise: Promise<void> | null = null

export async function initializeBookstoreDatabase(): Promise<void> {
  if (!initializePromise) {
    initializePromise = initialize()
  }

  await initializePromise
}

export function closeBookstoreDatabase(): void {
  if (process.env.NODE_ENV === 'test' && process.platform === 'win32') {
    // DatabaseSync.close() can crash during Windows test process shutdown.
    // Each test file runs in its own process, and the runner discards temp files.
    return
  }

  if (sqlite.isOpen) {
    sqlite.close()
  }

  if (testDatabaseDirectoryPath) {
    fs.rmSync(testDatabaseDirectoryPath, { recursive: true, force: true })
    testDatabaseDirectoryPath = undefined
  }
}

if (process.env.NODE_ENV === 'test') {
  process.once('exit', closeBookstoreDatabase)
}

async function initialize(): Promise<void> {
  let migrations = await loadMigrations(migrationsDirectoryPath)
  let migrationRunner = createMigrationRunner(adapter, migrations)
  await migrationRunner.up()

  // The product catalog is owned by the MinCMS headless API. Pull it on startup
  // so the cache is warm before the first request; if the API is unreachable the
  // app still boots (empty until the first successful sync, or with whatever the
  // SQLite cache already holds from a previous run).
  await refreshCatalog(db, { force: true })

  let usersCount = await db.count(users)
  if (usersCount === 0) {
    await db.createMany(users, [
      {
        id: 1,
        email: 'admin@bookstore.com',
        password_hash: await hashPassword('admin123'),
        name: 'Admin User',
        role: 'admin',
        created_at: new Date('2024-01-15').getTime(),
      },
      {
        id: 2,
        email: 'customer@example.com',
        password_hash: await hashPassword('password123'),
        name: 'John Doe',
        role: 'customer',
        created_at: new Date('2024-03-01').getTime(),
      },
    ])
  }

  // NOTE: Orders and order items are intentionally NOT seeded. They reference
  // books by id, and the catalog is now owned by MinCMS, so demo orders tied to
  // the old hardcoded book ids would violate the order_items -> books foreign key.
  // Orders are created organically through the checkout flow instead.
}
