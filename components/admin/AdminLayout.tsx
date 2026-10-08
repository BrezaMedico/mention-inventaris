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
  Calendar,
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
  { label: 'Kalender & Tugas', href: '/admin/calendar', icon: Calendar },
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



  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

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
      {/* Mobile Top Header (Sticky) */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between p-3.5 border-b border-mention-border bg-mention-dark/95 backdrop-blur-md">
        <Link href="/" className="inline-block">
          <Logo width={110} height={30} />
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 -mr-1 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label="Buka Menu Navigasi"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-50 h-screen w-72 md:w-64 bg-mention-dark border-r border-mention-border flex flex-col justify-between transition-transform duration-250 ease-out shadow-2xl md:shadow-none ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Org Badge with Mobile Close Button */}
          <div className="p-5 sm:p-6 border-b border-mention-border flex items-center justify-between">
            <div>
              <Link href="/" className="inline-block hover:opacity-90">
                <Logo />
              </Link>
              <div className="mt-2 text-[10px] uppercase font-bold tracking-widest text-mention-yellow flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-mention-yellow animate-pulse"></span>
                Admin Portal
              </div>
            </div>

            {/* Mobile close button inside drawer */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 p-3.5 sm:p-4 space-y-1 overflow-y-auto no-scrollbar">
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
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
                    isActive
                      ? 'bg-mention-yellow text-black shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 stroke-[2.2] shrink-0 ${isActive ? 'text-black' : 'text-neutral-400'}`} />
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
              className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
            >
              <span>Lihat Website Publik</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>{loggingOut ? 'Keluar...' : 'Keluar (Logout)'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-3.5 sm:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

