// Fetch coupons dari backend, render ke widget, handle apply flow.

(function () {
  "use strict";

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function formatDiscount(c) {
    if (c.discount_type === "percent") return `${c.discount_value}%`;
    if (c.discount_type === "free_shipping") return "Gratis Ongkir";
    if (c.discount_type === "bogo") return "B1G1";
    if (c.discount_type === "cashback") {
      return c.discount_value < 100
        ? `CB ${c.discount_value}%`
        : `CB Rp ${Number(c.discount_value).toLocaleString("id-ID")}`;
    }
    return `Rp ${Number(c.discount_value).toLocaleString("id-ID")}`;
  }

  function renderList(container, coupons) {
    if (!coupons || coupons.length === 0) {
      container.innerHTML = `<p class="kh-empty">Belum ada kupon aktif untuk merchant ini.</p>`;
      return;
    }

    container.innerHTML = "";
    coupons
      .filter((c) => c.code)
      .slice(0, 20)
      .forEach((c) => {
        const item = document.createElement("div");
        item.className = "kh-item";
        item.innerHTML = `
          <div class="kh-item-info">
            <div class="kh-item-title">${escapeHtml(c.title)}</div>
            <div class="kh-item-meta">
              <span class="kh-discount">${escapeHtml(formatDiscount(c))}</span>
              ${c.expires_at ? `<span class="kh-expiry">⏰ ${new Date(c.expires_at).toLocaleDateString("id-ID")}</span>` : ""}
            </div>
          </div>
          <div class="kh-item-actions">
            <code class="kh-code">${escapeHtml(c.code)}</code>
            <button type="button" class="kh-copy" data-code="${escapeHtml(c.code)}">Salin</button>
            <button type="button" class="kh-try" data-code="${escapeHtml(c.code)}" data-merchant="${escapeHtml(c.merchant.slug)}">Coba</button>
          </div>
        `;
        container.appendChild(item);
      });

    container.querySelectorAll(".kh-copy").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const code = e.target.dataset.code;
        try {
          await navigator.clipboard.writeText(code);
          const orig = e.target.textContent;
          e.target.textContent = "✓";
          setTimeout(() => (e.target.textContent = orig), 1200);
        } catch (err) {
          console.warn("Clipboard failed:", err);
        }
      });
    });

    container.querySelectorAll(".kh-try").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const code = e.target.dataset.code;
        const merchant = e.target.dataset.merchant;
        tryApplyCode(code, merchant, e.target);
      });
    });
  }

  async function tryApplyCode(code, merchant, btn) {
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = "Mencoba…";

    const adapter = window.__KH_ADAPTER__;
    if (!adapter) {
      btn.textContent = "Adapter ?";
      return;
    }

    const selectors = await getSelectors(adapter.slug);
    if (!selectors) {
      btn.textContent = "?";
      return;
    }

    try {
      const trigger = document.querySelector(selectors.voucherTrigger);
      if (trigger) trigger.click();
      await sleep(500);

      const input = document.querySelector(selectors.codeInput);
      if (!input) {
        btn.textContent = "Input ?";
        return;
      }

      input.focus();
      nativeInputValueSetter(input, code);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      await sleep(300);
      const applyBtn = document.querySelector(selectors.applyButton);
      if (applyBtn) applyBtn.click();

      await sleep(1500);

      const successEl = document.querySelector(selectors.successMessage);
      const errorEl = document.querySelector(selectors.errorMessage);

      const success = !!successEl && !errorEl;
      btn.textContent = success ? "✓ Berhasil" : "✗ Gagal";
      btn.classList.add(success ? "kh-success" : "kh-failed");

      chrome.runtime.sendMessage({
        type: "REPORT_REDEMPTION",
        code,
        merchant,
        success,
      });

      setTimeout(() => {
        btn.textContent = orig;
        btn.disabled = false;
        btn.classList.remove("kh-success", "kh-failed");
      }, 3000);
    } catch (err) {
      console.error("[SuperKupon] try failed:", err);
      btn.textContent = "Error";
      btn.disabled = false;
    }
  }

  function nativeInputValueSetter(input, value) {
    const proto = input.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(input, value);
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function getSelectors(slug) {
    // Selectors embedded sebagai data attribute oleh site_detector (atau hardcode minimal di sini)
    const HARDCODED = {
      shopee: {
        voucherTrigger: "[class*='voucher'] button",
        codeInput: "input[placeholder*='Voucher'], input[placeholder*='voucher']",
        applyButton: "button[class*='apply' i], button[type='submit']",
        successMessage: "[class*='success']",
        errorMessage: "[class*='error'], [class*='invalid']",
      },
      tokopedia: {
        voucherTrigger: "[data-testid*='voucher']",
        codeInput: "input[placeholder*='Masukkan kode'], input[data-testid*='code']",
        applyButton: "button[data-testid*='apply'], button[type='submit']",
        successMessage: "[class*='Success']",
        errorMessage: "[class*='Error']",
      },
      blibli: {
        voucherTrigger: "[class*='voucher'] button",
        codeInput: "input[name*='voucher'], input[name*='promo']",
        applyButton: "button[type='submit']",
        successMessage: "[class*='success']",
        errorMessage: "[class*='error']",
      },
      lazada: {
        voucherTrigger: "[class*='voucher'] button",
        codeInput: "input[placeholder*='voucher']",
        applyButton: "button[type='submit']",
        successMessage: "[class*='success']",
        errorMessage: "[class*='error']",
      },
      bukalapak: {
        voucherTrigger: "[class*='voucher'] button",
        codeInput: "input[name*='voucher']",
        applyButton: "button[type='submit']",
        successMessage: "[class*='success']",
        errorMessage: "[class*='error']",
      },
    };
    return HARDCODED[slug];
  }

  async function loadCoupons(adapter) {
    const list = document.getElementById("kh-list");
    const count = document.getElementById("kh-count");

    chrome.runtime.sendMessage(
      { type: "FETCH_COUPONS", merchant: adapter.slug },
      (coupons) => {
        const withCode = (coupons || []).filter((c) => c.code);
        count.textContent = withCode.length > 0 ? String(withCode.length) : "0";
        renderList(list, coupons || []);
      }
    );
  }

  window.addEventListener("kh:widget-ready", (e) => {
    loadCoupons(e.detail);
  });
})();
