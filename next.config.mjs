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
  // Configuración para Firebase Hosting
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
}

export default nextConfig
