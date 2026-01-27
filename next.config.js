/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Commented out to allow dynamic routes
  trailingSlash: false, // Explicitly set to false to prevent redirect loops
  images: {
    unoptimized: true
  },
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./clerk.broken/**/*']
    }
  }
};

export default nextConfig;
