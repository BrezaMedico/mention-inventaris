'use client';

import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function HomeInstallBadge() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);

      const ua = window.navigator.userAgent.toLowerCase();
      setIsIos(/iphone|ipad|ipod/.test(ua));

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
    } else if (isIos) {
      alert(
        'Cara pasang di iPhone / iPad:\n\n' +
        '1. Ketuk tombol Bagikan (Share) di Safari.\n' +
        '2. Pilih "Tambahkan ke Layar Utama".'
      );
    } else {
      alert(
        'Cara pasang di HP Android:\n\n' +
        '1. Ketuk ikon titik tiga di kanan atas browser.\n' +
        '2. Pilih "Pasang aplikasi" atau "Tambahkan ke Layar Utama".'
      );
    }
  };

  return (
    <div className="mt-8 w-full max-w-2xl">
      <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-black border border-neutral-800 p-1.5 shrink-0 flex items-center justify-center">
            <img
              src="/icons/icon-192.png"
              alt="MENTION Icon"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Pasang Aplikasi di HP
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Buka inventaris lebih cepat & layar penuh langsung dari layar utama ponsel.
            </p>
          </div>
        </div>

        <button
          onClick={handleInstall}
          type="button"
          className="w-full sm:w-auto px-4 py-2.5 min-h-[40px] rounded-xl bg-mention-yellow hover:bg-mention-yellowDark text-black text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Pasang</span>
        </button>
      </div>
    </div>
  );
}
