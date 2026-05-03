import { useEffect, useMemo, useState } from "react";
import {
  addEmployee,
  createTenant,
  getMyTenant,
  getReportEmailStatus,
  listEmployeeAnalytics,
  listEmployees,
  listTenantMembersActivity,
  listTenantMembersProductivity,
  removeEmployee,
  sendTenantReportEmail,
  updateTenant,
} from "../lib/tenantsClient";
import { DEMO_EMPLOYEE_ANALYTICS, KURUMSAL_DEMO_COMPANY_NAME } from "../lib/enterpriseDisplay";
import { useToast } from "./ToastProvider";

function employeeStatusLabel(status) {
  if (status === "invited") return "Davet gonderildi";
  if (status === "accepted") return "Giris uygun";
  return status;
}

function formatWorkMinutes(m) {
  const x = Number(m);
  if (!Number.isFinite(x) || x <= 0) return "—";
  if (x < 1) return "< 1 dk";
  if (x >= 120) return `${(x / 60).toFixed(1)} sa`;
  return `${x.toFixed(1)} dk`;
}

function formatActivityTs(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR");
}

function formatFocusHoursFromMinutes(m) {
  const x = Number(m);
  if (!Number.isFinite(x) || x <= 0) return "—";
  if (x < 60) return `${x.toFixed(1)} dk`;
  return `${(x / 60).toFixed(2)} sa`;
}

function activityStatusBadgeClass(code) {
  if (code === "active_panel" || code === "active_focus") return "border-emerald-700 bg-emerald-950/50 text-emerald-200";
  if (code === "recent") return "border-cyan-800 bg-cyan-950/40 text-cyan-100";
  if (code === "logged_out") return "border-slate-600 bg-slate-900 text-slate-300";
  if (code === "stale" || code === "no_login") return "border-amber-900/50 bg-amber-950/25 text-amber-100/90";
  return "border-slate-700 bg-slate-900 text-slate-400";
}

