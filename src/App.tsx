import { useState, useEffect, useCallback, type FC } from 'react';
import { 
  Wallet, 
  ReceiptText, 
  CreditCard, 
  Settings, 
  BarChart3,
  TrendingDown, 
  LogOut,
  Sparkles,
  Loader2,
  User as UserIcon,
  RefreshCw,
  RotateCcw,
  Trash2,
  Plus,
  Calendar,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { KantongTab } from './components/KantongTab';
import { LedgerTab } from './components/LedgerTab';
import { StatistikTab } from './components/StatistikTab';
import { UtangTab } from './components/UtangTab';
import { QuickAddModal } from './components/QuickAddModal';
import { DataService, getPeriodStartDate, parseIncomeBreakdown } from './services/dataService';
import { 
  BudgetPeriodType,
  Category, 
  ViewBudgetPeriodSummary,
  ViewEnvelopeStatus, 
  Transaction, 
  Debt, 
  ViewDebtSummary 
} from './types/database';

export const App: FC = () => {
  const { user, loading: authLoading, signOut, deleteAccount } = useAuth();

  // Navigation
  const [activeTab, setActiveTab] = useState<'kantong' | 'statistik' | 'ledger' | 'utang' | 'settings'>('kantong');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddSource, setQuickAddSource] = useState<string>('Cash');

  const handleOpenQuickAdd = (source = 'Cash') => {
    setQuickAddSource(source);
    setShowQuickAdd(true);
  };

  // Start date of the currently selected budget period.
  const [budgetPeriodType, setBudgetPeriodType] = useState<BudgetPeriodType>('weekly');
  const [currentPeriodStart, setCurrentPeriodStart] = useState(() => getPeriodStartDate(new Date(), 'weekly'));
  const [periodPreferenceLoaded, setPeriodPreferenceLoaded] = useState(false);
  const [periodPreferenceError, setPeriodPreferenceError] = useState<string | null>(null);
  const [savingPeriodPreference, setSavingPeriodPreference] = useState(false);

  // Data states
  const [loadingData, setLoadingData] = useState(false);
  const [dataActionLoading, setDataActionLoading] = useState(false);
  const [showFullResetConfirmation, setShowFullResetConfirmation] = useState(false);
  const [fullResetPhrase, setFullResetPhrase] = useState('');
  const [showDeleteAccountConfirmation, setShowDeleteAccountConfirmation] = useState(false);
  const [deleteAccountPhrase, setDeleteAccountPhrase] = useState('');
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<ViewBudgetPeriodSummary | null>(null);
  const [envelopes, setEnvelopes] = useState<ViewEnvelopeStatus[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtSummaries, setDebtSummaries] = useState<ViewDebtSummary[]>([]);

  useEffect(() => {
    if (!user) {
      setPeriodPreferenceLoaded(false);
      return;
    }

    let cancelled = false;
    setPeriodPreferenceLoaded(false);
    DataService.getBudgetPeriodType()
      .then((periodType) => {
        if (cancelled) return;
        setBudgetPeriodType(periodType);
        setCurrentPeriodStart(getPeriodStartDate(new Date(), periodType));
        setPeriodPreferenceError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load budget period preference:', err);
        setPeriodPreferenceError(err instanceof Error ? err.message : 'Gagal memuat pilihan siklus anggaran.');
      })
      .finally(() => {
        if (!cancelled) setPeriodPreferenceLoaded(true);
      });

    return () => { cancelled = true; };
  }, [user]);

  // Fetch all user data
  const loadUserData = useCallback(async () => {
    if (!user || !periodPreferenceLoaded) return;
    setLoadingData(true);
    try {
      const [cats, sum, envs, txs, rawDebts, dSummaries] = await Promise.all([
        DataService.getCategories(),
        DataService.getViewBudgetPeriodSummary(currentPeriodStart, budgetPeriodType),
        DataService.getViewEnvelopeStatus(currentPeriodStart, budgetPeriodType),
        DataService.getTransactions(),
        DataService.getDebts(),
        DataService.getViewDebtSummary(),
      ]);

      setCategories(cats);
      setSummary(sum);
      setEnvelopes(envs);
      setTransactions(txs);
      setDebts(rawDebts);
      setDebtSummaries(dSummaries);
    } catch (err) {
      console.error('Failed to load data from Supabase:', err);
    } finally {
      setLoadingData(false);
    }
  }, [user, periodPreferenceLoaded, currentPeriodStart, budgetPeriodType]);

  useEffect(() => {
    if (user && periodPreferenceLoaded) {
      loadUserData();
    }
  }, [user, periodPreferenceLoaded, loadUserData]);

  // Starter categories seeder
  const handleSeedStarterCategories = async () => {
    if (!window.confirm('Buat 5 kategori awal (Makan, Bensin, Kebutuhan, Cicilan, Tabungan)?')) return;
    try {
      setLoadingData(true);
      await Promise.all([
        DataService.createCategory('Makan & Minum', 'EXPENSE', '#f97316'),
        DataService.createCategory('Transport & Bensin', 'EXPENSE', '#06b6d4'),
        DataService.createCategory('Kebutuhan Harian', 'EXPENSE', '#3b82f6'),
        DataService.createCategory('Cicilan Utang', 'DEBT_PAYMENT', '#ef4444'),
        DataService.createCategory('Tabungan & Darurat', 'SAVINGS', '#10b981'),
      ]);
      await loadUserData();
    } catch (err) {
      console.error(err);
      alert('Gagal membuat kategori awal.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleBudgetPeriodChange = async (periodType: BudgetPeriodType) => {
    setSavingPeriodPreference(true);
    try {
      await DataService.setBudgetPeriodType(periodType);
      setBudgetPeriodType(periodType);
      setCurrentPeriodStart(getPeriodStartDate(new Date(), periodType));
      setPeriodPreferenceError(null);
    } catch (err) {
      console.error('Failed to save budget period preference:', err);
      const message = err instanceof Error ? err.message : 'Gagal menyimpan siklus anggaran.';
      setPeriodPreferenceError(message);
      window.alert(message);
    } finally {
      setSavingPeriodPreference(false);
    }
  };

  const handleResetBudgetPeriod = async () => {
    if (!window.confirm(
      `Reset anggaran periode ${currentPeriodStart}? Pemasukan anggaran dan alokasi kantong periode ini akan dihapus, tetapi transaksi tetap tersimpan.`
    )) return;

    setDataActionLoading(true);
    try {
      await DataService.deleteBudgetPeriod(currentPeriodStart, budgetPeriodType);
      await loadUserData();
      window.alert('Anggaran periode tersebut berhasil direset. Riwayat transaksi tetap tersimpan.');
    } catch (err) {
      console.error('Failed to reset budget period:', err);
      window.alert(err instanceof Error ? err.message : 'Gagal mereset anggaran periode.');
    } finally {
      setDataActionLoading(false);
    }
  };

  const handleResetUserFinancialData = async () => {
    if (fullResetPhrase !== 'RESET') return;

    setDataActionLoading(true);
    try {
      await DataService.resetUserFinancialData(fullResetPhrase);
      setFullResetPhrase('');
      setShowFullResetConfirmation(false);
      setBudgetPeriodType('weekly');
      setCurrentPeriodStart(getPeriodStartDate(new Date(), 'weekly'));
      setPeriodPreferenceError(null);
      setCategories([]);
      setSummary(null);
      setEnvelopes([]);
      setTransactions([]);
      setDebts([]);
      setDebtSummaries([]);
      window.alert('Seluruh data keuangan akun ini telah dihapus. Akun login Anda tetap aktif.');
    } catch (err) {
      console.error('Failed to reset user financial data:', err);
      window.alert(err instanceof Error ? err.message : 'Gagal mereset seluruh data keuangan.');
    } finally {
      setDataActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountPhrase !== 'HAPUS AKUN' || !deleteAccountPassword) return;

    setDataActionLoading(true);
    try {
      await deleteAccount(deleteAccountPassword);
      setDeleteAccountPhrase('');
      setShowDeleteAccountConfirmation(false);
      window.alert('Akun dan seluruh datanya telah dihapus secara permanen.');
    } catch (err) {
      console.error('Failed to delete account:', err);
      window.alert(err instanceof Error ? err.message : 'Gagal menghapus akun.');
    } finally {
      setDeleteAccountPassword('');
      setDataActionLoading(false);
    }
  };

  // Auth Loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-neutral-100">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-xs text-neutral-400">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  // Not Logged In
  if (!user) {
    return <AuthScreen />;
  }

  const navItems = [
    { id: 'kantong' as const, label: 'Kantong', icon: Wallet },
    { id: 'statistik' as const, label: 'Statistik', icon: BarChart3 },
    { id: 'ledger' as const, label: 'Riwayat', icon: ReceiptText },
    { id: 'utang' as const, label: 'Utang', icon: CreditCard },
    { id: 'settings' as const, label: 'Setelan', icon: Settings },
  ];

  return (
    <div className="flex justify-center min-h-screen bg-black text-neutral-100">
      {/* Container - Fully responsive from mobile (full width) to tablet and widescreen desktop */}
      <div className="w-full max-w-5xl min-h-screen flex flex-col bg-black md:bg-[#070709] border-x-0 md:border-x border-[#1c1c22] relative pb-20 md:pb-8 shadow-2xl">
        
        {/* App Header with Integrated Desktop Navigation */}
        <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#222228] px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">RaksaDana</h1>
              <p className="text-[10px] text-neutral-400 hidden sm:block">Manajemen Keuangan & Anggaran</p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Bar */}
          <nav className="hidden md:flex items-center space-x-1 bg-[#0e0e12] border border-[#222228] p-1 rounded-xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-[#18181f]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Header Action Tools */}
          <div className="flex items-center space-x-2">
            {/* Desktop Quick-Add Trigger */}
            <button
              type="button"
              onClick={() => handleOpenQuickAdd('Cash')}
              className="hidden md:flex items-center space-x-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Cepat</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => loadUserData()}
              disabled={loadingData}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#16161c] border border-transparent hover:border-[#222228] transition-colors cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {periodPreferenceError && (
            <p role="alert" className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
              Gagal memuat atau menyimpan siklus anggaran: {periodPreferenceError}. Pengaturan sebelumnya tetap digunakan.
            </p>
          )}

          {activeTab === 'kantong' && (
            <KantongTab
              periodStart={currentPeriodStart}
              onPeriodStartChange={setCurrentPeriodStart}
              periodType={budgetPeriodType}
              summary={summary}
              envelopes={envelopes}
              categories={categories}
              transactions={transactions}
              onOpenQuickAdd={handleOpenQuickAdd}
              onRefresh={loadUserData}
            />
          )}

          {activeTab === 'ledger' && (
            <LedgerTab
              transactions={transactions}
              categories={categories}
              debts={debts}
              onRefresh={loadUserData}
              onOpenQuickAdd={() => handleOpenQuickAdd('Cash')}
            />
          )}

          {activeTab === 'statistik' && (
            <StatistikTab
              transactions={transactions}
              categories={categories}
              periodStart={currentPeriodStart}
              periodType={budgetPeriodType}
            />
          )}

          {activeTab === 'utang' && (
            <UtangTab
              debts={debtSummaries}
              onRefresh={loadUserData}
              onOpenQuickAdd={() => handleOpenQuickAdd('Cash')}
            />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-4xl mx-auto pb-6">
              {/* Header */}
              <div className="border-b border-[#1f1f26] pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-indigo-400" />
                  <span>Pengaturan & Akun</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Kelola preferensi siklus keuangan, data anggaran, dan keamanan akun Anda
                </p>
              </div>

              {/* User Profile Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#09090b] border border-[#222228] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-900/40 to-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner flex-shrink-0">
                      <UserIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-sm sm:text-base font-bold text-white truncate">{user.email}</span>
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                          Aktif
                        </span>
                      </div>
                      <p className="text-xs font-mono text-neutral-500 mt-0.5 truncate">
                        UID: {user.id}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => signOut()}
                    className="self-start sm:self-auto py-2 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-[#27272e] text-neutral-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer flex-shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Keluar dari Akun</span>
                  </button>
                </div>
              </div>

              {/* Budget Period Preferences */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#09090b] border border-[#222228] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm sm:text-base font-bold text-white">Siklus Anggaran & Kantong</h3>
                  </div>
                  {savingPeriodPreference && (
                    <span className="text-[11px] text-indigo-400 flex items-center space-x-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Menyimpan...</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  Pilih bagaimana Anda ingin mengelompokkan alokasi kantong dan ringkasan pengeluaran Anda.
                </p>

                {/* 3 Interactive Cards for Budget Period */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {[
                    {
                      type: 'daily' as const,
                      title: 'Harian',
                      desc: 'Evaluasi ketat setiap 24 jam. Cocok untuk pengeluaran harian mikro.',
                    },
                    {
                      type: 'weekly' as const,
                      title: 'Mingguan (Default)',
                      desc: 'Siklus 7 hari (Senin - Minggu). Paling fleksibel & direkomendasikan.',
                    },
                    {
                      type: 'monthly' as const,
                      title: 'Bulanan',
                      desc: 'Siklus kalender 1 bulan penuh. Cocok untuk penerima gaji bulanan.',
                    },
                  ].map((cycle) => {
                    const isSelected = budgetPeriodType === cycle.type;
                    return (
                      <button
                        key={cycle.type}
                        type="button"
                        onClick={() => handleBudgetPeriodChange(cycle.type)}
                        disabled={savingPeriodPreference || !periodPreferenceLoaded}
                        className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                          isSelected
                            ? 'bg-gradient-to-br from-indigo-950/40 via-[#0e0e14] to-black border-indigo-500 shadow-lg shadow-indigo-950/40'
                            : 'bg-black/50 border-[#222228] hover:border-[#33333d] hover:bg-[#111116]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-indigo-400' : 'text-white'}`}>
                            {cycle.title}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-relaxed">
                          {cycle.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Starter Categories Helper (if empty) */}
              {categories.length === 0 && (
                <div className="p-5 sm:p-6 rounded-3xl bg-indigo-950/20 border border-indigo-500/30 shadow-sm space-y-3">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-sm font-bold text-white">Inisialisasi Kategori Awal</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Akun Anda masih bersih (*blank slate*). Anda dapat langsung menambahkan 5 kategori rekomendasi sekali klik (Makan, Transport, Kebutuhan Harian, Cicilan Utang, Tabungan).
                  </p>
                  <button
                    onClick={handleSeedStarterCategories}
                    disabled={loadingData}
                    className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    + Tambahkan 5 Kategori Rekomendasi
                  </button>
                </div>
              )}

              {/* Data Management & Danger Zone */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#09090b] border border-[#222228] shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-neutral-200">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm sm:text-base font-bold text-white">Pemeliharaan Data & Zona Bahaya</h3>
                </div>
                <p className="text-xs text-neutral-400">
                  Pengaturan pengelolaan basis data, pembersihan data anggaran, dan penghapusan akun.
                </p>

                {/* Action Row 1: Reset Budget Period */}
                <div className="p-4 rounded-2xl bg-black/60 border border-[#222228] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white">Reset Anggaran Periode Terpilih ({currentPeriodStart})</h4>
                    <p className="text-[11px] text-neutral-400">
                      Menghapus pemasukan & alokasi kantong pada periode ini saja. Riwayat transaksi tetap aman tersimpan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetBudgetPeriod}
                    disabled={dataActionLoading || loadingData}
                    className="self-start sm:self-auto px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer flex-shrink-0"
                  >
                    {dataActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>Reset Anggaran Periode</span>
                  </button>
                </div>

                {/* Action Row 2: Factory Reset */}
                <div className="p-4 rounded-2xl bg-rose-950/10 border border-rose-500/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-rose-300">Kembali ke Setelan Pabrik (Reset Data Keuangan)</h4>
                      <p className="text-[11px] text-rose-400/80">
                        Menghapus permanen semua mutasi transaksi, kantong, kategori, dan utang. Akun login Anda tetap aktif.
                      </p>
                    </div>
                    {!showFullResetConfirmation && (
                      <button
                        type="button"
                        onClick={() => setShowFullResetConfirmation(true)}
                        disabled={dataActionLoading || loadingData}
                        className="self-start sm:self-auto px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reset Pabrik</span>
                      </button>
                    )}
                  </div>

                  {showFullResetConfirmation && (
                    <div className="p-4 rounded-xl bg-black/90 border border-rose-500/40 space-y-3 animate-in fade-in duration-200">
                      <p className="text-xs text-neutral-300">
                        Ketik <span className="font-bold text-white font-mono bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/40">RESET</span> untuk mengonfirmasi penghapusan seluruh data:
                      </p>
                      <input
                        type="text"
                        value={fullResetPhrase}
                        onChange={(e) => setFullResetPhrase(e.target.value)}
                        placeholder="Ketik RESET"
                        className="w-full bg-[#09090b] border border-[#27272e] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                        autoFocus
                      />
                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { setShowFullResetConfirmation(false); setFullResetPhrase(''); }}
                          className="px-3.5 py-1.5 rounded-lg bg-[#18181e] text-neutral-400 hover:text-white text-xs cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleResetUserFinancialData}
                          disabled={dataActionLoading || fullResetPhrase !== 'RESET'}
                          className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer transition-colors"
                        >
                          {dataActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus Seluruh Data'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Row 3: Delete Account */}
                <div className="p-4 rounded-2xl bg-rose-950/10 border border-rose-500/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-rose-300">Hapus Akun Permanen</h4>
                      <p className="text-[11px] text-rose-400/80">
                        Menghapus akun autentikasi Supabase dan seluruh data selamanya. Tindakan ini tidak dapat dibatalkan.
                      </p>
                    </div>
                    {!showDeleteAccountConfirmation && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteAccountConfirmation(true)}
                        disabled={dataActionLoading || loadingData}
                        className="self-start sm:self-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Akun</span>
                      </button>
                    )}
                  </div>

                  {showDeleteAccountConfirmation && (
                    <div className="p-4 rounded-xl bg-black/90 border border-rose-500/40 space-y-3 animate-in fade-in duration-200">
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        Verifikasi kata sandi akun <span className="font-semibold text-white">{user.email}</span> dan ketik{' '}
                        <span className="font-bold text-white font-mono bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/40">HAPUS AKUN</span>:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="password"
                          value={deleteAccountPassword}
                          onChange={(e) => setDeleteAccountPassword(e.target.value)}
                          placeholder="Kata sandi saat ini"
                          className="w-full bg-[#09090b] border border-[#27272e] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                        />
                        <input
                          type="text"
                          value={deleteAccountPhrase}
                          onChange={(e) => setDeleteAccountPhrase(e.target.value)}
                          placeholder="Ketik HAPUS AKUN"
                          className="w-full bg-[#09090b] border border-[#27272e] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeleteAccountConfirmation(false);
                            setDeleteAccountPhrase('');
                            setDeleteAccountPassword('');
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-[#18181e] text-neutral-400 hover:text-white text-xs cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteAccount}
                          disabled={dataActionLoading || deleteAccountPhrase !== 'HAPUS AKUN' || !deleteAccountPassword}
                          className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer transition-colors"
                        >
                          {dataActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus Akun Selamanya'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Info */}
              <div className="text-center pt-2 space-y-1">
                <p className="text-xs text-neutral-500">RaksaDana &bull; Manajemen Anggaran &amp; Keuangan Pribadi</p>
                <p className="text-[11px] text-neutral-600 font-medium">Copyright &copy; 2026 J4RZZZ. All rights reserved.</p>
              </div>
            </div>
          )}
        </main>

        {/* Mobile-only Quick-Add Floating Action Button (FAB) */}
        <div className="fixed right-4 bottom-20 z-40 md:hidden pointer-events-none">
          <button
            type="button"
            onClick={() => handleOpenQuickAdd('Cash')}
            className="pointer-events-auto w-13 h-13 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-90 text-white shadow-2xl shadow-indigo-600/50 flex items-center justify-center transition-all cursor-pointer border border-indigo-400/30"
            title="Catat Cepat Mutasi"
          >
            <TrendingDown className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile-only Bottom Navigation Tabs */}
        <nav className="fixed bottom-0 inset-x-0 w-full md:hidden bg-black/95 backdrop-blur-md border-t border-[#222228] px-2 py-2 flex justify-around items-center z-50">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] transition-colors cursor-pointer ${
                  isActive ? 'text-indigo-400 font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Add Modal Form */}
        <QuickAddModal
          isOpen={showQuickAdd}
          onClose={() => setShowQuickAdd(false)}
          categories={categories}
          debts={debts}
          availableSources={['Cash', ...parseIncomeBreakdown(summary?.note, summary?.income || 0).emoney.map(e => e.name)]}
          initialSource={quickAddSource}
          onSuccess={loadUserData}
        />

      </div>
    </div>
  );
};

export default App;
