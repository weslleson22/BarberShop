const path = require('path');
const os = require('os');

// Detecta dinamicamente todos os IPs locais da máquina (Wi-Fi, Ethernet, VMs, loopback)
// e adiciona padrões de sub-rede válidos para o Next.js 15 dev server (sem afetar produção).
function getLocalDevOrigins() {
  const origins = new Set([
    'localhost',
    '127.0.0.1',
    '*.local',
    '192.168.*.*',
    '10.*.*.*',
    '172.16.*.*',
  ]);

  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' || iface.family === 4) {
          origins.add(iface.address);
          const parts = iface.address.split('.');
          if (parts.length === 4) {
            origins.add(`${parts[0]}.${parts[1]}.*.*`);
            origins.add(`${parts[0]}.${parts[1]}.${parts[2]}.*`);
          }
        }
      }
    }
  } catch {
    // Continua com valores padrão se interfaces de rede não puderem ser lidas
  }

  return Array.from(origins);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: getLocalDevOrigins(),
  experimental: {
    // No Next.js 15, zera o cache de navegação do cliente para refletir alterações instantaneamente no dev
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Garante detecção imediata de alterações de arquivos no Windows (mesmo em pastas como Documents/OneDrive)
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
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
    const isProd = process.env.NODE_ENV === 'production';

    // Em DESENVOLVIMENTO (local): NUNCA permitir cache imutável no navegador!
    // Forçar no-store em todos os assets locais para garantir que modificações sejam refletidas na hora
    // sem precisar trocar de porta ou limpar o cache do navegador.
    if (!isProd) {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
            { key: 'Pragma', value: 'no-cache' },
            { key: 'Expires', value: '0' },
          ],
        },
      ];
    }

    // Em PRODUÇÃO (build real): Aplicar cache imutável seguro para arquivos estáticos com hash de build
    return [
      {
        source: '/((?!_next/static|_next/image|icons|favicon.ico|manifest.json).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
