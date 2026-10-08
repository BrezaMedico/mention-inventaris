import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MENTION - Sistem Inventaris & Peminjaman',
    short_name: 'MENTION',
    description: 'Aplikasi Inventarisasi, Peminjaman & Pengembalian Barang MENTION',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#070708',
    theme_color: '#070708',
    orientation: 'portrait-primary',
    categories: ['productivity', 'utilities', 'business'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Pinjam Barang',
        url: '/borrow',
        description: 'Ajukan peminjaman barang inventaris',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Kembalikan Barang',
        url: '/return',
        description: 'Kembalikan barang pinjaman',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Kalender Tugas',
        url: '/calendar',
        description: 'Lihat agenda dan deadline tugas',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
