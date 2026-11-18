import { type FC } from 'react';
import { ReceiptText, Trash2, TrendingDown, TrendingUp, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { Transaction, Category, Debt } from '../types/database';
import { formatRupiah, DataService, parseTransactionNote } from '../services/dataService';
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Riwayat Mutasi</h2>
          <p className="text-xs text-neutral-400">Semua catatan pemasukan, pengeluaran harian, dan pembayaran cicilan</p>
        </div>
        <button
          onClick={onOpenQuickAdd}
          className="self-start sm:self-auto py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
        >
          + Catat Transaksi
        </button>
      </div>

      {/* Transaction List */}
      <div className="space-y-2.5">
        {transactions.length === 0 ? (
          <div className="py-16 sm:py-20 text-center border border-dashed border-[#222228] rounded-3xl bg-[#09090b]/50 px-4">
            <ReceiptText className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-300 font-medium">Belum ada mutasi transaksi.</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Klik tombol "+ Catat Transaksi" untuk memasukkan pengeluaran atau pemasukan baru Anda.
            </p>
          </div>
        ) : (
          transactions.map((t) => {
            const category = categories.find((c) => c.id === t.category_id);
            const debt = debts.find((d) => d.id === t.debt_id);
            const { source, note: cleanNote } = parseTransactionNote(t.note);

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

            const isCashSource = source && (source.toLowerCase() === 'cash' || source.toLowerCase() === 'tunai');

            return (
              <div
                key={t.id}
                className="p-3.5 sm:p-4 bg-[#09090b] border border-[#222228] hover:border-[#32323e] rounded-2xl flex items-center justify-between shadow-sm transition-all"
              >
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#141418] border border-[#222228] flex items-center justify-center flex-shrink-0">
                    {typeIcon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        {t.type === 'DEBT_PAYMENT' 
                          ? `Cicilan: ${debt?.creditor || 'Utang'}` 
                          : category?.name || 'Tanpa Kategori'}
                      </span>
                      {source && (
                        <span className={`inline-flex items-center text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                          isCashSource
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                        }`}>
                          {isCashSource ? <Banknote className="w-2.5 h-2.5 mr-1" /> : <Smartphone className="w-2.5 h-2.5 mr-1" />}
                          {source}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] sm:text-xs text-neutral-400 mt-0.5 truncate">
                      <span>{format(new Date(t.date), 'dd MMM yyyy')}</span>
                      {cleanNote && <span className="truncate">• {cleanNote}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0 pl-2">
                  <span className={`text-xs sm:text-sm font-black font-mono tracking-tight ${amountClass}`}>
                    {amountPrefix}{formatRupiah(t.amount)}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-[#18181e] transition-colors cursor-pointer"
                    title="Hapus Transaksi"
                  >
                    <Trash2 className="w-4 h-4" />
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
