import { API_TOKEN, API_URL } from "./config";
import type { ApiResponse, LookupData, RecordData } from "./types";

/**
 * Memanggil Apps Script dengan body JSON tapi dikirim sebagai
 * Content-Type: text/plain;charset=utf-8.
 *
 * Mengapa? Karena Apps Script tidak mengizinkan header kustom / CORS
 * preflight. Dengan Content-Type "text/plain" ini, request adalah
 * "simple request" sehingga browser tidak mengirim preflight OPTIONS —
 * dengan syarat halaman dipanggil via HTTPS dan URL /exec-nya valid.
 *
 * Catatan untuk deployment di Vercel/Netlify:
 *  - Kamu TIDAK perlu proxy. Apps Script yang di-deploy "Anyone" sudah
 *    menyertakan header CORS `Access-Control-Allow-Origin: *` pada balasan
 *    simple-request semacam ini.
 */
export async function callApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<ApiResponse<T>> {
  const url = API_URL;
  if (!url) {
    throw new Error(
      "API belum dikonfigurasi. Isi API_URL (URL /exec Apps Script) di src/config.ts lalu deploy ulang.",
    );
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload, ...(API_TOKEN ? { token: API_TOKEN } : {}) }),
  });

  if (!res.ok) {
    throw new Error(`API HTTP ${res.status}: ${res.statusText}`);
  }
  const text = await res.text();
  const json = JSON.parse(text) as ApiResponse<T>;
  return json;
}

export function lookupId(id: string) {
  return callApi<LookupData>("lookup", { id });
}

export function recordScan(id: string, nama: string) {
  return callApi<RecordData>("record", { id, nama });
}

export function ping() {
  return callApi("ping");
}
