import { useState, type FC, type FormEvent } from 'react';
import { X, TrendingDown, TrendingUp, CreditCard, Loader2 } from 'lucide-react';
import { Category, Debt } from '../types/database';
import { DataService } from '../services/dataService';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  debts: Debt[];
  onSuccess: () => void;
}

export const QuickAddModal: FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  categories,
  debts,
  onSuccess,
}) => {
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'DEBT_PAYMENT'>('EXPENSE');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [debtId, setDebtId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Masukkan nominal yang valid (> 0).');
      return;
    }

    if (type === 'DEBT_PAYMENT' && !debtId) {
      setErrorMsg('Pilih utang yang ingin dicicil.');
      return;
    }

    setLoading(true);
    try {
      await DataService.createTransaction({
        date,
        type,
        category_id: categoryId || null,
        debt_id: type === 'DEBT_PAYMENT' ? debtId : null,
        amount,
        note: note.trim() || null,
      });

      setAmountStr('');
      setNote('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan transaksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Catat Transaksi Cepat</h3>
              <p className="text-[11px] text-slate-400">Target input &lt; 10 detik</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Tipe Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                type === 'EXPENSE' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Pengeluaran</span>
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                type === 'INCOME' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Pemasukan</span>
            </button>
            <button
              type="button"
              onClick={() => setType('DEBT_PAYMENT')}
              className={`py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                type === 'DEBT_PAYMENT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cicilan</span>
            </button>
          </div>

          {/* Nominal Input */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Nominal (Rp)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">Rp</span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="50000"
                autoFocus
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-3 py-3 text-lg font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Kategori Dropdown */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Kategori Kantong</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Pilih Kategori (Opsional) --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Pilihan Utang (Jika Cicilan Utang) */}
          {type === 'DEBT_PAYMENT' && (
            <div>
              <label className="block text-[11px] font-medium text-indigo-400 mb-1">Pilih Utang yang Dicicil *</label>
              <select
                value={debtId}
                onChange={(e) => setDebtId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Pilih Utang --</option>
                {debts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.creditor}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tanggal & Catatan */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Catatan</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Misal: Makan siang"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-all cursor-pointer mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Transaksi'}
          </button>
        </form>

      </div>
    </div>
  );
};
