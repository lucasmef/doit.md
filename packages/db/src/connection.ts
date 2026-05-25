import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'
import pg from 'pg'

function loadSqliteDatabase(): typeof Database {
  const module = (
    process as typeof process & {
      getBuiltinModule?: (id: 'module') => typeof import('node:module')
    }
  ).getBuiltinModule?.('module')
  if (!module) throw new Error('Node module loader is unavailable')

  const requirePaths = [
    path.resolve(process.cwd(), 'packages/db/package.json'),
    path.resolve(process.cwd(), '../../packages/db/package.json'),
    path.resolve(process.cwd(), 'package.json'),
  ]
  const requirePath =
    requirePaths.find((candidate) => fs.existsSync(candidate)) ??
    path.resolve(process.cwd(), 'package.json')
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
    for (const sql of statements.filter(isCreateTableStatement)) await db.pool.query(sql)
    await ensureKnownColumns(db)
    for (const sql of statements.filter((statement) => !isCreateTableStatement(statement)))
      await db.pool.query(sql)
    await retireProjectsTable(db)
    return
  }
  for (const sql of statements.filter(isCreateTableStatement)) db.db.exec(sql)
  await ensureKnownColumns(db)
  for (const sql of statements.filter((statement) => !isCreateTableStatement(statement)))
    db.db.exec(sql)
  await retireProjectsTable(db)
}

