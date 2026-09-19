'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Loan } from '@/types';
import { CheckCircle2, Home, Loader2, Package } from 'lucide-react';

function BorrowSuccessContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchLoan() {
      try {
        const res = await fetch(`/api/loans?id=${id}`);
        const data = await res.json();
        if (data.success) {
          setLoan(data.data);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchLoan();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400 text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-mention-yellow mb-2" />
        <p>Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto px-4 py-12">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 text-center shadow-xl">
        <div className="w-12 h-12 rounded-full bg-green-950/80 border border-green-500/40 text-green-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white mb-1">
          Peminjaman Berhasil
        </h1>
        <p className="text-neutral-400 text-xs mb-6">
          Barang berhasil dicatat sebagai dipinjam.
        </p>

        {loan && (
          <div className="text-left bg-neutral-950 rounded-xl p-4 border border-neutral-800 mb-6 space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-neutral-500">Kode</span>
              <span className="font-mono font-bold text-white bg-neutral-800 px-2 py-0.5 rounded text-[11px]">
                {loan.loan_code}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-neutral-500">Peminjam</span>
              <span className="font-bold text-white">
                {loan.member?.name} ({loan.member?.generation?.name})
              </span>
            </div>

            <div className="border-b border-neutral-800 pb-2">
              <span className="text-neutral-500 block mb-1">Barang:</span>
              <ul className="space-y-1">
                {loan.items?.map((li) => (
                  <li key={li.id} className="flex items-center gap-1.5 text-white font-medium">
                    <Package className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{li.item?.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-neutral-500">Kembali</span>
              <span className="text-white">{loan.expected_return_date}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-neutral-500">PIC</span>
              <span className="text-white font-medium">{loan.initial_checker?.name}</span>
            </div>
          </div>
        )}

        <Link
          href="/"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-mention-yellow text-black font-extrabold text-xs uppercase tracking-wider hover:bg-mention-yellowDark transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Selesai / Beranda</span>
        </Link>
      </div>
    </div>
  );
}

export default function BorrowSuccessPage() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col text-white">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <Suspense fallback={<div className="text-center py-20 text-neutral-400 text-xs">Memuat...</div>}>
          <BorrowSuccessContent />
        </Suspense>
      </main>
    </div>
  );
}
