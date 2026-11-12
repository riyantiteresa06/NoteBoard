# NoteBoard (versi microservices)

Papan catatan dengan dua service terpisah:

- `backend/`  : REST API (Node.js + Express), port 3000, menyimpan data di `DATA_DIR/notes.json`
- `frontend/` : halaman HTML/CSS/JS yang disajikan Express, port 8080, meneruskan `/api/*` ke backend

## Menjalankan di VS Code (tanpa container, untuk coba dulu)

Butuh Node.js 18 ke atas. Buka dua terminal di VS Code (Terminal > New Terminal).

Terminal 1 (backend):

    cd backend
    npm install
    npm start

Terminal 2 (frontend):

    cd frontend
    npm install
    npm start

Buka http://localhost:8080 di browser. Data tersimpan di `backend/data/notes.json`.

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
