// Wrapped in an IIFE to avoid leaking variables into page scope
// Overrides fetch at runtime to observe network traffic without blocking it

(function () {
  // Preserve native fetch so behavior remains unchanged
  const originalFetch = window.fetch;

  // Replace fetch to enable passive inspection
  window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = resource instanceof Request ? resource.url : resource;
    const method =
      resource instanceof Request ? resource.method : config?.method || "GET";

    let requestData = null;
    try {
      if (resource instanceof Request) {
        const clonedRequest = resource.clone();
        const ct = clonedRequest.headers.get("content-type") || "";

        if (ct.includes("application/json")) {
          const text = await clonedRequest.text();
          try {
            requestData = JSON.parse(text);
          } catch {
            requestData = text;
          }
        } else {
          try {
            requestData = await clonedRequest.text();
          } catch {
            requestData = null;
          }
        }
      } else if (config && config.body) {
        try {
          const contentType =
            config.headers?.["Content-Type"] ||
            config.headers?.["content-type"] ||
            "";

          if (
            typeof config.body === "string" &&
            contentType.includes("application/json")
          ) {
            requestData = JSON.parse(config.body);
          } else {
            requestData = config.body;
          }
        } catch {
          requestData = config.body;
        }
      }
    } catch (e) {
      console.error("Error extracting fetch request body:", e);
    }

    // 🔁 Gemini config hookup
    const monitorConfig = window.__GEMINI_MONITOR_CONFIG;

    const shouldLog =
      monitorConfig && monitorConfig.shouldLogRequest(url, method);

    try {
      const response = await originalFetch.apply(this, args);

      if (shouldLog) {
        const clone = response.clone();

        clone
          .text()
          .then((body) => {
            try {
              const responseData = JSON.parse(body);
              monitorConfig.logResponse(url, responseData, requestData);
            } catch {
              monitorConfig.logResponse(url, body, requestData);
            }
          })
          .catch((err) => {
            if (
              monitorConfig &&
              typeof monitorConfig.logResponse === "function"
            ) {
              monitorConfig.logResponse(
                url,
                { error: err.message },
                requestData
              );
            }
            console.error("Error reading response body in fetch-monitor:", err);
          });
      }

      return response;
    } catch (error) {
      throw error;
    }
  };
})();
