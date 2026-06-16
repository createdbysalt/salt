/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PostHog reverse proxy uses trailing paths — do not normalize away
  skipTrailingSlashRedirect: true,
  // Transpile Sanity packages for React 19 compatibility
  transpilePackages: [
    'next-sanity',
    'sanity',
    '@sanity/presentation',
    '@sanity/vision',
    '@sanity/ui',
    '@sanity/icons',
    '@sanity/visual-editing',
    '@sanity/code-input',
  ],
  // Increase Server Action body size limit for file attachments
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "logos-world.net",
      },
      {
        protocol: "https",
        hostname: "<project-ref>.supabase.co",
      },
    ],
  },
  webpack: config => {
    config.plugins.push(new VeliteWebpackPlugin())
    return config
  },
};

class VeliteWebpackPlugin {
  static started = false
  /** @param {import('webpack').Compiler} compiler */
  apply(compiler) {
    // Runs once before compilation - handles both server and client builds
    compiler.hooks.beforeCompile.tapPromise('VeliteWebpackPlugin', async () => {
      if (VeliteWebpackPlugin.started) return
      VeliteWebpackPlugin.started = true
      const dev = compiler.options.mode === 'development'
      const { build } = await import('velite')
      await build({ watch: dev, clean: !dev })
    })
  }
}

module.exports = nextConfig;
