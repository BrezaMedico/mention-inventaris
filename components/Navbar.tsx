'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import { Shield, Calendar } from 'lucide-react';

interface NavbarProps {
  showHomeLink?: boolean;
}

export default function Navbar({ showHomeLink = false }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-neutral-800 bg-[#0c0d12]/90 backdrop-blur-md sticky top-0 z-40 transition-all">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo height={32} />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {showHomeLink && (
            <Link
              href="/"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                pathname === '/'
                  ? 'text-white bg-neutral-800/80'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Beranda
            </Link>
          )}

          <Link
            href="/calendar"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 active:scale-95 ${
              pathname === '/calendar'
                ? 'border-mention-yellow/80 bg-mention-yellow/15 text-mention-yellow shadow-sm shadow-yellow-500/10'
                : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-mention-yellow hover:text-mention-yellow hover:bg-neutral-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kalender</span>
          </Link>

          <Link
            href="/admin"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 active:scale-95 ${
              pathname?.startsWith('/admin')
                ? 'border-mention-yellow/80 bg-mention-yellow/15 text-mention-yellow shadow-sm shadow-yellow-500/10'
                : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-mention-yellow hover:text-mention-yellow hover:bg-neutral-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
