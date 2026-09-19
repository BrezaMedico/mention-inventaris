-- ====================================================================
-- MENTION - Equipment Borrowing & Return System Database Schema
-- Run this in Supabase SQL Editor
-- ====================================================================

-- Enable pgcrypto for UUID and hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if needed for clean reload
DROP TABLE IF EXISTS overdue_reminders CASCADE;
DROP TABLE IF EXISTS notification_events CASCADE;
DROP TABLE IF EXISTS whatsapp_configs CASCADE;
DROP TABLE IF EXISTS loan_items CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS item_accessories CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS checkers CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS generations CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- 1. ADMINS TABLE
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Administrator',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. GENERATIONS TABLE (Angkatan)
CREATE TABLE generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MEMBERS TABLE (Anggota)
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CHECKERS TABLE (PIC Checker with 6-digit numeric PIN)
CREATE TABLE checkers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ITEMS TABLE (Barang)
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    description TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BORROWED', 'MAINTENANCE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ITEM ACCESSORIES TABLE (Kelengkapan Barang)
CREATE TABLE item_accessories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. LOANS TABLE (Transaksi Peminjaman)
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_code TEXT UNIQUE NOT NULL,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PARTIALLY_RETURNED', 'RETURNED', 'OVERDUE')),
    initial_checker_id UUID NOT NULL REFERENCES checkers(id) ON DELETE RESTRICT,
    return_checker_id UUID REFERENCES checkers(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. LOAN ITEMS TABLE (Barang dalam transaksi)
CREATE TABLE loan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'BORROWED' CHECK (status IN ('BORROWED', 'RETURNED')),
    initial_condition TEXT NOT NULL DEFAULT 'Aman' CHECK (initial_condition IN ('Aman', 'Ada Catatan', 'Tidak Aman')),
    initial_accessories JSONB NOT NULL DEFAULT '[]'::jsonb,
    initial_notes TEXT,
    return_condition TEXT CHECK (return_condition IN ('Aman', 'Rusak', 'Tidak Lengkap')),
    return_accessories JSONB DEFAULT '[]'::jsonb,
    return_notes TEXT,
    returned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. NOTIFICATION EVENTS TABLE (Notifikasi WhatsApp)
CREATE TABLE notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('BORROW', 'RETURN', 'OVERDUE', 'TEST')),
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. WHATSAPP CONFIGS TABLE
CREATE TABLE whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_group_jid TEXT,
    target_group_name TEXT,
    is_connected BOOLEAN NOT NULL DEFAULT false,
    phone_number TEXT,
    last_connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. OVERDUE REMINDERS TABLE (Maksimal 1 reminder per minggu per loan)
