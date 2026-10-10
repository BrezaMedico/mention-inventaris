import express from 'express';
import cors from 'cors';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys';

// ====================================================================
// CRASH IMMUNITY (24/7 Always-On Protection)
// Mencegah Node.js crash akibat unhandled socket frame atau crypto error
// ====================================================================
process.on('uncaughtException', (err) => {
  console.error('[Anti-Crash 24/7] Uncaught Exception:', err?.message || err);
  if (!isConnected && !isConnecting) {
    setTimeout(connectToWhatsApp, 5000);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('[Anti-Crash 24/7] Unhandled Rejection:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET || 'mention_wa_secret_2026';
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

const app = express();
app.use(cors());
app.use(express.json());

let sock = null;
let currentQrDataUrl = null;
let isConnected = false;
let connectedUser = null;
let isConnecting = false;
let reconnectCount = 0;
let lastPresencePing = null;
let connectionStartTime = null;
const logger = pino({ level: 'warn' });

// Public healthcheck for Render & UptimeRobot keepalive
app.get(['/', '/health', '/ping'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'MENTION WhatsApp 24/7 Microservice',
    isConnected,
    connectedUser: isConnected ? connectedUser : null,
    uptimeSeconds: Math.floor(process.uptime()),
    reconnectCount,
    lastPresencePing,
    alwaysOn: true,
    timestamp: new Date().toISOString(),
  });
});

// Auth middleware for security on API endpoints
app.use((req, res, next) => {
  const secret = req.headers['x-service-secret'];
  if (secret !== SERVICE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: invalid service secret' });
  }
  next();
});

async function connectToWhatsApp() {
  if (isConnecting) {
    console.log('[WhatsApp 24/7] Connection attempt already in progress, waiting...');
    return;
  }
  isConnecting = true;

  try {
    // Bersihkan instance socket lama sebelum membuat yang baru
    if (sock) {
      try {
        sock.ev.removeAllListeners();
        sock.end(undefined);
      } catch {}
      sock = null;
    }

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    let version;
    try {
      const v = await fetchLatestBaileysVersion();
      version = v.version;
    } catch (err) {
      console.warn('[WhatsApp] Could not fetch latest Baileys version online, fallback to default:', err?.message);
    }

    sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      keepAliveIntervalMs: 15000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr);
        } catch (err) {
          console.error('[WhatsApp] Error generating QR code data URL:', err);
        }
      }

      if (connection === 'close') {
        isConnected = false;
        isConnecting = false;
        connectedUser = null;
        reconnectCount++;

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log('[WhatsApp 24/7] Connection closed. StatusCode:', statusCode);

        if (statusCode === DisconnectReason.loggedOut) {
          console.warn('[WhatsApp 24/7] Sesi logged out. Menghapus folder auth dan menyiapkan QR baru...');
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          currentQrDataUrl = null;
          // Segera siapkan sesi baru dan generate QR baru agar tidak mati/stuck
          setTimeout(() => connectToWhatsApp(), 3000);
        } else if (statusCode === DisconnectReason.restartRequired) {
          console.log('[WhatsApp 24/7] Restart required oleh WhatsApp server. Reconnecting segera...');
          setTimeout(() => connectToWhatsApp(), 1500);
        } else {
          // Putus sementara (network hiccup, timeout, 503, 408, 428, dll)
          console.log('[WhatsApp 24/7] Terputus sementara. Otomatis menghubungkan ulang dalam 4 detik...');
          setTimeout(() => connectToWhatsApp(), 4000);
        }
      } else if (connection === 'open') {
        isConnected = true;
        isConnecting = false;
        currentQrDataUrl = null;
        connectedUser = sock.user?.id ? sock.user.id.split(':')[0] : 'Connected';
        connectionStartTime = new Date().toISOString();
        console.log('[WhatsApp 24/7] Koneksi TERBUKA & AKTIF 24/7 untuk nomor:', connectedUser);

        // Langsung tandai presence available di WhatsApp
        try {
          await sock.sendPresenceUpdate('available');
          lastPresencePing = new Date().toISOString();
        } catch {}

        // Otomatis kirim notifikasi yang sempat tertunda (PENDING) saat WhatsApp tersambung
        triggerDispatchPending();
      }
    });
  } catch (err) {
    isConnecting = false;
    console.error('[WhatsApp 24/7] Error in connectToWhatsApp:', err?.message || err);
    // Jika gagal inisialisasi, coba lagi otomatis setelah 6 detik
    setTimeout(() => connectToWhatsApp(), 6000);
  }
}