async function tableExists(db: DBClient, table: string): Promise<boolean> {
  if (db.kind === 'postgres') {
    const result = await db.pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = $1`,
      [table],
    )
    return (result.rowCount ?? 0) > 0
  }
  const row = db.db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table)
  return Boolean(row)
}

async function columnExists(db: DBClient, table: string, column: string): Promise<boolean> {
  if (db.kind === 'postgres') {
    const result = await db.pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column],
    )
    return (result.rowCount ?? 0) > 0
  }
  const rows = db.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return rows.some((row) => row.name === column)
}

async function retireProjectsTable(db: DBClient): Promise<void> {
  if (!(await tableExists(db, 'projects'))) return

  if (db.kind === 'postgres') {
    await db.pool.query(`
      INSERT INTO folders (id, "userId", name, "order", "createdAt", "updatedAt")
      SELECT 'fld_p_' || id, "userId", name, COALESCE("order", 0), "createdAt", "updatedAt"
      FROM projects
      WHERE NOT EXISTS (SELECT 1 FROM folders WHERE folders.id = 'fld_p_' || projects.id)
    `)
    if (await columnExists(db, 'items', 'projectId')) {
      await db.pool.query(`
        UPDATE items SET "folderId" = 'fld_p_' || "projectId"
        WHERE "projectId" IS NOT NULL AND "folderId" IS NULL
      `)
      await db.pool.query(`ALTER TABLE items DROP COLUMN IF EXISTS "projectId"`)
    }
    await db.pool.query(`DROP TABLE IF EXISTS projects`)
    return
  }

  db.db.exec(`
    INSERT INTO folders (id, userId, name, "order", createdAt, updatedAt)
    SELECT 'fld_p_' || id, userId, name, COALESCE("order", 0), createdAt, updatedAt
    FROM projects
    WHERE NOT EXISTS (SELECT 1 FROM folders WHERE folders.id = 'fld_p_' || projects.id)
  `)
  if (await columnExists(db, 'items', 'projectId')) {
    db.db.exec(`
      UPDATE items SET folderId = 'fld_p_' || projectId
      WHERE projectId IS NOT NULL AND folderId IS NULL
    `)
    try {
      db.db.exec(`ALTER TABLE items DROP COLUMN projectId`)
    } catch {
      // older sqlite may not support DROP COLUMN; the column becomes orphan
    }
  }
  db.db.exec(`DROP TABLE IF EXISTS projects`)
}

function isCreateTableStatement(sql: string): boolean {
  return sql.trimStart().startsWith('CREATE TABLE')
}

async function ensureKnownColumns(db: DBClient): Promise<void> {
  await ensureColumn(db, 'items', 'recurrence', 'TEXT')
  await ensureColumn(db, 'items', 'dueTime', 'TEXT')
  await ensureColumn(db, 'items', 'folderId', 'TEXT')
  await ensureColumn(db, 'items', 'order', 'INTEGER')
  await ensureColumn(db, 'folders', 'viewMode', "TEXT NOT NULL DEFAULT 'list'")
  await ensureColumn(db, 'folders', 'viewModeManual', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn(db, 'pending_changes', 'folderId', 'TEXT')
  await ensureColumn(db, 'pending_changes', 'folderNameBefore', 'TEXT')
  await ensureColumn(db, 'pending_changes', 'folderNameAfter', 'TEXT')
  if (db.kind === 'postgres') {
    await db.pool.query(`DROP INDEX IF EXISTS items_user_project_idx`)
  }
  await ensureColumn(db, 'push_subscriptions', 'expirationTime', 'INTEGER')
  await ensureColumn(db, 'push_subscriptions', 'userAgent', 'TEXT')
  await ensureColumn(db, 'push_subscriptions', 'deviceLabel', 'TEXT')
  await ensureColumn(db, 'push_subscriptions', 'platform', 'TEXT')
  await ensureColumn(db, 'push_subscriptions', 'enabled', 'INTEGER NOT NULL DEFAULT 1')
  await ensureColumn(db, 'push_subscriptions', 'failureCount', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn(db, 'push_subscriptions', 'lastSeenAt', 'TEXT')
  await ensureColumn(db, 'push_subscriptions', 'lastSuccessAt', 'TEXT')
  await ensureColumn(db, 'push_subscriptions', 'lastFailureAt', 'TEXT')
  await ensureColumn(db, 'push_subscriptions', 'disabledAt', 'TEXT')
  await ensureColumn(db, 'notification_alerts', 'itemId', 'TEXT')
  await ensureColumn(db, 'notification_alerts', 'scheduledFor', 'TEXT')
  await ensureColumn(db, 'notification_alerts', 'deliveryStatus', "TEXT NOT NULL DEFAULT 'pending'")
  await ensureColumn(db, 'notification_alerts', 'acknowledgedAt', 'TEXT')
  await ensureColumn(db, 'google_accounts', 'driveRootFolderId', 'TEXT')
  await ensureColumn(db, 'google_accounts', 'driveInboxFolderId', 'TEXT')
  await ensureColumn(db, 'google_accounts', 'driveTrashFolderId', 'TEXT')
  await ensureColumn(db, 'folders', 'driveFolderId', 'TEXT')
  await ensureColumnType(db, 'google_accounts', 'expiresAt', 'BIGINT')
  await ensureColumnType(db, 'rate_limits', 'resetAt', 'BIGINT')
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
    folderId TEXT,
    areaId TEXT,
    parentId TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    backlinks TEXT NOT NULL DEFAULT '[]',
    localPath TEXT,
    syncHash TEXT,
    googleEventId TEXT,
    calendarEventId TEXT,
    "order" INTEGER,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    deletedAt TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS items_user_status_idx ON items (userId, status)`,
  `CREATE INDEX IF NOT EXISTS items_user_due_idx ON items (userId, dueDate)`,
  `CREATE INDEX IF NOT EXISTS items_user_folder_idx ON items (userId, folderId)`,
  `CREATE INDEX IF NOT EXISTS items_user_order_idx ON items (userId, "order")`,
  `CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    parentId TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    viewMode TEXT NOT NULL DEFAULT 'list',
    viewModeManual INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS folders_user_parent_idx ON folders (userId, parentId)`,
  `CREATE INDEX IF NOT EXISTS folders_user_order_idx ON folders (userId, "order")`,
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
    folderId TEXT,
    changeType TEXT NOT NULL,
    localPathBefore TEXT,
    localPathAfter TEXT,
    titleBefore TEXT,
    titleAfter TEXT,
    folderNameBefore TEXT,
    folderNameAfter TEXT,
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
    expiresAt BIGINT,
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
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    expirationTime INTEGER,
    userAgent TEXT,
    deviceLabel TEXT,
    platform TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    failureCount INTEGER NOT NULL DEFAULT 0,
    lastSeenAt TEXT,
    lastSuccessAt TEXT,
    lastFailureAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    disabledAt TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions (endpoint)`,
  `CREATE INDEX IF NOT EXISTS push_subscriptions_user_enabled_idx ON push_subscriptions (userId, enabled)`,
  `CREATE INDEX IF NOT EXISTS push_subscriptions_user_updated_idx ON push_subscriptions (userId, updatedAt)`,
  `CREATE TABLE IF NOT EXISTS notification_alerts (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    itemId TEXT,
    type TEXT NOT NULL,
    channel TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL,
    scheduledFor TEXT,
    deliveryStatus TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    acknowledgedAt TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS notification_alerts_user_ack_idx ON notification_alerts (userId, acknowledgedAt, createdAt)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS notification_alerts_dedupe_idx ON notification_alerts (userId, itemId, type, scheduledFor) WHERE itemId IS NOT NULL AND scheduledFor IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    id TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    resetAt BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cli_tokens (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    prefix TEXT NOT NULL,
    tokenHash TEXT NOT NULL,
    lastUsedAt TEXT,
    createdAt TEXT NOT NULL,
    revokedAt TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS cli_tokens_user_idx ON cli_tokens (userId)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS cli_tokens_prefix_idx ON cli_tokens (prefix)`,
  `CREATE TABLE IF NOT EXISTS drive_links (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    itemId TEXT NOT NULL,
    fileId TEXT NOT NULL,
    fileName TEXT NOT NULL,
    mimeType TEXT,
    size INTEGER,
    webViewLink TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS drive_links_user_item_idx ON drive_links (userId, itemId)`,
  `CREATE INDEX IF NOT EXISTS drive_links_user_file_idx ON drive_links (userId, fileId)`,
]

const postgresIdentifiers = [
  'driveRootFolderId',
  'driveInboxFolderId',
  'driveTrashFolderId',
  'driveFolderId',
  'webViewLink',
  'fileName',
  'fileId',
  'mimeType',
  'frontmatterChanges',
  'contentHashBefore',
  'contentHashAfter',
  'googleCalendarId',
  'calendarEventId',
  'push_subscriptions',
  'notification_alerts',
  'deliveryStatus',
  'acknowledgedAt',
  'contentMdBefore',
  'contentMdAfter',
  'linkedItemIds',
  'localPathBefore',
  'localPathAfter',
  'lastSuccessAt',
  'lastFailureAt',
  'failureCount',
  'expirationTime',
  'deviceLabel',
  'scheduledDate',
  'recurrence',
  'lastSeenAt',
  'lastUsedAt',
  'tokenHash',
  'revokedAt',
  'disabledAt',
  'userAgent',
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
  'folderNameBefore',
  'folderNameAfter',
  'riskLevel',
  'expiresAt',
  'folderId',
  'resetAt',
  'viewModeManual',
  'viewMode',
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
  return sql.replace(
    new RegExp(`(?<![A-Za-z0-9_"])${escaped}(?![A-Za-z0-9_"])`, 'g'),
    `"${identifier}"`,
  )
}

async function ensureColumn(
  db: DBClient,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  if (db.kind === 'postgres') {
    const result = await db.pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column],
    )
    if (result.rowCount === 0)
      await db.pool.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`)
    return
  }

  const rows = db.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!rows.some((row) => row.name === column)) {
    db.db.prepare(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`).run()
  }
}

async function ensureColumnType(
  db: DBClient,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  if (db.kind !== 'postgres') return

  const result = await db.pool.query(
    `SELECT data_type FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column],
  )
  const dataType = result.rows[0]?.['data_type']
  if (!dataType || String(dataType).toLowerCase() === definition.toLowerCase()) return

  await db.pool.query(
    `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE ${definition} USING "${column}"::${definition}`,
  )
}
