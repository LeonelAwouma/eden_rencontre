import path from 'node:path';
import type {NextConfig} from 'next';

const FACE_ANALYSIS_FILES = [
  './node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm',
  './public/models/**/*',
];

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
  // Analyse des visages côté serveur (src/lib/face-verification-server.ts).
  // Regroupé par le bundler, TensorFlow cherchait ses fichiers .wasm dans
  // .next/server/chunks/ où ils ne sont pas copiés : il retombait alors sur
  // le calcul en JavaScript pur, des dizaines de fois plus lent (> 60 s par
  // inscription). Chargés depuis node_modules, ils sont là où il les attend.
  serverExternalPackages: ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-wasm', '@vladmandic/face-api'],
  // Fichiers lus à l'exécution (non détectés par le traçage de Vercel) :
  // binaires .wasm et modèles de visage.
  outputFileTracingIncludes: {
    '/api/auth/register': FACE_ANALYSIS_FILES,
    '/api/auth/google-onboarding': FACE_ANALYSIS_FILES,
    '/api/admin/users/*/reverify-selfie': FACE_ANALYSIS_FILES,
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
