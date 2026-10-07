'use client';

import { useState } from 'react';
import { Task } from '@/types';
import { formatDueDateIndo, getTaskUrgency } from '@/lib/calendar';
import {
  X,
  Calendar,
  User,
  AlertCircle,
  FileText,
  Clock,
  Edit2,
  Trash2,
  Shield,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => Promise<void>;
}

export default function TaskDetailModal({
  task,
  isOpen,
  onClose,
  isAdmin,
  onEdit,
  onDelete,
}: TaskDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !task) return null;

  const urgency = getTaskUrgency(task.due_date);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return {
          label: 'Prioritas Tinggi',
          className: 'bg-red-950/60 text-red-300 border-red-800/60',
        };
      case 'LOW':
        return {
          label: 'Prioritas Rendah',
          className: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
        };
      case 'MEDIUM':
      default:
        return {
          label: 'Prioritas Sedang',
          className: 'bg-yellow-950/60 text-yellow-300 border-yellow-800/60',
        };
    }
  };

  const priorityBadge = getPriorityBadge(task.priority);

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setDeleting(true);
      await onDelete(task.id);
      setShowDeleteConfirm(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#14151c] border border-neutral-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-neutral-700/80 bg-[#1c1e27]">
          <div className="space-y-1.5 pr-3 sm:pr-4 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span
                className={`text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full border ${priorityBadge.className}`}
              >
                {priorityBadge.label}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${urgency.badgeBg}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${urgency.dotColor}`} />
                {urgency.label}
              </span>
            </div>
            <h3 className="text-base sm:text-xl font-bold text-white tracking-tight leading-snug">
              {task.title}
            </h3>
          </div>
          <button
            onClick={() => {
              setShowDeleteConfirm(false);
              onClose();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm">
          {/* Tenggat Waktu & PIC Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="p-3 sm:p-3.5 rounded-xl bg-[#1c1e27] border border-neutral-700/80 flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#272a38] border border-neutral-600/80 flex items-center justify-center text-neutral-300 shrink-0">
                <Calendar className="w-4 h-4 text-mention-yellow" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] text-neutral-400 font-medium">Tenggat Waktu</div>
                <div className="font-semibold text-neutral-100 truncate text-xs sm:text-sm">
                  {formatDueDateIndo(task.due_date)}
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-[#1c1e27] border border-neutral-700/80 flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#272a38] border border-neutral-600/80 flex items-center justify-center text-neutral-300 shrink-0">
                <User className="w-4 h-4 text-mention-yellow" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] text-neutral-400 font-medium">Penanggung Jawab (PIC)</div>
                <div className="font-semibold text-neutral-100 truncate text-xs sm:text-sm">{task.pic}</div>
              </div>
            </div>
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
              <FileText className="w-3.5 h-3.5" />
              <span>Deskripsi Tugas</span>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#1c1e27] border border-neutral-700/80 text-neutral-200 leading-relaxed whitespace-pre-line min-h-[60px] sm:min-h-[70px] text-xs sm:text-sm">
              {task.description ? task.description : (
                <span className="text-neutral-500 italic">Tidak ada deskripsi tambahan.</span>
              )}
            </div>
          </div>

          {/* Urgensi Indicator Alert */}
          <div className={`p-3 sm:p-3.5 rounded-xl border flex items-center gap-2.5 sm:gap-3 ${urgency.cardBg} ${urgency.cardBorder}`}>
            <AlertCircle className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${urgency.textColor}`} />
            <div className="text-xs leading-relaxed">
              <span className={`font-bold ${urgency.textColor}`}>Status Urgensi: </span>
              <span className="text-neutral-200">
                {urgency.category === 'OVERDUE'
                  ? `Tugas telah melewati tenggat waktu ${Math.abs(urgency.diffDays)} hari yang lalu.`
                  : urgency.category === 'TODAY'
                  ? 'Batas pengumpulan adalah hari ini! Harap segera diselesaikan.'
                  : urgency.category === 'H1'
                  ? 'Tenggat waktu tersisa 1 hari lagi (besok).'
                  : `${urgency.diffDays} hari tersisa sebelum tenggat waktu.`}
              </span>
            </div>
          </div>

          {/* Konfirmasi Hapus Modal/Box jika admin menekan hapus */}
          {showDeleteConfirm && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-red-950/40 border border-red-800/60 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2 text-red-200 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Konfirmasi Hapus Tugas</div>
                  <div className="text-red-300/80 text-xs mt-0.5">
                    Apakah Anda yakin ingin menghapus tugas <strong>&ldquo;{task.title}&rdquo;</strong>? Tindakan ini tidak dapat dibatalkan.
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 text-xs font-semibold hover:bg-neutral-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Ya, Hapus</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-neutral-700/80 bg-[#1c1e27] flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onEdit) onEdit(task);
                }}
                className="px-3 sm:px-3.5 py-2 rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-200 hover:text-white hover:border-neutral-500 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Tugas</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={showDeleteConfirm}
                className="px-3 sm:px-3.5 py-2 rounded-xl border border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-900/60 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-neutral-400">
              <Shield className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span>Hanya admin yang dapat mengedit tugas.</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirm(false);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 active:scale-95 text-white text-xs font-bold transition-colors ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
