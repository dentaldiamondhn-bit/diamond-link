import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed static export to allow dynamic App Router routes such as Clerk sign-in
  trailingSlash: false, // Explicitly set to false to prevent redirect loops
  outputFileTracingRoot: __dirname, // Pin tracing to this project (stray home-dir package.json/node_modules confuse root inference and livelock builds)
  images: {
    unoptimized: true
  },
  eslint: {
    // ESLint errors in legacy code fail the build; lint runs separately via `npm run lint`.
    ignoreDuringBuilds: true
  },
};

export default nextConfig;
