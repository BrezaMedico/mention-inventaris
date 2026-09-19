import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 max-w-4xl mx-auto w-full">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
            Inventaris <span className="text-mention-yellow">MENTION</span>
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base">
            Peminjaman dan pengembalian barang operasional.
          </p>
        </div>

        {/* 2 Main Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
          {/* Action 1: Pinjam Barang */}
          <Link
            href="/borrow"
            className="group flex flex-col justify-between p-7 sm:p-8 rounded-2xl bg-neutral-900/85 backdrop-blur-md border border-neutral-800/80 hover:border-mention-yellow transition-all duration-200 hover:bg-neutral-850/90 shadow-xl"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-mention-yellow text-black flex items-center justify-center mb-5 font-bold shadow-lg shadow-mention-yellow/20">
                <ArrowUpRight className="w-6 h-6 stroke-[2.5] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5">
                Pinjam Barang
              </h2>
              <p className="text-neutral-400 text-xs sm:text-sm">
                Ajukan pinjaman dan cek kondisi awal barang.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mention-yellow">
              <span>Mulai Pinjam</span>
              <span className="text-sm">→</span>
            </div>
          </Link>

          {/* Action 2: Kembalikan Barang */}
          <Link
            href="/return"
            className="group flex flex-col justify-between p-7 sm:p-8 rounded-2xl bg-neutral-900/85 backdrop-blur-md border border-neutral-800/80 hover:border-white transition-all duration-200 hover:bg-neutral-850/90 shadow-xl"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center mb-5 font-bold">
                <ArrowDownLeft className="w-6 h-6 stroke-[2.5] group-hover:-translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5">
                Kembalikan Barang
              </h2>
              <p className="text-neutral-400 text-xs sm:text-sm">
                Kembalikan barang dan cek kelengkapan.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300 group-hover:text-white transition-colors">
              <span>Mulai Pengembalian</span>
              <span className="text-sm">→</span>
            </div>
          </Link>
        </div>
      </main>

      <footer className="w-full border-t border-mention-border/60 py-5 text-center text-xs text-neutral-500">
        Created by Breza Artha Medico XII-SIJA
      </footer>
    </div>
  );
}
