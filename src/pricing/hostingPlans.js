/**
 * Web-hosting plans — the single place to edit hosting copy and prices.
 * Used by: tools/build-static.mjs (pre-renders the #hosting section + JSON-LD offers),
 * pricing/processing.js (the "Choose plan" -> WhatsApp hand-off) and the quote dropdown.
 *
 * After editing, run `node tools/build-static.mjs` to refresh index.html.
 *
 * NOTE (owner to confirm): Gold Premium shows ₹139/mo but "₹6,672 for 24 months" (= ₹278/mo).
 * Fix `todayTotal` (and/or `price`) below if the total should be different.
 * @module pricing/hostingPlans
 */
export const HOSTING = {
  sectionTitle: ["Web", "Hosting"],            // rendered as: Web <hl>Hosting</hl>
  sectionIntro: "Pick a plan and tap Choose plan — we continue on WhatsApp.",
  buttonLabel: "Choose plan",
  plans: [
    {
      id: "diamond",
      featured: true,
      badge: "Special offer • 75% off",
      name: "Diamond Plan Unlimited",
      subtitle: "Unlimited websites and mailboxes, for maximum flexibility.",
      oldPrice: 799,                            // shown struck through (omit for no strike-through)
      price: 199,                               // ₹ per month
      months: 48,                               // billing term
      todayTotal: 9552,                         // ₹ charged today for the whole term
      renewPrice: 649,                          // ₹ per month on renewal (same term)
      cancelAnytime: true,
      highlight: "Sale Season: Get 2x credits, 1000 instead of 500",
      features: [
        "Ecommerce available",
        "Unlimited use",
        "50 GB NVMe storage",
        "Daily backups + easy data restore",
        "CDN included",
        "Priority 24/7 expert support",
      ],
      buildWith: ["Python", "Node.js"],
      communicate: [
        "Unlimited mailboxes per website - free for 1 year",
        "Free AI email marketing for 1 year up to 100 subscribers",
      ],
    },
    {
      id: "gold",
      featured: false,
      name: "Gold Premium",
      subtitle: "Run websites smoothly. Great for creators and small brands.",
      price: 139,
      months: 24,
      todayTotal: 6672,                         // TODO(owner): confirm (139 × 24 = 3,336)
      renewPrice: 449,
      cancelAnytime: false,
      features: ["3 websites", "20 GB SSD storage", "Free weekly backups", "CDN"],
      buildWith: ["Python"],
      communicate: ["2 mailboxes per website - free for 1 year"],
    },
  ],
};

/** 9552 -> "9,552" (Indian digit grouping, deterministic in every runtime). */
export const inr = (n) => {
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3), rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
};

export const priceLabel = (p) => `₹${inr(p.price)}/mo`;

/** "Today you pay ₹9,552 for 48 months. Renews at ₹649/mo for the same term. Cancel anytime." */
export const finePrint = (p) =>
  `Today you pay ₹${inr(p.todayTotal)} for ${p.months} months. Renews at ₹${inr(p.renewPrice)}/mo for the same term.` +
  (p.cancelAnytime ? " Cancel anytime." : "");

/** Prefilled WhatsApp text. */
export const hostingMessage = (p) =>
  `Hi AI Nexus × Neon AI Studio, I want the ${p.name} hosting (${priceLabel(p)}, ${p.months} months). Please share details.`;

/** Dropdown / JSON-LD label. */
export const hostingLabel = (p) => `${p.name} – hosting – ${priceLabel(p)} (${p.months} months)`;
