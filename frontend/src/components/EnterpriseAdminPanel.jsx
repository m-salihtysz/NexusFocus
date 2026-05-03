import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function EnterpriseAdminPanel({ focus, recommendations, history }) {
  const teamData = history.slice(-8).map((entry, index) => ({
    team: `Takim-${index + 1}`,
    focus: entry.focus,
    load: entry.load,
  }));

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-emerald-300">Kurumsal Admin Paneli</h2>
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-100">
          Ergonomi + Yorgunluk
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl border border-slate-800 bg-slate-950 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="team" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="focus" fill="#34d399" />
              <Bar dataKey="load" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-64 rounded-xl border border-slate-800 bg-slate-950 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="focus" stroke="#22d3ee" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="load" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Metric title="Hybrid Score" value={focus.hybrid_score} />
        <Metric title="Postur Kaymasi" value={focus.posture_shift} />
        <Metric title="Imlec Kaosu" value={focus.cursor_chaos} />
        <Metric title="Bilissel Yuk" value={focus.cognitive_load} />
      </div>

      <div className="mt-5 space-y-2">
        {recommendations.map((item) => (
          <div key={item} className="rounded-lg bg-slate-950 p-3 text-sm text-emerald-100">
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
