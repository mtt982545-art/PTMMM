import './globals.css';
import { Suspense } from 'react';
import SWRegister from './(client)/sw-register';
export const viewport = {
  themeColor: '#FFD700',
};
export const metadata = {
  metadataBase: new URL('https://ptmmm.co'),
  title: 'PT Mitramulia Makmur (MMM Plastic)',
  description: 'Solusi kemasan plastik & kaleng cat premium untuk industri di Indonesia.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png'
  },
  keywords: ['Kemasan Plastik', 'Kaleng Cat', 'Solusi Industri', 'PT MMM', 'Mitramulia Makmur'],
  openGraph: {
    title: 'PT Mitramulia Makmur (MMM Plastic)',
    description: 'Solusi kemasan plastik & kaleng cat premium untuk industri di Indonesia.',
    url: 'https://ptmmm.co/',
    siteName: 'PT MMM Plastic',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512 }],
    locale: 'id_ID',
    type: 'website'
  },
  robots: { index: true, follow: true }
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen">
        {/* Skip-link untuk aksesibilitas */}
        <a href="#main" className="skip-link">Lewati ke konten</a>
        <SWRegister />
        <Suspense fallback={null}>
          <main id="main" role="main">{children}</main>
        </Suspense>
      </body>
    </html>
  );
}
