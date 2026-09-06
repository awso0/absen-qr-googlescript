/// <reference types="vite/client" />

/**
 * KONFIGURASI — sesuaikan sebelum deploy!
 *
 * API_URL : URL Web App Apps Script (berakhiran /exec). Diisi setelah kamu
 *           deploy ulang script (lihat apps-script/SETUP.md). Wajib untuk
 *           mode scan kamera & lookup.
 *           Contoh: "https://script.google.com/macros/s/AKfycb.../exec"
 *
 * API_TOKEN : (opsional) token rahasia kalau kamu set Script property
 *             "API_TOKEN" di Apps Script. Kosongkan ("") kalau tidak pakai.
 *
 * CLUB_NAME : nama fanbase yang tampil di header.
 */
export const API_URL = "https://script.google.com/macros/s/AKfycbydP4rAwUeQQFI2j00SJ9MUHvh4GRam-Y4L7TqiDoV5BUqyjYP-hHc-E0fGZs8V_hQA/exec"; // <-- ISI URL /exec punyamu
export const API_TOKEN = "";
export const CLUB_NAME = "hillaryours.id";

export const IS_API_READY = API_URL.trim().length > 0;

/** Waktu kedaluwarsa hasil lookup sebelum dikunci, supaya orang tidak
 *  "menahan" hasil scan ID orang lain untuk dipakai lama-lama. (ms) */
export const LOOKUP_LOCK_MS = 45_000;
