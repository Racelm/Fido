import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  // Dieser Monorepo-Setup hat sowohl /app/yarn.lock als auch /app/fido/pnpm-lock.yaml.
  // Ohne outputFileTracingRoot wählt Next.js den /app/-Root und tracked die falschen
  // Dateien — bricht potentiell den Build auf Hostinger.
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    // Hostinger führt kein `next lint` separat aus (es gibt kein ESLint-Setup),
    // aber falls jemand `next build` lokal mit --strict baut, nicht blockieren.
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
