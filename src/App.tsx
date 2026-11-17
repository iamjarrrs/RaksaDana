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
  Trash2
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { KantongTab } from './components/KantongTab';
import { LedgerTab } from './components/LedgerTab';
import { StatistikTab } from './components/StatistikTab';
import { UtangTab } from './components/UtangTab';
import { QuickAddModal } from './components/QuickAddModal';
import { DataService, getPeriodStartDate } from './services/dataService';
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
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Memeriksa sesi Supabase...</p>
        </div>
      </div>
    );
  }

  // Not Logged In
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex justify-center min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile-first Container constraint */}
      <div className="w-full max-w-md md:max-w-3xl xl:max-w-5xl min-h-screen flex flex-col bg-slate-900 border-x border-slate-800 relative pb-20 shadow-2xl">
        
        {/* App Header */}
        <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">RaksaDana</h1>
              <p className="text-[10px] text-slate-400">Manajemen Keuangan Pribadi</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => loadUserData()}
              disabled={loadingData}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 lg:p-8 overflow-y-auto">
          {periodPreferenceError && (
            <p role="alert" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Gagal memuat atau menyimpan siklus anggaran: {periodPreferenceError}. Pengaturan mingguannya tetap digunakan sampai masalah diperbaiki.
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
              onRefresh={loadUserData}
            />
          )}

          {activeTab === 'ledger' && (
            <LedgerTab
              transactions={transactions}
              categories={categories}
              debts={debts}
              onRefresh={loadUserData}
              onOpenQuickAdd={() => setShowQuickAdd(true)}
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
              onOpenQuickAdd={() => setShowQuickAdd(true)}
            />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white">Akun & Pengaturan</h2>
              
              {/* User Profile Card */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{user.email}</p>
                    <p className="text-[10px] font-mono text-slate-400">ID: {user.id.substring(0, 8)}...</p>
                  </div>
                </div>
              </div>

              {/* Financial Data Management */}
              <section className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div>
                  <label htmlFor="budget-period-type" className="block text-xs font-bold text-white">
                    Siklus Anggaran & Statistik
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Data mingguan yang sudah ada tetap tersimpan sebagai riwayat; siklus baru berlaku ke depan.
                  </p>
                  <select
                    id="budget-period-type"
                    value={budgetPeriodType}
                    onChange={(event) => {
                      const nextPeriodType = event.target.value;
                      if (nextPeriodType === 'daily' || nextPeriodType === 'weekly' || nextPeriodType === 'monthly') {
                        handleBudgetPeriodChange(nextPeriodType);
                      }
                    }}
                    disabled={savingPeriodPreference || !periodPreferenceLoaded}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white disabled:opacity-50"
                  >
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan (default)</option>
                    <option value="monthly">Bulanan</option>
                  </select>
                </div>

                <div className="border-t border-slate-700/70 pt-3 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-white">Kelola Data Keuangan</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Reset anggaran periode terpilih ({currentPeriodStart}) tidak menghapus riwayat transaksi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetBudgetPeriod}
                  disabled={dataActionLoading || loadingData}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {dataActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>Reset Anggaran Periode Terpilih</span>
                </button>

                <div className="border-t border-slate-700/70 pt-3 space-y-2">
                  <p className="text-[11px] text-rose-300">
                    Reset pabrik menghapus transaksi, anggaran, kategori, utang, penyesuaian, dan target secara permanen. Siklus kembali ke default mingguan; akun login tetap ada.
                  </p>
                  {!showFullResetConfirmation ? (
                    <button
                      type="button"
                      onClick={() => setShowFullResetConfirmation(true)}
                      disabled={dataActionLoading || loadingData}
                      className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Kembali ke Setelan Pabrik</span>
                    </button>
                  ) : (
                    <div className="space-y-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3">
                      <label htmlFor="full-reset-confirmation" className="block text-[11px] text-slate-300">
                        Ketik <span className="font-bold text-white">RESET</span> untuk mengonfirmasi penghapusan permanen.
                      </label>
                      <input
                        id="full-reset-confirmation"
                        type="text"
                        value={fullResetPhrase}
                        onChange={(event) => setFullResetPhrase(event.target.value)}
                        autoComplete="off"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => { setShowFullResetConfirmation(false); setFullResetPhrase(''); }}
                          disabled={dataActionLoading}
                          className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleResetUserFinancialData}
                          disabled={dataActionLoading || fullResetPhrase !== 'RESET'}
                          className="flex-1 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {dataActionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Hapus Permanen'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                </div>
              </section>

              {/* Account Deletion */}
              <section className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-rose-200">Hapus Akun</h3>
                  <p className="text-[11px] text-rose-300 mt-1">
                    Menghapus akun login dan seluruh datanya secara permanen. Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
                {!showDeleteAccountConfirmation ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteAccountConfirmation(true)}
                    disabled={dataActionLoading || loadingData}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Akun Permanen</span>
                  </button>
                ) : (
                  <div className="space-y-2 rounded-xl border border-rose-500/30 bg-slate-950/70 p-3">
                    <p className="text-[11px] text-slate-300">
                      Verifikasi kata sandi akun <span className="font-semibold text-white">{user.email}</span>, lalu ketik{' '}
                      <span className="font-bold text-white">HAPUS AKUN</span>.
                    </p>
                    <label className="block">
                      <span className="sr-only">Kata sandi akun saat ini</span>
                      <input
                        type="password"
                        value={deleteAccountPassword}
                        onChange={(event) => setDeleteAccountPassword(event.target.value)}
                        autoComplete="current-password"
                        placeholder="Kata sandi akun saat ini"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </label>
                    <label className="block">
                      <span className="sr-only">Ketik HAPUS AKUN untuk konfirmasi</span>
                      <input
                        type="text"
                        value={deleteAccountPhrase}
                        onChange={(event) => setDeleteAccountPhrase(event.target.value)}
                        autoComplete="off"
                        placeholder="Ketik HAPUS AKUN"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteAccountConfirmation(false);
                          setDeleteAccountPhrase('');
                          setDeleteAccountPassword('');
                        }}
                        disabled={dataActionLoading}
                        className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={dataActionLoading || deleteAccountPhrase !== 'HAPUS AKUN' || !deleteAccountPassword}
                        className="flex-1 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {dataActionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Hapus Akun'}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Quick Starter Helper */}
              {categories.length === 0 && (
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-center space-x-2 text-indigo-300">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold">Inisialisasi Kategori Awal</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Akun Anda saat ini bersih (*blank-slate*). Anda dapat menambahkan 5 kategori default sekali klik atau membuatnya manual.
                  </p>
                  <button
                    onClick={handleSeedStarterCategories}
                    disabled={loadingData}
                    className="py-2 px-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    + Buat 5 Kategori Starter
                  </button>
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={() => signOut()}
                className="w-full py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun</span>
              </button>

              {/* Copyright */}
              <div className="text-center pt-4 text-[11px] text-slate-500 font-medium">
                Copyright &copy; 2026 J4RZZZ. All rights reserved.
              </div>
            </div>
          )}
        </main>

        {/* Quick-Add Floating Action Button (FAB) */}
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-full max-w-md justify-end px-4 pointer-events-none md:max-w-3xl xl:max-w-5xl">
          <button
            type="button"
            onClick={() => setShowQuickAdd(true)}
            className="pointer-events-auto w-13 h-13 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-90 text-white shadow-xl shadow-indigo-600/40 flex items-center justify-center transition-all cursor-pointer"
            title="Catat Cepat Mutasi"
          >
            <TrendingDown className="w-6 h-6" />
          </button>
        </div>

        {/* Bottom Navigation Tabs */}
        <nav className="fixed bottom-0 inset-x-0 max-w-md md:max-w-3xl xl:max-w-5xl mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 flex justify-around items-center z-50">
          <button
            type="button"
            onClick={() => setActiveTab('kantong')}
            className={`flex flex-col items-center py-1 px-1 sm:px-2 rounded-lg text-[9px] sm:text-[11px] transition-colors cursor-pointer ${
              activeTab === 'kantong' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span>Kantong</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('statistik')}
            className={`flex flex-col items-center py-1 px-1 sm:px-2 rounded-lg text-[9px] sm:text-[11px] transition-colors cursor-pointer ${
              activeTab === 'statistik' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span>Statistik</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`flex flex-col items-center py-1 px-1 sm:px-2 rounded-lg text-[9px] sm:text-[11px] transition-colors cursor-pointer ${
              activeTab === 'ledger' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ReceiptText className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span>Riwayat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('utang')}
            className={`flex flex-col items-center py-1 px-1 sm:px-2 rounded-lg text-[9px] sm:text-[11px] transition-colors cursor-pointer ${
              activeTab === 'utang' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span>Utang</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center py-1 px-1 sm:px-2 rounded-lg text-[9px] sm:text-[11px] transition-colors cursor-pointer ${
              activeTab === 'settings' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span>Setelan</span>
          </button>
        </nav>

        {/* Quick Add Modal Form */}
        <QuickAddModal
          isOpen={showQuickAdd}
          onClose={() => setShowQuickAdd(false)}
          categories={categories}
          debts={debts}
          onSuccess={loadUserData}
        />

      </div>
    </div>
  );
};

export default App;
