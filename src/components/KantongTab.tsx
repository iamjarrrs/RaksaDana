import { useState, type FC, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
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
  Trash2,
  Banknote,
  Smartphone,
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  PiggyBank,
  Sparkles,
  ArrowDownLeft
} from 'lucide-react';
import { 
  BudgetPeriodType, 
  Category, 
  ViewBudgetPeriodSummary, 
  ViewEnvelopeStatus,
  Transaction,
  IncomeBreakdown
} from '../types/database';
import { 
  formatRupiah, 
  DataService, 
  getPeriodEndDate, 
  shiftPeriodStartDate,
  parseIncomeBreakdown,
  serializeIncomeBreakdown,
  parseTransactionNote
} from '../services/dataService';
import { useConfirm } from '../contexts/ConfirmContext';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

interface KantongTabProps {
  periodStart: string;
  onPeriodStartChange: (periodStart: string) => void;
  periodType: BudgetPeriodType;
  summary: ViewBudgetPeriodSummary | null;
  envelopes: ViewEnvelopeStatus[];
  categories: Category[];
  transactions: Transaction[];
  onOpenQuickAdd?: (source?: string) => void;
  onRefresh: () => void;
}

interface FormEMoneyRow {
  id: string;
  name: string;
  amount: string;
}

export const KantongTab: FC<KantongTabProps> = ({
  periodStart,
  onPeriodStartChange,
  periodType,
  summary,
  envelopes,
  categories,
  transactions,
  onOpenQuickAdd,
  onRefresh,
}) => {
  const confirm = useConfirm();

  // Modals & Accordions
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showEmoneyReport, setShowEmoneyReport] = useState(true);

  // Celengan (Piggy Bank / Uang Sisa) Modal & Form states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showCelenganHistory, setShowCelenganHistory] = useState(false);
  const [depositAmountStr, setDepositAmountStr] = useState('');
  const [depositSource, setDepositSource] = useState('Cash');
  const [depositNote, setDepositNote] = useState('');
  const [withdrawAmountStr, setWithdrawAmountStr] = useState('');
  const [withdrawSource, setWithdrawSource] = useState('Cash');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [celenganActionLoading, setCelenganActionLoading] = useState(false);

  // Form states for Income & Funds breakdown
  const [cashInput, setCashInput] = useState('');
  const [emoneyList, setEmoneyList] = useState<FormEMoneyRow[]>([]);

  // Category & Allocation form states
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'EXPENSE' | 'DEBT_PAYMENT' | 'SAVINGS'>('EXPENSE');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [allocCategoryId, setAllocCategoryId] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick suggestion chips for common e-money / banks
  const commonEMoneyChips = ['GoPay', 'OVO', 'DANA', 'ShopeePay', 'BCA', 'Bank Jago', 'Mandiri'];

  // Period navigation
  const handlePrevPeriod = () => {
    onPeriodStartChange(shiftPeriodStartDate(periodStart, periodType, -1));
  };

  const handleNextPeriod = () => {
    onPeriodStartChange(shiftPeriodStartDate(periodStart, periodType, 1));
  };

  // Open Income modal and populate with current breakdown
  const handleOpenIncomeModal = () => {
    const breakdown = parseIncomeBreakdown(summary?.note, summary?.income || 0);
    setCashInput(breakdown.cash > 0 ? breakdown.cash.toString() : '');
    if (breakdown.emoney.length > 0) {
      setEmoneyList(
        breakdown.emoney.map((e) => ({
          id: e.id,
          name: e.name,
          amount: e.amount > 0 ? e.amount.toString() : '',
        }))
      );
    } else {
      setEmoneyList([]);
    }
    setErrorMsg(null);
    setShowIncomeModal(true);
  };

  // Add a new E-Money row
  const handleAddEmoneyRow = (defaultName = '') => {
    setEmoneyList((prev) => [
      ...prev,
      {
        id: `em-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: defaultName,
        amount: '',
      },
    ]);
  };

  // Remove an E-Money row
  const handleRemoveEmoneyRow = (id: string) => {
    setEmoneyList((prev) => prev.filter((item) => item.id !== id));
  };

  // Update E-Money row
  const handleUpdateEmoneyRow = (id: string, field: 'name' | 'amount', value: string) => {
    setEmoneyList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Calculate live totals for the modal
  const liveCash = parseFloat(cashInput) || 0;
  const liveEmoneyTotal = emoneyList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const liveGrandTotal = liveCash + liveEmoneyTotal;

  // Submit Income & Funds Breakdown
  const handleSaveIncome = async (e: FormEvent) => {
    e.preventDefault();
    if (liveGrandTotal < 0) return;

    setLoading(true);
    try {
      const validEmoney = emoneyList
        .filter((item) => item.name.trim() !== '' && (parseFloat(item.amount) || 0) > 0)
        .map((item) => ({
          id: item.id,
          name: item.name.trim(),
          amount: parseFloat(item.amount) || 0,
        }));

      const breakdownData: IncomeBreakdown = {
        cash: liveCash,
        emoney: validEmoney,
      };

      const serializedNote = serializeIncomeBreakdown(breakdownData);
      await DataService.setPeriodIncome(periodStart, periodType, liveGrandTotal, serializedNote);
      setShowIncomeModal(false);
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
    const confirmed = await confirm({
      title: 'Hapus Kategori',
      message: `Hapus kategori "${category.name}"? Alokasinya di semua periode akan dihapus. Riwayat transaksi tetap ada, tetapi menjadi tanpa kategori.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!confirmed) return;

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
    const confirmed = await confirm({
      title: 'Hapus Alokasi Kantong',
      message: `Hapus alokasi untuk kategori "${categoryName}" pada periode ini? Riwayat transaksi pengeluaran tetap aman.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      await DataService.deleteEnvelopeAllocation(envelopeId);
      onRefresh();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus alokasi kantong.');
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
  const periodEndDateStr = format(periodEndDate, 'yyyy-MM-dd');
  const periodLabel = periodType === 'daily' ? 'Harian' : periodType === 'monthly' ? 'Bulanan' : 'Mingguan';

  // 1. Initial Breakdown from budget note
  const initialBreakdown = parseIncomeBreakdown(summary?.note, income);

  // 2. Filter transactions in current period
  const periodTransactions = transactions.filter(
    (t) => t.date >= periodStart && t.date <= periodEndDateStr
  );

  // 3. Calculate spent amount per funding source
  const spentBySource: Record<string, number> = {};
  periodTransactions
    .filter((t) => t.type === 'EXPENSE' || t.type === 'DEBT_PAYMENT')
    .forEach((t) => {
      const { source } = parseTransactionNote(t.note);
      const sourceKey = source && source.trim() ? source.trim() : 'Cash';
      spentBySource[sourceKey] = (spentBySource[sourceKey] || 0) + t.amount;
    });

  // 4. Calculate Cash remaining
  const cashSpent = (spentBySource['Cash'] || 0) + (spentBySource['Tunai'] || 0);
  const cashRemaining = initialBreakdown.cash - cashSpent;

  // 5. Calculate E-Money remaining per account & totals
  const emoneyAccountsReport = initialBreakdown.emoney.map((account) => {
    const spent = spentBySource[account.name] || 0;
    const remaining = account.amount - spent;
    const percentRemaining = account.amount > 0
      ? Math.max(0, Math.min(100, Math.round((remaining / account.amount) * 100)))
      : 0;

    return {
      ...account,
      spent,
      remaining,
      percentRemaining,
      isExhausted: remaining <= 0,
      isLow: remaining > 0 && percentRemaining <= 25,
    };
  });

  const totalInitialEmoney = initialBreakdown.emoney.reduce((sum, item) => sum + item.amount, 0);
  const totalSpentEmoney = emoneyAccountsReport.reduce((sum, item) => sum + item.spent, 0);
  const totalRemainingEmoney = totalInitialEmoney - totalSpentEmoney;

  // 6. Total remaining active funds across cash and e-money
  const totalActiveRemaining = cashRemaining + totalRemainingEmoney;
  const emoneyRemainingMap = Object.fromEntries(
    emoneyAccountsReport.map((acc) => [acc.name, acc.remaining])
  );

  // Celengan Category & Balance Calculation
  const celenganCategory = categories.find(
    (c) => c.type === 'SAVINGS' || c.name.toLowerCase() === 'celengan'
  );
  const celenganData = DataService.calculateCelenganBalance(transactions, celenganCategory?.id);
  const celenganTotal = celenganData.total;
  const availableSourceList = Array.from(new Set(['Cash', ...initialBreakdown.emoney.map((e) => e.name)]));

  const handleOpenDepositModal = (prefillAmount?: number) => {
    if (prefillAmount && prefillAmount > 0) {
      setDepositAmountStr(prefillAmount.toString());
    } else {
      setDepositAmountStr('');
    }
    setDepositNote('Tabung sisa uang');
    setDepositSource(availableSourceList[0] || 'Cash');
    setErrorMsg(null);
    setShowDepositModal(true);
  };

  const handleOpenWithdrawModal = () => {
    setWithdrawAmountStr('');
    setWithdrawNote('Tarik saldo celengan');
    setWithdrawSource(availableSourceList[0] || 'Cash');
    setErrorMsg(null);
    setShowWithdrawModal(true);
  };

  const handleSaveDeposit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmountStr);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Masukkan nominal tabungan yang valid.');
      return;
    }

    setCelenganActionLoading(true);
    try {
      await DataService.depositToCelengan({
        amount,
        source: depositSource,
        note: depositNote.trim() || 'Tabung sisa uang ke celengan',
      });
      setShowDepositModal(false);
      setDepositAmountStr('');
      setDepositNote('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengisi celengan.');
    } finally {
      setCelenganActionLoading(false);
    }
  };

  const handleSaveWithdraw = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmountStr);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Masukkan nominal penarikan yang valid.');
      return;
    }
    if (amount > celenganTotal) {
      setErrorMsg(`Saldo celengan tidak mencukupi (Maksimal ${formatRupiah(celenganTotal)}).`);
      return;
    }

    setCelenganActionLoading(true);
    try {
      await DataService.withdrawFromCelengan({
        amount,
        targetSource: withdrawSource,
        note: withdrawNote.trim() || `Tarik saldo celengan ke ${withdrawSource}`,
      });
      setShowWithdrawModal(false);
      setWithdrawAmountStr('');
      setWithdrawNote('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menarik saldo celengan.');
    } finally {
      setCelenganActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Budget Period Selector */}
      <div className="flex items-center justify-between bg-[#09090b] border border-[#222228] rounded-2xl p-2.5 px-4 shadow-sm">
        <button
          onClick={handlePrevPeriod}
          className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#18181e] transition-colors cursor-pointer"
          title="Periode Sebelumnya"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
            {periodType === 'monthly'
              ? format(periodStartDate, 'MMMM yyyy', { locale: id })
              : `${periodLabel}: ${format(periodStartDate, 'dd MMM yyyy', { locale: id })}`}
          </p>
          <p className="text-[10px] sm:text-[11px] text-neutral-400 font-mono mt-0.5">
            {format(periodStartDate, 'dd MMM yyyy', { locale: id })} — {format(periodEndDate, 'dd MMM yyyy', { locale: id })}
          </p>
        </div>
        <button
          onClick={handleNextPeriod}
          className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#18181e] transition-colors cursor-pointer"
          title="Periode Berikutnya"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Main Budget Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#121020] via-[#09090b] to-black border border-indigo-500/20 shadow-2xl space-y-4">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold text-neutral-300">
              Ringkasan Saldo & Anggaran ({periodLabel})
            </span>
          </div>
          <button
            onClick={handleOpenIncomeModal}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 cursor-pointer transition-colors"
          >
            {income > 0 ? 'Ubah Rincian Dana' : '+ Atur Sumber Dana'}
          </button>
        </div>

        {/* HERO BANNER: SISA DANA AKTIF TERSEDIA (PROMINENTLY HIGHLIGHTED) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/80 border border-emerald-500/30 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-neutral-300 flex items-center space-x-1.5">
              <span>Sisa Uang Tersedia Saat Ini</span>
            </span>
            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border ${
              totalActiveRemaining < 0
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : totalActiveRemaining === 0
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {totalActiveRemaining < 0 ? 'DEFISIT' : totalActiveRemaining === 0 ? 'HABIS' : 'DANA AMAN'}
            </span>
          </div>

          {/* Big Prominent Remaining Amount */}
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight ${
              totalActiveRemaining < 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {formatRupiah(totalActiveRemaining)}
            </h2>

            {totalActiveRemaining > 0 && (
              <button
                type="button"
                onClick={() => handleOpenDepositModal(totalActiveRemaining)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                title="Masukkan semua sisa uang ke celengan"
              >
                <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tabung Sisa ke Celengan</span>
              </button>
            )}
          </div>

          {/* Supporting Numbers Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#1f1f26] text-xs text-neutral-400">
            <div>
              <span>Total Awal Dimiliki: </span>
              <strong className="text-white font-mono">{formatRupiah(income)}</strong>
            </div>
            <div>
              <span>Total Pengeluaran: </span>
              <strong className="text-rose-400 font-mono">{formatRupiah(totalSpent)}</strong>
            </div>
            <div>
              <span>Belum Dialokasikan: </span>
              <strong className="text-neutral-200 font-mono">{formatRupiah(unallocatedCash)}</strong>
            </div>
          </div>
        </div>

        {/* Breakdown: Cash vs E-Money Remaining Balances */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Cash Status Card */}
          <div className="p-3.5 bg-black/60 border border-[#222228] hover:border-[#32323e] rounded-2xl flex flex-col justify-between space-y-2.5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-neutral-400 font-medium">Sisa Uang Cash (Tunai)</span>
                  <p className={`text-base sm:text-lg font-black font-mono ${cashRemaining < 0 ? 'text-rose-400' : 'text-white'}`}>
                    {formatRupiah(cashRemaining)}
                  </p>
                </div>
              </div>

              {onOpenQuickAdd && (
                <button
                  type="button"
                  onClick={() => onOpenQuickAdd('Cash')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-all cursor-pointer flex items-center space-x-1"
                  title="Catat pengeluaran tunai"
                >
                  <span>Pakai Cash</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1 border-t border-[#1c1c22]">
              <span>Awal: {formatRupiah(initialBreakdown.cash)}</span>
              <span>Terpakai: {formatRupiah(cashSpent)}</span>
            </div>
          </div>

          {/* E-Money Status Card */}
          <div className="p-3.5 bg-black/60 border border-[#222228] hover:border-[#32323e] rounded-2xl flex flex-col justify-between space-y-2.5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-neutral-400 font-medium">Sisa Uang E-Money</span>
                    {initialBreakdown.emoney.length > 0 && (
                      <span className="text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-md">
                        {initialBreakdown.emoney.length} akun
                      </span>
                    )}
                  </div>
                  <p className={`text-base sm:text-lg font-black font-mono truncate ${totalRemainingEmoney < 0 ? 'text-rose-400' : 'text-white'}`}>
                    {formatRupiah(totalRemainingEmoney)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1 border-t border-[#1c1c22]">
              <span>Awal: {formatRupiah(totalInitialEmoney)}</span>
              <span>Terpakai: {formatRupiah(totalSpentEmoney)}</span>
            </div>
          </div>
        </div>

        {/* ACCORDION / DROPDOWN REPORT: STATUS SEMUA E-MONEY */}
        <div className="border border-[#222228] rounded-2xl bg-black/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowEmoneyReport(!showEmoneyReport)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white hover:bg-[#141418] transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>Laporan & Sisa Saldo per Akun E-Money ({emoneyAccountsReport.length})</span>
            </div>
            <div className="flex items-center space-x-1 text-neutral-400 text-[11px]">
              <span>{showEmoneyReport ? 'Sembunyikan' : 'Buka Rincian'}</span>
              {showEmoneyReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showEmoneyReport && (
            <div className="p-3 sm:p-4 border-t border-[#222228] space-y-3 bg-[#070709]">
              {emoneyAccountsReport.length === 0 ? (
                <div className="py-4 text-center text-xs text-neutral-500">
                  Belum ada tempat penyimpanan e-money yang dicatat.{' '}
                  <button
                    onClick={handleOpenIncomeModal}
                    className="text-indigo-400 underline underline-offset-2 ml-1 cursor-pointer"
                  >
                    Tambah sekarang
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {emoneyAccountsReport.map((account) => {
                    let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    let badgeText = `SISA ${account.percentRemaining}%`;
                    let barColor = 'bg-emerald-500';

                    if (account.isExhausted) {
                      badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                      badgeText = 'HABIS';
                      barColor = 'bg-rose-500';
                    } else if (account.isLow) {
                      badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                      badgeText = `HAMPIR HABIS (${account.percentRemaining}%)`;
                      barColor = 'bg-amber-500';
                    }

                    return (
                      <div
                        key={account.id}
                        className="p-3.5 bg-black border border-[#27272e] rounded-xl space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {account.name}
                            </span>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                            {badgeText}
                          </span>
                        </div>

                        {/* Sisa Saldo Amount */}
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-[10px] text-neutral-400">Sisa Saldo: </span>
                            <span className={`text-sm sm:text-base font-black font-mono ${
                              account.remaining <= 0 ? 'text-rose-400' : 'text-white'
                            }`}>
                              {formatRupiah(account.remaining)}
                            </span>
                          </div>

                          {onOpenQuickAdd && !account.isExhausted && (
                            <button
                              type="button"
                              onClick={() => onOpenQuickAdd(account.name)}
                              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-0.5 cursor-pointer"
                              title={`Gunakan saldo ${account.name}`}
                            >
                              <span>Gunakan</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Numbers & Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full h-1.5 bg-[#141418] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barColor} transition-all duration-300`}
                              style={{ width: `${account.percentRemaining}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                            <span>Awal: {formatRupiah(account.amount)}</span>
                            <span>Terpakai: {formatRupiah(account.spent)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress Allocation Bar */}
        <div className="space-y-1.5 pt-2 border-t border-[#1f1f26]">
          <div className="flex justify-between text-[11px] text-neutral-400 font-medium">
            <span>Teralokasi ke Kantong: <strong className="text-neutral-200">{formatRupiah(totalAllocated)}</strong></span>
            <span>Terpakai: <strong className="text-neutral-200">{formatRupiah(totalSpent)}</strong></span>
          </div>
          <div className="w-full h-2.5 bg-[#141418] rounded-full overflow-hidden flex shadow-inner">
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${income > 0 ? Math.min(100, (totalAllocated / income) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* KARTU CELENGAN DIGITAL (UANG SISA) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#07130e] via-[#090e0c] to-[#070709] border border-emerald-500/25 shadow-xl space-y-3.5 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-inner">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">Celengan Sisa Uang</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Fleksibel
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Bebas isi berapa saja dari sisa uang Anda — boleh semua atau sebagian
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleOpenDepositModal()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Isi Celengan</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWithdrawModal}
              disabled={celenganTotal <= 0}
              className="px-3 py-2 rounded-xl bg-black/60 hover:bg-[#15151a] disabled:opacity-40 border border-[#27272e] text-neutral-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title={celenganTotal <= 0 ? 'Belum ada saldo celengan untuk ditarik' : 'Tarik saldo celengan'}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-neutral-400" />
              <span>Tarik</span>
            </button>
          </div>
        </div>

        {/* Celengan Accumulated Total & Quick Deposit Button */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pt-2.5 border-t border-[#1a2620] gap-2 relative z-10">
          <div>
            <span className="text-[11px] text-neutral-400 block mb-0.5">Total Saldo Terkumpul di Celengan</span>
            <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
              {formatRupiah(celenganTotal)}
            </p>
          </div>

          {totalActiveRemaining > 0 && (
            <button
              type="button"
              onClick={() => handleOpenDepositModal(totalActiveRemaining)}
              className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Tabung Semua Sisa ({formatRupiah(totalActiveRemaining)})</span>
            </button>
          )}
        </div>

        {/* Toggle Riwayat Mutasi Celengan */}
        {(celenganData.deposits.length > 0 || celenganData.withdrawals.length > 0) && (
          <div className="pt-2 border-t border-[#1a2620] relative z-10">
            <button
              type="button"
              onClick={() => setShowCelenganHistory(!showCelenganHistory)}
              className="text-xs text-neutral-400 hover:text-white flex items-center space-x-1 cursor-pointer font-medium"
            >
              <span>{showCelenganHistory ? 'Sembunyikan Riwayat Celengan' : `Lihat Riwayat Celengan (${celenganData.deposits.length + celenganData.withdrawals.length} mutasi)`}</span>
              {showCelenganHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showCelenganHistory && (
              <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {[...celenganData.deposits, ...celenganData.withdrawals]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((tx) => {
                    const isDeposit = tx.type === 'EXPENSE';
                    const parsed = parseTransactionNote(tx.note);
                    return (
                      <div
                        key={tx.id}
                        className="p-2.5 bg-black/60 border border-[#1f2d26] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${isDeposit ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <div>
                            <p className="text-white font-medium">
                              {isDeposit ? 'Masuk Celengan' : 'Tarik dari Celengan'}
                              {parsed.source && (
                                <span className="ml-1.5 text-[10px] text-neutral-400 bg-[#16161c] px-1.5 py-0.5 rounded border border-[#27272e]">
                                  {parsed.source}
                                </span>
                              )}
                            </p>
                            {parsed.note && <p className="text-[10px] text-neutral-400">{parsed.note}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono font-bold ${isDeposit ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isDeposit ? '+' : '-'}{formatRupiah(tx.amount)}
                          </p>
                          <span className="text-[10px] text-neutral-500 font-mono">{tx.date}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setShowAllocateModal(true)}
          className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.99]"
        >
          <Sliders className="w-4 h-4" />
          <span>Alokasi Kantong</span>
        </button>
        <button
          onClick={() => { setErrorMsg(null); setShowCategoryModal(true); }}
          className="py-2.5 px-4 rounded-xl bg-[#0e0e12] hover:bg-[#16161c] text-neutral-200 text-xs sm:text-sm font-semibold border border-[#222228] flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.99]"
        >
          <Tag className="w-4 h-4" />
          <span>Kelola Kategori</span>
        </button>
      </div>

      {/* Envelopes List - Responsive Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Kantong Anggaran ({envelopes.length})
          </h3>
        </div>

        {envelopes.length === 0 ? (
          <div className="p-8 sm:p-12 text-center border border-dashed border-[#222228] rounded-3xl bg-[#09090b]/50">
            <Wallet className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <p className="text-xs sm:text-sm text-neutral-300 font-medium">Belum ada alokasi kantong untuk periode ini.</p>
            <p className="text-[11px] text-neutral-500 mt-1 max-w-sm mx-auto">
              Klik "Alokasi Kantong" untuk membagi pemasukan Anda ke dalam pos-pos pengeluaran.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {envelopes.map((env) => {
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
                  className="p-4 bg-[#09090b] border border-[#222228] hover:border-[#32323e] rounded-2xl shadow-sm space-y-3 transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" 
                        style={{ backgroundColor: env.category_color || '#6366f1' }}
                      />
                      <span className="text-xs sm:text-sm font-bold text-white truncate">{env.category_name}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {statusBadge}
                      <button
                        type="button"
                        onClick={() => handleDeleteAllocation(env.envelope_id, env.category_name)}
                        disabled={loading}
                        aria-label={`Hapus alokasi ${env.category_name}`}
                        title="Hapus alokasi periode ini"
                        className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-[#18181e] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <div>
                        <span className="text-[11px] text-neutral-400">Sisa: </span>
                        <span className={`font-black ${env.remaining < 0 ? 'text-rose-400' : 'text-white'}`}>
                          {formatRupiah(env.remaining)}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Alokasi: <span className="text-neutral-200 font-semibold">{formatRupiah(env.allocated)}</span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-[#141418] rounded-full overflow-hidden">
                      <div
                        className={`${barColor} h-full transition-all duration-300`}
                        style={{ width: `${Math.min(100, env.spent_percentage)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: SET INCOME & FUNDS BREAKDOWN (CASH & E-MONEY) */}
      {showIncomeModal &&
        createPortal(
          <div
            className="fixed -top-12 -bottom-12 inset-x-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowIncomeModal(false)}
          >
            <div
              className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-[#09090b] border-t sm:border border-[#222228] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Header */}
              <div className="border-b border-[#222228] pb-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                  <Wallet className="w-5 h-5 text-indigo-400" />
                  <span>Atur Sumber Dana ({periodLabel})</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Catat uang cash dan saldo e-money Anda. Total akumulasi otomatis dihitung sebagai pemasukan periode.
                </p>
              </div>

              {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}

              <form onSubmit={handleSaveIncome} className="space-y-5">
              
              {/* SECTION 1: UANG CASH (TUNAI) */}
              <div className="p-4 bg-black/60 border border-[#222228] rounded-2xl space-y-2.5">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Banknote className="w-4 h-4" />
                  <label htmlFor="input-cash" className="text-xs sm:text-sm font-bold text-white">
                    Total Uang Tunai / Cash
                  </label>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Uang tunai fisik yang ada di dompet atau brankas Anda.
                </p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-sm">Rp</span>
                  <input
                    id="input-cash"
                    type="number"
                    step="any"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    placeholder="Misal: 500000"
                    autoFocus
                    className="w-full bg-black border border-[#27272e] rounded-xl pl-11 pr-3.5 py-2.5 text-sm sm:text-base text-white font-mono font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* SECTION 2: E-MONEY & DIGITAL BALANCES */}
              <div className="p-4 bg-black/60 border border-[#222228] rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-xs sm:text-sm font-bold text-white">
                      Penyimpanan E-Money & Dompet Digital
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Subtotal: <strong className="text-indigo-300">{formatRupiah(liveEmoneyTotal)}</strong>
                  </span>
                </div>

                <p className="text-[11px] text-neutral-400">
                  Tambahkan akun tempat menyimpan saldo digital Anda (GoPay, OVO, Dana, Rekening Bank, dll).
                </p>

                {/* Quick Add Suggestion Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-neutral-500 font-medium mr-1">Rekomendasi:</span>
                  {commonEMoneyChips.map((chipName) => (
                    <button
                      key={chipName}
                      type="button"
                      onClick={() => handleAddEmoneyRow(chipName)}
                      className="text-[10px] font-semibold bg-[#16161c] hover:bg-indigo-600 hover:text-white border border-[#27272e] text-neutral-300 px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                    >
                      + {chipName}
                    </button>
                  ))}
                </div>

                {/* Dynamic List of E-Money Accounts */}
                {emoneyList.length === 0 ? (
                  <div className="py-4 text-center border border-dashed border-[#222228] rounded-xl text-neutral-500 text-xs">
                    Belum ada e-money ditambahkan. Klik tombol di bawah atau pilih chip di atas.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {emoneyList.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-[#09090b] border border-[#27272e] rounded-xl flex items-center gap-2"
                      >
                        {/* Keterangan tempat penyimpanan */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateEmoneyRow(item.id, 'name', e.target.value)}
                            placeholder={`Keterangan (misal: GoPay, BCA)`}
                            className="w-full bg-black border border-[#222228] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </div>

                        {/* Nominal */}
                        <div className="w-32 sm:w-40 relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-bold">Rp</span>
                          <input
                            type="number"
                            step="any"
                            value={item.amount}
                            onChange={(e) => handleUpdateEmoneyRow(item.id, 'amount', e.target.value)}
                            placeholder="0"
                            className="w-full bg-black border border-[#222228] rounded-lg pl-8 pr-2 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveEmoneyRow(item.id)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-[#18181e] transition-colors cursor-pointer flex-shrink-0"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Custom Row Button */}
                <button
                  type="button"
                  onClick={() => handleAddEmoneyRow('')}
                  className="w-full py-2 px-3 bg-[#141418] hover:bg-[#1c1c24] border border-[#27272e] text-neutral-300 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Tempat Penyimpanan E-Money</span>
                </button>
              </div>

              {/* SECTION 3: LIVE ACCUMULATED TOTAL BANNER */}
              <div className="p-4 bg-gradient-to-r from-indigo-950/40 via-[#0e0e14] to-black border border-indigo-500/30 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>Cash: <strong className="text-emerald-400 font-mono">{formatRupiah(liveCash)}</strong></span>
                  <span>E-Money: <strong className="text-indigo-400 font-mono">{formatRupiah(liveEmoneyTotal)}</strong></span>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-[#222228]">
                  <span className="text-xs sm:text-sm font-bold text-white">Total Pemasukan / Total Dana:</span>
                  <span className="text-base sm:text-xl font-black text-white font-mono tracking-tight">
                    {formatRupiah(liveGrandTotal)}
                  </span>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Rincian Dana'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: CREATE CATEGORY */}
      {showCategoryModal &&
        createPortal(
          <div
            className="fixed -top-12 -bottom-12 inset-x-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => { setShowCategoryModal(false); setErrorMsg(null); }}
          >
            <div
              className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto bg-[#09090b] border-t sm:border border-[#222228] rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm sm:text-base font-bold text-white">Kelola Kategori</h3>
            {errorMsg && (
              <p role="alert" className="text-xs text-rose-400">{errorMsg}</p>
            )}
            <form onSubmit={handleCreateCategory} className="space-y-3.5">
              <p className="text-[11px] font-semibold text-neutral-300">Tambah Kategori Baru</p>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Nama Kategori</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Misal: Makan Siang, Bensin"
                  required
                  className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Tipe Kategori</label>
                <select
                  value={newCatType}
                  onChange={(e: any) => setNewCatType(e.target.value)}
                  className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="EXPENSE">Pengeluaran Rutin</option>
                  <option value="DEBT_PAYMENT">Cicilan Utang</option>
                  <option value="SAVINGS">Tabungan / Darurat</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Warna Badge</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-neutral-400">{newCatColor}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/20"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Kategori'}
                </button>
              </div>
            </form>

            <div className="border-t border-[#222228] pt-3 space-y-2">
              <p className="text-[11px] font-semibold text-neutral-300">Daftar Kategori Aktif</p>
              {categories.length === 0 ? (
                <p className="text-[11px] text-neutral-500">Belum ada kategori tersimpan.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between rounded-xl bg-black border border-[#1f1f26] px-3 py-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color || '#6366f1' }}
                        />
                        <span className="text-xs text-neutral-200 truncate">{category.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        disabled={loading}
                        aria-label={`Hapus kategori ${category.name}`}
                        title="Hapus kategori dan alokasinya"
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-[#18181e] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-[#222228] pt-3">
              <button
                type="button"
                onClick={() => { setShowCategoryModal(false); setErrorMsg(null); }}
                className="px-4 py-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: ALLOCATE ENVELOPE */}
      {showAllocateModal &&
        createPortal(
          <div
            className="fixed -top-12 -bottom-12 inset-x-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowAllocateModal(false)}
          >
            <div
              className="w-full sm:max-w-md bg-[#09090b] border-t sm:border border-[#222228] rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm sm:text-base font-bold text-white">Alokasikan Dana ke Kantong</h3>
              <form onSubmit={handleSaveAllocation} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Pilih Kategori</label>
                  {categories.length === 0 ? (
                    <p className="text-xs text-amber-400">
                      Belum ada kategori. Klik tombol "Kelola Kategori" terlebih dahulu.
                    </p>
                  ) : (
                    <select
                      value={allocCategoryId}
                      onChange={(e) => setAllocCategoryId(e.target.value)}
                      required
                      className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
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
                  <label className="block text-[11px] text-neutral-400 mb-1">Nominal Alokasi (Rp)</label>
                  <input
                    type="number"
                    value={allocAmount}
                    onChange={(e) => setAllocAmount(e.target.value)}
                    placeholder="Misal: 250000"
                    required
                    className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAllocateModal(false)}
                    className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || categories.length === 0}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/20"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Terapkan'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: ISI CELENGAN */}
      {showDepositModal &&
        createPortal(
          <div
            className="fixed -top-12 -bottom-12 inset-x-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowDepositModal(false)}
          >
            <div
              className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-[#09090b] border-t sm:border border-[#222228] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-[#222228] pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <PiggyBank className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">Tabung ke Celengan</h3>
                    <p className="text-[11px] text-neutral-400">Bebas masukkan semua sisa uang atau sebagian</p>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Sisa Uang Context Box */}
              <div className="p-3 rounded-2xl bg-black border border-[#222228] space-y-1">
                <span className="text-[11px] text-neutral-400 block">Sisa Uang Tersedia Periode Ini:</span>
                <p className={`text-base font-black font-mono ${totalActiveRemaining > 0 ? 'text-emerald-400' : 'text-neutral-400'}`}>
                  {formatRupiah(Math.max(0, totalActiveRemaining))}
                </p>
              </div>

              {/* Quick Chips */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-neutral-400">Pilihan Cepat Nominal:</label>
                <div className="flex flex-wrap gap-1.5">
                  {totalActiveRemaining > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDepositAmountStr(totalActiveRemaining.toString())}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                      >
                        ⚡ Semua Sisa ({formatRupiah(totalActiveRemaining)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDepositAmountStr(Math.floor(totalActiveRemaining / 2).toString())}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#141418] border border-[#27272e] text-neutral-300 hover:text-white cursor-pointer"
                      >
                        50% Sisa ({formatRupiah(Math.floor(totalActiveRemaining / 2))})
                      </button>
                    </>
                  )}
                  {[10000, 25000, 50000, 100000, 200000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDepositAmountStr(val.toString())}
                      className="px-2 py-1 text-xs font-mono rounded-lg bg-[#141418] border border-[#27272e] text-neutral-300 hover:text-white hover:border-emerald-500/40 cursor-pointer"
                    >
                      {formatRupiah(val)}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSaveDeposit} className="space-y-4">
                {/* Nominal Input */}
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Nominal yang Ditabung (Rp)</label>
                  <input
                    type="number"
                    value={depositAmountStr}
                    onChange={(e) => setDepositAmountStr(e.target.value)}
                    placeholder="Misal: 50000"
                    required
                    min="1"
                    className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-sm text-white font-bold font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Sumber Dana Selector */}
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1.5">Ambil Dana Dari Sumber:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSourceList.map((src) => {
                      const isSelected = depositSource === src;
                      const isCash = src === 'Cash';
                      const remaining = isCash ? cashRemaining : (emoneyRemainingMap[src] ?? 0);
                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setDepositSource(src)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center space-x-1.5 ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-md shadow-emerald-600/30'
                              : 'bg-black border-[#27272e] text-neutral-300 hover:text-white hover:border-[#383842]'
                          }`}
                        >
                          <span>{src}</span>
                          <span className="text-[10px] font-mono opacity-80">({formatRupiah(remaining)})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Catatan */}
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Catatan (Opsional)</label>
                  <input
                    type="text"
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                    placeholder="Misal: Uang sisa mingguan"
                    className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-[#222228]">
                  <button
                    type="button"
                    onClick={() => setShowDepositModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={celenganActionLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition-all flex items-center space-x-1.5"
                  >
                    {celenganActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Masukkan ke Celengan'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: TARIK SALDO CELENGAN */}
      {showWithdrawModal &&
        createPortal(
          <div
            className="fixed -top-12 -bottom-12 inset-x-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowWithdrawModal(false)}
          >
            <div
              className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-[#09090b] border-t sm:border border-[#222228] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-[#222228] pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">Tarik Saldo dari Celengan</h3>
                    <p className="text-[11px] text-neutral-400">Pindahkan saldo celengan kembali ke dompet aktif Anda</p>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Saldo Celengan Box */}
              <div className="p-3 rounded-2xl bg-black border border-[#222228] space-y-1">
                <span className="text-[11px] text-neutral-400 block">Total Saldo Tersedia di Celengan:</span>
                <p className="text-lg font-black font-mono text-emerald-400">
                  {formatRupiah(celenganTotal)}
                </p>
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setWithdrawAmountStr(celenganTotal.toString())}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                >
                  Tarik Semua ({formatRupiah(celenganTotal)})
                </button>
                {[50000, 100000, 200000].map((val) => (
                  val < celenganTotal && (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setWithdrawAmountStr(val.toString())}
                      className="px-2 py-1 text-xs font-mono rounded-lg bg-[#141418] border border-[#27272e] text-neutral-300 hover:text-white cursor-pointer"
                    >
                      {formatRupiah(val)}
                    </button>
                  )
                ))}
              </div>

              <form onSubmit={handleSaveWithdraw} className="space-y-4">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Nominal yang Ditarik (Rp)</label>
                  <input
                    type="number"
                    value={withdrawAmountStr}
                    onChange={(e) => setWithdrawAmountStr(e.target.value)}
                    placeholder="Misal: 50000"
                    required
                    min="1"
                    max={celenganTotal}
                    className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-sm text-white font-bold font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1.5">Kirim Saldo ke:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSourceList.map((src) => {
                      const isSelected = withdrawSource === src;
                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setWithdrawSource(src)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-500 font-bold shadow-md shadow-amber-600/30'
                              : 'bg-black border-[#27272e] text-neutral-300 hover:text-white'
                          }`}
                        >
                          {src}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Alasan / Catatan (Opsional)</label>
                  <input
                    type="text"
                    value={withdrawNote}
                    onChange={(e) => setWithdrawNote(e.target.value)}
                    placeholder="Misal: Keperluan mendadak"
                    className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-[#222228]">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={celenganActionLoading}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/20 cursor-pointer transition-all flex items-center space-x-1.5"
                  >
                    {celenganActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Tarik Saldo'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
};
