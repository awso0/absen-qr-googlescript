import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

/**
 * Wrapper di atas @zxing/browser untuk scan QR lewat kamera.
 *
 * Pendekatan: pakai `decodeFromConstraints` bawaan ZXing (bukan set
 * `srcObject` manual + `decodeFromVideoElement`). Kenapa?
 *  - `decodeFromConstraints` menangani urutan yang benar secara internal:
 *    getUserMedia → attach stream ke video → tunggu `canplay` → baru scan.
 *    Kalau kita set srcObject manual lalu panggil `decodeFromVideoElement`,
 *    event `canplay` bisa sudah terlewat sebelum listener ZXing terpasang,
 *    sehingga `playVideoOnLoadAsync` menunggu sampai timeout (video hitam).
 *  - Resolusi dibuat rendah (640x480): cukup untuk QR, decode jauh lebih
 *    cepat sehingga terasa realtime.
 *  - `facingMode` dibuat preferensi (ideal) + fallback bertingkat, jadi di
 *    perangkat dengan satu kamera tidak gagal.
 */

export type CameraMode = "environment" | "user";

export interface QrScannerCallbacks {
  onResult: (text: string) => void;
  onError?: (err: Error) => void;
}

export class QrScanner {
  private reader = new BrowserQRCodeReader(undefined, {
    delayBetweenScanAttempts: 100, // ~10x decode/detik
    tryPlayVideoTimeout: 8000,
  });
  private controls: IScannerControls | null = null;

  async start(
    videoEl: HTMLVideoElement,
    mode: CameraMode,
    cb: QrScannerCallbacks,
  ): Promise<void> {
    await this.stop();

    // Coba beberapa varian constraints; ZXing yang attach + play + scan.
    const attempts: MediaStreamConstraints[] = [
      // 1) preferensi kamera sesuai mode
      {
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      },
      // 2) kalau gagal, coba kamera sebaliknya
      {
        audio: false,
        video: {
          facingMode: { ideal: mode === "environment" ? "user" : "environment" },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      },
      // 3) terakhir: kamera apa pun
      { audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 } } },
    ];

    let lastErr: unknown = null;
    for (const constraints of attempts) {
      try {
        this.controls = await this.reader.decodeFromConstraints(
          constraints,
          videoEl,
          (result, error) => {
            if (result) {
              cb.onResult(result.getText());
            } else if (error && error instanceof Error && cb.onError) {
              // "QR belum terlihat" itu normal & sering; jangan teriak.
              const name = error.name || "";
              const ctor = (error as { constructor?: { name?: string } }).constructor?.name || "";
              const msg = error.message || "";
              const isNoQrFound =
                /NotFoundException/i.test(name + " " + ctor) || /NotFound/i.test(msg);
              if (isNoQrFound) return;
              cb.onError(error);
            }
          },
        );
        return; // sukses
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error("Tidak ada kamera yang bisa dibuka.");
  }

  /** Berhenti: matikan loop decode + lepas stream dari video. */
  async stop(): Promise<void> {
    if (this.controls) {
      try {
        this.controls.stop();
      } catch {
        /* ignore */
      }
      this.controls = null;
    }
  }

  async switchCamera(
    videoEl: HTMLVideoElement,
    nextMode: CameraMode,
    cb: QrScannerCallbacks,
  ): Promise<void> {
    await this.start(videoEl, nextMode, cb);
  }
}
