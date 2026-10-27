/**
 * "Secured System" (HTTPS) plan — the single place to edit its copy and price.
 * Used by: tools/build-static.mjs (pre-renders the #security section, JSON-LD offer and quote option),
 * pricing/processing.js (the "Get Plan" -> WhatsApp hand-off).
 *
 * After editing, run `node tools/build-static.mjs` to refresh index.html.
 * @module pricing/securityPlan
 */
export const SECURITY = {
  sectionTitle: ["Secured", "System"],          // rendered as: Secured <hl>System</hl>
  subtitle: "HyperText Transfer Protocol Secure (HTTPS)",
  buttonLabel: "Get Plan",
  plan: {
    id: "https",
    name: "Secured System",
    short: "Secured System (HTTPS)",
    price: 2999,                                // ₹
    benefits: [
      // [icon symbol id, bold lead, rest of the sentence]
      ["i-lock", "Encrypted connection", "everything sent between your visitors and your website, including forms, logins and payment details, is encrypted, so nobody can read it along the way."],
      ["i-shield", "Protection from data theft in transit", "visitors' personal details stay protected even on public Wi-Fi in cafés, airports and hotels."],
      ["i-block", "No unwanted downloads or injected adverts", "nobody on the network, such as an attacker or an internet provider, can secretly insert unknown apps, malware or pop-up adverts into your pages."],
      ["i-pad", "Trusted padlock icon", "visitors see the padlock in the address bar instead of a \"Not secure\" warning, which builds confidence in your brand."],
      ["i-rank", "Better Google ranking", "search engines prefer secure websites, which helps more customers find you."],
      ["i-card", "Ready for payments and modern features", "HTTPS is required for payment gateways, location, camera access and installable web apps."],
      ["i-cog", "Fully managed", "We set up the SSL certificate (the file that turns on HTTPS) and renew it automatically, so you never have to deal with it."],
    ],
  },
};

/** 2999 -> "2,999" (Indian digit grouping, deterministic in every runtime). */
export const inr = (n) => {
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3), rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
};

export const priceLabel = (p) => `₹${inr(p.price)}`;

/** Prefilled WhatsApp text. */
export const securityMessage = (p) =>
  `Hi AI Nexus × Neon AI Studio, I want the ${p.short} plan – ${priceLabel(p)}. Please share details.`;

/** Dropdown / JSON-LD label. */
export const securityLabel = (p) => `${p.short} – ${priceLabel(p)}`;
