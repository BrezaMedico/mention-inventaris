import { WhatsAppConfig, WhatsAppGroup, NotificationEvent } from '@/types';
import {
  getWhatsAppConfig,
  updateWhatsAppConfig,
  getNotificationEvents,
  markNotificationSent,
  markNotificationFailed,
} from '@/lib/db';

export interface WhatsAppStatus {
  isConnected: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'PAIRING' | 'SERVICE_OFFLINE';
  qr?: string;
  phoneNumber?: string;
  targetGroupJid?: string;
  targetGroupName?: string;
  message?: string;
}

export interface IWhatsAppProvider {
  getStatus(): Promise<WhatsAppStatus>;
  getGroups(): Promise<WhatsAppGroup[]>;
  sendMessage(toJid: string, text: string): Promise<{ success: boolean; error?: string }>;
  reconnect(): Promise<{ success: boolean; message: string }>;
  disconnect(): Promise<{ success: boolean; message: string }>;
}

class MicroserviceWhatsAppProvider implements IWhatsAppProvider {
  private baseUrl: string;
  private secret: string;

  constructor() {
    this.baseUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
    this.secret = process.env.WHATSAPP_SERVICE_SECRET || 'mention_wa_secret_2026';
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-service-secret': this.secret,
          ...(options.headers || {}),
        },
      });
      clearTimeout(id);
      return res;
    } catch (err: any) {
      clearTimeout(id);
      throw err;
    }
  }

  async getStatus(): Promise<WhatsAppStatus> {
    const config = await getWhatsAppConfig();

    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/status`);
      if (res.ok) {
        const data = await res.json();
        // Sync connected status with db
        if (config.is_connected !== data.isConnected) {
          await updateWhatsAppConfig({ is_connected: data.isConnected, phone_number: data.phoneNumber });
        }
        return {
          isConnected: data.isConnected,
          status: data.isConnected ? 'CONNECTED' : data.qr ? 'PAIRING' : 'DISCONNECTED',
          qr: data.qr,
          phoneNumber: data.phoneNumber,
          targetGroupJid: config.target_group_jid,
          targetGroupName: config.target_group_name,
        };
      }
    } catch (err) {
      // Service offline or not reachable
    }

    return {
      isConnected: false,
      status: 'SERVICE_OFFLINE',
      targetGroupJid: config.target_group_jid,
      targetGroupName: config.target_group_name,
      message: 'WhatsApp Microservice belum aktif di port 3001. Jalankan `npm run start:wa` di folder whatsapp-service.',
    };
  }

  async getGroups(): Promise<WhatsAppGroup[]> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/groups`);
      if (res.ok) {
        const data = await res.json();
        return data.groups || [];
      }
    } catch {}
    return [];
  }

  async sendMessage(toJid: string, text: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/send`, {
        method: 'POST',
        body: JSON.stringify({ jid: toJid, text }),
      });
      const data = await res.json();
      return { success: data.success, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal menghubungi WhatsApp service' };
    }
  }

  async reconnect(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/reconnect`, { method: 'POST' });
      const data = await res.json();
      return { success: data.success, message: data.message || 'Mencoba menghubungkan kembali...' };
    } catch (err: any) {
      return { success: false, message: 'WhatsApp service tidak dapat dihubungi.' };
    }
  }

  async disconnect(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/disconnect`, { method: 'POST' });
      const data = await res.json();
      await updateWhatsAppConfig({ is_connected: false });
      return { success: data.success, message: data.message || 'Berhasil memutuskan koneksi.' };
    } catch (err: any) {
      return { success: false, message: 'WhatsApp service tidak dapat dihubungi.' };
    }
  }
}

export const whatsAppProvider: IWhatsAppProvider = new MicroserviceWhatsAppProvider();

// Dispatch pending notification events to WhatsApp target group
export async function dispatchPendingNotifications(): Promise<{ sentCount: number; failedCount: number }> {
  const config = await getWhatsAppConfig();
  if (!config.target_group_jid) {
    return { sentCount: 0, failedCount: 0 };
  }

  const status = await whatsAppProvider.getStatus();
  if (!status.isConnected) {
    return { sentCount: 0, failedCount: 0 };
  }

  const pendingEvents = (await getNotificationEvents(20)).filter((e) => e.status === 'PENDING');
  let sentCount = 0;
  let failedCount = 0;

  for (const event of pendingEvents) {
    const res = await whatsAppProvider.sendMessage(config.target_group_jid, event.message);
    if (res.success) {
      await markNotificationSent(event.id);
      sentCount++;
    } else {
      await markNotificationFailed(event.id, res.error || 'Pengiriman gagal');
      failedCount++;
    }
  }

  return { sentCount, failedCount };
}
