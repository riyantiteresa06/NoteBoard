# NoteBoard (versi microservices)

Papan catatan dengan dua service terpisah yang dijalankan sebagai container Podman:

- `backend/`  : REST API (Node.js + Express), port 3000, menyimpan data di `DATA_DIR/notes.json`
- `frontend/` : halaman HTML/CSS/JS yang disajikan Express, port 8080, meneruskan `/api/*` ke backend

```
Browser -> noteboard-frontend (8080) -> noteboard-backend (3000) -> volume noteboard-data (/data/notes.json)
```

Bagian stateless: container frontend dan proses backend. Bagian stateful: `/data/notes.json` (disimpan di volume).

## Struktur proyek

```
backend/   server.js, store.js, package.json, Containerfile, Containerfile.unoptimized, .containerignore
frontend/  server.js, package.json, Containerfile, .containerignore, public/ (index.html, about.html, css, js)
```

Halaman dan endpoint:

| Service  | Path                  | Fungsi                                 |
| -------- | --------------------- | -------------------------------------- |
| frontend | `/`                   | Papan catatan                          |
| frontend | `/about`              | Halaman Tentang (hostname, UID, env)   |
| frontend | `/health`             | Pemeriksaan kesehatan frontend         |
| backend  | `/api/notes`          | CRUD catatan, cari, filter kategori    |
| backend  | `/api/notes/:id/pin`  | Sematkan / lepas sematan               |
| backend  | `/api/info`, `/api/stats`, `/health` | Info runtime, statistik, health |

## Build dan run dengan Podman

Jalankan dari folder utama proyek (yang berisi `backend/` dan `frontend/`).

1. Build image:

        podman build -t noteboard-backend:1.0.0 ./backend
        podman build -t noteboard-frontend:1.0.0 ./frontend
        podman images

2. Buat network dan volume:

        podman network create noteboard-net
        podman volume create noteboard-data

3. Jalankan container:

        podman run -d --name noteboard-backend --network noteboard-net \
          -p 3000:3000 -v noteboard-data:/data -e APP_ENV=lab \
          noteboard-backend:1.0.0

        podman run -d --name noteboard-frontend --network noteboard-net \
          -p 8080:8080 -e APP_ENV=lab -e BACKEND_URL=http://noteboard-backend:3000 \
          noteboard-frontend:1.0.0

        podman ps

4. Buka http://localhost:8080 (papan) dan http://localhost:8080/about (info kedua container).

5. Pemeriksaan cepat:

        curl http://localhost:8080/health
        curl http://localhost:3000/health
        curl http://localhost:8080/api/notes

## Mengelola container

    podman logs noteboard-backend
    podman logs noteboard-frontend
    podman inspect noteboard-backend --format '{{.Config.Env}}'
    podman inspect noteboard-backend --format '{{.Config.User}}'
    podman exec -it noteboard-backend sh        # di dalam: whoami, id, ls -l /data, exit
    podman stop noteboard-frontend noteboard-backend
    podman start noteboard-backend noteboard-frontend
    podman rm -f noteboard-frontend noteboard-backend   # volume noteboard-data tetap ada
    podman volume ls

Data catatan tetap ada setelah container dihapus dan dibuat ulang, karena disimpan di volume `noteboard-data`.

## Optimasi dan keamanan image

- Base image `node:22-alpine`, dependency dipasang dengan `npm install --omit=dev`, cache npm dibersihkan pada perintah `RUN` yang sama.
- `package.json` disalin sebelum kode supaya layer dependency bisa dipakai ulang dari cache.
- Proses berjalan sebagai user `node` (non-root). Cek: `podman run --rm noteboard-backend:1.0.0 id`
- `.containerignore` menolak `node_modules`, `data/`, `.env`, `*.pem`, dan `*.key`.
- Tidak ada password atau token di kode maupun image.
- Pembanding ukuran (bukan untuk dikumpulkan):

        podman build -f backend/Containerfile.unoptimized -t noteboard-backend:unoptimized ./backend
        podman images
        podman history noteboard-backend:1.0.0

## Push dan pull ke registry (Quay.io)

Ganti `USERNAME` dengan username Quay.io.

    podman login quay.io
    podman tag noteboard-backend:1.0.0  quay.io/USERNAME/noteboard-backend:1.0.0
    podman tag noteboard-frontend:1.0.0 quay.io/USERNAME/noteboard-frontend:1.0.0
    podman push quay.io/USERNAME/noteboard-backend:1.0.0
    podman push quay.io/USERNAME/noteboard-frontend:1.0.0

Atur kedua repository menjadi public di quay.io. Untuk menjalankan dari image hasil pull:

    podman pull quay.io/USERNAME/noteboard-backend:1.0.0
    podman pull quay.io/USERNAME/noteboard-frontend:1.0.0

    podman run -d --name noteboard-backend --network noteboard-net \
      -p 3000:3000 -v noteboard-data:/data -e APP_ENV=lab \
      quay.io/USERNAME/noteboard-backend:1.0.0

    podman run -d --name noteboard-frontend --network noteboard-net \
      -p 8080:8080 -e APP_ENV=lab -e BACKEND_URL=http://noteboard-backend:3000 \
      quay.io/USERNAME/noteboard-frontend:1.0.0

## Menjalankan di VS Code (tanpa container, untuk coba dulu)

Butuh Node.js 18 ke atas. Buka dua terminal.

Terminal 1 (backend):

    cd backend
    npm install
    npm start

Terminal 2 (frontend):

    cd frontend
    npm install
    npm start

Buka http://localhost:8080. Data tersimpan di `backend/data/notes.json`.

## Environment variable

| Service  | Nama          | Default di image                | Fungsi                                  |
| -------- | ------------- | ------------------------------- | --------------------------------------- |
| backend  | `PORT`        | `3000`                          | port yang didengarkan                   |
| backend  | `DATA_DIR`    | `/data`                         | lokasi `notes.json` (dipasang volume)   |
| backend  | `APP_ENV`     | `production`                    | label lingkungan                        |
| frontend | `PORT`        | `8080`                          | port yang didengarkan                   |
| frontend | `BACKEND_URL` | `http://noteboard-backend:3000` | alamat backend                          |
| frontend | `APP_ENV`     | `production`                    | label lingkungan                        |

Tidak ada password atau token di kode maupun image.
