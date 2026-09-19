import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase/client';
import {
  Admin,
  Generation,
  Member,
  Checker,
  Item,
  ItemAccessory,
  Loan,
  LoanItem,
  NotificationEvent,
  WhatsAppConfig,
  ItemStatus,
  LoanStatus,
  InitialCondition,
  ReturnCondition,
} from '@/types';

function getDbFilePath(): string {
  const defaultPath = path.join(process.cwd(), 'data', 'local_db.json');
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpPath = path.join('/tmp', 'local_db.json');
    if (!fs.existsSync(tmpPath) && fs.existsSync(defaultPath)) {
      try {
        fs.copyFileSync(defaultPath, tmpPath);
      } catch {}
    }
    return tmpPath;
  }
  return defaultPath;
}

interface LocalDatabase {
  admins: Admin[];
  generations: Generation[];
  members: Member[];
  checkers: Checker[];
  items: Item[];
  item_accessories: ItemAccessory[];
  loans: Loan[];
  loan_items: LoanItem[];
  notification_events: NotificationEvent[];
  whatsapp_configs: WhatsAppConfig[];
  overdue_reminders: { id: string; loan_id: string; week_key: string; sent_at: string }[];
}

function readLocalDb(): LocalDatabase {
  const dbPath = getDbFilePath();
  try {
    if (!fs.existsSync(dbPath)) {
      const defaultPath = path.join(process.cwd(), 'data', 'local_db.json');
      if (fs.existsSync(defaultPath)) {
        const raw = fs.readFileSync(defaultPath, 'utf-8');
        return JSON.parse(raw);
      }
      throw new Error('Local DB not found');
    }
    const raw = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local db:', err);
    return {
      admins: [],
      generations: [],
      members: [],
      checkers: [],
      items: [],
      item_accessories: [],
      loans: [],
      loan_items: [],
      notification_events: [],
      whatsapp_configs: [],
      overdue_reminders: [],
    };
  }
}

function writeLocalDb(data: LocalDatabase): void {
  try {
    const dbPath = getDbFilePath();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local db:', err);
  }
}

