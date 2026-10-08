import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuroraBackground from '@/components/AuroraBackground';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';

export const metadata: Metadata = {
  title: 'MENTION - Sistem Peminjaman & Pengembalian Barang',
  description: 'Sistem inventarisasi, peminjaman, dan pengembalian barang operasional organisasi MENTION.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MENTION',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#070708',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-[#070708] text-white antialiased selection:bg-mention-yellow selection:text-black min-h-screen relative overflow-x-hidden">
        <AuroraBackground />
        <div className="relative z-10 flex flex-col min-h-screen w-full">
          {children}
        </div>
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
