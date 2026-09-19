'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Checker } from '@/types';
import {
  ShieldCheck,
  Plus,
  KeyRound,
  X,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';

export default function AdminCheckersPage() {
  const [checkers, setCheckers] = useState<Omit<Checker, 'pin_hash'>[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createPin, setCreatePin] = useState('');

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedChecker, setSelectedChecker] = useState<Omit<Checker, 'pin_hash'> | null>(null);
  const [newPin, setNewPin] = useState('');

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Delete State
  const [deleteConfirmChecker, setDeleteConfirmChecker] = useState<Omit<Checker, 'pin_hash'> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadCheckers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/checkers');
      const data = await res.json();
      if (data.success) {
        setCheckers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheckers();
  }, []);

  const handleCreateChecker = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!createName.trim()) {
      setModalError('Nama PIC wajib diisi.');
      return;
    }
    if (!/^\d{6}$/.test(createPin.trim())) {
      setModalError('PIN harus tepat 6 digit angka.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/checkers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          pin: createPin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setModalError(data.error || 'Gagal menambahkan PIC.');
        return;
      }

      setIsCreateModalOpen(false);
      setCreateName('');
      setCreatePin('');
      setSuccessMessage('PIC Checker berhasil didaftarkan.');
      loadCheckers();
    } catch {
      setModalError('Terjadi kesalahan koneksi.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChecker) return;
    setModalError('');

    if (!/^\d{6}$/.test(newPin.trim())) {
      setModalError('PIN baru harus tepat 6 digit angka.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/checkers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_pin',
          id: selectedChecker.id,
          pin: newPin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setModalError(data.error || 'Gagal mereset PIN.');
        return;
      }

      setIsResetModalOpen(false);
      setSelectedChecker(null);
      setNewPin('');
      setSuccessMessage('PIN 6 digit PIC berhasil diperbarui.');
    } catch {
      setModalError('Terjadi kesalahan koneksi.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (checker: Omit<Checker, 'pin_hash'>) => {
    try {
      await fetch('/api/admin/checkers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_active',
          id: checker.id,
          is_active: !checker.is_active,
        }),
      });
      loadCheckers();
    } catch {}
  };

  const handleDeleteChecker = async () => {
    if (!deleteConfirmChecker) return;
    try {
      setDeleting(true);
      setDeleteError('');
      const res = await fetch(`/api/admin/checkers?id=${deleteConfirmChecker.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        setDeleteError(data.error || 'Gagal menghapus PIC.');
        return;
      }
      setDeleteConfirmChecker(null);
      setSuccessMessage('PIC Checker berhasil dihapus.');
      loadCheckers();
    } catch (err: any) {
      setDeleteError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-mention-yellow uppercase tracking-wider mb-1">
              Petugas Pemeriksa Barang
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Kelola PIC Checker</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadCheckers}
              disabled={loading}
              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                setCreateName('');
                setCreatePin('');
                setModalError('');
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-mention-yellow text-black font-extrabold text-xs uppercase tracking-wider hover:bg-mention-yellowDark transition-all shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah PIC Checker</span>
            </button>
          </div>
        </div>

        {/* Success alert */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-green-950/50 border border-green-800 text-green-300 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-green-400 hover:text-green-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Checkers Table (Card in White) */}
        <div className="bg-white text-black rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-200">
          <div className="border-b border-neutral-200 pb-4 mb-6">
            <h2 className="text-xl font-bold text-black">Daftar PIC Checker Terdaftar</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Setiap PIC memiliki kode verifikasi 8-digit unik yang tersimpan secara aman dalam bentuk hash.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-neutral-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat data PIC...</span>
            </div>
          ) : checkers.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              Belum ada PIC Checker yang terdaftar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Nama PIC</th>
                    <th className="py-3 px-3">Status Kode Verifikasi</th>
                    <th className="py-3 px-3">Status Petugas</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {checkers.map((chk) => (
                    <tr key={chk.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-black text-sm">{chk.name}</div>
                        <div className="text-[10px] text-neutral-400">ID: {chk.id}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded font-mono text-[11px] font-bold">
                          •••••••• (Terenkripsi Bcrypt)
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <button
                          onClick={() => handleToggleActive(chk)}
                          className="flex items-center gap-1.5 text-xs font-bold"
                          title="Klik untuk mengubah status aktif"
                        >
                          {chk.is_active ? (
                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2.5 py-0.5 rounded text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> AKTIF
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-neutral-500 bg-neutral-200 px-2.5 py-0.5 rounded text-[10px]">
                              NONAKTIF
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedChecker(chk);
                              setNewPin('');
                              setModalError('');
                              setIsResetModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black text-white text-[11px] font-bold hover:bg-neutral-800 transition-colors"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Reset PIN</span>
                          </button>
                          <button
                            onClick={() => {
                              setDeleteError('');
                              setDeleteConfirmChecker(chk);
                            }}
                            className="inline-flex items-center justify-center p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Hapus PIC"
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

        {/* MODAL: TAMBAH PIC CHECKER */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-neutral-200">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-5">
                <h3 className="font-black text-lg text-black">Tambah PIC Checker</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleCreateChecker} className="space-y-4 text-xs">
                <div>
                  <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-1">
                    Nama Petugas PIC <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Contoh: Rian (Divisi Logistik)"
                    required
                    autoFocus
                    className="w-full h-10 px-3 rounded-lg border border-neutral-300 bg-white text-black font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-1">
                    PIN 6 DIGIT (ANGKA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={createPin}
                    onChange={(e) => setCreatePin(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full h-12 text-center text-2xl font-mono tracking-widest rounded-lg border border-neutral-300 bg-neutral-50 text-black font-bold focus:ring-2 focus:ring-black focus:outline-none"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Harus tepat 6 digit angka (default: 123456).
                  </p>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-300 font-bold text-neutral-600 hover:bg-neutral-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving || createPin.length !== 6}
                    className="px-5 py-2 rounded-xl bg-mention-yellow text-black font-extrabold uppercase hover:bg-mention-yellowDark disabled:bg-neutral-200"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan PIC'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: RESET KODE 6 DIGIT */}
        {isResetModalOpen && selectedChecker && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-neutral-200">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-5">
                <div>
                  <h3 className="font-black text-lg text-black">Reset PIN 6-Digit PIC</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{selectedChecker.name}</p>
                </div>
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleResetPin} className="space-y-4 text-xs">
                <div>
                  <label className="block text-center uppercase font-bold text-[10px] text-neutral-700 mb-2">
                    MASUKKAN PIN 6 DIGIT BARU
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    autoFocus
                    className="w-full h-12 text-center text-2xl font-mono tracking-widest rounded-lg border-2 border-neutral-300 bg-neutral-50 text-black font-bold focus:border-black focus:outline-none"
                  />
                  <p className="text-center text-[11px] text-neutral-500 mt-2">
                    PIN lama akan digantikan dengan PIN baru ini.
                  </p>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-300 font-bold text-neutral-600 hover:bg-neutral-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving || newPin.length !== 6}
                    className="px-5 py-2 rounded-xl bg-mention-yellow text-black font-extrabold uppercase hover:bg-mention-yellowDark disabled:bg-neutral-200"
                  >
                    {saving ? 'Menyimpan...' : 'Perbarui PIN'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: KONFIRMASI HAPUS PIC */}
        {deleteConfirmChecker && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-neutral-200">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="p-3 bg-red-100 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-black">Hapus PIC Checker?</h3>
                  <p className="text-xs text-neutral-500">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
              </div>

              {deleteError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  {deleteError}
                </div>
              )}

              <p className="text-xs text-neutral-600 mb-5">
                Apakah Anda yakin ingin menghapus petugas{' '}
                <span className="font-bold text-black">{deleteConfirmChecker.name}</span>?
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmChecker(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 font-bold text-neutral-600 text-xs hover:bg-neutral-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteChecker}
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
