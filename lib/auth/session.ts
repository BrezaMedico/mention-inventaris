import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase/client';
import { Admin } from '@/types';

const COOKIE_NAME = 'mention_admin_session';
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mention-org-session-token-key-2026-secure-32chars'
);

const DB_PATH = path.join(process.cwd(), 'data', 'local_db.json');

export async function verifyAdminCredentials(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; admin?: { id: string; username: string; name: string }; error?: string }> {
  const username = usernameInput.trim();
  const password = passwordInput;

  let adminRecord: Admin | undefined;

  // Try checking Supabase first
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();
    if (!error && data) {
      adminRecord = data as Admin;
    }
  } catch {}

  // Fallback to local DB
  if (!adminRecord) {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const db = JSON.parse(raw);
        adminRecord = (db.admins || []).find((a: Admin) => a.username === username);
      }
    } catch {}
  }

  // If found in DB, compare bcrypt hash
  if (adminRecord) {
    const isMatch = await bcrypt.compare(password, adminRecord.password_hash);
    if (isMatch) {
      return {
        success: true,
        admin: { id: adminRecord.id, username: adminRecord.username, name: adminRecord.name },
      };
    }
  }

  // Fallback to environment variables if initial setup
  const envUser = process.env.ADMIN_USERNAME || 'mention';
  const envPass = process.env.ADMIN_PASSWORD || 'Mention_123!*';

  if (username === envUser && password === envPass) {
    return {
      success: true,
      admin: { id: 'admin-env', username: envUser, name: 'Mention Administrator' },
    };
  }

  return { success: false, error: 'Username atau password admin salah.' };
}

export async function createAdminSession(payload: { id: string; username: string; name: string }): Promise<string> {
  const token = await new SignJWT({ ...payload, role: 'ADMIN' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // Pure session cookie: automatically destroyed when leaving/closing the page
  });

  return token;
}

export async function getAdminSession(): Promise<{ id: string; username: string; name: string } | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(COOKIE_NAME);
    if (!tokenCookie || !tokenCookie.value) return null;

    const { payload } = await jwtVerify(tokenCookie.value, SECRET_KEY);
    if (payload && payload.role === 'ADMIN') {
      return {
        id: payload.id as string,
        username: payload.username as string,
        name: (payload.name as string) || 'Administrator',
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
