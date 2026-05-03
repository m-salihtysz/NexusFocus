import {
  ArrowRight,
  Brain,
  Building2,
  CheckCircle2,
  Eye,
  GraduationCap,
  LineChart,
  MousePointer2,
  Monitor,
  Rocket,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "Goz ve Bakis Takibi",
    text: "MediaPipe iris izleme ile bakisin ekranda mi yoksa baska yerde mi sorgulanir.",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: ScanFace,
    title: "Mimik Analizi",
    text: "Face Mesh blendshape'leri ile yorgunluk, gerginlik, dikkat dagilmasi tespit edilir.",
    color: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: MousePointer2,
    title: "Fare Akisi",
    text: "Imlecin hizi, kaosu ve uzun duraksamalari bilissel donmayi gosterir.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Monitor,
    title: "Ekran ve Pencere Takibi",
    text: "Sekme degisimi, alt+tab sayisi, ekran disinda kalma suresi olculur.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Wand2,
    title: "AI Tavsiye",
    text: "OpenAI veya yerel LLM ile gercek zamanli, kullanici tipine ozel oneriler.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: ShieldCheck,
    title: "KVKK ve Gizlilik",
    text: "Ham kamera goruntusu hicbir sekilde sunucuya gonderilmez veya kaydedilmez.",
    color: "from-slate-500 to-slate-700",
  },
];

const steps = [
  {
    icon: Sparkles,
    title: "Kamerayi Ac",
    text: "Tarayici kameraya izin verir, MediaPipe modeli aninda yuklenir.",
  },
  {
    icon: Brain,
    title: "Sinyalleri Birlestir",
    text: "Goz, mimik, fare ve ekran metrikleri hibrit odak skoruna donusur.",
  },
  {
    icon: Rocket,
    title: "AI Sana Yol Gosterir",
    text: "Sana ve ekibine ozel tavsiyeler, raporlar ve uyarilar uretilir.",
  },
];

const modules = [
  {
    icon: GraduationCap,
    title: "Ogrenci",
    color: "from-indigo-500 to-blue-500",
    points: [
      "Anlama ve sabitlik takibi",
      "Pomodoro uyumlu mola onerisi",
      "Ders bazli odak raporu",
    ],
  },
  {
    icon: MousePointer2,
    title: "Freelance",
    color: "from-amber-500 to-rose-500",
    points: [
      "Flow modu ve teslim tahmini",
      "Fare/ekran kaosu tespiti",
      "Bilissel donma alarm sistemi",
    ],
  },
  {
    icon: Building2,
    title: "Kurumsal",
    color: "from-emerald-500 to-cyan-500",
    points: [
      "Anonimlestirilmis ekip dashboard",
      "Admin panel ID + calisan yonetimi",
      "Ergonomi ve yorgunluk uyarilari",
    ],
  },
];

const stats = [
  { value: "%94", label: "Odak iyilestirme orani" },
  { value: "10K+", label: "Hibrit sinyal noktasi/saat" },
  { value: "3", label: "Modul (Ogrenci/Kurumsal/Freelance)" },
  { value: "0", label: "Saklanan ham kamera frame" },
];

