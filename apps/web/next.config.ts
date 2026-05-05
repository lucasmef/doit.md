import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@doit/core', '@doit/types', '@doit/db', '@doit/sync', '@doit/ui'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

export default nextConfig
