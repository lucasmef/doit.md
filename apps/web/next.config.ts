import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@clarity/core', '@clarity/types', '@clarity/db', '@clarity/ui'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

export default nextConfig
