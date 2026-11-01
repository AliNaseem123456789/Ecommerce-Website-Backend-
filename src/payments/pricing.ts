export const FREE_SHIPPING_OVER = 100;
export const STANDARD_SHIPPING_USD = 6.95;
export const TAX_RATE = 0.1;

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function priceOrder(subtotal: number) {
  const shipping = subtotal > FREE_SHIPPING_OVER ? 0 : STANDARD_SHIPPING_USD;
  const tax = roundMoney(subtotal * TAX_RATE);
  const total = roundMoney(subtotal + shipping + tax);
  return {
    subtotal: roundMoney(subtotal),
    shipping,
    tax,
    total,
  };
}
