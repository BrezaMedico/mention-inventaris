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
export const INDONESIAN_FULL_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function formatFullDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0));
  const dayName = INDONESIAN_FULL_DAYS[dateObj.getUTCDay()] || '';
  const monthName = INDONESIAN_MONTHS[month] || '';
  return `${dayName}, ${day} ${monthName} ${year}`;
}

export function getJakartaDateStrings(refDate = new Date()): {
  today: string;
  tomorrow: string;
  dayAfterTomorrow: string;
} {
  const parts = getLocalTodayStr(refDate);
  const [y, m, d] = parts.split('-').map(Number);
  const dObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const tomorrowObj = new Date(dObj.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrowObj = new Date(dObj.getTime() + 48 * 60 * 60 * 1000);
  return {
    today: parts,
    tomorrow: tomorrowObj.toISOString().slice(0, 10),
    dayAfterTomorrow: dayAfterTomorrowObj.toISOString().slice(0, 10),
  };
}

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
      cardBg: 'bg-[#252836] hover:bg-[#2d3142]',
      cardBorder: 'border-neutral-700 hover:border-neutral-600',
      badgeBg: 'bg-[#323648] text-neutral-200 border-neutral-600',
      dotColor: 'bg-neutral-400',
      textColor: 'text-neutral-200',
    };
  }

  const [y, m, d] = dueDateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d, 0, 0, 0, 0);
  const todayStr = getLocalTodayStr(referenceDate);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const today = new Date(ty, tm - 1, td, 0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return {
      category: 'OVERDUE',
      label: `Telat ${daysLate} hari`,
      shortLabel: 'Telat',
      diffDays,
      cardBg: 'bg-rose-950/70 hover:bg-rose-900/70',
      cardBorder: 'border-rose-700/80 hover:border-rose-600',
      badgeBg: 'bg-rose-900/80 text-rose-200 border-rose-700/80',
      dotColor: 'bg-rose-400',
      textColor: 'text-rose-200',
    };
  }

  if (diffDays === 0) {
    return {
      category: 'TODAY',
      label: 'Hari H (Hari Ini)',
      shortLabel: 'Hari H',
      diffDays,
      // Merah lebih kuat dibanding H-1, tapi tidak neon/terang
      cardBg: 'bg-red-950/75 hover:bg-red-900/80',
      cardBorder: 'border-red-600/85 hover:border-red-500',
      badgeBg: 'bg-red-900/85 text-red-100 border-red-600/90',
      dotColor: 'bg-red-400',
      textColor: 'text-red-100',
    };
  }

  if (diffDays === 1) {
    return {
      category: 'H1',
      label: 'H-1 (Besok)',
      shortLabel: 'H-1',
      diffDays,
      // Merah agak terlihat tapi tetap lembut
      cardBg: 'bg-rose-950/60 hover:bg-rose-900/70',
      cardBorder: 'border-rose-700/70 hover:border-rose-600/80',
      badgeBg: 'bg-rose-900/75 text-rose-200 border-rose-700/80',
      dotColor: 'bg-rose-400',
      textColor: 'text-rose-200',
    };
  }

  if (diffDays === 2) {
    return {
      category: 'H2',
      label: 'H-2 (2 hari lagi)',
      shortLabel: 'H-2',
      diffDays,
      // Merah pudar / subtle warm red
      cardBg: 'bg-orange-950/60 hover:bg-orange-900/70',
      cardBorder: 'border-orange-700/70 hover:border-orange-600/80',
      badgeBg: 'bg-orange-900/75 text-orange-200 border-orange-700/80',
      dotColor: 'bg-orange-400',
      textColor: 'text-orange-200',
    };
  }

  if (diffDays === 3) {
    return {
      category: 'H3',
      label: 'H-3 (3 hari lagi)',
      shortLabel: 'H-3',
      diffDays,
      // Sedikit bernuansa merah / warm amber-red
      cardBg: 'bg-amber-950/55 hover:bg-amber-900/65',
      cardBorder: 'border-amber-700/70 hover:border-amber-600/80',
      badgeBg: 'bg-amber-900/75 text-amber-200 border-amber-700/80',
      dotColor: 'bg-amber-400',
      textColor: 'text-amber-200',
    };
  }

  // diffDays > 3: Deadline masih jauh -> warna normal / tema utama website
  return {
    category: 'NORMAL',
    label: `${diffDays} hari lagi`,
    shortLabel: `${diffDays}h`,
    diffDays,
    cardBg: 'bg-[#252836] hover:bg-[#2d3142]',
    cardBorder: 'border-neutral-700 hover:border-neutral-600',
    badgeBg: 'bg-[#323648] text-neutral-200 border-neutral-600',
    dotColor: 'bg-neutral-300',
    textColor: 'text-neutral-200',
  };
}

/**
 * Mendapatkan string tanggal hari ini (YYYY-MM-DD) dalam waktu lokal / Asia/Jakarta (WIB).
 * Penting: Jangan gunakan toISOString().slice(0, 10) karena toISOString() berbasis UTC (selisih 7 jam dari WIB),
 * yang menyebabkan sebelum pukul 07:00 pagi WIB tanggalnya masih terbaca kemarin.
 */
export function getLocalTodayStr(referenceDate: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(referenceDate);
  } catch {
    const y = referenceDate.getFullYear();
    const m = String(referenceDate.getMonth() + 1).padStart(2, '0');
    const d = String(referenceDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

export interface CalendarDay {
  date: string; // 'YYYY-MM-DD'
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function generateCalendarDays(year: number, month: number, customTodayStr?: string): CalendarDay[] {
  const result: CalendarDay[] = [];

  const todayStr = customTodayStr || getLocalTodayStr();

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
