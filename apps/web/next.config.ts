import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'pg'],
  transpilePackages: ['@doit/core', '@doit/types', '@doit/db', '@doit/sync', '@doit/ui'],
  experimental: {
    cpus: 1,
  },
}

export default nextConfig