// Generate sequential or random code
function generateLoanCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MNT-${dateStr}-${rand}`;
}

// Calculate overdue
export function calculateOverdue(expectedDateStr: string, actualDateStr?: string): { isOverdue: boolean; daysOverdue: number } {
  const targetDate = new Date(expectedDateStr);
  targetDate.setHours(0, 0, 0, 0);

  const compareDate = actualDateStr ? new Date(actualDateStr) : new Date();
  compareDate.setHours(0, 0, 0, 0);

  const diffTime = compareDate.getTime() - targetDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return { isOverdue: true, daysOverdue: diffDays };
  }
  return { isOverdue: false, daysOverdue: 0 };
}

// ====================================================================
// HEALTH / STATUS
// ====================================================================
export async function getDatabaseStatus(): Promise<{ isSupabase: boolean; message: string }> {
  try {
    const { data, error } = await supabase.from('generations').select('id').limit(1);
    if (!error && data !== null) {
      return { isSupabase: true, message: 'Terhubung ke Supabase Cloud PostgreSQL' };
    }
    return {
      isSupabase: false,
      message: 'Supabase schema belum dimigrate. Menggunakan database lokal yang sinkron. Silakan jalankan supabase/schema.sql di Supabase SQL Editor.',
    };
  } catch {
    return {
      isSupabase: false,
      message: 'Supabase offline/unreachable. Menggunakan database lokal fallback.',
    };
  }
}

// ====================================================================
// GENERATIONS & MEMBERS
// ====================================================================
export async function getGenerations(): Promise<Generation[]> {
  try {
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });
    if (!error && data && data.length > 0) return data as Generation[];
  } catch {}

  const db = readLocalDb();
  return db.generations
    .filter((g) => g.is_active)
    .sort((a, b) => a.order_index - b.order_index);
}

export async function getAllGenerationsAdmin(): Promise<Generation[]> {
  try {
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .order('order_index', { ascending: true });
    if (!error && data) return data as Generation[];
  } catch {}

  const db = readLocalDb();
  return [...db.generations].sort((a, b) => a.order_index - b.order_index);
}

export async function saveGeneration(name: string, order_index: number): Promise<Generation> {
  const id = `gen-${Date.now()}`;
  const now = new Date().toISOString();
  const newGen: Generation = { id, name, order_index, is_active: true, created_at: now };

  try {
    const { data, error } = await supabase.from('generations').insert([{ name, order_index, is_active: true }]).select().single();
    if (!error && data) return data as Generation;
  } catch {}

  const db = readLocalDb();
  db.generations.push(newGen);
  writeLocalDb(db);
  return newGen;
}

export async function toggleGenerationActive(id: string, is_active: boolean): Promise<boolean> {
  try {
    await supabase.from('generations').update({ is_active }).eq('id', id);
  } catch {}

  const db = readLocalDb();
  const item = db.generations.find((g) => g.id === id);
  if (item) {
    item.is_active = is_active;
    writeLocalDb(db);
    return true;
  }
  return false;
}

export async function getMembersByGeneration(
  generationId: string,
  options?: { onlyActiveLoans?: boolean }
): Promise<Member[]> {
  // 1. Try Supabase first if online
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*, generation:generations(*)')
      .eq('generation_id', generationId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      let members = data as Member[];

      const genName = members[0]?.generation?.name || '';
      const isLainnya = generationId === 'gen-other' || genName.toLowerCase().includes('lainnya');

      if (options?.onlyActiveLoans || (isLainnya && options?.onlyActiveLoans !== false)) {
        if (options?.onlyActiveLoans) {
          const { data: activeLoans } = await supabase
            .from('loans')
            .select('member_id, status, loan_items(status)')
            .in('status', ['ACTIVE', 'PARTIALLY_RETURNED']);

          const activeMemberIds = new Set(
            (activeLoans || [])
              .filter((l: any) => (l.loan_items || []).some((li: any) => li.status === 'BORROWED'))
              .map((l: any) => l.member_id)
          );
          members = members.filter((m) => activeMemberIds.has(m.id));
        }
      }

      return members;
    }
  } catch {}

  // 2. Fallback to local DB (match by ID or generation name)
  const db = readLocalDb();
  const targetGen =
    db.generations.find((g) => g.id === generationId) ||
    db.generations.find((g) => g.name.toLowerCase() === generationId.toLowerCase());
  const targetGenId = targetGen ? targetGen.id : generationId;

  let members = db.members.filter(
    (m) => (m.generation_id === targetGenId || m.generation_id === generationId) && m.is_active
  );

  const isLainnya =
    generationId === 'gen-other' ||
    targetGen?.name.toLowerCase().includes('lainnya') ||
    false;

  if (options?.onlyActiveLoans || (isLainnya && options?.onlyActiveLoans !== false)) {
    if (options?.onlyActiveLoans) {
      const activeMemberIds = new Set<string>();
      for (const loan of db.loans) {
        if (loan.status === 'ACTIVE' || loan.status === 'PARTIALLY_RETURNED') {
          const hasBorrowedItem = db.loan_items.some(
            (li) => li.loan_id === loan.id && li.status === 'BORROWED'
          );
          if (hasBorrowedItem) {
            activeMemberIds.add(loan.member_id);
          }
        }
      }
      members = members.filter((m) => activeMemberIds.has(m.id));
    }
  }

  return members
    .map((m) => ({
      ...m,
      generation: db.generations.find((g) => g.id === m.generation_id) || targetGen,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllMembers(): Promise<Member[]> {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*, generation:generations(*)')
      .order('name', { ascending: true });
    if (!error && data) return data as Member[];
  } catch {}

  const db = readLocalDb();
  return db.members.map((m) => ({
    ...m,
    generation: db.generations.find((g) => g.id === m.generation_id),
  }));
}

export async function saveMember(generation_id: string, name: string, phone?: string): Promise<Member> {
  const id = `mem-${Date.now()}`;
  const now = new Date().toISOString();
  const newMember: Member = { id, generation_id, name, phone, is_active: true, created_at: now };

  try {
    const { data, error } = await supabase
      .from('members')
      .insert([{ generation_id, name, phone, is_active: true }])
      .select('*, generation:generations(*)')
      .single();
    if (!error && data) return data as Member;
  } catch {}

  const db = readLocalDb();
  db.members.push(newMember);
  writeLocalDb(db);
  return { ...newMember, generation: db.generations.find((g) => g.id === generation_id) };
}

export async function updateMember(id: string, updates: Partial<Member>): Promise<boolean> {
  try {
    await supabase.from('members').update(updates).eq('id', id);
  } catch {}

  const db = readLocalDb();
  const mem = db.members.find((m) => m.id === id);
  if (mem) {
    Object.assign(mem, updates);
    writeLocalDb(db);
    return true;
  }
  return false;
}

export async function deleteGeneration(id: string): Promise<{ success: boolean; error?: string }> {
  const db = readLocalDb();
  try {
    await supabase.from('members').delete().eq('generation_id', id);
    await supabase.from('generations').delete().eq('id', id);
  } catch {}

  db.members = db.members.filter((m) => m.generation_id !== id);
  db.generations = db.generations.filter((g) => g.id !== id);
  writeLocalDb(db);
  return { success: true };
}

export async function deleteMember(id: string): Promise<{ success: boolean; error?: string }> {
  const db = readLocalDb();
  const hasActive = db.loans.some((l) => l.member_id === id && l.status === 'ACTIVE');
  if (hasActive) {
    return { success: false, error: 'Anggota ini masih memiliki peminjaman aktif.' };
  }

  try {
    await supabase.from('members').delete().eq('id', id);
  } catch {}

  db.members = db.members.filter((m) => m.id !== id);
  writeLocalDb(db);
  return { success: true };
}

// ====================================================================
// CHECKERS (PIC)
// ====================================================================
export async function getCheckers(): Promise<Omit<Checker, 'pin_hash'>[]> {
  try {
    const { data, error } = await supabase
      .from('checkers')
      .select('id, name, is_active, created_at')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (!error && data && data.length > 0) return data;
  } catch {}

  const db = readLocalDb();
  return db.checkers
    .filter((c) => c.is_active)
    .map(({ id, name, is_active, created_at }) => ({ id, name, is_active, created_at }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllCheckersAdmin(): Promise<Omit<Checker, 'pin_hash'>[]> {
  try {
    const { data, error } = await supabase
      .from('checkers')
      .select('id, name, is_active, created_at')
      .order('name', { ascending: true });
    if (!error && data) return data;
  } catch {}

  const db = readLocalDb();
  return db.checkers.map(({ id, name, is_active, created_at }) => ({ id, name, is_active, created_at }));
}

export async function verifyCheckerPin(checkerId: string, pin: string): Promise<{ success: boolean; checkerName?: string; error?: string }> {
  // Validate exact 6 digits
  if (!/^\d{6}$/.test(pin)) {
    return { success: false, error: 'PIN PIC harus 6 digit angka.' };
  }

  let checker: Checker | undefined;

  try {
    const { data, error } = await supabase
      .from('checkers')
      .select('*')
      .eq('id', checkerId)
      .eq('is_active', true)
      .single();
    if (!error && data) {
      checker = data as Checker;
    }
  } catch {}

  if (!checker) {
    const db = readLocalDb();
    checker = db.checkers.find((c) => c.id === checkerId && c.is_active);
  }

  if (!checker) {
    return { success: false, error: 'PIC Checker tidak ditemukan atau tidak aktif.' };
  }

  const isMatch = await bcrypt.compare(pin, checker.pin_hash);
  if (!isMatch) {
    return { success: false, error: 'PIN PIC salah. Silakan coba kembali.' };
  }

  return { success: true, checkerName: checker.name };
}

export async function saveChecker(name: string, pin6Digit: string): Promise<boolean> {
  if (!/^\d{6}$/.test(pin6Digit)) {
    throw new Error('PIN harus tepat 6 digit angka');
  }

  const pin_hash = await bcrypt.hash(pin6Digit, 10);
  const id = `chk-${Date.now()}`;
  const now = new Date().toISOString();

  try {
    await supabase.from('checkers').insert([{ name, pin_hash, is_active: true }]);
  } catch {}

  const db = readLocalDb();
  db.checkers.push({ id, name, pin_hash, is_active: true, created_at: now });
  writeLocalDb(db);
  return true;
}

export async function updateCheckerPin(id: string, newPin6Digit: string): Promise<boolean> {
  if (!/^\d{6}$/.test(newPin6Digit)) {
    throw new Error('PIN harus tepat 6 digit angka');
  }
  const pin_hash = await bcrypt.hash(newPin6Digit, 10);

  try {
    await supabase.from('checkers').update({ pin_hash }).eq('id', id);
  } catch {}

  const db = readLocalDb();
  const chk = db.checkers.find((c) => c.id === id);
  if (chk) {
    chk.pin_hash = pin_hash;
    writeLocalDb(db);
    return true;
  }
  return false;
}

export async function toggleCheckerActive(id: string, is_active: boolean): Promise<boolean> {
  try {
    await supabase.from('checkers').update({ is_active }).eq('id', id);
  } catch {}

  const db = readLocalDb();
  const chk = db.checkers.find((c) => c.id === id);
  if (chk) {
    chk.is_active = is_active;
    writeLocalDb(db);
    return true;
  }
  return false;
}

export async function deleteChecker(id: string): Promise<{ success: boolean; error?: string }> {
  const db = readLocalDb();
  const hasActive = db.loans.some(
    (l) => (l.initial_checker_id === id || l.return_checker_id === id) && l.status === 'ACTIVE'
  );
  if (hasActive) {
    return { success: false, error: 'PIC Checker masih memiliki peminjaman aktif.' };
  }

  try {
    await supabase.from('checkers').delete().eq('id', id);
  } catch {}

  db.checkers = db.checkers.filter((c) => c.id !== id);
  writeLocalDb(db);
  return { success: true };
}

// ====================================================================
// ITEMS & ACCESSORIES
// ====================================================================
export async function getItems(statusFilter?: ItemStatus | 'ALL'): Promise<Item[]> {
  try {
    let query = supabase.from('items').select('*, accessories:item_accessories(*)');
    if (statusFilter && statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }
    const { data, error } = await query.order('name', { ascending: true });
    if (!error && data && data.length > 0) return data as Item[];
  } catch {}

  const db = readLocalDb();
  let filtered = db.items;
  if (statusFilter && statusFilter !== 'ALL') {
    filtered = filtered.filter((i) => i.status === statusFilter);
  }
  return filtered.map((item) => ({
    ...item,
    accessories: db.item_accessories.filter((a) => a.item_id === item.id),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getItemById(id: string): Promise<Item | null> {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*, accessories:item_accessories(*)')
      .eq('id', id)
      .single();
    if (!error && data) return data as Item;
  } catch {}

  const db = readLocalDb();
  const item = db.items.find((i) => i.id === id);
  if (!item) return null;
  return {
    ...item,
    accessories: db.item_accessories.filter((a) => a.item_id === item.id),
  };
}

export async function saveItem(
  itemData: { name: string; code?: string; description?: string; status: ItemStatus },
  accessories: string[]
): Promise<Item> {
  const itemId = `item-${Date.now()}`;
  const now = new Date().toISOString();

  const newItem: Item = {
    id: itemId,
    name: itemData.name,
    code: itemData.code || `ITM-${Date.now().toString().slice(-4)}`,
    description: itemData.description || '',
    status: itemData.status,
    created_at: now,
  };

  try {
    const { data: itemInsert, error } = await supabase.from('items').insert([newItem]).select().single();
    if (!error && itemInsert) {
      if (accessories.length > 0) {
        const accInserts = accessories.map((accName) => ({
          item_id: itemInsert.id,
          name: accName,
          is_required: true,
        }));
        await supabase.from('item_accessories').insert(accInserts);
      }
    }
  } catch {}

  const db = readLocalDb();
  db.items.push(newItem);
  const createdAccessories: ItemAccessory[] = accessories.map((accName, idx) => ({
    id: `acc-${Date.now()}-${idx}`,
    item_id: itemId,
    name: accName,
    is_required: true,
  }));
  db.item_accessories.push(...createdAccessories);
  writeLocalDb(db);

  return { ...newItem, accessories: createdAccessories };
}

export async function updateItem(
  id: string,
  itemData: { name: string; code?: string; description?: string; status: ItemStatus },
  accessories?: string[]
): Promise<boolean> {
  try {
    await supabase.from('items').update(itemData).eq('id', id);
    if (accessories) {
      await supabase.from('item_accessories').delete().eq('item_id', id);
      if (accessories.length > 0) {
        const accInserts = accessories.map((accName) => ({
          item_id: id,
          name: accName,
          is_required: true,
        }));
        await supabase.from('item_accessories').insert(accInserts);
      }
    }
  } catch {}

  const db = readLocalDb();
  const existing = db.items.find((i) => i.id === id);
  if (existing) {
    Object.assign(existing, itemData);
    if (accessories) {
      db.item_accessories = db.item_accessories.filter((a) => a.item_id !== id);
      accessories.forEach((accName, idx) => {
        db.item_accessories.push({
          id: `acc-${Date.now()}-${idx}`,
          item_id: id,
          name: accName,
          is_required: true,
        });
      });
    }
    writeLocalDb(db);
    return true;
  }
  return false;
}

export async function deleteItem(id: string): Promise<{ success: boolean; error?: string }> {
  const db = readLocalDb();
  // Check if item is actively borrowed
  const activeBorrowed = db.items.some((i) => i.id === id && i.status === 'BORROWED');
  if (activeBorrowed) {
    return { success: false, error: 'Barang sedang dipinjam, tidak dapat dihapus.' };
  }

  try {
    await supabase.from('item_accessories').delete().eq('item_id', id);
    await supabase.from('loan_items').delete().eq('item_id', id);
    await supabase.from('items').delete().eq('id', id);
  } catch {}

  db.items = db.items.filter((i) => i.id !== id);
  db.item_accessories = db.item_accessories.filter((a) => a.item_id !== id);
  db.loan_items = db.loan_items.filter((li) => li.item_id !== id);
  writeLocalDb(db);

  return { success: true };
}

// ====================================================================
// LOANS & BORROWING FLOW (WITH RACE-CONDITION SAFETY)
// ====================================================================
export interface BorrowItemInput {
  itemId: string;
  initialCondition: InitialCondition;
  initialAccessories: string[];
  initialNotes?: string;
}

export interface CreateLoanInput {
  memberId?: string;
  customName?: string;
  customPhone?: string;
  generationId?: string;
  borrowDate: string;
  expectedReturnDate: string;
  checkerId: string;
  notes?: string;
  items: BorrowItemInput[];
}

export async function createLoanTransaction(input: CreateLoanInput): Promise<{ success: boolean; loan?: Loan; error?: string }> {
  const db = readLocalDb();
  let finalMemberId = input.memberId;

  // 1. Validation & Custom Name Handling ("Lainnya")
  if (!finalMemberId || finalMemberId === 'custom' || input.customName) {
    const customName = (input.customName || '').trim();
    if (!customName) return { success: false, error: 'Nama peminjam harus diisi.' };

    let otherGen = db.generations.find((g) => g.id === 'gen-other' || g.name.toLowerCase() === 'lainnya');
    if (!otherGen) {
      otherGen = {
        id: 'gen-other',
        name: 'Lainnya',
        order_index: 99,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      db.generations.push(otherGen);
    }

    let mem = db.members.find(
      (m) => m.generation_id === otherGen!.id && m.name.toLowerCase() === customName.toLowerCase() && m.is_active
    );
    if (!mem) {
      mem = {
        id: `mem-other-${Date.now()}`,
        generation_id: otherGen.id,
        name: customName,
        phone: input.customPhone || '',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      db.members.push(mem);
    }
    finalMemberId = mem.id;
  }

  if (!finalMemberId) return { success: false, error: 'Peminjam harus dipilih.' };
  if (!input.items || input.items.length === 0) return { success: false, error: 'Minimal satu barang harus dipilih.' };
  if (!input.borrowDate || !input.expectedReturnDate) return { success: false, error: 'Tanggal peminjaman dan pengembalian harus diisi.' };
  if (new Date(input.expectedReturnDate) < new Date(input.borrowDate)) {
    return { success: false, error: 'Tanggal pengembalian tidak boleh lebih awal dari tanggal peminjaman.' };
  }
  if (!input.checkerId) return { success: false, error: 'PIC Checker harus dipilih.' };

  // 2. Race condition safety: verify all selected items are AVAILABLE right now
  const requestedItemIds = input.items.map((i) => i.itemId);

  // Check duplicates in selection
  if (new Set(requestedItemIds).size !== requestedItemIds.length) {
    return { success: false, error: 'Barang yang sama tidak boleh dipilih lebih dari sekali.' };
  }

  for (const itemId of requestedItemIds) {
    const item = db.items.find((i) => i.id === itemId);
    if (!item || item.status !== 'AVAILABLE') {
      return {
        success: false,
        error: `Barang "${item ? item.name : itemId}" baru saja dipinjam atau tidak tersedia. Silakan pilih barang lain.`,
      };
    }
  }

  const loanId = `loan-${Date.now()}`;
  const loanCode = generateLoanCode();
  const now = new Date().toISOString();

  const member = db.members.find((m) => m.id === finalMemberId);
  const checker = db.checkers.find((c) => c.id === input.checkerId);

  const newLoan: Loan = {
    id: loanId,
    loan_code: loanCode,
    member_id: finalMemberId,
    borrow_date: input.borrowDate,
    expected_return_date: input.expectedReturnDate,
    status: 'ACTIVE',
    initial_checker_id: input.checkerId,
    notes: input.notes || '',
    created_at: now,
  };

  const newLoanItems: LoanItem[] = input.items.map((itemInput, idx) => {
    const itemRecord = db.items.find((i) => i.id === itemInput.itemId);
    return {
      id: `li-${Date.now()}-${idx}`,
      loan_id: loanId,
      item_id: itemInput.itemId,
      status: 'BORROWED',
      initial_condition: itemInput.initialCondition,
      initial_accessories: itemInput.initialAccessories || [],
      initial_notes: itemInput.initialNotes || '',
      created_at: now,
      item: itemRecord,
    };
  });

  // 3. Atomically update items to BORROWED in local db
  for (const itemId of requestedItemIds) {
    const targetItem = db.items.find((i) => i.id === itemId);
    if (targetItem) {
      targetItem.status = 'BORROWED';
      targetItem.updated_at = now;
    }
  }

  db.loans.push(newLoan);
  db.loan_items.push(...newLoanItems);

  // 4. Create WhatsApp Notification Event
  const generation = member ? db.generations.find((g) => g.id === member.generation_id) : undefined;
  const itemsText = newLoanItems
    .map((li) => `- ${li.item?.name || 'Barang'}`)
    .join('\n');

  const waMessage = `[PEMINJAMAN BARANG]\n\nNama:\n${member?.name || '-'}\n\nAngkatan:\n${generation?.name || '-'}\n\nBarang:\n${itemsText}\n\nTanggal Peminjaman:\n${input.borrowDate}\n\nTanggal Pengembalian:\n${input.expectedReturnDate}\n\nPIC Checker:\n${checker?.name || '-'}\n\nStatus:\nSedang Dipinjam`;

  const notificationEvent: NotificationEvent = {
    id: `notif-${Date.now()}`,
    loan_id: loanId,
    type: 'BORROW',
    message: waMessage,
    status: 'PENDING',
    created_at: now,
  };
  db.notification_events.push(notificationEvent);

  writeLocalDb(db);

  // Also try to mirror to Supabase if available
  try {
    await supabase.from('loans').insert([{
      id: loanId,
      loan_code: loanCode,
      member_id: input.memberId,
      borrow_date: input.borrowDate,
      expected_return_date: input.expectedReturnDate,
      status: 'ACTIVE',
      initial_checker_id: input.checkerId,
      notes: input.notes,
    }]);

    for (const li of newLoanItems) {
      await supabase.from('loan_items').insert([{
        id: li.id,
        loan_id: loanId,
        item_id: li.item_id,
        status: 'BORROWED',
        initial_condition: li.initial_condition,
        initial_accessories: li.initial_accessories,
        initial_notes: li.initial_notes,
      }]);
      await supabase.from('items').update({ status: 'BORROWED' }).eq('id', li.item_id);
    }
  } catch {}

  return {
    success: true,
    loan: {
      ...newLoan,
      member: member ? { ...member, generation } : undefined,
      initial_checker: checker,
      items: newLoanItems,
    },
  };
}

// ====================================================================
// RETURN FLOW
// ====================================================================
export async function getActiveLoansByMember(memberId: string): Promise<Loan[]> {
  const db = readLocalDb();
  const loans = db.loans.filter(
    (l) => l.member_id === memberId && (l.status === 'ACTIVE' || l.status === 'PARTIALLY_RETURNED')
  );

  const member = db.members.find((m) => m.id === memberId);
  const generation = member ? db.generations.find((g) => g.id === member.generation_id) : undefined;

  return loans.map((loan) => {
    const loanItems = db.loan_items
      .filter((li) => li.loan_id === loan.id && li.status === 'BORROWED')
      .map((li) => ({
        ...li,
        item: db.items.find((i) => i.id === li.item_id),
      }));

    const { isOverdue, daysOverdue } = calculateOverdue(loan.expected_return_date);

    return {
      ...loan,
      status: isOverdue ? 'OVERDUE' : loan.status,
      member: member ? { ...member, generation } : undefined,
      initial_checker: db.checkers.find((c) => c.id === loan.initial_checker_id),
      items: loanItems,
      daysOverdue,
    } as Loan & { daysOverdue?: number };
  });
}

export interface ReturnItemInput {
  loanItemId: string;
  returnCondition: ReturnCondition;
  returnAccessories: string[];
  returnNotes?: string;
}

export interface ProcessReturnInput {
  loanId: string;
  checkerId: string;
  items: ReturnItemInput[];
}

export async function processReturnTransaction(input: ProcessReturnInput): Promise<{ success: boolean; loan?: Loan; error?: string }> {
  if (!input.loanId) return { success: false, error: 'ID Transaksi Peminjaman tidak valid.' };
  if (!input.checkerId) return { success: false, error: 'PIC Checker harus dipilih.' };
  if (!input.items || input.items.length === 0) return { success: false, error: 'Pilih minimal satu barang untuk dikembalikan.' };

  const db = readLocalDb();
  const loan = db.loans.find((l) => l.id === input.loanId);
  if (!loan) return { success: false, error: 'Transaksi peminjaman tidak ditemukan.' };

  const checker = db.checkers.find((c) => c.id === input.checkerId);
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const returnedItemNames: string[] = [];

  for (const itemReturn of input.items) {
    const loanItem = db.loan_items.find((li) => li.id === itemReturn.loanItemId && li.loan_id === input.loanId);
    if (!loanItem) continue;

    loanItem.status = 'RETURNED';
    loanItem.return_condition = itemReturn.returnCondition;
    loanItem.return_accessories = itemReturn.returnAccessories;
    loanItem.return_notes = itemReturn.returnNotes || '';
    loanItem.returned_at = now;

    // Update physical item status: if damaged -> MAINTENANCE, else AVAILABLE
    const item = db.items.find((i) => i.id === loanItem.item_id);
    if (item) {
      item.status = itemReturn.returnCondition === 'Rusak' ? 'MAINTENANCE' : 'AVAILABLE';
      item.updated_at = now;
      returnedItemNames.push(item.name);
    }
  }

  // Check remaining borrowed items in this loan
  const remainingBorrowedItems = db.loan_items.filter((li) => li.loan_id === input.loanId && li.status === 'BORROWED');
  if (remainingBorrowedItems.length === 0) {
    loan.status = 'RETURNED';
    loan.actual_return_date = today;
  } else {
    loan.status = 'PARTIALLY_RETURNED';
  }
  loan.return_checker_id = input.checkerId;
  loan.updated_at = now;

  // WhatsApp Notification for Return
  const member = db.members.find((m) => m.id === loan.member_id);
  const generation = member ? db.generations.find((g) => g.id === member.generation_id) : undefined;
  const itemsText = returnedItemNames.map((n) => `- ${n}`).join('\n');
  const returnConditions = input.items.map((i) => i.returnCondition).join(', ');
  const notesText = input.items.map((i) => i.returnNotes).filter(Boolean).join('; ');

  const waMessage = `[PENGEMBALIAN BARANG]\n\nNama:\n${member?.name || '-'}\n\nAngkatan:\n${generation?.name || '-'}\n\nBarang Dikembalikan:\n${itemsText}\n\nTanggal Pengembalian:\n${today}\n\nPIC Checker:\n${checker?.name || '-'}\n\nKondisi:\n${returnConditions}${notesText ? `\n\nCatatan:\n${notesText}` : ''}\n\nStatus:\nBerhasil Dikembalikan`;

  const notificationEvent: NotificationEvent = {
    id: `notif-${Date.now()}`,
    loan_id: loan.id,
    type: 'RETURN',
    message: waMessage,
    status: 'PENDING',
    created_at: now,
  };
  db.notification_events.push(notificationEvent);

  writeLocalDb(db);

  // Mirror to Supabase if possible
  try {
    await supabase.from('loans').update({
      status: loan.status,
      actual_return_date: loan.actual_return_date,
      return_checker_id: loan.return_checker_id,
      updated_at: now,
    }).eq('id', loan.id);
  } catch {}

  return { success: true, loan };
}

// ====================================================================
// ADMIN DASHBOARD & ACTIVITY & HISTORY
// ====================================================================
export async function getDashboardStats() {
  const db = readLocalDb();
  const today = new Date().toISOString().slice(0, 10);

  const activeLoans = db.loans.filter((l) => l.status === 'ACTIVE' || l.status === 'PARTIALLY_RETURNED');
  const overdueLoans = activeLoans.filter((l) => l.expected_return_date < today);

  const availableItems = db.items.filter((i) => i.status === 'AVAILABLE').length;
  const borrowedItems = db.items.filter((i) => i.status === 'BORROWED').length;
  const maintenanceItems = db.items.filter((i) => i.status === 'MAINTENANCE').length;

  return {
    activeLoansCount: activeLoans.length,
    overdueLoansCount: overdueLoans.length,
    availableItemsCount: availableItems,
    borrowedItemsCount: borrowedItems,
    maintenanceItemsCount: maintenanceItems,
  };
}

export async function getLoansActivity(filters?: { status?: LoanStatus | 'ALL'; search?: string }): Promise<Loan[]> {
  const db = readLocalDb();
  let loans = [...db.loans];

  if (filters?.status && filters.status !== 'ALL') {
    loans = loans.filter((l) => l.status === filters.status);
  }

  const enriched = loans.map((loan) => {
    const member = db.members.find((m) => m.id === loan.member_id);
    const generation = member ? db.generations.find((g) => g.id === member.generation_id) : undefined;
    const initialChecker = db.checkers.find((c) => c.id === loan.initial_checker_id);
    const returnChecker = db.checkers.find((c) => c.id === loan.return_checker_id);

    const items = db.loan_items
      .filter((li) => li.loan_id === loan.id)
      .map((li) => ({
        ...li,
        item: db.items.find((i) => i.id === li.item_id),
      }));

    const { isOverdue, daysOverdue } = calculateOverdue(loan.expected_return_date, loan.actual_return_date);

    return {
      ...loan,
      status: (isOverdue && loan.status !== 'RETURNED') ? 'OVERDUE' : loan.status,
      member: member ? { ...member, generation } : undefined,
      initial_checker: initialChecker,
      return_checker: returnChecker,
      items,
      daysOverdue,
    } as Loan & { daysOverdue?: number };
  });

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    return enriched.filter(
      (l) =>
        l.loan_code.toLowerCase().includes(q) ||
        l.member?.name.toLowerCase().includes(q) ||
        l.items?.some((i) => i.item?.name.toLowerCase().includes(q))
    );
  }

  return enriched.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
}

export async function deleteLoan(id: string): Promise<{ success: boolean; error?: string }> {
  const db = readLocalDb();
  const loan = db.loans.find((l) => l.id === id);
  if (!loan) return { success: false, error: 'Transaksi tidak ditemukan.' };

  // If any items in this loan are currently BORROWED, restore them to AVAILABLE
  const loanItems = db.loan_items.filter((li) => li.loan_id === id);
  for (const li of loanItems) {
    if (li.status === 'BORROWED') {
      const item = db.items.find((i) => i.id === li.item_id);
      if (item && item.status === 'BORROWED') {
        item.status = 'AVAILABLE';
      }
      try {
        await supabase.from('items').update({ status: 'AVAILABLE' }).eq('id', li.item_id);
      } catch {}
    }
  }

  try {
    await supabase.from('loan_items').delete().eq('loan_id', id);
    await supabase.from('notification_events').delete().eq('loan_id', id);
    await supabase.from('overdue_reminders').delete().eq('loan_id', id);
    await supabase.from('loans').delete().eq('id', id);
  } catch {}

  db.loan_items = db.loan_items.filter((li) => li.loan_id !== id);
  db.notification_events = db.notification_events.filter((ne) => ne.loan_id !== id);
  db.overdue_reminders = db.overdue_reminders.filter((or) => or.loan_id !== id);
  db.loans = db.loans.filter((l) => l.id !== id);
  writeLocalDb(db);

  return { success: true };
}

export async function getCurrentlyBorrowedItems(): Promise<{
  item: Item;
  borrower: Member | undefined;
  generation: Generation | undefined;
  borrowDate: string;
  expectedReturnDate: string;
  loanCode: string;
  isOverdue: boolean;
  daysOverdue: number;
}[]> {
  const db = readLocalDb();
  const borrowedLoanItems = db.loan_items.filter((li) => li.status === 'BORROWED');

  const result: any[] = [];

  for (const li of borrowedLoanItems) {
    const item = db.items.find((i) => i.id === li.item_id);
    const loan = db.loans.find((l) => l.id === li.loan_id);
    if (!item || !loan) continue;

    const member = db.members.find((m) => m.id === loan.member_id);
    const generation = member ? db.generations.find((g) => g.id === member.generation_id) : undefined;
    const { isOverdue, daysOverdue } = calculateOverdue(loan.expected_return_date);

    result.push({
      item,
      borrower: member,
      generation,
      borrowDate: loan.borrow_date,
      expectedReturnDate: loan.expected_return_date,
      loanCode: loan.loan_code,
      isOverdue,
      daysOverdue,
    });
  }

  return result;
}

// ====================================================================
// WHATSAPP CONFIG & NOTIFICATIONS
// ====================================================================
export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const db = readLocalDb();
  return (
    db.whatsapp_configs[0] || {
      id: 'wa-1',
      target_group_name: 'MENTION Official Group',
      is_connected: false,
    }
  );
}

export async function updateWhatsAppConfig(updates: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
  const db = readLocalDb();
  if (!db.whatsapp_configs[0]) {
    db.whatsapp_configs[0] = {
      id: 'wa-1',
      target_group_name: 'MENTION Official Group',
      is_connected: false,
      ...updates,
    };
  } else {
    Object.assign(db.whatsapp_configs[0], updates, { updated_at: new Date().toISOString() });
  }
  writeLocalDb(db);
  return db.whatsapp_configs[0];
}

export async function getNotificationEvents(limit = 50): Promise<NotificationEvent[]> {
  const db = readLocalDb();
  return [...db.notification_events]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export async function markNotificationSent(id: string): Promise<void> {
  const db = readLocalDb();
  const notif = db.notification_events.find((n) => n.id === id);
  if (notif) {
    notif.status = 'SENT';
    notif.sent_at = new Date().toISOString();
    writeLocalDb(db);
  }
}

export async function markNotificationFailed(id: string, error: string): Promise<void> {
  const db = readLocalDb();
  const notif = db.notification_events.find((n) => n.id === id);
  if (notif) {
    notif.status = 'FAILED';
    notif.error_message = error;
    writeLocalDb(db);
  }
}

// Helper to get ISO week key: e.g. "2026-W38"
function getWeekKey(d = new Date()): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export async function checkAndCreateWeeklyOverdueReminders(): Promise<NotificationEvent[]> {
  const db = readLocalDb();
  const currentWeek = getWeekKey();
  const today = new Date().toISOString().slice(0, 10);

  const overdueLoans = db.loans.filter((l) => (l.status === 'ACTIVE' || l.status === 'PARTIALLY_RETURNED') && l.expected_return_date < today);

  const newEvents: NotificationEvent[] = [];

  for (const loan of overdueLoans) {
    // Check if reminder was already sent for this loan in this week
    const alreadySent = db.overdue_reminders.some((r) => r.loan_id === loan.id && r.week_key === currentWeek);
    if (alreadySent) continue;

    const member = db.members.find((m) => m.id === loan.member_id);
    const unreturnedItems = db.loan_items
      .filter((li) => li.loan_id === loan.id && li.status === 'BORROWED')
      .map((li) => `- ${db.items.find((i) => i.id === li.item_id)?.name || 'Barang'}`)
      .join('\n');

    const { daysOverdue } = calculateOverdue(loan.expected_return_date);

    const message = `[REMINDER PENGEMBALIAN]\n\nNama:\n${member?.name || '-'}\n\nBarang:\n${unreturnedItems}\n\nSeharusnya dikembalikan:\n${loan.expected_return_date}\n\nTerlambat:\n${daysOverdue} hari\n\nStatus:\nBelum Dikembalikan`;

    const newNotif: NotificationEvent = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      loan_id: loan.id,
      type: 'OVERDUE',
      message,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    db.notification_events.push(newNotif);
    db.overdue_reminders.push({
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      loan_id: loan.id,
      week_key: currentWeek,
      sent_at: new Date().toISOString(),
    });

    newEvents.push(newNotif);
  }

  if (newEvents.length > 0) {
    writeLocalDb(db);
  }

  return newEvents;
}
