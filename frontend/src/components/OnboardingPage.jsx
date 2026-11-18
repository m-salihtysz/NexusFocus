import { ArrowRight, Building2, CheckCircle2, GraduationCap, MousePointer2 } from "lucide-react";

const areas = [
  {
    id: "ogrenci",
    page: "student",
    label: "Ogrenci",
    icon: GraduationCap,
    color: "bg-indigo-500",
    description: "Anlama, sabitlik ve okuma odakli takip.",
  },
  {
    id: "kurumsal",
    page: "enterprise",
    label: "Kurumsal",
    icon: Building2,
    color: "bg-emerald-600",
    description: "Ekip ergonomisi, anonim metrikler, admin paneli.",
  },
  {
    id: "freelance",
    page: "freelance",
    label: "Freelance",
    icon: MousePointer2,
    color: "bg-amber-600",
    description: "Flow modu, fare/ekran kaosu, teslim tahmini.",
  },
];

export default function OnboardingPage({
  selectedArea,
  onChangeArea,
  onConfirm,
  onBack,
  /** Giris sayfasinda secilen alan; true iken baska alana gecilemez. */
  lockAreaFromLogin = false,
}) {
  const area = areas.find((item) => item.id === selectedArea) || areas[0];
  const AreaIcon = area.icon;

  return (
    <div className="space-y-10">
      <header className="text-center">
        <p className="text-xs uppercase tracking-wider" style={{ color: "var(--accentText)" }}>
          {lockAreaFromLogin ? "Giris secimin" : "Senin alanin"}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">
          {lockAreaFromLogin
            ? `${area.label} alani ile devam ediyorsun`
            : "NexusFocus'i kim icin kullanacaksin?"}
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          {lockAreaFromLogin
            ? "Bu alan giris ekraninda sectigin secenekle sabitlendi."
            : "Alan secimi, takip algoritmasinin agirlik dengesini belirler."}
        </p>
        {!lockAreaFromLogin && (
          <p className="mx-auto mt-4 max-w-2xl rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-xs text-slate-300">
            <span className="font-semibold text-slate-200">Kurumsal:</span> Calisanlar yalnizca adminin
            ekledigi Google e-postasiyla giris yapar.{" "}
            <span className="font-semibold text-slate-200">Admin:</span> Giris ekranindaki &quot;Admin
            Girisi&quot; ile tenant ve calisan listesini olusturursun.{" "}
            <span className="font-semibold text-slate-200">Freelance:</span> Flow ve fare/ekran agirlikli
            modul.
          </p>
        )}
      </header>

      {lockAreaFromLogin ? (
        <section className="mx-auto max-w-lg">
          <div
            className={`relative overflow-hidden rounded-2xl border border-slate-600 bg-slate-900 p-6 ring-2`}
            style={{ boxShadow: "0 0 0 4px var(--accentSoft)" }}
          >
            <div className={`absolute inset-x-0 top-0 h-1 ${area.color}`} />
            <div
              className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${area.color} text-white`}
            >
              <AreaIcon size={22} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">{area.label}</h3>
            <p className="mt-2 text-sm text-slate-300">{area.description}</p>
            <p className="mt-3 text-xs text-slate-500">
              Baska bir modul icin cikis yapip giris ekranindan tekrar secmen gerekir.
            </p>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-3">
          {areas.map((item) => {
            const Icon = item.icon;
            const active = item.id === selectedArea;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeArea(item.id)}
                className={`relative overflow-hidden rounded-2xl border bg-slate-900 p-5 text-left transition ${
                  active ? "border-slate-600 ring-2" : "border-slate-800 hover:border-slate-600"
                }`}
                style={active ? { boxShadow: "0 0 0 4px var(--accentSoft)" } : undefined}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 ${item.color}`}
                />
                <div
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${item.color} text-white`}
                >
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.label}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                {active && (
                  <span
                    className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                    style={{ background: "var(--accentSoft)", color: "var(--accentText)" }}
                  >
                    <CheckCircle2 size={12} /> Secildi
                  </span>
                )}
              </button>
            );
          })}
        </section>
      )}

      <section className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:flex-row">
        <div>
          <p className="text-sm text-slate-300">
            Secim:{" "}
            <span className="font-semibold" style={{ color: "var(--accentText)" }}>
              {area.label}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tum ozellikler (AI tavsiye, admin paneli, grafikler) bu alanla birlikte acilir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Geri
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm({
                area: area.id,
                page: area.page,
                packageId: "standart",
                packageLabel: "NexusFocus",
              })
            }
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-950"
            style={{
              background: "var(--accent)",
              boxShadow: "0 18px 40px var(--accentShadow)",
            }}
          >
            Urun Sayfasini Ac
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
