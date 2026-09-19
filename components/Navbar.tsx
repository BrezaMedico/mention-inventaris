import Link from 'next/link';
import Logo from './Logo';
import { Shield } from 'lucide-react';

interface NavbarProps {
  showHomeLink?: boolean;
}

export default function Navbar({ showHomeLink = false }: NavbarProps) {
  return (
    <header className="w-full border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo height={32} />
        </Link>

        <div className="flex items-center gap-3">
          {showHomeLink && (
            <Link
              href="/"
              className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-900"
            >
              Beranda
            </Link>
          )}

          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-mention-yellow hover:text-mention-yellow transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}
