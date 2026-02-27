/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase Server Action body size limit for file attachments
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
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
