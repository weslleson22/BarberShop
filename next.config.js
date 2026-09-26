const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: ['192.168.*', 'localhost', '127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Páginas e rotas de API: nunca servir versão em cache do navegador/CDN,
        // garantindo que cada deploy seja sempre buscado do servidor.
        source: '/((?!_next/static|_next/image|icons|favicon.ico|manifest.json).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        // Assets do build (_next/static) têm hash no nome do arquivo, então
        // podem (e devem) ser cacheados de forma agressiva e imutável.
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
