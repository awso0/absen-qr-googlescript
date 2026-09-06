import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

/**
 * Wrapper di atas @zxing/browser untuk scan QR lewat kamera.
 *
 * Kenapa tidak pakai `decodeFromConstraints` langsung?
 *  - Kita ambil alih `getUserMedia` sendiri supaya preview video langsung
 *    muncul (responsif) sebelum decoder siap.
 *  - Resolusi sengaja dibuat rendah (640x480): QR tidak butuh 720p, dan
 *    frame kecil jauh lebih cepat di-decode sehingga terasa "realtime".
 *  - `facingMode` dibuat preferensi (ideal) + fallback otomatis, jadi di
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
  });
  private controls: IScannerControls | null = null;
  private stream: MediaStream | null = null;

  async start(
    videoEl: HTMLVideoElement,
    mode: CameraMode,
    cb: QrScannerCallbacks,
  ): Promise<void> {
    await this.stop();

    const stream = await this.acquireStream(mode);
    this.stream = stream;

    // Tampilkan preview secepat mungkin
    videoEl.srcObject = stream;
    videoEl.setAttribute("playsinline", "true");
    videoEl.muted = true;
    try {
      await videoEl.play();
    } catch {
      /* autoplay policy — abaikan, tetap coba decode */
    }

    // Jalankan decode kontinu di atas video yang sudah jalan
    this.controls = await this.reader.decodeFromVideoElement(
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
  }

  /** Minta izin & buka kamera, dengan fallback bertingkat. */
  private async acquireStream(preferred: CameraMode): Promise<MediaStream> {
    const videoConstraints: MediaTrackConstraints[] = [
      // 1) preferensi kamera sesuai mode (ideal → tidak wajib)
      {
        facingMode: { ideal: preferred },
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      // 2) kalau gagal, coba kamera sebaliknya
      {
        facingMode: { ideal: preferred === "environment" ? "user" : "environment" },
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      // 3) terakhir: kamera apa pun
      { width: { ideal: 640 }, height: { ideal: 480 } },
    ];

    let lastErr: unknown = null;
    for (const vc of videoConstraints) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: vc,
        });
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error("Tidak ada kamera yang bisa dibuka.");
  }

  /** Berhenti: matikan loop decode + lepas & stop semua track kamera. */
  async stop(): Promise<void> {
    if (this.controls) {
      try {
        this.controls.stop();
      } catch {
        /* ignore */
      }
      this.controls = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
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
