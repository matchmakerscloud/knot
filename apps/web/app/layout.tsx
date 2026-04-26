import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Knot — el dating no se ve, se siente',
  description: 'Tres maneras nuevas de conectar: voz, palabras, IA matchmaker.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
