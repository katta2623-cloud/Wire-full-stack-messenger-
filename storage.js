// storage.js
// File-based persistence for users and messages. No external DB needed.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');
  if (!fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, '[]');
}

function loadUsers() {
  ensureDataFiles();
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Messages are stored as a flat array: { id, from, to, text, ts, delivered }
function loadMessages() {
  ensureDataFiles();
  return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
}

function saveMessages(messages) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

function appendMessage(msg) {
  const messages = loadMessages();
  messages.push(msg);
  saveMessages(messages);
  return msg;
}

function getConversation(phoneA, phoneB) {
  const messages = loadMessages();
  return messages
    .filter(
      (m) =>
        (m.from === phoneA && m.to === phoneB) || (m.from === phoneB && m.to === phoneA)
    )
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));
}

function getUndeliveredFor(phone) {
  const messages = loadMessages();
  return messages.filter((m) => m.to === phone && !m.delivered);
}

function markDelivered(messageIds) {
  const idSet = new Set(messageIds);
  const messages = loadMessages();
  for (const m of messages) {
    if (idSet.has(m.id)) m.delivered = true;
  }
  saveMessages(messages);
}

// --- Password hashing (scrypt, built into Node's crypto module) ---

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

function isValidPhone(phone) {
  return /^\+?[0-9]{7,15}$/.test(phone);
}

module.exports = {
  loadUsers,
  saveUsers,
  loadMessages,
  saveMessages,
  appendMessage,
  getConversation,
  getUndeliveredFor,
  markDelivered,
  hashPassword,
  verifyPassword,
  isValidPhone,
};
