import { useEffect, useRef, useState } from 'react';
import { wsUrl } from '../api';

// Connects to the server's WebSocket endpoint and calls onDeliver for every
// pushed message. Reconnects automatically if the connection drops.
export function useLiveMessages(token, onDeliver) {
  const [connected, setConnected] = useState(false);
  const onDeliverRef = useRef(onDeliver);
  onDeliverRef.current = onDeliver;

  useEffect(() => {
    if (!token) return;

    let socket;
    let reconnectTimer;
    let closedByEffect = false;

    function connect() {
      socket = new WebSocket(wsUrl(token));

      socket.onopen = () => setConnected(true);

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'DELIVER') {
            onDeliverRef.current({ id: msg.id, from: msg.from, text: msg.text, ts: msg.ts });
          }
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        setConnected(false);
        if (!closedByEffect) {
          reconnectTimer = setTimeout(connect, 1500);
        }
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      closedByEffect = true;
      clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, [token]);

  return connected;
}
