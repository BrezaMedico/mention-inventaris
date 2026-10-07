'use client';

import { useState, useEffect } from 'react';
import { Task, TaskPriority } from '@/types';
import { X, Calendar, User, FileText, AlertTriangle, Loader2, Save } from 'lucide-react';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: Task) => void;
  initialDate?: string;
  taskToEdit?: Task | null;
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
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setPic(taskToEdit.pic);
      setPriority(taskToEdit.priority);
      setDueDate(taskToEdit.due_date);
    } else {
      setTitle('');
      setDescription('');
      setPic('');
      setPriority('MEDIUM');
      setDueDate(initialDate || new Date().toISOString().slice(0, 10));
    }
    setErrorMessage('');
  }, [taskToEdit, initialDate, isOpen]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-mention-yellow text-black flex items-center justify-center font-bold text-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {taskToEdit ? 'Edit Tugas' : 'Tambah Tugas Baru'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {taskToEdit
                  ? 'Perbarui informasi tenggat atau deskripsi tugas.'
                  : 'Tentukan deadline dan penanggung jawab tugas.'}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-100 placeholder-neutral-500 text-xs sm:text-sm focus:border-mention-yellow focus:outline-none transition-colors"
            />
          </div>

          {/* PIC & Prioritas Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                  placeholder="Contoh: Breza, Fatih"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-100 placeholder-neutral-500 text-xs sm:text-sm focus:border-mention-yellow focus:outline-none transition-colors"
                />
                <User className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-100 text-xs sm:text-sm focus:border-mention-yellow focus:outline-none transition-colors"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-100 text-xs sm:text-sm focus:border-mention-yellow focus:outline-none transition-colors [color-scheme:dark]"
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
              rows={3}
              placeholder="Tambahkan catatan rincian tugas atau arahan teknis..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-100 placeholder-neutral-500 text-xs sm:text-sm focus:border-mention-yellow focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Action Footer inside Form */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-neutral-800 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-mention-yellow text-black hover:bg-yellow-400 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-yellow-500/10"
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
