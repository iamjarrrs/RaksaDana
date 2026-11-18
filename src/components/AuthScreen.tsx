import { useState, type FC, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2, Wallet } from 'lucide-react';

export const AuthScreen: FC = () => {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Mohon isi email dan kata sandi.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Pendaftaran berhasil! Jika konfirmasi email aktif di Supabase, silakan cek kotak masuk email Anda.');
        }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMsg(error.message);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-neutral-100 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background subtle pitch glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-indigo-900/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#09090b] border border-[#222228] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 flex flex-col justify-between">
        
        {/* Top Branding */}
        <div className="text-center sm:text-left">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-4 shadow-inner">
            <Wallet className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">RaksaDana</h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
            Atur anggaran dengan sistem kantong yang fleksibel, pantau setiap mutasi, dan wujudkan stabilitas finansial Anda.
          </p>
        </div>

        {/* Auth Form Box */}
        <div className="py-6">
          <div className="bg-[#0e0e12] border border-[#222228] rounded-2xl p-5 sm:p-6 shadow-xl">
            {/* Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-black border border-[#222228] rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(null); setSuccessMsg(null); }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !isSignUp ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMsg(null); setSuccessMsg(null); }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isSignUp ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Daftar Akun Baru
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Alamat Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    className="w-full bg-black border border-[#27272e] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="w-full bg-black border border-[#27272e] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{isSignUp ? 'Buat Akun Bersih' : 'Masuk ke Aplikasi'}</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 text-xs text-neutral-500 font-medium">
          Copyright &copy; 2026 J4RZZZ. All rights reserved.
        </div>

      </div>
    </div>
  );
};
