// Service worker — handle API calls + storage
// MV3: tidak persistent, hanya wake on event. Pakai chrome.storage untuk state.

const DEFAULT_API_BASE = "http://localhost:8000";

async function getApiBase() {
  const { apiBase } = await chrome.storage.sync.get("apiBase");
  return apiBase || DEFAULT_API_BASE;
}

async function fetchCoupons(merchantSlug) {
  const base = await getApiBase();
  const url = `${base}/coupons?merchant=${encodeURIComponent(merchantSlug)}&limit=50`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("[SuperKupon] fetch failed:", e);
    return [];
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_COUPONS") {
    fetchCoupons(message.merchant).then(sendResponse);
    return true; // keep channel open for async response
  }

  if (message.type === "GET_CONFIG") {
    chrome.storage.sync.get(["apiBase", "autoTry"], (cfg) => {
      sendResponse({
        apiBase: cfg.apiBase || DEFAULT_API_BASE,
        autoTry: cfg.autoTry ?? false,
      });
    });
    return true;
  }

  if (message.type === "SET_CONFIG") {
    chrome.storage.sync.set(message.config, () => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "REPORT_REDEMPTION") {
    // Track success/failure per code (V3 enhancement)
    chrome.storage.local.get("redemptions", (data) => {
      const log = data.redemptions || [];
      log.push({
        ts: Date.now(),
        merchant: message.merchant,
        code: message.code,
        success: message.success,
      });
      chrome.storage.local.set({ redemptions: log.slice(-500) });
    });
    return false;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["apiBase"], (cfg) => {
    if (!cfg.apiBase) {
      chrome.storage.sync.set({ apiBase: DEFAULT_API_BASE, autoTry: false });
    }
  });
  console.log("[SuperKupon] Extension installed.");
});
