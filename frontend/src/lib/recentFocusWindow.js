/** Saniyelik WebSocket okumalarindan son ~1 dk ozet (en fazla 60 ornek). */

const FOCUS_WINDOW_MAX = 60;

function finite(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : NaN;
}

function average(arr) {
  const v = arr.filter((x) => Number.isFinite(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

/**
 * @param {Array<{ ts?: number, hybrid: number, load: number, gaze: number, chaos: number, fatigue: number, stress: number }>} buffer
 */
export function appendWindowSample(buffer, row) {
  const next = buffer.slice();
  next.push({
    ts: row.ts ?? Date.now(),
    hybrid: finite(row.hybrid ?? row.hybrid_score ?? row.focus_score),
    load: finite(row.load ?? row.cognitive_load),
    gaze: finite(row.gaze ?? row.gaze_deviation),
    chaos: finite(row.chaos ?? row.cursor_chaos),
    fatigue: finite(row.fatigue ?? row.expression_fatigue),
    stress: finite(row.stress ?? row.expression_stress),
  });
  while (next.length > FOCUS_WINDOW_MAX) next.shift();
  return next;
}

/**
 * @returns {null | {
 *   samples: number,
 *   hybrid_avg: number|null,
 *   hybrid_min: number,
 *   hybrid_max: number,
 *   hybrid_spread: number,
 *   trend: 'up'|'down'|'flat',
 *   load_peak: number|null,
 *   chaos_max: number|null,
 *   low_fraction: number,
 *   fatigue_delta: number,
 *   insufficient: boolean
 * }}
 */
export function summarizeFocusWindow(buffer) {
  if (!buffer.length) return null;
  const n = buffer.length;
  const hybrids = buffer.map((b) => b.hybrid).filter((x) => Number.isFinite(x));
  if (!hybrids.length) {
    return { samples: n, insufficient: true };
  }

  const third = Math.max(2, Math.floor(n / 3));
  const earlyHy = hybrids.slice(0, third);
  const lateHy = hybrids.slice(-third);
  const early = average(earlyHy);
  const late = average(lateHy);
  let trend = "flat";
  if (early != null && late != null) {
    if (early - late > 7) trend = "down";
    else if (late - early > 7) trend = "up";
  }

  const hybrid_min = Math.min(...hybrids);
  const hybrid_max = Math.max(...hybrids);
  const hybrid_avg = average(hybrids);
  const loads = buffer.map((b) => b.load).filter((x) => Number.isFinite(x));
  const chaosVals = buffer.map((b) => b.chaos).filter((x) => Number.isFinite(x));
  const fatigueVals = buffer.map((b) => b.fatigue).filter((x) => Number.isFinite(x));

  let fatigue_delta = 0;
  if (fatigueVals.length >= third * 2) {
    const fe = average(fatigueVals.slice(0, third));
    const fl = average(fatigueVals.slice(-third));
    if (fe != null && fl != null) fatigue_delta = Math.round(fl - fe);
  }

  return {
    samples: n,
    insufficient: n < 10,
    hybrid_avg: hybrid_avg != null ? Math.round(hybrid_avg) : null,
    hybrid_min: Math.round(hybrid_min),
    hybrid_max: Math.round(hybrid_max),
    hybrid_spread: Math.round(hybrid_max - hybrid_min),
    trend,
    load_peak: loads.length ? Math.round(Math.max(...loads)) : null,
    chaos_max: chaosVals.length ? Math.round(Math.max(...chaosVals)) : null,
    low_fraction: Math.round((hybrids.filter((h) => h < 45).length / hybrids.length) * 100) / 100,
    fatigue_delta: fatigue_delta,
  };
}

/**
 * Panelde gosterilecek kisa satirlar (Turkce).
 * @param {string} area
 * @param {ReturnType<typeof summarizeFocusWindow>} s
 * @returns {string[]}
 */
export function buildMinuteWindowInsights(area, s) {
  if (!s || s.insufficient) {
    if (s && s.samples > 0 && s.samples < 10) {
      return [`Son ~1 dk: henüz ${s.samples}/10 örnek; birazdan daha güvenilir özet çıkar.`];
    }
    return [];
  }
  const lines = [];
  const h = s.hybrid_avg != null ? `ort. hibrit ~${s.hybrid_avg}` : "hibrit verisi";
  lines.push(`Son ~1 dk (${s.samples} örnek): ${h}, aralık ${s.hybrid_min}–${s.hybrid_max}.`);

  if (s.trend === "down") {
    lines.push("Trend: bu pencerede odak skoru düşüyor; tek göreve dön veya 90 sn nefes molası.");
  } else if (s.trend === "up") {
    lines.push("Trend: son örneklere doğru odak toparlanıyor; bu ritmi sürdür.");
  }

  if (s.load_peak != null && s.load_peak > 78) {
    lines.push(`Bilişsel yük zirvesi ${s.load_peak}; görevi küçük adımlara böl veya kısa ara.`);
  }

  if (s.chaos_max != null && s.chaos_max > 62) {
    lines.push(`İmlek kaosu en fazla ${s.chaos_max}; sekmeleri kapatıp tek pencerede kal.`);
  }

  if (s.low_fraction >= 0.42) {
    lines.push("Bu dakikada skorun uzun süre düşük kaldığı anlar var; su + 2 dk göz dinlendirmesi iyi gelir.");
  }

  if (s.hybrid_spread > 38) {
    lines.push("Skorlar dalgalı; bildirimleri kıs veya dikkat dağıtıcıyı tek seferde kapat.");
  }

  if (area === "ogrenci" && s.fatigue_delta > 12) {
    lines.push("Yorgunluk sinyali bu dakikada artış eğiliminde; 20-20-20 ve kısa esneme.");
  }
  if (area === "kurumsal" && s.fatigue_delta > 12) {
    lines.push("Yorgunluk eğilimi yükseliyor; duruşu düzelt ve 1 dk omuz gevşetme.");
  }

  return lines.slice(0, 5);
}
