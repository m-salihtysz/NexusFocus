import axios from "axios";

const TOKEN_KEY = "nexusfocus.access_token";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function saveAccessToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export async function loginWithGoogle({ idToken, area, packageId = "standart", loginKind }) {
  const response = await apiClient.post("/auth/google", {
    id_token: idToken,
    area,
    package_id: packageId,
    login_kind: loginKind,
  });
  saveAccessToken(response.data.access_token);
  return response.data.user;
}

export async function fetchCurrentUser() {
  if (!getAccessToken()) return null;
  try {
    const response = await apiClient.get("/auth/me");
    return response.data;
  } catch (_error) {
    saveAccessToken(null);
    return null;
  }
}

export async function logout() {
  try {
    await apiClient.post("/auth/logout");
  } catch (_error) {
    /* ignore */
  } finally {
    saveAccessToken(null);
  }
}
