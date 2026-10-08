'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Loan, LoanStatus } from '@/types';
import {
  History,
  Search,
  Eye,
  X,
  Clock,
  CheckCircle2,
  Package,
  Calendar,
  User,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminHistoryPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LoanStatus | 'ALL'>('ALL');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // Delete State
  const [deleteConfirmLoan, setDeleteConfirmLoan] = useState<Loan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Bulk Delete State
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<'EXCEPT_THIS_MONTH' | 'ALL'>('EXCEPT_THIS_MONTH');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const handleDeleteLoan = async () => {
    if (!deleteConfirmLoan) return;
    try {
      setDeleting(true);
      setDeleteError('');
      const res = await fetch(`/api/admin/history?id=${deleteConfirmLoan.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        setDeleteError(data.error || 'Gagal menghapus riwayat transaksi.');
        return;
      }
      setDeleteConfirmLoan(null);
      if (selectedLoan?.id === deleteConfirmLoan.id) {
        setSelectedLoan(null);
      }
      loadHistory();
    } catch (err: any) {
      setDeleteError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteHistory = async () => {
    try {
      setBulkDeleting(true);
      setBulkDeleteError('');
      const res = await fetch(`/api/admin/history?mode=${bulkDeleteMode}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        setBulkDeleteError(data.error || 'Gagal menghapus riwayat transaksi.');
        return;
      }
      setIsBulkDeleteModalOpen(false);
      setSuccessBanner(data.message || 'Riwayat transaksi berhasil dihapus.');
      setSelectedLoan(null);
      loadHistory();
      setTimeout(() => setSuccessBanner(''), 7000);
    } catch (err: any) {
      setBulkDeleteError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleExportExcel = () => {
    if (loans.length === 0) return;

    const rows = loans.map((loan, idx) => {
      const itemsNames =
        loan.items
          ?.map((i) => `${i.item?.name || 'Barang'} (${i.initial_condition || 'Aman'})`)
          .join(', ') || '-';
      const accessories =
        loan.items?.flatMap((i) => i.initial_accessories || []).filter(Boolean).join(', ') || '-';
      const returnAccessories =
        loan.items?.flatMap((i) => i.return_accessories || []).filter(Boolean).join(', ') || '-';
      const returnConditions =
        loan.items?.map((i) => i.return_condition || '-').filter(Boolean).join(', ') || '-';

      let statusLabel = 'Aktif';
      if (loan.status === 'RETURNED') statusLabel = 'Selesai Dikembalikan';
      else if (loan.status === 'PARTIALLY_RETURNED') statusLabel = 'Dikembalikan Sebagian';
      else if (loan.status === 'OVERDUE') statusLabel = 'Terlambat (Overdue)';

      return {
        No: idx + 1,
        'Kode Transaksi': loan.loan_code,
        'Tanggal Pinjam': loan.borrow_date,
        'Batas Pengembalian': loan.expected_return_date,
        'Tanggal Aktual Kembali': loan.actual_return_date || '-',
        'Nama Peminjam': loan.member?.name || (loan as any).custom_name || '-',
        Angkatan: loan.member?.generation?.name || ((loan as any).custom_name ? 'Lainnya' : '-'),
        'No. Telepon': loan.member?.phone || (loan as any).custom_phone || '-',
        'Daftar Barang & Kondisi': itemsNames,
        'Kelengkapan Dipinjam': accessories,
        Status: statusLabel,
        'PIC Peminjaman': loan.initial_checker?.name || '-',
        'PIC Pengembalian': loan.return_checker?.name || '-',
        'Kondisi Pengembalian': returnConditions,
        'Kelengkapan Dikembalikan': returnAccessories,
        Catatan: loan.notes || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-fit kolom agar nyaman dibuka di Excel / Google Sheets
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 22 },
      { wch: 15 },
      { wch: 18 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 16 },
      { wch: 35 },
      { wch: 25 },
      { wch: 22 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
      { wch: 30 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Transaksi');

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Laporan_History_Mention_${dateStr}.xlsx`);
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/admin/history', window.location.origin);
      if (searchQuery) url.searchParams.set('search', searchQuery);
      if (statusFilter !== 'ALL') url.searchParams.set('status', statusFilter);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setLoans(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-mention-yellow uppercase tracking-wider mb-1">
              Audit & Arsip
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">History Transaksi</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {/* Tombol Export Excel */}
            <button
              onClick={handleExportExcel}
              disabled={loading || loans.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-40"
              title="Unduh seluruh data history ke format Excel Sheet (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel</span>
            </button>

            {/* Tombol Hapus Semua History */}
            <button
              onClick={() => {
                setBulkDeleteMode('EXCEPT_THIS_MONTH');
                setBulkDeleteError('');
                setIsBulkDeleteModalOpen(true);
              }}
              disabled={loading || loans.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs shadow-md transition-all disabled:opacity-40"
              title="Hapus riwayat transaksi dengan opsi pilihan"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus History</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadHistory}
              disabled={loading}
              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
              title="Muat ulang data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-200 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button
              onClick={() => setSuccessBanner('')}
              className="text-emerald-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {(['ALL', 'RETURNED', 'ACTIVE', 'PARTIALLY_RETURNED', 'OVERDUE'] as (LoanStatus | 'ALL')[]).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap active:scale-[0.98] ${
                  statusFilter === st
                    ? 'bg-white text-black'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {st === 'ALL'
                  ? 'Semua'
                  : st === 'RETURNED'
                  ? 'Selesai Dikembalikan'
                  : st === 'ACTIVE'
                  ? 'Aktif'
                  : st === 'PARTIALLY_RETURNED'
                  ? 'Parsial'
                  : 'Overdue'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode, nama, atau barang..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-medium focus:ring-2 focus:ring-mention-yellow focus:outline-none"
            />
          </form>
        </div>

        {/* History Table (Card in White) */}
        <div className="bg-white text-black rounded-2xl p-4 sm:p-8 shadow-xl border border-neutral-200">
          {loading ? (
            <div className="py-12 text-center text-neutral-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat history...</span>
            </div>
          ) : loans.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              Belum ada data history peminjaman.
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Kode</th>
                    <th className="py-3 px-3">Peminjam</th>
                    <th className="py-3 px-3">Barang</th>
                    <th className="py-3 px-3">Tgl Pinjam</th>
                    <th className="py-3 px-3">Tgl Kembali</th>
                    <th className="py-3 px-3">PIC Pinjam</th>
                    <th className="py-3 px-3">PIC Kembali</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-black">{loan.loan_code}</td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-black">{loan.member?.name || (loan as any).custom_name || '-'}</div>
                        <div className="text-[10px] text-neutral-500">{loan.member?.generation?.name || ((loan as any).custom_name ? 'Lainnya' : '')}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-neutral-800 max-w-xs truncate">
                          {loan.items?.map((i) => i.item?.name).join(', ') || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-neutral-700">{loan.borrow_date}</td>
                      <td className="py-3.5 px-3 text-neutral-700">
                        {loan.actual_return_date || loan.expected_return_date}
                      </td>
                      <td className="py-3.5 px-3 text-neutral-700">{loan.initial_checker?.name || '-'}</td>
                      <td className="py-3.5 px-3 text-neutral-700">{loan.return_checker?.name || '-'}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            loan.status === 'RETURNED'
                              ? 'bg-green-100 text-green-800'
                              : loan.status === 'OVERDUE'
                              ? 'bg-red-100 text-red-800'
                              : loan.status === 'PARTIALLY_RETURNED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedLoan(loan)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black text-white text-[11px] font-bold hover:bg-neutral-800 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Audit</span>
                          </button>
                          <button
                            onClick={() => {
                              setDeleteError('');
                              setDeleteConfirmLoan(loan);
                            }}
                            className="inline-flex items-center justify-center p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Hapus Riwayat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL AUDIT DETAIL */}
        {selectedLoan && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200">
              <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-xl text-black">Arsip Lengkap Transaksi</h3>
                    <span className="font-mono text-xs bg-black text-white px-2.5 py-0.5 rounded font-bold">
                      {selectedLoan.loan_code}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Status saat ini:{' '}
                    <strong className="text-black">{selectedLoan.status}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="p-1.5 text-neutral-400 hover:text-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
                {/* Borrower & checkers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div>
                    <span className="text-neutral-500 block uppercase font-bold text-[10px]">Peminjam</span>
                    <strong className="text-sm text-black block">{selectedLoan.member?.name || (selectedLoan as any).custom_name || '-'}</strong>
                    <span className="text-neutral-600">{selectedLoan.member?.generation?.name || ((selectedLoan as any).custom_name ? 'Lainnya' : '')}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block uppercase font-bold text-[10px]">Petugas PIC</span>
                    <div>Pinjam: <strong>{selectedLoan.initial_checker?.name || '-'}</strong></div>
                    <div>Kembali: <strong>{selectedLoan.return_checker?.name || '-'}</strong></div>
                  </div>
                </div>

                {/* Items & comparison */}
                <div>
                  <h4 className="font-bold text-sm text-black mb-3">Daftar Barang & Kondisi Kelayakan:</h4>
                  <div className="space-y-4">
                    {selectedLoan.items?.map((li, idx) => (
                      <div key={li.id} className="p-4 rounded-xl border border-neutral-200 bg-white space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-black">
                            {idx + 1}. {li.item?.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              li.status === 'RETURNED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {li.status}
                          </span>
                        </div>

                        {/* Comparison grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-neutral-50 text-[11px]">
                          {/* Pinjam */}
                          <div className="p-2.5 rounded-lg bg-white border border-neutral-200/80">
                            <span className="text-neutral-500 font-bold block uppercase text-[10px] mb-1">
                              Saat Dipinjam:
                            </span>
                            <div>Kondisi: <strong>{li.initial_condition}</strong></div>
                            <div>Kelengkapan: {li.initial_accessories?.join(', ') || 'Lengkap'}</div>
                            {li.initial_notes && <div className="italic text-neutral-500 mt-1">Catatan: {li.initial_notes}</div>}
                          </div>

                          {/* Kembali */}
                          <div className="p-2.5 rounded-lg bg-white border border-neutral-200/80">
                            <span className="text-neutral-500 font-bold block uppercase text-[10px] mb-1">
                              Saat Dikembalikan:
                            </span>
                            {li.status === 'RETURNED' ? (
                              <>
                                <div>Kondisi: <strong>{li.return_condition || '-'}</strong></div>
                                <div>Kelengkapan: {li.return_accessories?.join(', ') || 'Lengkap'}</div>
                                {li.return_notes && (
                                  <div className="italic text-red-600 mt-1">Catatan: {li.return_notes}</div>
                                )}
                              </>
                            ) : (
                              <span className="text-neutral-400 italic">Belum dikembalikan</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

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
                  <span>Hapus Riwayat</span>
                </button>
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="px-5 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800"
                >
                  Tutup Arsip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: KONFIRMASI HAPUS RIWAYAT TRANSAKSI */}
        {deleteConfirmLoan && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-neutral-200">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="p-3 bg-red-100 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-black">Hapus Riwayat?</h3>
                  <p className="text-xs text-neutral-500">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
              </div>

              {deleteError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  {deleteError}
                </div>
              )}

              <p className="text-xs text-neutral-600 mb-5">
                Apakah Anda yakin ingin menghapus data riwayat transaksi{' '}
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

        {/* MODAL: HAPUS SEMUA HISTORY DENGAN PILIHAN */}
        {isBulkDeleteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white text-black rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl border border-neutral-200 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-2.5 text-red-600">
                  <div className="p-2.5 bg-red-100 rounded-xl">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-black">Hapus History Transaksi</h3>
                    <p className="text-[11px] text-neutral-500">Pilih cakupan data yang ingin dibersihkan</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-black rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {bulkDeleteError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{bulkDeleteError}</span>
                </div>
              )}

              {/* Opsi Pilihan Penghapusan */}
              <div className="space-y-3">
                <label
                  onClick={() => setBulkDeleteMode('EXCEPT_THIS_MONTH')}
                  className={`block p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    bulkDeleteMode === 'EXCEPT_THIS_MONTH'
                      ? 'border-black bg-neutral-50 ring-1 ring-black'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        bulkDeleteMode === 'EXCEPT_THIS_MONTH'
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-300'
                      }`}
                    >
                      {bulkDeleteMode === 'EXCEPT_THIS_MONTH' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-black flex items-center gap-2">
                        <span>Hapus Kecuali Bulan Ini</span>
                        <span className="text-[10px] bg-mention-yellow text-black font-extrabold px-1.5 py-0.5 rounded">
                          Rekomendasi
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                        Hanya menghapus riwayat transaksi dari bulan-bulan sebelumnya. Seluruh riwayat transaksi bulan berjalan akan tetap dipertahankan dengan aman.
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setBulkDeleteMode('ALL')}
                  className={`block p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    bulkDeleteMode === 'ALL'
                      ? 'border-red-600 bg-red-50/50 ring-1 ring-red-600'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        bulkDeleteMode === 'ALL'
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-neutral-300'
                      }`}
                    >
                      {bulkDeleteMode === 'ALL' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-red-700">
                        Hapus Seluruh Riwayat (Total)
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                        Menghapus <strong>SEMUA</strong> riwayat transaksi dari awal hingga sekarang secara permanen tanpa terkecuali.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Warning box */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Perhatian: Tindakan ini bersifat permanen dan tidak dapat dibatalkan. Pastikan Anda telah mengunduh laporan Excel sebelum menghapus jika data masih dibutuhkan.
                </span>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  disabled={bulkDeleting}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[42px] rounded-xl border border-neutral-300 font-bold text-neutral-600 text-xs hover:bg-neutral-100 transition-colors text-center"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBulkDeleteHistory}
                  disabled={bulkDeleting}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[42px] rounded-xl bg-red-600 text-white font-extrabold text-xs hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                  {bulkDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <span>
                      {bulkDeleteMode === 'EXCEPT_THIS_MONTH'
                        ? 'Hapus Sebelum Bulan Ini'
                        : 'Hapus Seluruh Data'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
