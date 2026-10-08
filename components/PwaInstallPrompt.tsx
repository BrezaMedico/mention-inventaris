'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Check } from 'lucide-react';

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
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (isIosDevice && !dismissed) {
      setTimeout(() => setShowPrompt(true), 2500);
    }

    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      setTimeout(() => setInstalledSuccess(false), 4000);
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
        '1. Ketuk menu browser (titik tiga ⋮) di kanan atas.\n' +
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
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm p-3.5 rounded-2xl bg-neutral-900 border border-neutral-700 text-white shadow-xl flex items-center gap-3 animate-in fade-in">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-white">Aplikasi Berhasil Dipasang</div>
            <div className="text-neutral-400">Buka langsung dari layar utama HP.</div>
          </div>
        </div>
      )}

      {/* Floating Prompt Sederhana & Bersih */}
      {showPrompt && !installedSuccess && (
        <aside
          aria-label="Install App"
          className="fixed bottom-3 inset-x-3 sm:bottom-5 sm:right-5 sm:left-auto sm:max-w-sm z-50 p-4 rounded-2xl bg-neutral-900/95 backdrop-blur-md border border-neutral-800 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-start gap-3">
            {/* App Icon */}
            <div className="w-11 h-11 rounded-xl bg-black border border-neutral-800 p-1.5 shrink-0 flex items-center justify-center">
              <img
                src="/icons/icon-192.png"
                alt="MENTION App"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-sm font-bold text-white">
                  Pasang Aplikasi MENTION
                </h4>
                <button
                  onClick={handleDismiss}
                  className="p-1 text-neutral-400 hover:text-white transition-colors"
                  title="Tutup"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                Tambahkan ke layar utama HP untuk akses cepat & layar penuh.
              </p>

              {/* Action Buttons */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 py-2 px-3 min-h-[38px] rounded-xl bg-mention-yellow hover:bg-mention-yellowDark text-black font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Pasang</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="py-2 px-3 min-h-[38px] rounded-xl border border-neutral-800 text-neutral-400 hover:text-white text-xs font-medium transition-colors"
                >
                  Nanti
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Modal Panduan iPhone Bersih & Minimalis */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-xs rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-4 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white">Pasang di iPhone</h3>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-300">
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-mention-yellow shrink-0">1.</span>
                <span>
                  Ketuk tombol <strong className="text-white">Bagikan</strong>{' '}
                  <Share className="w-3.5 h-3.5 inline text-blue-400" /> di bagian bawah Safari.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-mention-yellow shrink-0">2.</span>
                <span>
                  Pilih <strong className="text-white">Tambahkan ke Layar Utama</strong>{' '}
                  <PlusSquare className="w-3.5 h-3.5 inline text-neutral-300" />.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 min-h-[38px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
