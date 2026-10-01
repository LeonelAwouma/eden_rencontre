import path from 'node:path';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Racine explicite de l'espace de travail : un package-lock.json traîne dans
  // C:\Users\MARCOM, et Next inférait ce dossier-là comme racine du projet.
  turbopack: {
    root: path.join(__dirname),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // L'Académie admin vit désormais dans la médiathèque.
  async redirects() {
    return [
      { source: '/admin/formation', destination: '/admin/mediatheque/academie', permanent: true },
      { source: '/admin/formation/:path*', destination: '/admin/mediatheque/academie/:path*', permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
