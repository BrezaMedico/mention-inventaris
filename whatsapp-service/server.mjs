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
} from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET || 'mention_wa_secret_2026';
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

const app = express();
app.use(cors());
app.use(express.json());

// Public healthcheck for Render & UptimeRobot keepalive
app.get(['/', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'MENTION WhatsApp Microservice',
    isConnected,
    uptimeSeconds: Math.floor(process.uptime()),
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

let sock = null;
let currentQrDataUrl = null;
let isConnected = false;
let connectedUser = null;
const logger = pino({ level: 'warn' });

async function connectToWhatsApp() {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      browser: ['MENTION System', 'Chrome', '1.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr);
        } catch (err) {
          console.error('Error generating QR code data URL:', err);
        }
      }

      if (connection === 'close') {
        isConnected = false;
        connectedUser = null;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log('WhatsApp connection closed, statusCode:', statusCode, 'reconnecting:', shouldReconnect);

        if (shouldReconnect) {
          setTimeout(connectToWhatsApp, 5000);
        } else {
          // Logged out, clear auth
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          currentQrDataUrl = null;
        }
      } else if (connection === 'open') {
        isConnected = true;
        currentQrDataUrl = null;
        connectedUser = sock.user?.id ? sock.user.id.split(':')[0] : 'Connected';
        console.log('WhatsApp connection opened successfully for user:', connectedUser);
        // Otomatis kirim notifikasi yang sempat tertunda (PENDING) saat WhatsApp tersambung
        triggerDispatchPending();
      }
    });
  } catch (err) {
    console.error('Error in connectToWhatsApp:', err);
  }
}

// REST Endpoints
app.get('/status', (req, res) => {
  res.json({
    isConnected,
    qr: currentQrDataUrl,
    phoneNumber: connectedUser,
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

// 24/7 Keep-Alive Heartbeat: Pings presence every 30 seconds so socket stays awake
setInterval(async () => {
  if (isConnected && sock) {
    try {
      await sock.sendPresenceUpdate('available');
    } catch (err) {
      // Socket ping error handled silently
    }
  }
}, 30 * 1000);

// Auto-flush pending notifications every 2 minutes while connected
setInterval(() => {
  if (isConnected) {
    triggerDispatchPending();
  }
}, 2 * 60 * 1000);

// Anti-Sleep Self-Ping for Render: Render provides RENDER_EXTERNAL_URL automatically
const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL;
if (externalUrl) {
  console.log(`[Anti-Sleep] Self-ping active targeting external URL: ${externalUrl}`);
  setInterval(async () => {
    try {
      const pingUrl = `${externalUrl.replace(/\/$/, '')}/health`;
      const res = await fetch(pingUrl);
      console.log(`[Anti-Sleep] Pinged ${pingUrl} - Status: ${res.status}`);
    } catch (err) {
      console.warn(`[Anti-Sleep] Self-ping failed:`, err.message);
    }
  }, 10 * 60 * 1000); // Set to 10 minutes (Render sleeps after 15 minutes of inactivity)
}

app.listen(PORT, () => {
  console.log(`MENTION WhatsApp 24/7 Microservice running on http://localhost:${PORT}`);
  connectToWhatsApp();
});

