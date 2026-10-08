'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone, Check } from 'lucide-react';

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

    // 2. Check if already installed & running in standalone mode
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
        // Show after 2 seconds delay for great user experience
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If on iOS and not dismissed, show prompt after delay
    if (isIosDevice && !dismissed) {
      setTimeout(() => setShowPrompt(true), 2500);
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
      // Fallback guide if browser already dismissed or doesn't support automatic prompt
      alert('Untuk memasang aplikasi: Buka menu browser (titik 3 di kanan atas) dan pilih "Pasang aplikasi" atau "Tambahkan ke Layar Utama".');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  // If already opened as installed standalone PWA, don't show prompts
  if (isStandalone) return null;

  return (
    <>
      {/* Toast Notifikasi Berhasil Terinstall */}
      {installedSuccess && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md p-4 rounded-2xl bg-neutral-900 border border-green-500/70 text-white shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Aplikasi Berhasil Dipasang!</div>
            <div className="text-xs text-neutral-400">
              Buka aplikasi MENTION langsung dari layar utama HP Anda.
            </div>
          </div>
        </div>
      )}

      {/* Floating PWA Banner (Khusus HP / Mobile Viewport) */}
      {showPrompt && !installedSuccess && (
        <aside
          aria-label="Install App"
          className="fixed bottom-3 inset-x-3 sm:bottom-5 sm:right-5 sm:left-auto sm:max-w-md z-50 p-4 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-mention-yellow/40 shadow-2xl shadow-black/80 ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-start gap-3.5">
            {/* App Icon */}
            <div className="w-12 h-12 rounded-xl bg-black border border-mention-yellow/60 flex items-center justify-center shrink-0 shadow-md p-2">
              <img
                src="/icons/icon-192.png"
                alt="MENTION App"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-mention-yellow bg-yellow-500/15 border border-yellow-500/30 px-2 py-0.5 rounded-md">
                  Aplikasi HP Siap Jadi
                </span>
                <button
                  onClick={handleDismiss}
                  className="p-1 text-neutral-400 hover:text-white transition-colors"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-sm font-extrabold text-white mt-1">
                Jadikan Aplikasi di HP
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                Pasang ke Layar Utama HP untuk akses cepat satu ketukan, bebas bar browser, dan tampilan persis aplikasi native.
              </p>

              {/* Action Buttons */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 py-2.5 px-4 min-h-[42px] rounded-xl bg-mention-yellow hover:bg-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-yellow-500/20 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Pasang Aplikasi</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="py-2.5 px-3 min-h-[42px] rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 text-xs font-semibold hover:text-white active:scale-[0.98] transition-colors"
                >
                  Nanti
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Modal Panduan Khusus iOS Safari */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm rounded-3xl bg-[#14151c] border border-neutral-700 p-6 space-y-4 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-mention-yellow" />
                <h3 className="text-base font-bold text-white">Pasang di iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Ikuti 2 langkah mudah berikut untuk menambahkan aplikasi MENTION ke layar utama iPhone Anda:
            </p>

            <div className="space-y-3 text-xs bg-neutral-900/80 p-3.5 rounded-2xl border border-neutral-800">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-mention-yellow shrink-0 font-bold">
                  1
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    Ketuk tombol Bagikan <Share2 className="w-3.5 h-3.5 text-blue-400 inline" />
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-0.5">
                    Tombol kotak dengan panah ke atas di bagian bawah layar Safari.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-mention-yellow shrink-0 font-bold">
                  2
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    Pilih &apos;Tambahkan ke Layar Utama&apos; <PlusSquare className="w-3.5 h-3.5 text-mention-yellow inline" />
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-0.5">
                    Gulir sedikit ke bawah pada menu bagikan, lalu ketuk &quot;Tambahkan ke Layar Utama&quot;.
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 min-h-[42px] rounded-xl bg-mention-yellow text-black font-extrabold text-xs uppercase tracking-wider hover:bg-yellow-400 transition-all"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
