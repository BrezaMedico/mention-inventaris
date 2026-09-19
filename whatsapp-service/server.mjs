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

let lastOverdueRunDay = '';

async function triggerOverdueCron() {
  try {
    const nextApiUrl = process.env.NEXT_APP_URL || 'http://localhost:3000';
    console.log('[08:00 AM Cron] Dispatching overdue reminders at', new Date().toISOString());
    const res = await fetch(`${nextApiUrl}/api/cron/overdue`, {
      method: 'POST',
      headers: { 'x-cron-secret': SERVICE_SECRET },
    });
    const result = await res.json();
    console.log('[08:00 AM Cron] Result:', result);
  } catch (err) {
    console.warn('[08:00 AM Cron] Failed to trigger Next.js cron API:', err.message);
  }
}

// Check every 60 seconds: Triggers at 08:00 AM daily for overdue items (and weekly recurrence)
setInterval(() => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const todayStr = now.toISOString().slice(0, 10);

  // Exact 08:00 AM trigger once per calendar day
  if (currentHour === 8 && currentMinute === 0 && lastOverdueRunDay !== todayStr) {
    lastOverdueRunDay = todayStr;
    triggerOverdueCron();
  }
}, 60 * 1000);

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

app.listen(PORT, () => {
  console.log(`MENTION WhatsApp 24/7 Microservice running on http://localhost:${PORT}`);
  connectToWhatsApp();
});
