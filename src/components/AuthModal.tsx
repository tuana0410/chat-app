import { useState } from 'react';
import { supabase } from '../services/supabase';

interface AuthModalProps {
  onLoginSuccess: (user: { id: string; username: string; userTag: string }) => void;
}

export function AuthModal({ onLoginSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const fakeEmail = `${cleanUsername}@chatapp.local`;

    try {
      if (isLogin) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: fakeEmail,
          password: password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Kullanıcı bulunamadı.');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile) {
          onLoginSuccess({
            id: profile.id,
            username: profile.username,
            userTag: profile.user_tag,
          });
        } else {
          const randomTag = `${cleanUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
          await supabase.from('profiles').insert({
            id: authData.user.id,
            username: cleanUsername,
            user_tag: randomTag,
          });
          onLoginSuccess({
            id: authData.user.id,
            username: cleanUsername,
            userTag: randomTag,
          });
        }
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: fakeEmail,
          password: password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Kayıt oluşturulamadı.');

        const randomTag = `${cleanUsername}_${Math.floor(1000 + Math.random() * 9000)}`;

        const { error: insertError } = await supabase.from('profiles').upsert({
          id: authData.user.id,
          username: cleanUsername,
          user_tag: randomTag,
        });

        if (insertError) throw insertError;

        onLoginSuccess({
          id: authData.user.id,
          username: cleanUsername,
          userTag: randomTag,
        });
      }
    } catch (err: any) {
      setError(err.message || 'İşlem sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-xl font-bold text-center text-gray-800">
          {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Kullanıcı Adı</label>
            <input
              type="text"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-emerald-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Şifre</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="En az 6 karakter"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-emerald-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-sm transition shadow-sm disabled:opacity-50"
          >
            {loading ? 'İşleniyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500">
          {isLogin ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}{' '}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-emerald-600 font-semibold underline ml-1"
          >
            {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
          </button>
        </p>
      </div>
    </div>
  );
}