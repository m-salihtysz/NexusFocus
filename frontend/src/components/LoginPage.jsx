import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  UserCog,
} from "lucide-react";
import GoogleAuthCard from "./GoogleAuthCard";

const tabs = [
  {
    id: "ogrenci",
    page: "student",
    label: "Ogrenci",
    icon: GraduationCap,
    color: "bg-indigo-500",
    headline: "Ogrenci Girisi",
    description:
      "Anlama, sabitlik ve ders odakli takip. Sadece kendine ait raporu gorursun.",
    bullets: [
      "Pomodoro uyumlu hibrit odak skoru",
      "Goz ve mimik bazli yorgunluk uyarisi",
      "Canli AI tavsiye ve odak panelleri",
    ],
  },
  {
    id: "freelance",
    page: "freelance",
    label: "Freelance",
    icon: MousePointer2,
    color: "bg-amber-600",
    headline: "Freelance Girisi",
    description:
      "Flow odakli calisma: fare ve ekran sinyalleri agirlikli hibrit skor; bagimsiz calisanlar icin.",
    bullets: [
      "Fare/ekran kaosu ve flow metrikleri",
      "Kamera ile mimik ve yorgunluk (istege bagli)",
      "Flow panelleri ve AI onerileri",
    ],
  },
  {
    id: "kurumsal",
    page: "enterprise",
    label: "Kurumsal",
    icon: Building2,
    color: "bg-emerald-600",
    headline: "Kurumsal Calisan Girisi",
    description:
      "Yalnizca sirket yoneticisinin calisan listesine ekledigi Google e-postasi ile giris yapilir; liste disindaki hesaplar kabul edilmez.",
    bullets: [
      "E-posta admin tarafindan 'Calisanlar'a eklenmeli",
      "Ergonomi + yorgunluk takibi",
      "Anonim ekip metrikleri (isim/ozet yok)",
    ],
  },
  {
    id: "admin",
    page: "enterprise",
    label: "Admin Girisi",
    icon: UserCog,
    color: "bg-amber-600",
    headline: "Sirket Admin Girisi",
    description:
      "Sirket tenant'i olusturma, calisan e-postalarini ekleme ve panel ID; calisanlar 'Kurumsal' sekmesinden girer.",
    bullets: [
      "Tenant + Admin Panel ID",
      "Calisan e-posta listesi (sadece bu mailler kurumsal giris yapar)",
      "Detayli rapor ve tenant yonetimi",
    ],
  },
];

export default function LoginPage({
  user,
  onLoginSuccess,
  onLogout,
  onBack,
  onOpenPrivacy,
  initialTab = "ogrenci",
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const tab = tabs.find((item) => item.id === activeTab) || tabs[0];

  const loginKindForApi =
    tab.id === "admin"
      ? "kurumsal_admin"
      : tab.id === "kurumsal"
      ? "kurumsal_calisan"
      : tab.id === "freelance"
      ? "freelance"
      : "ogrenci";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition ${
                active
                  ? `border-transparent ${item.color} text-white`
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative flex flex-col justify-center overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-10">

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            <Sparkles size={14} /> {tab.label} alani
          </span>
          <h1 className="mt-5 text-3xl font-bold text-white md:text-4xl">{tab.headline}</h1>
          <p className="mt-3 max-w-md text-sm text-slate-300">{tab.description}</p>

          <div className="mt-6 space-y-3 text-sm text-slate-300">
            {tab.bullets.map((line) => (
              <div key={line} className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-300" />
                {line}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft size={14} /> Anasayfa
            </button>
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="text-cyan-300 underline-offset-2 hover:underline"
            >
              KVKK ve Gizlilik Politikasi
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <div className="w-full">
            <GoogleAuthCard
              user={user}
              area={tab.id === "admin" ? "kurumsal" : tab.id}
              loginKind={loginKindForApi}
              onLogin={(authedUser) => {
                if (!authedUser) return;
                onLoginSuccess?.({
                  user: authedUser,
                  area: tab.id === "admin" ? "kurumsal" : tab.id,
                  page: tab.page,
                  role: authedUser.role || "user",
                  loginKind: loginKindForApi,
                });
              }}
              onLogout={onLogout}
            />
            <p className="mt-4 text-center text-xs text-slate-500">
              {tab.label} sekmesinden giris yaparak rolun otomatik atanir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
