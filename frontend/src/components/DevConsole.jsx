import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function DevConsole({ focus, history, connectionStatus }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-semibold text-cyan-300">Freelance Modulu</h2>
      <p className="mt-2 text-xs text-slate-400">WebSocket: {connectionStatus}</p>
      <div className="mt-4 h-64 rounded-xl border border-slate-800 bg-slate-950 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="focus" stroke="#22d3ee" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="load" stroke="#34d399" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <pre className="mt-4 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-cyan-100">
        {JSON.stringify(
          {
            ...focus,
            stream_points: history.length,
            status: connectionStatus,
          },
          null,
          2
        )}
      </pre>
    </section>
  );
}
