import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AccentColorProvider } from "@/components/accent-color-provider";
import { LanguageProvider } from "@/lib/i18n";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  // Base des URL absolues (canonical, Open Graph…) : le domaine principal.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Garden of Alliance — L'alliance bénie commence par une rencontre vraie.",
    template: '%s · Garden of Alliance',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Pas de canonical ici : défini au layout racine, il serait hérité tel quel par
  // chaque page et les désignerait toutes comme doublons de l'accueil. Chaque
  // page publique déclare le sien (voir les layout.tsx de chaque route).
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'fr_FR',
    alternateLocale: ['en_US'],
    title: "Garden of Alliance — L'alliance bénie commence par une rencontre vraie.",
    description: SITE_DESCRIPTION,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Garden of Alliance — rencontres chrétiennes en vue du mariage.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Garden of Alliance',
    description: SITE_DESCRIPTION,
    images: ['/og-image.jpg'],
  },
  // Balise <meta name="google-site-verification"> (Google Search Console).
  verification: {
    google: 'blrfvYQPdNNrspes5ZgqqAG1RjHK_o_DuoCajXKv_4o',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#FAF8F3',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
        <body className="font-body antialiased bg-background text-foreground">
        <LanguageProvider>
          <AccentColorProvider>
            {children}
          </AccentColorProvider>
        </LanguageProvider>
        <Toaster />
      </body>
    </html>
  );
}