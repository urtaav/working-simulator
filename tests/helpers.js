// Business-domain words that must never show up (whole words, optional plural).
export const FORBIDDEN = ['cart', 'checkout', 'order', 'product', 'invoice', 'payment', 'price', 'dashboard', 'customer', 'shop', 'crud'];

export function forbiddenHits(text) {
  const lower = text.toLowerCase();
  return FORBIDDEN.filter((w) => new RegExp(`\\b${w}s?\\b`).test(lower));
}
