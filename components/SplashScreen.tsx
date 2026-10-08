'use client';

import React, { useState, useEffect } from 'react';

export default function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<'INITIAL' | 'M_ENTER' | 'EXPAND' | 'LOADER' | 'FADE_OUT' | 'DONE'>('INITIAL');

  useEffect(() => {
    setMounted(true);

    // Timed choreography for ultra-smooth cinematic transitions
    const t0 = setTimeout(() => setStage('M_ENTER'), 100);
    const t1 = setTimeout(() => setStage('EXPAND'), 1400);
    const t2 = setTimeout(() => setStage('LOADER'), 2400);
    const t3 = setTimeout(() => setStage('FADE_OUT'), 3800);
    const t4 = setTimeout(() => setStage('DONE'), 4600);

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
  const hasExpanded = stage === 'EXPAND' || stage === 'LOADER' || stage === 'FADE_OUT';
  const hasLoader = stage === 'LOADER' || stage === 'FADE_OUT';

  return (
    <div
      aria-hidden="true"
      onClick={() => setStage('FADE_OUT')}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070708] select-none transition-all duration-800 ease-in-out cursor-default ${
        isFadingOut ? 'opacity-0 pointer-events-none scale-[1.02]' : 'opacity-100 pointer-events-auto scale-100'
      }`}
    >
      {/* Ambient center soft golden aura with smooth fade */}
      <div
        className={`absolute w-80 sm:w-[420px] h-80 sm:h-[420px] rounded-full bg-mention-yellow/12 blur-[100px] pointer-events-none transition-all duration-1000 ease-out ${
          hasMEntered && !isFadingOut ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      />

      {/* Main Logo Container */}
      <div className="relative flex items-center justify-center overflow-visible">
        {/* Unified logo row moving smoothly via pure CSS GPU transforms */}
        <div
          className="flex items-center transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            // 37.68% offset centers the "M" emblem geometrically in the viewport
            transform: hasExpanded ? 'translateX(0%)' : 'translateX(37.68%)',
          }}
        >
          {/* 1. Logo "M" Icon - Silky bloom fade-in & soft scale */}
          <div
            className="shrink-0 transition-all duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              opacity: hasMEntered ? 1 : 0,
              transform: hasMEntered ? 'scale(1)' : 'scale(0.86)',
              filter: hasMEntered ? 'blur(0px)' : 'blur(8px)',
            }}
          >
            <img
              src="/splash-m.png"
              alt="M"
              className="h-14 sm:h-20 w-auto object-contain drop-shadow-[0_4px_24px_rgba(250,204,21,0.35)]"
            />
          </div>

          {/* 2. Text "ention" - Silky unmasking reveal via clip-path and gentle blur fade */}
          <div
            className="shrink-0 transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] pl-2 sm:pl-3"
            style={{
              clipPath: hasExpanded ? 'inset(0% 0% 0% 0%)' : 'inset(0% 100% 0% 0%)',
              opacity: hasExpanded ? 1 : 0,
              transform: hasExpanded ? 'translateX(0px)' : 'translateX(-12px)',
              filter: hasExpanded ? 'blur(0px)' : 'blur(6px)',
            }}
          >
            <img
              src="/splash-ention.png"
              alt="ention"
              className="h-14 sm:h-20 w-auto object-contain"
            />
          </div>
        </div>
      </div>

      {/* 3. Loading Bar Container - Muncul halus di bawah logo */}
      <div
        className="mt-8 w-36 sm:w-48 h-1 sm:h-1.5 rounded-full bg-neutral-900/90 overflow-hidden border border-neutral-800/80 transition-all duration-700 ease-out"
        style={{
          opacity: hasLoader && !isFadingOut ? 1 : 0,
          transform: hasLoader && !isFadingOut ? 'translateY(0px)' : 'translateY(8px)',
          pointerEvents: 'none',
        }}
      >
        {/* Buttery Smooth Ping-pong Indicator */}
        <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-mention-yellow via-yellow-300 to-mention-yellow shadow-[0_0_14px_rgba(250,204,21,0.85)] animate-loader-pingpong" />
      </div>
    </div>
  );
}
