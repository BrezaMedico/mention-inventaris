'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Item, ItemStatus } from '@/types';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Check,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Tag,
} from 'lucide-react';

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'ALL'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'AVAILABLE' as ItemStatus,
  });
  const [accessoriesList, setAccessoriesList] = useState<string[]>([]);
  const [newAccessoryInput, setNewAccessoryInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete State
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/items');
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      status: 'AVAILABLE',
    });
    setAccessoriesList([]);
    setNewAccessoryInput('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code || '',
      description: item.description || '',
      status: item.status,
    });
    setAccessoriesList(item.accessories?.map((a) => a.name) || []);
    setNewAccessoryInput('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleAddAccessory = () => {
    const trimmed = newAccessoryInput.trim();
    if (!trimmed) return;
    if (accessoriesList.includes(trimmed)) return;
    setAccessoriesList([...accessoriesList, trimmed]);
    setNewAccessoryInput('');
  };

  const handleRemoveAccessory = (accName: string) => {
    setAccessoriesList(accessoriesList.filter((a) => a !== accName));
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Nama barang wajib diisi.');
      return;
    }

    try {
      setSaving(true);
      const url = '/api/admin/items';
      const method = editingItem ? 'PUT' : 'POST';
      const body = {
        id: editingItem ? editingItem.id : undefined,
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        description: formData.description.trim() || undefined,
        status: formData.status,
        accessories: accessoriesList,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Gagal menyimpan data barang.');
        return;
      }

      setIsModalOpen(false);
      loadItems();
    } catch {
      setFormError('Terjadi kesalahan koneksi.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return;
    try {
      setDeleting(true);
      setDeleteError('');
      const res = await fetch(`/api/admin/items?id=${deleteConfirmItem.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDeleteError(data.error || 'Gagal menghapus barang.');
        return;
      }
      setDeleteConfirmItem(null);
      loadItems();
    } catch {
      setDeleteError('Terjadi kesalahan koneksi.');
    } finally {
      setDeleting(false);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-mention-yellow uppercase tracking-wider mb-1">
              Inventaris Organisasi
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Kelola Data Barang</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadItems}
              disabled={loading}
              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-mention-yellow text-black font-extrabold text-xs uppercase tracking-wider hover:bg-mention-yellowDark transition-all shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Barang</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0">
            {(['ALL', 'AVAILABLE', 'BORROWED', 'MAINTENANCE', 'INACTIVE'] as (ItemStatus | 'ALL')[]).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-black'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {st === 'ALL'
                  ? 'Semua'
                  : st === 'AVAILABLE'
                  ? 'Tersedia'
                  : st === 'BORROWED'
                  ? 'Dipinjam'
                  : st === 'MAINTENANCE'
                  ? 'Maintenance'
                  : 'Nonaktif'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau kode barang..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-medium focus:ring-2 focus:ring-mention-yellow focus:outline-none"
            />
          </div>
        </div>

        {/* Items Table Container (Card in White) */}
        <div className="bg-white text-black rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-200">
          {loading ? (
            <div className="py-12 text-center text-neutral-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat inventaris...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              Belum ada data barang yang sesuai filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Kode</th>
                    <th className="py-3 px-3">Nama Barang</th>
                    <th className="py-3 px-3">Deskripsi</th>
                    <th className="py-3 px-3">Kelengkapan Terdaftar</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-neutral-700">
                        {item.code || '-'}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-black text-sm">{item.name}</td>
                      <td className="py-3.5 px-3 text-neutral-600 max-w-xs truncate">
                        {item.description || '-'}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.accessories && item.accessories.length > 0 ? (
                            item.accessories.map((acc) => (
                              <span
                                key={acc.id}
                                className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] text-neutral-700"
                              >
                                {acc.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-400 italic text-[11px]">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'AVAILABLE'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'BORROWED'
                              ? 'bg-blue-100 text-blue-800'
                              : item.status === 'MAINTENANCE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-[11px] font-bold hover:bg-neutral-800 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmItem(item);
                              setDeleteError('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-[11px] font-bold transition-colors"
                            title="Hapus Barang"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
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

        {/* MODAL: TAMBAH / EDIT BARANG */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200">
              {/* Header */}
              <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-xl text-black">
                    {editingItem ? 'Edit Data Barang' : 'Tambah Barang Baru'}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Masukkan detail barang dan daftar kelengkapan inventaris.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-1.5">
                      Nama Barang <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Kamera Sony Alpha A7 III"
                      required
                      className="w-full h-10 px-3 rounded-lg border border-neutral-300 bg-white text-black font-medium focus:ring-2 focus:ring-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-1.5">
                      Kode Inventaris
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="Contoh: CAM-001"
                      className="w-full h-10 px-3 rounded-lg border border-neutral-300 bg-white text-black font-medium font-mono focus:ring-2 focus:ring-black focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-1.5">
                    Status Barang
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ItemStatus })}
                    className="w-full h-10 px-3 rounded-lg border border-neutral-300 bg-white text-black font-bold focus:ring-2 focus:ring-black focus:outline-none"
                  >
                    <option value="AVAILABLE">AVAILABLE (Tersedia untuk dipinjam)</option>
                    <option value="BORROWED">BORROWED (Sedang Dipinjam)</option>
                    <option value="MAINTENANCE">MAINTENANCE (Perbaikan / Pengecekan)</option>
                    <option value="INACTIVE">INACTIVE (Dinonaktifkan / Tidak Digunakan)</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-1.5">
                    Deskripsi / Catatan Tambahan
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Keterangan spesifikasi atau petunjuk barang..."
                    className="w-full p-3 rounded-lg border border-neutral-300 bg-white text-black font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>

                {/* Accessories Manager */}
                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-3">
                  <label className="block uppercase font-bold text-[10px] text-neutral-700">
                    Kelengkapan Barang (Checklist PIC)
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAccessoryInput}
                      onChange={(e) => setNewAccessoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAccessory();
                        }
                      }}
                      placeholder="Ketik kelengkapan (contoh: Tas, Charger, Lensa)..."
                      className="flex-1 h-9 px-3 rounded-lg border border-neutral-300 bg-white text-xs font-medium focus:ring-2 focus:ring-black focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddAccessory}
                      className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800"
                    >
                      + Tambah
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {accessoriesList.length === 0 ? (
                      <span className="text-neutral-400 italic text-[11px]">
                        Belum ada kelengkapan ditambahkan.
                      </span>
                    ) : (
                      accessoriesList.map((acc) => (
                        <span
                          key={acc}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-neutral-300 text-xs font-medium text-black"
                        >
                          <span>{acc}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAccessory(acc)}
                            className="text-neutral-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-300 font-bold text-neutral-600 hover:bg-neutral-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-mention-yellow text-black font-extrabold uppercase tracking-wider hover:bg-mention-yellowDark shadow-md flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingItem ? 'Simpan Perubahan' : 'Tambah Barang'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: KONFIRMASI HAPUS BARANG */}
        {deleteConfirmItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-2xl w-full max-w-md p-6 shadow-2xl border border-neutral-200">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
                <h3 className="font-black text-lg text-black">Hapus Barang</h3>
                <button
                  onClick={() => setDeleteConfirmItem(null)}
                  className="p-1 text-neutral-400 hover:text-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {deleteError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {deleteError}
                </div>
              )}

              <p className="text-sm text-neutral-700 mb-6">
                Apakah Anda yakin ingin menghapus barang{' '}
                <strong className="text-black font-bold">"{deleteConfirmItem.name}"</strong>? Data barang dan riwayat kelengkapannya akan dihapus.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmItem(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-bold text-xs hover:bg-neutral-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <span>Hapus Barang</span>
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
