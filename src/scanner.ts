import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

/**
 * Wrapper kecil di atas @zxing/browser untuk scan QR lewat kamera.
 *
 * Alasan pakai library ini: kita bisa mengontrol kamera belakang/depan,
 * dan hasilnya stabil. Fallback manual (mode ID) tetap disediakan kalau
 * izin kamera ditolak / tidak ada kamera.
 */

export type CameraMode = "environment" | "user";

export interface QrScannerCallbacks {
  onResult: (text: string) => void;
  onError?: (err: Error) => void;
}

export class QrScanner {
  private reader = new BrowserQRCodeReader(undefined, {
    delayBetweenScanAttempts: 300,
  });
  private controls: IScannerControls | null = null;

  async start(
    videoEl: HTMLVideoElement,
    mode: CameraMode,
    cb: QrScannerCallbacks,
  ): Promise<void> {
    await this.stop();

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: mode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    // @zxing handle getUserMedia sendiri (minta izin + dapatkan stream)
    this.controls = await this.reader.decodeFromConstraints(
      constraints,
      videoEl,
      (result, error) => {
        if (result) {
          cb.onResult(result.getText());
        } else if (error && error instanceof Error && cb.onError) {
          // ZXing melaporkan "QR tidak terlihat" berulang-ulang sebagai
          // error normal selama kamera menyala tapi belum ada QR di frame.
          // Nama kelasnya bisa "NotFoundException" / "NotFoundException2" /
          // berubah-ubah antar versi, jadi filter lewat beberapa sinyal.
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

  /** Berhenti memakai kamera (hentikan stream & lepas video). */
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
