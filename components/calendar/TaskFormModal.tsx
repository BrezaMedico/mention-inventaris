'use client';

import { useState, useEffect } from 'react';
import { Task, TaskPriority } from '@/types';
import { X, Calendar, User, AlertTriangle, Loader2, Save, Palette, Check, SunMedium } from 'lucide-react';
import { getLocalTodayStr } from '@/lib/calendar';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: Task) => void;
  initialDate?: string;
  taskToEdit?: Task | null;
}

const PRESET_COLORS = [
  { hex: '#FACC15', label: 'Kuning MENTION (Default)' },
  { hex: '#38BDF8', label: 'Biru Cerah' },
  { hex: '#34D399', label: 'Hijau Zamrud' },
  { hex: '#A78BFA', label: 'Ungu Lavender' },
  { hex: '#FB7185', label: 'Merah Coral' },
];

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return { h: 48, s: 96, l: 53 };

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) =>
    lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => {
    const val = Math.max(0, Math.min(255, Math.round(x * 255))).toString(16);
    return val.length === 1 ? '0' + val : val;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

export default function TaskFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  taskToEdit,
}: TaskFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pic, setPic] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [color, setColor] = useState('#FACC15');
  const [currentLightness, setCurrentLightness] = useState(53);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setPic(taskToEdit.pic);
      setPriority(taskToEdit.priority);
      setDueDate(taskToEdit.due_date);
      const chosenColor = taskToEdit.color || '#FACC15';
      setColor(chosenColor);
      setCurrentLightness(hexToHsl(chosenColor).l);
    } else {
      setTitle('');
      setDescription('');
      setPic('');
      setPriority('MEDIUM');
      setDueDate(initialDate || getLocalTodayStr());
      setColor('#FACC15');
      setCurrentLightness(53);
    }
    setErrorMessage('');
  }, [taskToEdit, initialDate, isOpen]);

  if (!isOpen) return null;

  const handleColorChange = (newHex: string) => {
    setColor(newHex);
    const hsl = hexToHsl(newHex);
    setCurrentLightness(hsl.l);
  };

  const handlePresetClick = (hex: string) => {
    setColor(hex);
    const hsl = hexToHsl(hex);
    setCurrentLightness(hsl.l);
  };

  const handleLightnessChange = (newLightness: number) => {
    setCurrentLightness(newLightness);
    const hsl = hexToHsl(color);
    const newHex = hslToHex(hsl.h, hsl.s, newLightness);
    setColor(newHex);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Judul tugas wajib diisi.');
      return;
    }

    if (!pic.trim()) {
      setErrorMessage('Penanggung Jawab (PIC) wajib diisi.');
      return;
    }

    if (!dueDate) {
      setErrorMessage('Tenggat tugas wajib dipilih.');
      return;
    }

    try {
      setSubmitting(true);
      const isEditing = Boolean(taskToEdit);
      const url = '/api/tasks';
      const method = isEditing ? 'PUT' : 'POST';
      const body = {
        id: taskToEdit?.id,
        title: title.trim(),
        description: description.trim(),
        pic: pic.trim(),
        priority,
        due_date: dueDate,
        color: color.trim() || '#FACC15',
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan tugas.');
      }

      onSuccess(data.data);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan tugas.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#14151c] border border-neutral-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-700/80 bg-[#1c1e27]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm"
              style={{ backgroundColor: color, color: currentLightness > 60 ? '#000000' : '#ffffff' }}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {taskToEdit ? 'Edit Tugas' : 'Tambah Tugas Baru'}
              </h3>
              <p className="text-[11px] text-neutral-300">
                {taskToEdit
                  ? 'Perbarui informasi tenggat, warna atau deskripsi tugas.'
                  : 'Tentukan deadline, penanggung jawab, dan warna tugas.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4 text-xs sm:text-sm">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Judul Tugas */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-300">
              Judul Tugas <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Membuat Laporan PKL, Presentasi Project"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-700 bg-[#1c1e27] text-neutral-100 placeholder-neutral-500 text-xs sm:text-sm focus:border-mention-yellow focus:outline-none transition-colors"
            />
          </div>

          {/* PIC & Prioritas Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {/* PIC */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-300">
                PIC (Penanggung Jawab) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={pic}
                  onChange={(e) => setPic(e.target.value)}
                  placeholder="Contoh: Rian, Sarah, dsb."
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-700 bg-[#1c1e27] text-neutral-100 placeholder-neutral-500 text-xs sm:text-sm focus:border-mention-yellow focus:outline-none transition-colors"
                />
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Prioritas */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-300">
                Prioritas <span className="text-red-400">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-700 bg-[#1c1e27] text-neutral-100 text-xs sm:text-sm focus:border-mention-yellow focus:outline-none transition-colors"
              >
                <option value="LOW">Rendah (Low)</option>
                <option value="MEDIUM">Sedang (Medium)</option>
                <option value="HIGH">Tinggi (High)</option>
              </select>
            </div>
          </div>

          {/* Tenggat Waktu */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-300">
              Tenggat Tugas (Deadline) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-700 bg-[#1c1e27] text-neutral-100 text-xs sm:text-sm focus:border-mention-yellow focus:outline-none transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-300">
              Deskripsi Tugas
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Tambahkan catatan rincian tugas atau arahan teknis..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-700 bg-[#1c1e27] text-neutral-100 placeholder-neutral-500 text-xs sm:text-sm focus:border-mention-yellow focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Pilihan Warna Tugas (Tepat di bawah Deskripsi Tugas) */}
          <div className="space-y-2.5 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-mention-yellow" />
                <span>Warna Jadwal Kalender</span>
              </label>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#1c1e27] border border-neutral-700/80">
                <span
                  className="w-3 h-3 rounded-full border border-black/30 shadow-inner"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] font-mono font-semibold text-neutral-200">
                  {color.toUpperCase()}
                </span>
              </div>
            </div>

            {/* 5 Rekomendasi Warna + Wheel Custom */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {PRESET_COLORS.map((p) => {
                const isSelected = color.toUpperCase() === p.hex.toUpperCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => handlePresetClick(p.hex)}
                    title={p.label}
                    className={`relative w-8 h-8 rounded-full transition-all flex items-center justify-center border shadow-sm ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#14151c] scale-110 border-white'
                        : 'border-white/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.hex }}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-black drop-shadow stroke-[3]" />
                    )}
                  </button>
                );
              })}

              {/* Color Wheel Trigger */}
              <div className="relative group">
                <label
                  title="Pilih warna bebas (Color Wheel)"
                  className="relative w-8 h-8 rounded-full cursor-pointer flex items-center justify-center border border-white/20 hover:scale-105 transition-transform overflow-hidden shadow-sm"
                  style={{
                    background:
                      'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                  }}
                >
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>
              </div>
            </div>

            {/* Slider Gelap - Terang */}
            <div className="bg-[#1c1e27] border border-neutral-800 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <SunMedium className="w-3.5 h-3.5 text-neutral-400" />
                  Kecerahan (Gelap — Terang)
                </span>
                <span className="font-mono text-[10px] text-neutral-300">{currentLightness}%</span>
              </div>
              <input
                type="range"
                min="18"
                max="82"
                value={currentLightness}
                onChange={(e) => handleLightnessChange(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-mention-yellow"
                style={{
                  background: `linear-gradient(to right, #000000 0%, ${color} 50%, #ffffff 100%)`,
                }}
              />
            </div>
          </div>

          {/* Action Footer inside Form */}
          <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-2.5 border-t border-neutral-700/80">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[42px] rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2.5 min-h-[42px] rounded-xl bg-mention-yellow text-black hover:bg-yellow-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md shadow-yellow-500/10 active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{taskToEdit ? 'Simpan Perubahan' : 'Tambah Tugas'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
