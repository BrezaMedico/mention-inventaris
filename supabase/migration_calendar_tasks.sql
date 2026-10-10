-- ====================================================================
-- MIGRATION: Kalender & Deadline Tugas (tasks & task_reminders)
-- Jalankan script ini di menu "SQL Editor" pada dashboard Supabase:
-- https://qaaslumawvoykqyohclh.supabase.co
-- Script ini AMAN dan TIDAK akan menghapus data tabel lain (loans/members).
-- ====================================================================

-- 1. Buat Tabel tasks (Kalender Tugas & Deadline)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    pic TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    due_date DATE NOT NULL,
    h1_reminder_sent_at TIMESTAMPTZ,
    h2_reminder_sent_at TIMESTAMPTZ,
    h0_reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS h1_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS h2_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS h0_reminder_sent_at TIMESTAMPTZ;

-- 2. Buat Tabel task_reminders (Log Riwayat Notifikasi H-1 WhatsApp)
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    reminder_type TEXT NOT NULL DEFAULT 'H-1',
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(task_id, due_date, reminder_type)
);

-- 3. Indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);

-- 4. Aktifkan Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses (RLS Policies)
DROP POLICY IF EXISTS "Allow public read tasks" ON tasks;
CREATE POLICY "Allow public read tasks" ON tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write tasks" ON tasks;
CREATE POLICY "Allow public write tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read task_reminders" ON task_reminders;
CREATE POLICY "Allow public read task_reminders" ON task_reminders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write task_reminders" ON task_reminders;
CREATE POLICY "Allow public write task_reminders" ON task_reminders FOR ALL USING (true) WITH CHECK (true);
