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
