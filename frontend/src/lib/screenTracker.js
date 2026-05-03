const WINDOW_MS = 5 * 60 * 1000;

const state = {
  visibleSegments: [],
  hiddenSegments: [],
  awayEvents: [],
  navEvents: [],
  isVisible: typeof document !== "undefined" ? !document.hidden : true,
  lastSwitchAt: Date.now(),
  lastHref: typeof location !== "undefined" ? location.href : "",
  installed: false,
  navCheckId: null,
};

function pruneOlder(now, target) {
  while (state[target].length > 0 && now - state[target][0].end > WINDOW_MS) {
    state[target].shift();
  }
  while (state.awayEvents.length > 0 && now - state.awayEvents[0] > WINDOW_MS) {
    state.awayEvents.shift();
  }
  while (state.navEvents.length > 0 && now - state.navEvents[0] > WINDOW_MS) {
    state.navEvents.shift();
  }
}

function recordNavigationIfChanged() {
  if (typeof location === "undefined") return;
  const href = location.href;
  if (href !== state.lastHref) {
    state.navEvents.push(Date.now());
    state.lastHref = href;
  }
}

function recordSwitch(visibleAfter) {
  const now = Date.now();
  const segment = { start: state.lastSwitchAt, end: now };
  if (state.isVisible) {
    state.visibleSegments.push(segment);
  } else {
    state.hiddenSegments.push(segment);
    state.awayEvents.push(segment.end);
  }
  state.isVisible = visibleAfter;
  state.lastSwitchAt = now;
  pruneOlder(now, "visibleSegments");
  pruneOlder(now, "hiddenSegments");
}

export function installScreenTracker() {
  if (state.installed || typeof document === "undefined") return;
  state.installed = true;
  state.lastHref = location.href;

  const onVisibility = () => recordSwitch(!document.hidden);
  const onBlur = () => {
    if (state.isVisible) recordSwitch(false);
  };
  const onFocus = () => {
    if (!state.isVisible) recordSwitch(true);
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  window.addEventListener("popstate", recordNavigationIfChanged);
  window.addEventListener("hashchange", recordNavigationIfChanged);
  /* SPA icinde tam URL degisimi */
  state.navCheckId = window.setInterval(recordNavigationIfChanged, 900);
}

export function getScreenMetrics() {
  const now = Date.now();
  pruneOlder(now, "visibleSegments");
  pruneOlder(now, "hiddenSegments");

  const sumDuration = (segments) =>
    segments.reduce((total, segment) => {
      const start = Math.max(segment.start, now - WINDOW_MS);
      return total + Math.max(0, segment.end - start);
    }, 0);

  let visibleMs = sumDuration(state.visibleSegments);
  let hiddenMs = sumDuration(state.hiddenSegments);

  const tailStart = Math.max(state.lastSwitchAt, now - WINDOW_MS);
  const tail = Math.max(0, now - tailStart);
  if (state.isVisible) visibleMs += tail;
  else hiddenMs += tail;

  const totalMs = visibleMs + hiddenMs || 1;
  const visibleRatio = visibleMs / totalMs;
  const awayStreakMs = state.isVisible ? 0 : now - state.lastSwitchAt;

  return {
    is_visible: state.isVisible,
    visible_ratio: Math.max(0, Math.min(1, visibleRatio)),
    away_count: state.awayEvents.length,
    away_streak_ms: awayStreakMs,
    window_ms: WINDOW_MS,
    site_switch_count: state.navEvents.length,
    site_path: typeof location !== "undefined" ? `${location.pathname}${location.search || ""}` : "",
  };
}

