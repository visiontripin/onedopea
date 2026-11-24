/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  poweredByHeader: false,
  allowedDevOrigins: ['*.e2b.app'],
};

export default nextConfig;
