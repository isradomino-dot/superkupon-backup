// Apply i18n strings to DOM elements with data-i18n attribute
function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });
}

const apiInput = document.getElementById("api-base");
const autoTryInput = document.getElementById("auto-try");
const saveBtn = document.getElementById("save-btn");
const saveFeedback = document.getElementById("save-feedback");
const statusLine = document.getElementById("status-line");

async function loadConfig() {
  chrome.runtime.sendMessage({ type: "GET_CONFIG" }, (cfg) => {
    apiInput.value = cfg.apiBase || "";
    autoTryInput.checked = !!cfg.autoTry;
    checkBackendHealth(cfg.apiBase);
  });
}

async function checkBackendHealth(base) {
  if (!base) {
    statusLine.textContent = "⚠️ " + chrome.i18n.getMessage("settingsApiUrl");
    return;
  }
  try {
    const res = await fetch(`${base}/health`);
    if (res.ok) {
      statusLine.innerHTML = `<span style="color:#10b981">●</span> ${chrome.i18n.getMessage("statusOk")} — <code>${base}</code>`;
    } else {
      statusLine.innerHTML = `<span style="color:#f59e0b">●</span> Backend ${res.status}`;
    }
  } catch (e) {
    statusLine.innerHTML = `<span style="color:#ef4444">●</span> ${chrome.i18n.getMessage("statusUnreachable")}`;
  }
}

saveBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage(
    {
      type: "SET_CONFIG",
      config: {
        apiBase: apiInput.value.trim(),
        autoTry: autoTryInput.checked,
      },
    },
    () => {
      saveFeedback.textContent = chrome.i18n.getMessage("settingsSaved");
      checkBackendHealth(apiInput.value.trim());
      setTimeout(() => (saveFeedback.textContent = ""), 2000);
    }
  );
});

applyI18n();
loadConfig();
