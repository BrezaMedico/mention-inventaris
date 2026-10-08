'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, CheckCircle2, Zap, ShieldCheck, ArrowDownToLine } from 'lucide-react';

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
        'Cara Pasang di iPhone / iPad:\n\n' +
        '1. Ketuk tombol Bagikan (Share ⎋) di bilah bawah Safari.\n' +
        '2. Gulir ke bawah lalu pilih "Tambahkan ke Layar Utama (Add to Home Screen ⊞)".\n\n' +
        'Aplikasi MENTION akan langsung muncul di layar depan iPhone Anda!'
      );
    } else {
      alert(
        'Cara Pasang di HP Android:\n\n' +
        '1. Ketuk tombol Titik Tiga (⋮) di pojok kanan atas browser Chrome/Edge.\n' +
        '2. Pilih "Pasang aplikasi" atau "Tambahkan ke Layar Utama".\n\n' +
        'Aplikasi siap digunakan seperti aplikasi HP biasa!'
      );
    }
  };

  return (
    <div className="mt-8 w-full max-w-2xl animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#181924]/95 to-[#0e0f15]/95 backdrop-blur-xl border-2 border-mention-yellow/40 p-5 sm:p-6 shadow-2xl shadow-yellow-500/10 ring-1 ring-white/10 group">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-mention-yellow to-transparent opacity-80" />
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-mention-yellow/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* Left: App Icon & Details */}
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {/* App Squircle Icon */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-black border-2 border-mention-yellow/80 p-2 shadow-xl shadow-yellow-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <img
                  src="/icons/icon-192.png"
                  alt="MENTION App Icon"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-mention-yellow text-black flex items-center justify-center font-bold text-[10px] shadow-md">
                ✓
              </div>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-black bg-mention-yellow px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Smartphone className="w-3 h-3" />
                  <span>Aplikasi HP</span>
                </span>
                <span className="text-[10px] font-bold text-neutral-400">
                  Android & iPhone
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                <span>MENTION Inventaris</span>
              </h3>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-300 mt-1">
                <span className="flex items-center gap-1 text-green-400 font-semibold">
                  <Zap className="w-3 h-3" />
                  <span>Layar Penuh</span>
                </span>
                <span className="text-neutral-600">•</span>
                <span className="text-neutral-400">Buka 1-Ketukan</span>
                <span className="text-neutral-600">•</span>
                <span className="text-neutral-400">Ringan &lt;1MB</span>
              </div>
            </div>
          </div>

          {/* Right: Primary Call to Action Button */}
          <div className="w-full sm:w-auto shrink-0 flex flex-col items-center sm:items-end gap-1.5">
            <button
              onClick={handleInstall}
              type="button"
              className="w-full sm:w-auto px-6 py-3 min-h-[46px] rounded-2xl bg-gradient-to-r from-mention-yellow via-yellow-400 to-mention-yellow text-black font-black text-xs uppercase tracking-wider hover:brightness-105 active:scale-[0.98] transition-all shadow-xl shadow-yellow-500/25 flex items-center justify-center gap-2 group/btn cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4 stroke-[3] group-hover/btn:translate-y-0.5 transition-transform" />
              <span>Pasang ke Layar HP</span>
            </button>
            <span className="text-[10px] text-neutral-400 font-medium text-center sm:text-right">
              Gratis • Langsung aktif di homescreen
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
