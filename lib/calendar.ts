export interface UrgencyInfo {
  category: 'OVERDUE' | 'TODAY' | 'H1' | 'H2' | 'H3' | 'NORMAL';
  label: string;
  shortLabel: string;
  diffDays: number;
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
  dotColor: string;
  textColor: string;
}

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const INDONESIAN_DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function formatDueDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = INDONESIAN_MONTHS[month] || '';
  return `${day} ${monthName} ${year}`;
}

export function formatDueDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10) - 1;
  const monthShort = (INDONESIAN_MONTHS[month] || '').slice(0, 3);
  return `${day} ${monthShort}`;
}

/**
 * Logika warna urgensi deadline berdasarkan spesifikasi:
 * - Deadline masih jauh -> warna normal / warna utama website.
 * - H-3 atau lebih -> sedikit bernuansa merah.
 * - H-2 -> merah pudar.
 * - H-1 -> merah agak lebih terlihat, tetapi tetap lembut.
 * - Hari H -> merah lebih kuat dibanding H-1, tetapi jangan sampai menjadi merah terang.
 * - Sudah melewati deadline -> masuk kategori Tugas Telat.
 */
export function getTaskUrgency(dueDateStr: string, referenceDate: Date = new Date()): UrgencyInfo {
  if (!dueDateStr) {
    return {
      category: 'NORMAL',
      label: 'Tanpa tenggat',
      shortLabel: '-',
      diffDays: 999,
      cardBg: 'bg-neutral-900/80 hover:bg-neutral-850',
      cardBorder: 'border-neutral-800 hover:border-neutral-700',
      badgeBg: 'bg-neutral-800 text-neutral-300 border-neutral-700',
      dotColor: 'bg-neutral-400',
      textColor: 'text-neutral-300',
    };
  }

  const [y, m, d] = dueDateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d, 0, 0, 0, 0);
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0
  );

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return {
      category: 'OVERDUE',
      label: `Telat ${daysLate} hari`,
      shortLabel: 'Telat',
      diffDays,
      cardBg: 'bg-rose-950/45 hover:bg-rose-950/65',
      cardBorder: 'border-rose-900/60 hover:border-rose-800/80',
      badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-800/70',
      dotColor: 'bg-rose-500',
      textColor: 'text-rose-300',
    };
  }

  if (diffDays === 0) {
    return {
      category: 'TODAY',
      label: 'Hari H (Hari Ini)',
      shortLabel: 'Hari H',
      diffDays,
      // Merah lebih kuat dibanding H-1, tapi tidak neon/terang
      cardBg: 'bg-red-950/50 hover:bg-red-950/70',
      cardBorder: 'border-red-700/65 hover:border-red-600/80',
      badgeBg: 'bg-red-900/70 text-red-200 border-red-700/80',
      dotColor: 'bg-red-400',
      textColor: 'text-red-200',
    };
  }

  if (diffDays === 1) {
    return {
      category: 'H1',
      label: 'H-1 (Besok)',
      shortLabel: 'H-1',
      diffDays,
      // Merah agak terlihat tapi tetap lembut
      cardBg: 'bg-rose-950/35 hover:bg-rose-950/55',
      cardBorder: 'border-rose-800/50 hover:border-rose-700/65',
      badgeBg: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
      dotColor: 'bg-rose-400',
      textColor: 'text-rose-300',
    };
  }

  if (diffDays === 2) {
    return {
      category: 'H2',
      label: 'H-2 (2 hari lagi)',
      shortLabel: 'H-2',
      diffDays,
      // Merah pudar / subtle warm red
      cardBg: 'bg-orange-950/30 hover:bg-orange-950/50',
      cardBorder: 'border-orange-800/40 hover:border-orange-700/55',
      badgeBg: 'bg-orange-950/60 text-orange-300 border-orange-800/50',
      dotColor: 'bg-orange-400',
      textColor: 'text-orange-300',
    };
  }

  if (diffDays === 3) {
    return {
      category: 'H3',
      label: 'H-3 (3 hari lagi)',
      shortLabel: 'H-3',
      diffDays,
      // Sedikit bernuansa merah / warm amber-red
      cardBg: 'bg-amber-950/25 hover:bg-amber-950/40',
      cardBorder: 'border-amber-800/35 hover:border-amber-700/50',
      badgeBg: 'bg-amber-950/50 text-amber-300 border-amber-800/40',
      dotColor: 'bg-amber-400',
      textColor: 'text-amber-300',
    };
  }

  // diffDays > 3: Deadline masih jauh -> warna normal / tema utama website
  return {
    category: 'NORMAL',
    label: `${diffDays} hari lagi`,
    shortLabel: `${diffDays}h`,
    diffDays,
    cardBg: 'bg-neutral-900/80 hover:bg-neutral-850',
    cardBorder: 'border-neutral-800 hover:border-neutral-700',
    badgeBg: 'bg-neutral-800/80 text-neutral-300 border-neutral-700',
    dotColor: 'bg-neutral-400',
    textColor: 'text-neutral-300',
  };
}

export interface CalendarDay {
  date: string; // 'YYYY-MM-DD'
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function generateCalendarDays(year: number, month: number): CalendarDay[] {
  const result: CalendarDay[] = [];

  const todayStr = new Date().toISOString().slice(0, 10);

  // First day of target month
  const firstDayOfMonth = new Date(year, month, 1);
  // Total days in target month
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

  // Day of week for 1st of month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  // Convert so Monday = 0, ..., Sunday = 6
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  // Previous month trailing days
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const prevMonthDate = new Date(year, month - 1, dayNum);
    const dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    result.push({
      date: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    result.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month leading days to complete the 7-column grid (up to 35 or 42 cells)
  const remainingCells = (7 - (result.length % 7)) % 7;
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonthDate = new Date(year, month + 1, day);
    const dateStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    result.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return result;
}
