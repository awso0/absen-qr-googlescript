import { QrScanner } from "./scanner";
import { lookupId, recordScan } from "./api";
import { getState, go, setState } from "./state";
import { IS_API_READY } from "./config";
import { must } from "./dom";
import type { AppState } from "./state";

/** Instance scanner tunggal yang dipakai layar kamera. */
export const scanner = new QrScanner();
let cameraMode: "environment" | "user" = "environment";
let videoEl: HTMLVideoElement | null = null;
let scanning = false;

/** Navigasi dengan kesadaran stop kamera. */
export function nav(screen: AppState["screen"]): void {
  // kalau keluar dari layar scanner, matikan kamera
  if (screen !== "scanner") stopCamera();
  go(screen);
}

export function toast(kind: "error" | "info" | "success", text: string, ms = 3200): void {
  setState({ toast: { kind, text } });
  window.setTimeout(() => {
    if (getState().toast?.text === text) setState({ toast: null });
  }, ms);
}

/* ============ OVERLAY LOADING (tidak lewat render layar) ============ */

/**
 * Tampilkan overlay loading "sedang memproses" di atas layar saat ini.
 * Sengaja TIDAK lewat state/render layar, supaya elemen <video> kamera
 * tidak dihancurkan saat scanner aktif.
 */
export function showBusy(message: string): void {
  hideBusy();
  const overlay = document.createElement("div");
  overlay.id = "busy-overlay";
  overlay.className = "busy-overlay";
  const box = document.createElement("div");
  box.className = "busy-box";
  const spin = document.createElement("div");
  spin.className = "spinner";
  const label = document.createElement("div");
  label.className = "busy-label";
  label.textContent = message;
  box.append(spin, label);
  overlay.append(box);
  document.body.append(overlay);
}

export function hideBusy(): void {
  document.querySelector("#busy-overlay")?.remove();
}

/* ============ KAMERA ============ */

export async function startCamera(): Promise<void> {
  if (scanning) return;
  if (!IS_API_READY) {
    toast("error", "API belum dikonfigurasi (isi API_URL di src/config.ts).");
    return;
  }
  scanning = true;
  setState({ busy: true });
  videoEl = must<HTMLVideoElement>("#scanner-video");

  try {
    // cek dukungan getUserMedia
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Browser tidak mendukung akses kamera (perlu HTTPS / localhost).");
    }
    // Timeout: kalau getUserMedia menggantung (izin tidak dijawab / kamera
    // tidak merespons), jangan biarkan layar stuck — kasih pesan & fallback.
    await withTimeout(
      scanner.start(videoEl, cameraMode, {
        onResult: (text) => handleScanResult(text),
        onError: (err) => {
          // Filter sudah dilakukan di scanner.ts untuk "QR belum terlihat".
          // Yang sampai ke sini adalah error sungguhan saat runtime decode.
          console.warn("[scanner]", err);
        },
      }),
      8000,
      "Waktu buka kamera habis. Periksa izin kamera lalu coba lagi.",
    );
  } catch (err) {
    console.error(err);
    const msg =
      err instanceof Error && err.message && !err.message.startsWith("Error")
        ? err.message
        : "Tidak bisa membuka kamera. Pastikan izin kamera diberikan & halaman dibuka via HTTPS. Kamu bisa pakai input manual.";
    toast("error", msg);
    stopCamera();
  } finally {
    setState({ busy: false });
  }
}

/** Jalankan promise tapi batalkan (lewat reject) setelah timeoutMs. */
function withTimeout<T>(p: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), timeoutMs);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export function stopCamera(): void {
  scanning = false;
  void scanner.stop();
  videoEl = null;
}

export function flipCamera(): void {
  cameraMode = cameraMode === "environment" ? "user" : "environment";
  if (scanning && videoEl) {
    void (async () => {
      await scanner.stop();
      await scanner.start(videoEl!, cameraMode, {
        onResult: (text) => handleScanResult(text),
        onError: () => {},
      });
    })();
  }
}

/* ============ ALUR SCAN ============ */

/**
 * Dipanggil saat QR terbaca. Langsung lookup; kalau ditemukan
 * pindah ke layar konfirmasi. Kalau tidak, kasih toast.
 */
