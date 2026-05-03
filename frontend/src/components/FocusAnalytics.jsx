import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function fmt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return Math.round(n).toString();
}

function tooltipFormatter(value, name) {
  const label =
    name === "Hybrid Score"
      ? "Odak"
      : name === "Bilissel Yuk"
      ? "Bilissel Yuk"
      : name === "Cursor Chaos"
      ? "Imlec Kaosu"
      : name === "Blink Rate"
      ? "Goz Kirpma"
      : name;
  return [`${fmt(value)}`, label];
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{
            background: "var(--accentSoft)",
            color: "var(--accentText)",
          }}
        >
          Analiz
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function FocusAnalytics({ history, compact = false }) {
  const hasData = Array.isArray(history) && history.length > 2;

  if (!hasData) {
    return (
      <Card title={compact ? "Kisa trend" : "Grafikler ve Analiz"}>
        <p className="text-sm text-slate-300">
          Grafikler canli veri geldikce olusur. Kamera aciksa veya websocket baglantisi kurulduysa
          5-10 saniye icinde cizimler baslar.
        </p>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card title="Odak & bilissel yuk (ozet)">
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#64748b", fontSize: 9 }} domain={[0, 100]} width={28} />
              <Tooltip
                contentStyle={{
                  background: "rgba(2,6,23,0.92)",
                  border: "1px solid rgba(30,41,59,1)",
                  borderRadius: 10,
                }}
                formatter={tooltipFormatter}
              />
              <Line
                type="monotone"
                dataKey="focus"
                name="Hybrid Score"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="load"
                name="Bilissel Yuk"
                stroke="#fb7185"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Odak & Bilissel Yuk (Son 30 sn)">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                domain={[0, 100]}
                tickMargin={8}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(2,6,23,0.92)",
                  border: "1px solid rgba(30,41,59,1)",
                  borderRadius: 12,
                }}
                labelStyle={{ color: "#e2e8f0" }}
                itemStyle={{ color: "#e2e8f0" }}
                formatter={tooltipFormatter}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="focus"
                name="Hybrid Score"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="load"
                name="Bilissel Yuk"
                stroke="#fb7185"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Imlec Kaosu & Goz Kirpma (Son 30 sn)">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                domain={[0, 100]}
                tickMargin={8}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(2,6,23,0.92)",
                  border: "1px solid rgba(30,41,59,1)",
                  borderRadius: 12,
                }}
                labelStyle={{ color: "#e2e8f0" }}
                itemStyle={{ color: "#e2e8f0" }}
                formatter={tooltipFormatter}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="chaos"
                name="Cursor Chaos"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="blink"
                name="Blink Rate"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

