/**
 * Google Analytics 4 — ready to enable, OFF by default.
 * To turn it on, paste your GA4 Measurement ID (looks like "G-ABC123XYZ9") between the quotes below and publish.
 * Until an ID is set this file does nothing: no Google script, no cookies, no banner.
 *
 * Consent-friendly behaviour once enabled:
 *  - Visitors with Do Not Track or Global Privacy Control switched on are never tracked.
 *  - Google Consent Mode v2 starts with everything "denied"; analytics cookies are only allowed after the visitor
 *    presses "Allow" in the small banner. Advertising storage / personalisation always stay denied.
 *  - The choice is remembered on the visitor's device (localStorage "neon_consent") and can be changed any time
 *    from the "Cookie settings" button on the privacy page (window.neonConsent.reset()).
 */
(function () {
  "use strict";
  var GA_ID = "G-PE77TSGQNB";

  var KEY = "neon_consent";
  var api = window.neonConsent = {
    enabled: /^G-[A-Z0-9]{4,}$/.test(GA_ID),
    get: function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); }
  };
  if (!api.enabled) return;
  var dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.msDoNotTrack === "1" || navigator.globalPrivacyControl === true;
  api.dnt = dnt;
  if (dnt) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", wait_for_update: 500 });
  gtag("js", new Date());
  gtag("config", GA_ID, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });

  var choice = api.get();
  if (choice === "granted") gtag("consent", "update", { analytics_storage: "granted" });
  if (choice === "denied") return; // respect "Decline": do not even load gtag.js

  var s = document.createElement("script");
  s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
  document.head.appendChild(s);

  if (choice) return;
  function banner() {
    var b = document.createElement("div");
    b.className = "consent"; b.setAttribute("role", "region"); b.setAttribute("aria-label", "Cookie choice");
    b.innerHTML = '<p>We use Google Analytics cookies to see which pages help visitors. No ads, no selling of data. ' +
      '<a href="' + (document.querySelector('a[href$="privacy.html"]') || { getAttribute: function () { return "privacy.html"; } }).getAttribute("href") + '">Privacy policy</a></p>' +
      '<div><button type="button" class="btn btn-o" data-c="denied">Decline</button><button type="button" class="btn btn-p" data-c="granted"><span>Allow</span></button></div>';
    b.addEventListener("click", function (e) {
      var v = e.target.closest && e.target.closest("button") && e.target.closest("button").getAttribute("data-c");
      if (!v) return;
      api.set(v);
      gtag("consent", "update", { analytics_storage: v });
      b.remove();
    });
    document.body.appendChild(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", banner); else banner();
})();