export async function handleScanResult(raw: string): Promise<void> {
  const id = raw.trim();
  if (!id) return;

  // jeda kecil supaya QR yang sama tidak ter-trigger 2x
  stopCamera();
  showBusy("Mencari data…");
  try {
    const res = await lookupId(id);
    hideBusy();
    if (!res.ok || !res.data) {
      toast("error", res.message || "ID tidak dikenal.");
      // kembali ke scanner untuk coba lagi
      startScannerScreen();
      return;
    }
    setState({
      screen: "confirm",
      pendingLookup: {
        id: res.data.id,
        nama: res.data.nama,
        namaFanbase: res.data.namaFanbase,
        namaMember: res.data.namaMember,
      },
    });
  } catch (err) {
    hideBusy();
    console.error(err);
    toast("error", "Gagal menghubungi server. Coba lagi.");
    startScannerScreen();
  }
}

export function startScannerScreen(): void {
  nav("scanner");
  // mulai kamera setelah layar di-render
  setTimeout(() => void startCamera(), 60);
}

/** Konfirmasi final: kirim record. */
export async function confirmScan(): Promise<void> {
  const p = getState().pendingLookup;
  if (!p) return;
  const namaEl = must<HTMLInputElement>("#confirm-nama");
  const nama = namaEl.value.trim();
  if (!nama) {
    toast("error", "Nama tidak boleh kosong.");
    return;
  }

  showBusy("Menyimpan kehadiran…");
  try {
    const res = await recordScan(p.id, nama);
    hideBusy();
    if (!res.ok || !res.data) {
      toast("error", res.message || "Gagal mencatat kehadiran.");
      return;
    }
    setState({
      screen: "success",
      pendingLookup: null,
      lastRecord: {
        id: res.data.id,
        nama: res.data.nama,
        namaFanbase: res.data.namaFanbase,
        namaMember: res.data.namaMember,
        status: res.data.status,
        keterangan: res.data.keterangan,
        waktu: res.data.waktu,
      },
    });
  } catch (err) {
    hideBusy();
    console.error(err);
    toast("error", "Gagal mencatat kehadiran. Cek koneksi & coba lagi.");
  }
}

/** Cek ID dari input manual. */
export async function checkManualId(): Promise<void> {
  const input = must<HTMLInputElement>("#manual-id");
  const id = input.value.trim();
  if (!id) {
    toast("error", "Masukkan ID dulu.");
    return;
  }
  showBusy("Mencari data…");
  try {
    const res = await lookupId(id);
    hideBusy();
    if (!res.ok || !res.data) {
      toast("error", res.message || "ID tidak dikenal.");
      return;
    }
    setState({
      screen: "confirm",
      pendingLookup: {
        id: res.data.id,
        nama: res.data.nama,
        namaFanbase: res.data.namaFanbase,
        namaMember: res.data.namaMember,
      },
    });
  } catch (err) {
    hideBusy();
    console.error(err);
    toast("error", "Gagal menghubungi server.");
  }
}

/** Tombol "Cek" di beranda dari input manual singkat. */
export async function checkHomeManualId(): Promise<void> {
  const input = must<HTMLInputElement>("#home-manual-id");
  const id = input.value.trim();
  if (!id) {
    toast("error", "Masukkan ID dulu.");
    return;
  }
  showBusy("Mencari data…");
  try {
    const res = await lookupId(id);
    hideBusy();
    if (!res.ok || !res.data) {
      toast("error", res.message || "ID tidak dikenal.");
      return;
    }
    setState({
      screen: "confirm",
      pendingLookup: {
        id: res.data.id,
        nama: res.data.nama,
        namaFanbase: res.data.namaFanbase,
        namaMember: res.data.namaMember,
      },
    });
  } catch (err) {
    hideBusy();
    console.error(err);
    toast("error", "Gagal menghubungi server.");
  }
}

/** Setelah sukses, kembali ke beranda & bersihkan. */
export function doneSuccess(): void {
  setState({ pendingLookup: null, lastRecord: null, screen: "home" });
}
