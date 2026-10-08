'use client';

import React, { useState, useEffect } from 'react';

export default function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<'INITIAL' | 'M_ENTER' | 'SLIDE_EXPAND' | 'LOADER' | 'FADE_OUT' | 'DONE'>('INITIAL');

  useEffect(() => {
    setMounted(true);

    // Choreographed cinematic timeline
    const t0 = setTimeout(() => setStage('M_ENTER'), 80);
    const t1 = setTimeout(() => setStage('SLIDE_EXPAND'), 750);
    const t2 = setTimeout(() => setStage('LOADER'), 1600);
    const t3 = setTimeout(() => setStage('FADE_OUT'), 3000);
    const t4 = setTimeout(() => setStage('DONE'), 3800);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  if (!mounted || stage === 'DONE') return null;

  const isFadingOut = stage === 'FADE_OUT';
  const hasMEntered = stage !== 'INITIAL';
  const hasExpanded = stage === 'SLIDE_EXPAND' || stage === 'LOADER' || stage === 'FADE_OUT';
  const hasLoader = stage === 'LOADER' || stage === 'FADE_OUT';

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070708] select-none transition-all duration-700 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none scale-[1.01]' : 'opacity-100 pointer-events-auto scale-100'
      }`}
    >
      {/* Ambient center soft golden aura with smooth fade */}
      <div
        className={`absolute w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-mention-yellow/12 blur-[100px] pointer-events-none transition-opacity duration-1000 ease-out ${
          hasMEntered && !isFadingOut ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Main Logo Showcase */}
      <div className="relative flex items-center justify-center">
        {/* 1. Logo "M" Icon - Halus Fade-In & Gentle Scale */}
        <div
          className={`transition-all duration-900 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 ${
            hasMEntered
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 translate-y-1'
          }`}
        >
          <img
            src="/splash-m.png"
            alt="M"
            className="h-14 sm:h-20 w-auto object-contain drop-shadow-[0_6px_24px_rgba(250,204,21,0.25)]"
          />
        </div>

        {/* 2. Text "ention" - Halus Fade-In & Smooth Slide Out */}
        <div
          className={`overflow-hidden transition-all duration-900 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center shrink-0 ${
            hasExpanded
              ? 'max-w-[320px] sm:max-w-[440px] opacity-100 pl-2 sm:pl-3'
              : 'max-w-0 opacity-0 pl-0'
          }`}
        >
          <img
            src="/splash-ention.png"
            alt="ention"
            className={`h-14 sm:h-20 w-auto object-contain transition-all duration-900 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              hasExpanded
                ? 'translate-x-0 opacity-100 blur-0'
                : '-translate-x-6 opacity-0 blur-[2px]'
            }`}
          />
        </div>
      </div>

      {/* 3. Loading Bar Container - Halus Fade-In dengan Efek Ping-Pong */}
      <div
        className={`mt-8 w-36 sm:w-48 h-1 sm:h-1.5 rounded-full bg-neutral-900/90 overflow-hidden border border-neutral-800/80 transition-all duration-700 ease-out ${
          hasLoader && !isFadingOut
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
        }`}
      >
        {/* Buttery Smooth Ping-pong Indicator */}
        <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-mention-yellow via-yellow-300 to-mention-yellow shadow-[0_0_14px_rgba(250,204,21,0.85)] animate-loader-pingpong" />
      </div>
    </div>
  );
}
