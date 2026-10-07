'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { Task, TaskPriority } from '@/types';
import { formatDueDateIndo, getTaskUrgency } from '@/lib/calendar';
import TaskFormModal from '@/components/calendar/TaskFormModal';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Clock,
  AlertCircle,
  User,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  Filter,
} from 'lucide-react';

export default function AdminCalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'UPCOMING' | 'OVERDUE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Delete State
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const today = useMemo(() => new Date(), []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    let upcoming = 0;
    let overdue = 0;
    let todayCount = 0;

    for (const t of tasks) {
      const u = getTaskUrgency(t.due_date, today);
      if (u.category === 'OVERDUE') overdue++;
      else upcoming++;

      if (u.category === 'TODAY') todayCount++;
    }

    return { total: tasks.length, upcoming, overdue, todayCount };
  }, [tasks, today]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search filter
      const matchesSearch =
        !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.pic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // Priority filter
      const matchesPriority =
        priorityFilter === 'ALL' || t.priority === priorityFilter;

      // Urgency filter
      const u = getTaskUrgency(t.due_date, today);
      const matchesUrgency =
        urgencyFilter === 'ALL' ||
        (urgencyFilter === 'OVERDUE' && u.category === 'OVERDUE') ||
        (urgencyFilter === 'UPCOMING' && u.category !== 'OVERDUE');

      return matchesSearch && matchesPriority && matchesUrgency;
    });
  }, [tasks, searchQuery, priorityFilter, urgencyFilter, today]);

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleFormSuccess = (savedTask: Task) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === savedTask.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = savedTask;
        return copy;
      }
      return [...prev, savedTask];
    });
  };

  const handleDeleteTask = async () => {
    if (!deleteConfirmTask) return;
    try {
      setDeleting(true);
      setDeleteError('');
      const res = await fetch(`/api/tasks?id=${deleteConfirmTask.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus tugas.');
      }
      setTasks((prev) => prev.filter((t) => t.id !== deleteConfirmTask.id));
      setDeleteConfirmTask(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus tugas.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Title & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-mention-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-mention-yellow" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-mention-yellow">
                Kalender & Manajemen Tugas
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Kelola <span className="text-mention-yellow">Deadline Tugas</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              Tambah, perbarui, dan hapus tugas jadwal operasional tim organisasi.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/calendar"
              target="_blank"
              className="px-3.5 py-2.5 rounded-xl border border-mention-border bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>Lihat Kalender Publik</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            </Link>

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-xl bg-mention-yellow text-black hover:bg-yellow-400 font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-yellow-500/10"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Tugas</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-mention-yellow">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-neutral-400">Total Tugas</div>
              <div className="text-xl font-bold text-white">{stats.total}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-green-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-neutral-400">Mendatang</div>
              <div className="text-xl font-bold text-white">{stats.upcoming}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950/50 border border-rose-900/60 flex items-center justify-center text-rose-300">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-neutral-400">Tugas Telat</div>
              <div className="text-xl font-bold text-rose-300">{stats.overdue}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/50 border border-red-800/60 flex items-center justify-center text-red-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-neutral-400">Hari H</div>
              <div className="text-xl font-bold text-red-300">{stats.todayCount}</div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul tugas, PIC, deskripsi..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200 placeholder-neutral-500 text-xs focus:border-mention-yellow focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Status Urgensi Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) =>
                setUrgencyFilter(e.target.value as 'ALL' | 'UPCOMING' | 'OVERDUE')
              }
              className="text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200 focus:border-mention-yellow focus:outline-none transition-colors"
            >
              <option value="ALL">Semua Waktu</option>
              <option value="UPCOMING">Mendatang</option>
              <option value="OVERDUE">Telat (Overdue)</option>
            </select>

            {/* Prioritas Filter */}
            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as 'ALL' | TaskPriority)
              }
              className="text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200 focus:border-mention-yellow focus:outline-none transition-colors"
            >
              <option value="ALL">Semua Prioritas</option>
              <option value="HIGH">Tinggi</option>
              <option value="MEDIUM">Sedang</option>
              <option value="LOW">Rendah</option>
            </select>
          </div>
        </div>

        {/* Task Table / Card List */}
        <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-neutral-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-mention-yellow" />
              <p className="text-xs">Memuat daftar tugas...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <CalendarIcon className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-sm font-semibold text-neutral-400">
                {searchQuery || priorityFilter !== 'ALL' || urgencyFilter !== 'ALL'
                  ? 'Tidak ada tugas yang sesuai filter.'
                  : 'Belum ada tugas yang ditambahkan.'}
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 rounded-xl bg-mention-yellow text-black hover:bg-yellow-400 font-bold text-xs inline-flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Tugas Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/90 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Judul Tugas</th>
                    <th className="py-3.5 px-4 font-bold">PIC</th>
                    <th className="py-3.5 px-4 font-bold">Prioritas</th>
                    <th className="py-3.5 px-4 font-bold">Tenggat Waktu</th>
                    <th className="py-3.5 px-4 font-bold">Urgensi</th>
                    <th className="py-3.5 px-4 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredTasks.map((task) => {
                    const urgency = getTaskUrgency(task.due_date, today);

                    return (
                      <tr
                        key={task.id}
                        className="hover:bg-neutral-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-[11px] text-neutral-400 truncate max-w-xs mt-0.5">
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-neutral-200">
                            <User className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{task.pic}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              task.priority === 'HIGH'
                                ? 'bg-red-950/60 text-red-300 border-red-800/60'
                                : task.priority === 'LOW'
                                ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                                : 'bg-yellow-950/60 text-yellow-300 border-yellow-800/60'
                            }`}
                          >
                            {task.priority === 'HIGH'
                              ? 'Tinggi'
                              : task.priority === 'LOW'
                              ? 'Rendah'
                              : 'Sedang'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-neutral-200 font-semibold">
                          {formatDueDateIndo(task.due_date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 ${urgency.badgeBg}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${urgency.dotColor}`}
                            />
                            {urgency.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(task)}
                              title="Edit Tugas"
                              className="p-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmTask(task)}
                              title="Hapus Tugas"
                              className="p-1.5 rounded-lg border border-red-900/60 bg-red-950/40 hover:bg-red-900/60 text-red-300 transition-colors"
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

        {/* Modal Form Tambah / Edit Tugas */}
        <TaskFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleFormSuccess}
          taskToEdit={editingTask}
        />

        {/* Modal Konfirmasi Hapus */}
        {deleteConfirmTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400 mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-white">Hapus Tugas?</h3>
                <p className="text-xs text-neutral-400">
                  Apakah Anda yakin ingin menghapus tugas{' '}
                  <strong className="text-neutral-200">
                    &ldquo;{deleteConfirmTask.title}&rdquo;
                  </strong>
                  ? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              {deleteError && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTask(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <span>Ya, Hapus</span>
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