// REST Endpoints
app.get('/status', (req, res) => {
  res.json({
    isConnected,
    qr: currentQrDataUrl,
    phoneNumber: connectedUser,
    uptimeSeconds: Math.floor(process.uptime()),
    reconnectCount,
    lastPresencePing,
    alwaysOn: true,
  });
});

app.get('/groups', async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(400).json({ error: 'WhatsApp is not connected', groups: [] });
  }

  try {
    const groupsRaw = await sock.groupFetchAllParticipating();
    const groups = Object.values(groupsRaw).map((g) => ({
      id: g.id,
      name: g.subject,
      participantsCount: g.participants ? g.participants.length : 0,
    }));
    res.json({ groups });
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Failed to fetch WhatsApp groups', groups: [] });
  }
});

app.post('/send', async (req, res) => {
  const { jid, text } = req.body;
  if (!jid || !text) {
    return res.status(400).json({ error: 'Missing jid or text parameter' });
  }

  if (!isConnected || !sock) {
    return res.status(503).json({ error: 'WhatsApp service is not currently connected' });
  }

  try {
    const sent = await sock.sendMessage(jid, { text });
    res.json({ success: true, messageId: sent.key.id });
  } catch (err) {
    console.error('Error sending WhatsApp message:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to send message' });
  }
});

app.post('/reconnect', async (req, res) => {
  if (sock) {
    try {
      sock.end(undefined);
    } catch {}
  }
  connectToWhatsApp();
  res.json({ success: true, message: 'Reconnection initiated' });
});

app.post('/disconnect', async (req, res) => {
  if (sock) {
    try {
      await sock.logout();
    } catch {}
    isConnected = false;
    connectedUser = null;
    currentQrDataUrl = null;
    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch {}
  }
  res.json({ success: true, message: 'Disconnected and session cleared' });
});

