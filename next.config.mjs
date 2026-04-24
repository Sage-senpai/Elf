/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "@0glabs/0g-ts-sdk",
      "@0glabs/0g-serving-broker",
      "ethers",
      "postgres",
      "drizzle-orm"
    ]
  }
};

export default nextConfig;
