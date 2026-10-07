'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { Task, TaskPriority } from '@/types';
import { formatDueDateIndo, getTaskUrgency, getLocalTodayStr } from '@/lib/calendar';
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
  Bell,
  X,
  Database,
  Copy,
  Check,
} from 'lucide-react';

export default function AdminCalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSupabaseReady, setIsSupabaseReady] = useState(true);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
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

  // Reminder trigger state
  const [triggeringReminder, setTriggeringReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderError, setReminderError] = useState('');

  const today = useMemo(() => {
    const todayStr = getLocalTodayStr();
    const [y, m, d] = todayStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tasks', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
        if (data.isSupabaseReady !== undefined) {
          setIsSupabaseReady(data.isSupabaseReady);
        }
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

  const handleTriggerTaskReminder = async () => {
    try {
      setTriggeringReminder(true);
      setReminderMessage('');
      setReminderError('');
      const res = await fetch('/api/cron/task-reminder', {
        method: 'POST',
      });
      const data = await res.json();
      if (!data.success) {
        setReminderError(data.error || 'Gagal mengirim pengingat tugas.');
        return;
      }
      setReminderMessage(
        data.message ||
          `Pengingat tugas selesai. ${data.remindersCreated || 0} pesan terkirim, ${data.skippedDueToDuplicate || 0} dilewati (anti-spam).`
      );
      loadTasks();
      setTimeout(() => setReminderMessage(''), 8000);
    } catch (err: any) {
      setReminderError(err.message || 'Terjadi kesalahan koneksi.');
    } finally {
      setTriggeringReminder(false);
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

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Tombol Cek & Kirim Pengingat WA H-1 */}
            <button
              onClick={handleTriggerTaskReminder}
              disabled={triggeringReminder}
              className="px-3.5 py-2.5 rounded-xl border border-emerald-700/70 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Cek tugas H-1 besok & kirim pengingat ke grup WhatsApp (Anti-Spam: Tidak double)"
            >
              {triggeringReminder ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Kirim Pengingat H-1 (WA)</span>
            </button>

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

        {/* Feedback Banners */}
        {reminderMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-200 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{reminderMessage}</span>
            </div>
            <button onClick={() => setReminderMessage('')} className="text-emerald-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {reminderError && (
          <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-700/80 text-red-200 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{reminderError}</span>
            </div>
            <button onClick={() => setReminderError('')} className="text-red-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Banner Peringatan Supabase Belum Dimigrate */}
        {!isSupabaseReady && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/50 border border-amber-500/60 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-amber-950/20 animate-in fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-amber-300 text-sm flex items-center gap-2">
                  Tabel Database Kalender Belum Ada di Supabase Cloud
                </p>
                <p className="text-amber-200/80 text-xs leading-relaxed max-w-2xl">
                  Tabel <code>tasks</code> dan <code>task_reminders</code> belum dibuat di Supabase Cloud. Di hosting serverless (seperti Vercel), data kalender tidak tersimpan permanen dan akan kembali ke awal saat halaman di-refresh. Silakan salin & jalankan SQL migrasi di Supabase SQL Editor.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shrink-0 transition-colors shadow-md flex items-center justify-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Buka SQL Migrasi</span>
            </button>
          </div>
        )}

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
                          <div className="flex items-center gap-1.5 text-neutral-200 font-medium text-xs">
                            <User className="w-3.5 h-3.5 text-neutral-400" />
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

        {/* Modal SQL Migrasi Supabase */}
        {isSqlModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className="w-full max-w-2xl rounded-2xl bg-[#14151c] border border-amber-600/60 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-700/80 bg-[#1c1e27]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">SQL Migrasi Tabel Kalender Supabase</h3>
                    <p className="text-[11px] text-neutral-400">Jalankan di dashboard Supabase agar data kalender tersimpan permanen</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSqlModalOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200/90 leading-relaxed space-y-1">
                  <div className="font-bold text-amber-300">Cara Mengaktifkan:</div>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Klik tombol <strong>Salin Script SQL</strong> di bawah.</li>
                    <li>Buka <a href="https://qaaslumawvoykqyohclh.supabase.co" target="_blank" rel="noreferrer" className="text-amber-400 underline font-semibold">Dashboard Supabase &rarr; SQL Editor</a>.</li>
                    <li>Klik <strong>New query</strong>, tempel (Paste) script ini, lalu klik <strong>Run</strong>.</li>
                    <li>Setelah selesai, refresh halaman ini. Data kalender akan otomatis tersimpan permanen!</li>
                  </ol>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Script SQL Migrasi (Aman & Tidak Menghapus Data Lain)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const sql = `-- 1. Buat Tabel tasks (Kalender Tugas & Deadline)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    pic TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    due_date DATE NOT NULL,
    h1_reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Buat Tabel task_reminders (Log Pengingat Tugas H-1)
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    reminder_type TEXT NOT NULL DEFAULT 'H-1',
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(task_id, due_date, reminder_type)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);

-- 4. Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Allow public read tasks" ON tasks;
CREATE POLICY "Allow public read tasks" ON tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write tasks" ON tasks;
CREATE POLICY "Allow public write tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read task_reminders" ON task_reminders;
CREATE POLICY "Allow public read task_reminders" ON task_reminders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write task_reminders" ON task_reminders;
CREATE POLICY "Allow public write task_reminders" ON task_reminders FOR ALL USING (true) WITH CHECK (true);`;
                        navigator.clipboard.writeText(sql);
                        setSqlCopied(true);
                        setTimeout(() => setSqlCopied(false), 2500);
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] transition-colors flex items-center gap-1.5"
                    >
                      {sqlCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Berhasil Disalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Script SQL</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-3.5 rounded-xl bg-black/60 border border-neutral-800 text-[11px] text-neutral-300 font-mono overflow-x-auto max-h-64 whitespace-pre">
{`-- 1. Buat Tabel tasks (Kalender Tugas & Deadline)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    pic TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    due_date DATE NOT NULL,
    h1_reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Buat Tabel task_reminders (Log Pengingat Tugas H-1)
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    reminder_type TEXT NOT NULL DEFAULT 'H-1',
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(task_id, due_date, reminder_type)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);

-- 4. Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Allow public read tasks" ON tasks;
CREATE POLICY "Allow public read tasks" ON tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write tasks" ON tasks;
CREATE POLICY "Allow public write tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read task_reminders" ON task_reminders;
CREATE POLICY "Allow public read task_reminders" ON task_reminders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write task_reminders" ON task_reminders;
CREATE POLICY "Allow public write task_reminders" ON task_reminders FOR ALL USING (true) WITH CHECK (true);`}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 sm:p-4 border-t border-neutral-700/80 bg-[#1c1e27] flex items-center justify-between gap-3">
                <a
                  href="https://qaaslumawvoykqyohclh.supabase.co"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl border border-neutral-700 hover:border-neutral-600 bg-neutral-800 hover:bg-neutral-750 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Buka Supabase SQL Editor</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsSqlModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-xs transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
