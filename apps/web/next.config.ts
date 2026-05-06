import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@doit/core', '@doit/types', '@doit/db', '@doit/sync', '@doit/ui'],
}

export default nextConfig
