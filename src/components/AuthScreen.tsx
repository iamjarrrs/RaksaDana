import { useState, type FC, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

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
    <div className="flex justify-center min-h-screen bg-slate-950 text-slate-100">
      <div className="w-full max-w-md min-h-screen flex flex-col justify-between p-6 bg-slate-900 border-x border-slate-800 shadow-2xl">
        
        {/* Top Branding */}
        <div className="pt-8">
          <h1 className="text-2xl font-black tracking-tight text-white">RaksaDana</h1>
          <p className="text-sm text-slate-400 mt-1 leading-relaxed">
            Atur anggaran mingguan dengan sistem kantong yang fleksibel, pantau setiap pengeluaran, dan wujudkan tujuan finansial Anda.
          </p>
        </div>

        {/* Auth Form Box */}
        <div className="my-auto py-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
            {/* Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(null); setSuccessMsg(null); }}
                className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  !isSignUp ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMsg(null); setSuccessMsg(null); }}
                className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isSignUp ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
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
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Alamat Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-all cursor-pointer"
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
        <div className="text-center pb-4 text-xs text-slate-500">
          Copyright &copy; 2026 J4RZZZ. All rights reserved.
        </div>

      </div>
    </div>
  );
};
