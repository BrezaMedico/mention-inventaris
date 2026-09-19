'use client';

import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  showText?: boolean;
}

export default function Logo({ width = 160, height = 36, className = '' }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`flex items-center ${className}`}>
      {!imgError ? (
        <Image
          src="/logo.png"
          alt="mention"
          width={width}
          height={height}
          priority
          onError={() => setImgError(true)}
          className="h-8 sm:h-9 w-auto object-contain"
        />
      ) : (
        <div className="flex items-center gap-1.5 font-black text-xl tracking-tight text-white">
          <span>mention</span>
          <span className="w-2 h-2 rounded-full bg-mention-yellow"></span>
        </div>
      )}
    </div>
  );
}
