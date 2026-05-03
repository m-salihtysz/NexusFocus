import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { loginWithGoogle, logout as logoutRequest } from "../lib/authClient";

export default function GoogleAuthCard({ user, onLogin, onLogout, area, packageId, loginKind }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    if (!credentialResponse.credential) {
      setError("Google credential alinamadi.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const authedUser = await loginWithGoogle({
        idToken: credentialResponse.credential,
        area,
        packageId,
        loginKind,
      });
      onLogin(authedUser);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "Backend dogrulama hatasi";
      setError(detail);
      onLogin(null);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logoutRequest();
      onLogout();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-base font-semibold text-white">Google Girisi</h3>
      {user ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-slate-200">Hos geldin, {user.name || user.email}</p>
          <p className="text-xs text-slate-400">{user.email}</p>
          <button
            type="button"
            disabled={busy}
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? "Cikis yapiliyor..." : "Cikis Yap"}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {clientId ? (
            <>
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => setError("Google girisi reddedildi.")}
              />
              {busy && <p className="text-xs text-slate-400">Backend dogruluyor...</p>}
              {error && (
                <p className="rounded-lg border border-rose-800 bg-rose-900/30 p-2 text-xs text-rose-200">
                  {error}
                </p>
              )}
            </>
          ) : (
            <p className="rounded-lg border border-amber-800 bg-amber-900/30 p-3 text-xs text-amber-200">
              Google girisi icin frontend/.env dosyasina VITE_GOOGLE_CLIENT_ID degerini eklemelisin.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
