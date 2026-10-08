'use client';

import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  iconOnly?: boolean;
}

export default function Logo({
  width = 160,
  height = 36,
  className = '',
  iconOnly = false,
}: LogoProps) {
  const [imgError, setImgError] = useState(false);

  if (iconOnly) {
    return (
      <div className={`flex items-center ${className}`}>
        <Image
          src="/icon.png"
          alt="MENTION"
          width={height || 36}
          height={height || 36}
          priority
          className="h-8 w-8 object-contain"
        />
      </div>
    );
  }

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
          <Image
            src="/icon.png"
            alt="m"
            width={24}
            height={24}
            className="w-6 h-6 object-contain"
          />
          <span>mention</span>
        </div>
      )}
    </div>
  );
}
