# Setup Apps Script (Backend JSON API)

Script lama kamu di-deploy sebagai **halaman web** (`HtmlService`) — itu sebabnya
kamera tidak bisa dibuka: Google memuat halaman di dalam iframe yang melarang
`getUserMedia`.

Supaya kamera jalan, script ini kita ubah jadi **JSON API** dan halaman scan
dipindah ke web (Vercel/Netlify).

## Langkah

1. Buka project Apps Script kamu: <https://script.google.com>
2. Buka file `Code.gs`, **hapus semua isi**, tempel isi `apps-script/Code.gs`
   dari folder ini (ganti seluruhnya).
3. (Opsional keamanan) Buka **Project Settings → Script properties → Add**:
   - Property: `API_TOKEN` → Value: token rahasia bebas.
   - Kalau diisi, landing page wajib dikirim token (isi di `web/src/config.ts`).
4. Klik **Deploy → New deployment → (ikon gear) Web app**:
   - **Description**: bebas (mis. `Absen-QR API v2`)
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`  ← penting, supaya bisa dipanggil dari web
   - Klik **Deploy**, lalu **Authorize access** (pakai akun pemilik spreadsheet).
5. Salin **Web app URL** (berakhiran `/exec`) → isi di `web/src/config.ts`
   sebagai `apiUrl`.
6. **PENTING — first-run**: buka URL `/exec` itu sekali di browser yang sudah
   login Google, sampai muncul JSON `{"ok":true,...}`. Setelah itu pengunjung
   lain (tanpa login) baru bisa memanggilnya. (Ini perilaku umum Apps Script.)

## Kalau kamu tidak bisa / belum mau mengubah script

Halaman web tetap bisa dibuat, tapi **hanya** mode input ID manual
(scan kamera tidak mungkin tanpa API yang di-deploy ulang seperti di atas).
Ganti `USE_API` di `web/src/config.ts` ke `false` untuk memakai mode
"hanya catat via link Apps Script lama" — tidak disarankan.

## Cara tes cepat API (setelah deploy)

Buka terminal, ganti URL dengan punyamu:

```powershell
$body = '{"action":"ping"}'
curl.exe -X POST "https://script.google.com/macros/s/XXX/exec" -H "Content-Type: text/plain;charset=utf-8" -d $body
```

Harusnya balas: `{"ok":true,"message":"pong"}`
