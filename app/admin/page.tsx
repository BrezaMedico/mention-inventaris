'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { Loan } from '@/types';
import {
  Clock,
  Package,
  AlertTriangle,
  ArrowRight,
  Database,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface Stats {
  activeLoansCount: number;
  overdueLoansCount: number;
  availableItemsCount: number;
  borrowedItemsCount: number;
  maintenanceItemsCount: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dbStatus, setDbStatus] = useState<{ isSupabase: boolean; message: string } | null>(null);
  const [recentLoans, setRecentLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/activity'),
      ]);

      const [statsData, activityData] = await Promise.all([
        statsRes.json(),
        activityRes.json(),
      ]);

      if (statsData.success) {
        setStats(statsData.stats);
        setDbStatus(statsData.dbStatus);
      }
      if (activityData.success) {
        setRecentLoans(activityData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-mention-yellow uppercase tracking-wider mb-1">
              Overview Sistem
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Dashboard Administrator</h1>
          </div>

          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold uppercase tracking-wider hover:border-neutral-500 self-start sm:self-auto transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Database Status Alert Banner */}
        {dbStatus && (
          <div
            className={`p-4 rounded-2xl border flex items-start sm:items-center justify-between gap-3 text-xs ${
              dbStatus.isSupabase
                ? 'bg-green-950/40 border-green-800/60 text-green-300'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Status Database:</strong> {dbStatus.message}
              </span>
            </div>
            {!dbStatus.isSupabase && (
              <span className="text-[10px] font-mono bg-amber-900/60 px-2 py-0.5 rounded text-amber-300">
                schema.sql ready
              </span>
            )}
          </div>
        )}

        {/* 4 Primary Metric Cards (clean, high readability) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Active Loans */}
          <div className="bg-white text-black p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Sedang Dipinjam</span>
              <Package className="w-4 h-4 text-black" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-black">
              {loading ? '-' : stats?.activeLoansCount || 0}
            </div>
            <div className="mt-2 text-xs text-neutral-500 font-medium">Transaksi peminjaman aktif</div>
          </div>

          {/* Overdue */}
          <div className="bg-white text-black p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">Terlambat</span>
              <Clock className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-red-600">
              {loading ? '-' : stats?.overdueLoansCount || 0}
            </div>
            <div className="mt-2 text-xs text-red-600/80 font-medium">Melewati target kembali</div>
          </div>

          {/* Available Items */}
          <div className="bg-white text-black p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Barang Tersedia</span>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-black">
              {loading ? '-' : stats?.availableItemsCount || 0}
            </div>
            <div className="mt-2 text-xs text-neutral-500 font-medium">Siap untuk dipinjam</div>
          </div>

          {/* Maintenance */}
          <div className="bg-white text-black p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Maintenance</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-amber-600">
              {loading ? '-' : stats?.maintenanceItemsCount || 0}
            </div>
            <div className="mt-2 text-xs text-neutral-500 font-medium">Perbaikan / pengecekan</div>
          </div>
        </div>

        {/* Activity Table Container (Card in White) */}
        <div className="bg-white text-black rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-black">Aktivitas Peminjaman Aktif</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Daftar transaksi yang belum selesai dikembalikan.</p>
            </div>

            <Link
              href="/admin/activity"
              className="flex items-center gap-1.5 text-xs font-bold text-black hover:text-mention-yellowDark transition-colors"
            >
              <span>Lihat Semua Aktivitas</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-neutral-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat aktivitas...</span>
            </div>
          ) : recentLoans.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              Belum ada aktivitas peminjaman yang sedang aktif saat ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Kode</th>
                    <th className="py-3 px-3">Peminjam</th>
                    <th className="py-3 px-3">Barang Dipinjam</th>
                    <th className="py-3 px-3">Tgl Pinjam</th>
                    <th className="py-3 px-3">Target Kembali</th>
                    <th className="py-3 px-3">PIC Checker</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {recentLoans.slice(0, 8).map((loan: any) => {
                    const isOverdue = loan.status === 'OVERDUE' || (loan.daysOverdue && loan.daysOverdue > 0);
                    return (
                      <tr key={loan.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-black">{loan.loan_code}</td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-black">{loan.member?.name}</div>
                          <div className="text-[10px] text-neutral-500">{loan.member?.generation?.name}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-medium text-neutral-800">
                            {loan.items?.map((i: any) => i.item?.name).join(', ') || '-'}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {loan.items?.length || 0} barang
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-neutral-700">{loan.borrow_date}</td>
                        <td className="py-3.5 px-3 text-neutral-700">
                          <div>{loan.expected_return_date}</div>
                          {isOverdue && (
                            <span className="text-[10px] text-red-600 font-bold">
                              Terlambat {loan.daysOverdue} hari
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-neutral-700 font-medium">
                          {loan.initial_checker?.name || '-'}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isOverdue
                                ? 'bg-red-100 text-red-700'
                                : loan.status === 'PARTIALLY_RETURNED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isOverdue
                              ? 'OVERDUE'
                              : loan.status === 'PARTIALLY_RETURNED'
                              ? 'PARSIAL'
                              : 'AKTIF'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
