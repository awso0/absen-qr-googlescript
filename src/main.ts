import "./style.css";
import { must } from "./dom";
import { getState, subscribe, setState } from "./state";
import { render } from "./ui";
import { wire } from "./wire";
import { IS_API_READY, CLUB_NAME } from "./config";

/**
 * Titik masuk aplikasi. Render awal + subscribe state → render ulang
 * + pasang event listener setiap layar aktif.
 */

const app = must<HTMLElement>("#app");

function renderAll(): void {
  const s = getState();
  render(app, s);
  wire(s);
  // toast global
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
renderAll();

// Tampilkan versi / status kecil di konsol (mudah cek apakah JS termuat)
console.info(`[${CLUB_NAME}] Absen-QR dimuat. API ${IS_API_READY ? "siap" : "belum diisi"}.`);
