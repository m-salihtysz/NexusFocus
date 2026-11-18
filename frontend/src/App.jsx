import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL, apiClient, fetchCurrentUser } from "./lib/authClient";
import { recordFocusSession } from "./lib/focusClient";

import { disposeTracker, extractMetricsFromVideo } from "./lib/mediapipeTracker";
import { appendWindowSample, summarizeFocusWindow } from "./lib/recentFocusWindow";
import { getScreenMetrics, installScreenTracker } from "./lib/screenTracker";
import { TAB_SCOPE_ALWAYS } from "./lib/tabScope";
import CameraPreview from "./components/CameraPreview";
import EnterpriseAccessManager from "./components/EnterpriseAccessManager";
import FocusAnalytics from "./components/FocusAnalytics";
import Footer from "./components/Footer";
import ProductivityDashboard from "./components/ProductivityDashboard";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import Navbar from "./components/Navbar";
import OnboardingPage from "./components/OnboardingPage";
import PrivacyModal from "./components/PrivacyModal";

import { KURUMSAL_DEMO_COMPANY_NAME } from "./lib/enterpriseDisplay";
import { logout as apiLogout } from "./lib/authClient";
import { useToast } from "./components/ToastProvider";

const AUTH_LOGIN_KIND_KEY = "nexusfocus.auth_login_kind";

const samplePayload = {
  blink_rate: 0.24,
  gaze_speed: 0.2,
  gaze_x: 0.52,
  gaze_y: 0.51,
  head_pitch: 0.0,
  head_yaw: 0.0,
  head_roll: 0.0,
};

const initialFocus = {
  focus_score: 0,
  hybrid_score: 0,
  cognitive_load: 0,
  module_id: "ogrenci",
  primary_tracking_type: "Kafa + Goz (Okuma)",
  focus_indicator: "Anlama ve Sabitlik",
  instant_feedback: "Olcumler bekleniyor...",
  gaze_deviation: 0,
  posture_shift: 0,
  cursor_chaos: 0,
  cognitive_freeze: 0,
  emotional_reaction: 0,
  expression_fatigue: 0,
  expression_stress: 0,
  expression_distraction: 0,
  expression_positivity: 0,
  dominant_expression: "neutral",
  screen_focus: 100,
  screen_away_count: 0,
  screen_away_streak_sec: 0,
  blink_rate: 0,
  gaze_speed: 0,
  gaze_x: 0,
  gaze_y: 0,
  head_pitch: 0,
  head_yaw: 0,
  head_roll: 0,
  mouse_speed: 0,
  mouse_idle_sec: 0,
  tab_scope: "always",
  site_switch_count: 0,
  site_path: "",
};

