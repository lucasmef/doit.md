import { connectDB, getClient, type DBClient } from './connection'

type Row = Record<string, unknown>
type Filter = Record<string, unknown>
type Sort = Record<string, 1 | -1>

type ModelConfig = {
  table: string
  jsonFields?: string[]
  booleanFields?: string[]
}

class Query<T extends Row> implements PromiseLike<T[]> {
  private sortSpec: Sort | null = null
  private limitCount: number | null = null

  constructor(
    private readonly model: SqlModel<T>,
    private readonly filter: Filter,
  ) {}

  sort(spec: Sort): this {
    this.sortSpec = spec
    return this
  }

  limit(count: number): this {
    this.limitCount = count
    return this
  }

  lean(): Promise<T[]> {
    return this.model.findRows(this.filter, this.sortSpec, this.limitCount)
  }

  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.lean().then(onfulfilled, onrejected)
  }
}

class SingleQuery<T extends Row> implements PromiseLike<T | null> {
  constructor(
    private readonly runner: () => Promise<T | null>,
  ) {}

  lean(): Promise<T | null> {
    return this.runner()
  }

  then<TResult1 = T | null, TResult2 = never>(
    onfulfilled?: ((value: T | null) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.lean().then(onfulfilled, onrejected)
  }
}

export class SqlDocument<T extends Row> {
  constructor(private readonly row: T) {
    Object.assign(this, row)
  }

  toObject(): T {
    return { ...this.row }
  }

  toJSON(): T {
    return this.toObject()
  }
}

export class SqlModel<T extends Row = Row> {
  private readonly jsonFields: Set<string>
  private readonly booleanFields: Set<string>

  constructor(private readonly config: ModelConfig) {
    this.jsonFields = new Set(config.jsonFields ?? [])
    this.booleanFields = new Set(config.booleanFields ?? [])
  }

  find(filter: Filter): Query<T> {
    return new Query(this, filter)
  }

  findOne(filter: Filter): SingleQuery<T> {
    return new SingleQuery(async () => {
      const rows = await this.findRows(filter, null, 1)
      return rows[0] ?? null
    })
  }

  async create(data: Row): Promise<any> {
    await connectDB()
    const row = this.normalizeInput(data)
    const columns = Object.keys(row)
    const db = getClient()
    const sql = `INSERT INTO ${this.config.table} (${columns.map((c) => quote(c)).join(', ')}) VALUES (${columns
      .map((_, index) => placeholder(db, index + 1))
      .join(', ')})`
    await execute(db, sql, columns.map((c) => this.serialize(c, row[c])))
    return new SqlDocument(this.deserialize(row) as T)
  }

  async insertMany(rows: Row[]): Promise<void> {
    for (const row of rows) await this.create(row)
  }

  async countDocuments(filter: Filter): Promise<number> {
    await connectDB()
    const db = getClient()
    const where = buildWhere(db, filter)
    const sql = `SELECT COUNT(*) AS count FROM ${this.config.table}${where.sql}`
    const row = await get(db, sql, where.values)
    return Number(row?.['count'] ?? 0)
  }

  findOneAndUpdate(filter: Filter, update: Row, options?: { new?: boolean; upsert?: boolean }): SingleQuery<T> {
    return new SingleQuery(async () => this.updateOne(filter, update, options))
  }

  async findOneAndDelete(filter: Filter): Promise<T | null> {
    await connectDB()
    const existing = await this.findOne(filter).lean()
    if (!existing) return null
    const db = getClient()
    const where = buildWhere(db, filter)
    await execute(db, `DELETE FROM ${this.config.table}${where.sql}`, where.values)
    return existing
  }

  async deleteMany(filter: Filter): Promise<void> {
    await connectDB()
    const db = getClient()
    const where = buildWhere(db, filter)
    await execute(db, `DELETE FROM ${this.config.table}${where.sql}`, where.values)
  }

  async deleteOne(filter: Filter): Promise<void> {
    await this.deleteMany(filter)
  }

  async updateMany(filter: Filter, update: Row): Promise<void> {
    await connectDB()
    const normalizedUpdate = normalizeUpdate(update)
    const patch = { ...normalizedUpdate.set }
    for (const field of normalizedUpdate.unset) patch[field] = null
    const entries = Object.entries(this.normalizeInput(patch))
    if (entries.length === 0) return
    const db = getClient()
    const setSql = entries.map(([field], index) => `${quote(field)} = ${placeholder(db, index + 1)}`).join(', ')
    const where = buildWhere(db, filter, entries.length + 1)
    await execute(
      db,
      `UPDATE ${this.config.table} SET ${setSql}${where.sql}`,
      [...entries.map(([field, value]) => this.serialize(field, value)), ...where.values],
    )
  }

  async findRows(filter: Filter, sortSpec: Sort | null, limitCount: number | null): Promise<T[]> {
    await connectDB()
    const db = getClient()
    const where = buildWhere(db, filter)
    const orderBy = sortSpec
      ? ` ORDER BY ${Object.entries(sortSpec)
          .map(([field, direction]) => `${quote(field)} ${direction === -1 ? 'DESC' : 'ASC'}`)
          .join(', ')}`
      : ''
    const limit = limitCount == null ? '' : ` LIMIT ${limitCount}`
    const rows = await all(db, `SELECT * FROM ${this.config.table}${where.sql}${orderBy}${limit}`, where.values)
    return rows.map((row) => this.deserialize(row) as T)
  }