export default function LandingPage({ onStart, onLogin, onOpenPrivacy }) {
  return (
    <div className="space-y-20">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 md:p-12">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
              <Sparkles size={14} />
              Yeni Nesil Bilissel Verimlilik Platformu
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-white md:text-5xl">
              Yuz, goz, fare ve mimiklerinden
              <span className="block bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">
                gercek odak skorunu cikarir.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-300 md:text-lg">
              NexusFocus, kameranin goruntusunu sadece tarayicinda isler;
              MediaPipe Face Mesh ve hibrit AI ile sana, ekibine ve ogrencilerine
              ozel uretkenlik onerileri uretir.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400"
              >
                Hemen Basla
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Google ile Giris
              </button>
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="text-xs text-cyan-300 underline-offset-2 hover:underline"
              >
                Gizlilik nasil korunuyor?
              </button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                >
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sahte mockup */}
          <HeroMockup />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="scroll-mt-24 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Ne yapiyoruz?</h2>
          <p className="mt-2 text-sm text-slate-400">
            Tek tek izledigimiz davranis sinyalleri ve nasil islendigi
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-600"
              >
                <div
                  className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${feature.color} opacity-15 blur-2xl transition group-hover:opacity-30`}
                />
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-md`}
                >
                  <Icon size={18} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="scroll-mt-24 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 md:p-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Nasil calisir?</h2>
          <p className="mt-2 text-sm text-slate-400">3 adimda hibrit odak takibi</p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-bold text-cyan-200">
                    {index + 1}
                  </span>
                  <Icon size={20} className="text-cyan-300" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="scroll-mt-24 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Kime gore?</h2>
          <p className="mt-2 text-sm text-slate-400">Her kullanici tipine ozel modul</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.title}
                className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${mod.color}`}
                />
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${mod.color} text-white shadow-lg`}
                >
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{mod.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {mod.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="mt-0.5 text-emerald-400" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-3xl border border-cyan-700/40 bg-gradient-to-br from-cyan-950 via-slate-950 to-slate-900 p-10 text-center">
        <LineChart size={36} className="mx-auto text-cyan-300" />
        <h2 className="mt-4 text-3xl font-bold text-white">
          Odagini olcmeden iyilestiremezsin.
        </h2>
        <p className="mt-3 text-sm text-slate-300">
          Temel takipten admin paneline ve canli AI tavsiyelere kadar tum moduller ayni deneyimle acilir.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-400"
          >
            Hemen Basla
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Google ile Giris
          </button>
        </div>
      </section>
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="relative">
      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-500/70" />
          <span className="h-3 w-3 rounded-full bg-amber-500/70" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
          <span className="ml-3 text-xs text-slate-400">NexusFocus Dashboard</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <MockMetric label="Hybrid Score" value="86" tone="text-emerald-300" />
          <MockMetric label="Bilissel Yuk" value="42" tone="text-cyan-300" />
          <MockMetric label="Bakis Sapmasi" value="18" tone="text-amber-300" />
        </div>

        <div className="mt-4 flex gap-3">
          <div className="relative aspect-video w-3/5 overflow-hidden rounded-xl border-2 border-emerald-400 bg-slate-900">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-transparent to-fuchsia-500/15" />
            <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/85 px-2 py-1 text-[10px] font-semibold text-emerald-50">
              <CheckCircle2 size={10} />
              Yuz algilandi
            </div>
            <FaceWireOverlay />
            <div className="absolute inset-0 animate-ping rounded-xl border-2 border-emerald-400/40" />
          </div>

          <div className="flex w-2/5 flex-col gap-2">
            <MockBar label="Yorgunluk" value={28} color="bg-rose-500/60" />
            <MockBar label="Gerginlik" value={42} color="bg-orange-500/60" />
            <MockBar label="Pozitiflik" value={68} color="bg-emerald-500/60" />
            <MockBar label="Dikkat" value={75} color="bg-cyan-500/60" />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-cyan-900 bg-cyan-950/30 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
            AI Anlik Tavsiye
          </p>
          <p className="mt-1 text-xs text-cyan-100">
            Postur dengeli, mimiklerin pozitif. Bu ritimde 20 dakika daha devam et.
          </p>
        </div>
      </div>
    </div>
  );
}

function MockMetric({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function MockBar({ label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className="text-[10px] font-semibold text-white">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function FaceWireOverlay() {
  return (
    <svg viewBox="0 0 200 120" className="absolute inset-0 h-full w-full">
      <ellipse cx="100" cy="62" rx="44" ry="52" stroke="rgba(34,211,238,0.6)" strokeWidth="1.5" fill="none" />
      <ellipse cx="83" cy="55" rx="9" ry="6" stroke="rgba(74,222,128,0.85)" strokeWidth="1.2" fill="none" />
      <ellipse cx="117" cy="55" rx="9" ry="6" stroke="rgba(74,222,128,0.85)" strokeWidth="1.2" fill="none" />
      <circle cx="83" cy="55" r="2" fill="rgba(250,204,21,1)" />
      <circle cx="117" cy="55" r="2" fill="rgba(250,204,21,1)" />
      <path d="M85 90 Q100 100 115 90" stroke="rgba(244,114,182,0.85)" strokeWidth="1.5" fill="none" />
      <path
        d="M70 30 L100 25 L130 30"
        stroke="rgba(56,189,248,0.4)"
        strokeWidth="0.8"
        fill="none"
      />
      <path
        d="M58 50 L70 60 L80 65"
        stroke="rgba(56,189,248,0.3)"
        strokeWidth="0.6"
        fill="none"
      />
      <path
        d="M142 50 L130 60 L120 65"
        stroke="rgba(56,189,248,0.3)"
        strokeWidth="0.6"
        fill="none"
      />
    </svg>
  );
}