CREATE TABLE overdue_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    week_key TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(loan_id, week_key)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_members_generation ON members(generation_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_loans_member ON loans(member_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_dates ON loans(borrow_date, expected_return_date);
CREATE INDEX idx_loan_items_loan ON loan_items(loan_id);
CREATE INDEX idx_loan_items_item ON loan_items(item_id);
CREATE INDEX idx_loan_items_status ON loan_items(status);
CREATE INDEX idx_notifications_status ON notification_events(status);

-- ROW LEVEL SECURITY
-- Enable RLS on all tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE overdue_reminders ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active data for the frontend user flows
CREATE POLICY "Allow public read generations" ON generations FOR SELECT USING (true);
CREATE POLICY "Allow public read members" ON members FOR SELECT USING (true);
CREATE POLICY "Allow public read checkers" ON checkers FOR SELECT USING (true);
CREATE POLICY "Allow public read items" ON items FOR SELECT USING (true);
CREATE POLICY "Allow public read item_accessories" ON item_accessories FOR SELECT USING (true);
CREATE POLICY "Allow public read loans" ON loans FOR SELECT USING (true);
CREATE POLICY "Allow public read loan_items" ON loan_items FOR SELECT USING (true);
CREATE POLICY "Allow public read whatsapp_configs" ON whatsapp_configs FOR SELECT USING (true);

-- Allow full public operations via anon key for now (Next.js server-side handles validation and admin authorization)
CREATE POLICY "Allow public write loans" ON loans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write loan_items" ON loan_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write generations" ON generations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write checkers" ON checkers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write item_accessories" ON item_accessories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write notification_events" ON notification_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write whatsapp_configs" ON whatsapp_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write overdue_reminders" ON overdue_reminders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write admins" ON admins FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- SEED DATA
-- ====================================================================

-- 1. Initial Admin (username: mention, pass: Mention_123!*)
-- Hash generated for Mention_123!* using bcrypt: $2a$10$Y1Kq28vC0Q4Gg7vE5zY.eO1b71x3L1x5Z71/8bV5K7Z2/e.CqK/3O (or standard bcrypt)
INSERT INTO admins (username, password_hash, name)
VALUES (
    'mention',
    '$2b$10$8RmPPVxSFDAW1PBodvMoR.my7lJCFUj7cBhCdYSQsVZ1OOr.RnSpe',
    'Mention Administrator'
) ON CONFLICT (username) DO NOTHING;

-- 2. Generations
INSERT INTO generations (name, order_index) VALUES
('Angkatan 3', 3),
('Angkatan 4', 4),
('Angkatan 5', 5),
('Angkatan 6', 6),
('Lainnya', 7)
ON CONFLICT (name) DO NOTHING;

-- 3. Members
DO $$
DECLARE
    gen3 UUID;
    gen4 UUID;
    gen5 UUID;
    gen6 UUID;
    gen_other UUID;
BEGIN
    SELECT id INTO gen3 FROM generations WHERE name = 'Angkatan 3';
    SELECT id INTO gen4 FROM generations WHERE name = 'Angkatan 4';
    SELECT id INTO gen5 FROM generations WHERE name = 'Angkatan 5';
    SELECT id INTO gen6 FROM generations WHERE name = 'Angkatan 6';
    SELECT id INTO gen_other FROM generations WHERE name = 'Lainnya';

    -- Angkatan 6
    INSERT INTO members (generation_id, name) VALUES
    (gen6, 'Abdullah Al Muttaqii'),
    (gen6, 'Abdul Fattah Al Anshori'),
    (gen6, 'A’fif Abdurrahim'),
    (gen6, 'Ahmad Sahrudin'),
    (gen6, 'Alifiandra Kautsar'),
    (gen6, 'Ghany Rizqi Yusuf'),
    (gen6, 'Ghasan Kamil Al-Hamudi'),
    (gen6, 'Ihsan Alfarizi'),
    (gen6, 'Ihsan Mubarak'),
    (gen6, 'Indra Samudra'),
    (gen6, 'Jason Pratama Vinar'),
    (gen6, 'Lukyan Sashenka Chandra'),
    (gen6, 'Lutfi Dwi Aditya'),
    (gen6, 'Muhammad Ali Alfarizi'),
    (gen6, 'Muhammad Faruq'),
    (gen6, 'Muhammad Fadhlan Fadila'),
    (gen6, 'Muhammad Nur Alamsyah'),
    (gen6, 'Muhammad Rizky Sopian'),
    (gen6, 'Muhammad Yusuf Alfatih'),
    (gen6, 'Randi Gilang Ramadhan'),
    (gen6, 'Rayhan Mifzal Alfarizi'),
    (gen6, 'Reyhan'),
    (gen6, 'Thoriq Muwajjih Roby'),
    (gen6, 'Wahidin Halim'),
    (gen6, 'Zaelani Putra Wijaya'),
    (gen6, 'Yusuf Affan Vela');

    -- Angkatan 5
    INSERT INTO members (generation_id, name) VALUES
    (gen5, 'Rendi Rahardian'),
    (gen5, 'Rizq Arfi Arrazaqqufaiq Nugraha'),
    (gen5, 'Lutfan Izzat M'),
    (gen5, 'Shafwan Mahlil Al Hanu'),
    (gen5, 'Naufal Syafii'),
    (gen5, 'Moh. Azril Arropi'),
    (gen5, 'Hafidz Dwi Setiawan'),
    (gen5, 'Akhdan Mahya Rafid C P'),
    (gen5, 'Dhabith Abdillah Adipraja'),
    (gen5, 'Ammar Bassam Setiawan'),
    (gen5, 'M Tajul Arus Arrofy'),
    (gen5, 'Farhan Audia Fitrah'),
    (gen5, 'Ahmad Muzaky Jauhar'),
    (gen5, 'Yusuf Ahnaf Hilali'),
    (gen5, 'Abdurrahman Fathan'),
    (gen5, 'M Fayyadh'),
    (gen5, 'Salman Fahri'),
    (gen5, 'Ferdinand Faadhilah'),
    (gen5, 'Furqon Nailul Huda'),
    (gen5, 'Muhammad Taqy Abdurrahman K'),
    (gen5, 'Hadi Muhammad Rizky'),
    (gen5, 'Ahmad Maulana alfajri');

    -- Angkatan 4
    INSERT INTO members (generation_id, name) VALUES
    (gen4, 'Abidzar Algiffari'),
    (gen4, 'Breza Artha Medico'),
    (gen4, 'Farray Saleh Abdad'),
    (gen4, 'Gusti Prayoga'),
    (gen4, 'Halipah Mubarok'),
    (gen4, 'Khalik Syahir'),
    (gen4, 'Maajid Pratama'),
    (gen4, 'M. Nashiruddin Al Husaini'),
    (gen4, 'M. Azan Ohorella'),
    (gen4, 'M. Choerul Akbar'),
    (gen4, 'M. Dzurunnafis Khairuddin'),
    (gen4, 'M. Fadhil Ziyad Daniyal'),
    (gen4, 'M. Farhan'),
    (gen4, 'M. Fatihah Rizki'),
    (gen4, 'M. Ihsan'),
    (gen4, 'M. Inzi Alfarizi'),
    (gen4, 'M. Syauqi Azka'),
    (gen4, 'Najieb El Bawafi'),
    (gen4, 'Naufal Aziz Nabigh Siagian'),
    (gen4, 'Rafarel Haidar Yastaqi'),
    (gen4, 'Rafka Aditya Ramadhan'),
    (gen4, 'Zio Alfinois');

    -- Angkatan 3
    INSERT INTO members (generation_id, name) VALUES
    (gen3, 'Ahmad Fairuz Ghaly'),
    (gen3, 'Ahmad Ibrahimovic'),
    (gen3, 'Ahmad Royhan'),
    (gen3, 'Akram Mujamman Raton'),
    (gen3, 'Arfin Desca Al Zakhri'),
    (gen3, 'Baetul Fadla'),
    (gen3, 'Danish Athaya Natha Surendra'),
    (gen3, 'Erlangga Arta Dwi Cahya'),
    (gen3, 'Fakhri Zainul Arifin'),
    (gen3, 'Fawwaz Imtiyatul Afkar'),
    (gen3, 'Moh. Fakhri Rizkian'),
    (gen3, 'M. Ali Yafie Yosna'),
    (gen3, 'M. Rizki Ar Royyan'),
    (gen3, 'M. Iqbal Asqalani'),
    (gen3, 'M. Dzikri'),
    (gen3, 'M. Revan Rizki'),
    (gen3, 'M. Sayyid Husein Al-Karim'),
    (gen3, 'Nur Yusuf Ferdiansyah'),
    (gen3, 'Qiageng Berke Jaisyurrahman'),
    (gen3, 'Rifky Febrian Iskandar'),
    (gen3, 'Syarif Barri Abdillah'),
    (gen3, 'Wais Al-Qorni'),
    (gen3, 'Yusuf Regan Manggala Ghalib');

    -- Lainnya
    INSERT INTO members (generation_id, name) VALUES
    (gen_other, 'Bintang Tamu / Eksternal');
END $$;

-- 4. Checkers with 6-digit PIN (Default: 123456)
-- PIN 123456 bcrypt hash: $2b$10$hhYg4/O0AFnjw49XSG9oS.mM/u2NsHv//4TKKCJWLwAgSs8r0onu6
INSERT INTO checkers (name, pin_hash) VALUES
('Rian (Divisi Logistik)', '$2b$10$hhYg4/O0AFnjw49XSG9oS.mM/u2NsHv//4TKKCJWLwAgSs8r0onu6'),
('Siti (Koordinator Aset)', '$2b$10$hhYg4/O0AFnjw49XSG9oS.mM/u2NsHv//4TKKCJWLwAgSs8r0onu6');

-- 5. Items & Accessories
DO $$
DECLARE
    item1 UUID;
    item2 UUID;
    item3 UUID;
    item4 UUID;
    item5 UUID;
BEGIN
    INSERT INTO items (name, code, description, status)
    VALUES ('Kamera Sony Alpha A7 III', 'CAM-001', 'Kamera mirrorless full-frame untuk dokumentasi', 'AVAILABLE')
    RETURNING id INTO item1;

    INSERT INTO item_accessories (item_id, name) VALUES
    (item1, 'Body Kamera'),
    (item1, 'Lensa Kit 28-70mm'),
    (item1, 'Baterai Original'),
    (item1, 'Charger Baterai'),
    (item1, 'Memory Card 64GB'),
    (item1, 'Strap Kamera MENTION'),
    (item1, 'Tas Kamera');

    INSERT INTO items (name, code, description, status)
    VALUES ('Tripod Manfrotto 290', 'TRP-001', 'Tripod aluminium kokoh untuk foto & video', 'AVAILABLE')
    RETURNING id INTO item2;

    INSERT INTO item_accessories (item_id, name) VALUES
    (item2, 'Tripod Legs'),
    (item2, 'Ball Head'),
    (item2, 'Quick Release Plate'),
    (item2, 'Tas Tripod');

    INSERT INTO items (name, code, description, status)
    VALUES ('Laptop ASUS Vivobook 15', 'LPT-001', 'Laptop operasional dan editing ringan', 'AVAILABLE')
    RETURNING id INTO item3;

    INSERT INTO item_accessories (item_id, name) VALUES
    (item3, 'Laptop'),
    (item3, 'Charger Adapter 65W'),
    (item3, 'Mouse Wireless'),
    (item3, 'Tas Laptop');

    INSERT INTO items (name, code, description, status)
    VALUES ('Wireless Mic Hollyland Lark M1', 'MIC-001', 'Wireless microphone 2 transmitter + 1 receiver', 'AVAILABLE')
    RETURNING id INTO item4;

    INSERT INTO item_accessories (item_id, name) VALUES
    (item4, 'Transmitter 1'),
    (item4, 'Transmitter 2'),
    (item4, 'Receiver'),
    (item4, 'Charging Case'),
    (item4, '2x Windshield (Deadcat)'),
    (item4, 'Kabel Audio 3.5mm TRS'),
    (item4, 'Kabel Lightning Adapter');

    INSERT INTO items (name, code, description, status)
    VALUES ('Lighting Godox SL-60W', 'LGT-001', 'Lampu LED continuous 5600K', 'AVAILABLE')
    RETURNING id INTO item5;

    INSERT INTO item_accessories (item_id, name) VALUES
    (item5, 'Lampu Godox SL-60W'),
    (item5, 'Standard Reflector'),
    (item5, 'Kabel Power'),
    (item5, 'Remote Control');
END $$;

-- 6. Initial WhatsApp Config
INSERT INTO whatsapp_configs (target_group_name, is_connected)
VALUES ('MENTION Official Group', false);
