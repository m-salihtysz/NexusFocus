import { useMemo } from "react";
import { AlertTriangle, Brain, Clock, MousePointer2, Sparkles } from "lucide-react";
import FocusAdvisorChat from "./FocusAdvisorChat";
import { buildMinuteWindowInsights } from "../lib/recentFocusWindow";

function clamp(n, min = 0, max = 100) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(max, Math.max(min, x));
}

function fmtInt(n) {
  return String(Math.round(clamp(n)));
}

/** Alan + skorlara göre özet uyarı / öneri tonu */
function getAdvisorContext(area, focus) {
  const hybrid = clamp(focus.hybrid_score || focus.focus_score);
  const load = clamp(focus.cognitive_load);
  const chaos = clamp(focus.cursor_chaos);
  const posture = clamp(focus.posture_shift);
  const gaze = clamp(focus.gaze_deviation);
  const fatigue = clamp(focus.expression_fatigue);
  const stress = clamp(focus.expression_stress);
  const away = clamp(100 - (focus.screen_focus ?? 100));

  let severity = "ok";
  const reasons = [];

  if (load > 68) {
    severity = load > 82 ? "alert" : severity === "ok" ? "warn" : severity;
    reasons.push("Bilişsel yük yüksek; kısa mola veya görev parçalama önerilir.");
  }
  if (hybrid < 48) {
    severity = hybrid < 32 ? "alert" : severity === "ok" ? "warn" : severity;
    reasons.push("Odak skoru düşük; tek göreve dönüp dikkat dağıtıcıları kapat.");
  }

  if (area === "ogrenci") {
    if (fatigue > 60) {
      severity = fatigue > 78 ? "alert" : "warn";
      reasons.push("Yorgunluk belirgin: 5–10 dk göz dinlendirmesi iyi gelir.");
    }
    if (gaze > 55) {
      severity = severity === "ok" ? "warn" : severity;
      reasons.push("Bakış ekrandan çok kayıyor; paragraf başına küçük hedef koy.");
    }
  } else if (area === "kurumsal") {
    if (posture > 55) {
      severity = posture > 72 ? "alert" : "warn";
      reasons.push("Postür kayması: monitör hizası ve sırt desteğini kontrol et.");
    }
    if (away > 40) {
      severity = severity === "ok" ? "warn" : severity;
      reasons.push("Ekran dışına çıkma sık; toplantı notlarını tek pencerede topla.");
    }
  } else if (area === "freelance") {
    if (chaos > 55) {
      severity = chaos > 75 ? "alert" : "warn";
      reasons.push("İmlek hareketi kaotik; sekme sayısını azalt, tek iş blokuna geç.");
    }
    if (stress > 62) {
      severity = severity === "ok" ? "warn" : severity;
      reasons.push("Gerginlik yüksek; nefes molası veya hafif esneme ekle.");
    }
  }

  if (reasons.length === 0) {
    reasons.push(
      area === "ogrenci"
        ? "Ritim iyi görünüyor; bu tempoda çalışmaya devam edebilirsin."
        : area === "kurumsal"
        ? "Denge iyi; ergonomi ve kısa molalarla ritmi koru."
        : "Akış dengeli; derin çalışma bloğunu sürdürmeye uygun."
    );
  }

  return { severity, reasons };
}

const AREA_META = {
  ogrenci: {
    heading: "Öğrenci verimliliği",
    tag: "Ders & çalışma",
    shell: "from-indigo-950/40 via-slate-950 to-slate-950 border-indigo-500/25",
    kpiAccent: "text-indigo-200",
  },
  kurumsal: {
    heading: "Kurumsal verimlilik",
    tag: "Ergonomi & süreklilik",
    shell: "from-emerald-950/35 via-slate-950 to-slate-950 border-emerald-500/25",
    kpiAccent: "text-emerald-200",
  },
  freelance: {
    heading: "Freelance verimliliği",
    tag: "Akış & derin iş",
    shell: "from-amber-950/30 via-slate-950 to-slate-950 border-amber-500/25",
    kpiAccent: "text-amber-100",
  },
};

function KpiCard({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 text-center shadow-inner">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums md:text-4xl ${tone}`}>{value}</p>
    </div>
  );
}

