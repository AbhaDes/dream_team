/** @type {import('next').NextConfig} */
const nextConfig = {
  // The repo has a second lockfile at its root (the Express API), which makes
  // Next.js infer the wrong workspace root — pin it to this directory.
  turbopack: {
    root: import.meta.dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL 
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
          : 'http://localhost:3001/api/:path*',
      },
    ]
  }
}

export default nextConfig
