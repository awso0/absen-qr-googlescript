# Absen-QR — hillaryours.id (Fanbase JKT48)

Landing page **absensi QR** untuk fanbase **hillaryours.id** bertema ungu. QR
di-scan lewat kamera HP, lalu dicatat **absensi masuk** ke Google Spreadsheet
melalui **Apps Script** yang dijadikan **JSON API**.

> ⚠️ **Kenapa dulu kamera tidak bisa dibuka di script Google?**
> Halaman yang di-serve `HtmlService` dimuat Google di dalam **iframe yang
> melarang akses kamera** (`getUserMedia` selalu diblokir). Ini **bukan bug
> kodemu** — batasan Google.
> **Solusinya:** halaman scan dipindah ke web biasa (folder ini) dan **Apps
> Script diubah jadi JSON API** (`ContentService`). Spreadsheet tetap jadi
> database, dan kamera jalan normal karena halaman tidak lagi di dalam iframe
> Apps Script.

---

## Arsitektur

```mermaid
flowchart LR
    A[Pengunjung buka landing page<br/>Vercel/Netlify (HTTPS)] --> B[Scan QR kamera<br/>@zxing/browser]
    B --> C{lookup ID}
    C -->|POST JSON text/plain| D[Apps Script /exec<br/>Code.gs - JSON API]
    D --> E[Spreadsheet<br/>Master Data + Log Absensi]
    C --> F[Layar konfirmasi nama<br/>bisa edit utk titipan]
    F -->|record| D
```

- **Landing page** (folder ini): scan QR + input manual + konfirmasi.
- **Apps Script** (`apps-script/Code.gs`): endpoint `POST` — `ping`, `lookup`,
  `record`. Tidak lagi menyajikan halaman.
- **Spreadsheet**: sumber data (2 sheet — `Master Data` & `Log Absensi`).

---

## Isi folder

```
Absen-QR/
├─ apps-script/
│  ├─ Code.gs            ← ganti isi Code.gs-mu dengan ini (jadi JSON API)
│  └─ SETUP.md           ← langkah deploy Apps Script (baca dulu!)
├─ src/                  ← kode landing page (Vite + TypeScript)
│  ├─ config.ts          ← ISI API_URL (URL /exec) di sini
│  ├─ main.ts            ← entry point
│  ├─ actions.ts         ← logika alur scan / konfirmasi / record
│  ├─ api.ts             ← fetch ke Apps Script (text/plain utk hindari CORS)
│  ├─ scanner.ts         ← wrapper kamera @zxing/browser
│  ├─ state.ts / wire.ts ← state mini + event listener
│  ├─ ui.ts / dom.ts     ← render + helper DOM
│  └─ style.css          ← tema ungu hillaryours.id
├─ index.html
├─ .gitignore
├─ package.json / vite.config.ts / tsconfig.json
├─ vercel.json / netlify.toml
└─ README.md
```

---

## Cara pasang (2 langkah)

### Langkah 1 — Deploy Apps Script jadi JSON API

Panduan detail: **`apps-script/SETUP.md`**. Intinya:

1. Buka <https://script.google.com> → project absensi kamu.
2. Di panel kiri, **hapus file `.gs` lain** (sisakan `Code.gs`) — supaya tidak
   ada deklarasi ganda (`SHEET_MASTER already declared`).
3. Ganti seluruh isi `Code.gs` dengan isi `apps-script/Code.gs`.
4. **Simpan (Ctrl+S)** — pastikan tidak ada error merah.
5. **Deploy → New deployment → ⚙️ Web app**, set **WAJIB**:
   - **Execute as**: `Me` ← akun pemilik spreadsheet (bukan "User accessing")
   - **Who has access**: `Anyone` ← bukan "Anyone with Google account"
6. **Authorize access** (login pemilik).
7. Salin **Web app URL** (berakhiran `/exec`) → isi ke `src/config.ts` →
   `API_URL`.

> ⚠️ **Penting — "New version"**: setiap kali mengubah `Code.gs`, deployment
> lama **tidak otomatis** memakai kode baru. Buka **Deploy → Manage
> deployments → ✏️ Edit** → **Version: New version** → **Deploy**. Kalau tidak,
> kamu akan melihat error dari kode versi lama (mis. `SHEET_MASTER already
> declared`).

### Langkah 2 — Jalankan & deploy landing page

```bash
npm install
npm run dev        # preview lokal → http://localhost:5173
npm run build      # hasil siap deploy ada di dist/
```

**Deploy Vercel** (rekomendasi): import repo → build `npm run build`, output
`dist`. **Deploy Netlify**: build `npm run build`, publish dir `dist`.

> Kamera butuh **HTTPS** (atau `localhost`). Vercel/Netlify sudah HTTPS
> otomatis. Dari HP, gunakan URL HTTPS (bukan `localhost`).

---

## Alur scan

1. Buka landing → **📷 Scan QR** (atau **ketik ID manual**).
2. QR terbaca → `lookup` ke Master Data → layar **konfirmasi**: data member
   tampil + field **Nama bisa diedit** (untuk kasus *titipan*).
3. Klik **Konfirmasi Absen** → `record` → tercatat status **Masuk**.
4. Layar sukses menampilkan ringkasan.

Mode absen: **hanya Masuk** — 1 ID maksimal 1x per hari. Scan berikutnya pada
hari yang sama ditolak ("sudah absen Masuk hari ini").

Aturan (sama seperti script asli):
- **Cooldown 5 detik** anti-scan-ganda per ID.
- **Keterangan**: `Sendiri` kalau nama sama persis dgn Master Data, `Titipan`
  kalau diedit/berbeda.
- ID berstatus **Nonaktif** di Master Data ditolak.

---

## Verifikasi API (setelah deploy)

Buka di browser (incognito) URL `/exec` → harus muncul JSON `{"ok":true,...}`
(bukan halaman login — kalau halaman login berarti belum "Anyone").

Test POST dari PowerShell (ganti URL):

```powershell
$body = '{"action":"ping"}'
curl.exe -X POST "<URL /exec>" -H "Content-Type: text/plain;charset=utf-8" -d $body
# → {"ok":true,"message":"pong"}
```

> Catatan: kalau curl di PowerShell balas `411` saat mengikuti redirect, itu
> artefak curl — coba lewat browser/`fetch`; frontend tidak akan kena masalah
> ini.

---

## Konfigurasi opsional keamanan

- Set **Script property** `API_TOKEN` di Apps Script (**Project Settings →
  Script properties**).
- Isi `API_TOKEN` di `src/config.ts` dengan nilai yang sama.
- Kalau tidak mau pakai token, biarkan kosong di kedua sisi.

---

## Troubleshooting singkat

| Gejala | Penyebab & solusi |
|---|---|
| URL `/exec` minta login Google | Deployment belum **"Anyone"** / **Execute as: Me** → perbaiki di Manage deployments |
| Error `SHEET_MASTER already declared` | Ada file `.gs` dobel / versi lama → hapus file lain, bersihkan `Code.gs`, lalu **New version** di deployment |
| Kamera tidak muncul | Pastikan HTTPS & izin kamera **Allow**; coba tombol **Ganti kamera**; fallback: input manual |
| `ID "..." tidak terdaftar` | ID tidak ada di sheet **Master Data** kolom A, atau format beda (leading zero dll) |
| CORS error di konsol | Pastikan halaman diakses via HTTPS dan Apps Script di-deploy **Anyone** (balas `Access-Control-Allow-Origin: *`) |
