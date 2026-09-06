import { el, txt, clear, must } from "./dom";
import type { AppState } from "./state";
import { CLUB_NAME } from "./config";

/** Layar beranda. */
export function renderHome(root: HTMLElement): void {
  clear(root);
  root.append(
    el("div", { class: "screen", "data-screen": "home" }, [
      el("div", { class: "hero" }, [
        el("div", {}, [txt("👋")]),
        el("h1", {}, [
          txt("Selamat datang di "),
          el("span", { class: "grad" }, [txt("Absensi QR")]),
        ]),
        el("p", {}, [
          txt(`Scan QR undangan ${CLUB_NAME} untuk konfirmasi kehadiran — cukup sekali, QR tidak bisa dipakai ulang.`),
        ]),
      ]),
      el("div", { class: "card", style: "padding:20px;" }, [
        el("div", { class: "field", style: "margin-bottom:14px;" }, [
          el("label", {}, [txt("Masukkan ID kamu (ketik manual)")]),
          el("input", { class: "input", id: "home-manual-id", type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "contoh: 0012" }),
        ]),
        el("button", { class: "btn btn-primary", id: "home-btn-camera", type: "button" }, [
          txt("📷 Scan QR"),
        ]),
        el("button", { class: "btn btn-ghost", id: "home-btn-manual", type: "button", style: "margin-top:10px;" }, [
          txt("⌨️ Lanjut tanpa scan (isi manual)"),
        ]),
      ]),
    ]),
  );
}

/** Layar scanner kamera. */
export function renderScanner(root: HTMLElement): void {
  clear(root);
  root.append(
    el("div", { class: "screen", "data-screen": "scanner" }, [
      el("div", { class: "scanner-wrap", id: "scanner-wrap" }, [
        el("video", { id: "scanner-video", playsinline: "", muted: "", autoplay: "" }),
        el("div", { class: "corner tl" }),
        el("div", { class: "corner tr" }),
        el("div", { class: "corner bl" }),
        el("div", { class: "corner br" }),
        el("div", { class: "scan-line" }),
        el("div", { class: "scan-frame" }),
      ]),
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-ghost", id: "scanner-back", type: "button" }, [txt("← Kembali")]),
        el("button", { class: "btn btn-ghost", id: "scanner-flip", type: "button" }, [txt("🔄 Ganti kamera")]),
      ]),
      el("button", { class: "btn btn-ghost", id: "scanner-manual", type: "button", style: "margin-top:4px;" }, [
        txt("⌨️ Ketik ID manual"),
      ]),
    ]),
  );
}

/** Layar input manual. */
export function renderManual(root: HTMLElement): void {
  clear(root);
  root.append(
    el("div", { class: "screen", "data-screen": "manual" }, [
      el("div", { class: "hero", style: "padding-bottom:6px;" }, [
        el("h1", { style: "font-size:24px;" }, [txt("Ketik ID")]),
        el("p", {}, [txt("Masukkan ID yang tertera di kartu / QR kamu.")]),
      ]),
      el("div", { class: "card", style: "padding:20px;" }, [
        el("div", { class: "field" }, [
          el("label", {}, [txt("ID")]),
          el("input", { class: "input", id: "manual-id", type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "contoh: 0012" }),
        ]),
        el("button", { class: "btn btn-primary", id: "manual-btn-check", type: "button", style: "margin-top:16px;" }, [
          txt("Cek ID →"),
        ]),
      ]),
      el("button", { class: "btn btn-ghost", id: "manual-back", type: "button" }, [txt("← Kembali")]),
    ]),
  );
}

