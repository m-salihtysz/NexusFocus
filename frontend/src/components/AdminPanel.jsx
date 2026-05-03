import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function riskLabel(value) {
  if (value >= 75) return "Low risk";
  if (value >= 50) return "Moderate risk";
  return "High risk";
}

export default function AdminPanel({ focus, recommendations, history }) {
  const teamData = history.slice(-6).map((entry, index) => ({
    name: `T-${index + 1}`,
    focus: entry.focus,
    load: entry.load,
  }));

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-semibold text-emerald-300">Kurumsal Modulu</h2>
      <p className="mt-3 text-sm text-slate-300">
        Enterprise insight (anonymized) from focus telemetry.
      </p>
      <p className="mt-2 inline-block rounded-full border border-emerald-800 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-200">
        Productivity risk: {riskLabel(focus.focus_score)}
      </p>
      <p className="mt-2 text-sm text-slate-400">Blink rate: {focus.blink_rate}</p>
      <p className="text-sm text-slate-400">Gaze speed: {focus.gaze_speed}</p>
      <div className="mt-4 h-56 rounded-xl border border-slate-800 bg-slate-950 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={teamData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="focus" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Bar dataKey="load" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2">
        {recommendations.map((item) => (
          <div key={item} className="rounded-lg bg-slate-950 p-2 text-xs text-emerald-100">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
