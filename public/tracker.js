/*!
 * CADCAM tracker — minimal, privacy-aware page view beacon.
 *
 * Embed once in the <head> of every public page:
 *   <script defer src="https://api.cadcamsys.com/tracker.js"
 *           data-endpoint="https://api.cadcamsys.com/api/track"></script>
 *
 * For SPAs, call window.cadcamTrack.pageview() after each route change.
 *
 * Honours:
 *   - navigator.doNotTrack === "1"
 *   - localStorage.cadcamConsent === "denied"  (set this from your cookie banner)
 */
(function () {
  if (typeof window === "undefined") return;

  var script = document.currentScript;
  var endpoint =
    (script && script.getAttribute("data-endpoint")) ||
    (window.CADCAM_TRACK_ENDPOINT) ||
    "/api/track";

  function consentDenied() {
    try {
      if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return true;
      if (localStorage.getItem("cadcamConsent") === "denied") return true;
    } catch (e) { /* localStorage blocked: continue */ }
    return false;
  }

  function readUtm() {
    try {
      var p = new URLSearchParams(window.location.search);
      return {
        source: p.get("utm_source") || "",
        medium: p.get("utm_medium") || "",
        campaign: p.get("utm_campaign") || "",
        content: p.get("utm_content") || "",
        term: p.get("utm_term") || "",
      };
    } catch (e) {
      return { source: "", medium: "", campaign: "", content: "", term: "" };
    }
  }

  function send(payload) {
    if (consentDenied()) return;
    var body = JSON.stringify(payload);
    // sendBeacon survives page unload; fall back to fetch with keepalive.
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon(endpoint, blob)) return;
      }
    } catch (e) { /* fall through */ }
    try {
      fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true,
      }).catch(function () {});
    } catch (e) { /* ignore network errors */ }
  }

  // ---- Time-on-page (dwell) tracking ----
  var currentPath = null;
  var enteredAt = 0;
  var accumulated = 0; // ms accrued on the current page while it was visible

  function flushDwell() {
    if (!currentPath || !enteredAt) return;
    if (document.visibilityState !== "hidden") {
      accumulated += Date.now() - enteredAt;
      enteredAt = Date.now();
    }
    if (accumulated >= 1000) {
      send({ type: "dwell", path: currentPath, ms: accumulated });
      accumulated = 0;
    }
  }

  function startTimer(path) {
    flushDwell();
    currentPath = path;
    accumulated = 0;
    enteredAt = Date.now();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      if (enteredAt) { accumulated += Date.now() - enteredAt; enteredAt = 0; }
      flushDwell();
    } else {
      enteredAt = Date.now();
    }
  });
  window.addEventListener("pagehide", flushDwell);
  window.addEventListener("beforeunload", flushDwell);

  function pageview(opts) {
    opts = opts || {};
    var path = opts.path || (window.location.pathname + window.location.search);
    var title = opts.title || document.title || "";
    var referrer = opts.referrer || document.referrer || "";
    send({ path: path, title: title, referrer: referrer, utm: readUtm() });
    startTimer(path);
  }

  // Patch SPA history APIs so single-page apps fire pageviews automatically.
  function patchHistory() {
    var fire = function () { setTimeout(pageview, 0); };
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function () { var r = origPush.apply(this, arguments); fire(); return r; };
    history.replaceState = function () { var r = origReplace.apply(this, arguments); fire(); return r; };
    window.addEventListener("popstate", fire);
  }

  window.cadcamTrack = { pageview: pageview };

  // First pageview after the document is ready.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { patchHistory(); pageview(); });
  } else {
    patchHistory();
    pageview();
  }
})();
