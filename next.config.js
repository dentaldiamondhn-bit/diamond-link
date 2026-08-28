/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed static export to allow dynamic App Router routes such as Clerk sign-in
  trailingSlash: false, // Explicitly set to false to prevent redirect loops
  images: {
    unoptimized: true
  },
  eslint: {
    // ESLint errors in legacy code fail the build; lint runs separately via `npm run lint`.
    ignoreDuringBuilds: true
  },
};

export default nextConfig;
