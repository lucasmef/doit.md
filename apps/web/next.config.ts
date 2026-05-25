import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: process.env.DOIT_SKIP_NEXT_BUILD_VALIDATION === '1',
  },
  typescript: {
    ignoreBuildErrors: process.env.DOIT_SKIP_NEXT_BUILD_VALIDATION === '1',
  },
  serverExternalPackages: ['better-sqlite3', 'pg'],
  transpilePackages: ['@doit/core', '@doit/types', '@doit/db', '@doit/sync', '@doit/ui'],
  experimental: {
    cpus: 1,
  },
}

export default nextConfig
