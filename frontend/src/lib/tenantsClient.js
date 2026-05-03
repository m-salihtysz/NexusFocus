import { apiClient } from "./authClient";

export async function getMyTenant() {
  try {
    const response = await apiClient.get("/tenants/me");
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

export async function createTenant({ name, companyCode, employeeCount, packageId }) {
  const response = await apiClient.post("/tenants", {
    name,
    company_code: companyCode,
    employee_count: employeeCount,
    package_id: packageId,
  });
  return response.data;
}

export async function updateTenant({ name, companyCode, employeeCount, packageId }) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (companyCode !== undefined) payload.company_code = companyCode;
  if (employeeCount !== undefined) payload.employee_count = employeeCount;
  if (packageId !== undefined) payload.package_id = packageId;
  const response = await apiClient.patch("/tenants/me", payload);
  return response.data;
}

export async function listEmployees() {
  const response = await apiClient.get("/tenants/me/employees");
  return response.data;
}

/** Tenant'a bagli kullanicilarin giris / cikis / son aktivite ozeti (owner veya staff). */
export async function listTenantMembersActivity() {
  const response = await apiClient.get("/tenants/me/members/activity");
  return response.data;
}

/** Calisanlarin giris/cikis + toplam odak + verim ozeti (owner veya staff). */
export async function listTenantMembersProductivity() {
  const response = await apiClient.get("/tenants/me/members/productivity");
  return response.data;
}

/** Calisan id + mail ile eslesen kullanicinin odak oturumu ozeti (admin paneli). */
export async function listEmployeeAnalytics() {
  const response = await apiClient.get("/tenants/me/employees/analytics");
  return response.data;
}

/** Sunucuda Resend API veya SMTP yapilandirildi mi (anahtar donmez). */
export async function getReportEmailStatus() {
  const response = await apiClient.get("/tenants/me/report-email/status");
  return response.data;
}

/** Kurumsal raporu oturum e-postana gonderir (Resend veya SMTP, backend .env). */
export async function sendTenantReportEmail() {
  const response = await apiClient.post("/tenants/me/report-email");
  return response.data;
}

export async function addEmployee({ email, role = "staff" }) {
  const response = await apiClient.post("/tenants/me/employees", {
    email,
    role,
  });
  return response.data;
}

export async function removeEmployee(employeeId) {
  await apiClient.delete(`/tenants/me/employees/${employeeId}`);
}
