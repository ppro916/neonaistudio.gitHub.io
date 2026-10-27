/**
 * "Get Plan" flow — a small explicit state machine.
 *
 *   idle --click--> processing (2.5s, animated AI-processing overlay + rotating status lines)
 *        --------> opening     (opens https://wa.me/<number>?text=<plan, duration, price>)
 *        --------> idle        (button resets to "Get Plan")
 *
 * This is a genuine hand-off to WhatsApp – it never fakes an error. The announced state changes go to an
 * aria-live="polite" region. If the browser blocks the new tab (window.open returns null) an inline
 * "Open WhatsApp" link is revealed so the customer is never stuck.
 * @module pricing/processing
 */
import { PLANS, planMessage } from "./plans.js";
import { HOSTING, hostingMessage } from "./hostingPlans.js";
import { SECURITY, securityMessage } from "./securityPlan.js";
import { waLink } from "../config.js";

export const STATES = Object.freeze({ IDLE: "idle", PROCESSING: "processing", OPENING: "opening" });
const PROCESSING_MS = 2500, OPENING_MS = 700, LOG_MS = 480;
const LOG = [
  "> allocating compute...", "> queuing render shard...", "> syncing neural graph...",
  "> composing plan brief...", "> encrypting hand-off...", "> routing to WhatsApp...",
];
const machines = new Map();
let offs = [], live = null;

function Machine(card, plan, cfg) {
  const btn = card.querySelector(".plan-btn"), lbl = btn.querySelector(".lbl");
  const proc = card.querySelector(".proc"), logEl = card.querySelector(".proc-log"), fb = card.querySelector(".proc-fallback");
  let state = STATES.IDLE, timers = [], logI = 0;
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const clear = () => { timers.forEach(clearTimeout); timers = []; };

  function announce(msg) { if (live) { live.textContent = ""; requestAnimationFrame(() => { live.textContent = msg; }); } }

  function set(next) {
    state = next;
    card.dataset.state = next;
    btn.setAttribute("aria-busy", String(next !== STATES.IDLE));
    if (next === STATES.IDLE) { lbl.textContent = cfg.label; proc.hidden = true; btn.disabled = false; }
    if (next === STATES.PROCESSING) { lbl.textContent = "Processing..."; proc.hidden = false; btn.disabled = false; btn.setAttribute("aria-disabled", "true"); }
    if (next === STATES.OPENING) { lbl.textContent = "Opening WhatsApp"; }
    if (next === STATES.IDLE) btn.removeAttribute("aria-disabled");
  }

  function rotateLog() {
    logEl.textContent = LOG[logI++ % LOG.length];
    if (state === STATES.PROCESSING) later(rotateLog, LOG_MS);
  }

  function start() {
    if (state !== STATES.IDLE) return;          // ignore re-clicks while busy
    fb.hidden = true;
    logI = 0;
    set(STATES.PROCESSING);
    announce("Processing your " + plan.name + (cfg.kind ? " " + cfg.kind : "") + " plan.");
    rotateLog();
    later(open, PROCESSING_MS);
  }

  function open() {
    set(STATES.OPENING);
    announce("Opening WhatsApp.");
    logEl.textContent = "> handoff complete";
    const url = waLink(cfg.message(plan));
    let w = null;
    try { w = window.open(url, "_blank"); if (w) w.opener = null; } catch (e) { w = null; }
    later(() => {
      if (!w) { fb.href = url; fb.hidden = false; announce("Your browser blocked the new tab. Use the Open WhatsApp link."); }
      set(STATES.IDLE);
    }, OPENING_MS);
  }

  btn.addEventListener("click", start);
  return { start, get state() { return state; }, dispose() { clear(); btn.removeEventListener("click", start); set(STATES.IDLE); } };
}

const VIDEO_CFG = { label: "Get Plan", message: planMessage, kind: "" };
const SECURITY_CFG = { label: SECURITY.buttonLabel, message: securityMessage, kind: "HTTPS security" };
const HOSTING_CFG = { label: HOSTING.buttonLabel, message: hostingMessage, kind: "hosting" };

/** @param {object} ctx */
export function init(ctx) {
  live = document.getElementById("planStatus");
  const fit = (card) => {
    const face = card.querySelector(".plan-face");
    if (face) { const set = () => face.style.setProperty("--ph", Math.max(200, face.offsetHeight - 6) + "px"); set(); window.addEventListener("resize", set); offs.push(() => window.removeEventListener("resize", set)); }
  };
  document.querySelectorAll(".plan[data-plan]").forEach(card => {
    const plan = PLANS.find(p => p.id === card.dataset.plan);
    if (plan) machines.set(card.dataset.plan, Machine(card, plan, VIDEO_CFG));
    fit(card);
  });
  document.querySelectorAll(".plan[data-hosting]").forEach(card => {
    const plan = HOSTING.plans.find(p => p.id === card.dataset.hosting);
    if (plan) machines.set("hosting-" + plan.id, Machine(card, plan, HOSTING_CFG));
    fit(card);
  });
  document.querySelectorAll(".plan[data-security]").forEach(card => {
    const plan = SECURITY.plan;
    machines.set("security-" + plan.id, Machine(card, plan, SECURITY_CFG));
    fit(card);
  });
}
/** Test hook: current state of a plan machine. */
export const stateOf = (id) => machines.get(id)?.state;
export function dispose() { machines.forEach(m => m.dispose()); machines.clear(); offs.forEach(f => f()); offs = []; live = null; }
