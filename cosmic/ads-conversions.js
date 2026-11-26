/**
 * Google Ads conversion helper for WhatsApp and phone clicks.
 * Loaded on every page. Uses event delegation so individual anchors do not need onclick attributes.
 */
(function () {
  "use strict";

  var WA_SEND_TO = "AW-18484453753/Va_7CNqj278dEPnCie5E";
  var TEL_SEND_TO = "AW-18484453753/BDzJCN2j278dEPnCie5E";
  var FALLBACK_MS = 1000;

  function gtagFn() {
    if (typeof window.gtag === "function") return window.gtag;
    return null;
  }

  /**
   * @param {string} url
   * @param {string} sendTo
   * @returns {boolean}
   */
  function gtag_report_conversion(url, sendTo) {
    var navigated = false;
    var go = function () {
      if (navigated) return;
      navigated = true;
      if (typeof url !== "undefined" && url) window.location = url;
    };
    var timer = setTimeout(go, FALLBACK_MS);
    var callback = function () {
      clearTimeout(timer);
      go();
    };
    var fn = gtagFn();
    if (fn) {
      try {
        fn("event", "conversion", {
          send_to: sendTo,
          event_callback: callback,
          event_timeout: FALLBACK_MS
        });
      } catch (e) {
        go();
      }
    } else {
      go();
    }
    return false;
  }

  window.gtag_report_conversion = gtag_report_conversion;

  function isWhatsApp(href) {
    return /(?:^https?:\/\/)?(?:wa\.me\/|api\.whatsapp\.com\/|whatsapp\.com\/)/i.test(href || "");
  }

  function isTel(href) {
    return /^tel:/i.test(href || "");
  }

  function fireOnly(sendTo) {
    var fn = gtagFn();
    if (!fn) return;
    try {
      fn("event", "conversion", { send_to: sendTo });
    } catch (e) {}
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented) return;
    if (e.button && e.button !== 0) return;
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var wa = isWhatsApp(href);
    var tel = isTel(href);
    if (!wa && !tel) return;
    var sendTo = wa ? WA_SEND_TO : TEL_SEND_TO;
    var newTab = a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
    if (newTab) {
      // Don't block: let the browser open the tab, just record the conversion.
      fireOnly(sendTo);
      return;
    }
    e.preventDefault();
    gtag_report_conversion(a.href, sendTo);
  }, false);
})();
