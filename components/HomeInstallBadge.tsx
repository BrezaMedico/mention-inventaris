'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Check } from 'lucide-react';

export default function HomeInstallBadge() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true;
      setIsStandalone(standalone);

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }
  }, []);

  if (isStandalone) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      // Dispatched custom event or alert guide
      alert(
        'Untuk memasang aplikasi MENTION di HP:\n\n' +
        '• Android (Chrome): Ketuk tombol titik tiga di pojok kanan atas browser, lalu pilih "Pasang aplikasi" atau "Tambahkan ke Layar Utama".\n\n' +
        '• iPhone (Safari): Ketuk tombol Bagikan (Share) di bagian bawah, lalu pilih "Tambahkan ke Layar Utama".'
      );
    }
  };

  return (
    <div className="mt-8 w-full max-w-2xl animate-in fade-in">
      <button
        onClick={handleInstall}
        className="w-full p-4 rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-800 hover:border-mention-yellow/60 transition-all flex items-center justify-between gap-3 text-left group active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mention-yellow/10 border border-mention-yellow/25 flex items-center justify-center text-mention-yellow shrink-0 group-hover:scale-105 transition-transform">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Jadikan Aplikasi di Layar Utama HP</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-mention-yellow/20 text-mention-yellow border border-yellow-500/30">
                PWA Siap Pakai
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
              Buka cepat tanpa browser, layar penuh, & hemat kuota
            </div>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-neutral-800 group-hover:bg-mention-yellow group-hover:text-black text-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0">
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pasang</span>
        </div>
      </button>
    </div>
  );
}
