// server.js
// Full-stack messenger backend: REST API (Express) + real-time push (WebSocket).
// Run with: node server.js [port]   (default port 4000)

const express = require('express');
const cors = require('cors');
const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');

const {
  loadUsers,
  saveUsers,
  appendMessage,
  getConversation,
  getUndeliveredFor,
  markDelivered,
  hashPassword,
  verifyPassword,
  isValidPhone,
} = require('./storage');

const PORT = parseInt(process.argv[2], 10) || 4000;

const app = express();
app.use(cors());
app.use(express.json());

// token -> phone   (in-memory session store; resets on server restart)
const sessions = new Map();
// phone -> WebSocket connection (for currently online users)
const liveSockets = new Map();

function newToken() {
  return crypto.randomBytes(24).toString('hex');
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const phone = token && sessions.get(token);
  if (!phone) {
    return res.status(401).json({ error: 'not authenticated' });
  }
  req.phone = phone;
  req.token = token;
  next();
}

function publicProfile(user) {
  return { phone: user.phone, name: user.name, status: user.status };
}

// --- Auth routes ---

app.post('/api/signup', (req, res) => {
  const { phone, password, name } = req.body || {};
  if (!phone || !password) {
    return res.status(400).json({ error: 'phone and password are required' });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: 'invalid phone number format' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'password must be at least 4 characters' });
  }

  const users = loadUsers();
  if (users[phone]) {
    return res.status(409).json({ error: 'an account with this phone number already exists' });
  }

  users[phone] = {
    phone,
    passwordHash: hashPassword(password),
    name: name || '',
    status: '',
    createdAt: new Date().toISOString(),
  };
  saveUsers(users);

  res.status(201).json({ message: `account created for ${phone}` });
});

app.post('/api/login', (req, res) => {
  const { phone, password } = req.body || {};
  const users = loadUsers();
  const user = users[phone];

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'invalid phone number or password' });
  }

  const token = newToken();
  sessions.set(token, phone);

  const undelivered = getUndeliveredFor(phone);

  res.json({
    token,
    profile: publicProfile(user),
    pendingMessages: undelivered.map((m) => ({ from: m.from, text: m.text, ts: m.ts })),
  });

  markDelivered(undelivered.map((m) => m.id));
});

app.post('/api/logout', authMiddleware, (req, res) => {
  sessions.delete(req.token);
  const sock = liveSockets.get(req.phone);
  if (sock) {
    liveSockets.delete(req.phone);
  }
  res.json({ message: 'logged out' });
});

// --- Profile ---

app.get('/api/profile', authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users[req.phone];
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json({ profile: publicProfile(user) });
});

app.put('/api/profile', authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users[req.phone];
  if (!user) return res.status(404).json({ error: 'user not found' });

  const { name, status, newPassword } = req.body || {};
  if (typeof name === 'string') user.name = name;
  if (typeof status === 'string') user.status = status;
  if (typeof newPassword === 'string' && newPassword.length > 0) {
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'password must be at least 4 characters' });
    }
    user.passwordHash = hashPassword(newPassword);
  }

  users[req.phone] = user;
  saveUsers(users);

  res.json({ message: 'profile updated', profile: publicProfile(user) });
});

// --- Messaging ---

app.post('/api/messages', authMiddleware, (req, res) => {
  const { toPhone, text } = req.body || {};
  if (!toPhone || !text) {
    return res.status(400).json({ error: 'toPhone and text are required' });
  }
  if (!isValidPhone(toPhone)) {
    return res.status(400).json({ error: 'invalid recipient phone number format' });
  }

  const users = loadUsers();
  if (!users[toPhone]) {
    return res.status(404).json({ error: `no account is registered with ${toPhone}` });
  }

  const msg = {
    id: crypto.randomUUID(),
    from: req.phone,
    to: toPhone,
    text,
    ts: new Date().toISOString(),
    delivered: false,
  };

  const recipientSocket = liveSockets.get(toPhone);
  if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
    recipientSocket.send(
      JSON.stringify({ type: 'DELIVER', id: msg.id, from: msg.from, text: msg.text, ts: msg.ts })
    );
    msg.delivered = true;
  }

  appendMessage(msg);

  res.status(201).json({ message: `message sent to ${toPhone}`, sent: msg });
});

// Conversation history with a specific phone number
app.get('/api/messages/:otherPhone', authMiddleware, (req, res) => {
  const history = getConversation(req.phone, req.params.otherPhone);
  res.json({ history });
});

// --- Server + WebSocket setup ---

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost`);
  const token = url.searchParams.get('token');
  const phone = token && sessions.get(token);

  if (!phone) {
    ws.close(4001, 'invalid or missing token');
    return;
  }

  liveSockets.set(phone, ws);

  ws.on('close', () => {
    if (liveSockets.get(phone) === ws) {
      liveSockets.delete(phone);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Messenger backend listening on http://localhost:${PORT}`);
});
