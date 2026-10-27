/**
 * Page behaviours carried over from the original site: WhatsApp prefilled links, quote form,
 * showreel facade, YouTube link, year, scroll-progress bar. (Service cards + options are pre-rendered
 * at build time by tools/build-static.mjs, so they exist even without JS.)
 * @module page
 */
import { waLink, YOUTUBE_URL, SHOWREEL_ID } from "./config.js";

const $ = (s, r = document) => r.querySelector(s);
let offs = [];
const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };

/** @param {object} ctx */
export function init(ctx) {
  if (YOUTUBE_URL) $("#ytLink").href = YOUTUBE_URL;
  document.querySelectorAll("[data-wa]").forEach(a => { a.href = waLink(a.dataset.wa); });
  $("#yr").textContent = new Date().getFullYear();

  // quote form -> WhatsApp (nothing stored)
  const form = $("#quoteForm");
  on(form, "submit", (e) => {
    e.preventDefault();
    const n = $("#qName").value.trim(), s = $("#qService").value, m = $("#qMsg").value.trim(), err = $("#qErr");
    if (!n) { err.textContent = "Please enter your name."; $("#qName").focus(); return; }
    if (!s) { err.textContent = "Please choose a service."; $("#qService").focus(); return; }
    err.textContent = "";
    const text = "Hi AI Nexus × Neon AI Studio!\nName: " + n + "\nService: " + s + (m ? "\nDetails: " + m : "") + "\n\nPlease share a quote.";
    window.open(waLink(text), "_blank", "noopener");
  });

  // showreel facade
  on($("#playBtn"), "click", () => {
    const f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + SHOWREEL_ID + "?autoplay=1&rel=0&playsinline=1&loop=1&playlist=" + SHOWREEL_ID;
    f.title = "AI Nexus × Neon AI Studio showreel";
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    $("#vbox").replaceChildren(f);
  });

  // scroll progress (driven from the central loop, no extra listeners)
  const fill = $("#spFill");
  let lastY = -1;
  ctx.unsub.push(ctx.loop.add(() => {
    const y = ctx.state.scrollY;
    if (y === lastY) return; lastY = y;
    const h = document.documentElement.scrollHeight - innerHeight;
    fill.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0) + ")";
  }, 20));
}
export function dispose() { offs.forEach(f => f()); offs = []; }
