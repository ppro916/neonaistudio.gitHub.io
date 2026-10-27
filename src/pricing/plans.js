/**
 * Video plans (exact copy from the brief).
 * @module pricing/plans
 */
export const PLANS = [
  { id: "standard", name: "STANDARD", duration: "Up to 30 / 32 sec", price: 599, priceLabel: "₹599 / video" },
  { id: "premium", name: "PREMIUM", duration: "Up to 60 / 65 sec", price: 1019, priceLabel: "₹1019 / video" },
];

/** Human label used in the dropdown and the WhatsApp message. */
export const planLabel = (p) => `${p.name} – ${p.duration} – ${p.priceLabel}`;

/** Prefilled WhatsApp text naming plan, duration and price. */
export const planMessage = (p) =>
  `Hi AI Nexus × Neon AI Studio! I'd like to get the ${p.name} video plan (${p.duration}) at ${p.priceLabel}. Please share the next steps.`;
