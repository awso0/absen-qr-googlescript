/**
 * SISTEM ABSENSI QR — hillaryours.id (Fanbase JKT48)
 * ==================================================
 * MODE: JSON API (BUKAN halaman HtmlService).
 *
 * Kenapa diubah?
 *   Halaman yang di-serve HtmlService dimuat Google di dalam iframe yang
 *   TIDAK mengizinkan akses kamera (getUserMedia selalu diblokir). Supaya
 *   QR bisa discan lewat kamera, halaman scan dihosting di web biasa, dan
 *   script ini cukup jadi API JSON yang dipanggil via fetch().
 *
 * Cara pakai:
 *   1. Salin isi file ini menggantikan Code.gs di editor Apps Script.
 *   2. Deploy > New deployment > Web app
 *        - Execute as : Me
 *        - Who has access : Anyone
 *   3. URL /exec yang dihasilkan, isi di web/src/config.ts (API_URL).
 *
 * Endpoint menerima POST dengan Content-Type: text/plain;charset=utf-8
 * (browser tidak mengirim preflight CORS untuk tipe ini), body JSON:
 *   { action: "lookup", id: "1234" }                 -> cek member
 *   { action: "record", id: "1234", nama: "Budi" }   -> tulis absensi
 *   { action: "ping" }                               -> cek koneksi
 *
 * Keamanan opsional: set Script Property "API_TOKEN" (Project Settings
 * > Script properties). Kalau diisi, klien wajib kirim { token: "..." }.
 * Kalau kosong, tidak ada cek token.
 *
 * MODE: QR undangan SEKALI PAKAI (permanen). Begitu sebuah ID tercatat
 * pernah hadir di Log Absensi, scan berikutnya (kapan pun) ditolak dengan
 * pesan "QR sudah digunakan". Status yang dicatat: "Masuk".
 *
 * KUOTA: hanya 1 orang per fanbase (permanen utk event ini). Begitu ada
 * satu orang dari fanbase X tercatat, anggota fanbase X lain ditolak
 * ("Kuota fanbase X sudah terisi").
 *
 * Struktur Spreadsheet (2 sheet):
 *   "Master Data" : A:ID  B:Nama  C:Nama Fanbase  D:Nama Member JKT48  E:Status Aktif
 *   "Log Absensi" : A:Timestamp  B:Tanggal  C:ID  D:Nama  E:Nama Fanbase
 *                   F:Nama Member JKT48  G:Status(Masuk)  H:Keterangan(Sendiri/Titipan)
 */

const SHEET_MASTER = "Master Data";
const SHEET_LOG = "Log Absensi";
const COOLDOWN_DETIK = 5; // jeda anti-scan-ganda (detik) untuk ID yang sama

// ==== ENTRY POINTS WEB APP ====

/** GET: cukup info (kalau URL dibuka di browser) */
function doGet() {
  return jsonOut_({
    ok: true,
    service: "Absen-QR API hillaryours.id",
    message: "Endpoint ini dipanggil dengan POST JSON dari landing page. Buka di browser: lihat web app landing.",
    time: new Date().toISOString(),
  });
}

/** POST: semua aksi (lookup / record / ping) */
function doPost(e) {
  return jsonOut_(route_(parseBody_(e)));
}

// ==== ROUTER ====

function route_(body) {
  try {
    // Cek token opsional
    const expectedToken = PropertiesService.getScriptProperties().getProperty("API_TOKEN");
    if (expectedToken && body.token !== expectedToken) {
      return { ok: false, message: "Token API tidak valid." };
    }

    switch (body.action) {
      case "ping":
        return { ok: true, message: "pong" };
      case "lookup":
        return lookupId(body.id);
      case "record":
        return recordScan(body.id, body.nama);
      default:
        return { ok: false, message: 'Aksi tidak dikenal. Gunakan "lookup", "record", atau "ping".' };
    }
  } catch (err) {
    return { ok: false, message: "Terjadi kesalahan server: " + String(err && err.message || err) };
  }
}