export default function App() {
  const [focus, setFocus] = useState(initialFocus);
  const [moduleId, setModuleId] = useState("ogrenci");
  const [activePage, setActivePage] = useState("landing");
  const [selectedArea, setSelectedArea] = useState("ogrenci");
  const [productConfig, setProductConfig] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [recommendations, setRecommendations] = useState([
    "AI tavsiyeleri olcum geldikce burada listelenecek.",
  ]);
  const [recommendationSource, setRecommendationSource] = useState("rule");
  const [history, setHistory] = useState([]);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraError, setCameraError] = useState(null);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [trackerReady, setTrackerReady] = useState(false);
  const [trackerError, setTrackerError] = useState(null);
  const [screenMetrics, setScreenMetrics] = useState({
    is_visible: true,
    visible_ratio: 1,
    away_count: 0,
    away_streak_ms: 0,
    site_switch_count: 0,
    site_path: "",
  });
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [faceDetected, setFaceDetected] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  /** Giris sayfasinda secilen alan (onboarding'de baska alana gecisi kilitler). */
  const [loginChosenArea, setLoginChosenArea] = useState(null);
  /** Admin girisi: kurumsal kontrol paneli. sessionStorage ile yenilemede korunur. */
  const [authLoginKind, setAuthLoginKind] = useState(() =>
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem(AUTH_LOGIN_KIND_KEY) : null
  );
  const [colorMode, setColorMode] = useState(() => 
    typeof localStorage !== "undefined" ? (localStorage.getItem("nexusfocus.colorMode") || "dark") : "dark"
  );
  const toast = useToast();
  const wsUrl = useMemo(() => `${API_URL.replace(/^http/, "ws")}/ws/focus`, []);

  const isEnterpriseAdminControlPanel = useMemo(
    () =>
      authLoginKind === "kurumsal_admin" &&
      productConfig?.area === "kurumsal" &&
      activePage === "enterprise",
    [authLoginKind, productConfig, activePage]
  );

  const authNavItems = useMemo(() => {
    if (!googleUser) return undefined;
    if (!productConfig) return [];
    const { area } = productConfig;
    if (area === "ogrenci") return [{ id: "student", label: "Ogrenci" }];
    if (area === "kurumsal") return [{ id: "enterprise", label: "Kurumsal" }];
    if (area === "freelance") return [{ id: "freelance", label: "Freelance" }];
    return [{ id: productConfig.page, label: "Panel" }];
  }, [googleUser, productConfig]);

  const brandTargetPage = useMemo(() => {
    if (!googleUser) return undefined;
    if (productConfig?.page) return productConfig.page;
    if (activePage === "onboarding") return "onboarding";
    return "landing";
  }, [googleUser, productConfig, activePage]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastMetricsRef = useRef(null);
  const minuteBufferRef = useRef([]);
  const [minuteSummary, setMinuteSummary] = useState(null);
  const pointerRef = useRef({
    points: [],
    lastAt: Date.now(),
  });

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser().then((existing) => {
      if (cancelled || !existing) return;
      setGoogleUser(existing);
      if (existing.area) {
        const area = existing.area;
        const page = area === "kurumsal" ? "enterprise" : area === "freelance" ? "freelance" : "student";
        setProductConfig({
          area,
          page,
          packageId: existing.package_id || "standart",
          packageLabel: "NexusFocus",
        });
        setModuleId(area);
        setActivePage(page);
      } else {
        setActivePage("onboarding");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onPointerMove = (event) => {
      const now = Date.now();
      pointerRef.current.lastAt = now;
      pointerRef.current.points.push({ x: event.clientX, y: event.clientY, t: now });
      pointerRef.current.points = pointerRef.current.points.slice(-60);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  useEffect(() => {
    installScreenTracker();
    const tickId = window.setInterval(() => {
      setScreenMetrics(getScreenMetrics());
    }, 1000);
    return () => window.clearInterval(tickId);
  }, []);

  const isDashboardPage = ["home", "student", "enterprise", "freelance"].includes(activePage);

  useEffect(() => {
    if (!isDashboardPage || !cameraOn || isEnterpriseAdminControlPanel) {
      const video = videoRef.current;
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
      setCameraEnabled(false);
      if (!isDashboardPage) {
        setCameraStatus("idle");
      }
      setCameraError(null);
      setTrackerReady(false);
      lastMetricsRef.current = null;
      disposeTracker();
      return undefined;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("unsupported");
      setCameraError("Tarayicin getUserMedia API'sini desteklemiyor.");
      setCameraEnabled(false);
      return undefined;
    }

    let cancelled = false;
    let localStream = null;
    setCameraStatus("requesting");
    setCameraError(null);

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 360 }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
        setCameraEnabled(true);
        setCameraStatus("granted");
      })
      .catch((error) => {
        if (cancelled) return;
        setCameraEnabled(false);
        if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
          setCameraStatus("denied");
          setCameraError(
            "Kamera izni reddedildi. Tarayici adres cubugundaki kamera ikonundan izin verip 'Tekrar Dene' butonuna bas."
          );
        } else if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
          setCameraStatus("nodevice");
          setCameraError("Kamera cihazi bulunamadi. Webcam takili mi kontrol et.");
        } else {
          setCameraStatus("error");
          setCameraError(error?.message || "Kamera baslatilamadi.");
        }
      });

    return () => {
      cancelled = true;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraOn, cameraAttempt, isDashboardPage, isEnterpriseAdminControlPanel]);

  useEffect(() => {
    if (!cameraEnabled) return undefined;
    let frameId;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const metrics = await extractMetricsFromVideo(videoRef.current, performance.now());
        if (metrics) {
          lastMetricsRef.current = metrics;
          if (!trackerReady) setTrackerReady(true);
        }
      } catch (error) {
        setTrackerError(error?.message || "MediaPipe initialization failed");
      }
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [cameraEnabled, trackerReady]);

  useEffect(() => {
    if (isEnterpriseAdminControlPanel) {
      setConnectionStatus("idle");
      return undefined;
    }

    const socket = new WebSocket(wsUrl);
    let timerId;
    socket.addEventListener("open", () => {
      setConnectionStatus("connected");
      timerId = window.setInterval(() => {
        if (socket.readyState !== WebSocket.OPEN) return;
        const mouseMetrics = extractMouseMetrics(pointerRef.current);
        const liveMetrics = lastMetricsRef.current;

        const screenSnapshot = getScreenMetrics();
        const scope = TAB_SCOPE_ALWAYS;
        const payload = liveMetrics
          ? {
              module_id: moduleId,
              mouse_metrics: mouseMetrics,
              screen_metrics: screenSnapshot,
              tab_scope: scope,
              blink_rate: liveMetrics.blink_rate,
              gaze_speed: liveMetrics.gaze_speed,
              gaze_x: liveMetrics.gaze_x,
              gaze_y: liveMetrics.gaze_y,
              head_pitch: liveMetrics.head_pitch,
              head_yaw: liveMetrics.head_yaw,
              head_roll: liveMetrics.head_roll,
              expressions: liveMetrics.expressions,
            }
          : {
              ...samplePayload,
              module_id: moduleId,
              mouse_metrics: mouseMetrics,
              screen_metrics: screenSnapshot,
              tab_scope: scope,
            };

        socket.send(JSON.stringify(payload));
      }, 1000);
    });

    socket.addEventListener("message", (event) => {
      const nextValue = JSON.parse(event.data);
      setFocus((prev) => ({ ...prev, ...nextValue }));
      minuteBufferRef.current = appendWindowSample(minuteBufferRef.current, {
        hybrid_score: nextValue.hybrid_score ?? nextValue.focus_score,
        cognitive_load: nextValue.cognitive_load,
        gaze_deviation: nextValue.gaze_deviation,
        cursor_chaos: nextValue.cursor_chaos,
        expression_fatigue: nextValue.expression_fatigue,
        expression_stress: nextValue.expression_stress,
      });
      setMinuteSummary(summarizeFocusWindow(minuteBufferRef.current));
      setHistory((prev) => {
        const next = [
          ...prev,
          {
            time: new Date().toLocaleTimeString("tr-TR"),
            focus: nextValue.hybrid_score ?? 0,
            load: nextValue.cognitive_load ?? 0,
            chaos: nextValue.cursor_chaos ?? 0,
            blink: nextValue.blink_rate ?? 0,
            fatigue: nextValue.expression_fatigue ?? 0,
            stress: nextValue.expression_stress ?? 0,
            distract: nextValue.expression_distraction ?? 0,
            positive: nextValue.expression_positivity ?? 0,
            dominant: nextValue.dominant_expression ?? "neutral",
          },
        ];
        return next.slice(-30);
      });
    });

    socket.addEventListener("close", () => setConnectionStatus("disconnected"));
    socket.addEventListener("error", () => setConnectionStatus("error"));

    return () => {
      if (timerId) window.clearInterval(timerId);
      setConnectionStatus("disconnected");
      socket.close();
    };
  }, [isEnterpriseAdminControlPanel, cameraEnabled, moduleId, wsUrl]);

  useEffect(() => {
    if (!focus.hybrid_score && !focus.cognitive_load) return;

    const fetchRecommendations = async () => {
      try {
        const response = await apiClient.post("/admin/recommendations", {
          module_id: moduleId,
          focus_score: focus.hybrid_score || focus.focus_score,
          cognitive_load: focus.cognitive_load,
          blink_rate: focus.blink_rate,
          gaze_speed: focus.gaze_speed,
          posture_shift: focus.posture_shift,
          cursor_chaos: focus.cursor_chaos,
          expression_fatigue: focus.expression_fatigue ?? 0,
          expression_stress: focus.expression_stress ?? 0,
          expression_distraction: focus.expression_distraction ?? 0,
          expression_positivity: focus.expression_positivity ?? 0,
          dominant_expression: focus.dominant_expression || "neutral",
          minute_window:
            minuteSummary && !minuteSummary.insufficient
              ? {
                  samples: minuteSummary.samples,
                  hybrid_avg: minuteSummary.hybrid_avg,
                  hybrid_min: minuteSummary.hybrid_min,
                  hybrid_max: minuteSummary.hybrid_max,
                  hybrid_spread: minuteSummary.hybrid_spread,
                  trend: minuteSummary.trend,
                  load_peak: minuteSummary.load_peak,
                  chaos_max: minuteSummary.chaos_max,
                  low_fraction: minuteSummary.low_fraction,
                  fatigue_delta: minuteSummary.fatigue_delta,
                }
              : minuteSummary && minuteSummary.samples
              ? { samples: minuteSummary.samples, insufficient: true }
              : null,
        });
        setRecommendations(response.data.recommendations ?? []);
        setRecommendationSource(response.data.source || "rule");
      } catch (_error) {
        setRecommendations(["AI tavsiye servisine ulasilamadi."]);
        setRecommendationSource("error");
      }
    };
    fetchRecommendations();
  }, [focus, minuteSummary, moduleId, productConfig]);

  useEffect(() => {
    if (activePage === "student") setModuleId("ogrenci");
    if (activePage === "enterprise") setModuleId("kurumsal");
    if (activePage === "freelance") setModuleId("freelance");
  }, [activePage]);

  /** Urun alani secildiyse yalnizca o modul sayfasi acik kalsin (home / capraz modul yok). */
  useEffect(() => {
    if (!productConfig?.page) return;
    const target = productConfig.page;
    if (activePage === "home") {
      setActivePage(target);
      return;
    }
    if (["student", "enterprise", "freelance"].includes(activePage) && activePage !== target) {
      setActivePage(target);
    }
  }, [productConfig, activePage]);

  useEffect(() => {
    const theme =
      activePage === "student"
        ? "student"
        : activePage === "enterprise"
        ? "enterprise"
        : activePage === "freelance"
        ? "freelance"
        : "default";
    document.documentElement.dataset.theme = theme;
    return () => {
      document.documentElement.dataset.theme = "default";
    };
  }, [activePage]);

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
    localStorage.setItem("nexusfocus.colorMode", colorMode);
  }, [colorMode]);

  const toggleColorMode = () => setColorMode(prev => (prev === "dark" ? "light" : "dark"));

  useEffect(() => {
    if (!googleUser || isEnterpriseAdminControlPanel) return undefined;
    const intervalId = window.setInterval(() => {
      const score = focus.hybrid_score || focus.focus_score;
      if (!score) return;
      recordFocusSession({
        module_id: moduleId,
        focus_score: focus.focus_score || 0,
        hybrid_score: focus.hybrid_score || 0,
        cognitive_load: focus.cognitive_load || 0,
        blink_rate: focus.blink_rate || 0,
        gaze_speed: focus.gaze_speed || 0,
      }).catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [
    googleUser,
    moduleId,
    focus.focus_score,
    focus.hybrid_score,
    focus.cognitive_load,
    focus.blink_rate,
    focus.gaze_speed,
    isEnterpriseAdminControlPanel,
  ]);

  return (
    <main className="min-h-screen flex flex-col transition-colors duration-300">
      <Navbar
        colorMode={colorMode}
        onToggleColorMode={toggleColorMode}
        mobileOpen={mobileMenuOpen}
        onToggleMenu={() => setMobileMenuOpen((prev) => !prev)}
        activePage={activePage}
        authNavItems={authNavItems}
        brandTargetPage={brandTargetPage}
        onSelectPage={(page, options = {}) => {
          setMobileMenuOpen(false);

          if (options.anchor) {
            setActivePage("landing");
            window.setTimeout(() => {
              const el = document.getElementById(options.anchor);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 60);
            return;
          }

          if (!googleUser && ["home", "student", "enterprise", "freelance"].includes(page)) {
            setActivePage("login");
          } else if (
            googleUser &&
            !productConfig &&
            ["home", "student", "enterprise", "freelance"].includes(page)
          ) {
            setActivePage("onboarding");
          } else if (
            googleUser &&
            productConfig &&
            ["home", "student", "enterprise", "freelance"].includes(page) &&
            page !== productConfig.page
          ) {
            setActivePage(productConfig.page);
          } else {
            setActivePage(page);
          }

          if (page === "landing") {
            window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30);
          }
        }}
        packageLabel={productConfig?.packageLabel}
        isAuthenticated={Boolean(googleUser)}
        onLogout={async () => {
          await apiLogout();
          setGoogleUser(null);
          setProductConfig(null);
          setLoginChosenArea(null);
          setAuthLoginKind(null);
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem(AUTH_LOGIN_KIND_KEY);
          }
          setActivePage("landing");
          toast.info("Cikis yapildi");
        }}
      />

      <section className="flex-grow mx-auto max-w-7xl w-full space-y-6 px-4 py-6 md:px-8">
        <canvas ref={canvasRef} className="hidden" />

        {activePage === "landing" && (
          <LandingPage
            onStart={() => setActivePage(googleUser ? "onboarding" : "login")}
            onLogin={() => setActivePage("login")}
            onOpenPrivacy={() => setPrivacyOpen(true)}
          />
        )}

        {activePage === "login" && (
          <LoginPage
            user={googleUser}
            onBack={() => setActivePage("landing")}
            onOpenPrivacy={() => setPrivacyOpen(true)}
            onLoginSuccess={({ user, area, page, loginKind }) => {
              setGoogleUser(user);
              setLoginChosenArea(area);
              if (loginKind && typeof sessionStorage !== "undefined") {
                sessionStorage.setItem(AUTH_LOGIN_KIND_KEY, loginKind);
                setAuthLoginKind(loginKind);
              } else {
                setAuthLoginKind(null);
                if (typeof sessionStorage !== "undefined") {
                  sessionStorage.removeItem(AUTH_LOGIN_KIND_KEY);
                }
              }
              toast.success(`Hos geldin ${user.name || user.email}`);
              setSelectedArea(area);
              setModuleId(area);
              if (user.area) {
                setProductConfig({
                  area,
                  page,
                  packageId: user.package_id || "standart",
                  packageLabel: "NexusFocus",
                });
                setActivePage(page);
              } else {
                setActivePage("onboarding");
              }
            }}
            onLogout={() => {
              setGoogleUser(null);
              setProductConfig(null);
              setLoginChosenArea(null);
              setAuthLoginKind(null);
              if (typeof sessionStorage !== "undefined") {
                sessionStorage.removeItem(AUTH_LOGIN_KIND_KEY);
              }
              toast.info("Cikis yapildi");
            }}
          />
        )}

        {activePage === "onboarding" && (
          <OnboardingPage
            selectedArea={selectedArea}
            onChangeArea={setSelectedArea}
            lockAreaFromLogin={Boolean(loginChosenArea)}
            onBack={() => setActivePage(googleUser ? "landing" : "login")}
            onConfirm={(config) => {
              setProductConfig({ ...config, packageLabel: "NexusFocus" });
              setModuleId(config.area);
              setLoginChosenArea(null);
              setActivePage(config.page);
              toast.success(`${config.area} alani icin urun sayfasi acildi.`);
            }}
          />
        )}

        {["home", "student", "enterprise", "freelance"].includes(activePage) && productConfig && (
          <>
            {isEnterpriseAdminControlPanel ? (
              <div className="space-y-6">
                <EnterpriseAccessManager
                  packageId={productConfig.packageId}
                  adminSessionEmail={googleUser?.email ?? ""}
                  user={googleUser}
                />
              </div>
            ) : (
              <>
                <ProductivityDashboard
                  area={productConfig.area}
                  focus={focus}
                  recommendations={recommendations}
                  instantFeedback={focus.instant_feedback}
                  minuteSummary={minuteSummary}
                  cameraEnabled={cameraEnabled}
                  faceDetected={faceDetected}
                >
                  <CameraPreview
                    videoRef={videoRef}
                    lastMetricsRef={lastMetricsRef}
                    cameraOn={cameraOn}
                    cameraEnabled={cameraEnabled}
                    onFaceDetectedChange={setFaceDetected}
                  />
                </ProductivityDashboard>
                <FocusAnalytics history={history} compact />




              </>
            )}
          </>
        )}
      </section>

      <Footer onOpenPrivacy={() => setPrivacyOpen(true)} />
      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </main>
  );
}

function extractMouseMetrics(state) {
  const now = Date.now();
  const points = state.points;
  const idleMs = now - state.lastAt;

  if (points.length < 2) {
    return { speed: 0, chaos: 0, idle_ms: idleMs, freeze_ratio: idleMs > 2200 ? 1 : 0 };
  }

  let path = 0;
  for (let i = 1; i < points.length; i += 1) {
    path += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  const elapsed = Math.max(1, points[points.length - 1].t - points[0].t);
  const direct = Math.max(
    1,
    Math.hypot(
      points[points.length - 1].x - points[0].x,
      points[points.length - 1].y - points[0].y
    )
  );
  const speed = Math.min(1, path / elapsed / 0.6);
  const chaos = Math.min(1, Math.max(0, (path / direct - 1) / 4));
  const freezeRatio = Math.min(1, idleMs / 5000);
  return { speed, chaos, idle_ms: idleMs, freeze_ratio: freezeRatio };
}
