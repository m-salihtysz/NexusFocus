import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function FreelanceWorkspace({ focus, history, connectionStatus }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-cyan-300">Freelance Workspace</h2>
        <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs text-cyan-100">
          Flow + Verim
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-400">WebSocket: {connectionStatus}</p>

      <div className="mt-4 h-64 rounded-xl border border-slate-800 bg-slate-950 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="focus" stroke="#22d3ee" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="chaos"
              stroke="#f87171"
              strokeWidth={2}
              dot={false}
              name="cursor chaos"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Metric title="Hybrid Score" value={focus.hybrid_score} />
        <Metric title="Imlec Kaosu" value={focus.cursor_chaos} />
        <Metric title="Bilissel Donma" value={focus.cognitive_freeze} />
        <Metric title="Bakis Hiz" value={focus.gaze_speed.toFixed(2)} />
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