/** Baca body JSON dari POST. Browser mengirim sebagai text/plain supaya tanpa preflight CORS. */
function parseBody_(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || "";
    return JSON.parse(raw || "{}");
  } catch (err) {
    return {};
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==== STEP 1: LOOKUP (belum menulis apa pun) ====

function lookupId(rawId) {
  const id = String(rawId || "").trim();
  if (!id) {
    return { ok: false, message: "ID kosong, coba scan ulang." };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_MASTER);
  if (!masterSheet) {
    return { ok: false, message: "Sheet 'Master Data' tidak ditemukan." };
  }

  const masterData = masterSheet.getDataRange().getValues();
  for (let i = 1; i < masterData.length; i++) {
    if (String(masterData[i][0]).trim() === id) {
      const statusAktif = masterData[i][4];
      const nama = String(masterData[i][1] || "").trim();
      const fanbase = String(masterData[i][2] || "").trim();
      const identitas = fanbase ? `"${nama}" (${fanbase})` : `"${nama}"`;
      if (String(statusAktif).toLowerCase() === "nonaktif") {
        return {
          ok: false,
          message: `${identitas} berstatus Nonaktif, tidak bisa masuk.`,
        };
      }
      const logSheet = ss.getSheetByName(SHEET_LOG);
      if (logSheet) {
        const logData = logSheet.getDataRange().getValues();

        // QR undangan sekali pakai: tolak kalau ID ini sudah pernah tercatat.
        for (let j = 1; j < logData.length; j++) {
          if (String(logData[j][2]).trim() === id) {
            return {
              ok: false,
              message: `${identitas} — QR sudah digunakan.`,
            };
          }
        }

        // Kuota 1 orang per fanbase (permanen utk event ini):
        // kalau fanbase ini sudah terisi di Log, tolak.
        if (fanbase) {
          for (let j = 1; j < logData.length; j++) {
            const fanbaseLog = String(logData[j][4] || "").trim();
            if (fanbaseLog && fanbaseLog.toLowerCase() === fanbase.toLowerCase()) {
              return {
                ok: false,
                message: `Kuota fanbase ${fanbase} sudah terisi. ${identitas} tidak bisa masuk.`,
              };
            }
          }
        }
      }
      return {
        ok: true,
        data: {
          id: id,
          nama: masterData[i][1],
          namaFanbase: masterData[i][2],
          namaMember: masterData[i][3],
        },
      };
    }
  }

  return { ok: false, message: `ID "${id}" tidak terdaftar di Master Data.` };
}

// ==== STEP 2: RECORD (menulis ke Log Absensi) ====

function recordScan(rawId, namaInput) {
  const id = String(rawId || "").trim();
  const namaFinal = String(namaInput || "").trim();

  if (!id || !namaFinal) {
    return { ok: false, message: "ID atau Nama kosong." };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_MASTER);
  const logSheet = ss.getSheetByName(SHEET_LOG);

  if (!masterSheet || !logSheet) {
    return { ok: false, message: "Sheet 'Master Data' atau 'Log Absensi' tidak ditemukan." };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    // 1. Re-lookup ID untuk pastikan masih valid & ambil data fanbase/member
    const masterData = masterSheet.getDataRange().getValues();
    let found = null;
    for (let i = 1; i < masterData.length; i++) {
      if (String(masterData[i][0]).trim() === id) {
        found = {
          id: id,
          namaAsli: masterData[i][1],
          namaFanbase: masterData[i][2],
          namaMember: masterData[i][3],
          statusAktif: masterData[i][4],
        };
        break;
      }
    }

    if (!found) {
      return { ok: false, message: `ID "${id}" tidak terdaftar di Master Data.` };
    }
    // Helper: tampilkan identitas (nama + fanbase) supaya pesan informatif.
    const namaLengkap = () => {
      const n = String(found.namaAsli || "").trim();
      const fb = String(found.namaFanbase || "").trim();
      return fb ? `"${n}" (${fb})` : `"${n}"`;
    };
    if (String(found.statusAktif).toLowerCase() === "nonaktif") {
      return { ok: false, message: `${namaLengkap()} berstatus Nonaktif, tidak bisa absen.` };
    }

    const now = new Date();
    const tz = ss.getSpreadsheetTimeZone();

    // 2. QR undangan SEKALI PAKAI (permanen): cek apakah ID ini PERNAH
    //    tercatat di Log Absensi, kapan pun. Kalau sudah → tolak.
    const logData = logSheet.getDataRange().getValues();
    let pernahDipakai = false;
    let lastEntryTime = null;

    for (let i = 1; i < logData.length; i++) {
      const row = logData[i];
      const rowId = String(row[2]).trim();
      if (rowId === id) {
        pernahDipakai = true;
        const t = new Date(row[0]);
        if (!lastEntryTime || t > lastEntryTime) lastEntryTime = t;
      }
    }

    // 3. Tolak kalau QR sudah pernah dipakai (sekali seumur hidup)
    if (pernahDipakai) {
      return { ok: false, message: `${namaLengkap()} — QR sudah digunakan.` };
    }

    // 3b. Kuota 1 orang per fanbase (permanen utk event ini):
    //     kalau fanbase dari orang ini sudah ada yang masuk, tolak.
    const fanbaseOrang = String(found.namaFanbase || "").trim();
    if (fanbaseOrang) {
      for (let i = 1; i < logData.length; i++) {
        const fbLog = String(logData[i][4] || "").trim();
        if (fbLog && fbLog.toLowerCase() === fanbaseOrang.toLowerCase()) {
          return {
            ok: false,
            message: `Kuota fanbase ${fanbaseOrang} sudah terisi. ${namaLengkap()} tidak bisa masuk.`,
          };
        }
      }
    }

    // Anti dobel-klik / scan ganda dalam beberapa detik terakhir
    if (lastEntryTime) {
      const selisihDetik = (now - lastEntryTime) / 1000;
      if (selisihDetik < COOLDOWN_DETIK) {
        return { ok: false, message: `${namaLengkap()} baru saja dipakai, tunggu sebentar.` };
      }
    }

    // 4. QR valid & belum dipakai → catat status "Masuk"
    const statusBaru = "Masuk";
    const tanggalHariIni = Utilities.formatDate(now, tz, "yyyy-MM-dd");

    // 5. Tentukan Keterangan: Sendiri kalau nama sama persis dengan Master Data, Titipan kalau beda
    const keterangan =
      namaFinal.toLowerCase() === String(found.namaAsli).trim().toLowerCase()
        ? "Sendiri"
        : "Titipan";

    // 6. Tulis ke Log Absensi
    logSheet.appendRow([
      now, tanggalHariIni, found.id, namaFinal, found.namaFanbase, found.namaMember, statusBaru, keterangan,
    ]);

    return {
      ok: true,
      data: {
        id: found.id,
        nama: namaFinal,
        namaFanbase: found.namaFanbase,
        namaMember: found.namaMember,
        status: statusBaru,
        keterangan: keterangan,
        waktu: Utilities.formatDate(now, tz, "HH:mm:ss"),
      },
    };
  } finally {
    lock.releaseLock();
  }
}
