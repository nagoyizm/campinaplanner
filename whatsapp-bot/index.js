require('dotenv').config();
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY || 'campina-secret-key-123';
const PORT = process.env.PORT || 3001;

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

// Initialize WhatsApp Client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    headless: true,
  }
});

client.on('qr', (qr) => {
  console.log('QR Code received, waiting for scan...');
  qrCodeData = qr;
  isReady = false;
});

client.on('ready', () => {
  console.log('WhatsApp Client is ready!');
  isReady = true;
  qrCodeData = null;
});

client.on('disconnected', (reason) => {
  console.log('WhatsApp Client disconnected:', reason);
  isReady = false;
  qrCodeData = null;
  // Try to reconnect or restart
  client.initialize();
});

client.initialize();

// API Endpoints

// 1. Get QR Code (returns base64 image or raw string)
app.get('/api/qr', requireAuth, async (req, res) => {
  if (isReady) {
    return res.json({ status: 'connected', message: 'Ya estás conectado a WhatsApp.' });
  }
  if (!qrCodeData) {
    return res.json({ status: 'starting', message: 'Iniciando cliente, por favor espera...' });
  }

  try {
    const qrImage = await qrcode.toDataURL(qrCodeData);
    res.json({ status: 'scan_required', qr: qrImage, raw: qrCodeData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code image' });
  }
});

// 2. Status
app.get('/api/status', requireAuth, (req, res) => {
  res.json({ connected: isReady });
});

// 3. Send Message
app.post('/api/send', requireAuth, async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ error: 'WhatsApp client not ready' });
  }

  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message are required' });
  }

  try {
    // Format phone to whatsapp id (e.g., 56977087353@c.us)
    const cleanPhone = phone.replace(/\D/g, ''); // remove non-digits
    const chatId = `${cleanPhone}@c.us`;
    
    await client.sendMessage(chatId, message);
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsApp Bot listening on port ${PORT}`);
});
