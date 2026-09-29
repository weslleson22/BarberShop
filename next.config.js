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
    // Cache de navegação inteligente para transições instantâneas entre rotas
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.next/**'],
        aggregateTimeout: 200,
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

    // Em DESENVOLVIMENTO (local): Não cacheia páginas HTML/dados de API para refletir mudanças na hora,
    // mas permite que chunks estáticos com hash fiquem em memória evitando requisições duplicadas.
    if (!isProd) {
      return [
        {
          source: '/((?!_next/static|_next/image|icons|favicon.ico).*)',
          headers: [
            { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
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
