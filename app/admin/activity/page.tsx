'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Loan, LoanItem } from '@/types';
import {
  Search,
  Clock,
  Package,
  Eye,
  X,
  User,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function AdminActivityPage() {
  const [viewMode, setViewMode] = useState<'loans' | 'items'>('loans');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowedItems, setBorrowedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Loan for Detail Modal
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // Delete State
  const [deleteConfirmLoan, setDeleteConfirmLoan] = useState<Loan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteLoan = async () => {
    if (!deleteConfirmLoan) return;
    try {
      setDeleting(true);
      setDeleteError('');
      const res = await fetch(`/api/admin/activity?id=${deleteConfirmLoan.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        setDeleteError(data.error || 'Gagal menghapus transaksi.');
        return;
      }
      setDeleteConfirmLoan(null);
      if (selectedLoan?.id === deleteConfirmLoan.id) {
        setSelectedLoan(null);
      }
      loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setDeleting(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [loansRes, itemsRes] = await Promise.all([
        fetch('/api/admin/activity'),
        fetch('/api/admin/activity?view=borrowed_items'),
      ]);

      const [loansData, itemsData] = await Promise.all([
        loansRes.json(),
        itemsRes.json(),
      ]);

      if (loansData.success) setLoans(loansData.data || []);
      if (itemsData.success) setBorrowedItems(itemsData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Loans
  const filteredLoans = loans.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.loan_code.toLowerCase().includes(q) ||
      l.member?.name.toLowerCase().includes(q) ||
      l.member?.generation?.name.toLowerCase().includes(q) ||
      l.items?.some((i) => i.item?.name.toLowerCase().includes(q))
    );
  });

  // Filtered Items
  const filteredBorrowedItems = borrowedItems.filter((bi) => {
    const q = searchQuery.toLowerCase();
    return (
      bi.item.name.toLowerCase().includes(q) ||
      (bi.item.code && bi.item.code.toLowerCase().includes(q)) ||
      (bi.borrower && bi.borrower.name.toLowerCase().includes(q)) ||
      (bi.generation && bi.generation.name.toLowerCase().includes(q))
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-mention-yellow uppercase tracking-wider mb-1">
              Monitoring Operasional
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Aktivitas Peminjaman</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* View Toggle Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
            <button
              onClick={() => setViewMode('loans')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'loans'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Transaksi Aktif ({loans.length})
            </button>
            <button
              onClick={() => setViewMode('items')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'items'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Barang Sedang Dipakai ({borrowedItems.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari transaksi, barang, atau nama..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-medium focus:ring-2 focus:ring-mention-yellow focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* VIEW 1: TRANSAKSI AKTIF TABLE */}
        {viewMode === 'loans' && (
          <div className="bg-white text-black rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-200">
            {loading ? (
              <div className="py-12 text-center text-neutral-400 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memuat transaksi...</span>
              </div>
            ) : filteredLoans.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 text-sm">
                Tidak ada data peminjaman aktif yang sesuai kriteria pencarian.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Kode</th>
                      <th className="py-3 px-3">Peminjam</th>
                      <th className="py-3 px-3">Barang</th>
                      <th className="py-3 px-3">Tgl Pinjam</th>
                      <th className="py-3 px-3">Target Kembali</th>
                      <th className="py-3 px-3">PIC Checker</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredLoans.map((loan: any) => {
                      const isOverdue = loan.status === 'OVERDUE' || (loan.daysOverdue && loan.daysOverdue > 0);
                      return (
                        <tr key={loan.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="py-3.5 px-3 font-mono font-bold text-black">{loan.loan_code}</td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-black">{loan.member?.name}</div>
                            <div className="text-[10px] text-neutral-500">{loan.member?.generation?.name}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-neutral-800">
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
                                ? 'TERLAMBAT'
                                : loan.status === 'PARTIALLY_RETURNED'
                                ? 'PARSIAL'
                                : 'AKTIF'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedLoan(loan)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black text-white text-[11px] font-bold hover:bg-neutral-800 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detail</span>
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteError('');
                                  setDeleteConfirmLoan(loan);
                                }}
                                className="inline-flex items-center justify-center p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: BARANG YANG SEDANG DIPAKAI (ITEM-CENTRIC) */}
        {viewMode === 'items' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-12 text-center text-neutral-400 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memuat data barang...</span>
              </div>
            ) : filteredBorrowedItems.length === 0 ? (
              <div className="col-span-full py-12 text-center text-neutral-500 text-sm bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
                Tidak ada barang yang sedang dipinjam saat ini.
              </div>
            ) : (
              filteredBorrowedItems.map((bi, idx) => (
                <div
                  key={`${bi.item.id}-${idx}`}
                  className="bg-white text-black rounded-2xl p-6 shadow-xl border border-neutral-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-base text-black">{bi.item.name}</h3>
                        {bi.item.code && (
                          <span className="text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-mono font-bold">
                            {bi.item.code}
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        Dipinjam
                      </span>
                    </div>

                    <div className="space-y-2 mt-4 pt-4 border-t border-neutral-100 text-xs">
                      <div>
                        <span className="text-neutral-500 block text-[11px]">Peminjam:</span>
                        <strong className="text-black text-sm">{bi.borrower?.name || '-'}</strong>
                        <span className="text-neutral-500 text-[11px] block">{bi.generation?.name || '-'}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                        <div>
                          <span className="text-neutral-500 block">Dipinjam:</span>
                          <span className="font-medium text-neutral-800">{bi.borrowDate}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block">Batas Kembali:</span>
                          <span className="font-medium text-neutral-800">{bi.expectedReturnDate}</span>
                        </div>
                      </div>

                      {bi.isOverdue && (
                        <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                          <span>Terlambat {bi.daysOverdue} hari</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                    <span>{bi.loanCode}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* MODAL DETAIL TRANSAKSI */}
        {selectedLoan && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200">
              {/* Header */}
              <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-xl text-black">Detail Transaksi Peminjaman</h3>
                    <span className="font-mono text-xs bg-black text-white px-2.5 py-0.5 rounded font-bold">
                      {selectedLoan.loan_code}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Dicatat pada: {new Date(selectedLoan.created_at || '').toLocaleString('id-ID')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                {/* Borrower & PIC info */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div>
                    <span className="text-neutral-500 block uppercase font-bold text-[10px] mb-0.5">Peminjam</span>
                    <strong className="text-sm text-black block">{selectedLoan.member?.name}</strong>
                    <span className="text-neutral-600">{selectedLoan.member?.generation?.name}</span>
                    {selectedLoan.member?.phone && (
                      <span className="text-neutral-500 block mt-0.5 font-mono">{selectedLoan.member?.phone}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-neutral-500 block uppercase font-bold text-[10px] mb-0.5">PIC Checker Peminjaman</span>
                    <strong className="text-sm text-black block">{selectedLoan.initial_checker?.name}</strong>
                    <span className="text-neutral-500 block mt-1">
                      Tgl Pinjam: <strong>{selectedLoan.borrow_date}</strong>
                    </span>
                    <span className="text-neutral-500 block">
                      Target Kembali: <strong>{selectedLoan.expected_return_date}</strong>
                    </span>
                  </div>
                </div>

                {selectedLoan.notes && (
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-neutral-500 block font-bold text-[10px] uppercase mb-1">Catatan Peminjaman:</span>
                    <p className="text-neutral-800">{selectedLoan.notes}</p>
                  </div>
                )}

                {/* Items & Inspection Details */}
                <div>
                  <h4 className="font-bold text-sm text-black mb-3">Daftar Barang & Pemeriksaan Fisik:</h4>
                  <div className="space-y-4">
                    {selectedLoan.items?.map((li, idx) => (
                      <div key={li.id} className="p-4 rounded-xl border border-neutral-200 bg-white space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-sm text-black">{li.item?.name}</span>
                            {li.item?.code && (
                              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-mono font-bold">
                                {li.item?.code}
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              li.status === 'RETURNED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {li.status === 'RETURNED' ? 'DIKEMBALIKAN' : 'DIPINJAM'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-neutral-700 text-[11px] pt-2 border-t border-neutral-100">
                          <div>
                            <span className="text-neutral-400 block text-[10px]">Kondisi Awal:</span>
                            <strong className="text-black">{li.initial_condition}</strong>
                            {li.initial_notes && <p className="text-neutral-500 italic mt-0.5">{li.initial_notes}</p>}
                          </div>
                          <div>
                            <span className="text-neutral-400 block text-[10px]">Kelengkapan Awal:</span>
                            <span className="text-black font-medium">
                              {li.initial_accessories && li.initial_accessories.length > 0
                                ? li.initial_accessories.join(', ')
                                : 'Lengkap'}
                            </span>
                          </div>
                        </div>

                        {li.returned_at && (
                          <div className="mt-2 pt-2 border-t border-dashed border-neutral-200 text-[11px] text-green-800 bg-green-50 p-2 rounded-lg">
                            <div>Dikembalikan pada: {new Date(li.returned_at).toLocaleString('id-ID')}</div>
                            <div>Kondisi Akhir: <strong>{li.return_condition}</strong></div>
                            {li.return_notes && <div>Catatan: {li.return_notes}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-neutral-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError('');
                    setDeleteConfirmLoan(selectedLoan);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Transaksi</span>
                </button>
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="px-5 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800"
                >
                  Tutup Detail
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: KONFIRMASI HAPUS TRANSAKSI AKTIF */}
        {deleteConfirmLoan && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-neutral-200">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="p-3 bg-red-100 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-black">Hapus Transaksi?</h3>
                  <p className="text-xs text-neutral-500">Status barang akan dikembalikan ke Tersedia.</p>
                </div>
              </div>

              {deleteError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  {deleteError}
                </div>
              )}

              <p className="text-xs text-neutral-600 mb-5">
                Apakah Anda yakin ingin menghapus transaksi peminjaman{' '}
                <span className="font-bold text-black font-mono">{deleteConfirmLoan.loan_code}</span>?
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmLoan(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 font-bold text-neutral-600 text-xs hover:bg-neutral-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteLoan}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
