'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { Task } from '@/types';
import {
  INDONESIAN_MONTHS,
  INDONESIAN_DAYS,
  generateCalendarDays,
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
  Plus,
  Clock,
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
      if (task.due_date < todayStr) {
        overdue.push(task);
      } else {
        upcoming.push(task);
      }
    }

    // Sort upcoming: nearest deadline first
    upcoming.sort((a, b) => a.due_date.localeCompare(b.due_date));

    // Sort overdue: most recent overdue first
    overdue.sort((a, b) => b.due_date.localeCompare(a.due_date));

    return { upcomingTasks: upcoming, overdueTasks: overdue };
  }, [tasks, todayStr]);

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

    // On desktop/tablet screens (sm and up), open detail or modal immediately
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

  // Dynamic row count for month
  const numRows = Math.ceil(calendarDays.length / 7);

  return (
    <div className="flex flex-col min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-transparent text-white">
      <div className="shrink-0">
        <Navbar showHomeLink />
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pt-1 sm:pt-2 pb-2 sm:pb-3 w-full flex flex-col min-h-0 overflow-hidden">

        {/* Warning Banner untuk Admin jika Supabase belum dimigrate */}
        {isAdmin && !isSupabaseReady && (
          <div className="mb-2 p-2 rounded-xl bg-amber-950/60 border border-amber-500/60 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-amber-200/90 text-[11px]">
                <strong className="text-amber-300">Supabase:</strong> Tabel <code>tasks</code> belum termigrate.
              </span>
            </div>
            <a
              href="/admin/calendar"
              className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-[11px] shrink-0 transition-colors text-center"
            >
              Lihat SQL
            </a>
          </div>
        )}

        {/* Main Grid: Sidebar (Kiri) & Kalender (Kanan) - Pas 1 Layar Penuh */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-2.5 sm:gap-3 items-stretch flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* ========================================================= */}
          {/* 1. SIDEBAR DAFTAR TUGAS (SEBELAH KIRI)                    */}
          {/* Hanya bagian ini yang dapat di-scroll                     */}
          {/* ========================================================= */}
          <aside className="w-full h-full rounded-2xl bg-[#13141a]/95 backdrop-blur-md border border-neutral-700/80 p-2.5 sm:p-3 shadow-2xl shadow-black/50 ring-1 ring-white/5 flex flex-col order-2 lg:order-1 min-h-0 overflow-hidden">
            {/* Header: Title + Total Pill */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-700/80 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-mention-yellow/15 border border-mention-yellow/30 flex items-center justify-center text-mention-yellow shadow-sm">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white leading-tight">Daftar Tugas</h2>
                  <p className="text-[10px] text-neutral-400">Jadwal & Deadline Tim</p>
                </div>
              </div>

              {/* Total count badge */}
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#1c1e27] border border-neutral-700 text-neutral-300 shadow-inner">
                {tasks.length} Total
              </span>
            </div>

            {/* Segmented Filter Tabs: [Mendatang] [Telat] */}
            <div className="mt-2 p-1 rounded-xl bg-[#161822] border border-neutral-700/80 grid grid-cols-2 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setSidebarFilter('UPCOMING')}
                className={`py-1 px-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
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
                className={`py-1 px-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
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

            {/* Task Items List — HANYA BAGIAN INI YANG BISA DI-SCROLL */}
            <div className="mt-2 space-y-2 flex-1 overflow-y-auto pr-1 min-h-0">
              {loading ? (
                <div className="py-10 text-center text-neutral-400 space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-mention-yellow" />
                  <p className="text-xs">Memuat tugas...</p>
                </div>
              ) : displayedSidebarTasks.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-xl border border-dashed border-neutral-700/80 bg-[#181a23]/60">
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
                  const taskColor = task.color || '#FACC15';
                  const isOverdue = task.due_date < todayStr;

                  return (
                    <div
                      key={task.id}
                      onClick={() => handleOpenDetail(task)}
                      className="group relative p-2.5 rounded-xl border border-neutral-700/80 bg-[#161822] hover:bg-[#1d202e] hover:border-neutral-500 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 active:scale-[0.98]"
                      style={{
                        borderLeftColor: taskColor,
                        borderLeftWidth: '3.5px',
                      }}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: taskColor }}
                          />
                          <span className="text-[10px] font-mono text-neutral-300 font-semibold">
                            {taskColor.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {isOverdue && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80">
                              Telat
                            </span>
                          )}
                          <span
                            className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                              task.priority === 'HIGH'
                                ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                                : task.priority === 'LOW'
                                ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                                : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                            }`}
                          >
                            {task.priority === 'HIGH'
                              ? 'Tinggi'
                              : task.priority === 'LOW'
                              ? 'Rendah'
                              : 'Sedang'}
                          </span>
                        </div>
                      </div>

                      {/* Judul Tugas */}
                      <div className="flex items-start justify-between gap-1.5">
                        <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-mention-yellow transition-colors duration-150 line-clamp-2 leading-snug flex-1">
                          {task.title}
                        </h3>
                        <div className="w-5 h-5 rounded-md bg-neutral-800/60 group-hover:bg-mention-yellow group-hover:text-black text-neutral-400 flex items-center justify-center transition-all duration-200 shrink-0 mt-0.5">
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                      {/* PIC & Tanggal */}
                      <div className="mt-2 pt-1.5 border-t border-neutral-700/60 flex items-center justify-between text-[11px] text-neutral-400">
                        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
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
          {/* 2. KALENDER BULANAN (BAGIAN KANAN)                        */}
          {/* PAS 1 LAYAR - TIDAK ADA SCROLL DI DESKTOP                 */}
          {/* ========================================================= */}
          <section className="w-full h-full rounded-2xl bg-[#13141a]/95 backdrop-blur-md border border-neutral-700/80 p-2 sm:p-3 shadow-2xl shadow-black/50 ring-1 ring-white/5 flex flex-col order-1 lg:order-2 min-h-0 overflow-hidden">
            {/* Calendar Controls Header */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 pb-1.5 border-b border-neutral-700/80 shrink-0">
              {/* Navigation */}
              <div className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Bulan Sebelumnya"
                  className="p-1 sm:px-2 sm:py-1 min-h-[30px] rounded-xl border border-neutral-700/80 bg-[#1c1e27] hover:bg-[#252834] active:scale-95 text-neutral-200 hover:text-white transition-all flex items-center justify-center gap-1 text-xs font-semibold shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>

                <div className="px-2 sm:px-3 py-1 min-h-[30px] rounded-xl bg-[#1c1e27] border border-neutral-700/80 text-center flex-1 sm:flex-initial sm:min-w-[150px] shadow-inner flex items-center justify-center">
                  <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide whitespace-nowrap">
                    {INDONESIAN_MONTHS[currentMonth]} {currentYear}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Bulan Berikutnya"
                  className="p-1 sm:px-2 sm:py-1 min-h-[30px] rounded-xl border border-neutral-700/80 bg-[#1c1e27] hover:bg-[#252834] active:scale-95 text-neutral-200 hover:text-white transition-all flex items-center justify-center gap-1 text-xs font-semibold shrink-0"
                >
                  <span className="hidden sm:inline">Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Reset to Today button */}
              <button
                type="button"
                onClick={handleResetToday}
                className="text-xs font-semibold px-2.5 py-1 min-h-[30px] rounded-xl border border-neutral-700/80 bg-[#1c1e27] text-neutral-300 hover:text-white hover:border-mention-yellow hover:bg-[#252834] active:scale-95 transition-all shrink-0 flex items-center justify-center"
              >
                Hari Ini
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-1 pb-1 text-center shrink-0">
              {INDONESIAN_DAYS.map((dayName, idx) => (
                <div
                  key={dayName}
                  className={`text-[9.5px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-wider py-0.5 rounded-md sm:rounded-lg ${
                    idx >= 5
                      ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                      : 'text-neutral-300 bg-[#1a1c24] border border-neutral-700/40'
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* 7-Columns Date Grid — Strictly fits 1 screen using 1fr distribution */}
            <div
              className="grid grid-cols-7 gap-1 sm:gap-1.5 flex-1 min-h-0 w-full overflow-hidden"
              style={{
                gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
              }}
            >
              {calendarDays.map((cell) => {
                const dayTasks = tasksByDate[cell.date] || [];
                const hasTasks = dayTasks.length > 0;
                const isSelected = selectedDate === cell.date;

                return (
                  <div
                    key={cell.date}
                    onClick={() => handleCellClick(cell.date, cell.isCurrentMonth, dayTasks)}
                    className={`h-full min-h-[42px] sm:min-h-0 p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition-all flex flex-col justify-start select-none cursor-pointer active:scale-95 overflow-hidden ${
                      cell.isToday
                        ? isSelected
                          ? '!bg-[#272a38] !border-mention-yellow ring-2 ring-mention-yellow shadow-lg shadow-yellow-500/20'
                          : '!bg-mention-yellow/10 !border-mention-yellow ring-1 ring-mention-yellow/60 shadow-md shadow-yellow-500/10'
                        : isSelected
                        ? '!bg-[#272a38] !border-white/80 ring-2 ring-white/50 shadow-md'
                        : cell.isCurrentMonth
                        ? 'bg-[#1a1c25] border-neutral-700/70 hover:border-neutral-500/80 hover:bg-[#20232f] shadow-sm'
                        : 'bg-[#101117]/50 border-neutral-800/50 text-neutral-600 opacity-40 hover:opacity-70'
                    }`}
                  >
                    {/* Date Number + Penanda Hari Ini */}
                    <div className="flex items-center justify-between leading-none mb-0.5 sm:mb-1 shrink-0">
                      <span
                        className={`text-[11px] sm:text-xs font-bold leading-none ${
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

                      {/* Header right: Today pill, +N lainnya button, or task count */}
                      <div className="flex items-center gap-1">
                        {cell.isToday && (
                          <span
                            title="Hari ini"
                            className="text-[7.5px] font-black uppercase text-mention-yellow bg-yellow-500/20 border border-yellow-500/30 px-1 py-0.2 rounded leading-tight hidden sm:inline-block"
                          >
                            Hari Ini
                          </span>
                        )}

                        {dayTasks.length > 2 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDayModal(cell.date, dayTasks);
                            }}
                            title={`Ada ${dayTasks.length} tugas pada tanggal ini. Klik untuk lihat lengkap`}
                            className="px-1.5 py-0.5 rounded bg-mention-yellow hover:bg-yellow-300 text-black font-black text-[7.5px] sm:text-[8px] xl:text-[8.5px] shadow-sm flex items-center gap-0.5 cursor-pointer leading-tight shrink-0 transition-transform hover:scale-105 active:scale-95"
                          >
                            +{dayTasks.length - 2} lainnya
                          </button>
                        ) : hasTasks ? (
                          <span className="text-[7.5px] sm:text-[8px] font-bold px-1 py-0.2 rounded-full bg-[#272a38] text-neutral-300 border border-neutral-600/70 hidden sm:inline-block leading-none">
                            {dayTasks.length}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Mobile View (< sm): Compact 1-line Title and PIC */}
                    <div className="flex sm:hidden flex-1 flex-col gap-0.5 min-h-0 overflow-hidden justify-start">
                      {dayTasks.slice(0, 2).map((t) => (
                        <div
                          key={t.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(t);
                          }}
                          title={`${t.title} — PIC: ${t.pic}`}
                          className="h-[14px] px-0.5 rounded bg-[#151722] border border-neutral-700/80 flex items-center justify-between gap-0.5 overflow-hidden shrink-0"
                          style={{
                            borderLeftColor: t.color || '#FACC15',
                            borderLeftWidth: '2px',
                          }}
                        >
                          <span className="font-semibold truncate text-white text-[7.5px] leading-none">
                            {t.title}
                          </span>
                          <span className="truncate text-mention-yellow text-[7px] leading-none font-medium shrink-0 max-w-[45%]">
                            {t.pic}
                          </span>
                        </div>
                      ))}

                      {dayTasks.length > 2 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDayModal(cell.date, dayTasks);
                          }}
                          className="h-[14px] w-full text-center text-[7.5px] font-black rounded bg-mention-yellow hover:bg-yellow-300 text-black border border-yellow-400 truncate leading-none active:scale-95 shrink-0 flex items-center justify-center cursor-pointer shadow-xs"
                        >
                          +{dayTasks.length - 2} lainnya
                        </button>
                      )}
                    </div>

                    {/* Desktop / Tablet View (sm:): Sleek Horizontal Task Pill (Title & PIC) */}
                    <div className="hidden sm:flex flex-1 flex-col gap-0.5 min-h-0 overflow-hidden justify-start">
                      {dayTasks.slice(0, 2).map((t) => (
                        <div
                          key={t.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(t);
                          }}
                          title={`${t.title} — PIC: ${t.pic}`}
                          className="h-[17px] sm:h-[18px] xl:h-[19px] px-1 sm:px-1.5 rounded bg-[#151722]/95 hover:bg-[#1f2232] border border-neutral-700/80 hover:border-neutral-500/90 flex items-center justify-between gap-1 cursor-pointer transition-colors overflow-hidden group/task shadow-sm shrink-0"
                          style={{
                            borderLeftColor: t.color || '#FACC15',
                            borderLeftWidth: '2.5px',
                          }}
                        >
                          {/* Left: Title & Color Dot */}
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: t.color || '#FACC15' }}
                            />
                            <span className="font-semibold truncate text-white text-[9px] sm:text-[9.5px] leading-none group-hover/task:text-mention-yellow transition-colors">
                              {t.title}
                            </span>
                          </div>

                          {/* Right: PIC Badge */}
                          <div className="flex items-center gap-0.5 text-[8px] sm:text-[8.5px] text-neutral-300 group-hover/task:text-white shrink-0 font-medium pl-0.5 max-w-[48%]">
                            <User className="w-2.5 h-2.5 text-mention-yellow shrink-0" />
                            <span className="truncate">{t.pic}</span>
                          </div>
                        </div>
                      ))}

                      {/* Button +N lainnya jika ada lebih dari 2 tugas */}
                      {dayTasks.length > 2 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDayModal(cell.date, dayTasks);
                          }}
                          title={`Lihat semua ${dayTasks.length} tugas untuk tanggal ini`}
                          className="h-[16px] sm:h-[17px] w-full text-center text-[8px] sm:text-[8.5px] font-black px-1.5 rounded bg-mention-yellow hover:bg-yellow-300 text-black border border-yellow-400 shadow-md transition-all leading-none truncate active:scale-95 shrink-0 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Plus className="w-2.5 h-2.5 stroke-[3]" />
                          <span>{dayTasks.length - 2} lainnya</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile-only agenda (< lg) */}
            <div className="block lg:hidden mt-2 pt-2 border-t border-neutral-700/80">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-mention-yellow" />
                  <h3 className="text-xs font-bold text-white">
                    Agenda: <span className="text-mention-yellow">{formatDueDateIndo(selectedDate)}</span>
                  </h3>
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#1c1e27] border border-neutral-700 text-neutral-300">
                  {selectedDateTasks.length} Tugas
                </span>
              </div>

              {selectedDateTasks.length === 0 ? (
                <div className="p-2 rounded-xl border border-dashed border-neutral-700/70 bg-[#161822]/60 text-center flex items-center justify-between gap-2">
                  <p className="text-[11px] text-neutral-400 text-left">
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
                      className="text-[11px] font-bold text-black bg-mention-yellow hover:bg-yellow-400 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0 transition-colors shadow-sm"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>Tambah</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-neutral-500 italic shrink-0">Bebas Tugas</span>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedDateTasks.map((task) => {
                    const taskColor = task.color || '#FACC15';
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleOpenDetail(task)}
                        className="p-2 rounded-xl border border-neutral-700/80 bg-[#161822] hover:bg-[#1d202e] transition-all cursor-pointer flex items-center justify-between gap-2 active:scale-[0.99]"
                        style={{
                          borderLeftColor: taskColor,
                          borderLeftWidth: '3.5px',
                        }}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: taskColor }}
                            />
                            <span className="text-[9px] font-mono text-neutral-300 font-semibold">
                              {taskColor.toUpperCase()}
                            </span>
                            <span className="text-[9px] font-semibold text-neutral-300 bg-[#151720] px-1 py-0.2 rounded border border-neutral-700">
                              {task.priority === 'HIGH' ? 'Tinggi' : task.priority === 'LOW' ? 'Rendah' : 'Sedang'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white truncate">
                            {task.title}
                          </h4>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <User className="w-3 h-3 text-neutral-400" />
                            <span className="truncate">PIC: {task.pic}</span>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-lg bg-neutral-800/90 text-neutral-300 flex items-center justify-center shrink-0">
                          <ChevronRight className="w-3.5 h-3.5" />
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

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={handleFabClick}
        title={isAdmin ? 'Tambah Tugas Baru' : 'Login Admin untuk Tambah Tugas'}
        className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-mention-yellow text-black hover:bg-yellow-400 font-bold shadow-2xl shadow-yellow-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 border-yellow-300"
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.8]" />
      </button>

      {/* Modals */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        isAdmin={isAdmin}
        onEdit={(task) => handleOpenEdit(task)}
        onDelete={handleDeleteTask}
      />

      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        initialDate={formInitialDate}
        taskToEdit={taskToEdit}
      />

      <DayTasksModal
        date={dayModalDate}
        tasks={dayModalTasks}
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        onSelectTask={(task) => handleOpenDetail(task)}
      />

      <AdminRequiredModal
        isOpen={isAdminRequiredOpen}
        onClose={() => setIsAdminRequiredOpen(false)}
      />
    </div>
  );
}
