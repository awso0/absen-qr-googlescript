/**
 * State kecil aplikasi (tanpa framework). Menggunakan satu object global
 * yang "di-subscribe" oleh renderer supaya render ulang hanya pada
 * bagian yang berubah.
 */

export type Screen = "home" | "scanner" | "manual" | "confirm" | "success";

export interface AppState {
  screen: Screen;
  /** Hasil lookup yang sedang menunggu konfirmasi (bisa nama diedit). */
  pendingLookup: {
    id: string;
    nama: string; // nama dari master data
    namaFanbase: string;
    namaMember: string;
  } | null;
  /** Hasil record terakhir (untuk layar sukses). */
  lastRecord: {
    id: string;
    nama: string;
    namaMember: string;
    namaFanbase: string;
    status: string;
    keterangan: string;
    waktu: string;
  } | null;
  /** Pesan error/notifikasi global. */
  toast: { kind: "error" | "info" | "success"; text: string } | null;
  busy: boolean;
  /** id manual yang sedang diketik di layar manual. */
  manualId: string;
}

export const initialState: AppState = {
  screen: "home",
  pendingLookup: null,
  lastRecord: null,
  toast: null,
  busy: false,
  manualId: "",
};

type Listener = (s: AppState) => void;

let state: AppState = { ...initialState };
const listeners = new Set<Listener>();

export function getState(): AppState {
  return state;
}

export function setState(partial: Partial<AppState>): void {
  state = { ...state, ...partial };
  emit();
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  for (const fn of listeners) fn(state);
}

/** Navigasi antar layar, sekalian reset state yang tidak relevan. */
export function go(screen: Screen): void {
  setState({ screen });
}
