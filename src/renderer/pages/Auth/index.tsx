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

function PassField({
  label, value, onChange, onKeyDown, placeholder, error, autoFocus,
}: {
  label: string; value: string; onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string; error?: string; autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="auth-pass-wrap">
      <label className="auth-label">{label}</label>
      <div className="auth-pass-field">
        <input
          className={`auth-input${error ? ' has-error' : ''}`}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          autoComplete="off"
        />
        <button type="button" className="auth-show-pass" tabIndex={-1} onClick={() => setShow((s) => !s)}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {error && <span className="auth-error">{error}</span>}
    </div>
  );
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated, initialView = 'login' }) => {
  const [view, setView] = useState<AuthView>(initialView);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hintText, setHintText] = useState('');

  React.useEffect(() => {
    if (view === 'login') window.electronAPI.auth.getHint().then(setHintText);
  }, [view]);

  const handleLogin = async () => {
    if (!password) { setError('Please enter your password'); return; }
    setLoading(true); setError('');
    try {
      const ok = await window.electronAPI.auth.verify(password);
      if (ok) onAuthenticated();
      else setError('Incorrect password. Please try again.');
    } finally { setLoading(false); }
  };

  const handleSetup = async () => {
    if (!newPassword) { setError('Password cannot be empty'); return; }
    if (newPassword.length < 4) { setError('Password must be at least 4 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await window.electronAPI.auth.setup(newPassword, hint);
      onAuthenticated();
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    setLoading(true);
    try { await window.electronAPI.auth.reset(); onAuthenticated(); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon"><FileText size={18} color="#fff" /></div>
          <div className="auth-brand-name">BizDesk</div>
        </div>

        {view === 'login' && (
          <>
            <div className="auth-header">
              <div className="auth-lock-icon"><Lock size={24} /></div>
              <h2 className="auth-title">Welcome Back</h2>
              <p className="auth-subtitle">Enter your password to continue</p>
            </div>
            <div className="auth-form">
              <PassField
                label="Password"
                value={password}
                onChange={(v) => { setPassword(v); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter your password"
                error={error}
                autoFocus
              />
              {hintText && (
                <div className="auth-hint"><Shield size={11} /> Hint: {hintText}</div>
              )}
              <Button variant="primary" fullWidth onClick={handleLogin} loading={loading}>Unlock</Button>
              <button className="auth-link" onClick={() => { setView('forgot'); setError(''); setPassword(''); }}>
                Forgot password?
              </button>
            </div>
          </>
        )}

        {view === 'setup' && (
          <>
            <div className="auth-header">
              <div className="auth-lock-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}><Shield size={24} /></div>
              <h2 className="auth-title">Set Up Password</h2>
              <p className="auth-subtitle">Protect your data with a local password</p>
            </div>
            <div className="auth-form">
              <PassField label="New Password" value={newPassword} onChange={(v) => { setNewPassword(v); setError(''); }} placeholder="At least 4 characters" />
              <PassField label="Confirm Password" value={confirmPassword} onChange={(v) => { setConfirmPassword(v); setError(''); }} placeholder="Repeat password" />
              <Input label="Password Hint (optional)" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="A hint to remember" hint="Shown on the login screen" />
              {error && <div className="auth-error">{error}</div>}
              <Button variant="primary" fullWidth onClick={handleSetup} loading={loading}>Set Password &amp; Continue</Button>
              <button className="auth-link" onClick={() => onAuthenticated()}>Skip for now (not recommended)</button>
            </div>
          </>
        )}

        {view === 'forgot' && (
          <>
            <div className="auth-header">
              <div className="auth-lock-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}><AlertTriangle size={24} /></div>
              <h2 className="auth-title">Forgot Password</h2>
              <p className="auth-subtitle">Your invoice data stays safe. This only removes password protection.</p>
            </div>
            <div className="auth-form">
              <div className="auth-warning"><AlertTriangle size={13} /><span>Password protection will be removed. All your data remains intact.</span></div>
              <Button variant="danger" fullWidth onClick={handleReset} loading={loading}>Remove Password Protection</Button>
              <button className="auth-link" onClick={() => { setView('login'); setError(''); }}>Back to login</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
