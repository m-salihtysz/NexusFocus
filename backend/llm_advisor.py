from __future__ import annotations

import json
import os
import re
import time
from typing import Any, Optional

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None  # type: ignore

_DEFAULT_OLLAMA_BASE = "http://127.0.0.1:11434/v1"
_DEFAULT_OLLAMA_KEY = "ollama"
_DEFAULT_OLLAMA_MODEL = "llama3.2"


def _env_truthy(name: str) -> bool:
    v = os.getenv(name, "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _normalize_openai_base(url: str) -> str:
    u = url.strip().rstrip("/")
    if u.endswith("/v1"):
        return u
    return f"{u}/v1"


def _parse_json_object(raw: str) -> dict[str, Any]:
    """Ollama / serbest metin cevaplarinda JSON nesnesini cikar."""
    text = (raw or "").strip()
    if not text:
        return {}
    try:
        out = json.loads(text)
        return out if isinstance(out, dict) else {}
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            out = json.loads(m.group(0))
            return out if isinstance(out, dict) else {}
        except json.JSONDecodeError:
            pass
    return {}


class LLMAdvisor:
    """
    OpenAI veya yerel Ollama (OpenAI uyumlu /v1 API) ile tavsiye ve sohbet.

    Ollama:
        set USE_OLLAMA=1 (veya NEXUSFOCUS_LLM=ollama)
        istege bagli: OLLAMA_API_BASE (varsayilan http://127.0.0.1:11434/v1),
        OLLAMA_MODEL (varsayilan llama3.2), OLLAMA_API_KEY (varsayilan ollama)

    Bulut OpenAI:
        OPENAI_API_KEY + istege bagli OPENAI_BASE_URL, OPENAI_MODEL
    """

    def __init__(self) -> None:
        llm = os.getenv("NEXUSFOCUS_LLM", "").strip().lower()
        use_ollama = llm == "ollama" or _env_truthy("USE_OLLAMA")

        self.backend = "ollama" if use_ollama else "openai"
        self.use_json_schema: bool = not use_ollama

        if use_ollama:
            raw_base = (
                os.getenv("OLLAMA_API_BASE")
                or os.getenv("OLLAMA_BASE_URL")
                or _DEFAULT_OLLAMA_BASE
            ).strip()
            self.base_url = _normalize_openai_base(raw_base)
            self.api_key = (os.getenv("OLLAMA_API_KEY") or _DEFAULT_OLLAMA_KEY).strip() or _DEFAULT_OLLAMA_KEY
            self.model = (
                os.getenv("OLLAMA_MODEL") or os.getenv("OPENAI_MODEL") or _DEFAULT_OLLAMA_MODEL
            ).strip()
        else:
            self.api_key = os.getenv("OPENAI_API_KEY", "").strip()
            self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
            raw = os.getenv("OPENAI_BASE_URL", "").strip()
            self.base_url = raw or None
            # OPENAI_BASE_URL ile dogrudan Ollama /v1 kullananlar icin json_schema kapali
            bu = (self.base_url or "").lower()
            if "11434" in bu or "ollama" in bu:
                self.use_json_schema = False

        self.client = None
        if OpenAI is not None and (use_ollama or self.api_key):
            try:
                self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
            except Exception:
                self.client = None

        self._cache: dict[str, tuple[float, list[str]]] = {}
        self._cache_ttl_sec = 60

    def is_enabled(self) -> bool:
        return self.client is not None

    def _chat_complete(
        self,
        *,
        messages: list[dict[str, str]],
        max_tokens: int,
        temperature: float,
        json_object: bool,
    ) -> str:
        kwargs: dict[str, Any] = {
            "model": self.model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "messages": messages,
        }
        if json_object and self.use_json_schema:
            kwargs["response_format"] = {"type": "json_object"}
        response = self.client.chat.completions.create(**kwargs)  # type: ignore[union-attr]
        return (response.choices[0].message.content or "").strip()

    def suggest(
        self,
        module_id: str,
        focus_score: int,
        cognitive_load: int,
        blink_rate: float,
        gaze_speed: float,
        posture_shift: int = 0,
        cursor_chaos: int = 0,
        expressions: Optional[dict] = None,
        minute_window: Optional[dict] = None,
    ) -> Optional[list[str]]:
        if not self.is_enabled():
            return None

        expr = expressions or {}
        dominant = str(expr.get("dominant_expression", "neutral"))
        mw = minute_window or {}
        mw_key = ""
        if isinstance(mw, dict) and not mw.get("insufficient") and int(mw.get("samples") or 0) >= 10:
            mw_key = f"|mw:{mw.get('trend')}:{mw.get('load_peak')}//{mw.get('chaos_max')}"
        cache_key = (
            f"{module_id}:{focus_score // 5}:{cognitive_load // 5}:"
            f"{round(blink_rate, 2)}:{round(gaze_speed, 2)}:"
            f"{posture_shift // 10}:{cursor_chaos // 10}:"
            f"{int(expr.get('expression_fatigue', 0)) // 10}:"
            f"{int(expr.get('expression_stress', 0)) // 10}:"
            f"{dominant}{mw_key}"
        )
        now = time.time()
        cached = self._cache.get(cache_key)
        if cached and now - cached[0] < self._cache_ttl_sec:
            return cached[1]

        sys_extra = ""
        if not self.use_json_schema:
            sys_extra = " Yanit yalnizca tek satir JSON olmali, baska metin yazma: " '{"recommendations":["..."]}'

        try:
            content = self._chat_complete(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Sen NexusFocus uygulamasinin AI uretkenlik kocusun. "
                            "Kullaniciya kisa, eyleme yonelik 3-5 maddelik tavsiye uret. "
                            "Cevap mutlaka JSON formatinda olmali: "
                            '{"recommendations": ["...", "..."]}. '
                            "Her madde 1-2 cumle, Turkce, gunluk konusma dilinde, "
                            "basina 'AI Onersi:' yaz."
                            + sys_extra
                        ),
                    },
                    {
                        "role": "user",
                        "content": json.dumps(
                            {
                                "module_id": module_id,
                                "focus_score": focus_score,
                                "cognitive_load": cognitive_load,
                                "blink_rate": blink_rate,
                                "gaze_speed": gaze_speed,
                                "posture_shift": posture_shift,
                                "cursor_chaos": cursor_chaos,
                                "expression_fatigue": expr.get("expression_fatigue", 0),
                                "expression_stress": expr.get("expression_stress", 0),
                                "expression_distraction": expr.get("expression_distraction", 0),
                                "expression_positivity": expr.get("expression_positivity", 0),
                                "dominant_expression": dominant,
                                "minute_window": minute_window,
                            },
                            ensure_ascii=False,
                        ),
                    },
                ],
                max_tokens=320,
                temperature=0.4,
                json_object=True,
            )
            data = _parse_json_object(content)
            recommendations = data.get("recommendations") or []
            cleaned = [str(item).strip() for item in recommendations if str(item).strip()]
            if not cleaned:
                return None
            cleaned = cleaned[:5]
            self._cache[cache_key] = (now, cleaned)
            return cleaned
        except Exception:
            return None

    def chat_focus_qa(self, context: dict, user_message: str) -> Optional[str]:
        """
        Kullanicinin odak ritmi + canli ozet hakkindaki sorusuna kisa Turkce yanit.
        """
        if not self.is_enabled():
            return None
        sys_extra = ""
        if not self.use_json_schema:
            sys_extra = (
                " Yanit yalnizca tek bir JSON nesnesi olsun, baska aciklama yazma: "
                '{"reply":"..."}'
            )
        try:
            content = self._chat_complete(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Sen NexusFocus uygulamasinin odak ve verimlilik asistanisin. "
                            "Asagida kullanicinin gecmis oturumlardan turetilmis saatlik odak ozeti "
                            "(JSON) ve istege bagli canli skorlar var. "
                            "Sadece bu verilere dayan; uydurma. Veri yetersizse acikca soyle. "
                            "Yanit 2-6 cumle, Turkce, samimi ama profesyonel. "
                            "Cikti tek bir JSON nesnesi: {\"reply\": \"...\"}."
                            + sys_extra
                        ),
                    },
                    {
                        "role": "user",
                        "content": json.dumps(
                            {"context": context, "question": user_message},
                            ensure_ascii=False,
                        ),
                    },
                ],
                max_tokens=500,
                temperature=0.35,
                json_object=True,
            )
            data = _parse_json_object(content)
            reply = str(data.get("reply") or "").strip()
            return reply or None
        except Exception:
            return None
