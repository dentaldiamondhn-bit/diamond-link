/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed static export to allow dynamic App Router routes such as Clerk sign-in
  trailingSlash: false, // Explicitly set to false to prevent redirect loops
  images: {
    unoptimized: true
  },
};

export default nextConfig;
