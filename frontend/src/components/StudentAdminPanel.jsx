import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function StudentAdminPanel({ focus, recommendations, history }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-indigo-300">Ogrenci Admin Paneli</h2>
        <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs text-indigo-100">
          Anlama + Sabitlik
        </span>
      </div>

      <div className="mt-4 h-64 rounded-xl border border-slate-800 bg-slate-950 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="studentFocus" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="focus" stroke="#818cf8" fill="url(#studentFocus)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Metric title="Hybrid Score" value={focus.hybrid_score} />
        <Metric title="Bakis Sapmasi" value={focus.gaze_deviation} />
        <Metric title="Bilissel Donma" value={focus.cognitive_freeze} />
        <Metric title="Duygusal Tepki" value={focus.emotional_reaction} />
      </div>

      <div className="mt-5 space-y-2">
        {recommendations.map((item) => (
          <div key={item} className="rounded-lg bg-slate-950 p-3 text-sm text-indigo-100">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
