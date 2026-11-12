// server.js - frontend NoteBoard
// Tugasnya: (1) menyajikan file HTML/CSS/JS di folder public,
//           (2) meneruskan semua request /api/* ke service backend.
// Jadi browser cukup bicara ke satu alamat, dan alamat backend ada di env BACKEND_URL.
const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const pkg = require('./package.json');

const PORT = Number(process.env.PORT) || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const APP_ENV = process.env.APP_ENV || 'development';
const backend = new URL(BACKEND_URL);

function log(level, msg, extra = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...extra });
  (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
}

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  const mulai = Date.now();
  res.on('finish', () => {
    log('info', 'request', { method: req.method, path: req.originalUrl, status: res.statusCode, ms: Date.now() - mulai });
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'frontend', uptime_seconds: Math.floor(process.uptime()) });
});

// info frontend untuk halaman Tentang
app.get('/frontend-info', (req, res) => {
  res.json({
    service: 'frontend',
    version: pkg.version,
    env: APP_ENV,
    hostname: os.hostname(),
    uid: typeof process.getuid === 'function' ? process.getuid() : null,
    node: process.version,
    port: PORT,
    backend_url: BACKEND_URL,
    uptime_seconds: Math.floor(process.uptime()),
  });
});

// teruskan /api/* ke backend (body tidak diubah, cukup di-pipe)
app.use('/api', (req, res) => {
  const opsi = {
    hostname: backend.hostname,
    port: backend.port || 80,
    path: req.originalUrl,
    method: req.method,
    headers: { ...req.headers, host: backend.host },
    timeout: 5000,
  };

  const kirim = http.request(opsi, (balasan) => {
    res.writeHead(balasan.statusCode, balasan.headers);
    balasan.pipe(res);
  });

  kirim.on('timeout', () => kirim.destroy(new Error('timeout')));
  kirim.on('error', (err) => {
    log('error', 'gagal menghubungi backend', { backend: BACKEND_URL, error: err.message });
    if (!res.headersSent) res.status(502).json({ error: 'Backend tidak dapat dihubungi.' });
  });

  req.pipe(kirim);
});

// extensions: ['html'] -> /about membuka about.html
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.use((req, res) => {
  res.status(404).send('Halaman tidak ditemukan. <a href="/">Kembali</a>');
});

const server = app.listen(PORT, '0.0.0.0', () => {
  log('info', 'frontend jalan', { port: PORT, env: APP_ENV, backend_url: BACKEND_URL, version: pkg.version });
});

function matikan(signal) {
  log('info', 'sinyal diterima, server dimatikan', { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', () => matikan('SIGTERM'));
process.on('SIGINT', () => matikan('SIGINT'));
