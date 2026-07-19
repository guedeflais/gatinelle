"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

interface QrScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

/**
 * Lecture de QR code par la caméra, en JS pur (jsQR) plutôt que l'API native
 * BarcodeDetector : cette dernière n'est pas disponible sur Safari/iPhone,
 * alors que la caméra + jsQR fonctionnent sur tous les navigateurs modernes.
 */
export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frameId: number;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        setError("Impossible d'accéder à la caméra. Vérifiez les autorisations.");
        return;
      }
      if (stopped || !videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      tick();
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || stopped) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);
          if (result?.data) {
            onScan(result.data);
            return;
          }
        }
      }
      frameId = requestAnimationFrame(tick);
    }

    start();

    return () => {
      stopped = true;
      if (frameId) cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="relative overflow-hidden rounded border border-neutral-300">
          <video ref={videoRef} muted playsInline className="w-full" />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      <button
        type="button"
        onClick={onClose}
        className="self-start rounded border border-neutral-300 px-4 py-2 text-neutral-700 hover:bg-neutral-50"
      >
        Annuler
      </button>
    </div>
  );
}
