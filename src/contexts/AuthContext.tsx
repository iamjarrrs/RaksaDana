import { createContext, useContext, useEffect, useState, type ReactNode, type FC } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const deleteAccount = async (password: string) => {
    if (!user?.email) throw new Error('Email akun tidak tersedia untuk verifikasi.');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (signInError) throw signInError;
    if (data.user.id !== user.id) {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('Akun yang diverifikasi tidak cocok dengan akun yang sedang digunakan.');
    }

    const { error: deleteError } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    });
    if (deleteError) throw deleteError;

    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) {
      throw new Error('Akun telah dihapus, tetapi sesi lokal gagal dibersihkan. Silakan muat ulang aplikasi.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
