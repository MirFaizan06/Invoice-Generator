import React, { useState } from 'react';
import { FileText, Lock, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import './Auth.css';

type AuthView = 'login' | 'setup' | 'forgot';

interface AuthPageProps {
  onAuthenticated: () => void;
  initialView?: AuthView;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated, initialView = 'login' }) => {
  const [view, setView] = useState<AuthView>(initialView);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hintText, setHintText] = useState('');

  React.useEffect(() => {
    if (view === 'login') {
      window.electronAPI.auth.getHint().then(setHintText);
    }
  }, [view]);

  const handleLogin = async () => {
    if (!password) { setError('Please enter your password'); return; }
    setLoading(true);
    setError('');
    try {
      const ok = await window.electronAPI.auth.verify(password);
      if (ok) {
        onAuthenticated();
      } else {
        setError('Incorrect password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    if (!newPassword) { setError('Password cannot be empty'); return; }
    if (newPassword.length < 4) { setError('Password must be at least 4 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      await window.electronAPI.auth.setup(newPassword, hint);
      onAuthenticated();
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await window.electronAPI.auth.reset();
      onAuthenticated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <FileText size={24} color="#fff" />
          </div>
          <div className="auth-brand-name">InvoDesk</div>
        </div>

        {view === 'login' && (
          <>
            <div className="auth-header">
              <div className="auth-lock-icon"><Lock size={28} /></div>
              <h2 className="auth-title">Welcome Back</h2>
              <p className="auth-subtitle">Enter your password to unlock InvoDesk</p>
            </div>

            <div className="auth-form">
              <div className="auth-input-wrapper">
                <Input
                  label="Password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  error={error}
                  autoFocus
                />
                <button className="auth-show-pass" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {hintText && (
                <div className="auth-hint">
                  <Shield size={12} /> Hint: {hintText}
                </div>
              )}

              <Button variant="primary" fullWidth onClick={handleLogin} loading={loading} style={{ marginTop: 8 }}>
                Unlock
              </Button>

              <button className="auth-link" onClick={() => { setView('forgot'); setError(''); setPassword(''); }}>
                Forgot password?
              </button>
            </div>
          </>
        )}

        {view === 'setup' && (
          <>
            <div className="auth-header">
              <div className="auth-lock-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}><Shield size={28} /></div>
              <h2 className="auth-title">Set Up Password</h2>
              <p className="auth-subtitle">Protect your data with a local password</p>
            </div>

            <div className="auth-form">
              <Input
                label="New Password"
                type={showPass ? 'text' : 'password'}
                placeholder="At least 4 characters"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                error={error && error.includes('Password') ? error : ''}
              />
              <Input
                label="Confirm Password"
                type={showPass ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                error={error && error.includes('match') ? error : ''}
              />
              <Input
                label="Password Hint (optional)"
                placeholder="A hint to remember your password"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                hint="Visible on the login screen"
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" checked={showPass} onChange={(e) => setShowPass(e.target.checked)} />
                Show passwords
              </label>

              {error && <div className="auth-error">{error}</div>}

              <Button variant="primary" fullWidth onClick={handleSetup} loading={loading} style={{ marginTop: 4 }}>
                Set Password & Continue
              </Button>

              <button className="auth-link" onClick={() => { onAuthenticated(); }}>
                Skip for now (not recommended)
              </button>
            </div>
          </>
        )}

        {view === 'forgot' && (
          <>
            <div className="auth-header">
              <div className="auth-lock-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}><AlertTriangle size={28} /></div>
              <h2 className="auth-title">Forgot Password</h2>
              <p className="auth-subtitle">Since InvoDesk is fully offline, there is no account recovery. You can reset the password protection — your invoice data will remain intact.</p>
            </div>

            <div className="auth-form">
              <div className="auth-warning">
                <AlertTriangle size={14} />
                <span>Resetting removes password protection. Your invoices and data are safe.</span>
              </div>

              <Button variant="danger" fullWidth onClick={handleReset} loading={loading}>
                Remove Password Protection
              </Button>

              <button className="auth-link" onClick={() => { setView('login'); setError(''); }}>
                Back to login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
