import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  // Le projet Tiwizi est déployé depuis la racine du dépôt sur Hostinger.
  // Garder le tracing ancré sur cette racine évite de prendre un mauvais workspace parent.
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    // Le build de production ne doit pas être bloqué par une configuration ESLint absente.
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
