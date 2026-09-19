'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Generation, Member } from '@/types';
import {
  Users,
  Plus,
  Edit2,
  Search,
  X,
  Loader2,
  RefreshCw,
  FolderTree,
  UserCheck,
  UserX,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function AdminMembersPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenFilter, setSelectedGenFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genNameInput, setGenNameInput] = useState('');
  const [genOrderInput, setGenOrderInput] = useState<number>(0);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberFormData, setMemberFormData] = useState({
    name: '',
    generation_id: '',
    phone: '',
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete State
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<Member | null>(null);
  const [deleteConfirmGen, setDeleteConfirmGen] = useState<Generation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/members');
      const data = await res.json();
      if (data.success) {
        setGenerations(data.generations || []);
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Generation
  const handleSaveGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genNameInput.trim()) return;

    try {
      setSaving(true);
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_generation',
          name: genNameInput.trim(),
          order_index: genOrderInput || generations.length + 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsGenModalOpen(false);
        setGenNameInput('');
        loadData();
      } else {
        setModalError(data.error || 'Gagal menyimpan angkatan.');
      }
    } catch {
      setModalError('Terjadi kesalahan koneksi.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Generation active
  const handleToggleGen = async (id: string, currentStatus: boolean) => {
    try {
      await fetch('/api/admin/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_generation',
          id,
          is_active: !currentStatus,
        }),
      });
      loadData();
    } catch {}
  };

  // Open Create Member
  const handleOpenCreateMember = () => {
    setEditingMember(null);
    setMemberFormData({
      name: '',
      generation_id: generations[0]?.id || '',
      phone: '',
      is_active: true,
    });
    setModalError('');
    setIsMemberModalOpen(true);
  };

  // Open Edit Member
  const handleOpenEditMember = (mem: Member) => {
    setEditingMember(mem);
    setMemberFormData({
      name: mem.name,
      generation_id: mem.generation_id,
      phone: mem.phone || '',
      is_active: mem.is_active,
    });
    setModalError('');
    setIsMemberModalOpen(true);
  };

  // Save Member (Create or Edit)
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberFormData.name.trim()) {
      setModalError('Nama anggota wajib diisi.');
      return;
    }
    if (!memberFormData.generation_id) {
      setModalError('Pilih angkatan anggota.');
      return;
    }

    try {
      setSaving(true);
      if (editingMember) {
        // Update
        const res = await fetch('/api/admin/members', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_member',
            id: editingMember.id,
            name: memberFormData.name.trim(),
            generation_id: memberFormData.generation_id,
            phone: memberFormData.phone?.trim() || undefined,
            is_active: memberFormData.is_active,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      } else {
        // Create
        const res = await fetch('/api/admin/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_member',
            name: memberFormData.name.trim(),
            generation_id: memberFormData.generation_id,
            phone: memberFormData.phone?.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }

      setIsMemberModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan anggota.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Member
  const handleDeleteMember = async () => {
    if (!deleteConfirmMember) return;
    try {
      setDeleting(true);
      setDeleteError('');
      const res = await fetch(`/api/admin/members?id=${deleteConfirmMember.id}&type=member`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        setDeleteError(data.error || 'Gagal menghapus anggota.');
        return;
      }
      setDeleteConfirmMember(null);
      loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setDeleting(false);
    }
  };

  // Delete Generation
  const handleDeleteGen = async () => {
    if (!deleteConfirmGen) return;
    try {
      setDeleting(true);
      setDeleteError('');
      const res = await fetch(`/api/admin/members?id=${deleteConfirmGen.id}&type=generation`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        setDeleteError(data.error || 'Gagal menghapus angkatan.');
        return;
      }
      setDeleteConfirmGen(null);
      if (selectedGenFilter === deleteConfirmGen.id) {
        setSelectedGenFilter('ALL');
      }
      loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered members
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.phone && m.phone.includes(searchQuery));
    const matchesGen = selectedGenFilter === 'ALL' || m.generation_id === selectedGenFilter;
    return matchesSearch && matchesGen;
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-mention-yellow uppercase tracking-wider mb-1">
              Manajemen Organisasi
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Angkatan & Anggota</h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                setGenNameInput('');
                setGenOrderInput(generations.length + 1);
                setModalError('');
                setIsGenModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-bold text-xs uppercase tracking-wider hover:border-neutral-500 transition-all flex items-center gap-1.5"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>+ Angkatan</span>
            </button>

            <button
              onClick={handleOpenCreateMember}
              className="px-4 py-2.5 rounded-xl bg-mention-yellow text-black font-extrabold text-xs uppercase tracking-wider hover:bg-mention-yellowDark transition-all shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Anggota</span>
            </button>
          </div>
        </div>

        {/* Generations Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedGenFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedGenFilter === 'ALL'
                ? 'bg-white text-black'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            Semua Angkatan ({members.length})
          </button>

          {generations.map((gen) => {
            const count = members.filter((m) => m.generation_id === gen.id).length;
            const isSelected = selectedGenFilter === gen.id;
            return (
              <div key={gen.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedGenFilter(gen.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-black'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  } ${!gen.is_active ? 'opacity-50 line-through' : ''}`}
                >
                  {gen.name} ({count})
                </button>
                {isSelected && (
                  <button
                    onClick={() => {
                      setDeleteError('');
                      setDeleteConfirmGen(gen);
                    }}
                    className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-neutral-800 transition-colors"
                    title={`Hapus ${gen.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama anggota..."
            className="w-full h-10 pl-10 pr-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-medium focus:ring-2 focus:ring-mention-yellow focus:outline-none"
          />
        </div>

        {/* Members Table (Card in White) */}
        <div className="bg-white text-black rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-200">
          {loading ? (
            <div className="py-12 text-center text-neutral-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat anggota...</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              Belum ada anggota terdaftar untuk filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Nama Anggota</th>
                    <th className="py-3 px-3">Angkatan</th>
                    <th className="py-3 px-3">Kontak</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredMembers.map((mem) => {
                    const gen = generations.find((g) => g.id === mem.generation_id);
                    return (
                      <tr key={mem.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-black text-sm">{mem.name}</td>
                        <td className="py-3.5 px-3 font-semibold text-neutral-700">
                          {gen?.name || 'Tidak diketahui'}
                        </td>
                        <td className="py-3.5 px-3 text-neutral-600 font-mono">
                          {mem.phone || '-'}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              mem.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-neutral-200 text-neutral-600'
                            }`}
                          >
                            {mem.is_active ? 'AKTIF' : 'NONAKTIF'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditMember(mem)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black text-white text-[11px] font-bold hover:bg-neutral-800 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setDeleteError('');
                                setDeleteConfirmMember(mem);
                              }}
                              className="inline-flex items-center justify-center p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="Hapus Anggota"
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

        {/* MODAL: TAMBAH ANGKATAN */}
        {isGenModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-neutral-200">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-5">
                <h3 className="font-black text-lg text-black">Tambah Angkatan Baru</h3>
                <button
                  onClick={() => setIsGenModalOpen(false)}
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

              <form onSubmit={handleSaveGeneration} className="space-y-4 text-xs">
                <div>
                  <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-1">
                    Nama Angkatan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={genNameInput}
                    onChange={(e) => setGenNameInput(e.target.value)}
                    placeholder="Contoh: Angkatan 5"
                    required
                    autoFocus
                    className="w-full h-10 px-3 rounded-lg border border-neutral-300 bg-white text-black font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-1">
                    Urutan Tampil (Order Index)
                  </label>
                  <input
                    type="number"
                    value={genOrderInput}
                    onChange={(e) => setGenOrderInput(parseInt(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-lg border border-neutral-300 bg-white text-black font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGenModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-300 font-bold text-neutral-600 hover:bg-neutral-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-black text-white font-bold hover:bg-neutral-800"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Angkatan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: TAMBAH / EDIT ANGGOTA */}
        {isMemberModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-neutral-200">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-5">
                <h3 className="font-black text-lg text-black">
                  {editingMember ? 'Edit Data Anggota' : 'Tambah Anggota Baru'}
                </h3>
                <button
                  onClick={() => setIsMemberModalOpen(false)}
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

              <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
                <div>
                  <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={memberFormData.name}
                    onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                    placeholder="Contoh: Breza Artha Medico"
                    required
                    autoFocus
                    className="w-full h-10 px-3 rounded-lg border border-neutral-300 bg-white text-black font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-1">
                    Angkatan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={memberFormData.generation_id}
                    onChange={(e) => setMemberFormData({ ...memberFormData, generation_id: e.target.value })}
                    required
                    className="w-full h-10 px-3 rounded-lg border border-neutral-300 bg-white text-black font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  >
                    {generations.map((gen) => (
                      <option key={gen.id} value={gen.id}>
                        {gen.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-1">
                    Nomor WhatsApp / Telepon (Opsional)
                  </label>
                  <input
                    type="text"
                    value={memberFormData.phone}
                    onChange={(e) => setMemberFormData({ ...memberFormData, phone: e.target.value })}
                    placeholder="Contoh: 08123456789"
                    className="w-full h-10 px-3 rounded-lg border border-neutral-300 bg-white text-black font-medium font-mono focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>

                {editingMember && (
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={memberFormData.is_active}
                        onChange={(e) => setMemberFormData({ ...memberFormData, is_active: e.target.checked })}
                        className="w-4 h-4 rounded text-black focus:ring-black"
                      />
                      <span className="font-bold text-neutral-800">Status Aktif</span>
                    </label>
                  </div>
                )}

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMemberModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-300 font-bold text-neutral-600 hover:bg-neutral-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-mention-yellow text-black font-extrabold uppercase hover:bg-mention-yellowDark"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Anggota'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: KONFIRMASI HAPUS ANGGOTA */}
        {deleteConfirmMember && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-neutral-200">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="p-3 bg-red-100 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-black">Hapus Anggota?</h3>
                  <p className="text-xs text-neutral-500">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
              </div>

              {deleteError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  {deleteError}
                </div>
              )}

              <p className="text-xs text-neutral-600 mb-5">
                Apakah Anda yakin ingin menghapus data anggota{' '}
                <span className="font-bold text-black">{deleteConfirmMember.name}</span>?
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmMember(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 font-bold text-neutral-600 text-xs hover:bg-neutral-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMember}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: KONFIRMASI HAPUS ANGKATAN */}
        {deleteConfirmGen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-neutral-200">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="p-3 bg-red-100 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-black">Hapus Angkatan?</h3>
                  <p className="text-xs text-neutral-500">Semua anggota di dalamnya akan terhapus.</p>
                </div>
              </div>

              {deleteError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  {deleteError}
                </div>
              )}

              <p className="text-xs text-neutral-600 mb-5">
                Apakah Anda yakin ingin menghapus{' '}
                <span className="font-bold text-black">{deleteConfirmGen.name}</span>?
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmGen(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 font-bold text-neutral-600 text-xs hover:bg-neutral-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteGen}
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
