const labelMap = {
  neutral: "Notr",
  fatigue: "Yorgun",
  stress: "Gergin",
  distraction: "Dikkat Dagilmis",
  positivity: "Pozitif",
  surprise: "Sasirgin",
};

function pct(n) {
  const v = Number.isFinite(n) ? n : 0;
  return `${Math.round(v)}%`;
}

function Chip({ children }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold"
      style={{ background: "var(--accentSoft)", color: "var(--accentText)" }}
    >
      {children}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Bar({ value, color }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div className="h-full" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

export default function ExpressionAnalysisTable({ history }) {
  const rows = Array.isArray(history) ? history : [];
  const hasData = rows.length > 2 && rows.some((r) => r?.dominant);

  if (!hasData) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Mimik Durumuna Gore Analiz</h3>
          <Chip>Tablo</Chip>
        </div>
        <p className="mt-4 text-sm text-slate-300">
          Mimik analizi, MediaPipe blendshape verisi geldikce tabloyu doldurur.
        </p>
      </section>
    );
  }

  const slice = rows.slice(-30);
  const avg = (key) => slice.reduce((acc, r) => acc + (Number(r?.[key]) || 0), 0) / slice.length;
  const dominantCounts = slice.reduce((acc, r) => {
    const k = r?.dominant || "neutral";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const dominantSorted = Object.entries(dominantCounts).sort((a, b) => b[1] - a[1]);
  const dominantTop = dominantSorted[0]?.[0] || "neutral";
  const dominantTopPct = slice.length ? (dominantCounts[dominantTop] / slice.length) * 100 : 0;
  const last10 = slice.slice(-10).reverse();

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Mimik Durumuna Gore Analiz</h3>
          <p className="mt-1 text-xs text-slate-400">Son 30 saniye ozet + son 10 olcum.</p>
        </div>
        <Chip>Baskin: {labelMap[dominantTop] || "Notr"} ({pct(dominantTopPct)})</Chip>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Stat label="Ortalama Yorgunluk" value={pct(avg("fatigue"))} />
        <Stat label="Ortalama Gerginlik" value={pct(avg("stress"))} />
        <Stat label="Ortalama Dikkat Dagilmasi" value={pct(avg("distract"))} />
        <Stat label="Ortalama Pozitiflik" value={pct(avg("positive"))} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-sm font-semibold text-white">Dominant dagilimi (son 30 sn)</p>
          <div className="mt-3 space-y-3">
            {dominantSorted.slice(0, 5).map(([key, count]) => {
              const percent = slice.length ? (count / slice.length) * 100 : 0;
              return (
                <div key={key} className="grid gap-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>{labelMap[key] || key}</span>
                    <span>{pct(percent)}</span>
                  </div>
                  <Bar value={percent} color={key === dominantTop ? "var(--accent)" : "rgba(148,163,184,0.6)"} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-sm font-semibold text-white">Son 10 olcum</p>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-800">
            <div className="grid grid-cols-6 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-300">
              <div className="col-span-2">Saat</div>
              <div>Yor</div>
              <div>Ger</div>
              <div>Dikk</div>
              <div>Poz</div>
            </div>
            <div className="divide-y divide-slate-800">
              {last10.map((r, idx) => (
                <div
                  key={`${r.time}-${idx}`}
                  className="grid grid-cols-6 items-center px-3 py-2 text-xs text-slate-200"
                >
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-slate-400">{r.time}</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px]" style={{ color: "var(--accentText)" }}>
                      {labelMap[r.dominant] || "Notr"}
                    </span>
                  </div>
                  <div>{pct(r.fatigue)}</div>
                  <div>{pct(r.stress)}</div>
                  <div>{pct(r.distract)}</div>
                  <div>{pct(r.positive)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

