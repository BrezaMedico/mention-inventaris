'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { Task } from '@/types';
import {
  INDONESIAN_MONTHS,
  INDONESIAN_DAYS,
  generateCalendarDays,
  getTaskUrgency,
  formatDueDateIndo,
  formatDueDateShort,
} from '@/lib/calendar';
import TaskDetailModal from '@/components/calendar/TaskDetailModal';
import TaskFormModal from '@/components/calendar/TaskFormModal';
import DayTasksModal from '@/components/calendar/DayTasksModal';
import AdminRequiredModal from '@/components/calendar/AdminRequiredModal';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Clock,
  AlertCircle,
  User,
  Loader2,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Month & Year state (defaults to today's local year & month)
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  // Sidebar filter category: 'UPCOMING' | 'OVERDUE'
  const [sidebarFilter, setSidebarFilter] = useState<'UPCOMING' | 'OVERDUE'>('UPCOMING');

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<string | undefined>(undefined);

  const [dayModalDate, setDayModalDate] = useState<string | null>(null);
  const [dayModalTasks, setDayModalTasks] = useState<Task[]>([]);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  const [isAdminRequiredOpen, setIsAdminRequiredOpen] = useState(false);

  // Load tasks & auth status
  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
        setIsAdmin(Boolean(data.isAdmin));
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

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleResetToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    return generateCalendarDays(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Map tasks by date: { '2026-10-15': [task1, task2] }
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (!map[t.due_date]) {
        map[t.due_date] = [];
      }
      map[t.due_date].push(t);
    }
    return map;
  }, [tasks]);

  // Sidebar task lists
  const { upcomingTasks, overdueTasks } = useMemo(() => {
    const upcoming: Task[] = [];
    const overdue: Task[] = [];

    for (const task of tasks) {
      const urgency = getTaskUrgency(task.due_date, today);
      if (urgency.diffDays < 0) {
        overdue.push(task);
      } else {
        upcoming.push(task);
      }
    }

    // Sort upcoming: nearest deadline first (diffDays ascending)
    upcoming.sort((a, b) => {
      const uA = getTaskUrgency(a.due_date, today).diffDays;
      const uB = getTaskUrgency(b.due_date, today).diffDays;
      return uA - uB;
    });

    // Sort overdue: most recent overdue first (diffDays descending, e.g. -1 before -5)
    overdue.sort((a, b) => {
      const uA = getTaskUrgency(a.due_date, today).diffDays;
      const uB = getTaskUrgency(b.due_date, today).diffDays;
      return uB - uA;
    });

    return { upcomingTasks: upcoming, overdueTasks: overdue };
  }, [tasks, today]);

  const displayedSidebarTasks =
    sidebarFilter === 'UPCOMING' ? upcomingTasks : overdueTasks;

  // Task selection for detail modal
  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  // Task creation button / FAB click
  const handleFabClick = () => {
    if (isAdmin) {
      setTaskToEdit(null);
      setFormInitialDate(today.toISOString().slice(0, 10));
      setIsFormOpen(true);
    } else {
      setIsAdminRequiredOpen(true);
    }
  };

  // Admin edit task handler
  const handleOpenEdit = (task: Task) => {
    setTaskToEdit(task);
    setIsFormOpen(true);
  };

  // Admin delete task handler
  const handleDeleteTask = async (taskId: string) => {
    const res = await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } else {
      alert(data.error || 'Gagal menghapus tugas.');
    }
  };

  // Task form success callback
  const handleFormSuccess = (savedTask: Task) => {
    setTasks((prev) => {
      const index = prev.findIndex((t) => t.id === savedTask.id);
      if (index !== -1) {
        const copy = [...prev];
        copy[index] = savedTask;
        return copy;
      }
      return [...prev, savedTask];
    });
  };

  // Open day tasks modal when "+N tugas lainnya" or multiple tasks are clicked
  const handleOpenDayModal = (dateStr: string, dayTasks: Task[]) => {
    setDayModalDate(dateStr);
    setDayModalTasks(dayTasks);
    setIsDayModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-white">
      <Navbar showHomeLink />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        {/* Page Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-mention-yellow" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-mention-yellow">
                Jadwal & Deadline
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Kalender <span className="text-mention-yellow">Tugas</span>
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
              Pantau dan kelola tenggat waktu tugas operasional tim MENTION.
            </p>
          </div>

          {/* Quick status bar */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-mention-yellow" />
              <span className="text-neutral-300 font-medium">
                {upcomingTasks.length} Mendatang
              </span>
            </div>
            {overdueTasks.length > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-900/50 flex items-center gap-2 text-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="font-semibold">{overdueTasks.length} Telat</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid: Sidebar (Kiri) & Kalender (Tengah/Kanan) */}
        <div className="grid grid-cols-1 lg:grid-cols-[310px_1fr] xl:grid-cols-[330px_1fr] gap-6 items-start">
          {/* ========================================================= */}
          {/* 1. SIDEBAR DAFTAR TUGAS (SEBELAH KIRI)                    */}
          {/* ========================================================= */}
          <aside className="w-full rounded-2xl bg-neutral-900/85 backdrop-blur-md border border-neutral-800/80 p-4 sm:p-5 shadow-xl flex flex-col order-2 lg:order-1">
            {/* Header & Filter Dropdown */}
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800/80 gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-mention-yellow" />
                <h2 className="text-sm font-bold text-white">Daftar Tugas</h2>
              </div>

              {/* Dropdown Kategori: Tugas Mendatang / Telat */}
              <div className="relative">
                <select
                  value={sidebarFilter}
                  onChange={(e) =>
                    setSidebarFilter(e.target.value as 'UPCOMING' | 'OVERDUE')
                  }
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-200 focus:border-mention-yellow focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="UPCOMING">
                    Tugas Mendatang ({upcomingTasks.length})
                  </option>
                  <option value="OVERDUE">
                    Telat ({overdueTasks.length})
                  </option>
                </select>
              </div>
            </div>

            {/* Task Items List */}
            <div className="mt-4 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-12 text-center text-neutral-500 space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-mention-yellow" />
                  <p className="text-xs">Memuat tugas...</p>
                </div>
              ) : displayedSidebarTasks.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40">
                  <CheckCircle2 className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-neutral-400">
                    {sidebarFilter === 'UPCOMING'
                      ? 'Tidak ada tugas mendatang.'
                      : 'Hebat! Tidak ada tugas yang telat.'}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    {sidebarFilter === 'UPCOMING'
                      ? 'Semua jadwal tugas telah selesai.'
                      : 'Semua deadline tugas berjalan tepat waktu.'}
                  </p>
                </div>
              ) : (
                displayedSidebarTasks.map((task) => {
                  const urgency = getTaskUrgency(task.due_date, today);

                  return (
                    <div
                      key={task.id}
                      onClick={() => handleOpenDetail(task)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer group hover:scale-[1.01] ${urgency.cardBg} ${urgency.cardBorder}`}
                    >
                      {/* Top Badges: Urgensi & Prioritas */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${urgency.badgeBg}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${urgency.dotColor}`}
                          />
                          {urgency.label}
                        </span>

                        <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-950/60 px-2 py-0.5 rounded-md border border-neutral-800">
                          {task.priority === 'HIGH'
                            ? 'Tinggi'
                            : task.priority === 'LOW'
                            ? 'Rendah'
                            : 'Sedang'}
                        </span>
                      </div>

                      {/* Judul Tugas */}
                      <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-mention-yellow transition-colors line-clamp-2 leading-snug">
                        {task.title}
                      </h3>

                      {/* PIC & Tanggal */}
                      <div className="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
                        <div className="flex items-center gap-1 truncate max-w-[150px]">
                          <User className="w-3 h-3 text-neutral-500 shrink-0" />
                          <span className="truncate">PIC: {task.pic}</span>
                        </div>
                        <div className="font-mono text-neutral-300 font-medium shrink-0">
                          {formatDueDateShort(task.due_date)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* ========================================================= */}
          {/* 2. KALENDER BULANAN (BAGIAN TENGAH / KANAN)              */}
          {/* ========================================================= */}
          <section className="w-full rounded-2xl bg-neutral-900/85 backdrop-blur-md border border-neutral-800/80 p-4 sm:p-6 shadow-xl flex flex-col order-1 lg:order-2">
            {/* Calendar Controls Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-neutral-800/80">
              {/* Navigation: ← Bulan Sebelumnya | Nama Bulan + Tahun | Bulan Berikutnya → */}
              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Bulan Sebelumnya"
                  className="p-2 sm:px-3 sm:py-2 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all flex items-center gap-1 text-xs font-semibold"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>

                <div className="px-4 py-2 rounded-xl bg-neutral-950/90 border border-neutral-800/80 text-center flex-1 sm:flex-initial min-w-[170px]">
                  <span className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                    {INDONESIAN_MONTHS[currentMonth]} {currentYear}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Bulan Berikutnya"
                  className="p-2 sm:px-3 sm:py-2 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all flex items-center gap-1 text-xs font-semibold"
                >
                  <span className="hidden sm:inline">Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Reset to Today button */}
              <button
                type="button"
                onClick={handleResetToday}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-mention-yellow transition-all self-end sm:self-auto"
              >
                Hari Ini
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-4 pb-2 text-center">
              {INDONESIAN_DAYS.map((dayName, idx) => (
                <div
                  key={dayName}
                  className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider py-1 ${
                    idx >= 5 ? 'text-rose-400/80' : 'text-neutral-400'
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* 7-Columns Calendar Date Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((cell) => {
                const dayTasks = tasksByDate[cell.date] || [];
                const hasTasks = dayTasks.length > 0;

                return (
                  <div
                    key={cell.date}
                    onClick={() => {
                      if (hasTasks) {
                        if (dayTasks.length === 1) {
                          handleOpenDetail(dayTasks[0]);
                        } else {
                          handleOpenDayModal(cell.date, dayTasks);
                        }
                      } else if (isAdmin) {
                        setTaskToEdit(null);
                        setFormInitialDate(cell.date);
                        setIsFormOpen(true);
                      }
                    }}
                    className={`min-h-[92px] sm:min-h-[115px] p-1.5 sm:p-2 rounded-xl border transition-all flex flex-col justify-between select-none ${
                      cell.isCurrentMonth
                        ? 'bg-neutral-950/70 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-950'
                        : 'bg-neutral-950/25 border-neutral-900/50 text-neutral-600 opacity-40'
                    } ${
                      cell.isToday
                        ? 'ring-1 ring-mention-yellow/50 bg-neutral-900/90'
                        : ''
                    }`}
                  >
                    {/* Date Number + Penanda Hari Ini */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col items-center">
                        <span
                          className={`text-xs sm:text-sm font-bold ${
                            cell.isToday
                              ? 'text-mention-yellow'
                              : cell.isCurrentMonth
                              ? 'text-neutral-200'
                              : 'text-neutral-600'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Indikator Penanda Hari Ini: Lingkaran kecil di bawah angka tanggal */}
                        {cell.isToday && (
                          <span
                            title="Hari ini"
                            className="w-1.5 h-1.5 rounded-full border border-mention-yellow bg-mention-yellow mt-0.5"
                          />
                        )}
                      </div>

                      {/* Small task count pill if date has tasks */}
                      {hasTasks && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700/60 hidden sm:inline-block">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {/* Task Pills inside Date Cell */}
                    <div className="mt-1 space-y-1 flex-1 flex flex-col justify-end">
                      {/* Show first 2 tasks */}
                      {dayTasks.slice(0, 2).map((t) => {
                        const urgency = getTaskUrgency(t.due_date, today);

                        return (
                          <div
                            key={t.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(t);
                            }}
                            title={`${t.title} — PIC: ${t.pic}`}
                            className={`px-1.5 py-1 rounded-md border text-[10px] leading-tight cursor-pointer transition-all hover:scale-[1.02] ${urgency.cardBg} ${urgency.cardBorder}`}
                          >
                            <div className="font-semibold truncate text-white">
                              {t.title}
                            </div>
                            <div className="text-[9px] text-neutral-300/80 truncate">
                              PIC: {t.pic}
                            </div>
                          </div>
                        );
                      })}

                      {/* If more than 2 tasks: "+N tugas lainnya" badge */}
                      {dayTasks.length > 2 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDayModal(cell.date, dayTasks);
                          }}
                          className="w-full text-center text-[9px] font-bold py-0.5 rounded bg-neutral-800/90 hover:bg-neutral-750 text-mention-yellow border border-neutral-700 transition-colors"
                        >
                          +{dayTasks.length - 2} tugas lainnya
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* ========================================================= */}
      {/* 3. FLOATING ACTION BUTTON (KANAN BAWAH)                   */}
      {/* ========================================================= */}
      <button
        type="button"
        onClick={handleFabClick}
        title={isAdmin ? 'Tambah Tugas Baru' : 'Login Admin untuk Tambah Tugas'}
        className="fixed bottom-6 right-6 z-40 w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-mention-yellow text-black hover:bg-yellow-400 font-bold shadow-2xl shadow-yellow-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 border-yellow-300"
      >
        <Plus className="w-7 h-7 stroke-[2.8]" />
      </button>

      {/* Footer */}
      <footer className="w-full border-t border-mention-border/60 py-5 text-center text-xs text-neutral-500 mt-12">
        Created by Breza Artha Medico XII-SIJA
      </footer>

      {/* ========================================================= */}
      {/* 4. MODALS                                                */}
      {/* ========================================================= */}
      {/* Detail Tugas Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        isAdmin={isAdmin}
        onEdit={(task) => handleOpenEdit(task)}
        onDelete={handleDeleteTask}
      />

      {/* Form Tambah/Edit Tugas (Admin) */}
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        initialDate={formInitialDate}
        taskToEdit={taskToEdit}
      />

      {/* Modal Daftar Semua Tugas pada 1 Tanggal (+N tugas lainnya) */}
      <DayTasksModal
        date={dayModalDate}
        tasks={dayModalTasks}
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        onSelectTask={(task) => handleOpenDetail(task)}
      />

      {/* Modal Peringatan Akses Admin untuk Pengguna Biasa */}
      <AdminRequiredModal
        isOpen={isAdminRequiredOpen}
        onClose={() => setIsAdminRequiredOpen(false)}
      />
    </div>
  );
}
