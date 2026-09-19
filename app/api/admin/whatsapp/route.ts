import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import { whatsAppProvider, dispatchPendingNotifications } from '@/lib/whatsapp/provider';
import { getWhatsAppConfig, updateWhatsAppConfig, getNotificationEvents } from '@/lib/db';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [status, groups, config, logs] = await Promise.all([
      whatsAppProvider.getStatus(),
      whatsAppProvider.getGroups(),
      getWhatsAppConfig(),
      getNotificationEvents(30),
    ]);

    return NextResponse.json({
      success: true,
      status,
      groups,
      config,
      logs,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'set_target_group') {
      const { jid, name } = body;
      const updated = await updateWhatsAppConfig({
        target_group_jid: jid,
        target_group_name: name,
      });
      return NextResponse.json({ success: true, config: updated });
    }

    if (action === 'reconnect') {
      const res = await whatsAppProvider.reconnect();
      return NextResponse.json(res);
    }

    if (action === 'disconnect') {
      const res = await whatsAppProvider.disconnect();
      return NextResponse.json(res);
    }

    if (action === 'test_message') {
      const config = await getWhatsAppConfig();
      if (!config.target_group_jid) {
        return NextResponse.json(
          { success: false, error: 'Target WhatsApp Group belum dipilih dan disimpan.' },
          { status: 400 }
        );
      }

      const testMsg = `[MENTION TEST NOTIFIKASI]\n\nSistem peminjaman dan pengembalian barang MENTION berhasil terhubung dengan WhatsApp Group ini.\n\nWaktu: ${new Date().toLocaleString('id-ID')}\nStatus: Berhasil`;

      const res = await whatsAppProvider.sendMessage(config.target_group_jid, testMsg);
      if (!res.success) {
        return NextResponse.json(
          { success: false, error: res.error || 'Gagal mengirim pesan test. Pastikan WhatsApp terhubung.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, message: 'Pesan test berhasil dikirim ke WhatsApp Group.' });
    }

    if (action === 'dispatch_queue') {
      const result = await dispatchPendingNotifications();
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenal.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
