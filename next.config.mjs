/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle (.next/standalone) for the VPS deploy.
  output: 'standalone',
};

export default nextConfig;