function MetricBar({ label, value, color }) {
  const v = clamp(value);
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="tabular-nums text-slate-300">{fmtInt(v)}</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${v}%`, background: color }} />
      </div>
    </div>
  );
}

function buildKpis(area, focus) {
  if (area === "ogrenci") {
    return [
      { label: "Hibrit skor", value: fmtInt(focus.hybrid_score || focus.focus_score), key: "h" },
      { label: "Bilişsel yük", value: fmtInt(focus.cognitive_load), key: "l" },
      { label: "Bakış sapması", value: fmtInt(focus.gaze_deviation), key: "g" },
    ];
  }
  if (area === "kurumsal") {
    return [
      { label: "Hibrit skor", value: fmtInt(focus.hybrid_score || focus.focus_score), key: "h" },
      { label: "Bilişsel yük", value: fmtInt(focus.cognitive_load), key: "l" },
      { label: "Postür kayması", value: fmtInt(focus.posture_shift), key: "p" },
    ];
  }
  return [
    { label: "Akış skoru", value: fmtInt(focus.hybrid_score || focus.focus_score), key: "h" },
    { label: "Bilişsel yük", value: fmtInt(focus.cognitive_load), key: "l" },
    { label: "İmlek kaosu", value: fmtInt(focus.cursor_chaos), key: "c" },
  ];
}

/** Fare bekleme süresini 0–100 skor (uzun bekleme = yüksek) */
function idleStressPct(idleSec) {
  const s = Number(idleSec);
  if (!Number.isFinite(s) || s <= 0) return 0;
  return clamp(s * 3.33, 0, 100);
}

function MouseTrackPanel({ focus }) {
  const speedPct = clamp((Number(focus.mouse_speed) || 0) * 100);
  const idleSec = Number(focus.mouse_idle_sec) || 0;
  const chaos = clamp(focus.cursor_chaos);
  const freeze = clamp(focus.cognitive_freeze);
  const idleBar = idleStressPct(idleSec);
  const switches = Number(focus.site_switch_count) || 0;
  const switchBar = clamp(switches * 9);

  return (
    <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/60 pb-3">
        <MousePointer2 className="text-sky-400" size={18} aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fare ve sayfa</p>
        <span className="ml-auto tabular-nums text-[11px] text-slate-500">
          Son hareket: {idleSec < 0.05 ? "—" : `${idleSec.toFixed(1)} sn önce`}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Fare örnekleri, tarayıcının izin verdiği ölçüde bu pencerede üretilen hareketlerden hesaplanır
        (sekme arka plandayken çoğu tarayıcı olay göndermez; başka programdaki imleç okunamaz).
        {focus.site_path ? (
          <>
            {" "}
            Yol: <span className="font-mono text-slate-400">{String(focus.site_path).slice(0, 48)}</span>
          </>
        ) : null}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricBar label="Hareket hızı" value={speedPct} color="#38bdf8" />
        <MetricBar label="İmlek kaosu" value={chaos} color="#f59e0b" />
        <MetricBar label="Hareketsizlik" value={idleBar} color="#94a3b8" />
        <MetricBar label="Donma / kilitlenme" value={freeze} color="#22d3ee" />
        <MetricBar label="Sayfa geçişi (5 dk)" value={switchBar} color="#a78bfa" />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Son 5 dakikada <span className="tabular-nums text-slate-300">{switches}</span> tam URL değişimi
        (SPA içi rota dahil).
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Ham koordinat kaydedilmez; yalnızca hız / kaos / bekleme gibi özet metrikler iletilir.
      </p>
    </div>
  );
}

function buildBars(area, focus) {
  if (area === "ogrenci") {
    return [
      { label: "Yorgunluk", value: focus.expression_fatigue, color: "#f87171" },
      { label: "Gerginlik", value: focus.expression_stress, color: "#fb923c" },
      { label: "Dağınıklık", value: focus.expression_distraction, color: "#a78bfa" },
      { label: "Pozitiflik", value: focus.expression_positivity, color: "#4ade80" },
    ];
  }
  if (area === "kurumsal") {
    const screenStrain = clamp(100 - (focus.screen_focus ?? 100));
    return [
      { label: "Yorgunluk", value: focus.expression_fatigue, color: "#f87171" },
      { label: "Gerginlik", value: focus.expression_stress, color: "#fb923c" },
      { label: "Ekran dışı eğilim", value: screenStrain, color: "#fbbf24" },
      { label: "Postür baskısı", value: focus.posture_shift, color: "#34d399" },
    ];
  }
  return [
    { label: "Yorgunluk", value: focus.expression_fatigue, color: "#f87171" },
    { label: "Gerginlik", value: focus.expression_stress, color: "#fb923c" },
    { label: "İmlek kaosu", value: focus.cursor_chaos, color: "#f59e0b" },
    { label: "Bilişsel donma", value: focus.cognitive_freeze, color: "#22d3ee" },
  ];
}

export default function ProductivityDashboard({
  area = "ogrenci",
  focus,
  recommendations = [],
  instantFeedback,
  minuteSummary = null,
  cameraEnabled,
  faceDetected,
  children,
}) {
  const meta = AREA_META[area] || AREA_META.ogrenci;
  const { severity, reasons } = getAdvisorContext(area, focus);
  const minuteLines = useMemo(
    () => buildMinuteWindowInsights(area, minuteSummary),
    [area, minuteSummary]
  );
  const kpis = buildKpis(area, focus);
  const bars = buildBars(area, focus);

  const aiBorder =
    severity === "alert"
      ? "border-rose-500/50 bg-rose-950/25 shadow-[0_0_40px_-12px_rgba(244,63,94,0.35)]"
      : severity === "warn"
      ? "border-amber-500/45 bg-amber-950/20 shadow-[0_0_32px_-14px_rgba(245,158,11,0.3)]"
      : "border-cyan-500/30 bg-slate-900/60 shadow-[0_0_28px_-12px_rgba(34,211,238,0.2)]";

  const rawLines = [
    instantFeedback,
    ...(Array.isArray(recommendations) ? recommendations.filter(Boolean) : []),
  ].filter(Boolean);
  const primaryLines = rawLines.filter((line, i) => {
    const t = String(line).trim();
    if (!t) return false;
    return rawLines.findIndex((x) => String(x).trim() === t) === i;
  });

  return (
    <section
      className={`overflow-hidden rounded-3xl border bg-gradient-to-br p-5 md:p-6 ${meta.shell}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">NexusFocus</p>
          <h1 className="mt-1 text-xl font-bold text-white md:text-2xl">{meta.heading}</h1>
          <p className="mt-1 text-sm text-slate-400">{meta.tag}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1">
            Kamera: {cameraEnabled ? "aktif" : "bekleniyor"}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1">
            Yüz: {faceDetected ? "algılandı" : cameraEnabled ? "aranıyor" : "—"}
          </span>
        </div>
      </div>

      {/* Kamera ve Canlı Analiz */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-stretch">
        <div className="min-h-[220px] lg:min-h-[280px]">{children}</div>
        <div className="flex flex-col justify-center space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Canlı analiz</p>
          {bars.map((b) => (
            <MetricBar key={b.label} label={b.label} value={b.value} color={b.color} />
          ))}
        </div>
      </div>

      {/* AI ön planda (Küçültülmüş) */}
      <div className={`mt-5 rounded-xl border p-4 md:p-5 ${aiBorder}`}>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-sky-200">
          {severity === "alert" ? (
            <AlertTriangle className="text-rose-300" size={16} />
          ) : severity === "warn" ? (
            <AlertTriangle className="text-amber-200" size={16} />
          ) : (
            <Sparkles className="text-cyan-200" size={16} />
          )}
          AI anlık tavsiye
          <span className="ml-auto rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-slate-400">
            {severity === "alert" ? "Uyarı" : severity === "warn" ? "Dikkat" : "Öneri"}
          </span>
        </div>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-100">
          {reasons.map((r) => (
            <p key={r} className="flex gap-2">
              <Brain className="mt-0.5 shrink-0 text-sky-300/80" size={16} />
              <span>{r}</span>
            </p>
          ))}
          {minuteLines.length > 0 && (
            <div className="mt-2 rounded-lg border border-slate-700/70 bg-slate-950/50 p-2 md:p-3">
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <Clock className="text-cyan-400/90" size={14} aria-hidden />
                Son ~1 dakika (canlı özet)
              </p>
              <ul className="mt-1 space-y-1 text-xs leading-snug text-slate-300">
                {minuteLines.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="shrink-0 text-cyan-400/80">▸</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {primaryLines.length > 0 && (
            <div className="border-t border-slate-700/50 pt-2 text-xs text-slate-300 md:text-sm">
              {primaryLines.map((line, i) => (
                <p key={i} className={i > 0 ? "mt-1.5" : ""}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <FocusAdvisorChat area={area} focus={focus} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 md:gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.key} label={k.label} value={k.value} tone={meta.kpiAccent} />
        ))}
      </div>

      <MouseTrackPanel focus={focus} />
    </section>
  );
}
