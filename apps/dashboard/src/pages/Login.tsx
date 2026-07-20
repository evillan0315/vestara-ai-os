import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login, autoLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await autoLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-vestara-bg">
      <div className="glass w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-vestara-gold to-vestara-gold-light text-lg font-bold text-vestara-bg">
            V
          </div>
          <h1 className="text-xl font-bold text-vestara-text">Vestara AI OS</h1>
          <p className="mt-1 text-sm text-vestara-text-muted">Sign in with your system account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-vestara-text-muted">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-2.5 text-sm text-vestara-text placeholder-vestara-text-dim outline-none focus:border-vestara-gold/50"
              placeholder="os username"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-vestara-text-muted">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-2.5 text-sm text-vestara-text placeholder-vestara-text-dim outline-none focus:border-vestara-gold/50"
              placeholder="os password"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="btn-gold w-full py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-vestara-glass-border" />
          <span className="text-xs text-vestara-text-dim">or</span>
          <div className="h-px flex-1 bg-vestara-glass-border" />
        </div>

        <button
          onClick={handleAutoLogin}
          disabled={loading}
          className="w-full rounded-lg border border-vestara-glass-border bg-vestara-surface/50 py-2.5 text-sm text-vestara-text-muted hover:bg-vestara-glass hover:text-vestara-text disabled:opacity-50"
        >
          Auto-login as current user
        </button>
      </div>
    </div>
  );
}
