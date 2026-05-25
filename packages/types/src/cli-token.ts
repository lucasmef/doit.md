export type CliToken = {
  id: string
  userId: string
  name: string
  prefix: string
  tokenHash: string
  lastUsedAt?: string
  createdAt: string
  revokedAt?: string
}

export type PublicCliToken = Omit<CliToken, 'tokenHash'>

export type CreateCliTokenInput = {
  name: string
}
