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
  Radio,
  Terminal,
  Clock,
  ShieldCheck,
  Zap,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function AdminWhatsAppPage() {
  const [statusData, setStatusData] = useState<WhatsAppStatus | null>(null);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedGroupJid, setSelectedGroupJid] = useState('');
  const [logs, setLogs] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const toggleExpandLog = (id: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds || seconds <= 0) return 'Baru dimulai / Memuat';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h} jam ${m} mnt`;
    if (m > 0) return `${m} mnt ${s} dtk`;
    return `${s} dtk`;
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleCopyHealthUrl = () => {
    const healthUrl = `${statusData?.serviceUrl || 'https://mention-inventaris.onrender.com'}/health`;
    navigator.clipboard.writeText(healthUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handlePingKeepAlive = async () => {
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await fetch('/api/cron/keepalive');
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Keep-Alive Berhasil! Respon diterima: Uptime ${formatUptime(data.health?.uptimeSeconds)}, Microservice Aktif 24/7.`,
        });
        loadWhatsAppInfo();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Keep-alive ping gagal dihubungi.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Gagal mengirim sinyal keep-alive ke microservice.' });
    } finally {
      setActionLoading(false);
    }
  };

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

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'TASK_REMINDER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            PENGINGAT TUGAS
          </span>
        );
      case 'BORROW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            PEMINJAMAN
          </span>
        );
      case 'RETURN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
            PENGEMBALIAN
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
            KETERLAMBATAN
          </span>
        );
      case 'TEST':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            TEST BOT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
            {type}
          </span>
        );
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
            TERKIRIM
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            ANTRIAN
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            GAGAL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-800">
            {status}
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] sm:text-xs font-bold text-mention-yellow uppercase tracking-wider mb-1">
              Automasi &amp; Notifikasi
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              Integrasi WhatsApp Group
            </h1>
          </div>

          <button
            onClick={loadWhatsAppInfo}
            disabled={loading}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white shrink-0 active:scale-95 transition-transform"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border text-xs font-semibold flex items-start sm:items-center justify-between gap-3 ${
              feedback.type === 'success'
                ? 'bg-green-950/60 border-green-800 text-green-300'
                : 'bg-red-950/60 border-red-800 text-red-300'
            }`}
          >
            <div className="flex items-start sm:items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <span className="leading-relaxed">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100 p-1 shrink-0">
              ✕
            </button>
          </div>
        )}

        {/* 24/7 Always-On Sentinel Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 lg:p-7 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 border-b border-neutral-800 pb-4 sm:pb-5 mb-4 sm:mb-5">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    WhatsApp 24/7 Always-On
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-green-950 text-green-400 border border-green-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                    Always-On Active
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                  Sesi WhatsApp dijaga aktif 24 jam nonstop tanpa perlu scan ulang berkala.
                </p>
              </div>
            </div>

            <button
              onClick={handlePingKeepAlive}
              disabled={actionLoading}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-neutral-700 active:scale-[0.98]"
              title="Kirim sinyal keep-alive ke microservice"
            >
              <Zap className="w-3.5 h-3.5 text-mention-yellow" />
              <span>Tes Ping Keep-Alive</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="p-3 sm:p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <div className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Uptime Service</div>
              <div className="text-xs sm:text-sm font-extrabold text-white mt-1 break-words">
                {formatUptime(statusData?.uptimeSeconds)}
              </div>
              <div className="text-[10px] text-green-400 mt-0.5 font-medium">Aktif berjalan</div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <div className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Watchdog Presence</div>
              <div className="text-xs sm:text-sm font-extrabold text-white mt-1">Tiap 25 Detik</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Auto-ping presence</div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <div className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Anti-Sleep Keep-Alive</div>
              <div className="text-xs sm:text-sm font-extrabold text-white mt-1">Tiap 2.5 Menit</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Cegah container tidur</div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <div className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Target Endpoint</div>
              <div className="text-[11px] sm:text-xs font-mono text-neutral-200 mt-1 truncate" title={statusData?.serviceUrl}>
                {statusData?.serviceUrl ? (statusData.serviceUrl.replace(/^https?:\/\//, '')) : 'localhost:3001'}
              </div>
              <button
                onClick={handleCopyHealthUrl}
                className="text-[10px] text-mention-yellow hover:underline mt-1 flex items-center gap-1 font-medium"
              >
                <Copy className="w-2.5 h-2.5" />
                <span>{copiedUrl ? 'Tersalin!' : 'Salin URL Health'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Top Section: Connection Status & QR Code */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Status Details */}
          <div className="lg:col-span-2 bg-white text-black rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-neutral-200 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3.5 mb-4 sm:mb-5 gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-black flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-black shrink-0" />
                  <span>Status WhatsApp Web</span>
                </h2>

                <span
                  className={`self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                    statusData?.isConnected
                      ? 'bg-green-100 text-green-800'
                      : statusData?.status === 'PAIRING'
                      ? 'bg-blue-100 text-blue-800'
                      : statusData?.status === 'SERVICE_OFFLINE'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse shrink-0" />
                  <span>
                    {statusData?.isConnected
                      ? 'CONNECTED'
                      : statusData?.status === 'PAIRING'
                      ? 'MENUNGGU SCAN QR'
                      : statusData?.status === 'SERVICE_OFFLINE'
                      ? 'SERVICE OFFLINE'
                      : 'DISCONNECTED'}
                  </span>
                </span>
              </div>

              {/* Status details */}
              <div className="space-y-3 text-xs">
                {statusData?.isConnected ? (
                  <div className="p-3.5 sm:p-4 rounded-xl bg-green-50 border border-green-200 text-green-900 space-y-2">
                    <div className="font-bold text-sm text-green-950 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      <span>WhatsApp Berhasil Terhubung!</span>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                        <span className="text-neutral-500 font-medium">Akun Bot:</span>
                        <strong className="text-black font-semibold">{statusData.phoneNumber || 'Terkoneksi'}</strong>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                        <span className="text-neutral-500 font-medium">Target Grup:</span>
                        <strong className="text-black font-semibold">
                          {statusData.targetGroupName || 'Belum dipilih'}
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : statusData?.status === 'SERVICE_OFFLINE' ? (
                  <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                    <div className="font-bold text-sm flex items-center gap-2 text-amber-950">
                      <Terminal className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Layanan WhatsApp Microservice Belum Berjalan</span>
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
                  <div className="p-3.5 sm:p-4 rounded-xl bg-neutral-100 text-neutral-700 leading-relaxed">
                    WhatsApp belum terhubung. Silakan scan QR code di samping menggunakan WhatsApp pada ponsel Anda (Perangkat Tertaut / Linked Devices).
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <button
                onClick={handleReconnect}
                disabled={actionLoading}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[42px] rounded-xl bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5 disabled:bg-neutral-300 active:scale-[0.98]"
              >
                <Link2 className="w-4 h-4 shrink-0" />
                <span>Hubungkan / Reconnect</span>
              </button>

              {statusData?.isConnected && (
                <button
                  onClick={handleDisconnect}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[42px] rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <Unlink className="w-4 h-4 shrink-0" />
                  <span>Putuskan Koneksi</span>
                </button>
              )}
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-white text-black rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-neutral-200 flex flex-col items-center justify-center text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-black shrink-0" />
              <span>QR Code Pairing</span>
            </div>

            {statusData?.qr ? (
              <div className="p-3 bg-white border-2 border-black rounded-2xl shadow-md inline-block max-w-[240px] sm:max-w-none">
                <img
                  src={statusData.qr}
                  alt="WhatsApp Pairing QR Code"
                  className="w-44 h-44 sm:w-56 sm:h-56 object-contain mx-auto"
                />
                <p className="text-[10px] text-neutral-500 font-mono mt-2 text-center">
                  Scan via Perangkat Tertaut di WhatsApp
                </p>
              </div>
            ) : statusData?.isConnected ? (
              <div className="py-8 sm:py-12 flex flex-col items-center justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <div className="font-bold text-sm text-black">Sudah Terhubung</div>
                <div className="text-xs text-neutral-500 mt-1">Sesi tersimpan secara persisten 24/7.</div>
              </div>
            ) : (
              <div className="py-8 sm:py-12 text-neutral-400 text-xs flex flex-col items-center justify-center">
                <QrCode className="w-12 h-12 text-neutral-300 mb-2" />
                <span>QR Code akan muncul saat service menghubungkan ke WhatsApp Web.</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle Section: Target Group Selection & Test Message */}
        <div className="bg-white text-black rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-neutral-200">
          <div className="border-b border-neutral-200 pb-3.5 mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-black">Target WhatsApp Group Organisasi</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Pilih group tujuan dari daftar group yang diakses oleh akun bot WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end">
            <div className="md:col-span-2">
              <label className="block uppercase font-bold text-[10px] text-neutral-700 mb-2">
                Pilih Group Tujuan Notifikasi:
              </label>

              {groups.length > 0 ? (
                <select
                  value={selectedGroupJid}
                  onChange={(e) => setSelectedGroupJid(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-300 bg-white text-black font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-black focus:outline-none"
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
                  placeholder="ID / JID Group (contoh: 1203630...@g.us) atau hubungkan WhatsApp"
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-300 bg-white text-black font-medium text-xs sm:text-sm focus:ring-2 focus:ring-black focus:outline-none"
                />
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleSaveTargetGroup}
                disabled={!selectedGroupJid || actionLoading}
                className="w-full sm:flex-1 h-11 min-h-[44px] rounded-xl bg-mention-yellow text-black font-extrabold text-xs uppercase tracking-wider hover:bg-mention-yellowDark transition-colors shadow-md flex items-center justify-center gap-1.5 disabled:bg-neutral-200 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <span>Simpan Target Group</span>
              </button>

              <button
                onClick={handleSendTestMessage}
                disabled={!statusData?.isConnected || actionLoading}
                className="w-full sm:w-auto px-5 h-11 min-h-[44px] rounded-xl bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-md flex items-center justify-center gap-1.5 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed active:scale-[0.98]"
                title="Kirim pesan test ke group yang tersimpan"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Test Kirim</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Notification Queue & Logs */}
        <div className="bg-white text-black rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-neutral-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-4 mb-5 gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-black">Log &amp; Antrian Notifikasi WhatsApp</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Semua notifikasi peminjaman, pengembalian, dan pengingat tugas tersimpan di database.
              </p>
            </div>

            <button
              onClick={handleDispatchQueue}
              disabled={actionLoading || !statusData?.isConnected}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[40px] rounded-xl bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 active:scale-[0.98] shrink-0"
            >
              Proses Antrian Sekarang
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="py-8 text-center text-neutral-500 text-xs">
              Belum ada aktivitas pengiriman notifikasi.
            </div>
          ) : (
            <div>
              {/* MOBILE VIEW (Card Layout - Super readable on phones) */}
              <div className="block md:hidden space-y-3">
                {logs.map((log) => {
                  const isExpanded = !!expandedLogIds[log.id];
                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/70 hover:bg-neutral-50 transition-colors space-y-2.5"
                    >
                      {/* Card Header: Type Badge & Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div>{renderTypeBadge(log.type)}</div>
                        <div>{renderStatusBadge(log.status)}</div>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono">
                        <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>

                      {/* WhatsApp Message Preview */}
                      <div className="p-2.5 rounded-lg bg-white border border-neutral-200/80 text-xs text-neutral-800 font-sans shadow-2xs">
                        <p
                          className={`whitespace-pre-line leading-relaxed ${
                            isExpanded ? '' : 'line-clamp-3'
                          }`}
                        >
                          {log.message}
                        </p>
                        {log.message && log.message.length > 120 && (
                          <button
                            onClick={() => toggleExpandLog(log.id)}
                            className="mt-2 text-[11px] font-bold text-neutral-600 hover:text-black flex items-center gap-1 pt-1 border-t border-neutral-100 w-full"
                          >
                            <span>{isExpanded ? 'Sembunyikan pesan' : 'Baca selengkapnya'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW (Table Layout - for tablet & desktop) */}
              <div className="hidden md:block overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3 w-36">Tipe</th>
                      <th className="py-3 px-3">Pesan WhatsApp</th>
                      <th className="py-3 px-3 w-28">Status</th>
                      <th className="py-3 px-3 w-40">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-[11px]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3 px-3 font-sans align-top">
                          {renderTypeBadge(log.type)}
                        </td>
                        <td className="py-3 px-3 font-sans max-w-md align-top">
                          <p className="line-clamp-2 text-neutral-800 whitespace-pre-line text-xs font-medium">
                            {log.message}
                          </p>
                        </td>
                        <td className="py-3 px-3 font-sans align-top">
                          {renderStatusBadge(log.status)}
                        </td>
                        <td className="py-3 px-3 text-neutral-500 align-top font-mono">
                          {formatDateTime(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

