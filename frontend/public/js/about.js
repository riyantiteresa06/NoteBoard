// about.js - menampilkan info runtime frontend dan backend

function detik(s) {
  const j = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return j + ' jam ' + m + ' menit ' + (s % 60) + ' detik';
}

function isiTabel(id, baris) {
  const tabel = document.getElementById(id);
  tabel.replaceChildren();
  baris.forEach(([k, v]) => {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    const td2 = document.createElement('td');
    td1.textContent = k;
    td2.textContent = v === null || v === undefined ? '-' : v;
    tr.append(td1, td2);
    tabel.appendChild(tr);
  });
}

async function ambil(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('status ' + res.status);
  return res.json();
}

ambil('/frontend-info')
  .then((d) => isiTabel('tabel-frontend', [
    ['Hostname (ID container)', d.hostname],
    ['Dijalankan sebagai UID', d.uid],
    ['Versi', d.version],
    ['Lingkungan (APP_ENV)', d.env],
    ['Versi Node.js', d.node],
    ['Port (PORT)', d.port],
    ['Alamat backend (BACKEND_URL)', d.backend_url],
    ['Uptime', detik(d.uptime_seconds)],
  ]))
  .catch((e) => isiTabel('tabel-frontend', [['Error', e.message]]));

ambil('/api/info')
  .then((d) => isiTabel('tabel-backend', [
    ['Hostname (ID container)', d.hostname],
    ['Dijalankan sebagai UID', d.uid],
    ['Versi', d.version],
    ['Lingkungan (APP_ENV)', d.env],
    ['Versi Node.js', d.node],
    ['Port (PORT)', d.port],
    ['Folder data (DATA_DIR)', d.data_dir],
    ['Jumlah catatan tersimpan', d.jumlah_catatan],
    ['Uptime', detik(d.uptime_seconds)],
  ]))
  .catch(() => isiTabel('tabel-backend', [['Status', 'Backend tidak dapat dihubungi']]));