  private async updateOne(filter: Filter, update: Row, options?: { new?: boolean; upsert?: boolean }): Promise<T | null> {
    await connectDB()
    const existing = await this.findOne(filter).lean()
    if (!existing && !options?.upsert) return null

    const normalizedUpdate = normalizeUpdate(update)
    const setOnInsert = normalizedUpdate.setOnInsert
    const patch = normalizedUpdate.set

    if (!existing) {
      await this.create({ ...filterToRow(filter), ...setOnInsert, ...patch })
      return this.findOne(filter).lean()
    }

    for (const field of normalizedUpdate.unset) patch[field] = null
    const db = getClient()
    const entries = Object.entries(this.normalizeInput(patch))
    if (entries.length > 0) {
      const setSql = entries.map(([field], index) => `${quote(field)} = ${placeholder(db, index + 1)}`).join(', ')
      const where = buildWhere(db, filter, entries.length + 1)
      await execute(
        db,
        `UPDATE ${this.config.table} SET ${setSql}${where.sql}`,
        [...entries.map(([field, value]) => this.serialize(field, value)), ...where.values],
      )
    }

    return options?.new ? this.findOne(filter).lean() : existing
  }

  private normalizeInput(input: Row): Row {
    const out: Row = {}
    for (const [key, value] of Object.entries(input)) {
      const field = key === '_id' ? 'id' : key
      out[field] = value === undefined ? null : value
    }
    if (!out['createdAt'] && (this.config.table === 'calendar_events' || this.config.table === 'google_accounts')) {
      out['createdAt'] = new Date().toISOString()
    }
    return out
  }

  private serialize(field: string, value: unknown): unknown {
    if (this.jsonFields.has(field)) return JSON.stringify(value ?? [])
    if (this.booleanFields.has(field)) return value ? 1 : 0
    return value
  }

  private deserialize(row: Row): Row {
    const out: Row = { ...row, _id: row['id'] }
    for (const field of this.jsonFields) {
      const value = out[field]
      if (typeof value === 'string') {
        try {
          out[field] = JSON.parse(value)
        } catch {
          out[field] = []
        }
      }
    }
    for (const field of this.booleanFields) out[field] = Boolean(out[field])
    return out
  }
}

function normalizeUpdate(update: Row): { set: Row; unset: string[]; setOnInsert: Row } {
  const set = (update['$set'] as Row | undefined) ?? {}
  const unset = Object.keys((update['$unset'] as Row | undefined) ?? {})
  const setOnInsert = (update['$setOnInsert'] as Row | undefined) ?? {}
  const direct = Object.fromEntries(
    Object.entries(update).filter(([key]) => !key.startsWith('$')),
  )
  return { set: { ...direct, ...set }, unset, setOnInsert }
}

function filterToRow(filter: Filter): Row {
  const out: Row = {}
  for (const [key, value] of Object.entries(filter)) {
    if (key === '_id') out['id'] = value
    else if (!isOperatorObject(value)) out[key] = value
  }
  return out
}

function buildWhere(db: DBClient, filter: Filter, startIndex = 1): { sql: string; values: unknown[] } {
  const parts: string[] = []
  const values: unknown[] = []
  for (const [rawField, value] of Object.entries(filter)) {
    const field = rawField === '_id' ? 'id' : rawField
    if (isOperatorObject(value)) {
      for (const [op, opValue] of Object.entries(value)) {
        if (op === '$ne') {
          if (opValue === null) {
            parts.push(`${quote(field)} IS NOT NULL`)
          } else {
            values.push(opValue)
            parts.push(`(${quote(field)} IS NULL OR ${quote(field)} <> ${placeholder(db, startIndex + values.length - 1)})`)
          }
        } else if (op === '$gte' || op === '$lte') {
          values.push(opValue)
          parts.push(`${quote(field)} ${op === '$gte' ? '>=' : '<='} ${placeholder(db, startIndex + values.length - 1)}`)
        } else if (op === '$regex') {
          const pattern = String(opValue)
          values.push(`%${pattern}%`)
          parts.push(`${quote(field)} ${db.kind === 'postgres' ? 'ILIKE' : 'LIKE'} ${placeholder(db, startIndex + values.length - 1)}`)
        }
      }
    } else if (value === null) {
      parts.push(`${quote(field)} IS NULL`)
    } else {
      values.push(value)
      parts.push(`${quote(field)} = ${placeholder(db, startIndex + values.length - 1)}`)
    }
  }
  return { sql: parts.length ? ` WHERE ${parts.join(' AND ')}` : '', values }
}

function isOperatorObject(value: unknown): value is Row {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as Row).some((key) => key.startsWith('$')))
}

function quote(field: string): string {
  return `"${field}"`
}

function placeholder(db: DBClient, index: number): string {
  return db.kind === 'postgres' ? `$${index}` : '?'
}

async function execute(db: DBClient, sql: string, values: unknown[]): Promise<void> {
  if (db.kind === 'postgres') {
    await db.pool.query(sql, values)
    return
  }
  db.db.prepare(sql).run(...values)
}

async function all(db: DBClient, sql: string, values: unknown[]): Promise<Row[]> {
  if (db.kind === 'postgres') {
    const result = await db.pool.query(sql, values)
    return result.rows
  }
  return db.db.prepare(sql).all(...values) as Row[]
}

async function get(db: DBClient, sql: string, values: unknown[]): Promise<Row | undefined> {
  if (db.kind === 'postgres') {
    const result = await db.pool.query(sql, values)
    return result.rows[0]
  }
  return db.db.prepare(sql).get(...values) as Row | undefined
}
