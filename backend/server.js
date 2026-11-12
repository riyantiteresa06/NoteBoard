// server.js - backend NoteBoard (REST API dengan Express)
const express = require('express');
const os = require('os');
const store = require('./store');
const pkg = require('./package.json');

const PORT = Number(process.env.PORT) || 3000;
const APP_ENV = process.env.APP_ENV || 'development';
const startedAt = Date.now();

// log satu baris JSON, nanti dibaca pakai `podman logs`
function log(level, msg, extra = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...extra });
  (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
}

const app = express();
app.disable('x-powered-by');

// catat setiap request yang masuk
app.use((req, res, next) => {
  const mulai = Date.now();
  res.on('finish', () => {
    log('info', 'request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - mulai,
      from: req.ip,
    });
  });
  next();
});

app.use(express.json({ limit: '10kb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend', uptime_seconds: Math.floor(process.uptime()) });
});

app.get('/api/info', (req, res) => {
  res.json({
    service: 'backend',
    version: pkg.version,
    env: APP_ENV,
    hostname: os.hostname(),
    uid: typeof process.getuid === 'function' ? process.getuid() : null,
    node: process.version,
    port: PORT,
    data_dir: store.DATA_DIR,
    jumlah_catatan: store.readNotes().length,
    uptime_seconds: Math.floor(process.uptime()),
    started_at: new Date(startedAt).toISOString(),
  });
});

app.get('/api/stats', (req, res) => {
  res.json(store.stats(store.readNotes()));
});

// lihat + cari catatan: /api/notes?q=kata&category=Tugas
app.get('/api/notes', (req, res) => {
  const hasil = store.filterNotes(store.readNotes(), req.query.q, req.query.category);
  res.json(store.sortNotes(hasil));
});

app.post('/api/notes', (req, res) => {
  const { error, data } = store.validate(req.body);
  if (error) return res.status(400).json({ error });

  const notes = store.readNotes();
  if (notes.length >= store.MAX_NOTES) {
    return res.status(400).json({ error: 'Papan penuh (maksimal ' + store.MAX_NOTES + ' catatan). Hapus yang lama dulu.' });
  }

  const sekarang = new Date().toISOString();
  const note = { id: store.newId(), ...data, pinned: false, createdAt: sekarang, updatedAt: sekarang };
  notes.push(note);
  store.saveNotes(notes);
  res.status(201).json(note);
});

app.put('/api/notes/:id', (req, res) => {
  const { error, data } = store.validate(req.body);
  if (error) return res.status(400).json({ error });

  const notes = store.readNotes();
  const i = notes.findIndex((n) => n.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Catatan tidak ditemukan.' });

  notes[i] = { ...notes[i], ...data, updatedAt: new Date().toISOString() };
  store.saveNotes(notes);
  res.json(notes[i]);
});

// sematkan / lepas sematan
app.patch('/api/notes/:id/pin', (req, res) => {
  const notes = store.readNotes();
  const note = notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Catatan tidak ditemukan.' });

  note.pinned = !note.pinned;
  store.saveNotes(notes);
  res.json(note);
});

app.delete('/api/notes/:id', (req, res) => {
  const notes = store.readNotes();
  const sisa = notes.filter((n) => n.id !== req.params.id);
  if (sisa.length === notes.length) return res.status(404).json({ error: 'Catatan tidak ditemukan.' });

  store.saveNotes(sisa);
  res.json({ message: 'Catatan dihapus.' });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ada.' });
});

// penanganan error (body bukan JSON, terlalu besar, dll)
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Data terlalu besar.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Format JSON tidak valid.' });
  log('error', 'error tak terduga', { error: err.message, path: req.originalUrl });
  res.status(500).json({ error: 'Terjadi kesalahan di server.' });
});

// 0.0.0.0 supaya bisa diakses lewat port mapping / jaringan container
const server = app.listen(PORT, '0.0.0.0', () => {
  log('info', 'backend jalan', { port: PORT, env: APP_ENV, data_dir: store.DATA_DIR, version: pkg.version });
});

// biar `podman stop` berhenti rapi, bukan menunggu di-kill
function matikan(signal) {
  log('info', 'sinyal diterima, server dimatikan', { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', () => matikan('SIGTERM'));
process.on('SIGINT', () => matikan('SIGINT'));
