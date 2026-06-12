/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "sharp"],
  },
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
  async redirects() {
    return [
      {
        source: "/dashboard/settings/general/profile",
        destination: "/dashboard/settings/profile",
        permanent: true,
      },
      {
        source: "/dashboard/settings/users-roles",
        destination: "/dashboard/settings/users-roles/users",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
