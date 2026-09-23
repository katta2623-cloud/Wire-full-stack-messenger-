import { useState, useEffect, useCallback } from 'react';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import './index.css';

const STORAGE_KEY = 'messenger_session';

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  const handleAuthenticated = useCallback((token, profile) => {
    setSession({ token, profile });
  }, []);

  const handleProfileUpdate = useCallback((profile) => {
    setSession((s) => (s ? { ...s, profile } : s));
  }, []);

  const handleLogout = useCallback(() => {
    setSession(null);
  }, []);

  if (!session) {
    return <Auth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <Dashboard
      token={session.token}
      profile={session.profile}
      onProfileUpdate={handleProfileUpdate}
      onLogout={handleLogout}
    />
  );
}