/** Layar konfirmasi data + nama (bisa diedit untuk titipan). */
export function renderConfirm(root: HTMLElement, s: AppState): void {
  clear(root);
  const p = s.pendingLookup;
  if (!p) return;

  root.append(
    el("div", { class: "screen", "data-screen": "confirm" }, [
      el("div", { class: "hero", style: "padding-bottom:4px;" }, [
        el("h1", { style: "font-size:23px;" }, [txt("Data ditemukan ✅")]),
        el("p", {}, [txt("Periksa dulu, lalu konfirmasi. Kalau ini titipan, edit nama di bawah.")]),
      ]),
      el("div", { class: "card", style: "padding:20px;" }, [
        el("div", { class: "detail-list", style: "margin-bottom:16px;" }, [
          detail("ID", p.id),
          detail("Fanbase", p.namaFanbase || "-"),
          detail("Member JKT48", p.namaMember || "-"),
        ]),
        el("div", { class: "field" }, [
          el("label", {}, [txt("Nama (bisa diedit kalau titipan)")]),
          el("input", { class: "input", id: "confirm-nama", type: "text", autocomplete: "off", value: p.nama }),
        ]),
        el("button", { class: "btn btn-success", id: "confirm-btn", type: "button", style: "margin-top:16px;" }, [
          txt("✔ Konfirmasi Kehadiran"),
        ]),
        el("button", { class: "btn btn-ghost", id: "confirm-back", type: "button", style: "margin-top:10px;" }, [
          txt("← Ulangi scan"),
        ]),
      ]),
    ]),
  );
}

/** Layar sukses setelah record. */
export function renderSuccess(root: HTMLElement, s: AppState): void {
  clear(root);
  const r = s.lastRecord;
  if (!r) return;

  const isMasuk = r.status === "Masuk";
  root.append(
    el("div", { class: "screen", "data-screen": "success" }, [
      el("div", { class: "success-icon" }, [txt(isMasuk ? "✅" : "👋")]),
      el("div", { class: "success-title" }, [txt(`${r.status} berhasil!`)]),
      el("div", { class: "success-sub" }, [
        el("p", {}, [
          el("strong", {}, [txt(r.nama)]),
          txt(" — kehadiran kamu sudah tercatat. QR ini tidak bisa dipakai lagi."),
        ]),
      ]),
      el("div", { class: "card", style: "padding:16px 20px;" }, [
        el("div", { class: "detail-list" }, [
          detail("ID", r.id),
          detail("Nama", r.nama),
          detail("Fanbase", r.namaFanbase || "-"),
          detail("Member", r.namaMember || "-"),
          detail("Status", r.status),
          detail("Keterangan", r.keterangan),
          detail("Waktu", r.waktu),
        ]),
      ]),
      el("button", { class: "btn btn-primary", id: "success-done", type: "button" }, [txt("Selesai")]),
    ]),
  );
}

function detail(k: string, v: string): HTMLElement {
  return el("div", { class: "detail-row" }, [
    el("span", { class: "k" }, [txt(k)]),
    el("span", { class: "v" }, [txt(v)]),
  ]);
}

/** Renderer utama — membangun header + layar sesuai state. */
export function render(root: HTMLElement, s: AppState): void {
  clear(root);

  // Header
  const initial = CLUB_NAME.charAt(0).toUpperCase();
  root.append(
    el("header", { class: "app-header" }, [
      el("div", { class: "brand" }, [
        el("div", { class: "brand-logo" }, [txt(initial)]),
        el("div", {}, [
          el("div", { class: "brand-name" }, [txt(CLUB_NAME)]),
          el("div", { class: "brand-sub" }, [txt("Fanbase JKT48")]),
        ]),
      ]),
      el("div", { class: "pill" }, [txt("ABSENSI QR")]),
    ]),
  );

  // Layar aktif
  switch (s.screen) {
    case "home":
      renderHome(root);
      break;
    case "scanner":
      renderScanner(root);
      break;
    case "manual":
      renderManual(root);
      break;
    case "confirm":
      renderConfirm(root, s);
      break;
    case "success":
      renderSuccess(root, s);
      break;
  }

  const active = must<HTMLElement>(`[data-screen="${s.screen}"]`, root);
  if (active) active.classList.add("active");
}
