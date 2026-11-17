import { useState, type FC, type FormEvent } from 'react';
import { 
  Wallet, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Tag,
  Loader2,
  Sliders,
  Trash2
} from 'lucide-react';
import { BudgetPeriodType, Category, ViewBudgetPeriodSummary, ViewEnvelopeStatus } from '../types/database';
import { formatRupiah, DataService, getPeriodEndDate, shiftPeriodStartDate } from '../services/dataService';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

interface KantongTabProps {
  periodStart: string;
  onPeriodStartChange: (periodStart: string) => void;
  periodType: BudgetPeriodType;
  summary: ViewBudgetPeriodSummary | null;
  envelopes: ViewEnvelopeStatus[];
  categories: Category[];
  onRefresh: () => void;
}

export const KantongTab: FC<KantongTabProps> = ({
  periodStart,
  onPeriodStartChange,
  periodType,
  summary,
  envelopes,
  categories,
  onRefresh,
}) => {
  // Modals
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);

  // Form states
  const [incomeInput, setIncomeInput] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'EXPENSE' | 'DEBT_PAYMENT' | 'SAVINGS'>('EXPENSE');
  const [newCatColor, setNewCatColor] = useState('#4f46e5');
  const [allocCategoryId, setAllocCategoryId] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Period navigation
  const handlePrevPeriod = () => {
    onPeriodStartChange(shiftPeriodStartDate(periodStart, periodType, -1));
  };

  const handleNextPeriod = () => {
    onPeriodStartChange(shiftPeriodStartDate(periodStart, periodType, 1));
  };

  // Submit Income
  const handleSaveIncome = async (e: FormEvent) => {
    e.preventDefault();
    const income = parseFloat(incomeInput);
    if (isNaN(income) || income < 0) return;

    setLoading(true);
    try {
      await DataService.setPeriodIncome(periodStart, periodType, income);
      setShowIncomeModal(false);
      setIncomeInput('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan pemasukan.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Category
  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setLoading(true);
    try {
      await DataService.createCategory(newCatName.trim(), newCatType, newCatColor);
      setShowCategoryModal(false);
      setNewCatName('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat kategori.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!window.confirm(
      `Hapus kategori "${category.name}"? Alokasinya di semua periode akan dihapus. Riwayat transaksi tetap ada, tetapi menjadi tanpa kategori.`
    )) return;

    setLoading(true);
    try {
      await DataService.deleteCategory(category.id);
      onRefresh();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus kategori.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllocation = async (envelopeId: string, categoryName: string) => {
    if (!window.confirm(
      `Hapus alokasi "${categoryName}" untuk periode ini? Riwayat transaksi tidak akan dihapus.`
    )) return;

    setLoading(true);
    try {
      await DataService.deleteEnvelopeAllocation(envelopeId);
      onRefresh();
    } catch (err) {
      console.error(err);
      window.alert(err instanceof Error ? err.message : 'Gagal menghapus alokasi kantong.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Allocation
  const handleSaveAllocation = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(allocAmount);
    if (!allocCategoryId || isNaN(amount) || amount < 0) return;

    setLoading(true);
    try {
      let budgetId = summary?.weekly_budget_id;
      if (!budgetId) {
        const wb = await DataService.setPeriodIncome(periodStart, periodType, summary?.income || 0);
        budgetId = wb.id;
      }

      await DataService.saveEnvelopeAllocation(budgetId, allocCategoryId, amount);
      setShowAllocateModal(false);
      setAllocAmount('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengalokasikan dana.');
    } finally {
      setLoading(false);
    }
  };

  const income = summary?.income || 0;
  const totalAllocated = summary?.total_allocated || 0;
  const unallocatedCash = summary ? summary.unallocated_cash : 0;
  const totalSpent = summary?.total_spent || 0;
  const periodStartDate = parseISO(periodStart);
  const periodEndDate = parseISO(summary?.week_end || getPeriodEndDate(periodStart, periodType));
  const periodLabel = periodType === 'daily' ? 'Harian' : periodType === 'monthly' ? 'Bulanan' : 'Mingguan';

  return (
    <div className="space-y-4">
      
      {/* Budget Period Selector */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-2 px-3">
        <button
          onClick={handlePrevPeriod}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-xs font-bold text-white">
            {periodType === 'monthly'
              ? format(periodStartDate, 'MMMM yyyy', { locale: id })
              : `${periodLabel}: ${format(periodStartDate, 'dd MMM yyyy', { locale: id })}`}
          </p>
          <p className="text-[10px] text-slate-400">
            {format(periodStartDate, 'dd MMM yyyy', { locale: id })} s/d {format(periodEndDate, 'dd MMM yyyy', { locale: id })}
          </p>
        </div>
        <button
          onClick={handleNextPeriod}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Main Budget Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-indigo-300">Pemasukan {periodLabel}</span>
          <button
            onClick={() => { setIncomeInput(income.toString()); setShowIncomeModal(true); }}
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer"
          >
            {income > 0 ? 'Ubah Nominal' : '+ Set Pemasukan'}
          </button>
        </div>

        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-black text-white">{formatRupiah(income)}</h2>
          <div className="text-right">
            <span className={`text-xs font-bold ${unallocatedCash < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatRupiah(unallocatedCash)}
            </span>
            <p className="text-[10px] text-slate-400">Sisa Belum Dialokasikan</p>
          </div>
        </div>

        {/* Progress Allocation Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Teralokasi: {formatRupiah(totalAllocated)}</span>
            <span>Terpakai: {formatRupiah(totalSpent)}</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${income > 0 ? Math.min(100, (totalAllocated / income) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowAllocateModal(true)}
          className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Alokasi Kantong</span>
        </button>
        <button
          onClick={() => { setErrorMsg(null); setShowCategoryModal(true); }}
          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Kategori</span>
        </button>
      </div>

      {/* Envelopes List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Kantong Anggaran ({envelopes.length})
          </h3>
        </div>

        {envelopes.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
            <Wallet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">Belum ada alokasi kantong untuk periode ini.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Klik "Alokasi Kantong" untuk membagi pemasukan Anda.
            </p>
          </div>
        ) : (
          envelopes.map((env) => {
            let statusBadge = (
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                AMAN
              </span>
            );

            let barColor = 'bg-emerald-500';

            if (env.status === 'HABIS') {
              statusBadge = (
                <span className="inline-flex items-center text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  HABIS
                </span>
              );
              barColor = 'bg-amber-500';
            } else if (env.status === 'OVERBUDGET') {
              statusBadge = (
                <span className="inline-flex items-center text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  <XCircle className="w-3 h-3 mr-1" />
                  OVERBUDGET
                </span>
              );
              barColor = 'bg-rose-500';
            }

            return (
              <div
                key={env.envelope_id}
                className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: env.category_color || '#4f46e5' }}
                    />
                    <span className="text-xs font-bold text-white">{env.category_name}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {statusBadge}
                    <button
                      type="button"
                      onClick={() => handleDeleteAllocation(env.envelope_id, env.category_name)}
                      disabled={loading}
                      aria-label={`Hapus alokasi ${env.category_name}`}
                      title="Hapus alokasi periode ini"
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400">Sisa: </span>
                    <span className={`font-black ${env.remaining < 0 ? 'text-rose-400' : 'text-slate-100'}`}>
                      {formatRupiah(env.remaining)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Alokasi: <span className="text-slate-300 font-semibold">{formatRupiah(env.allocated)}</span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`${barColor} h-full transition-all duration-300`}
                    style={{ width: `${Math.min(100, env.spent_percentage)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: SET INCOME */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Atur Pemasukan Mingguan</h3>
            {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}
            <form onSubmit={handleSaveIncome} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nominal Pemasukan (Rp)</label>
                <input
                  type="number"
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  placeholder="Misal: 1000000"
                  autoFocus
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CATEGORY */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Kelola Kategori</h3>
            {errorMsg && (
              <p role="alert" className="text-xs text-rose-400">{errorMsg}</p>
            )}
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-300">Tambah kategori</p>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nama Kategori</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Misal: Makan Siang, Bensin"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tipe Kategori</label>
                <select
                  value={newCatType}
                  onChange={(e: any) => setNewCatType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="EXPENSE">Pengeluaran Rutin</option>
                  <option value="DEBT_PAYMENT">Cicilan Utang</option>
                  <option value="SAVINGS">Tabungan / Darurat</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Warna Badge</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-slate-400">{newCatColor}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Kategori'}
                </button>
              </div>
            </form>

            <div className="border-t border-slate-800 pt-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-300">Kategori aktif</p>
              {categories.length === 0 ? (
                <p className="text-[11px] text-slate-500">Belum ada kategori.</p>
              ) : (
                <div className="space-y-1.5">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between rounded-xl bg-slate-950/70 px-3 py-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color || '#4f46e5' }}
                        />
                        <span className="text-xs text-slate-200 truncate">{category.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        disabled={loading}
                        aria-label={`Hapus kategori ${category.name}`}
                        title="Hapus kategori dan alokasinya"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => { setShowCategoryModal(false); setErrorMsg(null); }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALLOCATE ENVELOPE */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Alokasikan Dana ke Kantong</h3>
            <form onSubmit={handleSaveAllocation} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Pilih Kategori</label>
                {categories.length === 0 ? (
                  <p className="text-xs text-amber-400">
                    Belum ada kategori. Klik tombol "Kategori" terlebih dahulu.
                  </p>
                ) : (
                  <select
                    value={allocCategoryId}
                    onChange={(e) => setAllocCategoryId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nominal Alokasi (Rp)</label>
                <input
                  type="number"
                  value={allocAmount}
                  onChange={(e) => setAllocAmount(e.target.value)}
                  placeholder="Misal: 250000"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || categories.length === 0}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Terapkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
