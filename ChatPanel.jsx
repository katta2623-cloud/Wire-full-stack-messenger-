import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function ChatPanel({ token, myPhone, otherPhone, incomingLive }) {
  const [history, setHistory] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getHistory(token, otherPhone)
      .then((res) => {
        if (!cancelled) setHistory(res.history || []);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, otherPhone]);

  const allMessages = mergeMessages(history, incomingLive, myPhone);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setError('');
    try {
      const res = await api.sendMessage(token, otherPhone, trimmed);
      setHistory((prev) => [...prev, res.sent]);
      setText('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-title">{otherPhone}</div>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {loading && <div className="empty-hint">Loading conversation…</div>}
        {!loading && allMessages.length === 0 && (
          <div className="empty-hint">No messages yet. Say hello.</div>
        )}
        {allMessages.map((m, i) => {
          const mine = m.from === myPhone;
          return (
            <div key={i} className={mine ? 'bubble-row mine' : 'bubble-row'}>
              <div className={mine ? 'bubble mine' : 'bubble'}>
                <div className="bubble-text">{m.text}</div>
                <div className="bubble-time">{formatTime(m.ts)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="banner banner-error chat-error">{error}</div>}

      <form className="chat-input" onSubmit={handleSend}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${otherPhone}`}
        />
        <button type="submit" className="btn btn-primary">Send</button>
      </form>
    </div>
  );
}

// Combines the fetched history with any live-pushed messages, removing
// duplicates (a message can arrive live AND later show up in a re-fetched
// history) and sorting everything into correct chronological order.
function mergeMessages(history, incomingLive, myPhone) {
  const byId = new Map();
  const noId = [];

  for (const m of history) {
    if (m.id) byId.set(m.id, m);
    else noId.push(m);
  }
  for (const m of incomingLive) {
    const withTo = { ...m, to: myPhone };
    if (m.id) {
      if (!byId.has(m.id)) byId.set(m.id, withTo);
    } else {
      noId.push(withTo);
    }
  }

  return [...byId.values(), ...noId].sort((a, b) => new Date(a.ts) - new Date(b.ts));
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
