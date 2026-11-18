import { useState, type FC, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingDown, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  PieChart
} from 'lucide-react';
import { BudgetPeriodType, Transaction, Category } from '../types/database';
import { formatRupiah, getPeriodEndDate } from '../services/dataService';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

interface StatistikTabProps {
  transactions: Transaction[];
  categories: Category[];
  periodStart: string;
  periodType: BudgetPeriodType;
}

export const StatistikTab: FC<StatistikTabProps> = ({
  transactions,
  categories,
  periodStart,
  periodType,
}) => {
  const [period, setPeriod] = useState<'selected' | 'all'>('selected');
  const periodEnd = getPeriodEndDate(periodStart, periodType);
  const selectedPeriodDays = Math.max(
    1,
    differenceInCalendarDays(parseISO(periodEnd), parseISO(periodStart)) + 1
  );
  const periodLabel = periodType === 'daily' ? 'Harian' : periodType === 'monthly' ? 'Bulanan' : 'Mingguan';

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    if (period === 'all') return transactions;
    return transactions.filter((t) => t.date >= periodStart && t.date <= periodEnd);
  }, [transactions, period, periodStart, periodEnd]);

  // Aggregate totals
  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'EXPENSE' || t.type === 'DEBT_PAYMENT')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const netBalance = totalIncome - totalExpense;

  // Daily statistics for every day in the selected budget period.
  const dailyStats = useMemo(() => {
    const days = [];

    for (let i = 0; i < selectedPeriodDays; i++) {
      const dateObj = addDays(parseISO(periodStart), i);
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      const dayName = format(dateObj, 'EEE', { locale: id });
      const dayDate = format(dateObj, 'dd');

      const dayExpenses = transactions
        .filter((t) => t.date === dateStr && (t.type === 'EXPENSE' || t.type === 'DEBT_PAYMENT'))
        .reduce((sum, t) => sum + t.amount, 0);

      const dayIncomes = transactions
        .filter((t) => t.date === dateStr && t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);

      days.push({
        dateStr,
        dayName,
        dayDate,
        expense: dayExpenses,
        income: dayIncomes,
        isToday: dateStr === format(new Date(), 'yyyy-MM-dd'),
      });
    }

    return days;
  }, [transactions, periodStart, selectedPeriodDays]);

  // Use one scale for both series so daily income and expense are comparable.
  const maxDailyAmount = useMemo(() => {
    const max = Math.max(...dailyStats.flatMap((d) => [d.expense, d.income]));
    return max > 0 ? max : 1;
  }, [dailyStats]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<string, { name: string; color: string; amount: number }>();

    filteredTransactions
      .filter((t) => t.type === 'EXPENSE' || t.type === 'DEBT_PAYMENT')
      .forEach((t) => {
        const cat = categories.find((c) => c.id === t.category_id);
        const catName = t.type === 'DEBT_PAYMENT' ? 'Cicilan Utang' : (cat?.name || 'Lain-lain');
        const catColor = t.type === 'DEBT_PAYMENT' ? '#ef4444' : (cat?.color || '#6366f1');

        const current = map.get(catName) || { name: catName, color: catColor, amount: 0 };
        current.amount += t.amount;
        map.set(catName, current);
      });

    const list = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
    return list;
  }, [filteredTransactions, categories]);

  // Average daily expense
  const averageDays = useMemo(() => {
    if (period !== 'all' || filteredTransactions.length === 0) return selectedPeriodDays;
    const sortedDates = filteredTransactions.map((transaction) => transaction.date).sort();
    return Math.max(
      1,
      differenceInCalendarDays(
        parseISO(sortedDates[sortedDates.length - 1]),
        parseISO(sortedDates[0])
      ) + 1
    );
  }, [period, filteredTransactions, selectedPeriodDays]);
  const avgDailyExpense = Math.round(totalExpense / averageDays);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Filter Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2 tracking-tight">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Statistik Keuangan</span>
          </h2>
          <p className="text-xs text-neutral-400">Analisis komparatif arus kas dan distribusi kategori pengeluaran</p>
        </div>

        <div className="flex bg-[#09090b] border border-[#222228] rounded-xl p-1 self-start sm:self-auto">
          <button
            onClick={() => setPeriod('selected')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              period === 'selected' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Periode Ini
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              period === 'all' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Semua Riwayat
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-[#09090b] border border-[#222228] rounded-2xl space-y-2 shadow-sm">
          <div className="flex items-center space-x-2 text-rose-400">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium text-neutral-400">Total Pengeluaran</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white font-mono">{formatRupiah(totalExpense)}</p>
          <p className="text-xs text-neutral-500 font-medium">Rata-rata: {formatRupiah(avgDailyExpense)} / hari</p>
        </div>

        <div className="p-4 sm:p-5 bg-[#09090b] border border-[#222228] rounded-2xl space-y-2 shadow-sm">
          <div className="flex items-center space-x-2 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium text-neutral-400">Total Pemasukan</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white font-mono">{formatRupiah(totalIncome)}</p>
          <p className={`text-xs font-bold font-mono ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Arus Kas Bersih: {netBalance >= 0 ? '+ ' : ''}{formatRupiah(netBalance)}
          </p>
        </div>
      </div>

      {/* Two Column Layout on Desktop for Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Daily Income & Expense Chart */}
        <div className="p-5 sm:p-6 bg-[#09090b] border border-[#222228] rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">Pemasukan & Pengeluaran Harian</h3>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">{periodLabel}</span>
          </div>

          {/* Bar Chart Container */}
          <div className="overflow-x-auto pb-2">
            <div
              className="grid gap-2 pt-6 pb-2 items-end h-44 border-b border-[#222228]"
              style={{
                gridTemplateColumns: `repeat(${dailyStats.length}, minmax(0, 1fr))`,
                minWidth: dailyStats.length > 7 ? `${dailyStats.length * 42}px` : '100%',
              }}
            >
              {dailyStats.map((d) => {
                const expenseHeight = d.expense > 0 ? Math.max(8, Math.round((d.expense / maxDailyAmount) * 100)) : 0;
                const incomeHeight = d.income > 0 ? Math.max(8, Math.round((d.income / maxDailyAmount) * 100)) : 0;
                const hasActivity = d.expense > 0 || d.income > 0;

                return (
                  <div key={d.dateStr} className="flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    {hasActivity && (
                      <div className="absolute -top-10 hidden group-hover:flex flex-col z-20 px-2 py-1 bg-black text-[10px] text-white rounded-lg font-bold whitespace-nowrap shadow-2xl border border-[#27272e] pointer-events-none">
                        <span className="text-rose-400">Keluar: {formatRupiah(d.expense)}</span>
                        <span className="text-emerald-400">Masuk: {formatRupiah(d.income)}</span>
                      </div>
                    )}

                    {/* Paired bars */}
                    <div className="w-full h-28 flex items-end justify-center gap-1">
                      <div className="w-2.5 sm:w-3 h-full bg-[#141418] rounded-t-md flex flex-col justify-end overflow-hidden">
                        <div
                          aria-label={`Pengeluaran ${formatRupiah(d.expense)}`}
                          className="w-full rounded-t-md bg-gradient-to-t from-rose-600 to-rose-400 transition-all duration-300"
                          style={{ height: `${expenseHeight}%` }}
                        />
                      </div>
                      <div className="w-2.5 sm:w-3 h-full bg-[#141418] rounded-t-md flex flex-col justify-end overflow-hidden">
                        <div
                          aria-label={`Pemasukan ${formatRupiah(d.income)}`}
                          className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-300"
                          style={{ height: `${incomeHeight}%` }}
                        />
                      </div>
                    </div>

                    {/* Day Label */}
                    <div className="text-center mt-2.5">
                      <span className={`block text-[10px] font-semibold ${d.isToday ? 'text-indigo-400 font-bold' : 'text-neutral-400'}`}>
                        {d.dayName}
                      </span>
                      <span className={`block text-[9px] font-mono ${d.isToday ? 'text-indigo-300' : 'text-neutral-500'}`}>
                        {d.dayDate}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Pengeluaran</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Pemasukan</span>
            </div>
            <span className="text-indigo-400 font-medium">Hari ini</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-5 sm:p-6 bg-[#09090b] border border-[#222228] rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">Distribusi per Kategori</h3>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">{categoryStats.length} Kategori</span>
          </div>

          {categoryStats.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500 flex flex-col items-center justify-center space-y-2">
              <AlertCircle className="w-6 h-6 text-neutral-600" />
              <span>Belum ada transaksi pengeluaran pada periode ini.</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {categoryStats.map((cat) => {
                const percent = totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0;

                return (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-semibold text-neutral-200 truncate">{cat.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0 font-mono">
                        <span className="font-bold text-white">{formatRupiah(cat.amount)}</span>
                        <span className="text-[11px] text-neutral-400 ml-1.5 font-medium">({percent}%)</span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-[#141418] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-[11px] text-neutral-500 pt-1 text-right">
            Total tercatat: <span className="text-neutral-300 font-bold font-mono">{formatRupiah(totalExpense)}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
