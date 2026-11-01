export const TAX_RATE = 0.1;

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function priceOrder(
  subtotal: number,
  discount: number,
  shipping: number,
) {
  const merchandise = roundMoney(subtotal);
  const applied = roundMoney(Math.min(Math.max(discount, 0), merchandise));
  const discounted = roundMoney(merchandise - applied);
  const tax = roundMoney(discounted * TAX_RATE);
  const total = roundMoney(discounted + shipping + tax);
  return {
    subtotal: merchandise,
    discount: applied,
    shipping: roundMoney(shipping),
    tax,
    total,
  };
}
