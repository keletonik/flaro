/**
 * camera.ts - getUserMedia wrapper for on-site panel-ID capture.
 *
 * Targets the rear camera (`facingMode: "environment"`) on phones.
 * Falls back to the default camera if the rear isn't available.
 * Capture renders the live track to a hidden <video>, then reads a
 * frame off a temporary <canvas> as a JPEG blob.
 *
 * No external deps. Caller is responsible for permission UX and
 * stopping the stream when finished (call `stop()` on the result).
 */

export interface CameraSession {
  stream: MediaStream;
  video: HTMLVideoElement;
  /** Capture the current frame as a JPEG Blob. */
  capture: (quality?: number) => Promise<Blob>;
  /** Stop all tracks and clean up. */
  stop: () => void;
}

export async function startCamera(): Promise<CameraSession> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera API not supported in this browser.");
  }

  // Try rear camera first; fall back to the default.
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
  } catch {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }

  const video = document.createElement("video");
  video.setAttribute("playsinline", "true");
  video.muted = true;
  video.srcObject = stream;
  await video.play();

  const capture = (quality = 0.85): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        reject(new Error("Camera not ready - no frame yet."));
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context not available."));
        return;
      }
      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Frame capture failed."));
        },
        "image/jpeg",
        quality,
      );
    });
  };

  const stop = () => {
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    video.srcObject = null;
  };

  return { stream, video, capture, stop };
}

export function isCameraAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}
