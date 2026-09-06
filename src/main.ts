import "./style.css";
import { must } from "./dom";
import { getState, subscribe, setState } from "./state";
import { render } from "./ui";
import { wire } from "./wire";
import { IS_API_READY, CLUB_NAME } from "./config";

/**
 * Titik masuk aplikasi.
 *
 * PENTING — render layar hanya ketika isi layar benar-benar berubah
 * (screen/pendingLookup/lastRecord). Update `busy`/`toast` TIDAK boleh
 * me-render ulang seluruh layar, karena `render()` memanggil `clear()`
 * yang menghancurkan elemen <video> yang sedang streaming kamera →
 * kalau di-render ulang saat scanner aktif, video jadi hitam.
 */

const app = must<HTMLElement>("#app");

/** Kunci untuk memutuskan apakah layar perlu di-render ulang. */
function renderKey(s: ReturnType<typeof getState>): string {
  return [
    s.screen,
    s.pendingLookup ? JSON.stringify(s.pendingLookup) : "",
    s.lastRecord ? JSON.stringify(s.lastRecord) : "",
  ].join("|");
}

let lastKey = "";

function renderAll(force = false): void {
  const s = getState();
  const key = renderKey(s);

  if (force || key !== lastKey) {
    lastKey = key;
    render(app, s);
    wire(s);
  }
  renderToast();
}

function renderToast(): void {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const t = getState().toast;
  if (!t) return;
  const div = document.createElement("div");
  div.className = `toast ${t.kind}`;
  div.textContent = t.text;
  document.body.append(div);
}

subscribe(() => renderAll());

// Inisialisasi
setState({
  toast: IS_API_READY
    ? null
    : {
        kind: "info",
        text: "API belum dikonfigurasi. Isi API_URL di src/config.ts lalu deploy.",
      },
});
renderAll(true);

// Tampilkan versi / status kecil di konsol (mudah cek apakah JS termuat)
console.info(`[${CLUB_NAME}] Absen-QR dimuat. API ${IS_API_READY ? "siap" : "belum diisi"}.`);
