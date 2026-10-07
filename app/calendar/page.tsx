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
  getLocalTodayStr,
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
  Database,
} from 'lucide-react';

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Tanggal hari ini dalam waktu lokal / Asia/Jakarta (WIB)
  const [todayStr, setTodayStr] = useState<string>(() => getLocalTodayStr());

  // Pastikan sinkronisasi tanggal lokal saat komponen termuat di browser client
  useEffect(() => {
    const localToday = getLocalTodayStr();
    setTodayStr(localToday);
  }, []);

  const today = useMemo(() => {
    const [y, m, d] = todayStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [todayStr]);

  const [currentYear, setCurrentYear] = useState<number>(() => {
    const [y] = getLocalTodayStr().split('-').map(Number);
    return y;
  });
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    const [, m] = getLocalTodayStr().split('-').map(Number);
    return m - 1; // 0-indexed
  });

  // Selected date for mobile agenda view & active date highlight
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalTodayStr());

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
  const [isSupabaseReady, setIsSupabaseReady] = useState(true);

  // Load tasks & auth status
  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tasks', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
        setIsAdmin(Boolean(data.isAdmin));
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
    const localNow = getLocalTodayStr();
    const [y, m] = localNow.split('-').map(Number);
    setCurrentYear(y);
    setCurrentMonth(m - 1);
    setSelectedDate(localNow);
  };

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    return generateCalendarDays(currentYear, currentMonth, todayStr);
  }, [currentYear, currentMonth, todayStr]);

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
      setFormInitialDate(todayStr);
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

  // Tasks on currently selected date (for mobile agenda view)
  const selectedDateTasks = useMemo(() => {
    return tasksByDate[selectedDate] || [];
  }, [tasksByDate, selectedDate]);

  // Click on calendar day cell
  const handleCellClick = (cellDate: string, isCurrentMonth: boolean, dayTasks: Task[]) => {
    setSelectedDate(cellDate);

    // If day from different month is clicked, switch view to that month
    const [cYear, cMonth] = cellDate.split('-').map(Number);
    if (cYear !== currentYear || cMonth - 1 !== currentMonth) {
      setCurrentYear(cYear);
      setCurrentMonth(cMonth - 1);
    }

    // On desktop/tablet screens (sm and up), maintain immediate modal opening
    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
      if (dayTasks.length === 1) {
        handleOpenDetail(dayTasks[0]);
      } else if (dayTasks.length > 1) {
        handleOpenDayModal(cellDate, dayTasks);
      } else if (isAdmin) {
        setTaskToEdit(null);
        setFormInitialDate(cellDate);
        setIsFormOpen(true);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-white">
      <Navbar showHomeLink />

      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 w-full">
        {/* Page Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-mention-yellow" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-mention-yellow">
                Jadwal & Deadline
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              Kalender <span className="text-mention-yellow">Tugas</span>
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
              Pantau dan kelola tenggat waktu tugas operasional tim MENTION.
            </p>
          </div>

          {/* Quick status bar */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#14151c] border border-neutral-700/80 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-mention-yellow" />
              <span className="text-neutral-200 font-medium text-[11px] sm:text-xs">
                {upcomingTasks.length} Mendatang
              </span>
            </div>
            {overdueTasks.length > 0 && (
              <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800/70 flex items-center gap-2 text-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="font-semibold text-[11px] sm:text-xs">{overdueTasks.length} Telat</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning Banner untuk Admin jika Supabase belum dimigrate */}
        {isAdmin && !isSupabaseReady && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-950/60 border border-amber-500/60 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-amber-300">Sinkronisasi Cloud Supabase Belum Aktif: </span>
                <span className="text-amber-200/80">
                  Tabel <code>tasks</code> belum dibuat di Supabase Cloud. Di hosting (Vercel), perubahan data tidak tersimpan permanen saat refresh.
                </span>
              </div>
            </div>
            <a
              href="/admin/calendar"
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shrink-0 transition-colors text-center shadow-sm"
            >
              Lihat SQL Migrasi di Admin
            </a>
          </div>
        )}

        {/* Main Grid: Sidebar (Kiri) & Kalender (Tengah/Kanan) */}
        <div className="grid grid-cols-1 lg:grid-cols-[310px_1fr] xl:grid-cols-[330px_1fr] gap-4 sm:gap-6 items-start">
          {/* ========================================================= */}
          {/* 1. SIDEBAR DAFTAR TUGAS (SEBELAH KIRI)                    */}
          {/* ========================================================= */}
          <aside className="w-full rounded-2xl bg-[#13141a]/95 backdrop-blur-md border border-neutral-700/80 p-3.5 sm:p-5 shadow-2xl shadow-black/50 ring-1 ring-white/5 flex flex-col order-2 lg:order-1 lg:sticky lg:top-20 transition-all">
            {/* Header: Title + Subtitle + Total Pill */}
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-700/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-mention-yellow/15 border border-mention-yellow/30 flex items-center justify-center text-mention-yellow shadow-sm shadow-yellow-500/10">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white leading-tight">Daftar Tugas</h2>
                  <p className="text-[10px] text-neutral-400">Tenggat & Prioritas Tim</p>
                </div>
              </div>

              {/* Total count badge */}
              <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#1c1e27] border border-neutral-700 text-neutral-300 shadow-inner">
                {tasks.length} Total
              </span>
            </div>

            {/* Segmented Filter Tabs: [Mendatang] [Telat] */}
            <div className="mt-3.5 p-1 rounded-xl bg-[#161822] border border-neutral-700/80 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setSidebarFilter('UPCOMING')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  sidebarFilter === 'UPCOMING'
                    ? 'bg-[#252836] text-mention-yellow shadow-md border border-neutral-600/90'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                }`}
              >
                <span>Mendatang</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                    sidebarFilter === 'UPCOMING'
                      ? 'bg-mention-yellow text-black'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {upcomingTasks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSidebarFilter('OVERDUE')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  sidebarFilter === 'OVERDUE'
                    ? 'bg-rose-950/80 text-rose-200 shadow-md border border-rose-800/80'
                    : 'text-neutral-400 hover:text-rose-300 hover:bg-rose-950/30'
                }`}
              >
                <span>Telat</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                    sidebarFilter === 'OVERDUE'
                      ? 'bg-rose-500 text-white'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {overdueTasks.length}
                </span>
              </button>
            </div>

            {/* Task Items List */}
            <div className="mt-3.5 space-y-2.5 max-h-[400px] lg:max-h-[580px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-12 text-center text-neutral-400 space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-mention-yellow" />
                  <p className="text-xs">Memuat tugas...</p>
                </div>
              ) : displayedSidebarTasks.length === 0 ? (
                <div className="py-10 px-4 text-center rounded-xl border border-dashed border-neutral-700/80 bg-[#181a23]/60">
                  <CheckCircle2 className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-neutral-300">
                    {sidebarFilter === 'UPCOMING'
                      ? 'Tidak ada tugas mendatang.'
                      : 'Hebat! Tidak ada tugas yang telat.'}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1">
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
                      className={`group relative p-3 sm:p-3.5 rounded-xl border transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 hover:border-neutral-500 active:scale-[0.98] active:translate-y-0 ${urgency.cardBg} ${urgency.cardBorder}`}
                    >
                      {/* Top Badges: Urgensi & Prioritas */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 transition-colors ${urgency.badgeBg}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${urgency.dotColor}`}
                          />
                          {urgency.label}
                        </span>

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            task.priority === 'HIGH'
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                              : task.priority === 'LOW'
                              ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                              : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          }`}
                        >
                          {task.priority === 'HIGH'
                            ? 'Prioritas Tinggi'
                            : task.priority === 'LOW'
                            ? 'Prioritas Rendah'
                            : 'Prioritas Sedang'}
                        </span>
                      </div>

                      {/* Judul Tugas + Panah Hover Indikator */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-mention-yellow transition-colors duration-150 line-clamp-2 leading-snug flex-1">
                          {task.title}
                        </h3>
                        <div className="w-6 h-6 rounded-lg bg-neutral-800/60 group-hover:bg-mention-yellow group-hover:text-black text-neutral-400 flex items-center justify-center transition-all duration-200 shrink-0 mt-0.5">
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                      {/* PIC & Tanggal */}
                      <div className="mt-2.5 pt-2 border-t border-neutral-700/60 flex items-center justify-between text-[11px] text-neutral-400">
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <User className="w-3.5 h-3.5 text-neutral-400 shrink-0 group-hover:text-mention-yellow transition-colors" />
                          <span className="truncate text-neutral-300 font-medium">PIC: {task.pic}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-neutral-300 text-[11px] font-medium shrink-0 group-hover:text-white transition-colors">
                          <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
                          <span>{formatDueDateShort(task.due_date)}</span>
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
          <section className="w-full rounded-2xl bg-[#13141a]/95 backdrop-blur-md border border-neutral-700/80 p-3 sm:p-6 shadow-2xl shadow-black/50 ring-1 ring-white/5 flex flex-col order-1 lg:order-2">
            {/* Calendar Controls Header */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-3 pb-3 sm:pb-5 border-b border-neutral-700/80">
              {/* Navigation: ← Bulan Sebelumnya | Nama Bulan + Tahun | Bulan Berikutnya → */}
              <div className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Bulan Sebelumnya"
                  className="p-1.5 sm:px-3 sm:py-2 rounded-xl border border-neutral-700/80 bg-[#1c1e27] hover:bg-[#252834] active:scale-95 text-neutral-200 hover:text-white transition-all flex items-center gap-1 text-xs font-semibold shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>

                <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#1c1e27] border border-neutral-700/80 text-center flex-1 sm:flex-initial sm:min-w-[170px] shadow-inner">
                  <span className="text-xs sm:text-base font-extrabold text-white tracking-wide whitespace-nowrap">
                    {INDONESIAN_MONTHS[currentMonth]} {currentYear}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Bulan Berikutnya"
                  className="p-1.5 sm:px-3 sm:py-2 rounded-xl border border-neutral-700/80 bg-[#1c1e27] hover:bg-[#252834] active:scale-95 text-neutral-200 hover:text-white transition-all flex items-center gap-1 text-xs font-semibold shrink-0"
                >
                  <span className="hidden sm:inline">Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Reset to Today button */}
              <button
                type="button"
                onClick={handleResetToday}
                className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-neutral-700/80 bg-[#1c1e27] text-neutral-300 hover:text-white hover:border-mention-yellow hover:bg-[#252834] active:scale-95 transition-all shrink-0"
              >
                Hari Ini
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-3 sm:pt-4 pb-2 text-center">
              {INDONESIAN_DAYS.map((dayName, idx) => (
                <div
                  key={dayName}
                  className={`text-[10px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-wider py-1 sm:py-1.5 rounded-md sm:rounded-lg ${
                    idx >= 5
                      ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                      : 'text-neutral-300 bg-[#1a1c24] border border-neutral-700/40'
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
                const isSelected = selectedDate === cell.date;

                return (
                  <div
                    key={cell.date}
                    onClick={() => handleCellClick(cell.date, cell.isCurrentMonth, dayTasks)}
                    className={`min-h-[58px] sm:min-h-[118px] p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 ${
                      cell.isToday
                        ? isSelected
                          ? '!bg-[#272a3a] !border-mention-yellow ring-2 ring-mention-yellow shadow-lg shadow-yellow-500/20'
                          : '!bg-mention-yellow/10 !border-mention-yellow ring-1 ring-mention-yellow/60 shadow-md shadow-yellow-500/10'
                        : isSelected
                        ? '!bg-[#272a3a] !border-white/80 ring-2 ring-white/50 shadow-md'
                        : cell.isCurrentMonth
                        ? 'bg-[#1a1c25] border-neutral-700/70 hover:border-neutral-500/80 hover:bg-[#20232f] shadow-sm'
                        : 'bg-[#101117]/50 border-neutral-800/50 text-neutral-600 opacity-40 hover:opacity-70'
                    }`}
                  >
                    {/* Date Number + Penanda Hari Ini */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5 sm:flex-col sm:items-start">
                        <span
                          className={`text-xs sm:text-sm font-bold ${
                            cell.isToday
                              ? 'text-mention-yellow font-black'
                              : isSelected
                              ? 'text-white font-bold'
                              : cell.isCurrentMonth
                              ? 'text-white'
                              : 'text-neutral-500'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Indikator Penanda Hari Ini */}
                        {cell.isToday && (
                          <span
                            title="Hari ini"
                            className="text-[8px] font-black uppercase tracking-tight text-mention-yellow bg-yellow-500/20 border border-yellow-500/30 px-1 py-0.2 rounded hidden sm:inline-block leading-tight"
                          >
                            Hari Ini
                          </span>
                        )}
                      </div>

                      {/* Small task count pill if date has tasks (desktop only) */}
                      {hasTasks && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#272a38] text-neutral-200 border border-neutral-600/70 hidden sm:inline-block">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {/* Mobile Task Dots Indicator (< sm) - Bulat Kuning */}
                    {hasTasks && (
                      <div className="flex sm:hidden items-center justify-center gap-1.5 mt-1 pb-0.5 flex-wrap">
                        {dayTasks.slice(0, 4).map((t, idx) => (
                          <span
                            key={t.id || idx}
                            title={t.title}
                            className="w-2 h-2 rounded-full bg-mention-yellow shadow-sm shadow-yellow-500/60 ring-1 ring-black/40"
                          />
                        ))}
                        {dayTasks.length > 4 && (
                          <span className="text-[8px] font-black text-mention-yellow leading-none">
                            +{dayTasks.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Desktop Task Cards (sm:) */}
                    <div className="hidden sm:flex mt-1 space-y-1 flex-1 flex-col justify-end">
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
                            <div className="text-[9px] text-neutral-200/90 truncate">
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
                          className="w-full text-center text-[9px] font-bold py-0.5 rounded bg-[#272a38] hover:bg-[#323647] text-mention-yellow border border-neutral-600/70 shadow-sm transition-colors"
                        >
                          +{dayTasks.length - 2} tugas lainnya
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ========================================================= */}
            {/* MOBILE-ONLY: AGENDA TANGGAL TERPILIH                      */}
            {/* Ditampilkan tepat di bawah grid kalender pada HP          */}
            {/* ========================================================= */}
            <div className="block lg:hidden mt-4 pt-4 border-t border-neutral-700/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-mention-yellow" />
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Agenda: <span className="text-mention-yellow">{formatDueDateIndo(selectedDate)}</span>
                  </h3>
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#1c1e27] border border-neutral-700 text-neutral-300">
                  {selectedDateTasks.length} Tugas
                </span>
              </div>

              {selectedDateTasks.length === 0 ? (
                <div className="p-3.5 rounded-xl border border-dashed border-neutral-700/70 bg-[#161822]/60 text-center flex items-center justify-between gap-2">
                  <p className="text-xs text-neutral-400 text-left">
                    Tidak ada tugas pada tanggal ini.
                  </p>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTaskToEdit(null);
                        setFormInitialDate(selectedDate);
                        setIsFormOpen(true);
                      }}
                      className="text-xs font-bold text-black bg-mention-yellow hover:bg-yellow-400 px-2.5 py-1.5 rounded-lg flex items-center gap-1 shrink-0 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Tambah</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-neutral-500 italic shrink-0">Bebas Tugas</span>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateTasks.map((task) => {
                    const urgency = getTaskUrgency(task.due_date, today);
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleOpenDetail(task)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${urgency.cardBg} ${urgency.cardBorder} active:scale-[0.99]`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${urgency.badgeBg}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${urgency.dotColor}`} />
                              {urgency.label}
                            </span>
                            <span className="text-[10px] font-semibold text-neutral-300 bg-[#151720] px-2 py-0.5 rounded-md border border-neutral-700">
                              {task.priority === 'HIGH' ? 'Tinggi' : task.priority === 'LOW' ? 'Rendah' : 'Sedang'}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {task.title}
                          </h4>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                            <User className="w-3 h-3 text-neutral-400" />
                            <span className="truncate">PIC: {task.pic}</span>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-neutral-800/90 text-neutral-300 flex items-center justify-center shrink-0">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-mention-yellow text-black hover:bg-yellow-400 font-bold shadow-2xl shadow-yellow-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 border-yellow-300"
      >
        <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.8]" />
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
