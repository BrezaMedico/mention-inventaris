'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone, Check, Zap, Sparkles, ArrowDownToLine } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.log('SW registration error:', err));
    }

    // 2. Check if already running in standalone PWA mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) return;

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isIosDevice);

    // 4. Check dismissal in session
    const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');

    // 5. Handle Android/Desktop beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 1800);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If on iOS and not dismissed, show prompt after delay
    if (isIosDevice && !dismissed) {
      setTimeout(() => setShowPrompt(true), 2200);
    }

    // Handle app installed event
    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 4000);
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      alert(
        'Untuk memasang aplikasi MENTION di HP:\n\n' +
        '1. Ketuk tombol Menu (titik tiga ⋮) di pojok kanan atas browser.\n' +
        '2. Pilih "Pasang aplikasi" atau "Tambahkan ke Layar Utama".'
      );
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Toast Notifikasi Berhasil Terinstall */}
      {installedSuccess && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md p-4 rounded-2xl bg-[#12131b] border-2 border-green-500 text-white shadow-2xl flex items-center gap-3.5 animate-in fade-in slide-in-from-bottom-5">
          <div className="w-11 h-11 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <div className="text-sm font-black text-white">Aplikasi Berhasil Terpasang!</div>
            <div className="text-xs text-neutral-300">
              Sekarang Anda bisa membukanya langsung dari layar utama HP.
            </div>
          </div>
        </div>
      )}

      {/* Floating PWA Card / Bottom Sheet (Khusus Tampilan HP) */}
      {showPrompt && !installedSuccess && (
        <aside
          aria-label="Install App Banner"
          className="fixed bottom-3 inset-x-3 sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-md z-50 p-5 rounded-3xl bg-gradient-to-b from-[#181926]/98 to-[#0e0f17]/98 backdrop-blur-2xl border-2 border-mention-yellow/50 shadow-2xl shadow-yellow-500/20 ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-6 duration-200"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              {/* App Icon */}
              <div className="w-14 h-14 rounded-2xl bg-black border-2 border-mention-yellow/80 p-1.5 shadow-lg shadow-yellow-500/20 shrink-0 flex items-center justify-center">
                <img
                  src="/icons/icon-192.png"
                  alt="MENTION App"
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black bg-mention-yellow px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Aplikasi Resmi</span>
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400">PWA Siap Pasang</span>
                </div>
                <h4 className="text-base font-black text-white leading-tight">
                  MENTION Inventaris
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Pasang langsung ke Layar Utama HP
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="p-1.5 text-neutral-400 hover:text-white rounded-xl bg-neutral-800/60 hover:bg-neutral-800 transition-colors"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Feature Highlights Pills */}
          <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-xs">
            <div className="flex items-center gap-2 text-neutral-300">
              <div className="w-6 h-6 rounded-lg bg-yellow-500/15 text-mention-yellow flex items-center justify-center shrink-0">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold leading-tight">
                Layar Penuh (Full App)
              </span>
            </div>

            <div className="flex items-center gap-2 text-neutral-300">
              <div className="w-6 h-6 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold leading-tight">
                Buka Cepat 1-Ketukan
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 py-3 px-4 min-h-[46px] rounded-2xl bg-gradient-to-r from-mention-yellow via-yellow-400 to-mention-yellow text-black font-black text-xs uppercase tracking-wider hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/25 cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4 stroke-[3]" />
              <span>Pasang Aplikasi di HP</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="py-3 px-4 min-h-[46px] rounded-2xl border border-neutral-700 bg-neutral-800/80 text-neutral-300 text-xs font-bold hover:text-white active:scale-[0.98] transition-colors"
            >
              Nanti
            </button>
          </div>
        </aside>
      )}

      {/* Modal Panduan Khusus iOS Safari */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm rounded-3xl bg-[#14151c] border-2 border-mention-yellow/50 p-6 space-y-4 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-mention-yellow text-black flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-black text-white">Pasang di iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Ikuti 2 langkah mudah di bawah untuk memunculkan ikon MENTION di layar utama iPhone Anda:
            </p>

            <div className="space-y-3 text-xs bg-neutral-900/90 p-4 rounded-2xl border border-neutral-800">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-mention-yellow/15 text-mention-yellow border border-yellow-500/30 flex items-center justify-center shrink-0 font-black text-sm">
                  1
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    Ketuk tombol Bagikan <Share2 className="w-4 h-4 text-blue-400 inline" />
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-0.5 leading-relaxed">
                    Ikon kotak berpanah ke atas di bilah bawah Safari.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-mention-yellow/15 text-mention-yellow border border-yellow-500/30 flex items-center justify-center shrink-0 font-black text-sm">
                  2
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    Pilih &apos;Tambahkan ke Layar Utama&apos; <PlusSquare className="w-4 h-4 text-mention-yellow inline" />
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-0.5 leading-relaxed">
                    Gulir ke bawah pada menu opsi, lalu ketuk tombol &quot;Tambahkan ke Layar Utama&quot;.
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 min-h-[44px] rounded-2xl bg-mention-yellow text-black font-extrabold text-xs uppercase tracking-wider hover:bg-yellow-400 active:scale-[0.98] transition-all"
            >
              Saya Mengerti, Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
