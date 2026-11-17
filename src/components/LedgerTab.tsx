import { type FC } from 'react';
import { ReceiptText, Trash2, TrendingDown, TrendingUp, CreditCard } from 'lucide-react';
import { Transaction, Category, Debt } from '../types/database';
import { formatRupiah, DataService } from '../services/dataService';
import { format } from 'date-fns';

interface LedgerTabProps {
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  onRefresh: () => void;
  onOpenQuickAdd: () => void;
}

export const LedgerTab: FC<LedgerTabProps> = ({
  transactions,
  categories,
  debts,
  onRefresh,
  onOpenQuickAdd,
}) => {
  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus transaksi ini? Saldo kantong dan sisa utang akan otomatis dihitung ulang.')) return;
    try {
      await DataService.deleteTransaction(id);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus transaksi.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Riwayat Transaksi</h2>
          <p className="text-[11px] text-slate-400">Semua pemasukan, pengeluaran, dan cicilan</p>
        </div>
        <button
          onClick={onOpenQuickAdd}
          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
        >
          + Catat Transaksi
        </button>
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {transactions.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
            <ReceiptText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">Belum ada mutasi transaksi.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Klik tombol "+ Catat Transaksi" untuk menginput transaksi baru.
            </p>
          </div>
        ) : (
          transactions.map((t) => {
            const category = categories.find((c) => c.id === t.category_id);
            const debt = debts.find((d) => d.id === t.debt_id);

            let typeIcon = <TrendingDown className="w-4 h-4 text-rose-400" />;
            let amountPrefix = '- ';
            let amountClass = 'text-rose-400';

            if (t.type === 'INCOME') {
              typeIcon = <TrendingUp className="w-4 h-4 text-emerald-400" />;
              amountPrefix = '+ ';
              amountClass = 'text-emerald-400';
            } else if (t.type === 'DEBT_PAYMENT') {
              typeIcon = <CreditCard className="w-4 h-4 text-indigo-400" />;
              amountPrefix = '- ';
              amountClass = 'text-indigo-400';
            }

            return (
              <div
                key={t.id}
                className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                    {typeIcon}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-white">
                        {t.type === 'DEBT_PAYMENT' 
                          ? `Cicilan: ${debt?.creditor || 'Utang'}` 
                          : category?.name || 'Tanpa Kategori'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{format(new Date(t.date), 'dd MMM yyyy')}</span>
                      {t.note && <span>• {t.note}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-bold ${amountClass}`}>
                    {amountPrefix}{formatRupiah(t.amount)}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
