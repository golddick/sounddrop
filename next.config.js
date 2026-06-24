/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['ws', 'selfsigned', 'qrcode-terminal', 'chalk', 'mime-types'],
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Cross-Origin-Opener-Policy',  value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
      ],
    }];
  },
};
module.exports = nextConfig;
