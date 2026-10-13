-- ============================================================
-- MIGRATION: Fix Task Reminder Schema
-- Jalankan di Supabase SQL Editor (sekali saja)
-- ============================================================

-- 1. Tambahkan TASK_REMINDER ke constraint tipe notifikasi
ALTER TABLE notification_events 
  DROP CONSTRAINT IF EXISTS notification_events_type_check;

ALTER TABLE notification_events 
  ADD CONSTRAINT notification_events_type_check 
  CHECK (type IN ('BORROW', 'RETURN', 'OVERDUE', 'TEST', 'TASK_REMINDER'));

-- 2. Tambahkan kolom h0_reminder_sent_at jika belum ada
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS h0_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS h1_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS h2_reminder_sent_at TIMESTAMPTZ;

-- 3. Pastikan index ada
CREATE INDEX IF NOT EXISTS idx_notification_events_type_status 
  ON notification_events(type, status);
CREATE INDEX IF NOT EXISTS idx_notification_events_status_created 
  ON notification_events(status, created_at);
