// store.js - baca/tulis catatan ke file JSON + validasi input
// Ini satu-satunya bagian STATEFUL di aplikasi (file notes.json di DATA_DIR)
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'notes.json');

const KATEGORI = ['Kuliah', 'Tugas', 'Ide', 'Pribadi'];
const MAX_NOTES = 200;

function readNotes() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('gagal baca notes.json:', err.message);
    return [];
  }
}

function saveNotes(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // tulis ke file sementara dulu, baru di-rename, supaya file asli tidak setengah rusak
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, FILE);
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// cek isi body dari frontend. Hasilnya { error } atau { data }
function validate(body) {
  const b = body || {};
  const title = String(b.title || '').trim();
  const text = String(b.text || '').trim();
  const author = String(b.author || '').trim();
  const category = String(b.category || 'Pribadi');

  if (!title) return { error: 'Judul wajib diisi.' };
  if (!text) return { error: 'Isi catatan wajib diisi.' };
  if (!author) return { error: 'Nama wajib diisi.' };
  if (title.length > 60) return { error: 'Judul maksimal 60 karakter.' };
  if (text.length > 500) return { error: 'Isi catatan maksimal 500 karakter.' };
  if (author.length > 40) return { error: 'Nama maksimal 40 karakter.' };
  if (!KATEGORI.includes(category)) return { error: 'Kategori tidak dikenal.' };

  return { data: { title, text, author, category } };
}

// pin di atas, sisanya yang paling baru diubah di atas
function sortNotes(list) {
  return list.slice().sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function filterNotes(list, q, category) {
  const kata = String(q || '').trim().toLowerCase();
  return list.filter((n) => {
    if (category && n.category !== category) return false;
    if (!kata) return true;
    return [n.title, n.text, n.author].some((s) => s.toLowerCase().includes(kata));
  });
}

function stats(list) {
  const perKategori = {};
  KATEGORI.forEach((k) => (perKategori[k] = 0));
  list.forEach((n) => (perKategori[n.category] = (perKategori[n.category] || 0) + 1));
  return { total: list.length, pinned: list.filter((n) => n.pinned).length, perKategori };
}

module.exports = { DATA_DIR, KATEGORI, MAX_NOTES, readNotes, saveNotes, newId, validate, sortNotes, filterNotes, stats };
