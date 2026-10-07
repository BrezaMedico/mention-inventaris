'use client';

import { Task } from '@/types';
import { formatDueDateIndo, getTaskUrgency } from '@/lib/calendar';
import { X, Calendar, User, ArrowRight } from 'lucide-react';

interface DayTasksModalProps {
  date: string | null;
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: Task) => void;
}

export default function DayTasksModal({
  date,
  tasks,
  isOpen,
  onClose,
  onSelectTask,
}: DayTasksModalProps) {
  if (!isOpen || !date) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-mention-yellow">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Daftar Tugas Tanggal
              </h3>
              <p className="text-xs text-neutral-400 font-medium">
                {formatDueDateIndo(date)} ({tasks.length} Tugas)
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

        {/* List of Tasks on Date */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {tasks.map((task) => {
            const urgency = getTaskUrgency(task.due_date);
            return (
              <div
                key={task.id}
                onClick={() => {
                  onClose();
                  onSelectTask(task);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${urgency.cardBg} ${urgency.cardBorder}`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${urgency.badgeBg}`}
                    >
                      {urgency.shortLabel}
                    </span>
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1 truncate">
                      <User className="w-3 h-3 text-neutral-500 shrink-0" />
                      <span>PIC: {task.pic}</span>
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-mention-yellow transition-colors truncate">
                    {task.title}
                  </h4>
                </div>

                <div className="w-7 h-7 rounded-lg bg-neutral-800/80 group-hover:bg-mention-yellow group-hover:text-black flex items-center justify-center text-neutral-400 transition-all shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
