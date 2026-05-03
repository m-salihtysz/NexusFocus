import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

let toastCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, options = {}) => {
      const id = ++toastCounter;
      const variant = options.variant || "info";
      const duration = options.duration ?? 3500;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => removeToast(id), duration);
      return id;
    },
    [removeToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      success: (message, options) => showToast(message, { ...options, variant: "success" }),
      error: (message, options) => showToast(message, { ...options, variant: "error" }),
      info: (message, options) => showToast(message, { ...options, variant: "info" }),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
              toast.variant === "success"
                ? "border-emerald-700 bg-emerald-900/80 text-emerald-100"
                : toast.variant === "error"
                ? "border-rose-700 bg-rose-900/80 text-rose-100"
                : "border-cyan-700 bg-cyan-900/80 text-cyan-100"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return ctx;
}
