(function () {
  const PASSWORD = (window && window.CYBERNEXUS_PUBLIC_PASSWORD) || "NEXUS1";
  const STORAGE_KEY = "cnx_auth";

  function createGateOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "cnx-security-gate";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "99999";
    overlay.style.background = "linear-gradient(135deg, rgba(10,10,10,0.96), rgba(0,0,0,0.96))";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.backdropFilter = "blur(4px)";

    const box = document.createElement("div");
    box.style.maxWidth = "420px";
    box.style.width = "90%";
    box.style.border = "1px solid rgba(0,255,255,0.25)";
    box.style.borderRadius = "14px";
    box.style.padding = "24px";
    box.style.background = "linear-gradient(180deg, rgba(26,26,26,0.95), rgba(14,14,14,0.95))";
    box.style.boxShadow = "0 0 30px rgba(0,255,255,0.15)";
    box.style.color = "#e5e7eb";
    box.style.fontFamily = "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";

    const title = document.createElement("div");
    title.textContent = "Access Gate";
    title.style.fontSize = "22px";
    title.style.fontWeight = "700";
    title.style.marginBottom = "8px";
    title.style.backgroundImage = "linear-gradient(90deg,#06b6d4,#818cf8)";
    title.style.webkitBackgroundClip = "text";
    title.style.backgroundClip = "text";
    title.style.color = "transparent";

    const info = document.createElement("div");
    info.innerHTML = "Enter the password to continue. Password (visible to everyone): <strong>" + PASSWORD + "</strong>";
    info.style.fontSize = "14px";
    info.style.color = "#9ca3af";
    info.style.marginBottom = "14px";

    const input = document.createElement("input");
    input.type = "text"; // visible as requested
    input.placeholder = "Enter password";
    input.style.width = "100%";
    input.style.padding = "12px 14px";
    input.style.borderRadius = "10px";
    input.style.border = "1px solid rgba(100,116,139,0.35)";
    input.style.background = "rgba(17,24,39,0.7)";
    input.style.color = "#e5e7eb";

    const btn = document.createElement("button");
    btn.textContent = "Enter";
    btn.style.marginTop = "12px";
    btn.style.width = "100%";
    btn.style.padding = "12px 14px";
    btn.style.border = "0";
    btn.style.borderRadius = "10px";
    btn.style.cursor = "pointer";
    btn.style.fontWeight = "700";
    btn.style.color = "#0b1221";
    btn.style.background = "linear-gradient(90deg,#06b6d4,#818cf8)";

    const hint = document.createElement("div");
    hint.textContent = "Note: Client-side protections are deterrents only.";
    hint.style.fontSize = "12px";
    hint.style.color = "#6b7280";
    hint.style.marginTop = "10px";

    const error = document.createElement("div");
    error.style.display = "none";
    error.style.color = "#fca5a5";
    error.style.marginTop = "8px";
    error.style.fontSize = "13px";

    btn.addEventListener("click", function () {
      if (input.value.trim() === PASSWORD) {
        try { sessionStorage.setItem(STORAGE_KEY, "true"); } catch (e) {}
        overlay.remove();
      } else {
        error.textContent = "Wrong password";
        error.style.display = "block";
      }
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") btn.click();
    });

    box.appendChild(title);
    box.appendChild(info);
    box.appendChild(input);
    box.appendChild(btn);
    box.appendChild(hint);
    box.appendChild(error);
    overlay.appendChild(box);
    return overlay;
  }

  function showGateIfNeeded() {
    // Ask on reloads, otherwise remember auth for this tab via sessionStorage
    let navType = 'navigate';
    try {
      const entries = performance.getEntriesByType && performance.getEntriesByType('navigation');
      if (entries && entries.length && entries[0].type) {
        navType = entries[0].type; // 'navigate' | 'reload' | 'back_forward' | 'prerender'
      } else if (performance && performance.navigation && typeof performance.navigation.type === 'number') {
        // Deprecated fallback
        switch (performance.navigation.type) {
          case 1: navType = 'reload'; break;
          case 2: navType = 'back_forward'; break;
          default: navType = 'navigate';
        }
      }
    } catch (e) {}

    const isReload = navType === 'reload';
    let authed = false;
    try { authed = sessionStorage.getItem(STORAGE_KEY) === 'true'; } catch (e) {}

    if (isReload || !authed) {
      const gate = createGateOverlay();
      document.body.appendChild(gate);
    }
  }

  function attachDeterrents() {
    // Block right-click
    document.addEventListener("contextmenu", function (e) { e.preventDefault(); }, { capture: true });

    // Block common inspect/print/save shortcuts
    document.addEventListener("keydown", function (e) {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (
        key === "f12" ||
        (ctrl && e.shiftKey && (key === "i" || key === "j" || key === "s")) || // DevTools & Save-as
        (ctrl && (key === "u" || key === "s" || key === "p")) // ViewSrc/Save/Print
      ) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Attempt to deter PrintScreen
      if (key === "printscreen") {
        e.preventDefault();
        e.stopPropagation();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText("Screenshots are disabled.").catch(() => {});
        }
        flashShield();
      }
    }, { capture: true });

    // Block copy and selection (except inputs/textareas)
    document.addEventListener("copy", function (e) {
      e.preventDefault();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("Copying is disabled.").catch(() => {});
      }
    }, { capture: true });

    document.addEventListener("selectstart", function (e) {
      const target = e.target;
      if (target && (target.closest && target.closest('input, textarea'))) return;
      e.preventDefault();
    }, { capture: true });

    // Inject CSS to deter text selection globally
    try {
      const style = document.createElement('style');
      style.id = 'cnx-security-style';
      style.textContent = `*{user-select:none !important;} input, textarea{user-select:text !important;}`;
      document.head.appendChild(style);
    } catch (e) {}

    // Blur/visibility screen shield (best-effort)
    window.addEventListener("blur", flashShield);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible") flashShield();
    });
  }

  let shieldTimer = null;
  function flashShield() {
    const el = document.createElement("div");
    el.id = "cnx-screen-shield";
    el.style.position = "fixed";
    el.style.inset = "0";
    el.style.zIndex = "99998";
    el.style.background = "#000";
    el.style.opacity = "1";
    document.body.appendChild(el);
    clearTimeout(shieldTimer);
    shieldTimer = setTimeout(() => {
      el.remove();
    }, 1200);
  }

  function init() {
    // Defer to allow page to render first
    setTimeout(() => {
      attachDeterrents();
      showGateIfNeeded();
    }, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
