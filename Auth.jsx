import { useState } from 'react';
import { api } from '../api';

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        await api.signup(phone, password, name);
        setNotice('Account created. You can log in now.');
        setMode('login');
        setPassword('');
      } else {
        const res = await api.login(phone, password);
        onAuthenticated(res.token, res.profile);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">Wire</h1>
        <p className="auth-subtitle">Message people by phone number. Nothing else to remember.</p>

        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => { setMode('login'); setError(''); setNotice(''); }}
            type="button"
          >
            Log in
          </button>
          <button
            className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => { setMode('signup'); setError(''); setNotice(''); }}
            type="button"
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <label className="field">
              <span>Display name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alice"
              />
            </label>
          )}

          <label className="field">
            <span>Phone number</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+15551234567"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 4 characters"
              required
            />
          </label>

          {error && <div className="banner banner-error">{error}</div>}
          {notice && <div className="banner banner-notice">{notice}</div>}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
