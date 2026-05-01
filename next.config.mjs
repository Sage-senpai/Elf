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
  },
  webpack: (config) => {
    // wagmi / walletconnect pull in optional native deps that don't exist
    // in a browser bundle. Mark them as fallbacks so the build succeeds.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      lokijs: false,
      encoding: false,
      "@metamask/connect-evm": false,
      accounts: false
    };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  }
};

export default nextConfig;
