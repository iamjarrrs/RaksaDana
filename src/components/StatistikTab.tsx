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
      const dayName = format(dateObj, 'EEE', { locale: id }); // Sen, Sel, Rab, dll.
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
    <div className="space-y-4">
      {/* Header & Filter Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center space-x-1.5">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Statistik Keuangan</span>
          </h2>
          <p className="text-[11px] text-slate-400">Analisis arus kas harian & kategori</p>
        </div>

        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5">
          <button
            onClick={() => setPeriod('selected')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
              period === 'selected' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Periode Ini
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
              period === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center space-x-1.5 text-rose-400">
            <TrendingDown className="w-4 h-4" />
            <span className="text-[11px] font-medium text-slate-400">Total Pengeluaran</span>
          </div>
          <p className="text-base font-bold text-white">{formatRupiah(totalExpense)}</p>
          <p className="text-[10px] text-slate-500">Rata-rata: {formatRupiah(avgDailyExpense)}/hari</p>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[11px] font-medium text-slate-400">Total Pemasukan</span>
          </div>
          <p className="text-base font-bold text-white">{formatRupiah(totalIncome)}</p>
          <p className={`text-[10px] font-bold ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Arus Kas: {netBalance >= 0 ? '+ ' : ''}{formatRupiah(netBalance)}
          </p>
        </div>
      </div>

      {/* Daily Income & Expense Chart */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white">Pemasukan & Pengeluaran Harian</h3>
          </div>
          <span className="text-[10px] text-slate-500">{periodLabel}</span>
        </div>

        {/* Bar Chart Container */}
        <div className="overflow-x-auto">
        <div
          className="grid gap-2 pt-4 pb-1 items-end h-36 border-b border-slate-800"
          style={{
            gridTemplateColumns: `repeat(${dailyStats.length}, minmax(0, 1fr))`,
            minWidth: dailyStats.length > 7 ? `${dailyStats.length * 36}px` : '100%',
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
                  <div className="absolute -top-9 hidden group-hover:flex flex-col z-20 px-1.5 py-1 bg-slate-800 text-[9px] text-white rounded font-bold whitespace-nowrap shadow-lg border border-slate-700">
                    <span className="text-rose-300">Keluar {formatRupiah(d.expense)}</span>
                    <span className="text-emerald-300">Masuk {formatRupiah(d.income)}</span>
                  </div>
                )}

                {/* Paired bars use a shared scale for daily comparison. */}
                <div className="w-full h-24 flex items-end justify-center gap-0.5">
                  <div className="w-2.5 h-full bg-slate-800/80 rounded-t-md flex flex-col justify-end overflow-hidden">
                    <div
                      aria-label={`Pengeluaran ${formatRupiah(d.expense)}`}
                      className="w-full rounded-t-md bg-gradient-to-t from-rose-600 to-rose-400 transition-all duration-300"
                      style={{ height: `${expenseHeight}%` }}
                    />
                  </div>
                  <div className="w-2.5 h-full bg-slate-800/80 rounded-t-md flex flex-col justify-end overflow-hidden">
                    <div
                      aria-label={`Pemasukan ${formatRupiah(d.income)}`}
                      className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-300"
                      style={{ height: `${incomeHeight}%` }}
                    />
                  </div>
                </div>

                {/* Day Label */}
                <div className="text-center mt-2">
                  <span className={`block text-[10px] font-semibold ${d.isToday ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>
                    {d.dayName}
                  </span>
                  <span className={`block text-[9px] ${d.isToday ? 'text-indigo-300' : 'text-slate-500'}`}>
                    {d.dayDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Pengeluaran</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Pemasukan</span>
          </div>
          <span className="text-indigo-400">Hari ini</span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <PieChart className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white">Distribusi per Kategori</h3>
          </div>
          <span className="text-[10px] text-slate-500">{categoryStats.length} Kategori</span>
        </div>

        {categoryStats.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-1.5">
            <AlertCircle className="w-4 h-4" />
            <span>Belum ada pengeluaran pada periode ini.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {categoryStats.map((cat) => {
              const percent = totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0;

              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-semibold text-slate-200">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white">{formatRupiah(cat.amount)}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-medium">({percent}%)</span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
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
      </div>

    </div>
  );
};
