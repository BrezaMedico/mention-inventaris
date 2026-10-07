'use client';

import Link from 'next/link';
import { X, ShieldAlert, Lock, ArrowRight } from 'lucide-react';

interface AdminRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminRequiredModal({ isOpen, onClose }: AdminRequiredModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm rounded-2xl bg-[#14151c] border border-neutral-700 shadow-2xl overflow-hidden flex flex-col p-5 sm:p-6 text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-12 h-12 rounded-2xl bg-mention-yellow/10 border border-mention-yellow/30 flex items-center justify-center text-mention-yellow">
          <Lock className="w-6 h-6 stroke-[2.2]" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-white">
            Akses Khusus Admin
          </h3>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Pengelolaan tugas kalender (tambah, edit, dan hapus) hanya dapat dilakukan oleh Admin yang sudah login.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors order-2 sm:order-1"
          >
            Tutup
          </button>
          <Link
            href="/admin/login?from=/calendar"
            className="w-full py-2.5 rounded-xl bg-mention-yellow text-black hover:bg-yellow-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-yellow-500/10 order-1 sm:order-2"
          >
            <span>Login Admin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
