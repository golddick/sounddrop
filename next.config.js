/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['ws', 'selfsigned', 'qrcode-terminal', 'chalk', 'mime-types'],
  },
  allowedDevOrigins: ['192.168.1.6', '192.168.1.*', '192.168.*.*'],
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ],
    }];
  },
};
module.exports = nextConfig;