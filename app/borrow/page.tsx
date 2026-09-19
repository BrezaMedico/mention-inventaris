'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Generation,
  Member,
  Item,
  Checker,
  InitialCondition,
} from '@/types';
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  User,
  Package,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
} from 'lucide-react';

interface SelectedItemState {
  item: Item;
  checkedAccessories: string[];
  condition: InitialCondition;
  notes: string;
}

export default function BorrowPage() {
  const router = useRouter();

  // Data
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [checkers, setCheckers] = useState<Omit<Checker, 'pin_hash'>[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Selections
  const [selectedGenId, setSelectedGenId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [customMemberName, setCustomMemberName] = useState('');
  const [borrowDate, setBorrowDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedReturnDate, setExpectedReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [selectedCheckerId, setSelectedCheckerId] = useState('');
  const [loanNotes, setLoanNotes] = useState('');

  // Selected Items
  const [selectedItems, setSelectedItems] = useState<SelectedItemState[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [showItemPickerModal, setShowItemPickerModal] = useState(false);

  // Flow: FORM -> VERIFY_PIN -> INSPECTION
  const [step, setStep] = useState<'FORM' | 'VERIFY_PIN' | 'INSPECTION'>('FORM');
  const [pinInput, setPinInput] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pinVerifiedCheckerName, setPinVerifiedCheckerName] = useState('');
  const [submittingLoan, setSubmittingLoan] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoadingInitial(true);
        const [genRes, itemsRes, checkersRes] = await Promise.all([
          fetch('/api/generations'),
          fetch('/api/items?status=AVAILABLE'),
          fetch('/api/checkers'),
        ]);

        const [genData, itemsData, checkersData] = await Promise.all([
          genRes.json(),
          itemsRes.json(),
          checkersRes.json(),
        ]);

        if (genData.success) setGenerations(genData.data);
        if (itemsData.success) setAvailableItems(itemsData.data);
        if (checkersData.success) setCheckers(checkersData.data);
      } catch {
        setErrorMessage('Gagal memuat data awal.');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedGenId) {
      setMembers([]);
      setSelectedMemberId('');
      return;
    }

    async function loadMembers() {
      try {
        const res = await fetch(`/api/members?generationId=${selectedGenId}`);
        const data = await res.json();
        if (data.success) {
          setMembers(data.data);
          setSelectedMemberId('');
        }
      } catch {
        setErrorMessage('Gagal memuat daftar anggota.');
      }
    }
    loadMembers();
  }, [selectedGenId]);

  const handleAddItem = (item: Item) => {
    if (selectedItems.some((si) => si.item.id === item.id)) return;
    const initialAcc = (item.accessories || []).map((a) => a.name);

    setSelectedItems((prev) => [
      ...prev,
      { item, checkedAccessories: initialAcc, condition: 'Aman', notes: '' },
    ]);
    setShowItemPickerModal(false);
    setItemSearchQuery('');
    setErrorMessage('');
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((si) => si.item.id !== itemId));
  };

  const handleToggleAccessory = (itemId: string, accName: string) => {
    setSelectedItems((prev) =>
      prev.map((si) => {
        if (si.item.id !== itemId) return si;
        const exists = si.checkedAccessories.includes(accName);
        return {
          ...si,
          checkedAccessories: exists
            ? si.checkedAccessories.filter((n) => n !== accName)
            : [...si.checkedAccessories, accName],
        };
      })
    );
  };

  const handleSetCondition = (itemId: string, condition: InitialCondition) => {
    setSelectedItems((prev) =>
      prev.map((si) => (si.item.id === itemId ? { ...si, condition } : si))
    );
  };

  const handleSetItemNotes = (itemId: string, notes: string) => {
    setSelectedItems((prev) =>
      prev.map((si) => (si.item.id === itemId ? { ...si, notes } : si))
    );
  };

  const handleProceedToVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const selectedGen = generations.find((g) => g.id === selectedGenId);
    const isLainnya = selectedGenId === 'gen-other' || selectedGen?.name.toLowerCase() === 'lainnya';

    if (!selectedGenId) {
      setErrorMessage('Pilih angkatan.');
      return;
    }
    if (isLainnya) {
      if (!customMemberName.trim()) {
        setErrorMessage('Silakan ketik nama peminjam.');
        return;
      }
    } else {
      if (!selectedMemberId) {
        setErrorMessage('Pilih nama anggota.');
        return;
      }
    }
    if (selectedItems.length === 0) {
      setErrorMessage('Pilih minimal satu barang.');
      return;
    }
    if (!borrowDate || !expectedReturnDate) {
      setErrorMessage('Isi tanggal peminjaman & pengembalian.');
      return;
    }
    if (new Date(expectedReturnDate) < new Date(borrowDate)) {
      setErrorMessage('Tanggal kembali tidak boleh lebih awal dari tanggal pinjam.');
      return;
    }
    if (!selectedCheckerId) {
      setErrorMessage('Pilih PIC Checker.');
      return;
    }

    setPinInput('');
    setStep('VERIFY_PIN');
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!/^\d{6}$/.test(pinInput.trim())) {
      setErrorMessage('PIN harus 6 digit angka.');
      return;
    }

    try {
      setVerifyingPin(true);
      const res = await fetch('/api/checkers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkerId: selectedCheckerId,
          pin: pinInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'PIN salah.');
        return;
      }

      setPinVerifiedCheckerName(data.checkerName || 'PIC Checker');
      setStep('INSPECTION');
    } catch {
      setErrorMessage('Gagal verifikasi PIN.');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleSubmitLoan = async () => {
    setErrorMessage('');
    try {
      setSubmittingLoan(true);
      const selectedGen = generations.find((g) => g.id === selectedGenId);
      const isLainnya = selectedGenId === 'gen-other' || selectedGen?.name.toLowerCase() === 'lainnya';

      const payload = {
        generationId: selectedGenId,
        memberId: isLainnya ? undefined : selectedMemberId,
        customName: isLainnya ? customMemberName.trim() : undefined,
        borrowDate,
        expectedReturnDate,
        checkerId: selectedCheckerId,
        pin: pinInput.trim(),
        notes: loanNotes,
        items: selectedItems.map((si) => ({
          itemId: si.item.id,
          initialCondition: si.condition,
          initialAccessories: si.checkedAccessories,
          initialNotes: si.notes,
        })),
      };

      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Gagal memproses peminjaman.');
        return;
      }

      router.push(`/borrow/success?id=${data.loanId}`);
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setSubmittingLoan(false);
    }
  };

  const filteredAvailableItems = availableItems.filter(
    (i) =>
      i.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      (i.code && i.code.toLowerCase().includes(itemSearchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-transparent flex flex-col text-neutral-900">
      <Navbar showHomeLink />

      <main className="flex-1 max-w-2xl w-full mx-auto px-3 sm:px-4 py-5 sm:py-8">
        {/* Header */}
        <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Pinjam Barang</h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
              Isi formulir peminjaman dan verifikasi dengan PIC.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-neutral-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between shadow-sm">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="text-red-500 hover:text-red-800 ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 1: FORM DATA & BARANG */}
        {step === 'FORM' && (
          <form onSubmit={handleProceedToVerify} className="space-y-4">
            {/* Peminjam Card (Bright & Clean) */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-black mb-4">
                <div className="w-6 h-6 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span>Data Peminjam</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between h-5 mb-1.5">
                    <label className="text-xs font-semibold text-neutral-600">
                      Angkatan
                    </label>
                  </div>
                  <select
                    value={selectedGenId}
                    onChange={(e) => {
                      setSelectedGenId(e.target.value);
                      setSelectedMemberId('');
                    }}
                    required
                    className="w-full h-11 px-3.5 rounded-xl border border-neutral-300 bg-neutral-50 text-neutral-900 text-sm font-medium focus:bg-white focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all"
                  >
                    <option value="">Pilih Angkatan</option>
                    {generations.map((gen) => (
                      <option key={gen.id} value={gen.id}>
                        {gen.name}
                      </option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const selectedGen = generations.find((g) => g.id === selectedGenId);
                  const isLainnya = selectedGenId === 'gen-other' || selectedGen?.name.toLowerCase() === 'lainnya';

                  if (isLainnya) {
                    return (
                      <div>
                        <div className="flex items-center justify-between h-5 mb-1.5">
                          <label className="text-xs font-semibold text-neutral-600">
                            Nama Peminjam
                          </label>
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Tulis Sendiri
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Ketik nama lengkap peminjam..."
                          value={customMemberName}
                          onChange={(e) => setCustomMemberName(e.target.value)}
                          required
                          className="w-full h-11 px-3.5 rounded-xl border border-amber-300 bg-amber-50/40 text-neutral-900 text-sm font-medium focus:bg-white focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all placeholder:text-neutral-400"
                        />
                      </div>
                    );
                  }

                  return (
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-neutral-600">
                          Nama Anggota
                        </label>
                      </div>
                      <select
                        value={selectedMemberId}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        disabled={!selectedGenId}
                        required
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-300 bg-neutral-50 text-neutral-900 text-sm font-medium focus:bg-white focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all disabled:opacity-50"
                      >
                        <option value="">Pilih Nama</option>
                        {members.map((mem) => (
                          <option key={mem.id} value={mem.id}>
                            {mem.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Barang Card (Bright & Clean) */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-black">
                  <div className="w-6 h-6 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <span>Barang Dipinjam ({selectedItems.length})</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowItemPickerModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mention-yellow text-black text-xs font-bold hover:bg-mention-yellowDark transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Tambah Barang</span>
                </button>
              </div>

              {selectedItems.length === 0 ? (
                <div className="py-7 text-center border border-dashed border-neutral-300 rounded-xl bg-neutral-50 text-neutral-500 text-xs">
                  Belum ada barang dipilih. Klik tombol <strong className="text-black">+ Tambah Barang</strong> di atas.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((si, idx) => (
                    <div
                      key={si.item.id}
                      className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-400">#{idx + 1}</span>
                          <span className="text-sm font-bold text-neutral-900">{si.item.name}</span>
                          {si.item.code && (
                            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-mono font-medium">
                              {si.item.code}
                            </span>
                          )}
                        </div>
                        {si.item.accessories && si.item.accessories.length > 0 && (
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {si.item.accessories.length} kelengkapan terdaftar
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(si.item.id)}
                        className="text-neutral-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Hapus barang ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Waktu & PIC Card (Bright & Clean) */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-black mb-4">
                <div className="w-6 h-6 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span>Waktu & PIC</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                    Tanggal Pinjam
                  </label>
                  <input
                    type="date"
                    value={borrowDate}
                    onChange={(e) => setBorrowDate(e.target.value)}
                    required
                    className="w-full h-11 px-3 rounded-xl border border-neutral-300 bg-neutral-50 text-neutral-900 text-xs font-medium focus:bg-white focus:border-black focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                    Target Kembali
                  </label>
                  <input
                    type="date"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    min={borrowDate}
                    required
                    className="w-full h-11 px-3 rounded-xl border border-neutral-300 bg-neutral-50 text-neutral-900 text-xs font-medium focus:bg-white focus:border-black focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                    PIC Checker
                  </label>
                  <select
                    value={selectedCheckerId}
                    onChange={(e) => setSelectedCheckerId(e.target.value)}
                    required
                    className="w-full h-11 px-3 rounded-xl border border-neutral-300 bg-neutral-50 text-neutral-900 text-sm font-medium focus:bg-white focus:border-black focus:outline-none transition-all"
                  >
                    <option value="">Pilih PIC</option>
                    {checkers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3.5">
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                  Catatan (opsional)
                </label>
                <input
                  type="text"
                  value={loanNotes}
                  onChange={(e) => setLoanNotes(e.target.value)}
                  placeholder="Keterangan singkat kegiatan..."
                  className="w-full h-10 px-3.5 rounded-xl border border-neutral-300 bg-neutral-50 text-neutral-900 text-xs focus:bg-white focus:border-black focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-mention-yellow text-black font-extrabold text-xs uppercase tracking-wider hover:bg-mention-yellowDark transition-all shadow-md active:scale-[0.98]"
              >
                <span>Lanjut ke Verifikasi</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: VERIFIKASI PIN PIC */}
        {step === 'VERIFY_PIN' && (
          <div className="bg-white rounded-2xl p-5 sm:p-8 max-w-md w-full mx-auto shadow-xl border border-neutral-200 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-black">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-neutral-900 mb-1">Verifikasi PIC</h2>
            <p className="text-neutral-500 text-xs mb-6">
              PIC Checker: <strong className="text-black">{checkers.find((c) => c.id === selectedCheckerId)?.name}</strong>
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-2">
                  Masukkan PIN (6 Digit)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoFocus
                  required
                  className="w-full text-center text-2xl sm:text-3xl font-mono tracking-widest sm:tracking-[0.3em] h-13 sm:h-14 rounded-xl border-2 border-neutral-300 bg-neutral-50 text-neutral-900 font-bold focus:border-black focus:bg-white focus:outline-none transition-all"
                />
                <p className="text-[11px] text-neutral-400 mt-2">
                  PIN default: 123456
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('FORM');
                    setErrorMessage('');
                  }}
                  className="flex-1 h-11 rounded-xl border border-neutral-300 text-neutral-700 font-semibold text-xs hover:bg-neutral-100 transition-colors"
                >
                  Kembali
                </button>

                <button
                  type="submit"
                  disabled={pinInput.length !== 6 || verifyingPin}
                  className="flex-1 h-11 rounded-xl bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  {verifyingPin ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-mention-yellow" />
                      <span>Verifikasi...</span>
                    </>
                  ) : (
                    <span>Verifikasi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: CEK KONDISI AWAL */}
        {step === 'INSPECTION' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-black">Cek Kondisi & Kelengkapan</h2>
                  <p className="text-xs text-green-600 font-semibold mt-0.5">
                    ✓ PIC: {pinVerifiedCheckerName}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="text-xs text-neutral-500 hover:text-black font-medium"
                >
                  Ubah Form
                </button>
              </div>

              <div className="space-y-5">
                {selectedItems.map((si, idx) => (
                  <div
                    key={si.item.id}
                    className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-3.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-black">#{idx + 1}</span>
                      <h3 className="font-bold text-sm text-black">{si.item.name}</h3>
                      {si.item.code && (
                        <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-mono">
                          {si.item.code}
                        </span>
                      )}
                    </div>

                    {/* Accessories */}
                    {si.item.accessories && si.item.accessories.length > 0 && (
                      <div>
                        <span className="block text-[11px] font-semibold text-neutral-600 mb-1.5">
                          Kelengkapan:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {si.item.accessories.map((acc) => {
                            const isChecked = si.checkedAccessories.includes(acc.name);
                            return (
                              <label
                                key={acc.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                                  isChecked
                                    ? 'bg-white border-black text-black font-semibold shadow-xs'
                                    : 'bg-neutral-100 border-neutral-200 text-neutral-400'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleAccessory(si.item.id, acc.name)}
                                  className="rounded text-black focus:ring-black"
                                />
                                <span>{acc.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Condition */}
                    <div>
                      <span className="block text-[11px] font-semibold text-neutral-600 mb-1.5">
                        Kondisi:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {(['Aman', 'Ada Catatan', 'Tidak Aman'] as InitialCondition[]).map((cond) => {
                          const isActive = si.condition === cond;
                          return (
                            <button
                              key={cond}
                              type="button"
                              onClick={() => handleSetCondition(si.item.id, cond)}
                              className={`py-2 px-1 text-center rounded-lg text-[11px] sm:text-xs font-bold border transition-all ${
                                isActive
                                  ? cond === 'Aman'
                                    ? 'bg-green-600 text-white border-green-600 shadow-sm'
                                    : cond === 'Ada Catatan'
                                    ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                                    : 'bg-red-600 text-white border-red-600 shadow-sm'
                                  : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                              }`}
                            >
                              {cond}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    <input
                      type="text"
                      value={si.notes}
                      onChange={(e) => handleSetItemNotes(si.item.id, e.target.value)}
                      placeholder="Catatan kondisi (opsional)"
                      className="w-full h-9 px-3 rounded-lg border border-neutral-300 bg-white text-neutral-900 text-xs focus:border-black focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <div className="mt-6 pt-4 border-t border-neutral-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="w-full sm:w-auto text-xs text-neutral-500 hover:text-black font-semibold text-center py-2.5 sm:py-0"
                >
                  ← Batal
                </button>

                <button
                  type="button"
                  onClick={handleSubmitLoan}
                  disabled={submittingLoan}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-mention-yellow text-black font-extrabold text-xs uppercase tracking-wider hover:bg-mention-yellowDark transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md active:scale-[0.98]"
                >
                  {submittingLoan ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <span>Selesaikan Peminjaman</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PILIH BARANG */}
        {showItemPickerModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl border border-neutral-200">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-bold text-sm text-black">Pilih Barang</h3>
                <button
                  onClick={() => setShowItemPickerModal(false)}
                  className="text-neutral-400 hover:text-black p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 border-b border-neutral-100 bg-neutral-50">
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="Cari nama atau kode barang..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-300 bg-white text-xs text-neutral-900 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {filteredAvailableItems.length === 0 ? (
                  <div className="text-center py-6 text-neutral-400 text-xs">
                    Tidak ada barang tersedia.
                  </div>
                ) : (
                  filteredAvailableItems.map((item) => {
                    const isAlreadySelected = selectedItems.some((si) => si.item.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between hover:border-neutral-400 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-black">{item.name}</span>
                            {item.code && (
                              <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded font-mono font-medium">
                                {item.code}
                              </span>
                            )}
                          </div>
                          {item.accessories && item.accessories.length > 0 && (
                            <span className="text-[10px] text-neutral-500">
                              {item.accessories.length} kelengkapan
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddItem(item)}
                          disabled={isAlreadySelected}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            isAlreadySelected
                              ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                              : 'bg-black text-white hover:bg-neutral-800'
                          }`}
                        >
                          {isAlreadySelected ? 'Dipilih' : '+ Pilih'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t border-neutral-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowItemPickerModal(false)}
                  className="px-4 py-1.5 rounded-lg border border-neutral-300 text-xs text-neutral-700 hover:bg-neutral-100 font-medium"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
