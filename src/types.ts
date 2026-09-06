/**
 * Tipe data bersama antara klien (web) dan respons API Apps Script.
 */

export interface LookupData {
  id: string;
  nama: string;
  namaFanbase: string;
  namaMember: string;
}

export interface RecordData {
  id: string;
  nama: string;
  namaFanbase: string;
  namaMember: string;
  status: "Masuk" | "Pulang";
  keterangan: "Sendiri" | "Titipan";
  waktu: string; // HH:mm:ss
}

/** Bentuk respons yang dikembalikan API Code.gs (seragam). */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  message?: string;
  data?: T;
}
