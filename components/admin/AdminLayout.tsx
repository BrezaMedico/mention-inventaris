'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import {
  LayoutDashboard,
  Activity,
  Package,
  Users,
  ShieldCheck,
  History,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Aktivitas', href: '/admin/activity', icon: Activity },
  { label: 'Barang & Inventaris', href: '/admin/items', icon: Package },
  { label: 'Angkatan & Anggota', href: '/admin/members', icon: Users },
  { label: 'PIC Checker', href: '/admin/checkers', icon: ShieldCheck },
  { label: 'History Transaksi', href: '/admin/history', icon: History },
  { label: 'WhatsApp Bot', href: '/admin/whatsapp', icon: MessageSquare },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Auto-logout when user leaves the page / tab / browser
  useEffect(() => {
    const handleLeave = () => {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/admin/logout');
      }
    };
    window.addEventListener('pagehide', handleLeave);
    window.addEventListener('beforeunload', handleLeave);
    return () => {
      window.removeEventListener('pagehide', handleLeave);
      window.removeEventListener('beforeunload', handleLeave);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-mention-black text-white flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-mention-border bg-mention-dark">
        <Logo width={120} height={32} />
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-neutral-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-mention-dark border-r border-mention-border flex flex-col justify-between transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Org Badge */}
          <div className="p-6 border-b border-mention-border">
            <Link href="/" className="inline-block hover:opacity-90">
              <Logo />
            </Link>
            <div className="mt-2 text-[10px] uppercase font-bold tracking-widest text-mention-yellow flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-mention-yellow"></span>
              Admin Portal
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-mention-yellow text-black shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 stroke-[2.2] ${isActive ? 'text-black' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-mention-border space-y-2">
            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <span>Lihat Website Publik</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{loggingOut ? 'Keluar...' : 'Keluar (Logout)'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
