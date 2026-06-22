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

const requireOrg = (req, res, next) => {
  const orgId = req.headers['x-organization-id'];
  if (!orgId) {
    return res.status(400).json({ error: 'x-organization-id header is required' });
  }
  req.orgId = orgId;
  next();
};

// Global Sessions Map: organizationId -> SessionData
const sessions = new Map();
// SessionData = { sock, isReady, qrCodeData }

// Custom Postgres Auth State per organization
async function usePostgresAuthState(pool, orgId) {
  const readData = async (id) => {
    try {
      const res = await pool.query('SELECT data FROM "WhatsAppSession" WHERE id = $1', [`${orgId}:${id}`]);
      if (res.rows.length > 0) {
        return JSON.parse(res.rows[0].data, BufferJSON.reviver);
      }
    } catch (e) {
      console.error(`[${orgId}] Error reading auth state:`, e.message);
    }
    return null;
  };

  const writeData = async (data, id) => {
    try {
      const json = JSON.stringify(data, BufferJSON.replacer);
      await pool.query(
        'INSERT INTO "WhatsAppSession" (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
        [`${orgId}:${id}`, json]
      );
    } catch (e) {
      console.error(`[${orgId}] Error writing auth state:`, e.message);
    }
  };

  const removeData = async (id) => {
    try {
      await pool.query('DELETE FROM "WhatsAppSession" WHERE id = $1', [`${orgId}:${id}`]);
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

async function startSock(orgId) {
  if (!DB_URL) {
    console.error("DATABASE_URL is missing! Cannot connect to Postgres Auth State.");
    return null;
  }

  // Initialize session object if not exists
  if (!sessions.has(orgId)) {
    sessions.set(orgId, { sock: null, isReady: false, qrCodeData: null });
  }
  const session = sessions.get(orgId);

  const { state, saveCreds } = await usePostgresAuthState(pool, orgId);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`[${orgId}] Using WA v${version.join('.')}, isLatest: ${isLatest}`);

  let browserName = 'Campiña Planner';
  try {
    const res = await pool.query('SELECT name FROM "Organization" WHERE id = $1', [orgId]);
    if (res.rows.length > 0) {
      browserName = res.rows[0].name;
    }
  } catch (e) {
    console.error(`[${orgId}] Error fetching org name:`, e.message);
  }

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }), // Suppress logs
    printQRInTerminal: false,
    auth: state,
    syncFullHistory: false,
    browser: [browserName, 'Campiña Planner', '1.0.0'],
  });

  session.sock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[${orgId}] QR Code received, waiting for scan...`);
      session.qrCodeData = qr;
      session.isReady = false;
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[${orgId}] Connection closed due to`, lastDisconnect.error, ', reconnecting:', shouldReconnect);
      session.isReady = false;
      session.qrCodeData = null;
      
      if (shouldReconnect) {
        startSock(orgId);
      } else {
        // If logged out, remove session so it can be re-scanned
        sessions.delete(orgId);
      }
    } else if (connection === 'open') {
      console.log(`[${orgId}] WhatsApp Client is ready!`);
      session.isReady = true;
      session.qrCodeData = null;
    }
  });

  // Ignore incoming messages to save memory
  sock.ev.on('messages.upsert', () => {});

  return session;
}

// Auto-load all existing authenticated sessions on startup
async function loadSessions() {
  if (!DB_URL) return;
  try {
    // Find all unique orgIds that have a 'creds' entry
    const res = await pool.query('SELECT id FROM "WhatsAppSession" WHERE id LIKE \'%:creds\'');
    const orgIds = res.rows.map(row => row.id.split(':')[0]);
    console.log(`Found ${orgIds.length} existing WhatsApp sessions to auto-load.`);
    for (const orgId of orgIds) {
      if (orgId) await startSock(orgId);
    }
  } catch (error) {
    console.error('Failed to auto-load sessions:', error.message);
  }
}

loadSessions();

// API Endpoints
app.get('/api/qr', requireAuth, requireOrg, async (req, res) => {
  const { orgId } = req;
  
  let session = sessions.get(orgId);
  if (!session) {
    session = await startSock(orgId);
    return res.json({ status: 'starting', message: 'Iniciando cliente, por favor espera...' });
  }

  if (session.isReady) return res.json({ status: 'connected', message: 'Ya estás conectado a WhatsApp.' });
  if (!session.qrCodeData) return res.json({ status: 'starting', message: 'Iniciando cliente, por favor espera...' });

  try {
    const qrImage = await qrcode.toDataURL(session.qrCodeData);
    res.json({ status: 'scan_required', qr: qrImage, raw: session.qrCodeData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code image' });
  }
});

app.get('/api/status', requireAuth, requireOrg, (req, res) => {
  const session = sessions.get(req.orgId);
  res.json({ connected: session ? session.isReady : false });
});

app.post('/api/send', requireAuth, requireOrg, async (req, res) => {
  const { orgId } = req;
  const session = sessions.get(orgId);

  if (!session || !session.isReady || !session.sock) {
    return res.status(503).json({ error: 'WhatsApp client not ready for this organization' });
  }

  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'Phone and message are required' });

  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const chatId = `${cleanPhone}@s.whatsapp.net`;
    
    await session.sock.sendMessage(chatId, { text: message });
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error(`[${orgId}] Error sending message:`, error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

app.delete('/api/session', requireAuth, requireOrg, async (req, res) => {
  const { orgId } = req;
  const session = sessions.get(orgId);
  
  let remoteLogoutSuccess = false;
  let errorMsg = null;

  if (session && session.sock) {
    try {
      // This sends the actual unpair command to WhatsApp servers
      await session.sock.logout();
      remoteLogoutSuccess = true;
    } catch (e) {
      console.error(`[${orgId}] Error during remote logout:`, e.message);
      errorMsg = 'Error de conexión con WhatsApp al intentar desvincular.';
    }
  } else {
    errorMsg = 'El bot estaba fuera de línea, solo se borró la sesión local.';
  }
  
  sessions.delete(orgId);
  
  if (DB_URL) {
    try {
      await pool.query('DELETE FROM "WhatsAppSession" WHERE id LIKE $1', [`${orgId}:%`]);
    } catch (e) {
      console.error(`[${orgId}] Error clearing DB session:`, e.message);
    }
  }

  res.json({ 
    success: true, 
    remoteLogoutSuccess,
    message: remoteLogoutSuccess 
      ? 'Desvinculado del celular exitosamente.' 
      : 'Borrador local. ' + (errorMsg || '')
  });
});

app.listen(PORT, () => {
  console.log(`WhatsApp Bot listening on port ${PORT}`);
});
