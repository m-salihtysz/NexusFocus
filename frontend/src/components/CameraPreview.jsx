import { useEffect, useRef, useState, useCallback } from "react";
import { CheckCircle2, ScanFace, VideoOff } from "lucide-react";
import { getFaceLandmarkerStatic } from "../lib/mediapipeTracker";

const SHELL_BASE =
  "relative overflow-hidden rounded-2xl border-4 transition-all duration-500 shadow-xl";

export default function CameraPreview({
  videoRef,
  lastMetricsRef,
  cameraOn,
  cameraEnabled,
  onFaceDetectedChange,
}) {
  const overlayRef = useRef(null);
  const [detected, setDetected] = useState(false);
  const [pulse, setPulse] = useState(false);

  const notifyFace = useCallback(
    (next) => {
      onFaceDetectedChange?.(next);
    },
    [onFaceDetectedChange]
  );

  useEffect(() => {
    notifyFace(detected);
  }, [detected, notifyFace]);

  useEffect(() => {
    if (!cameraEnabled) {
      setDetected(false);
      return undefined;
    }

    let frameId;
    let stopped = false;
    const sets = getFaceLandmarkerStatic();

    const drawConnections = (ctx, landmarks, connections, style) => {
      if (!connections || !connections.length) return;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.lineWidth || 1;
      ctx.beginPath();
      connections.forEach((conn) => {
        const start = landmarks[conn.start];
        const end = landmarks[conn.end];
        if (!start || !end) return;
        ctx.moveTo(start.x * ctx.canvas.width, start.y * ctx.canvas.height);
        ctx.lineTo(end.x * ctx.canvas.width, end.y * ctx.canvas.height);
      });
      ctx.stroke();
    };

    const tick = () => {
      if (stopped) return;
      const overlay = overlayRef.current;
      const video = videoRef.current;
      if (overlay && video && video.videoWidth > 0) {
        if (overlay.width !== video.videoWidth) overlay.width = video.videoWidth;
        if (overlay.height !== video.videoHeight) overlay.height = video.videoHeight;
        const ctx = overlay.getContext("2d");
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        const metrics = lastMetricsRef.current;
        const fresh = metrics && Date.now() - (metrics.detected_at || 0) < 1500;
        if (fresh && metrics.landmarks) {
          drawConnections(ctx, metrics.landmarks, sets.FACE_LANDMARKS_TESSELATION, {
            color: "rgba(143, 208, 197, 0.18)",
            lineWidth: 1,
          });
          drawConnections(ctx, metrics.landmarks, sets.FACE_LANDMARKS_FACE_OVAL, {
            color: "rgba(95, 184, 170, 0.95)",
            lineWidth: 2,
          });
          drawConnections(ctx, metrics.landmarks, sets.FACE_LANDMARKS_LEFT_EYE, {
            color: "rgba(74, 222, 128, 0.95)",
            lineWidth: 2,
          });
          drawConnections(ctx, metrics.landmarks, sets.FACE_LANDMARKS_RIGHT_EYE, {
            color: "rgba(74, 222, 128, 0.95)",
            lineWidth: 2,
          });
          drawConnections(ctx, metrics.landmarks, sets.FACE_LANDMARKS_LEFT_IRIS, {
            color: "rgba(250, 204, 21, 1)",
            lineWidth: 2,
          });
          drawConnections(ctx, metrics.landmarks, sets.FACE_LANDMARKS_RIGHT_IRIS, {
            color: "rgba(250, 204, 21, 1)",
            lineWidth: 2,
          });
          drawConnections(ctx, metrics.landmarks, sets.FACE_LANDMARKS_LIPS, {
            color: "rgba(222, 162, 138, 0.85)",
            lineWidth: 2,
          });

          if (!detected) {
            setDetected(true);
            setPulse(true);
            window.setTimeout(() => setPulse(false), 1500);
          }
        } else if (detected) {
          setDetected(false);
        }
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [cameraEnabled, detected, lastMetricsRef, videoRef]);

  const borderColor = !cameraOn
    ? "border-slate-700"
    : !cameraEnabled
    ? "border-amber-500"
    : detected
    ? "border-emerald-400"
    : "border-cyan-500";

  return (
    <div className={`${SHELL_BASE} ${borderColor} ${pulse ? "ring-4 ring-emerald-400/50" : ""}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="block aspect-video w-full -scale-x-100 bg-slate-950 object-cover"
      />
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"
      />

      {!cameraOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/85 text-slate-300">
          <VideoOff size={28} />
          <p className="text-xs">Kamera kapali</p>
        </div>
      )}

      {cameraOn && !cameraEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70 text-amber-200">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-300 border-t-transparent" />
          <p className="text-xs">Kamera baslatiliyor...</p>
        </div>
      )}

      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
        {cameraEnabled && detected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-emerald-50 shadow">
            <CheckCircle2 size={14} />
            Yuz algilandi
          </span>
        )}
        {cameraEnabled && !detected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-600/80 px-3 py-1 text-xs font-semibold text-cyan-50 shadow">
            <ScanFace size={14} className="animate-pulse" />
            Yuz araniyor...
          </span>
        )}
      </div>

      {pulse && (
        <div className="pointer-events-none absolute inset-0 animate-ping rounded-2xl border-4 border-emerald-300/60" />
      )}
    </div>
  );
}
