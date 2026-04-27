import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://matchmakers.cloud'),
  title: {
    default: 'Knot — el dating no se ve, se siente',
    template: '%s · Knot',
  },
  description: 'El primer agente de IA al servicio del corazón humano. Tres maneras nuevas de conectar: voz, palabras, IA matchmaker.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Knot',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Knot — el dating no se ve, se siente',
    description: 'El primer agente de IA al servicio del corazón humano.',
    url: 'https://matchmakers.cloud',
    siteName: 'Knot',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
    locale: 'es_LA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Knot — el dating no se ve, se siente',
    description: 'El primer agente de IA al servicio del corazón humano.',
    images: ['/og.png'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0e0d12',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-bg text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
