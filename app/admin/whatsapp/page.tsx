'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { WhatsAppGroup, NotificationEvent } from '@/types';
import { WhatsAppStatus } from '@/lib/whatsapp/provider';
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Link2,
  Unlink,
  Loader2,
  Radio,
  Terminal,
  Clock,
} from 'lucide-react';

export default function AdminWhatsAppPage() {
  const [statusData, setStatusData] = useState<WhatsAppStatus | null>(null);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedGroupJid, setSelectedGroupJid] = useState('');
  const [logs, setLogs] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadWhatsAppInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/whatsapp');
      if (res.status === 401) {
        window.location.href = '/admin/login?from=/admin/whatsapp';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setStatusData(data.status);
        setGroups(data.groups || []);
        setLogs(data.logs || []);
        if (data.config?.target_group_jid) {
          setSelectedGroupJid(data.config.target_group_jid);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWhatsAppInfo();
    const interval = setInterval(loadWhatsAppInfo, 10000); // Auto-refresh status every 10s
    return () => clearInterval(interval);
  }, []);

  const handleSaveTargetGroup = async () => {
    if (!selectedGroupJid) return;
    const targetGroup = groups.find((g) => g.id === selectedGroupJid);
    const targetName = targetGroup ? targetGroup.name : 'WhatsApp Group';

    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_target_group',
          jid: selectedGroupJid,
          name: targetName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Target Group "${targetName}" berhasil disimpan.` });
        loadWhatsAppInfo();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Gagal menyimpan target group.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan koneksi.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTestMessage = async () => {
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_message' }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message || 'Pesan test berhasil dikirim ke WhatsApp Group!' });
        loadWhatsAppInfo();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Gagal mengirim pesan test.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan saat pengiriman pesan test.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconnect = async () => {
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconnect' }),
      });
      const data = await res.json();
      setFeedback({ type: 'success', message: data.message || 'Mencoba koneksi ulang...' });
      setTimeout(loadWhatsAppInfo, 2000);
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menghubungi WhatsApp service.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      const data = await res.json();
      setFeedback({ type: 'success', message: data.message || 'Koneksi WhatsApp diputuskan.' });
      loadWhatsAppInfo();
    } catch {
      setFeedback({ type: 'error', message: 'Gagal memutuskan koneksi WhatsApp.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatchQueue = async () => {
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch_queue' }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Berhasil memproses antrian. Terkirim: ${data.result.sentCount}, Gagal: ${data.result.failedCount}`,
        });
        loadWhatsAppInfo();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Gagal memproses antrian notifikasi.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-mention-yellow uppercase tracking-wider mb-1">
              Automasi & Notifikasi
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Integrasi WhatsApp Group</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadWhatsAppInfo}
              disabled={loading}
              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-green-950/60 border-green-800 text-green-300'
                : 'bg-red-950/60 border-red-800 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Top Section: Connection Status & QR Code (Card in White) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Details */}
          <div className="lg:col-span-2 bg-white text-black rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-5">
                <h2 className="text-xl font-bold text-black flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-black" />
                  Status Koneksi WhatsApp Web
                </h2>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    statusData?.isConnected
                      ? 'bg-green-100 text-green-800'
                      : statusData?.status === 'PAIRING'
                      ? 'bg-blue-100 text-blue-800'
                      : statusData?.status === 'SERVICE_OFFLINE'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  {statusData?.isConnected
                    ? 'CONNECTED'
                    : statusData?.status === 'PAIRING'
                    ? 'MENUNGGU SCAN QR'
                    : statusData?.status === 'SERVICE_OFFLINE'
                    ? 'MICROSERVICE OFFLINE'
                    : 'DISCONNECTED'}
                </span>
              </div>

              {/* Status details */}
              <div className="space-y-3 text-xs">
                {statusData?.isConnected ? (
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-900 space-y-1">
                    <div className="font-bold text-sm">WhatsApp Berhasil Terhubung!</div>
                    <div>Akun Bot: <strong>{statusData.phoneNumber || 'Terkoneksi'}</strong></div>
                    <div>
                      Target Grup Saat Ini:{' '}
                      <strong>{statusData.targetGroupName || 'Belum dipilih'}</strong>
                    </div>
                  </div>
                ) : statusData?.status === 'SERVICE_OFFLINE' ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                    <div className="font-bold text-sm flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-amber-700" />
                      Layanan WhatsApp Microservice Belum Berjalan
                    </div>
                    <p className="text-xs leading-relaxed text-amber-800">
                      Untuk menghubungkan WhatsApp asli secara persisten, buka terminal baru dan jalankan:
                    </p>
                    <pre className="p-2.5 bg-black text-mention-yellow rounded-lg font-mono text-xs overflow-x-auto">
                      npm run start:wa
                    </pre>
                    <p className="text-[11px] text-amber-700">
                      Setelah service aktif pada port 3001, refresh halaman ini untuk scan QR code pairing.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-neutral-100 text-neutral-700">
                    WhatsApp belum terhubung. Silakan scan QR code di samping menggunakan WhatsApp pada ponsel Anda (Perangkat Tertaut / Linked Devices).
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 pt-5 border-t border-neutral-200 flex flex-wrap items-center gap-3">
              <button
                onClick={handleReconnect}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors flex items-center gap-1.5 disabled:bg-neutral-300"
              >
                <Link2 className="w-4 h-4" />
                <span>Hubungkan / Reconnect</span>
              </button>

              {statusData?.isConnected && (
                <button
                  onClick={handleDisconnect}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                >
                  <Unlink className="w-4 h-4" />
                  <span>Putuskan Koneksi</span>
                </button>
              )}
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-white text-black rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-200 flex flex-col items-center justify-center text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-black" />
              <span>QR Code Pairing</span>
            </div>

            {statusData?.qr ? (
              <div className="p-3 bg-white border-2 border-black rounded-2xl shadow-md">
                <img
                  src={statusData.qr}
                  alt="WhatsApp Pairing QR Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
                <p className="text-[10px] text-neutral-500 font-mono mt-2 text-center">
                  Scan via Linked Devices di WhatsApp
                </p>
              </div>
            ) : statusData?.isConnected ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="font-bold text-sm text-black">Sudah Terhubung</div>
                <div className="text-xs text-neutral-400 mt-1">Sesi tersimpan secara persisten.</div>
              </div>
            ) : (
              <div className="py-12 text-neutral-400 text-xs flex flex-col items-center justify-center">
                <QrCode className="w-12 h-12 text-neutral-300 mb-2" />
                <span>QR Code akan muncul saat service menghubungkan ke WhatsApp Web.</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle Section: Target Group Selection & Test Message (Card in White) */}
        <div className="bg-white text-black rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-200">
          <div className="border-b border-neutral-200 pb-4 mb-6">
            <h2 className="text-xl font-bold text-black">Target WhatsApp Group Organisasi</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Pilih group tujuan dari daftar group yang diakses oleh akun bot WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="md:col-span-2">
              <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-2">
                Pilih Group Tujuan Notifikasi:
              </label>

              {groups.length > 0 ? (
                <select
                  value={selectedGroupJid}
                  onChange={(e) => setSelectedGroupJid(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-300 bg-white text-black font-semibold text-sm focus:ring-2 focus:ring-black focus:outline-none"
                >
                  <option value="">-- Pilih Salah Satu Group --</option>
                  {groups.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name} ({grp.participantsCount} anggota)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedGroupJid}
                  onChange={(e) => setSelectedGroupJid(e.target.value)}
                  placeholder="ID / JID Group (contoh: 1203630...@g.us) atau hubungkan WhatsApp untuk auto-list"
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-300 bg-white text-black font-medium text-sm focus:ring-2 focus:ring-black focus:outline-none"
                />
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveTargetGroup}
                disabled={!selectedGroupJid || actionLoading}
                className="flex-1 h-11 rounded-xl bg-mention-yellow text-black font-extrabold text-xs uppercase tracking-wider hover:bg-mention-yellowDark transition-colors shadow-md flex items-center justify-center gap-1.5 disabled:bg-neutral-200 disabled:cursor-not-allowed"
              >
                <span>Simpan Target Group</span>
              </button>

              <button
                onClick={handleSendTestMessage}
                disabled={!statusData?.isConnected || actionLoading}
                className="px-4 h-11 rounded-xl bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-md flex items-center justify-center gap-1.5 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
                title="Kirim pesan test ke group yang tersimpan"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Test</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Notification Queue & Logs (Card in White) */}
        <div className="bg-white text-black rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-4 mb-6 gap-2">
            <div>
              <h2 className="text-xl font-bold text-black">Log & Antrian Notifikasi WhatsApp</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Semua notifikasi peminjaman, pengembalian, dan reminder tersimpan di database.
              </p>
            </div>

            <button
              onClick={handleDispatchQueue}
              disabled={actionLoading || !statusData?.isConnected}
              className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors self-start sm:self-auto disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              Proses Antrian Sekarang
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="py-8 text-center text-neutral-500 text-xs">
              Belum ada aktivitas pengiriman notifikasi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Tipe</th>
                    <th className="py-3 px-3">Pesan WhatsApp</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.type === 'BORROW'
                              ? 'bg-blue-100 text-blue-800'
                              : log.type === 'RETURN'
                              ? 'bg-green-100 text-green-800'
                              : log.type === 'OVERDUE'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-neutral-100 text-neutral-800'
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans max-w-md">
                        <p className="line-clamp-2 text-neutral-800 whitespace-pre-line text-xs font-medium">
                          {log.message}
                        </p>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'SENT'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-500">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
