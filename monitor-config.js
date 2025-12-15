// ===================== THEME SYSTEM =====================

(function injectThemeCSS() {
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --gemini-monitor-border: #ccc;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --gemini-monitor-border: rgb(49,49,49);
      }
    }

    /* Fallback if Gemini does add class */
    html.dark {
      --gemini-monitor-border: rgb(49,49,49);
    }
  `;
  document.documentElement.appendChild(style);
})();

function getThemeStyles() {
  const isDark =
    document.documentElement.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return {
    textColor: isDark ? "#ffffff" : "#111111",
    hoverColor: "#4da3ff",
  };
}

// ===================== GLOBAL STATE =====================

// conversationId -> { messageId -> text }
window.__GEMINI_USER_MESSAGES = {};

let __GEMINI_OBSERVER_ATTACHED = false;
let __GEMINI_UPDATE_SCHEDULED = false;

// Track active conversation via URL
let __GEMINI_ACTIVE_CONVERSATION_ID =
  location.pathname.split("/app/")[1] || null;

// ===================== CONFIG OBJECT =====================

window.__GEMINI_MONITOR_CONFIG = {
  searchQuery: "",

  scrollToMessage(messageId) {
    const el = document.getElementById(messageId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  },

  updateMonitorDiv() {
    const monitorDiv = document.querySelector(".gemini-api-monitor");
    if (!monitorDiv) return;

    const contentWrapper =
      monitorDiv.querySelector(".content-wrapper") || monitorDiv.children[1];

    // TrustedHTML-safe clear
    while (contentWrapper.firstChild) {
      contentWrapper.removeChild(contentWrapper.firstChild);
    }

    const list = document.createElement("div");
    list.style.overflow = "auto";
    list.style.maxHeight = "360px";

    const query = (this.searchQuery || "").toLowerCase();
    const T = getThemeStyles();
    let anyShown = false;

    Object.entries(window.__GEMINI_USER_MESSAGES).forEach(([id, text]) => {
      if (!text) return;
      if (query && !text.toLowerCase().includes(query)) return;

      anyShown = true;

      const row = document.createElement("div");
      row.style.marginBottom = "4px";
      row.style.padding = "4px";

      const btn = document.createElement("button");
      btn.textContent = text;

      Object.assign(btn.style, {
        cursor: "pointer",
        border: "none",
        padding: "2px 0",
        textAlign: "left",
        width: "100%",
        borderBottom: "1px solid var(--gemini-monitor-border)",
        fontSize: "14px",
        display: "-webkit-box",
        WebkitLineClamp: "2",
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        background: "transparent",
        color: T.textColor,
      });

      btn.onclick = () => this.scrollToMessage(id);
      btn.onmouseover = () => (btn.style.color = T.hoverColor);
      btn.onmouseout = () => (btn.style.color = T.textColor);

      row.appendChild(btn);
      list.appendChild(row);
    });

    if (!anyShown) {
      const empty = document.createElement("div");
      empty.textContent = "No messages matched your search.";
      list.appendChild(empty);
    }

    contentWrapper.appendChild(list);
  },
};

// ===================== CHAT SWITCH HANDLING =====================

function checkConversationChange() {
  const currentId = location.pathname.split("/app/")[1] || null;

  if (currentId !== __GEMINI_ACTIVE_CONVERSATION_ID) {
    __GEMINI_ACTIVE_CONVERSATION_ID = currentId;

    // 🔥 Clear old chat state
    window.__GEMINI_USER_MESSAGES = {};

    // Reset UI to loading state (TrustedHTML-safe)
    const panel = document.querySelector(".gemini-api-monitor");
    if (panel) {
      const content =
        panel.querySelector(".content-wrapper") || panel.children[1];
      if (content) {
        while (content.firstChild) {
          content.removeChild(content.firstChild);
        }
        const loading = document.createElement("div");
        loading.textContent = "Loading...";
        content.appendChild(loading);
      }
    }
  }
}

// ===================== DOM CAPTURE =====================

function extractUserText(bubble) {
  return Array.from(bubble.querySelectorAll("p.query-text-line"))
    .map((p) => p.textContent.trim())
    .join(" ");
}

function scheduleUpdate() {
  if (__GEMINI_UPDATE_SCHEDULED) return;
  __GEMINI_UPDATE_SCHEDULED = true;

  requestAnimationFrame(() => {
    __GEMINI_UPDATE_SCHEDULED = false;
    window.__GEMINI_MONITOR_CONFIG.updateMonitorDiv();
  });
}

function attachObserver() {
  if (__GEMINI_OBSERVER_ATTACHED) return;

  const root = document.querySelector(
    "div.conversation-container"
  )?.parentElement;

  if (!root) {
    requestAnimationFrame(attachObserver);
    return;
  }

  __GEMINI_OBSERVER_ATTACHED = true;

  const observer = new MutationObserver(() => {
    // ✅ Detect chat switch
    checkConversationChange();

    root
      .querySelectorAll("span.user-query-bubble-with-background")
      .forEach((bubble) => {
        const container = bubble.closest(".conversation-container");
        if (!container || !container.id) return;

        if (window.__GEMINI_USER_MESSAGES[container.id]) return;

        const text = extractUserText(bubble);
        if (!text) return;

        window.__GEMINI_USER_MESSAGES[container.id] = text;
      });

    scheduleUpdate();
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
  });
}

// ===================== SEARCH EVENT =====================

document.addEventListener("gemini-monitor-search", (e) => {
  window.__GEMINI_MONITOR_CONFIG.searchQuery = String(e?.detail?.query || "");
  window.__GEMINI_MONITOR_CONFIG.updateMonitorDiv();
});

// ===================== INIT =====================

attachObserver();
