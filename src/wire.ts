import { must } from "./dom";
import type { AppState } from "./state";
import {
  nav,
  flipCamera,
  startScannerScreen,
  confirmScan,
  checkManualId,
  checkHomeManualId,
  doneSuccess,
} from "./actions";

/**
 * Memasang listener klik pada tombol-tombol yang ADA di layar saat ini.
 * Dipanggil setelah render selesai.
 */
export function wire(s: AppState): void {
  switch (s.screen) {
    case "home": {
      bind("#home-btn-camera", "click", () => startScannerScreen());
      bind("#home-btn-manual", "click", () => nav("manual"));
      const input = must<HTMLInputElement>("#home-manual-id");
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") void checkHomeManualId();
      });
      break;
    }
    case "scanner": {
      bind("#scanner-back", "click", () => nav("home"));
      bind("#scanner-flip", "click", () => flipCamera());
      bind("#scanner-manual", "click", () => nav("manual"));
      break;
    }
    case "manual": {
      bind("#manual-back", "click", () => nav("home"));
      bind("#manual-btn-check", "click", () => void checkManualId());
      const input = must<HTMLInputElement>("#manual-id");
      input.focus();
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") void checkManualId();
      });
      break;
    }
    case "confirm": {
      bind("#confirm-btn", "click", () => void confirmScan());
      bind("#confirm-back", "click", () => startScannerScreen());
      break;
    }
    case "success": {
      bind("#success-done", "click", () => doneSuccess());
      break;
    }
  }
}

function bind(sel: string, ev: string, fn: () => void): void {
  const n = document.querySelector(sel);
  if (n) n.addEventListener(ev, fn);
}
