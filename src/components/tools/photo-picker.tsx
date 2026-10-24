"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { cn } from "../ui/cn";

// Take a photo or pick one. On phones "Take a photo" opens the camera app;
// on computers it opens a live webcam view with a shutter button.
export function PhotoPicker({ onPhoto, label, hint }: { onPhoto: (file: Blob) => void; label: string; hint?: string }) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState(false);
  const [dragging, setDragging] = useState(false);

  const takePhoto = () => {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (!touch && "mediaDevices" in navigator && typeof navigator.mediaDevices.getUserMedia === "function") setLive(true);
    else cameraInput.current?.click();
  };

  const fromInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onPhoto(file);
  };

  if (live) return <LiveCamera onPhoto={onPhoto} onClose={() => setLive(false)} />;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
        if (file) onPhoto(file);
      }}
      className={cn(
        "rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-10",
        dragging ? "border-forest bg-forest-tint" : "border-line-strong bg-surface",
      )}
    >
      <p className="font-serif text-2xl font-semibold">{label}</p>
      {hint ? <p className="mx-auto mt-2 max-w-md text-muted">{hint}</p> : null}
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={takePhoto}
          className="press inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-forest px-6 text-lg font-semibold text-white hover:bg-forest-dark"
        >
          <Camera className="size-5" aria-hidden="true" />
          Take a photo
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="press inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-6 text-lg font-semibold hover:bg-sunken"
        >
          <ImageUp className="size-5" aria-hidden="true" />
          Choose a photo
        </button>
      </div>
      <p className="mt-4 hidden text-sm text-muted sm:block">Or drop a photo here.</p>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={fromInput} />
      <input ref={fileInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={fromInput} />
    </div>
  );
}

function LiveCamera({ onPhoto, onClose }: { onPhoto: (file: Blob) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setError("We couldn't open the camera. Allow camera access in your browser, or choose a photo instead."));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const snap = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    canvas.toBlob((b) => b && onPhoto(b), "image/jpeg", 0.92);
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-ink text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="font-semibold">Camera</p>
        <button type="button" onClick={onClose} className="press grid size-11 place-items-center rounded-lg hover:bg-white/10" aria-label="Close camera">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      {error ? (
        <p className="px-4 pb-6" role="alert">
          {error}
        </p>
      ) : (
        <>
          {/* Captions don't apply: this is the live camera preview. */}
          <video ref={video} autoPlay playsInline muted className="aspect-[4/3] w-full bg-black object-cover" />
          <div className="flex justify-center py-4">
            <button
              type="button"
              onClick={snap}
              className="press grid size-18 place-items-center rounded-full bg-white ring-4 ring-white/30"
              aria-label="Take the photo"
            >
              <span className="size-14 rounded-full border-2 border-ink" aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
