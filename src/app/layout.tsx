import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AccentColorProvider } from "@/components/accent-color-provider";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: 'Eden Connexion — L\'alliance bénie commence par une rencontre vraie.',
  description: 'Plateforme matrimoniale haut de gamme dédiée aux célibataires chrétiens d\'Afrique et de la diaspora. Un sanctuaire numérique pour bâtir des foyers sur les fondements de la foi.',
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