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
  // output: 'export', // Comentado para desarrollo - permite API routes dinámicas
  trailingSlash: true,
  // distDir: 'out', // Comentado para desarrollo
}

export default nextConfig
