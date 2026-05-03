import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

function Row({ label, status, detail }) {
  const Icon =
    status === "ok" ? CheckCircle2 : status === "warn" ? AlertTriangle : XCircle;
  const color =
    status === "ok"
      ? "text-emerald-300"
      : status === "warn"
      ? "text-amber-300"
      : "text-rose-300";

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-3">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        {detail ? <p className="mt-1 text-xs text-slate-400">{detail}</p> : null}
      </div>
      <div className={`inline-flex items-center gap-2 text-xs font-semibold ${color}`}>
        <Icon size={16} />
        {status === "ok" ? "OK" : status === "warn" ? "Kontrol" : "Hata"}
      </div>
    </div>
  );
}

export default function TestCenter({
  connectionStatus,
  cameraOn,
  cameraEnabled,
  trackerReady,
  cameraStatus,
}) {
  const [backendOk, setBackendOk] = useState(null);
  const [backendMsg, setBackendMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/health", { method: "GET" });
        const txt = await res.text();
        if (cancelled) return;
        setBackendOk(res.ok);
        setBackendMsg(txt.slice(0, 120));
      } catch (e) {
        if (cancelled) return;
        setBackendOk(false);
        setBackendMsg(e?.message || "Baglanti hatasi");
      }
    };
    run();
    const id = window.setInterval(run, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const wsStatus =
    connectionStatus === "connected"
      ? { s: "ok", d: "WebSocket baglantisi aktif." }
      : connectionStatus === "connecting"
      ? { s: "warn", d: "Baglanti kuruluyor..." }
      : { s: "bad", d: "WebSocket baglantisi yok." };

  const camStatus = !cameraOn
    ? { s: "warn", d: "Kamera kapali (grafikler yine de mouse/screen ile akar)." }
    : cameraEnabled
    ? trackerReady
      ? { s: "ok", d: "MediaPipe hazir, yuz/goz olculuyor." }
      : { s: "warn", d: "MediaPipe yukleniyor..." }
    : { s: "warn", d: "Kamera fallback modda (permission/cihaz kontrol et)." };

  const camPerm =
    cameraStatus === "denied"
      ? { s: "bad", d: "Tarayicida kamera izni reddedilmis." }
      : cameraStatus === "nodevice"
      ? { s: "bad", d: "Kamera bulunamadi." }
      : cameraStatus === "error"
      ? { s: "bad", d: "Kamera baslatma hatasi." }
      : { s: "ok", d: "Kamera izin/cihaz durumu normal." };

  const apiStatus =
    backendOk === null
      ? { s: "warn", d: "Backend kontrol ediliyor..." }
      : backendOk
      ? { s: "ok", d: backendMsg || "Backend ayakta." }
      : { s: "bad", d: backendMsg || "Backend erisilemiyor." };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Test Merkezi</h3>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{
            background: "var(--accentSoft)",
            color: "var(--accentText)",
          }}
        >
          Canli
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Row label="Backend /health" status={apiStatus.s} detail={apiStatus.d} />
        <Row label="WebSocket /ws/focus" status={wsStatus.s} detail={wsStatus.d} />
        <Row label="Kamera + MediaPipe" status={camStatus.s} detail={camStatus.d} />
        <Row label="Kamera izin durumu" status={camPerm.s} detail={camPerm.d} />
      </div>
    </section>
  );
}