export default function EnterpriseAccessManager({ packageId, adminSessionEmail = "", user = null }) {
  const toast = useToast();
  const [tenant, setTenant] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeeAnalytics, setEmployeeAnalytics] = useState([]);
  const [memberActivity, setMemberActivity] = useState([]);
  const [memberProductivity, setMemberProductivity] = useState([]);
  const [expandedUserId, setExpandedUserId] = useState(null);
  /** null: henuz okunmadi; rapor e-postasi sunucu yapilandirmasi */
  const [reportMail, setReportMail] = useState(null);
  const [name, setName] = useState("NexusFocus Ekibi");
  const [companyCode, setCompanyCode] = useState("NEXUS");
  const [employeeCount, setEmployeeCount] = useState(5);
  const [emailInput, setEmailInput] = useState("");
  const [role, setRole] = useState("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const refresh = async () => {
    try {
      try {
        const st = await getReportEmailStatus();
        setReportMail({
          ready: Boolean(st?.ready),
          transport: st?.transport || "none",
        });
      } catch {
        setReportMail({ ready: false, transport: "none" });
      }
      const current = await getMyTenant();
      if (current) {
        setTenant(current);
        setName(current.name);
        setCompanyCode(current.company_code);
        setEmployeeCount(current.employee_count);
        const list = await listEmployees();
        setEmployees(list);
        try {
          const rows = await listEmployeeAnalytics();
          setEmployeeAnalytics(Array.isArray(rows) ? rows : []);
        } catch {
          setEmployeeAnalytics([]);
        }
        try {
          const act = await listTenantMembersActivity();
          setMemberActivity(Array.isArray(act) ? act : []);
        } catch {
          setMemberActivity([]);
        }
        try {
          const prod = await listTenantMembersProductivity();
          setMemberProductivity(Array.isArray(prod) ? prod : []);
        } catch {
          setMemberProductivity([]);
        }
      } else {
        setTenant(null);
        setEmployees([]);
        setEmployeeAnalytics([]);
        setMemberActivity([]);
        setMemberProductivity([]);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Tenant yuklenemedi");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreateTenant = async () => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const created = await createTenant({
        name,
        companyCode,
        employeeCount,
        packageId: packageId || "standart",
      });
      setTenant(created);
      setStatusMessage("Tenant olusturuldu, panel ID hazir.");
      const list = await listEmployees();
      setEmployees(list);
      try {
        const st = await getReportEmailStatus();
        setReportMail({ ready: Boolean(st?.ready), transport: st?.transport || "none" });
      } catch {
        setReportMail({ ready: false, transport: "none" });
      }
      try {
        const act = await listTenantMembersActivity();
        setMemberActivity(Array.isArray(act) ? act : []);
      } catch {
        setMemberActivity([]);
      }
      try {
        const prod = await listTenantMembersProductivity();
        setMemberProductivity(Array.isArray(prod) ? prod : []);
      } catch {
        setMemberProductivity([]);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Tenant olusturulamadi");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTenant = async () => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const updated = await updateTenant({
        name,
        companyCode,
        employeeCount,
      });
      setTenant(updated);
      setStatusMessage("Tenant ayarlari guncellendi.");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Guncelleme basarisiz");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReportEmail = async () => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const data = await sendTenantReportEmail();
      const sent = data?.sent_to;
      setStatusMessage(
        sent ? `Rapor sirket sahibine gonderildi: ${sent}` : "Rapor sirket sahibine gonderildi.",
      );
      toast.success(sent ? `Rapor gonderildi: ${sent}` : "Rapor sirket sahibine gonderildi.");
    } catch (err) {
      const d = err?.response?.data?.detail;
      const msg = Array.isArray(d)
        ? d.map((x) => x.msg || x).join(" ")
        : typeof d === "string"
          ? d
          : err?.message || "Rapor gonderilemedi";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    const email = emailInput.trim();
    if (!email) return;
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const created = await addEmployee({ email, role });
      setEmployees((prev) => [...prev, created]);
      setEmailInput("");
      setStatusMessage(`${email} eklendi.`);
      try {
        const rows = await listEmployeeAnalytics();
        setEmployeeAnalytics(Array.isArray(rows) ? rows : []);
      } catch {
        /* owner degilse veya endpoint hata: birlestirme yine employees ile tamamlanir */
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Calisan eklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmployee = async (employee) => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      await removeEmployee(employee.id);
      setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
      setEmployeeAnalytics((prev) =>
        Array.isArray(prev) ? prev.filter((r) => r.employee_id !== employee.id) : prev
      );
      setStatusMessage(`${employee.email} silindi.`);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Silme basarisiz");
    } finally {
      setLoading(false);
    }
  };

  const tenantExists = Boolean(tenant);

  /** Her zaman tum calisanlar: API analitigi employee_id ile eslestirilir; yeni eklenenler duser. */
  const analyticsRows = useMemo(() => {
    const byId = new Map();
    for (const row of employeeAnalytics || []) {
      if (row?.employee_id != null) byId.set(row.employee_id, row);
    }
    return employees.map((e) => {
      const hit = byId.get(e.id);
      if (hit) return hit;
      return {
        employee_id: e.id,
        email: e.email,
        role: e.role,
        status: e.status,
        linked_user_id: null,
        session_count: 0,
        avg_hybrid_score: null,
        avg_cognitive_load: null,
        first_session_at: null,
        last_session_at: null,
        estimated_work_minutes: null,
      };
    });
  }, [employeeAnalytics, employees]);

  const companyTitle = (tenant?.name && String(tenant.name).trim()) || KURUMSAL_DEMO_COMPANY_NAME;
  const isOwner = user?.role === "owner";

  // 1. DURUM: Kullanici sirket sahibi degilse -> Sirket Kurma Ekrani
  if (!isOwner) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center max-w-2xl mx-auto mt-10">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="18" y2="18"/><line x1="8" x2="16" y1="14" y2="14"/><line x1="8" x2="16" y1="10" y2="10"/><line x1="8" x2="16" y1="6" y2="6"/></svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">Şirketinizi Kurun</h2>
        <p className="mt-2 text-sm text-slate-400">
          NexusFocus Kurumsal özelliklerini kullanmak için önce bir şirket hesabı oluşturmalısınız.
        </p>
        <div className="mt-8 space-y-4 text-left">
          <label className="block text-sm font-medium text-slate-300">
            Şirket / Organizasyon Adı
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Örn: Nexus Teknoloji A.Ş."
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Şirket Kodu (Raporlar ve ID için)
            <input
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Örn: NEXUS"
            />
          </label>
          <button
            type="button"
            disabled={loading || !name || !companyCode}
            onClick={handleCreateTenant}
            className="mt-4 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50"
          >
            {loading ? "Şirket Oluşturuluyor..." : "Şirketi Oluştur ve Yönetime Başla"}
          </button>
        </div>
        {error && <p className="mt-4 text-xs text-rose-400 bg-rose-950/20 border border-rose-800/50 p-2 rounded-lg">{error}</p>}
      </section>
    );
  }

  // 2. DURUM: Kullanici Owner ise -> Tam Panel
  if (!tenantExists && loading) {
    return <div className="text-center py-20 text-slate-400">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Kurumsal Yönetim Paneli</p>
          <h2 className="mt-1 text-2xl font-bold text-white">{companyTitle}</h2>
          <p className="mt-1 text-sm text-slate-400">Şirket Kodu: {companyCode}</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-rose-400">{error}</span>}
          {statusMessage && <span className="text-xs text-emerald-400">{statusMessage}</span>}
          <button
             type="button"
             onClick={handleSendReportEmail}
             disabled={loading}
             className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Gönderiliyor..." : "Raporu Yöneticiye Gönder"}
          </button>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Davet ve Calisanlar */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold text-white">Çalışanları Davet Et</h3>
          <p className="mt-1 text-sm text-slate-400">Çalışanlarınızın e-posta adreslerini ekleyerek ekibe dahil edin.</p>
          
          <div className="mt-4 flex items-end gap-3">
            <label className="flex-1 text-sm text-slate-300">
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="ornek@sirket.com"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </label>
            <button
              type="button"
              disabled={loading || !emailInput}
              onClick={handleAddEmployee}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              Davet Et
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">E-posta</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr><td colSpan={3} className="p-4 text-center text-slate-500 text-xs">Henüz çalışan eklenmedi.</td></tr>
                ) : (
                  employees.map(emp => (
                    <tr key={emp.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-4 py-3 text-xs">{emp.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-1 text-[10px] font-medium ${emp.status === 'accepted' ? 'bg-emerald-900/50 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>
                          {employeeStatusLabel(emp.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {emp.role !== "owner" && (
                          <button
                            onClick={() => handleRemoveEmployee(emp)}
                            disabled={loading}
                            className="text-[11px] text-rose-400 hover:text-rose-300"
                          >
                            Kaldır
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Verimlilik Ozeti */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col h-full">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-white">Genel Verimlilik Özeti</h3>
              <p className="mt-1 text-sm text-slate-400">Ekibe kayıtlı çalışanların özet durumu.</p>
            </div>
            <button onClick={() => refresh()} disabled={loading} className="text-xs text-cyan-400 hover:text-cyan-300">Yenile</button>
          </div>
          
          <div className="mt-6 flex-1 overflow-hidden rounded-lg border border-slate-800">
            <div className="h-full overflow-y-auto max-h-[400px]">
              <table className="w-full text-left text-sm relative">
                <thead className="bg-slate-950 text-slate-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium">Çalışan</th>
                    <th className="px-4 py-3 font-medium">Ort. Odak</th>
                    <th className="px-4 py-3 font-medium">Son Görülme</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsRows.length === 0 ? (
                    <tr><td colSpan={3} className="p-4 text-center text-slate-500 text-xs">Veri bulunamadı.</td></tr>
                  ) : (
                    analyticsRows.map(row => (
                      <tr key={row.employee_id} className="border-t border-slate-800 text-slate-200">
                        <td className="px-4 py-3 text-xs">{row.email}</td>
                        <td className="px-4 py-3 text-xs text-emerald-200">{row.avg_hybrid_score != null ? row.avg_hybrid_score.toFixed(1) : "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{row.last_session_at ? new Date(row.last_session_at).toLocaleDateString("tr-TR") : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
