/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium-min", "sharp"],
    outputFileTracingIncludes: {
      "/api/generate-pdf-optimized": ["./node_modules/@sparticuz/chromium-min/**"],
      "/api/generate-pdf-optimized/": ["./node_modules/@sparticuz/chromium-min/**"],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externalPackages = ["@sparticuz/chromium-min", "puppeteer-core", "puppeteer"]
      if (Array.isArray(config.externals)) {
        config.externals.push(...externalPackages)
      } else if (config.externals) {
        config.externals = [config.externals, ...externalPackages]
      } else {
        config.externals = externalPackages
      }
    }
    return config
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
  trailingSlash: true,
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
