'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogIn, UserPlus, Loader2, Sparkles } from 'lucide-react';

export default function Auth({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // Kayıt Olma İşlemi
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Kayıt başarılı! E-posta adresinizi doğrulayın veya doğrudan giriş yapmayı deneyin.' });
      } else {
        // Giriş Yapma İşlemi
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-xl">
        
        {/* Logo / Başlık */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles size={14} /> RepurposeFlow AI
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isSignUp ? 'Yeni Hesap Oluştur' : 'Hesabına Giriş Yap'}
          </h2>
          <p className="text-slate-400 text-sm">
            {isSignUp ? 'İçeriklerini dönüştürmeye başlamak için kaydol.' : 'Geçmiş projelerine erişmek için oturum aç.'}
          </p>
        </div>

        {/* Hata / Başarı Mesajı */}
        {message && (
          <div className={`p-3 rounded-lg text-xs font-medium text-center ${
            message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="isim@ornek.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Şifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold p-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm mt-2 shadow-lg shadow-indigo-600/10"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : isSignUp ? (
              <>
                <UserPlus size={16} /> Kayıt Ol
              </>
            ) : (
              <>
                <LogIn size={16} /> Giriş Yap
              </>
            )}
          </button>
        </form>

        {/* Geçiş Linki */}
        <div className="text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage(null);
            }}
            className="text-xs text-indigo-400 hover:underline font-medium"
          >
            {isSignUp ? 'Zaten bir hesabın var mı? Giriş Yap' : 'Henüz hesabın yok mu? Kayıt Ol'}
          </button>
        </div>

      </div>
    </div>
  );
}