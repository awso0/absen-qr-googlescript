# Absen-QR — hillaryours.id (Fanbase JKT48)

Landing page **absensi QR** untuk fanbase **hillaryours.id**. QR di-scan lewat
kamera HP, lalu dicatat masuk/pulang ke Google Spreadsheet melalui **Apps Script**
yang dijadikan JSON API.

> ⚠️ **Kenapa script Google-mu tidak bisa buka kamera?**
> Karena halaman yang di-serve `HtmlService` dimuat Google di dalam **iframe yang
> melarang akses kamera** (`getUserMedia` selalu diblokir). Ini bukan bug di kodemu.
> Solusinya: **halaman scan dipindah ke web biasa** (folder ini), dan **Apps Script
> diubah jadi API JSON** — spreadsheet tetap jadi database. Kamera pun jalan normal.

## Isi folder

```
Absen-QR/
├─ apps-script/
│  ├─ Code.gs            ← ganti isi Code.gs-mu dengan ini (jadi JSON API)
│  └─ SETUP.md           ← langkah deploy Apps Script (baca dulu!)
├─ src/                  ← kode landing page
│  ├─ config.ts          ← ISI API_URL & nama fanbase di sini
│  ├─ main.ts            ← entry point
│  ├─ actions.ts         ← logika alur scan/konfirmasi
│  ├─ api.ts             ← panggilan fetch ke Apps Script
│  ├─ scanner.ts         ← wrapper kamera @zxing
│  ├─ ui.ts / wire.ts    ← render + event
│  └─ style.css          ← tema ungu hillaryours.id
├─ index.html
├─ package.json / vite.config.ts / tsconfig.json
└─ README.md
```

## Cara pakai (2 langkah)

### 1. Deploy Apps Script jadi API
Buka `apps-script/SETUP.md` — intinya:
1. Buka project Apps Script-mu, tempel isi `apps-script/Code.gs` ke `Code.gs`.
2. **Deploy → New deployment → Web app**: `Execute as: Me`, `Who has access: Anyone`.
3. Salin URL `/exec`, tempel ke `src/config.ts` sebagai `API_URL`.
4. Akses URL `/exec` sekali (login Google) supaya "aktif" untuk pengguna lain.

### 2. Jalankan & deploy landing page
```bash
npm install
npm run dev        # preview lokal → http://localhost:5173
npm run build      # hasil siap deploy ada di dist/
```

**Deploy Vercel** (rekomendasi): import repo ini di vercel.com → build `npm run
build`, output `dist`. **Deploy Netlify**: build `npm run build`, publish dir `dist`.

> Kamera butuh **HTTPS** (atau `localhost`). Vercel/Netlify sudah HTTPS otomatis.

## Catatan alur

- Scan / ketik ID → **lookup** ke Master Data → layar konfirmasi (nama bisa
  diedit untuk kasus **titipan**) → **record** → status **Masuk**/**Pulang**
  ditentukan otomatis seperti script aslimu (1 catatan pertama = Masuk,
  kedua = Pulang; cooldown 5 detik; keterangan Sendiri/Titipan otomatis).
- Ada tombol **ganti kamera** (depan/belakang) dan **input manual** sebagai
  fallback kalau kamera bermasalah.

## Konfigurasi opsional keamanan
- Set **Script property** `API_TOKEN` di Apps Script → isi `API_TOKEN` di
  `src/config.ts`. Kalau tidak mau, biarkan kosong di kedua sisi.
