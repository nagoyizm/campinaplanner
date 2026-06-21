require('dotenv').config();
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion, initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY || 'campina-secret-key-123';
const PORT = process.env.PORT || 3001;
const DB_URL = process.env.DATABASE_URL;

// PostgreSQL connection
const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false }
});

// Auth middleware
const requireAuth = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

let qrCodeData = null;
let isReady = false;
let sock = null;

// Custom Postgres Auth State
async function usePostgresAuthState(pool) {
  const readData = async (id) => {
    try {
      const res = await pool.query('SELECT data FROM "WhatsAppSession" WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        return JSON.parse(res.rows[0].data, BufferJSON.reviver);
      }
    } catch (e) {
      console.error('Error reading auth state:', e.message);
    }
    return null;
  };

  const writeData = async (data, id) => {
    try {
      const json = JSON.stringify(data, BufferJSON.replacer);
      await pool.query(
        'INSERT INTO "WhatsAppSession" (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
        [id, json]
      );
    } catch (e) {
      console.error('Error writing auth state:', e.message);
    }
  };

  const removeData = async (id) => {
    try {
      await pool.query('DELETE FROM "WhatsAppSession" WHERE id = $1', [id]);
    } catch (e) {}
  };

  const creds = await readData('creds') || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(ids.map(async (id) => {
            let value = await readData(`${type}-${id}`);
            if (type === 'app-state-sync-key' && value) {
              value = require('@whiskeysockets/baileys').proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          }));
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              if (value) {
                tasks.push(writeData(value, key));
              } else {
                tasks.push(removeData(key));
              }
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: () => writeData(creds, 'creds')
  };
}

async function startSock() {
  if (!DB_URL) {
    console.error("DATABASE_URL is missing! Cannot connect to Postgres Auth State.");
    return;
  }

  const { state, saveCreds } = await usePostgresAuthState(pool);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }), // Suppress logs
    printQRInTerminal: true,
    auth: state,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('QR Code received, waiting for scan...');
      qrCodeData = qr;
      isReady = false;
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed due to', lastDisconnect.error, ', reconnecting:', shouldReconnect);
      isReady = false;
      qrCodeData = null;
      
      if (shouldReconnect) {
        startSock();
      }
    } else if (connection === 'open') {
      console.log('WhatsApp Client is ready!');
      isReady = true;
      qrCodeData = null;
    }
  });

  // Ignore incoming messages to save memory
  sock.ev.on('messages.upsert', () => {});
}

startSock();

// API Endpoints
app.get('/api/qr', requireAuth, async (req, res) => {
  if (isReady) return res.json({ status: 'connected', message: 'Ya estás conectado a WhatsApp.' });
  if (!qrCodeData) return res.json({ status: 'starting', message: 'Iniciando cliente, por favor espera...' });

  try {
    const qrImage = await qrcode.toDataURL(qrCodeData);
    res.json({ status: 'scan_required', qr: qrImage, raw: qrCodeData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code image' });
  }
});

app.get('/api/status', requireAuth, (req, res) => {
  res.json({ connected: isReady });
});

app.post('/api/send', requireAuth, async (req, res) => {
  if (!isReady || !sock) return res.status(503).json({ error: 'WhatsApp client not ready' });

  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'Phone and message are required' });

  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const chatId = `${cleanPhone}@s.whatsapp.net`;
    
    await sock.sendMessage(chatId, { text: message });
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsApp Bot listening on port ${PORT}`);
});
