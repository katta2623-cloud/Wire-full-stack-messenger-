import { useState, useCallback, useEffect } from 'react';
import { api } from '../api';
import { useLiveMessages } from '../hooks/useLiveMessages';
import ChatPanel from '../components/ChatPanel';
import ProfilePanel from '../components/ProfilePanel';

const CONTACTS_KEY = 'messenger_contacts';

export default function Dashboard({ token, profile, onProfileUpdate, onLogout }) {
  const [contacts, setContacts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CONTACTS_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [activeContact, setActiveContact] = useState(contacts[0] || null);
  const [newContactPhone, setNewContactPhone] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [error, setError] = useState('');
  const [unread, setUnread] = useState({}); // phone -> count
  const [liveMessages, setLiveMessages] = useState({}); // phone -> [{from,text,ts}]

  useEffect(() => {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  }, [contacts]);

  const addContact = useCallback((phone) => {
    setContacts((prev) => (prev.includes(phone) ? prev : [phone, ...prev]));
  }, []);

  const handleDeliver = useCallback(
    (msg) => {
      addContact(msg.from);
      setLiveMessages((prev) => ({
        ...prev,
        [msg.from]: [...(prev[msg.from] || []), msg],
      }));
      setUnread((prev) => {
        if (activeContact === msg.from) return prev;
        return { ...prev, [msg.from]: (prev[msg.from] || 0) + 1 };
      });
    },
    [addContact, activeContact]
  );

  const connected = useLiveMessages(token, handleDeliver);

  function handleStartConversation(e) {
    e.preventDefault();
    setError('');
    const phone = newContactPhone.trim();
    if (!phone) return;
    addContact(phone);
    setActiveContact(phone);
    setNewContactPhone('');
  }

  function selectContact(phone) {
    setActiveContact(phone);
    setUnread((prev) => ({ ...prev, [phone]: 0 }));
  }

  async function handleLogout() {
    try {
      await api.logout(token);
    } catch {
      // ignore — log out locally regardless
    }
    onLogout();
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <div className="app-name">Wire</div>
            <div className={connected ? 'conn-status online' : 'conn-status offline'}>
              {connected ? 'Connected' : 'Reconnecting…'}
            </div>
          </div>
          <button className="icon-btn" title="Profile" onClick={() => setShowProfile(true)}>
            {(profile.name || profile.phone).slice(0, 1).toUpperCase()}
          </button>
        </div>

        <form className="new-convo" onSubmit={handleStartConversation}>
          <input
            type="tel"
            placeholder="Message a phone number…"
            value={newContactPhone}
            onChange={(e) => setNewContactPhone(e.target.value)}
          />
          <button type="submit" className="btn btn-small">Start</button>
        </form>
        {error && <div className="banner banner-error">{error}</div>}

        <div className="contact-list">
          {contacts.length === 0 && (
            <div className="empty-hint">No conversations yet. Enter a phone number above to start one.</div>
          )}
          {contacts.map((phone) => (
            <button
              key={phone}
              className={phone === activeContact ? 'contact active' : 'contact'}
              onClick={() => selectContact(phone)}
            >
              <span>{phone}</span>
              {unread[phone] > 0 && <span className="unread-badge">{unread[phone]}</span>}
            </button>
          ))}
        </div>

        <button className="btn btn-ghost logout-btn" onClick={handleLogout}>Log out</button>
      </aside>

      <main className="main-panel">
        {activeContact ? (
          <ChatPanel
            key={activeContact}
            token={token}
            myPhone={profile.phone}
            otherPhone={activeContact}
            incomingLive={liveMessages[activeContact] || []}
          />
        ) : (
          <div className="empty-state">
            <h2>No conversation selected</h2>
            <p>Start one from the sidebar by entering a phone number.</p>
          </div>
        )}
      </main>

      {showProfile && (
        <ProfilePanel
          token={token}
          profile={profile}
          onClose={() => setShowProfile(false)}
          onUpdated={(p) => {
            onProfileUpdate(p);
            setShowProfile(false);
          }}
        />
      )}
    </div>
  );
}
