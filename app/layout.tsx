import type { Metadata } from 'next';
import './globals.css';
import AuroraBackground from '@/components/AuroraBackground';

export const metadata: Metadata = {
  title: 'MENTION - Sistem Peminjaman & Pengembalian Barang',
  description: 'Sistem inventarisasi, peminjaman, dan pengembalian barang operasional organisasi MENTION.',
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
      </body>
    </html>
  );
}
