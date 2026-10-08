'use client';

import React, { useState, useEffect } from 'react';

export default function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<'INITIAL' | 'M_ENTER' | 'SLIDE_EXPAND' | 'LOADER' | 'FADE_OUT' | 'DONE'>('INITIAL');

  useEffect(() => {
    // Only run on client mount
    setMounted(true);

    // Timeline choreography
    const t0 = setTimeout(() => setStage('M_ENTER'), 60);
    const t1 = setTimeout(() => setStage('SLIDE_EXPAND'), 550);
    const t2 = setTimeout(() => setStage('LOADER'), 1100);
    const t3 = setTimeout(() => setStage('FADE_OUT'), 2500);
    const t4 = setTimeout(() => setStage('DONE'), 3000);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  if (!mounted || stage === 'DONE') return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070708] select-none transition-opacity duration-500 ease-out ${
        stage === 'FADE_OUT' ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      {/* Ambient center soft golden aura */}
      <div className="absolute w-80 h-80 rounded-full bg-mention-yellow/10 blur-[90px] pointer-events-none" />

      {/* Main Logo Stage */}
      <div className="relative flex items-center justify-center">
        {/* 1. Logo "M" Icon */}
        <div
          className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 ${
            stage === 'INITIAL'
              ? 'opacity-0 scale-75'
              : 'opacity-100 scale-100'
          }`}
        >
          <img
            src="/splash-m.png"
            alt="M"
            className="h-14 sm:h-20 w-auto object-contain drop-shadow-[0_4px_20px_rgba(250,204,21,0.3)]"
          />
        </div>

        {/* 2. Text "ention" sliding out to the right */}
        <div
          className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center shrink-0 ${
            stage === 'INITIAL' || stage === 'M_ENTER'
              ? 'max-w-0 opacity-0 pl-0'
              : 'max-w-[320px] sm:max-w-[440px] opacity-100 pl-2 sm:pl-3'
          }`}
        >
          <img
            src="/splash-ention.png"
            alt="ention"
            className={`h-14 sm:h-20 w-auto object-contain transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              stage === 'INITIAL' || stage === 'M_ENTER'
                ? '-translate-x-8 opacity-0'
                : 'translate-x-0 opacity-100'
            }`}
          />
        </div>
      </div>

      {/* 3. Loading Bar Container (Muncul di bawah logo, bergerak bolak-balik kiri-kanan) */}
      <div
        className={`mt-8 w-36 sm:w-48 h-1 sm:h-1.5 rounded-full bg-neutral-900/90 overflow-hidden border border-neutral-800/80 transition-all duration-500 ${
          stage === 'LOADER' || stage === 'FADE_OUT'
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {/* Ping-pong animated indicator bar */}
        <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-mention-yellow via-yellow-300 to-mention-yellow shadow-[0_0_12px_rgba(250,204,21,0.85)] animate-loader-pingpong" />
      </div>
    </div>
  );
}
