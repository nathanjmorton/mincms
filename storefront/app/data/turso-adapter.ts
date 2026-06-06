import type {
  DatabaseAdapter,
  DataManipulationRequest,
  DataManipulationResult,
  DataManipulationOperation,
  SqlStatement,
  TableRef,
  TransactionOptions,
  TransactionToken,
} from 'remix/data-table'
import { SqliteDatabaseAdapter } from 'remix/data-table/sqlite'
import { getTablePrimaryKey } from 'remix/data-table'
import type { Client, Transaction, InValue } from '@libsql/client'

/**
 * Async `DatabaseAdapter` for Turso / libSQL.
 *
 * The framework ships a SQLite adapter, but it only accepts a *synchronous*
 * driver (`node:sqlite`, `bun:sqlite`). Turso's libSQL client is async, so it
 * cannot be dropped into that adapter. This adapter implements the async
 * `DatabaseAdapter` contract directly while reusing the framework's own SQLite
 * SQL compiler (via `SqliteDatabaseAdapter.compileSql`), so generated SQL stays
 * identical to the local sqlite path.
 */
export class TursoDatabaseAdapter implements DatabaseAdapter {
  dialect = 'sqlite'
  capabilities = {
    returning: true,
    savepoints: true,
    upsert: true,
    transactionalDdl: true,
    migrationLock: false,
  }

  #client: Client
  // Reused only for its (stateless) compileSql(); never touches a real db.
  #compiler = new SqliteDatabaseAdapter({
    prepare() {
      throw new Error('TursoDatabaseAdapter only uses the compiler')
    },
    exec() {
      throw new Error('TursoDatabaseAdapter only uses the compiler')
    },
  })
  #transactions = new Map<string, Transaction>()
  #counter = 0

  constructor(client: Client) {
    this.#client = client
  }

  compileSql(operation: DataManipulationOperation): SqlStatement[] {
    return this.#compiler.compileSql(operation)
  }

  async execute(request: DataManipulationRequest): Promise<DataManipulationResult> {
    let { operation } = request

    if (operation.kind === 'insertMany' && (operation as any).values.length === 0) {
      return {
        affectedRows: 0,
        insertId: undefined,
        rows: (operation as any).returning ? [] : undefined,
      }
    }

    let statement = this.compileSql(operation)[0]
    let args = statement.values.map((v) => (v === undefined ? null : v)) as InValue[]
    let runner = request.transaction ? this.#requireTransaction(request.transaction) : this.#client

    let result = await runner.execute({ sql: statement.text, args })

    // A statement is a "reader" when the framework expects rows back: explicit
    // select/count/exists, any write with RETURNING, or a raw statement that
    // produced result columns (e.g. the migration journal's SELECT).
    let isRead =
      operation.kind === 'select' ||
      operation.kind === 'count' ||
      operation.kind === 'exists' ||
      ('returning' in operation && (operation as any).returning !== undefined) ||
      (operation.kind === 'raw' && (result.columns?.length ?? 0) > 0)

    if (isRead) {
      let rows = result.rows.map((row) => normalizeRow(row as Record<string, unknown>))
      if (operation.kind === 'count' || operation.kind === 'exists') {
        rows = normalizeCountRows(rows)
      }
      return {
        rows,
        affectedRows: isWriteKind(operation.kind) ? rows.length : undefined,
        insertId: insertIdFromRows(operation, rows),
      }
    }

    return {
      affectedRows:
        operation.kind === 'select' || operation.kind === 'count' || operation.kind === 'exists'
          ? undefined
          : Number(result.rowsAffected),
      insertId: insertIdFromRun(operation, result.lastInsertRowid),
    }
  }

  async executeScript(sql: string, transaction?: TransactionToken): Promise<void> {
    if (transaction) {
      let tx = this.#requireTransaction(transaction)
      // Split on statement boundaries; libSQL transactions execute one at a time.
      for (let part of splitStatements(sql)) {
        await tx.execute(part)
      }
      return
    }
    await this.#client.executeMultiple(sql)
  }

  async hasTable(table: TableRef, transaction?: TransactionToken): Promise<boolean> {
    let runner = transaction ? this.#requireTransaction(transaction) : this.#client
    let master = table.schema ? `${quote(table.schema)}.sqlite_master` : 'sqlite_master'
    let result = await runner.execute({
      sql: `select 1 from ${master} where type = ? and name = ? limit 1`,
      args: ['table', table.name],
    })
    return result.rows.length > 0
  }

  async hasColumn(
    table: TableRef,
    column: string,
    transaction?: TransactionToken,
  ): Promise<boolean> {
    let runner = transaction ? this.#requireTransaction(transaction) : this.#client
    let prefix = table.schema ? `${quote(table.schema)}.` : ''
    let result = await runner.execute(`pragma ${prefix}table_info(${quote(table.name)})`)
    return result.rows.some((row) => (row as any).name === column)
  }

  async beginTransaction(_options?: TransactionOptions): Promise<TransactionToken> {
    let tx = await this.#client.transaction('write')
    this.#counter += 1
    let token: TransactionToken = { id: `tx_${this.#counter}` }
    this.#transactions.set(token.id, tx)
    return token
  }

  async commitTransaction(token: TransactionToken): Promise<void> {
    let tx = this.#requireTransaction(token)
    await tx.commit()
    this.#transactions.delete(token.id)
  }

  async rollbackTransaction(token: TransactionToken): Promise<void> {
    let tx = this.#requireTransaction(token)
    await tx.rollback()
    this.#transactions.delete(token.id)
  }

  async createSavepoint(token: TransactionToken, name: string): Promise<void> {
    await this.#requireTransaction(token).execute(`savepoint ${quote(name)}`)
  }

  async rollbackToSavepoint(token: TransactionToken, name: string): Promise<void> {
    await this.#requireTransaction(token).execute(`rollback to savepoint ${quote(name)}`)
  }

  async releaseSavepoint(token: TransactionToken, name: string): Promise<void> {
    await this.#requireTransaction(token).execute(`release savepoint ${quote(name)}`)
  }

  #requireTransaction(token: TransactionToken): Transaction {
    let tx = this.#transactions.get(token.id)
    if (!tx) {
      throw new Error(`Unknown transaction token: ${token.id}`)
    }
    return tx
  }
}

