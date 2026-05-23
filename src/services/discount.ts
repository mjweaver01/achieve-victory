export function getDiscountPercent(): number {
  const raw = Number(process.env.SHOPIFY_DISCOUNT_PERCENT ?? '10');
  if (!Number.isFinite(raw) || raw <= 0) return 10;
  return Math.max(1, Math.round(raw));
}

export function getDiscountOfferText(): string {
  const percent = getDiscountPercent();
  return `${percent}% off your entire order, one-time use`;
}
