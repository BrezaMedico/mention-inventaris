'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Generation,
  Member,
  Loan,
  Checker,
  ReturnCondition,
} from '@/types';
import {
  User,
  Package,
  Calendar,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
} from 'lucide-react';

interface ReturnItemState {
  loanItemId: string;
  itemName: string;
  initialCondition: string;
  initialAccessories: string[];
  returnCondition: ReturnCondition;
  returnAccessories: string[];
  notes: string;
}

export default function ReturnPage() {
  const router = useRouter();

  // Data
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [checkers, setCheckers] = useState<Omit<Checker, 'pin_hash'>[]>([]);

  // Selection
  const [selectedGenId, setSelectedGenId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [activeLoans, setActiveLoans] = useState<(Loan & { daysOverdue?: number })[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);

  // Return items
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [selectedLoanItemIds, setSelectedLoanItemIds] = useState<string[]>([]);
  const [returnItemsState, setReturnItemsState] = useState<ReturnItemState[]>([]);

  // PIC & PIN
  const [selectedCheckerId, setSelectedCheckerId] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pinVerifiedCheckerName, setPinVerifiedCheckerName] = useState('');

  // Flow
  const [step, setStep] = useState<'FORM' | 'VERIFY_PIN' | 'INSPECTION'>('FORM');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadInitial() {
      try {
        const [genRes, checkersRes] = await Promise.all([
          fetch('/api/generations'),
          fetch('/api/checkers'),
        ]);
        const [genData, checkersData] = await Promise.all([
          genRes.json(),
          checkersRes.json(),
        ]);
        if (genData.success) setGenerations(genData.data);
        if (checkersData.success) setCheckers(checkersData.data);
      } catch {
        setErrorMessage('Gagal memuat data awal.');
      }
    }
    loadInitial();
  }, []);

  useEffect(() => {
    if (!selectedGenId) {
      setMembers([]);
      setSelectedMemberId('');
      setActiveLoans([]);
      return;
    }

    const selectedGen = generations.find((g) => g.id === selectedGenId);
    const isLainnya = selectedGenId === 'gen-other' || selectedGen?.name.toLowerCase() === 'lainnya';

    async function loadMembers() {
      try {
        const url = isLainnya
          ? `/api/members?generationId=${selectedGenId}&onlyActiveLoans=true`
          : `/api/members?generationId=${selectedGenId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setMembers(data.data);
          setSelectedMemberId('');
          setActiveLoans([]);
        }
      } catch {
        setErrorMessage('Gagal memuat daftar anggota peminjam.');
      }
    }
    loadMembers();
  }, [selectedGenId, generations]);

  useEffect(() => {
    if (!selectedMemberId) {
      setActiveLoans([]);
      setSelectedLoanId('');
      setSelectedLoanItemIds([]);
      return;
    }

    async function loadActiveLoans() {
      try {
        setLoadingLoans(true);
        const res = await fetch(`/api/loans/active?memberId=${selectedMemberId}`);
        const data = await res.json();
        if (data.success) {
          setActiveLoans(data.data || []);
          if (data.data && data.data.length === 1) {
            setSelectedLoanId(data.data[0].id);
          }
        }
      } catch {
        setErrorMessage('Gagal memuat pinjaman aktif.');
      } finally {
        setLoadingLoans(false);
      }
    }
    loadActiveLoans();
  }, [selectedMemberId]);

  const handleToggleItemSelection = (loanId: string, loanItemId: string) => {
    setSelectedLoanId(loanId);
    setSelectedLoanItemIds((prev) =>
      prev.includes(loanItemId)
        ? prev.filter((id) => id !== loanItemId)
        : [...prev, loanItemId]
    );
  };

  const handleProceedToVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedGenId) {
      setErrorMessage('Pilih angkatan.');
      return;
    }
    if (!selectedMemberId) {
      setErrorMessage('Pilih nama anggota.');
      return;
    }
    if (selectedLoanItemIds.length === 0) {
      setErrorMessage('Pilih minimal satu barang yang dikembalikan.');
      return;
    }
    if (!selectedCheckerId) {
      setErrorMessage('Pilih PIC Checker.');
      return;
    }

    const currentLoan = activeLoans.find((l) => l.id === selectedLoanId);
    if (!currentLoan) {
      setErrorMessage('Transaksi tidak valid.');
      return;
    }

    const itemsToInspect: ReturnItemState[] = [];
    for (const itemId of selectedLoanItemIds) {
      const li = currentLoan.items?.find((i) => i.id === itemId);
      if (li) {
        itemsToInspect.push({
          loanItemId: li.id,
          itemName: li.item?.name || 'Barang',
          initialCondition: li.initial_condition,
          initialAccessories: li.initial_accessories || [],
          returnCondition: 'Aman',
          returnAccessories: [...(li.initial_accessories || [])],
          notes: '',
        });
      }
    }

    setReturnItemsState(itemsToInspect);
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

  const handleToggleReturnAccessory = (loanItemId: string, accName: string) => {
    setReturnItemsState((prev) =>
      prev.map((item) => {
        if (item.loanItemId !== loanItemId) return item;
        const exists = item.returnAccessories.includes(accName);
        return {
          ...item,
          returnAccessories: exists
            ? item.returnAccessories.filter((n) => n !== accName)
            : [...item.returnAccessories, accName],
        };
      })
    );
  };

  const handleSetReturnCondition = (loanItemId: string, returnCondition: ReturnCondition) => {
    setReturnItemsState((prev) =>
      prev.map((item) => (item.loanItemId === loanItemId ? { ...item, returnCondition } : item))
    );
  };

  const handleSetReturnNotes = (loanItemId: string, notes: string) => {
    setReturnItemsState((prev) =>
      prev.map((item) => (item.loanItemId === loanItemId ? { ...item, notes } : item))
    );
  };

  const handleSubmitReturn = async () => {
    setErrorMessage('');
    try {
      setSubmittingReturn(true);
      const payload = {
        loanId: selectedLoanId,
        checkerId: selectedCheckerId,
        pin: pinInput.trim(),
        items: returnItemsState.map((ri) => ({
          loanItemId: ri.loanItemId,
          returnCondition: ri.returnCondition,
          returnAccessories: ri.returnAccessories,
          notes: ri.notes,
        })),
      };

      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Gagal memproses pengembalian.');
        return;
      }

      router.push(`/return/success?id=${data.loanId}`);
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col text-neutral-900">
      <Navbar showHomeLink />

      <main className="flex-1 max-w-2xl w-full mx-auto px-3 sm:px-4 py-5 sm:py-8">
        {/* Header */}
        <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Kembalikan Barang</h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
              Pilih barang yang dikembalikan dan verifikasi PIC.
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

        {/* STEP 1: FORM */}
        {step === 'FORM' && (
          <form onSubmit={handleProceedToVerify} className="space-y-4">
            {/* Peminjam Card (Bright & Clean) */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-black mb-4">
                <div className="w-6 h-6 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span>Peminjam</span>
              </div>

              {(() => {
                const selectedGen = generations.find((g) => g.id === selectedGenId);
                const isLainnya = selectedGenId === 'gen-other' || selectedGen?.name.toLowerCase() === 'lainnya';

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-neutral-600">
                          Angkatan
                        </label>
                      </div>
                      <select
                        value={selectedGenId}
                        onChange={(e) => setSelectedGenId(e.target.value)}
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

                    <div>
                      <div className="flex items-center justify-between h-5 mb-1.5">
                        <label className="text-xs font-semibold text-neutral-600">
                          Nama Peminjam
                        </label>
                        {isLainnya && (
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Peminjam Aktif
                          </span>
                        )}
                      </div>
                      <select
                        value={selectedMemberId}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        disabled={!selectedGenId || (isLainnya && members.length === 0)}
                        required
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-300 bg-neutral-50 text-neutral-900 text-sm font-medium focus:bg-white focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all disabled:opacity-50"
                      >
                        <option value="">
                          {isLainnya && members.length === 0
                            ? 'Tidak ada peminjaman aktif'
                            : 'Pilih Nama Peminjam'}
                        </option>
                        {members.map((mem) => (
                          <option key={mem.id} value={mem.id}>
                            {mem.name}
                          </option>
                        ))}
                      </select>
                      {isLainnya && members.length === 0 && (
                        <p className="text-[11px] text-neutral-500 mt-1.5 font-medium">
                          ✓ Tidak ada peminjam kategori 'Lainnya' yang belum mengembalikan barang.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Barang yang Sedang Dipinjam */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-black mb-4">
                <div className="w-6 h-6 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <span>Barang yang Sedang Dipinjam</span>
              </div>

              {loadingLoans ? (
                <div className="py-8 text-center text-neutral-500 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Memuat barang pinjaman...</span>
                </div>
              ) : !selectedMemberId ? (
                <div className="py-7 text-center border border-dashed border-neutral-300 rounded-xl bg-neutral-50 text-neutral-500 text-xs">
                  Pilih nama peminjam di atas untuk melihat barang yang sedang dipinjam.
                </div>
              ) : activeLoans.length === 0 ? (
                <div className="py-7 text-center border border-dashed border-neutral-300 rounded-xl bg-neutral-50 text-neutral-500 text-xs">
                  Tidak ada barang yang sedang dipinjam oleh anggota ini.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeLoans.map((loan) => (
                    <div key={loan.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
                        <span>Kode: <strong className="text-black">{loan.loan_code}</strong></span>
                        <span>Batas Kembali: <strong className="text-neutral-700">{loan.expected_return_date}</strong></span>
                      </div>

                      <div className="space-y-2">
                        {loan.items
                          ?.filter((li) => li.status === 'BORROWED')
                          .map((li) => {
                            const isSelected = selectedLoanItemIds.includes(li.id);
                            return (
                              <label
                                key={li.id}
                                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                                  isSelected
                                    ? 'bg-neutral-50 border-black shadow-xs'
                                    : 'bg-white border-neutral-200 hover:border-neutral-400'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleItemSelection(loan.id, li.id)}
                                    className="w-4 h-4 rounded text-black focus:ring-black"
                                  />
                                  <div>
                                    <span className="text-xs sm:text-sm font-bold text-black block">{li.item?.name}</span>
                                    {li.item?.code && (
                                      <span className="text-[10px] text-neutral-500 font-mono">
                                        {li.item?.code}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                                  isSelected ? 'bg-mention-yellow text-black' : 'bg-neutral-100 text-neutral-600'
                                }`}>
                                  {isSelected ? '✓ Dikembalikan' : 'Pilih'}
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PIC Checker */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200 shadow-sm">
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                PIC Checker
              </label>
              <select
                value={selectedCheckerId}
                onChange={(e) => setSelectedCheckerId(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-neutral-300 bg-neutral-50 text-neutral-900 text-sm font-medium focus:bg-white focus:border-black focus:outline-none transition-all"
              >
                <option value="">Pilih PIC Checker</option>
                {checkers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Button Lanjut */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={selectedLoanItemIds.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-mention-yellow text-black font-extrabold text-xs uppercase tracking-wider hover:bg-mention-yellowDark transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Lanjut ke Verifikasi</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: VERIFIKASI PIN */}
        {step === 'VERIFY_PIN' && (
          <div className="bg-white rounded-2xl p-5 sm:p-8 max-w-md w-full mx-auto shadow-xl border border-neutral-200 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-black">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-neutral-900 mb-1">Verifikasi PIC</h2>
            <p className="text-neutral-500 text-xs mb-6">
              PIC: <strong className="text-black">{checkers.find((c) => c.id === selectedCheckerId)?.name}</strong>
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

        {/* STEP 3: CEK PENGEMBALIAN */}
        {step === 'INSPECTION' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-black">Cek Kelengkapan & Kondisi</h2>
                  <p className="text-xs text-green-600 font-semibold mt-0.5">
                    ✓ PIC: {pinVerifiedCheckerName}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="text-xs text-neutral-500 hover:text-black font-semibold"
                >
                  Ubah Pilihan
                </button>
              </div>

              <div className="space-y-5">
                {returnItemsState.map((ri, idx) => (
                  <div
                    key={ri.loanItemId}
                    className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-3.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-black">#{idx + 1}</span>
                      <h3 className="font-bold text-sm text-black">{ri.itemName}</h3>
                    </div>

                    {/* Accessories returned */}
                    {ri.initialAccessories && ri.initialAccessories.length > 0 && (
                      <div>
                        <span className="block text-[11px] font-semibold text-neutral-600 mb-1.5">
                          Kelengkapan yang Dikembalikan:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {ri.initialAccessories.map((acc) => {
                            const isChecked = ri.returnAccessories.includes(acc);
                            return (
                              <label
                                key={acc}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                                  isChecked
                                    ? 'bg-white border-black text-black font-semibold shadow-xs'
                                    : 'bg-neutral-100 border-neutral-200 text-neutral-400'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleReturnAccessory(ri.loanItemId, acc)}
                                  className="rounded text-black focus:ring-black"
                                />
                                <span>{acc}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Condition */}
                    <div>
                      <span className="block text-[11px] font-semibold text-neutral-600 mb-1.5">
                        Kondisi Akhir:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {(['Aman', 'Rusak', 'Tidak Lengkap'] as ReturnCondition[]).map((cond) => {
                          const isActive = ri.returnCondition === cond;
                          return (
                            <button
                              key={cond}
                              type="button"
                              onClick={() => handleSetReturnCondition(ri.loanItemId, cond)}
                              className={`py-2 px-1 text-center rounded-lg text-[11px] sm:text-xs font-bold border transition-all ${
                                isActive
                                  ? cond === 'Aman'
                                    ? 'bg-green-600 text-white border-green-600 shadow-sm'
                                    : cond === 'Tidak Lengkap'
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
                      value={ri.notes}
                      onChange={(e) => handleSetReturnNotes(ri.loanItemId, e.target.value)}
                      placeholder="Catatan pengembalian (opsional)"
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
                  onClick={handleSubmitReturn}
                  disabled={submittingReturn}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-mention-yellow text-black font-extrabold text-xs uppercase tracking-wider hover:bg-mention-yellowDark transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md active:scale-[0.98]"
                >
                  {submittingReturn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <span>Selesaikan Pengembalian</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
