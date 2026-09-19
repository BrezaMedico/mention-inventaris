export type ItemStatus = 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE' | 'INACTIVE';

export type LoanStatus = 'ACTIVE' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'OVERDUE';

export type InitialCondition = 'Aman' | 'Ada Catatan' | 'Tidak Aman';

export type ReturnCondition = 'Aman' | 'Rusak' | 'Tidak Lengkap';

export type NotificationType = 'BORROW' | 'RETURN' | 'OVERDUE' | 'TEST';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface Admin {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Member {
  id: string;
  generation_id: string;
  name: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  generation?: Generation;
}

export interface Checker {
  id: string;
  name: string;
  pin_hash: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ItemAccessory {
  id: string;
  item_id: string;
  name: string;
  is_required: boolean;
  created_at?: string;
}

export interface Item {
  id: string;
  name: string;
  code?: string;
  description?: string;
  image_url?: string;
  status: ItemStatus;
  created_at?: string;
  updated_at?: string;
  accessories?: ItemAccessory[];
}

export interface LoanItem {
  id: string;
  loan_id: string;
  item_id: string;
  status: 'BORROWED' | 'RETURNED';
  initial_condition: InitialCondition;
  initial_accessories: string[]; // names of accessories checked
  initial_notes?: string;
  return_condition?: ReturnCondition;
  return_accessories?: string[];
  return_notes?: string;
  returned_at?: string;
  created_at?: string;
  updated_at?: string;
  item?: Item;
}

export interface Loan {
  id: string;
  loan_code: string;
  member_id: string;
  borrow_date: string;
  expected_return_date: string;
  actual_return_date?: string;
  status: LoanStatus;
  initial_checker_id: string;
  return_checker_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  member?: Member;
  initial_checker?: Checker;
  return_checker?: Checker;
  items?: LoanItem[];
}

export interface NotificationEvent {
  id: string;
  loan_id?: string;
  type: NotificationType;
  message: string;
  status: NotificationStatus;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export interface WhatsAppConfig {
  id: string;
  target_group_jid?: string;
  target_group_name?: string;
  is_connected: boolean;
  phone_number?: string;
  last_connected_at?: string;
  updated_at?: string;
}

export interface WhatsAppGroup {
  id: string;
  name: string;
  participantsCount?: number;
}
