import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function StudentDashboard({ focus, history, cameraEnabled }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-semibold text-indigo-300">Ogrenci Modulu</h2>
      <p className="mt-2 text-sm text-slate-300">
        Kamera durumu:{" "}
        <span className="font-medium text-white">{cameraEnabled ? "aktif" : "fallback"}</span>
      </p>
      <div className="mt-4 h-72 rounded-xl border border-slate-800 bg-slate-950 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="focus"
              stroke="#818cf8"
              fillOpacity={1}
              fill="url(#focusGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        Hibrit odak skoru: <span className="font-semibold text-white">{focus.hybrid_score}</span>
      </p>
      <p className="text-sm text-slate-400">Bilissel yuk: {focus.cognitive_load}</p>
    </section>
  );
}