/** Create a Turso/libSQL `DatabaseAdapter`. */
export function createTursoDatabaseAdapter(client: Client): TursoDatabaseAdapter {
  return new TursoDatabaseAdapter(client)
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  let out: Record<string, unknown> = {}
  for (let key of Object.keys(row)) {
    let value = row[key]
    // libSQL returns integers as bigint when they exceed Number range; data-table
    // expects plain JS values. Narrow safe bigints back to numbers.
    out[key] = typeof value === 'bigint' ? bigintToJs(value) : value
  }
  return out
}

function bigintToJs(value: bigint): number | bigint {
  return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : value
}

function normalizeCountRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    let count = (row as any).count
    if (typeof count === 'string') {
      let numeric = Number(count)
      if (!Number.isNaN(numeric)) return { ...row, count: numeric }
    }
    if (typeof count === 'bigint') return { ...row, count: Number(count) }
    return row
  })
}

function isWriteKind(kind: string): boolean {
  return (
    kind === 'insert' ||
    kind === 'insertMany' ||
    kind === 'update' ||
    kind === 'delete' ||
    kind === 'upsert'
  )
}

function isInsertOperation(operation: DataManipulationOperation): boolean {
  return (
    operation.kind === 'insert' ||
    operation.kind === 'insertMany' ||
    operation.kind === 'upsert'
  )
}

function insertIdFromRows(
  operation: DataManipulationOperation,
  rows: Record<string, unknown>[],
): unknown {
  if (!isInsertOperation(operation)) return undefined
  let primaryKey = getTablePrimaryKey((operation as any).table)
  if (primaryKey.length !== 1) return undefined
  let row = rows[rows.length - 1]
  return row ? row[primaryKey[0]] : undefined
}

function insertIdFromRun(operation: DataManipulationOperation, lastInsertRowid: unknown): unknown {
  if (!isInsertOperation(operation)) return undefined
  if (getTablePrimaryKey((operation as any).table).length !== 1) return undefined
  return typeof lastInsertRowid === 'bigint' ? bigintToJs(lastInsertRowid) : lastInsertRowid
}

function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}
