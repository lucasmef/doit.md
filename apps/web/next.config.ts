import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['mongoose', 'mongodb'],
  transpilePackages: ['@doit/core', '@doit/types', '@doit/db', '@doit/sync', '@doit/ui'],
}

export default nextConfig
