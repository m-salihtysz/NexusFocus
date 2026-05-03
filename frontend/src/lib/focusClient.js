import { apiClient } from "./authClient";

export async function recordFocusSession(payload) {
  const response = await apiClient.post("/focus/sessions", payload);
  return response.data;
}


/** Ogrenci alani: saatlik ritim + AI tarzi metin onerileri */
export async function fetchStudentRhythmInsights() {
  const response = await apiClient.get("/focus/insights/student-rhythm");
  return response.data;
}

/**
 * Odak ritmi verisi + istege bagli canli skorlarla soru-cevap (LLM veya kural tabanli).
 * @param {{ message: string, hybrid_score?: number, cognitive_load?: number }} body
 */
export async function postFocusAdvisorChat(body) {
  const response = await apiClient.post("/focus/insights/chat", body);
  return response.data;
}
