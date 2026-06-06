// Detect checkout page & inject SuperKupon floating widget.
// Tidak otomatis apply — user yang trigger via button widget.

(function () {
  "use strict";

  const ADAPTERS = {
    "shopee.co.id": { slug: "shopee", name: "Shopee", checkoutMatch: /\/(checkout|cart)/ },
    "tokopedia.com": { slug: "tokopedia", name: "Tokopedia", checkoutMatch: /\/(checkout|cart)/ },
    "blibli.com": { slug: "blibli", name: "Blibli", checkoutMatch: /\/(checkout|cart)/ },
    "lazada.co.id": { slug: "lazada", name: "Lazada", checkoutMatch: /\/(checkout|cart)/ },
    "bukalapak.com": { slug: "bukalapak", name: "Bukalapak", checkoutMatch: /\/(checkout|cart)/ },
  };

  function detectAdapter() {
    for (const [host, cfg] of Object.entries(ADAPTERS)) {
      if (location.hostname.includes(host) && cfg.checkoutMatch.test(location.pathname)) {
        return cfg;
      }
    }
    return null;
  }

  function injectWidget(adapter) {
    if (document.getElementById("kh-widget")) return;

    const widget = document.createElement("div");
    widget.id = "kh-widget";
    widget.innerHTML = `
      <button id="kh-toggle" type="button" title="SuperKupon">
        <span class="kh-badge">KH</span>
        <span class="kh-count" id="kh-count">…</span>
      </button>
      <div id="kh-panel" style="display:none">
        <div class="kh-panel-header">
          <strong>Kupon untuk ${adapter.name}</strong>
          <button id="kh-close" type="button" aria-label="Tutup">×</button>
        </div>
        <div id="kh-list" class="kh-list">
          <p class="kh-loading">Memuat kupon…</p>
        </div>
        <div class="kh-footer">
          <small>Powered by SuperKupon</small>
        </div>
      </div>
    `;
    document.body.appendChild(widget);

    document.getElementById("kh-toggle").addEventListener("click", () => {
      const panel = document.getElementById("kh-panel");
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
    document.getElementById("kh-close").addEventListener("click", () => {
      document.getElementById("kh-panel").style.display = "none";
    });

    window.__KH_ADAPTER__ = adapter;
    window.dispatchEvent(new CustomEvent("kh:widget-ready", { detail: adapter }));
  }

  const adapter = detectAdapter();
  if (!adapter) return;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => injectWidget(adapter));
  } else {
    injectWidget(adapter);
  }
})();