// Manual trigger endpoint for testing or immediate run
app.post('/trigger-cron', async (req, res) => {
  try {
    await triggerOverdueCron();
    res.json({ success: true, message: 'Overdue check triggered manually' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/trigger-task-reminder', async (req, res) => {
  try {
    const mode = req.query.mode || req.body?.mode || 'auto';
    await triggerTaskReminderCron(mode);
    res.json({ success: true, message: `Task reminder check (${mode}) triggered manually` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

let lastOverdueRunDay = '';
let lastMorningTaskRunDay = '';
let lastAfternoonTaskRunDay = '';

async function triggerOverdueCron() {
  try {
    const nextApiUrl = process.env.NEXT_APP_URL || 'http://localhost:3000';
    console.log('[08:00 AM Cron] Dispatching overdue reminders at', new Date().toISOString());
    const res = await fetch(`${nextApiUrl}/api/cron/overdue`, {
      method: 'POST',
      headers: {
        'x-cron-secret': SERVICE_SECRET,
        'x-service-secret': SERVICE_SECRET,
      },
    });
    const result = await res.json();
    console.log('[08:00 AM Cron] Result:', result);
  } catch (err) {
    console.warn('[08:00 AM Cron] Failed to trigger Next.js cron API:', err.message);
  }
}

async function triggerTaskReminderCron(mode = 'auto') {
  try {
    const nextApiUrl = process.env.NEXT_APP_URL || 'http://localhost:3000';
    console.log(`[Task Reminder Cron - ${mode}] Dispatching at`, new Date().toISOString());
    const res = await fetch(`${nextApiUrl}/api/cron/task-reminder?mode=${mode}`, {
      method: 'POST',
      headers: {
        'x-cron-secret': SERVICE_SECRET,
        'x-service-secret': SERVICE_SECRET,
      },
    });
    const result = await res.json();
    console.log(`[Task Reminder Cron - ${mode}] Result:`, result);
  } catch (err) {
    console.warn(`[Task Reminder Cron - ${mode}] Failed to trigger Next.js cron API:`, err.message);
  }
}

// Auto-flush all PENDING notifications from Next.js queue
async function triggerDispatchPending() {
  try {
    const nextApiUrl = process.env.NEXT_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${nextApiUrl}/api/cron/dispatch`, {
      method: 'POST',
      headers: {
        'x-cron-secret': SERVICE_SECRET,
        'x-service-secret': SERVICE_SECRET,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.dispatched?.sentCount > 0) {
        console.log(`[Auto-Dispatch] Successfully sent ${data.dispatched.sentCount} queued WhatsApp notifications.`);
      }
    }
  } catch (err) {
    // Silent catch if main web server is temporarily down
  }
}

// Check every 30 seconds for accurate schedule trigger:
// 1. 07:00 AM WIB: Pengingat tugas Hari H (semua prioritas: Low, Medium, High)
// 2. 08:00 AM WIB: Pengingat keterlambatan peminjaman barang (Overdue)
// 3. 15:00 PM (3 Sore) WIB: Pengingat tugas H-1 (Sedang & Tinggi) dan H-2 (Tinggi)
setInterval(() => {
  const now = new Date();
  
  // Ambil jam & menit dalam zona waktu Asia/Jakarta (WIB)
  let currentHour = now.getHours();
  let todayStr = now.toISOString().slice(0, 10);
  
  try {
    const wibFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false,
    });
    const parts = wibFormatter.formatToParts(now);
    const hPart = parts.find((p) => p.type === 'hour')?.value;
    const yPart = parts.find((p) => p.type === 'year')?.value;
    const moPart = parts.find((p) => p.type === 'month')?.value;
    const dPart = parts.find((p) => p.type === 'day')?.value;
    if (hPart) {
      currentHour = parseInt(hPart, 10);
      todayStr = `${yPart}-${moPart}-${dPart}`;
    }
  } catch {}

  // 1. Jam 07:00 Pagi WIB: Pengingat Hari H (H-0)
  if (currentHour === 7 && lastMorningTaskRunDay !== todayStr) {
    lastMorningTaskRunDay = todayStr;
    triggerTaskReminderCron('morning');
  }

  // 2. Jam 08:00 Pagi WIB: Overdue barang
  if (currentHour === 8 && lastOverdueRunDay !== todayStr) {
    lastOverdueRunDay = todayStr;
    triggerOverdueCron();
  }

  // 3. Jam 15:00 (3 Sore) WIB: Pengingat H-1 (Sedang/Tinggi) & H-2 (Tinggi)
  if (currentHour === 15 && lastAfternoonTaskRunDay !== todayStr) {
    lastAfternoonTaskRunDay = todayStr;
    triggerTaskReminderCron('afternoon');
  }
}, 30 * 1000);

// ====================================================================
// 24/7 SENTINEL WATCHDOG (Tiap 25 Detik)
// Menjaga socket Baileys tidak idle/dormant dan mendeteksi ghost socket
// ====================================================================
setInterval(async () => {
  if (isConnected && sock) {
    try {
      await sock.sendPresenceUpdate('available');
      lastPresencePing = new Date().toISOString();
    } catch (err) {
      console.warn('[Watchdog 24/7] Presence update gagal (socket hang/silent drop). Melakukan reconnect paksa...', err?.message);
      isConnected = false;
      connectToWhatsApp();
    }
  } else if (!isConnected && !isConnecting) {
    console.log('[Watchdog 24/7] WhatsApp terdeteksi belum terhubung. Menjalankan auto-reconnect...');
    connectToWhatsApp();
  }
}, 25 * 1000);

// Auto-flush pending notifications every 2 minutes while connected
setInterval(() => {
  if (isConnected) {
    triggerDispatchPending();
  }
}, 2 * 60 * 1000);

// ====================================================================
// ANTI-SLEEP MULTI-TARGET KEEP-ALIVE (Tiap 150 Detik / 2.5 Menit)
// Render Free Tier sleep setelah 15 menit jika tanpa request luar.
// Microservice secara agresif mem-ping endpoint publik dirinya sendiri.
// ====================================================================
const pingTargets = [
  process.env.RENDER_EXTERNAL_URL,
  process.env.SELF_URL,
  'https://mention-inventaris.onrender.com',
].filter(Boolean);

const uniquePingTargets = [...new Set(pingTargets)];

setInterval(async () => {
  for (const targetUrl of uniquePingTargets) {
    try {
      const pingUrl = `${targetUrl.replace(/\/$/, '')}/health`;
      const res = await fetch(pingUrl, {
        headers: { 'User-Agent': 'Mention-WhatsApp-247-KeepAlive/2.0' },
      });
      console.log(`[Keep-Alive 24/7] Pinged ${pingUrl} -> Status: ${res.status}`);
    } catch (err) {
      console.warn(`[Keep-Alive 24/7] Ping failed to ${targetUrl}:`, err?.message);
    }
  }
}, 150 * 1000); // 2.5 minutes interval

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`MENTION WhatsApp 24/7 Always-On Service running on port ${PORT}`);
  console.log(`Anti-Sleep Keep-Alive Targets:`, uniquePingTargets);
  console.log(`=======================================================`);
  connectToWhatsApp();
});
