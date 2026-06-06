// Site adapter — definisi per merchant: cara detect checkout, locate code input,
// trigger apply button, dan parse result.

export const ADAPTERS = {
  shopee: {
    slug: "shopee",
    name: "Shopee",
    matchUrl: /shopee\.co\.id\/(checkout|cart)/,
    selectors: {
      // Voucher input di Shopee biasanya muncul setelah klik "Voucher Toko" / "Voucher Platform"
      voucherTrigger: "[class*='voucher'] button, [data-testid*='voucher']",
      codeInput: "input[placeholder*='kode'], input[placeholder*='Voucher'], input[placeholder*='voucher']",
      applyButton: "button[type='submit'], button[class*='apply'], button[class*='Apply']",
      successMessage: "[class*='success'], [class*='applied']",
      errorMessage: "[class*='error'], [class*='invalid']",
      totalAmount: "[class*='total'], [data-testid*='total-price']",
    },
    timings: {
      betweenAttempts: 2000,
      waitForResponse: 1500,
    },
  },

  tokopedia: {
    slug: "tokopedia",
    name: "Tokopedia",
    matchUrl: /tokopedia\.com\/(checkout|cart)/,
    selectors: {
      voucherTrigger: "[data-testid*='voucher'], button[aria-label*='voucher']",
      codeInput: "input[placeholder*='Masukkan kode'], input[data-testid*='code']",
      applyButton: "button[data-testid*='apply'], button[type='submit']",
      successMessage: "[class*='Success'], [aria-label*='applied']",
      errorMessage: "[class*='Error'], [class*='ErrorMessage']",
      totalAmount: "[data-testid*='subtotal'], [data-testid*='total']",
    },
    timings: {
      betweenAttempts: 2500,
      waitForResponse: 1800,
    },
  },

  blibli: {
    slug: "blibli",
    name: "Blibli",
    matchUrl: /blibli\.com\/(checkout|cart)/,
    selectors: {
      voucherTrigger: "[class*='promo'] button, [class*='voucher'] button",
      codeInput: "input[name*='promo'], input[name*='voucher']",
      applyButton: "button[type='submit']",
      successMessage: "[class*='success']",
      errorMessage: "[class*='error']",
      totalAmount: "[class*='total']",
    },
    timings: {
      betweenAttempts: 2000,
      waitForResponse: 1500,
    },
  },

  lazada: {
    slug: "lazada",
    name: "Lazada",
    matchUrl: /lazada\.co\.id\/(checkout|cart)/,
    selectors: {
      voucherTrigger: "[class*='voucher'] button",
      codeInput: "input[placeholder*='voucher']",
      applyButton: "button[class*='apply'], button[type='submit']",
      successMessage: "[class*='success']",
      errorMessage: "[class*='error']",
      totalAmount: "[class*='total']",
    },
    timings: {
      betweenAttempts: 2500,
      waitForResponse: 2000,
    },
  },

  bukalapak: {
    slug: "bukalapak",
    name: "Bukalapak",
    matchUrl: /bukalapak\.com\/(checkout|cart)/,
    selectors: {
      voucherTrigger: "[class*='voucher'] button, [class*='promo'] button",
      codeInput: "input[placeholder*='kode'], input[name*='voucher']",
      applyButton: "button[type='submit']",
      successMessage: "[class*='success']",
      errorMessage: "[class*='error']",
      totalAmount: "[class*='total']",
    },
    timings: {
      betweenAttempts: 2000,
      waitForResponse: 1500,
    },
  },
};

export function detectSite() {
  for (const adapter of Object.values(ADAPTERS)) {
    if (adapter.matchUrl.test(location.href)) {
      return adapter;
    }
  }
  return null;
}
