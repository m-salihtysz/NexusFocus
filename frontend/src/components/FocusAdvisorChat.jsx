import { useCallback, useRef, useState } from "react";
import { Loader2, MessageCircle, SendHorizontal } from "lucide-react";
import { postFocusAdvisorChat } from "../lib/focusClient";

const SUGGESTIONS = [
  "Günün hangi saatinde daha odaklı çalışıyorum?",
  "Zayıf olduğum saatler hangileri?",
  "Mola planı için ne önerirsin?",
];

function bubbleClass(role) {
  return role === "user"
    ? "ml-8 rounded-2xl rounded-br-md bg-cyan-950/80 border border-cyan-800/50 text-slate-100"
    : "mr-8 rounded-2xl rounded-bl-md bg-slate-900/90 border border-slate-700/80 text-slate-200";
}

export default function FocusAdvisorChat({ area, focus }) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      content:
        "Merhaba, ben odak asistanın. Geçmiş oturumlarından çıkan saatlik ritmi kullanarak " +
        "sorularına yanıt verebilirim — örneğin hangi saatlerde daha verimli olduğun veya " +
        "mola önerileri.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSource, setLastSource] = useState(null);
  const listRef = useRef(null);

  const scrollBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const send = useCallback(
    async (text) => {
      const trimmed = String(text || "").trim();
      if (!trimmed || loading) return;
      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      setLoading(true);
      requestAnimationFrame(scrollBottom);
      try {
        const hybrid = Number(focus?.hybrid_score ?? focus?.focus_score);
        const load = Number(focus?.cognitive_load);
        const body = {
          message: trimmed,
          ...(Number.isFinite(hybrid) ? { hybrid_score: Math.round(hybrid) } : {}),
          ...(Number.isFinite(load) ? { cognitive_load: Math.round(load) } : {}),
        };
        const data = await postFocusAdvisorChat(body);
        const reply = String(data?.reply || "").trim() || "Yanıt alınamadı.";
        setLastSource(data?.source === "llm" ? "Dil modeli" : "Veri özeti");
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (e) {
        const msg =
          e?.response?.data?.detail ||
          e?.message ||
          "Sohbet servisine ulaşılamadı. Giriş yaptığından emin ol.";
        setError(msg);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Şu an bağlantı kurulamadı. Oturum açtıysan bir süre sonra tekrar dene; " +
              "sorun sürerse yöneticine bildir.",
          },
        ]);
      } finally {
        setLoading(false);
        setTimeout(scrollBottom, 50);
      }
    },
    [focus, loading, scrollBottom]
  );

  const shell =
    area === "kurumsal"
      ? "border-emerald-800/40 bg-emerald-950/15"
      : area === "freelance"
      ? "border-amber-800/35 bg-amber-950/12"
      : "border-indigo-800/40 bg-indigo-950/15";

  return (
    <div className={`mt-5 rounded-2xl border ${shell}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-slate-900/40 md:px-5"
      >
        <MessageCircle className="shrink-0 text-sky-400" size={20} aria-hidden />
        <span>Odak asistanı — soru sor</span>
        <span className="ml-auto text-xs font-normal text-slate-500">{open ? "Gizle" : "Göster"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-800/60 px-3 pb-4 pt-1 md:px-4">
          <p className="px-1 pt-2 text-[11px] leading-relaxed text-slate-500">
            Yanıtlar kayıtlı odak oturumlarına dayanır (Türkiye saati). Sunucuda{" "}
            <code className="rounded bg-slate-900 px-1 text-slate-400">USE_OLLAMA=1</code> ile
            ücretsiz yerel Ollama, yoksa{" "}
            <code className="rounded bg-slate-900 px-1 text-slate-400">OPENAI_API_KEY</code> ile
            bulut modeli kullanılır; ikisi de yoksa kural tabanlı özet devreye girer.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={loading}
                onClick={() => send(s)}
                className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-left text-[11px] text-slate-300 hover:border-cyan-700/60 hover:text-white disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          <div
            ref={listRef}
            className="mt-3 max-h-[min(52vh,420px)] space-y-3 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/50 p-3"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`px-3 py-2.5 text-sm leading-relaxed ${bubbleClass(msg.role)}`}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 px-2 text-xs text-slate-500">
                <Loader2 className="animate-spin" size={16} />
                Düşünüyorum…
              </div>
            )}
          </div>

          {error && (
            <p className="mt-2 px-1 text-xs text-rose-300" role="alert">
              {String(error)}
            </p>
          )}
          {lastSource && !loading && (
            <p className="mt-1 px-1 text-[10px] text-slate-600">Son yanıt kaynağı: {lastSource}</p>
          )}

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <label className="sr-only" htmlFor="focus-advisor-input">
              Soru
            </label>
            <input
              id="focus-advisor-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Örn. hangi saatlerde daha zorlanıyorum?"
              maxLength={2000}
              disabled={loading}
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600/40 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendHorizontal size={18} aria-hidden />
              Gönder
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
