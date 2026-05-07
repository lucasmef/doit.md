import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'
import pg from 'pg'

function loadSqliteDatabase(): typeof Database {
  const module = (
    process as typeof process & { getBuiltinModule?: (id: 'module') => typeof import('node:module') }
  ).getBuiltinModule?.('module')
  if (!module) throw new Error('Node module loader is unavailable')

  const requirePaths = [
    path.resolve(process.cwd(), 'packages/db/package.json'),
    path.resolve(process.cwd(), '../../packages/db/package.json'),
    path.resolve(process.cwd(), 'package.json'),
  ]
  const requirePath = requirePaths.find((candidate) => fs.existsSync(candidate)) ?? path.resolve(process.cwd(), 'package.json')
  const requireFromDb = module.createRequire(requirePath)
  return requireFromDb('better-sqlite3') as typeof Database
}

type SqliteClient = {
  kind: 'sqlite'
  db: Database.Database
}

type PostgresClient = {
  kind: 'postgres'
  pool: pg.Pool
}

export type DBClient = SqliteClient | PostgresClient

let client: DBClient | null = null
let initialized = false

export async function connectDB(): Promise<void> {
  const db = getClient()
  if (!initialized) {
    await migrate(db)
    initialized = true
  }
}

export function getClient(): DBClient {
  if (client) return client

  const url = process.env['DATABASE_URL']
  if (url?.startsWith('postgres://') || url?.startsWith('postgresql://')) {
    client = {
      kind: 'postgres',
      pool: new pg.Pool({ connectionString: url }),
    }
    return client
  }

  const sqlitePath = resolveSqlitePath(url)
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true })
  client = {
    kind: 'sqlite',
    db: new (loadSqliteDatabase())(sqlitePath),
  }
  client.db.pragma('journal_mode = WAL')
  client.db.pragma('foreign_keys = ON')
  return client
}

function resolveSqlitePath(url: string | undefined): string {
  if (url?.startsWith('file:')) return path.resolve(process.cwd(), url.slice('file:'.length))
  if (url?.startsWith('sqlite:')) return path.resolve(process.cwd(), url.slice('sqlite:'.length))
  if (url) return path.resolve(process.cwd(), url)
  return path.resolve(process.cwd(), '.data', 'doit-dev.sqlite')
}

async function migrate(db: DBClient): Promise<void> {
  const statements = db.kind === 'postgres' ? postgresSchema : sqliteSchema
  if (db.kind === 'postgres') {
    for (const sql of statements) await db.pool.query(sql)
    await ensureColumn(db, 'items', 'recurrence', 'TEXT')
    await ensureColumn(db, 'items', 'dueTime', 'TEXT')
    return
  }
  for (const sql of statements) db.db.exec(sql)
  await ensureColumn(db, 'items', 'recurrence', 'TEXT')
  await ensureColumn(db, 'items', 'dueTime', 'TEXT')
}

const sqliteSchema = [
  `CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    contentMd TEXT,
    complexity TEXT NOT NULL,
    status TEXT NOT NULL,
    priority INTEGER,
    dueDate TEXT,
    dueTime TEXT,
    recurrence TEXT,
    startDate TEXT,
    scheduledDate TEXT,
    projectId TEXT,
    areaId TEXT,
    parentId TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    backlinks TEXT NOT NULL DEFAULT '[]',
    localPath TEXT,
    syncHash TEXT,
    googleEventId TEXT,
    calendarEventId TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    deletedAt TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS items_user_status_idx ON items (userId, status)`,
  `CREATE INDEX IF NOT EXISTS items_user_due_idx ON items (userId, dueDate)`,
  `CREATE INDEX IF NOT EXISTS items_user_project_idx ON items (userId, projectId)`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    areaId TEXT,
    color TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS projects_user_order_idx ON projects (userId, "order")`,
  `CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS areas_user_order_idx ON areas (userId, "order")`,
  `CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start TEXT NOT NULL,
    "end" TEXT NOT NULL,
    allDay INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    googleCalendarId TEXT,
    googleEventId TEXT,
    linkedItemIds TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS calendar_events_user_start_idx ON calendar_events (userId, start)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_user_google_idx ON calendar_events (userId, googleEventId) WHERE googleEventId IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    source TEXT NOT NULL,
    action TEXT NOT NULL,
    itemId TEXT,
    localPathBefore TEXT,
    localPathAfter TEXT,
    fieldChanges TEXT,
    contentHashBefore TEXT,
    contentHashAfter TEXT,
    summary TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS audit_logs_user_created_idx ON audit_logs (userId, createdAt)`,
  `CREATE TABLE IF NOT EXISTS pending_changes (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    itemId TEXT,
    changeType TEXT NOT NULL,
    localPathBefore TEXT,
    localPathAfter TEXT,
    titleBefore TEXT,
    titleAfter TEXT,
    contentMdBefore TEXT,
    contentMdAfter TEXT,
    frontmatterChanges TEXT,
    riskLevel TEXT NOT NULL,
    approved INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS pending_changes_user_created_idx ON pending_changes (userId, createdAt)`,
  `CREATE TABLE IF NOT EXISTS item_versions (
    id TEXT PRIMARY KEY,
    itemId TEXT NOT NULL,
    userId TEXT NOT NULL,
    snapshotData TEXT NOT NULL,
    syncHash TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS item_versions_item_created_idx ON item_versions (itemId, createdAt)`,
  `CREATE TABLE IF NOT EXISTS google_accounts (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    accessToken TEXT NOT NULL,
    refreshToken TEXT,
    expiresAt INTEGER,
    scope TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    passwordHash TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
]

const postgresIdentifiers = [
  'frontmatterChanges',
  'contentHashBefore',
  'contentHashAfter',
  'googleCalendarId',
  'calendarEventId',
  'contentMdBefore',
  'contentMdAfter',
  'linkedItemIds',
  'localPathBefore',
  'localPathAfter',
  'scheduledDate',
  'recurrence',
  'dueTime',
  'googleEventId',
  'refreshToken',
  'snapshotData',
  'passwordHash',
  'accessToken',
  'fieldChanges',
  'contentMd',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'startDate',
  'changeType',
  'titleBefore',
  'titleAfter',
  'riskLevel',
  'expiresAt',
  'projectId',
  'localPath',
  'syncHash',
  'parentId',
  'dueDate',
  'areaId',
  'allDay',
  'itemId',
  'userId',
]

const postgresSchema = sqliteSchema.map((sql) => {
  let out = sql
  for (const identifier of [...postgresIdentifiers].sort((a, b) => b.length - a.length)) {
    out = quotePostgresIdentifier(out, identifier)
  }
  return out
})

function quotePostgresIdentifier(sql: string, identifier: string): string {
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return sql.replace(new RegExp(`(?<![A-Za-z0-9_"])${escaped}(?![A-Za-z0-9_"])`, 'g'), `"${identifier}"`)
}

async function ensureColumn(db: DBClient, table: string, column: string, definition: string): Promise<void> {
  if (db.kind === 'postgres') {
    const result = await db.pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column],
    )
    if (result.rowCount === 0) await db.pool.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`)
    return
  }

  const rows = db.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!rows.some((row) => row.name === column)) {
    db.db.prepare(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`).run()
  }
}
