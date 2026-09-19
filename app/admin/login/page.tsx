'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { Shield, Lock, User, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Login gagal. Periksa username dan password.');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Beranda Publik</span>
        </Link>

        {/* Login Container (Card in White) */}
        <div className="bg-white text-black rounded-3xl p-8 sm:p-10 shadow-2xl border border-neutral-200">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-black text-mention-yellow flex items-center justify-center mx-auto mb-4 shadow-md">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-black tracking-tight">Portal Administrator</h1>
            <p className="text-xs text-neutral-500 mt-1">
              Masuk untuk mengelola inventaris, aktivitas, dan notifikasi MENTION.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username admin"
                  required
                  autoFocus
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-neutral-300 bg-white text-black text-sm font-medium focus:ring-2 focus:ring-black focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-neutral-300 bg-white text-black text-sm font-medium focus:ring-2 focus:ring-black focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-xl bg-mention-yellow text-black font-black text-xs uppercase tracking-wider hover:bg-mention-yellowDark transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-neutral-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk Administrator</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-neutral-100 text-center text-[11px] text-neutral-400">
            Initial Admin: <span className="font-mono text-neutral-600 font-bold">mention</span>
          </div>
        </div>
      </div>
    </div>
  );
}
