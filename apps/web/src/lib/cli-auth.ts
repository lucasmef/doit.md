import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { CliTokenModel } from '@doit/db'
import { newCliTokenId } from '@doit/core'
import type { CliToken, PublicCliToken } from '@doit/types'

const TOKEN_PREFIX_LEN = 8

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function generateSecret(): string {
  return randomBytes(24).toString('base64url')
}

function generatePrefix(): string {
  return randomBytes(6).toString('base64url').slice(0, TOKEN_PREFIX_LEN)
}

export type GeneratedCliToken = {
  token: PublicCliToken
  plaintext: string
}

export async function generateCliToken(userId: string, name: string): Promise<GeneratedCliToken> {
  const prefix = generatePrefix()
  const secret = generateSecret()
  const plaintext = `doit_${prefix}_${secret}`
  const tokenHash = sha256(secret)
  const now = new Date().toISOString()

  const id = newCliTokenId()
  const doc: CliToken = {
    id,
    userId,
    name: name.trim() || 'CLI Token',
    prefix,
    tokenHash,
    createdAt: now,
  }

  await CliTokenModel.create(doc)

  const { tokenHash: _omit, ...publicToken } = doc
  return { token: publicToken, plaintext }
}

export async function listCliTokens(userId: string): Promise<PublicCliToken[]> {
  const rows = await CliTokenModel.find({ userId }).sort({ createdAt: -1 }).lean()
  return rows.map((r) => {
    const row = r as unknown as CliToken
    const { tokenHash: _omit, ...rest } = row
    return rest
  })
}

export async function revokeCliToken(userId: string, id: string): Promise<boolean> {
  const existing = (await CliTokenModel.findOne({ id, userId }).lean()) as unknown as
    | CliToken
    | null
  if (!existing) return false
  await CliTokenModel.findOneAndUpdate({ id }, { revokedAt: new Date().toISOString() })
  return true
}

export async function validateCliBearer(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null
  const match = /^Bearer\s+(doit_[A-Za-z0-9_-]+_[A-Za-z0-9_-]+)$/.exec(authHeader)
  if (!match || !match[1]) return null
  const plaintext = match[1]
  const parts = plaintext.split('_')
  if (parts.length < 3) return null
  const prefix = parts[1]
  const secret = parts.slice(2).join('_')
  if (!prefix || !secret) return null

  const row = (await CliTokenModel.findOne({ prefix }).lean()) as unknown as CliToken | null
  if (!row || row.revokedAt) return null

  const expected = Buffer.from(row.tokenHash, 'hex')
  const actual = Buffer.from(sha256(secret), 'hex')
  if (expected.length !== actual.length) return null
  if (!timingSafeEqual(expected, actual)) return null

  // Best-effort lastUsedAt update; no need to await failures.
  void CliTokenModel.findOneAndUpdate({ id: row.id }, { lastUsedAt: new Date().toISOString() })
    .lean()
    .then(
      () => undefined,
      () => undefined,
    )

  return row.userId
}
