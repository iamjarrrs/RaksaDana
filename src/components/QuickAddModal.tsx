import { useState, useEffect, type FC, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingDown, TrendingUp, CreditCard, Loader2, Banknote, Smartphone, Plus } from 'lucide-react';
import { Category, Debt } from '../types/database';
import { DataService, formatTransactionNote } from '../services/dataService';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  debts: Debt[];
  availableSources?: string[];
  initialSource?: string;
  onSuccess: () => void;
}

export const QuickAddModal: FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  categories,
  debts,
  availableSources = ['Cash', 'GoPay', 'OVO', 'DANA', 'BCA'],
  initialSource,
  onSuccess,
}) => {
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'DEBT_PAYMENT'>('EXPENSE');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [debtId, setDebtId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentSource, setPaymentSource] = useState<string>('Cash');
  const [customSource, setCustomSource] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set initial source if provided when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSource) {
        setPaymentSource(initialSource);
      } else if (availableSources.length > 0) {
        setPaymentSource(availableSources[0]);
      } else {
        setPaymentSource('Cash');
      }
      setCustomSource('');
      setErrorMsg(null);
    }
  }, [isOpen, initialSource, availableSources]);

  if (!isOpen) return null;

  // Distinct sources list
  const distinctSources = Array.from(new Set(['Cash', ...availableSources]));

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

    const finalSource = paymentSource === 'Lainnya' 
      ? (customSource.trim() || 'Lainnya') 
      : paymentSource;

    const formattedNote = formatTransactionNote(finalSource, note);

    setLoading(true);
    try {
      await DataService.createTransaction({
        date,
        type,
        category_id: categoryId || null,
        debt_id: type === 'DEBT_PAYMENT' ? debtId : null,
        amount,
        note: formattedNote,
      });

      setAmountStr('');
      setNote('');
      setCustomSource('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan transaksi.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed -top-12 -bottom-12 inset-x-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-[#09090b] border-t sm:border border-[#222228] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#222228] pb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Catat Transaksi Cepat</h3>
              <p className="text-[11px] text-neutral-400">Pilih sumber dana dan catat mutasi instan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#18181e] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipe Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-black border border-[#222228] rounded-xl">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                type === 'EXPENSE' ? 'bg-rose-600 text-white font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Pengeluaran</span>
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                type === 'INCOME' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Pemasukan</span>
            </button>
            <button
              type="button"
              onClick={() => setType('DEBT_PAYMENT')}
              className={`py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                type === 'DEBT_PAYMENT' ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cicilan</span>
            </button>
          </div>

          {/* Nominal Input */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">Nominal (Rp)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-sm">Rp</span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="50000"
                autoFocus
                required
                className="w-full bg-black border border-[#27272e] rounded-xl pl-11 pr-3.5 py-3 text-lg font-bold text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition-all"
              />
            </div>
          </div>

          {/* Sumber Dana / Metode Pembayaran */}
          <div className="p-3 bg-black/60 border border-[#222228] rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-neutral-300 flex items-center space-x-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sumber Dana Transaksi</span>
              </label>
              <span className="text-[10px] text-neutral-500 font-mono">
                Terpilih: <strong className="text-white">{paymentSource}</strong>
              </span>
            </div>

            {/* Quick Source Chips */}
            <div className="flex flex-wrap gap-1.5">
              {distinctSources.map((source) => {
                const isSelected = paymentSource === source;
                const isCash = source.toLowerCase() === 'cash' || source.toLowerCase() === 'tunai';
                return (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setPaymentSource(source)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? isCash 
                          ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                          : 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                        : 'bg-[#141418] border border-[#27272e] text-neutral-300 hover:text-white hover:bg-[#1a1a22]'
                    }`}
                  >
                    {isCash ? <Banknote className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                    <span>{source}</span>
                  </button>
                );
              })}

              {/* Option to specify custom source */}
              <button
                type="button"
                onClick={() => setPaymentSource('Lainnya')}
                className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                  paymentSource === 'Lainnya'
                    ? 'bg-indigo-600 text-white font-bold shadow-md'
                    : 'bg-[#141418] border border-[#27272e] text-neutral-400 hover:text-white'
                }`}
              >
                <Plus className="w-3 h-3" />
                <span>Lainnya</span>
              </button>
            </div>

            {paymentSource === 'Lainnya' && (
              <div className="pt-1.5">
                <input
                  type="text"
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  placeholder="Ketik nama sumber dana (misal: Blu BCA, Dompet Khusus)"
                  className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Kategori Dropdown */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">Kategori Kantong</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
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
                className="w-full bg-black border border-indigo-500/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Keterangan / Catatan</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Misal: Makan siang kantor"
                className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center transition-all cursor-pointer mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Transaksi'}
          </button>
        </form>

      </div>
    </div>,
    document.body
  );
};
