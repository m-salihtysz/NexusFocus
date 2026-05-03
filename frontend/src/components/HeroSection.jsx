import { ShieldCheck, Sparkles, WandSparkles } from "lucide-react";

export default function HeroSection({ cameraEnabled, instantFeedback }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
      <div className="grid gap-5 xl:grid-cols-2">
        <div>
          <p
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
            style={{ background: "var(--accentSoft)", color: "var(--accentText)" }}
          >
            <Sparkles size={14} />
            Yeni Nesil Odak Platformu
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-white md:text-4xl">
            Kamera + Fare + AI ile
            <br />
            Gercek Zamanli Odak Analizi
          </h1>
          <p className="mt-3 max-w-xl text-sm text-slate-300">
            NexusFocus, ogrenci ve kurumsal ekipler icin odak dagilimini, postur kaymasini ve
            bilissel yuk sinyallerini tek panelde toplar.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <ShieldCheck size={16} className="text-emerald-300" />
            Gizlilik: Ham kamera frame'i kaydedilmez.
          </div>
          <div className="text-sm text-slate-300">
            Kamera Durumu:
            <span
              className="ml-2 rounded-full bg-slate-800 px-2 py-1 text-xs"
              style={{ color: "var(--accentText)" }}
            >
              {cameraEnabled ? "Aktif" : "Fallback Mod"}
            </span>
          </div>
          <div
            className="rounded-xl border p-3 text-sm"
            style={{
              borderColor: "var(--accentSoft)",
              background: "rgba(2, 6, 23, 0.25)",
              color: "var(--accentText)",
            }}
          >
            <div className="mb-1 inline-flex items-center gap-2 font-semibold">
              <WandSparkles size={14} />
              AI Anlik Tavsiye
            </div>
            <p>{instantFeedback}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
