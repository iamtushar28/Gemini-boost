// ==================== SCRIPT INJECTION ====================

function attachMonitor() {
  const configScript = document.createElement("script");
  configScript.src = chrome.runtime.getURL("monitor-config.js");
  configScript.onload = function () {
    this.remove();

    const fetchScript = document.createElement("script");
    fetchScript.src = chrome.runtime.getURL("fetch-monitor.js");
    fetchScript.onload = function () {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(fetchScript);
  };

  (document.head || document.documentElement).appendChild(configScript);
}

// ==================== THEME SYSTEM ====================

function isDarkTheme() {
  return (
    document.documentElement.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function getThemeStyles() {
  const dark = isDarkTheme();
  return {
    panelBg: dark ? "rgba(0,0,0,0.20)" : "rgba(255,255,255,0.65)",
    textColor: dark ? "#ffffff" : "#111111",
    borderColor: dark ? "rgb(49,49,49)" : "#cccccc",
    linkColor: dark ? "#4da3ff" : "#2a78ff",
  };
}

function applyThemeToUI() {
  const T = getThemeStyles();
  const panel = document.querySelector(".gemini-api-monitor");
  const toggle = document.querySelector(".gemini-api-monitor-toggle");

  if (!panel && !toggle) return;

  if (panel) {
    panel.style.backgroundColor = T.panelBg;
    panel.style.border = `1px solid ${T.borderColor}`;
    panel.style.color = T.textColor;

    const header = panel.querySelector(".gemini-monitor-header");
    if (header) header.style.borderBottom = `1px solid ${T.borderColor}`;

    const searchWrap = panel.querySelector(".gemini-search-wrap");
    if (searchWrap) searchWrap.style.border = `1px solid ${T.borderColor}`;

    panel.querySelectorAll("button, input, span").forEach((el) => {
      el.style.color = T.textColor;
    });

    const report = panel.querySelector(".gemini-report-link");
    if (report) {
      report.style.color = T.linkColor;
      report.style.borderTop = `1px solid ${T.borderColor}`;
    }
  }

  if (toggle) {
    toggle.style.backgroundColor = T.panelBg;
    toggle.style.border = `1px solid ${T.borderColor}`;
    toggle.style.color = T.textColor;
  }
}

function observeThemeChanges() {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", applyThemeToUI);

  const observer = new MutationObserver(applyThemeToUI);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

// ==================== UI ====================

function createToggleButton() {
  if (document.querySelector(".gemini-api-monitor-toggle")) return;

  const T = getThemeStyles();
  const btn = document.createElement("button");
  btn.className = "gemini-api-monitor-toggle";
  btn.textContent = "Show Chats";

  Object.assign(btn.style, {
    position: "fixed",
    top: "70px",
    right: "10px",
    padding: "8px 16px",
    backgroundColor: T.panelBg,
    backdropFilter: "blur(10px)",
    border: `1px solid ${T.borderColor}`,
    borderRadius: "5px",
    color: T.textColor,
    cursor: "pointer",
    zIndex: "1000",
    fontSize: "14px",
    fontWeight: "500",
  });

  btn.onclick = toggleMonitor;
  document.body.appendChild(btn);
  makeDraggable(btn);
}

function toggleMonitor() {
  const panel = document.querySelector(".gemini-api-monitor");
  const toggle = document.querySelector(".gemini-api-monitor-toggle");
  if (!panel || !toggle) return;

  const visible = panel.style.display !== "none";
  panel.style.display = visible ? "none" : "block";
  toggle.style.display = visible ? "block" : "none";
}

function createMonitorDiv() {
  if (document.querySelector(".gemini-api-monitor")) return;

  const T = getThemeStyles();
  const div = document.createElement("div");
  div.className = "gemini-api-monitor";

  Object.assign(div.style, {
    position: "fixed",
    top: "70px",
    right: "10px",
    padding: "10px",
    paddingBottom: "30px",
    backgroundColor: T.panelBg,
    backdropFilter: "blur(10px)",
    border: `1px solid ${T.borderColor}`,
    borderRadius: "5px",
    zIndex: "1000",
    maxWidth: "360px",
    minWidth: "360px",
    fontSize: "14px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    display: "none",
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "5px",
    right: "5px",
    background: "transparent",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
  });
  closeBtn.onclick = toggleMonitor;

  const header = document.createElement("div");
  header.textContent = "My Chats";
  header.className = "gemini-monitor-header";
  Object.assign(header.style, {
    fontWeight: "600",
    marginBottom: "6px",
    cursor: "move",
    paddingBottom: "5px",
  });

  const searchWrap = document.createElement("div");
  searchWrap.className = "gemini-search-wrap";
  Object.assign(searchWrap.style, {
    display: "flex",
    alignItems: "center",
    padding: "6px 10px", //  more vertical padding
    borderRadius: "6px",
    margin: "10px 0",
    height: "36px", //  explicit height
    boxSizing: "border-box",
  });

  const searchIcon = document.createElement("span");
  searchIcon.textContent = "🧐";
  searchIcon.style.marginRight = "6px";

  const searchInput = document.createElement("input");
  searchInput.placeholder = "Search chat...";
  Object.assign(searchInput.style, {
    flex: "1",
    background: "transparent",
    border: "none",
    outline: "none",
    fontSize: "14px",
    height: "100%", //  fill search bar height
    lineHeight: "20px",
  });

  searchInput.addEventListener("input", (e) => {
    document.dispatchEvent(
      new CustomEvent("gemini-monitor-search", {
        detail: { query: e.target.value || "" },
      })
    );
  });

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "✕";
  Object.assign(clearBtn.style, {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
  });

  clearBtn.onclick = () => {
    searchInput.value = "";
    document.dispatchEvent(
      new CustomEvent("gemini-monitor-search", {
        detail: { query: "" },
      })
    );
  };

  searchWrap.append(searchIcon, searchInput, clearBtn);

  const content = document.createElement("div");
  content.className = "content-wrapper";
  content.textContent = "Loading...";

  const report = document.createElement("a");
  report.className = "gemini-report-link";
  report.href = "https://github.com/iamtushar28/Gemini-boost/issues/new";
  report.target = "_blank";
  report.textContent = "Report an issue ⚠️";
  Object.assign(report.style, {
    position: "absolute",
    bottom: "0",
    left: "0", //  anchor left instead of right
    padding: "4px 6px",
    width: "100%",
    boxSizing: "border-box", //  CRITICAL FIX
    textAlign: "right",
    textDecoration: "none",
  });

  div.append(closeBtn, header, searchWrap, content, report);
  document.body.appendChild(div);

  makeDraggable(div, header);
  applyThemeToUI();
}

// ==================== DRAG ====================

function makeDraggable(el, handle) {
  let x = 0,
    y = 0,
    mx = 0,
    my = 0;

  (handle || el).onmousedown = (e) => {
    e.preventDefault();
    mx = e.clientX;
    my = e.clientY;
    document.onmousemove = drag;
    document.onmouseup = stop;
  };

  function drag(e) {
    x = mx - e.clientX;
    y = my - e.clientY;
    mx = e.clientX;
    my = e.clientY;
    el.style.top = el.offsetTop - y + "px";
    el.style.left = el.offsetLeft - x + "px";
    el.style.right = "auto";
  }

  function stop() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// ==================== INIT ====================

attachMonitor();
observeThemeChanges();

const initUI = () => {
  if (!document.body) {
    requestAnimationFrame(initUI);
    return;
  }
  createMonitorDiv();
  createToggleButton();
  applyThemeToUI();
};

initUI();
