import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { ChefHat, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { setCredentials, setError, setLoading } from '../store/authSlice';
import { authApi } from '../api/auth.api';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoadingLocal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    try {
      setLoadingLocal(true);
      dispatch(setLoading(true));
      const res = await authApi.login(email, password);
      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      toast.success(`Welcome back, ${res.data.user.name}!`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Check your credentials.';
      dispatch(setError(msg));
      toast.error(msg);
    } finally {
      setLoadingLocal(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top left, rgba(200,82,26,0.12) 0%, var(--color-bg) 60%)',
      padding: 'var(--space-4)',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            borderRadius: 'var(--radius-xl)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <ChefHat size={36} color="white" />
          </div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 4 }}>
            Shaban Traditional Foods
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Billing & Invoice Management
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                }} />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="admin@shabantradfoods.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                }} />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer',
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ marginTop: 'var(--space-2)' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 18, height: 18 }} />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-4)' }}>
          Shaban Traditional Foods © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;
