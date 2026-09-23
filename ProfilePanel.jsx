import { useState } from 'react';
import { api } from '../api';

export default function ProfilePanel({ token, profile, onClose, onUpdated }) {
  const [name, setName] = useState(profile.name || '');
  const [status, setStatus] = useState(profile.status || '');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.updateProfile(token, { name, status, newPassword: newPassword || undefined });
      onUpdated(res.profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Your profile</h2>
        <p className="modal-subtitle">{profile.phone}</p>

        <form onSubmit={handleSave} className="auth-form">
          <label className="field">
            <span>Display name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="field">
            <span>Status message</span>
            <input type="text" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="What's up?" />
          </label>

          <label className="field">
            <span>New password (optional)</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
            />
          </label>

          {error && <div className="banner banner-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
