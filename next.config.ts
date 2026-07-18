/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack/Webpack'in iyzipay paketini kurcalamasını ve çökertmesini engeller
  serverExternalPackages: ['iyzipay'],
};

export default nextConfig;