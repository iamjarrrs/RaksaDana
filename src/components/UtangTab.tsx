import { useState, type FC, type FormEvent } from 'react';
import { 
  CreditCard, 
  Plus, 
  Archive, 
  CheckCircle2, 
  ArrowUpRight, 
  Loader2,
  SlidersHorizontal
} from 'lucide-react';
import { ViewDebtSummary } from '../types/database';
import { formatRupiah, DataService } from '../services/dataService';
import { format } from 'date-fns';

interface UtangTabProps {
  debts: ViewDebtSummary[];
  onRefresh: () => void;
  onOpenQuickAdd: () => void;
}

export const UtangTab: FC<UtangTabProps> = ({ debts, onRefresh, onOpenQuickAdd }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);

  // Form New Debt
  const [creditor, setCreditor] = useState('');
  const [principalStr, setPrincipalStr] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Form Adjustment (Top-up/Koreksi)
  const [deltaStr, setDeltaStr] = useState('');
  const [reason, setReason] = useState('');
  const [isTopUp, setIsTopUp] = useState(true);

  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const handleCreateDebt = async (e: FormEvent) => {
    e.preventDefault();
    const principal = parseFloat(principalStr);
    if (!creditor.trim() || isNaN(principal) || principal <= 0) return;

    setLoading(true);
    try {
      await DataService.createDebt(creditor.trim(), principal, startDate, note.trim());
      setShowAddModal(false);
      setCreditor('');
      setPrincipalStr('');
      setNote('');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Gagal menambah utang.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdjustment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDebtId) return;
    const rawDelta = parseFloat(deltaStr);
    if (isNaN(rawDelta) || rawDelta <= 0 || !reason.trim()) return;

    const delta = isTopUp ? rawDelta : -rawDelta;

    setLoading(true);
    try {
      await DataService.addDebtAdjustment(selectedDebtId, delta, reason.trim());
      setShowAdjustModal(false);
      setDeltaStr('');
      setReason('');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Gagal mencatat penyesuaian pokok.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArchive = async (debtId: string, currentArchived: boolean) => {
    try {
      await DataService.toggleArchiveDebt(debtId, !currentArchived);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Gagal mengubah status arsip.');
    }
  };

  const filteredDebts = debts.filter(d => showArchived ? true : !d.is_archived);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Kewajiban & Pinjaman</h2>
          <p className="text-xs text-neutral-400">Pantau progres pelunasan pinjaman, atau prioritaskan alokasi tabungan di Kantong</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="self-start sm:self-auto py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pinjaman</span>
        </button>
      </div>

      {/* Filter toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="text-xs text-neutral-400 hover:text-white flex items-center space-x-1.5 cursor-pointer transition-colors"
        >
          <Archive className="w-4 h-4" />
          <span>{showArchived ? 'Sembunyikan Arsip' : 'Tampilkan Arsip'}</span>
        </button>
      </div>

      {/* Debt Cards List - Responsive Grid */}
      <div>
        {filteredDebts.length === 0 ? (
          <div className="py-16 sm:py-20 text-center border border-dashed border-[#222228] rounded-3xl bg-[#09090b]/50 px-4">
            <CreditCard className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-300 font-medium">Tidak ada kewajiban atau pinjaman aktif.</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto leading-relaxed">
              Fitur ini opsional. Jika Anda terbebas dari utang, surplus dana dapat difokuskan untuk tabungan atau target impian di tab Kantong.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDebts.map((d) => {
              const isLunas = d.status === 'LUNAS';

              return (
                <div
                  key={d.debt_id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-sm space-y-4 ${
                    isLunas 
                      ? 'bg-[#09090b]/80 border-emerald-500/30' 
                      : 'bg-[#09090b] border-[#222228] hover:border-[#32323e]'
                  }`}
                >
                  {/* Header Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">{d.creditor}</h3>
                        {isLunas ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            LUNAS
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                            AKTIF
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs text-neutral-400 mt-1">
                        Mulai: {format(new Date(d.start_date), 'dd MMM yyyy')}
                        {d.note && ` • ${d.note}`}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleArchive(d.debt_id, d.is_archived)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-[#18181e] transition-colors cursor-pointer flex-shrink-0"
                      title={d.is_archived ? 'Buka dari arsip' : 'Arsipkan'}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Numbers Row */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-black rounded-xl border border-[#1f1f26]">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-medium">Sisa Utang:</span>
                      <p className={`text-sm sm:text-base font-black font-mono ${isLunas ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatRupiah(d.remaining_debt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 font-medium">Total Terbayar:</span>
                      <p className="text-xs sm:text-sm font-bold text-indigo-300 font-mono">
                        {formatRupiah(d.total_paid)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-neutral-400 font-medium">
                      <span>Pokok: {formatRupiah(d.effective_principal)}</span>
                      <span className="font-bold text-neutral-200">{d.progress_percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#141418] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isLunas ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, d.progress_percentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Footer per Card */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#1f1f26]">
                    <button
                      onClick={() => { setSelectedDebtId(d.debt_id); setShowAdjustModal(true); }}
                      className="text-xs text-neutral-400 hover:text-white flex items-center space-x-1.5 cursor-pointer transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Top-Up / Koreksi</span>
                    </button>

                    {!isLunas && (
                      <button
                        onClick={onOpenQuickAdd}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <span>Cicil Sekarang</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: TAMBAH UTANG */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-[#09090b] border-t sm:border border-[#222228] rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm sm:text-base font-bold text-white">Tambah Catatan Utang Baru</h3>
            <form onSubmit={handleCreateDebt} className="space-y-3.5">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Nama Pemberi Pinjaman / Kreditor</label>
                <input
                  type="text"
                  value={creditor}
                  onChange={(e) => setCreditor(e.target.value)}
                  placeholder="Misal: Bank A, Teman, Paylater"
                  required
                  className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Nominal Pokok Awal (Rp)</label>
                <input
                  type="number"
                  value={principalStr}
                  onChange={(e) => setPrincipalStr(e.target.value)}
                  placeholder="Misal: 5000000"
                  required
                  className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Catatan (Opsional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Misal: Bunga 0%, Jatuh tempo akhir tahun"
                  className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/20"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Utang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TOP-UP / KOREKSI POKOK */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-[#09090b] border-t sm:border border-[#222228] rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm sm:text-base font-bold text-white">Penyesuaian Pokok Utang</h3>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-black border border-[#222228] rounded-xl">
              <button
                type="button"
                onClick={() => setIsTopUp(true)}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isTopUp ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                + Top-Up Pinjaman
              </button>
              <button
                type="button"
                onClick={() => setIsTopUp(false)}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !isTopUp ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                - Koreksi / Diskon
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="space-y-3.5">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Nominal {isTopUp ? 'Tambahan Pokok' : 'Pengurangan'} (Rp)
                </label>
                <input
                  type="number"
                  value={deltaStr}
                  onChange={(e) => setDeltaStr(e.target.value)}
                  placeholder="Misal: 1000000"
                  required
                  className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Alasan Penyesuaian</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Misal: Pinjaman tambahan untuk servis motor"
                  required
                  className="w-full bg-black border border-[#27272e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/20"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Penyesuaian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
