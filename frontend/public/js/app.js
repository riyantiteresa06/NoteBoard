// app.js - logika halaman papan catatan.
// Semua data diambil dari backend lewat /api/... (diteruskan oleh server frontend).

const KATEGORI = ['Kuliah', 'Tugas', 'Ide', 'Pribadi'];

const form = document.getElementById('form-catatan');
const judulForm = document.getElementById('judul-form');
const btnSimpan = document.getElementById('btn-simpan');
const btnBatal = document.getElementById('btn-batal');
const pesan = document.getElementById('pesan');
const papan = document.getElementById('papan');
const ringkasan = document.getElementById('ringkasan');
const filterBox = document.getElementById('filter');
const cari = document.getElementById('cari');

let kategoriAktif = '';
let idEdit = null; // kalau tidak null berarti form sedang dipakai untuk edit

// pembungkus fetch supaya error dari backend gampang ditampilkan
async function api(url, opsi = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opsi,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan (' + res.status + ')');
  return data;
}

function tampilPesan(teks, salah) {
  pesan.textContent = teks;
  pesan.className = 'pesan ' + (salah ? 'salah' : 'benar');
}

// bikin elemen dengan textContent (bukan innerHTML) supaya isi catatan aman dari XSS
function buat(tag, kelas, teks) {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
}

function tanggal(iso) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
}

function kartu(n) {
  const k = buat('article', 'catatan ' + n.category + (n.pinned ? ' pin' : ''));
  k.appendChild(buat('div', 'kat', n.category + (n.pinned ? ' (disematkan)' : '')));
  k.appendChild(buat('h3', '', n.title));
  k.appendChild(buat('p', '', n.text));

  let info = n.author + ', ' + tanggal(n.createdAt);
  if (n.updatedAt !== n.createdAt) info += ' (diedit ' + tanggal(n.updatedAt) + ')';
  k.appendChild(buat('div', 'info', info));

  const tombol = buat('div', 'tombol');
  const bPin = buat('button', '', n.pinned ? 'Lepas sematan' : 'Sematkan');
  const bEdit = buat('button', '', 'Edit');
  const bHapus = buat('button', 'hapus', 'Hapus');
  bPin.onclick = () => sematkan(n.id);
  bEdit.onclick = () => mulaiEdit(n);
  bHapus.onclick = () => hapus(n);
  tombol.append(bPin, bEdit, bHapus);
  k.appendChild(tombol);
  return k;
}

async function muatCatatan() {
  const params = new URLSearchParams();
  if (cari.value.trim()) params.set('q', cari.value.trim());
  if (kategoriAktif) params.set('category', kategoriAktif);

  try {
    const daftar = await api('/api/notes?' + params.toString());
    papan.replaceChildren();
    if (daftar.length === 0) {
      const adaFilter = cari.value.trim() || kategoriAktif;
      papan.appendChild(buat('p', 'kosong', adaFilter
        ? 'Tidak ada catatan yang cocok dengan pencarian ini.'
        : 'Papan masih kosong. Tulis catatan pertama di formulir atas.'));
    } else {
      daftar.forEach((n) => papan.appendChild(kartu(n)));
    }
  } catch (err) {
    papan.replaceChildren(buat('p', 'kosong', 'Gagal memuat catatan: ' + err.message));
  }
}

async function muatStatistik() {
  try {
    const s = await api('/api/stats');
    ringkasan.textContent = s.total + ' catatan, ' + s.pinned + ' disematkan';

    filterBox.replaceChildren();
    const semua = [['', 'Semua (' + s.total + ')']].concat(
      KATEGORI.map((k) => [k, k + ' (' + (s.perKategori[k] || 0) + ')'])
    );
    semua.forEach(([nilai, label]) => {
      const b = buat('button', '', label);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(nilai === kategoriAktif));
      b.onclick = () => { kategoriAktif = nilai; muatSemua(); };
      filterBox.appendChild(b);
    });
  } catch (err) {
    ringkasan.textContent = 'Statistik tidak bisa dimuat.';
  }
}

function muatSemua() {
  muatStatistik();
  muatCatatan();
}

function resetForm() {
  idEdit = null;
  form.reset();
  judulForm.textContent = 'Tulis catatan baru';
  btnSimpan.textContent = 'Simpan catatan';
  btnBatal.hidden = true;
}

function mulaiEdit(n) {
  idEdit = n.id;
  form.title.value = n.title;
  form.author.value = n.author;
  form.category.value = n.category;
  form.text.value = n.text;
  judulForm.textContent = 'Edit catatan';
  btnSimpan.textContent = 'Simpan perubahan';
  btnBatal.hidden = false;
  tampilPesan('', false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  form.title.focus();
}

async function sematkan(id) {
  try {
    await api('/api/notes/' + id + '/pin', { method: 'PATCH' });
    muatSemua();
  } catch (err) {
    tampilPesan(err.message, true);
  }
}

async function hapus(n) {
  if (!confirm('Hapus catatan "' + n.title + '"?')) return;
  try {
    await api('/api/notes/' + n.id, { method: 'DELETE' });
    if (idEdit === n.id) resetForm();
    tampilPesan('Catatan dihapus.', false);
    muatSemua();
  } catch (err) {
    tampilPesan(err.message, true);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const isi = {
    title: form.title.value,
    author: form.author.value,
    category: form.category.value,
    text: form.text.value,
  };
  try {
    if (idEdit) {
      await api('/api/notes/' + idEdit, { method: 'PUT', body: JSON.stringify(isi) });
      tampilPesan('Perubahan disimpan.', false);
    } else {
      await api('/api/notes', { method: 'POST', body: JSON.stringify(isi) });
      tampilPesan('Catatan disimpan.', false);
    }
    // nama penulis dibiarkan terisi supaya tidak perlu mengetik ulang
    const nama = isi.author;
    resetForm();
    form.author.value = nama;
    muatSemua();
  } catch (err) {
    tampilPesan(err.message, true);
  }
});

btnBatal.addEventListener('click', () => {
  resetForm();
  tampilPesan('', false);
});

// pencarian: tunggu 300 ms setelah berhenti mengetik
let timer;
cari.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(muatCatatan, 300);
});

muatSemua();
