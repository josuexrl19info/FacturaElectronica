/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
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
