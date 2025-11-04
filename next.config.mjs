import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  experimental: {
    // Empty for now - add valid experimental features as needed
  },
  env: {
    NEXT_PHASE: process.env.NEXT_PHASE || '',
  },
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  webpack: (config, { isServer }) => {
    config.externals.push({
      'mysql2': 'commonjs mysql2'
    })

    config.resolve.alias = {
      ...config.resolve.alias,
      '@neondatabase/serverless': path.resolve(__dirname, 'lib/db.ts'),
    }

    return config
  }
}

export default nextConfig
